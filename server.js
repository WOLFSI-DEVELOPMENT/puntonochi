import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import dotenv from 'dotenv';
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import webpush from 'web-push';

dotenv.config({ path: '.env.notifications' });

const app = express();
app.set('trust proxy', 1);
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '8mb' }));

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const storageReady = Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION);
const s3 = storageReady ? new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
}) : null;

const requireNeon = (req, res, next) => {
  if (!sql) return res.status(503).json({ error: 'Neon is not configured. Set DATABASE_URL in the server environment.' });
  next();
};

const ADMIN_COOKIE = 'puntonochi_admin';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
let adminSchemaReady;
const ensureAdminSchema = () => {
  if (!sql) throw new Error('DATABASE_URL is not configured.');
  if (!adminSchemaReady) adminSchemaReady = sql`CREATE TABLE IF NOT EXISTS admin_credentials (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    session_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`.catch((error) => { adminSchemaReady = undefined; throw error; });
  return adminSchemaReady;
};
const getAdminConfig = async () => {
  if (!sql) return null;
  await ensureAdminSchema();
  let [config] = await sql`SELECT password_salt AS "passwordSalt", password_hash AS "passwordHash", session_secret AS "sessionSecret" FROM admin_credentials WHERE id = 1`;
  if (!config && process.env.ADMIN_PASSWORD?.length >= 12 && process.env.ADMIN_SESSION_SECRET?.length >= 32) {
    const salt = randomBytes(16).toString('hex');
    const passwordHash = scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex');
    await sql`INSERT INTO admin_credentials (id, password_salt, password_hash, session_secret) VALUES (1, ${salt}, ${passwordHash}, ${process.env.ADMIN_SESSION_SECRET}) ON CONFLICT (id) DO NOTHING`;
    [config] = await sql`SELECT password_salt AS "passwordSalt", password_hash AS "passwordHash", session_secret AS "sessionSecret" FROM admin_credentials WHERE id = 1`;
  }
  return config || null;
};
const safeEqual = (left, right) => timingSafeEqual(
  createHash('sha256').update(String(left)).digest(),
  createHash('sha256').update(String(right)).digest(),
);
const getCookieValue = (req, name) => {
  const entry = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : '';
};
const signAdminPayload = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');
const isAdminSessionValid = (req, secret) => {
  const token = getCookieValue(req, ADMIN_COOKIE);
  const separator = token.lastIndexOf('.');
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const suppliedSignature = Buffer.from(token.slice(separator + 1), 'base64url');
  const expectedSignature = Buffer.from(signAdminPayload(payload, secret), 'base64url');
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).expiresAt > Date.now();
  } catch {
    return false;
  }
};
const requireAdmin = async (req, res, next) => {
  try {
    const config = await getAdminConfig();
    if (!config) return res.status(503).json({ error: 'Configura DATABASE_URL, ADMIN_PASSWORD (12+ caracteres) y ADMIN_SESSION_SECRET (32+ caracteres); al iniciar, el acceso se guarda en Neon.' });
    if (!isAdminSessionValid(req, config.sessionSecret)) return res.status(401).json({ error: 'Inicia sesión como administrador.' });
    next();
  } catch (error) {
    console.error('Admin credentials could not be read from Neon:', error);
    res.status(503).json({ error: 'No se pudo conectar con Neon para comprobar el acceso de administrador.' });
  }
};
const ensureSameOrigin = (req, res) => {
  const origin = req.get('origin');
  let sameOrigin = !origin;
  try {
    if (origin) {
      const parsedOrigin = new URL(origin);
      sameOrigin = parsedOrigin.host === req.get('host') && parsedOrigin.protocol === `${req.protocol}:`;
      if (!sameOrigin && process.env.NODE_ENV !== 'production') {
        sameOrigin = ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname) && ['localhost', '127.0.0.1'].includes(req.hostname);
      }
    }
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    res.status(403).json({ error: 'Solicitud de origen no válido.' });
    return false;
  }
  return true;
};
const isPlaceholderImage = (value) => /placeholder|no[-_ ]?image|image[-_ ]?not[-_ ]?found|default[-_ ]?(?:image|photo)|no[-_ ]?photo/i.test(String(value || ''));
const parseImageUrl = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

app.get('/api/admin/session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const config = await getAdminConfig();
    res.json({ configured: Boolean(config), authenticated: Boolean(config && isAdminSessionValid(req, config.sessionSecret)) });
  } catch (error) {
    console.error('Admin configuration check failed:', error);
    res.status(503).json({ configured: false, authenticated: false, error: 'No se pudo comprobar la configuración en Neon.' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!ensureSameOrigin(req, res)) return;
  let config;
  try { config = await getAdminConfig(); } catch (error) {
    console.error('Admin login could not read Neon credentials:', error);
    return res.status(503).json({ error: 'No se pudo conectar con Neon para comprobar el acceso.' });
  }
  if (!config) return res.status(503).json({ error: 'Configura DATABASE_URL, ADMIN_PASSWORD y ADMIN_SESSION_SECRET; al iniciar, el acceso se guarda en Neon.' });
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const suppliedHash = scryptSync(password, config.passwordSalt, 64).toString('hex');
  if (!safeEqual(suppliedHash, config.passwordHash)) return res.status(401).json({ error: 'Contraseña incorrecta.' });

  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000 })).toString('base64url');
  const token = `${payload}.${signAdminPayload(payload, config.sessionSecret)}`;
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/api/admin; SameSite=Strict; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`);
  res.json({ authenticated: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!ensureSameOrigin(req, res)) return;
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; Path=/api/admin; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
  res.json({ authenticated: false });
});

let directorySchemaReady;
const ensureDirectorySchema = () => {
  if (!directorySchemaReady) directorySchemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT, visits INTEGER, gradient TEXT, emoji TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`;
    await sql`CREATE TABLE IF NOT EXISTS colonias (
      id TEXT PRIMARY KEY, name TEXT, type TEXT, cp TEXT, visits INTEGER, image TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`;
    await sql`CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY, name TEXT, category TEXT, subtitle TEXT, location TEXT,
      address TEXT, map_url TEXT, images JSONB NOT NULL DEFAULT '[]'::jsonb,
      logo TEXT, rating DOUBLE PRECISION, review_count INTEGER,
      is_open BOOLEAN NOT NULL DEFAULT FALSE, cost INTEGER, distance TEXT,
      good_to_know JSONB NOT NULL DEFAULT '[]'::jsonb, hours TEXT,
      lat DOUBLE PRECISION, lng DOUBLE PRECISION, phone TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`;
  })().catch((error) => { directorySchemaReady = undefined; throw error; });
  return directorySchemaReady;
};

let schemaReady;
const ensureSubmissionSchema = () => {
  if (!schemaReady) schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS business_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      hours TEXT NOT NULL,
      cost INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 4),
      contact_email TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS business_application_photos (
      id BIGSERIAL PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES business_applications(id) ON DELETE CASCADE,
      object_key TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL CHECK (size_bytes <= 5242880),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS business_claims (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL,
      weekly_hours JSONB NOT NULL,
      proof_name TEXT NOT NULL,
      proof_mime_type TEXT NOT NULL CHECK (proof_mime_type IN ('image/jpeg', 'image/png')),
      proof_base64 TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )`;
    await sql`CREATE TABLE IF NOT EXISTS promotion_orders (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL,
      place_name TEXT NOT NULL,
      budget_mxn INTEGER NOT NULL CHECK (budget_mxn BETWEEN 100 AND 5000),
      estimated_appearances INTEGER NOT NULL,
      schedule JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'simulated-checkout-complete',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL,
      place_name TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      image_key TEXT,
      cover_key TEXT,
      image_mime_type TEXT,
      cover_mime_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })().catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
};

let pushSchemaReady;
const ensurePushSchema = () => {
  if (!pushSchemaReady) pushSchemaReady = sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`.catch((error) => { pushSchemaReady = undefined; throw error; });
  return pushSchemaReady;
};

app.get('/api/notifications/vapid-public-key', (_req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'Las notificaciones aún no están configuradas.' });
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/api/notifications/subscribe', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint?.startsWith('https://') || !subscription.keys?.p256dh || !subscription.keys?.auth) return res.status(400).json({ error: 'La suscripción de notificaciones no es válida.' });
    await ensurePushSchema();
    await sql`INSERT INTO push_subscriptions (endpoint, subscription) VALUES (${subscription.endpoint}, ${JSON.stringify(subscription)}::jsonb) ON CONFLICT (endpoint) DO UPDATE SET subscription = EXCLUDED.subscription, updated_at = NOW()`;
    res.status(201).json({ subscribed: true });
  } catch (error) {
    console.error('Push subscription save failed:', error);
    res.status(500).json({ error: 'No se pudo activar la suscripción.' });
  }
});

app.post('/api/business-applications', requireNeon, async (req, res) => {
  try {
    const { name, category, description, address, phone, hours, cost, email, tags = [] } = req.body || {};
    if (![name, category, description, address, phone, hours, email].every((value) => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Complete all required business details.' });
    }
    const price = Number(cost);
    if (!Number.isInteger(price) || price < 1 || price > 4 || !Array.isArray(tags)) return res.status(400).json({ error: 'Invalid price range or tags.' });
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO business_applications (id, name, category, description, address, phone, hours, cost, contact_email, tags)
      VALUES (${id}, ${name.trim()}, ${category.trim()}, ${description.trim()}, ${address.trim()}, ${phone.trim()}, ${hours.trim()}, ${price}, ${email.trim()}, ${JSON.stringify(tags)})`;
    res.status(201).json({ id });
  } catch (error) {
    console.error('Business application create failed:', error);
    res.status(500).json({ error: 'Could not save the business application.' });
  }
});

app.post('/api/business-applications/:id/photos', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).json({ error: 'Neon private upload storage is not configured.' });
    const { fileName, mimeType, base64 } = req.body || {};
    if (typeof base64 !== 'string' || !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType || '')) return res.status(400).json({ error: 'Choose a supported image file.' });
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Each image must be 5 MB or smaller.' });
    await ensureSubmissionSchema();
    const [application] = await sql`SELECT id FROM business_applications WHERE id = ${req.params.id}`;
    if (!application) return res.status(404).json({ error: 'Business application not found.' });
    const objectKey = `business-applications/${req.params.id}/${randomUUID()}`;
    await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: mimeType }));
    try {
      await sql`INSERT INTO business_application_photos (application_id, object_key, file_name, mime_type, size_bytes)
        VALUES (${req.params.id}, ${objectKey}, ${(fileName || 'business-photo').slice(0, 180)}, ${mimeType}, ${bytes.length})`;
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
      throw error;
    }
    res.status(201).json({ saved: true });
  } catch (error) {
    console.error('Business photo upload failed:', error);
    res.status(500).json({ error: 'Could not upload this image.' });
  }
});

app.post('/api/business-applications/:id/submit', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const rows = await sql`UPDATE business_applications SET status = 'pending' WHERE id = ${req.params.id} RETURNING id`;
    if (!rows.length) return res.status(404).json({ error: 'Business application not found.' });
    res.json({ submitted: true });
  } catch (error) {
    console.error('Business application submit failed:', error);
    res.status(500).json({ error: 'Could not submit the business application.' });
  }
});

app.post('/api/business-claims', requireNeon, async (req, res) => {
  try {
    const { placeId, name, address, phone, description = '', email, hours, proofName, proofMimeType, proofBase64 } = req.body || {};
    if (![placeId, name, address, phone, email, proofName].every((value) => typeof value === 'string' && value.trim()) || !hours || typeof hours !== 'object') {
      return res.status(400).json({ error: 'Completa los datos del negocio, el horario y el comprobante.' });
    }
    if (!['image/jpeg', 'image/png'].includes(proofMimeType) || typeof proofBase64 !== 'string') return res.status(400).json({ error: 'El comprobante debe ser JPG o PNG.' });
    const proof = Buffer.from(proofBase64, 'base64');
    if (!proof.length || proof.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'El comprobante debe pesar 5 MB o menos.' });
    await ensureDirectorySchema();
    const [existingPlace] = await sql`SELECT id FROM places WHERE id = ${placeId.trim()}`;
    if (!existingPlace) return res.status(404).json({ error: 'No encontramos el negocio seleccionado.' });
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO business_claims (id, place_id, business_name, address, phone, description, contact_email, weekly_hours, proof_name, proof_mime_type, proof_base64)
      VALUES (${id}, ${placeId.trim()}, ${name.trim()}, ${address.trim()}, ${phone.trim()}, ${String(description).trim().slice(0, 1600)}, ${email.trim()}, ${JSON.stringify(hours)}, ${proofName.trim().slice(0, 180)}, ${proofMimeType}, ${proof.toString('base64')})`;
    res.status(201).json({ id, submitted: true });
  } catch (error) {
    console.error('Business claim create failed:', error);
    res.status(500).json({ error: 'No se pudo enviar la solicitud de reclamación.' });
  }
});

app.get('/api/admin/business-claims', requireAdmin, requireNeon, async (_req, res) => {
  try {
    await ensureSubmissionSchema();
    await ensureDirectorySchema();
    const claims = await sql`SELECT id, place_id AS "placeId", business_name AS name, address, phone, description, contact_email AS email, weekly_hours AS hours, proof_name AS "proofName", proof_mime_type AS "proofMimeType", proof_base64 AS "proofBase64", created_at AS "createdAt" FROM business_claims WHERE status = 'pending' ORDER BY created_at ASC`;
    res.json(claims);
  } catch (error) {
    console.error('Could not load business claims:', error);
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes.' });
  }
});

app.patch('/api/admin/business-claims/:id', requireAdmin, requireNeon, async (req, res) => {
  try {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'La decisión debe ser aprobar o rechazar.' });
    await ensureSubmissionSchema();
    const [claim] = await sql`SELECT place_id, business_name, address, phone, description, contact_email, weekly_hours FROM business_claims WHERE id = ${req.params.id} AND status = 'pending'`;
    if (!claim) return res.status(404).json({ error: 'Solicitud pendiente no encontrada.' });
    if (status === 'approved') {
      const readableHours = Object.entries(claim.weekly_hours || {}).map(([day, schedule]) => {
        if (schedule?.closed) return `${day}: cerrado`;
        const intervals = (schedule?.intervals || []).map(({ open, close }) => `${open}–${close}`).join(' y ');
        return `${day}: ${intervals}`;
      }).join(' · ');
      await sql`UPDATE places SET name = ${claim.business_name}, address = ${claim.address}, phone = ${claim.phone}, subtitle = ${claim.description}, hours = ${readableHours} WHERE id = ${claim.place_id}`;
    }
    await sql`UPDATE business_claims SET status = ${status}, proof_base64 = NULL, reviewed_at = NOW() WHERE id = ${req.params.id}`;
    let emailSent = false;
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL,
            to: [claim.contact_email],
            subject: status === 'approved' ? 'Tu negocio fue verificado en PuntoNochi' : 'Actualización de tu solicitud en PuntoNochi',
            html: `<div style="font-family:Arial,sans-serif;background:#121212;color:#f5f5f5;padding:32px;border-radius:24px"><p style="color:#9ca3af;letter-spacing:.12em">PUNTONOCHI</p><h1>${status === 'approved' ? '¡Negocio verificado!' : 'Solicitud revisada'}</h1><p>Hola, revisamos la solicitud para <strong>${String(claim.business_name).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</strong>.</p><p>${status === 'approved' ? 'Los cambios fueron aplicados a la ficha del negocio.' : 'No pudimos aprobarla en esta revisión. Puedes enviar una nueva solicitud con información adicional.'}</p><p>El comprobante que compartiste ya fue eliminado.</p></div>`,
          }),
        });
        if (!emailResponse.ok) console.error('Business claim decision email failed:', await emailResponse.text());
        else emailSent = true;
      } catch (emailError) { console.error('Business claim decision email failed:', emailError); }
    }
    res.json({ reviewed: true, status, emailSent, emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) });
  } catch (error) {
    console.error('Business claim review failed:', error);
    res.status(500).json({ error: 'No se pudo guardar la decisión.' });
  }
});

app.post('/api/promotions', requireNeon, async (req, res) => {
  try {
    const { placeId, placeName, budgetMXN, estimatedAppearances, schedule } = req.body || {};
    const budget = Number(budgetMXN);
    const appearances = Number(estimatedAppearances);
    if (typeof placeId !== 'string' || typeof placeName !== 'string' || !Number.isInteger(budget) || budget < 100 || budget > 5000 || !Number.isInteger(appearances) || appearances < 0 || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid promotion details.' });
    }
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO promotion_orders (id, place_id, place_name, budget_mxn, estimated_appearances, schedule)
      VALUES (${id}, ${placeId}, ${placeName}, ${budget}, ${appearances}, ${JSON.stringify(schedule)})`;
    res.status(201).json({ id });
  } catch (error) {
    console.error('Promotion order save failed:', error);
    res.status(500).json({ error: 'Could not save the promotion request.' });
  }
});

app.post('/api/community-posts', requireNeon, async (req, res) => {
  try {
    const { placeId, placeName, caption = '' } = req.body || {};
    if (typeof placeId !== 'string' || !placeId.trim() || typeof placeName !== 'string' || !placeName.trim() || typeof caption !== 'string' || caption.length > 400) {
      return res.status(400).json({ error: 'Selecciona un negocio y revisa los detalles de la publicación.' });
    }
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO community_posts (id, place_id, place_name, caption)
      VALUES (${id}, ${placeId.trim()}, ${placeName.trim()}, ${caption.trim()})`;
    res.status(201).json({ id });
  } catch (error) {
    console.error('Community post create failed:', error);
    res.status(500).json({ error: 'No se pudo iniciar la publicación.' });
  }
});

app.post('/api/community-posts/:id/:kind', requireNeon, async (req, res) => {
  try {
    if (!['photo', 'cover'].includes(req.params.kind)) return res.status(404).json({ error: 'Upload type not found.' });
    if (!s3) return res.status(503).json({ error: 'Neon private upload storage is not configured.' });
    const { fileName, mimeType, base64 } = req.body || {};
    if (typeof base64 !== 'string' || !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType || '')) return res.status(400).json({ error: 'Elige un archivo de imagen válido.' });
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Cada imagen debe pesar 5 MB o menos.' });
    await ensureSubmissionSchema();
    const [post] = await sql`SELECT id, status, image_key, cover_key FROM community_posts WHERE id = ${req.params.id}`;
    if (!post || post.status !== 'draft') return res.status(404).json({ error: 'No se encontró el borrador de publicación.' });
    const key = `${req.params.id}/${req.params.kind}-${randomUUID()}`;
    const objectKey = `community-posts/${key}`;
    await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: mimeType, Metadata: fileName ? { filename: String(fileName).slice(0, 180) } : undefined }));
    const oldKey = req.params.kind === 'photo' ? post.image_key : post.cover_key;
    try {
      const updated = req.params.kind === 'photo'
        ? await sql`UPDATE community_posts SET image_key = ${objectKey}, image_mime_type = ${mimeType} WHERE id = ${post.id} AND status = 'draft' RETURNING id`
        : await sql`UPDATE community_posts SET cover_key = ${objectKey}, cover_mime_type = ${mimeType} WHERE id = ${post.id} AND status = 'draft' RETURNING id`;
      if (!updated.length) throw new Error('Post draft is no longer available.');
      if (oldKey) await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: String(oldKey) })).catch(() => undefined);
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
      throw error;
    }
    res.status(201).json({ uploaded: true });
  } catch (error) {
    console.error('Community post image upload failed:', error);
    res.status(500).json({ error: 'No se pudo subir la imagen.' });
  }
});

app.post('/api/community-posts/:id/publish', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const [post] = await sql`UPDATE community_posts SET status = 'published'
      WHERE id = ${req.params.id} AND status = 'draft' AND image_key IS NOT NULL
      RETURNING id, place_id, place_name, caption, created_at`;
    if (!post) return res.status(404).json({ error: 'No se encontró la publicación o le falta su imagen.' });
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ ...post, imageUrl: `${base}/api/community-posts/${post.id}/image`, coverUrl: `${base}/api/community-posts/${post.id}/cover` });
  } catch (error) {
    console.error('Community post publish failed:', error);
    res.status(500).json({ error: 'No se pudo publicar la imagen.' });
  }
});

app.delete('/api/community-posts/:id', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const [post] = await sql`DELETE FROM community_posts WHERE id = ${req.params.id} AND status = 'draft' RETURNING image_key, cover_key`;
    if (!post) return res.status(404).json({ deleted: false });
    for (const key of [post.image_key, post.cover_key]) {
      if (s3 && key) await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: String(key) })).catch(() => undefined);
    }
    res.json({ deleted: true });
  } catch (error) {
    console.error('Community post draft cleanup failed:', error);
    res.status(500).json({ error: 'No se pudo limpiar el borrador.' });
  }
});

app.get('/api/community-posts/:id/:kind', requireNeon, async (req, res) => {
  try {
    if (!['image', 'cover'].includes(req.params.kind)) return res.status(404).json({ error: 'Image not found.' });
    if (!s3) return res.status(503).json({ error: 'Neon private storage is not configured.' });
    await ensureSubmissionSchema();
    const [post] = await sql`SELECT image_key, cover_key, image_mime_type, cover_mime_type, status FROM community_posts WHERE id = ${req.params.id}`;
    if (!post || post.status !== 'published') return res.status(404).json({ error: 'Imagen de publicación no encontrada.' });
    const isCover = req.params.kind === 'cover';
    const key = isCover ? post.cover_key : post.image_key;
    const mimeType = isCover ? post.cover_mime_type : post.image_mime_type;
    if (!key || !mimeType) return res.status(404).json({ error: 'Imagen de publicación no encontrada.' });
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: String(key) }));
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) return res.status(502).json({ error: 'No se pudo leer la imagen.' });
    res.set('Content-Type', String(mimeType));
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Community post image read failed:', error);
    res.status(500).json({ error: 'No se pudo cargar la imagen.' });
  }
});

const apiCache = new Map();

app.get('/api/gnews', async (_req, res) => {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Falta configurar GNEWS_API_KEY en el servidor.' });
  const cacheKey = 'gnews-mexico-es';
  const cached = apiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return res.json(cached.data);
  try {
    const url = new URL('https://gnews.io/api/v4/top-headlines');
    url.searchParams.set('country', 'mx');
    url.searchParams.set('lang', 'es');
    url.searchParams.set('max', '10');
    url.searchParams.set('apikey', apiKey);
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await upstream.json();
    if (!upstream.ok) {
      console.error('GNews request failed:', upstream.status, body?.errors || body?.message || 'Unknown API error');
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: 'GNews no pudo cargar las noticias. Inténtalo de nuevo más tarde.' });
    }
    const data = {
      totalArticles: Number(body.totalArticles || 0),
      articles: (body.articles || []).map((article) => ({
        title: article.title || '', description: article.description || '', content: article.content || '',
        url: article.url || '', image: article.image || '', publishedAt: article.publishedAt || '',
        source: article.source?.name || '',
      })),
    };
    apiCache.set(cacheKey, { data, expiresAt: Date.now() + 15 * 60 * 1000 });
    res.set('Cache-Control', 'public, max-age=900');
    res.json(data);
  } catch (error) {
    console.error('GNews request failed:', error);
    res.status(502).json({ error: 'No se pudo conectar con GNews.' });
  }
});

app.get('/api/youtube-news', async (req, res) => {
  const { default: handler } = await import('./api/youtube-news.js');
  return handler(req, res);
});

app.get('/api/weather', async (_req, res) => {
  const cacheKey = 'nochistlan-weekly-weather';
  const cached = apiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return res.json(cached.data);
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', '21.3656');
    url.searchParams.set('longitude', '-102.8461');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('timezone', 'America/Mexico_City');
    url.searchParams.set('forecast_days', '7');
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) return res.status(502).json({ error: 'No se pudo cargar el pronóstico del tiempo.' });
    const body = await upstream.json();
    const data = { location: 'Nochistlán, Zacatecas', days: (body.daily?.time || []).map((date, index) => ({
      date,
      weatherCode: body.daily.weather_code?.[index] ?? 0,
      high: body.daily.temperature_2m_max?.[index] ?? null,
      low: body.daily.temperature_2m_min?.[index] ?? null,
      precipitationChance: body.daily.precipitation_probability_max?.[index] ?? null,
    })) };
    apiCache.set(cacheKey, { data, expiresAt: Date.now() + 30 * 60 * 1000 });
    res.set('Cache-Control', 'public, max-age=1800');
    res.json(data);
  } catch (error) {
    console.error('Weather forecast request failed:', error);
    res.status(502).json({ error: 'No se pudo conectar con el pronóstico del tiempo.' });
  }
});

app.get('/api/categories', requireNeon, async (_req, res) => {
  try {
    await ensureDirectorySchema();
    res.json(await sql`SELECT id, name, visits, gradient, emoji FROM categories ORDER BY sort_order`);
  } catch (error) {
    console.error('Could not load categories from Neon:', error);
    res.status(500).json({ error: 'No se pudieron cargar las categorías.' });
  }
});

app.get('/api/colonias', requireNeon, async (_req, res) => {
  try {
    await ensureDirectorySchema();
    res.json(await sql`SELECT id, name, type, cp, visits, image FROM colonias ORDER BY sort_order`);
  } catch (error) {
    console.error('Could not load colonias from Neon:', error);
    res.status(500).json({ error: 'No se pudieron cargar las colonias.' });
  }
});

app.get('/api/places', requireNeon, async (req, res) => {
  try {
    await Promise.all([ensureDirectorySchema(), ensureSubmissionSchema()]);
    const places = await sql`SELECT id, name, category, subtitle, location, address,
      map_url AS "mapUrl", images, logo, rating, review_count AS "reviewCount",
      is_open AS "isOpen", cost, distance, good_to_know AS "goodToKnow", hours,
      lat, lng, phone FROM places ORDER BY sort_order`;
    const publishedPosts = await sql`SELECT id, place_id FROM community_posts WHERE status = 'published' ORDER BY created_at DESC`;
    const postImagesByPlace = new Map();
    for (const post of publishedPosts) {
      const images = postImagesByPlace.get(post.place_id) || [];
      images.push(`${req.protocol}://${req.get('host')}/api/community-posts/${post.id}/image`);
      postImagesByPlace.set(post.place_id, images);
    }
    res.json(places.map((place) => ({
      ...place,
      images: [...(Array.isArray(place.images) ? place.images : []), ...(postImagesByPlace.get(place.id) || [])],
      goodToKnow: Array.isArray(place.goodToKnow) ? place.goodToKnow : [],
    })));
  } catch (error) {
    console.error('Could not load places from Neon:', error);
    res.status(500).json({ error: 'No se pudieron cargar los negocios.' });
  }
});

app.get('/api/admin/places', requireAdmin, requireNeon, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await ensureDirectorySchema();
    const places = await sql`SELECT id, name, category, subtitle, location, address,
      map_url AS "mapUrl", images, logo, rating, review_count AS "reviewCount",
      is_open AS "isOpen", cost, distance, good_to_know AS "goodToKnow", hours,
      lat, lng, phone FROM places ORDER BY sort_order, name`;
    res.json(places.map((place) => ({
      ...place,
      images: Array.isArray(place.images) ? place.images : [],
      goodToKnow: Array.isArray(place.goodToKnow) ? place.goodToKnow : [],
    })));
  } catch (error) {
    console.error('Could not load admin business list:', error);
    res.status(500).json({ error: 'No se pudieron cargar los negocios.' });
  }
});

app.post('/api/admin/places', requireAdmin, requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    await ensureDirectorySchema();
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 180) : '';
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 100) : '';
    const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 500) : '';
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 180) : '';
    const address = typeof body.address === 'string' ? body.address.trim().slice(0, 300) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 60) : '';
    const hours = typeof body.hours === 'string' && body.hours.trim() ? body.hours.trim().slice(0, 180) : 'Por confirmar';
    const cost = Number(body.cost || 1);
    const imageUrl = body.imageUrl ? parseImageUrl(body.imageUrl) : null;
    if (!name || !category || !location) return res.status(400).json({ error: 'Nombre, categoría y ubicación son obligatorios.' });
    if (body.imageUrl && !imageUrl) return res.status(400).json({ error: 'La imagen debe tener una URL HTTP o HTTPS válida.' });
    if (!Number.isInteger(cost) || cost < 1 || cost > 4) return res.status(400).json({ error: 'El rango de precio debe ser de 1 a 4.' });

    const id = `admin-${randomUUID()}`;
    const images = imageUrl ? [imageUrl] : [];
    const [place] = await sql`INSERT INTO places (
      id, name, category, subtitle, location, address, images, logo, rating,
      review_count, is_open, cost, distance, good_to_know, hours, sort_order, phone
    ) VALUES (
      ${id}, ${name}, ${category}, ${subtitle || null}, ${location}, ${address || null},
      ${JSON.stringify(images)}::jsonb, NULL, 0, 0, FALSE, ${cost}, '',
      '[]'::jsonb, ${hours}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM places), ${phone || null}
    ) RETURNING id, name, category, subtitle, location, address, map_url AS "mapUrl", images, logo,
      rating, review_count AS "reviewCount", is_open AS "isOpen", cost, distance,
      good_to_know AS "goodToKnow", hours, lat, lng, phone`;
    res.status(201).json({ ...place, images: Array.isArray(place.images) ? place.images : [] });
  } catch (error) {
    console.error('Could not create admin business:', error);
    res.status(500).json({ error: 'No se pudo guardar el negocio.' });
  }
});

app.patch('/api/admin/places/:id/image', requireAdmin, requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const imageUrl = parseImageUrl(req.body?.imageUrl);
  if (!imageUrl) return res.status(400).json({ error: 'La imagen debe tener una URL HTTP o HTTPS válida.' });
  try {
    await ensureDirectorySchema();
    const [place] = await sql`SELECT id, images FROM places WHERE id = ${req.params.id}`;
    if (!place) return res.status(404).json({ error: 'No se encontró el negocio.' });
    const existingImages = Array.isArray(place.images) ? place.images : [];
    const realImages = existingImages.filter((image) => typeof image === 'string' && image && !isPlaceholderImage(image) && image !== imageUrl);
    const images = [imageUrl, ...realImages];
    await sql`UPDATE places SET images = ${JSON.stringify(images)}::jsonb WHERE id = ${place.id}`;
    res.json({ id: place.id, images });
  } catch (error) {
    console.error('Could not update admin business image:', error);
    res.status(500).json({ error: 'No se pudo guardar la imagen.' });
  }
});

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`API Server listening on http://localhost:${port}`);
  });
}

export default app;
