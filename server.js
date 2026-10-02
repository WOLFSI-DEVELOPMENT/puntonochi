import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import dotenv from 'dotenv';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import webpush from 'web-push';

dotenv.config({ path: '.env.notifications' });

const app = express();
app.set('trust proxy', 1);
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '8mb' }));

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const storageSettings = {
  endpoint: process.env.NEON_STORAGE_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
  accessKeyId: process.env.NEON_STORAGE_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEON_STORAGE_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.NEON_STORAGE_REGION || '',
};
const storageRegionFromEndpoint = (endpoint) => {
  try { return new URL(endpoint).hostname.match(/[a-z]{2}(?:-gov)?-[a-z]+-\d/)?.[0] || ''; }
  catch { return ''; }
};
storageSettings.region ||= storageRegionFromEndpoint(storageSettings.endpoint) || process.env.AWS_REGION || '';
const missingStorageSettings = () => [
  ['NEON_STORAGE_ENDPOINT or AWS_ENDPOINT_URL_S3', storageSettings.endpoint],
  ['NEON_STORAGE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID', storageSettings.accessKeyId],
  ['NEON_STORAGE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY', storageSettings.secretAccessKey],
  ['NEON_STORAGE_REGION or a region in the endpoint or AWS_REGION', storageSettings.region],
].filter(([, value]) => !value).map(([name]) => name);
const storageReady = missingStorageSettings().length === 0;
const s3 = storageReady ? new S3Client({
  region: storageSettings.region,
  endpoint: storageSettings.endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: storageSettings.accessKeyId, secretAccessKey: storageSettings.secretAccessKey },
}) : null;
const storageUnavailableMessage = () => {
  const missing = missingStorageSettings();
  return missing.length
    ? `Faltan variables privadas de Neon Object Storage en Vercel: ${missing.join(', ')}. Agrégalas al entorno Production y vuelve a desplegar.`
    : 'Neon Object Storage no está disponible en este momento.';
};

const requireNeon = (req, res, next) => {
  if (!sql) return res.status(503).json({ error: 'Neon is not configured. Set DATABASE_URL in the server environment.' });
  next();
};

const ADMIN_COOKIE = 'puntonochi_admin';
const ADMIN_OAUTH_STATE_COOKIE = 'puntonochi_admin_oauth_state';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const ACCOUNT_COOKIE = 'puntonochi_account';
const ACCOUNT_OAUTH_STATE_COOKIE = 'puntonochi_account_oauth_state';
const ACCOUNT_FACEBOOK_OAUTH_STATE_COOKIE = 'puntonochi_account_facebook_oauth_state';
const ACCOUNT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const ADMIN_EMAIL_ALLOWLIST = new Set([
  'survivalcreativeminecraftadven@gmail.com',
  'rocioramire1976@gmail.com',
]);
const isGoogleOAuthConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const isFacebookOAuthConfigured = () => Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
const isAccountOAuthConfigured = () => isGoogleOAuthConfigured() || isFacebookOAuthConfigured();
const getOAuthRedirectUri = (req) => `${req.protocol}://${req.get('host')}/api/admin/oauth/callback`;
const getGoogleOAuthClient = (req) => new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getOAuthRedirectUri(req),
);
const getAccountOAuthRedirectUri = (req) => `${req.protocol}://${req.get('host')}/api/account/oauth/callback`;
const getFacebookOAuthRedirectUri = (req) => process.env.FACEBOOK_OAUTH_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/account/oauth/facebook/callback`;
const getFacebookGraphVersion = () => /^v\d+\.\d+$/.test(process.env.FACEBOOK_GRAPH_API_VERSION || '') ? process.env.FACEBOOK_GRAPH_API_VERSION : 'v24.0';
const getAccountGoogleOAuthClient = (req) => new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getAccountOAuthRedirectUri(req),
);
let accountSchemaReady;
const ensureAccountSchema = () => {
  if (!sql) throw new Error('DATABASE_URL is not configured.');
  if (!accountSchemaReady) accountSchemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS user_accounts (
      google_sub TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      picture_url TEXT,
      bio TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS profile_picture_key TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS user_accounts_email_idx ON user_accounts (LOWER(email))`;
    await sql`CREATE TABLE IF NOT EXISTS user_account_sessions (
      token_hash TEXT PRIMARY KEY,
      google_sub TEXT NOT NULL REFERENCES user_accounts(google_sub) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS user_account_sessions_expiry_idx ON user_account_sessions (expires_at)`;
    await sql`CREATE TABLE IF NOT EXISTS account_follows (
      follower_google_sub TEXT NOT NULL REFERENCES user_accounts(google_sub) ON DELETE CASCADE,
      followed_google_sub TEXT NOT NULL REFERENCES user_accounts(google_sub) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_google_sub, followed_google_sub),
      CHECK (follower_google_sub <> followed_google_sub)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS account_follows_followed_idx ON account_follows (followed_google_sub)`;
  })().catch((error) => { accountSchemaReady = undefined; throw error; });
  return accountSchemaReady;
};
const getAccountSession = async (req) => {
  if (!sql) return null;
  await ensureAccountSchema();
  const token = getCookieValue(req, ACCOUNT_COOKIE);
  if (!token) return null;
  const [account] = await sql`SELECT account.google_sub AS id, account.display_name AS name, account.email, account.picture_url AS picture
    FROM user_account_sessions AS session
    JOIN user_accounts AS account ON account.google_sub = session.google_sub
    WHERE session.token_hash = ${hashAdminSessionToken(token)} AND session.expires_at > NOW()`;
  return account || null;
};
const requireAccount = async (req, res, next) => {
  try {
    if (!sql || !isAccountOAuthConfigured()) return res.status(503).json({ error: 'Configura el inicio de sesión con Google o Facebook en el servidor.' });
    const account = await getAccountSession(req);
    if (!account) return res.status(401).json({ code: 'ACCOUNT_REQUIRED', error: 'Inicia sesión para continuar.' });
    req.account = account;
    next();
  } catch (error) {
    console.error('Account authorization check failed:', error);
    res.status(503).json({ error: 'No se pudo comprobar tu cuenta.' });
  }
};
let adminSessionSchemaReady;
const ensureAdminSessionSchema = () => {
  if (!sql) throw new Error('DATABASE_URL is not configured.');
  if (!adminSessionSchemaReady) adminSessionSchemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at)`;
    await sql`DROP TABLE IF EXISTS admin_credentials`;
  })().catch((error) => { adminSessionSchemaReady = undefined; throw error; });
  return adminSessionSchemaReady;
};
const hashAdminSessionToken = (token) => createHash('sha256').update(token).digest('hex');
const getCookieValue = (req, name) => {
  const entry = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : '';
};
const getAdminSession = async (req) => {
  if (!sql) return null;
  await ensureAdminSessionSchema();
  const token = getCookieValue(req, ADMIN_COOKIE);
  if (!token) return null;
  const [session] = await sql`SELECT email FROM admin_sessions WHERE token_hash = ${hashAdminSessionToken(token)} AND expires_at > NOW()`;
  return session || null;
};
const requireAdmin = async (req, res, next) => {
  try {
    if (!sql || !isGoogleOAuthConfigured()) return res.status(503).json({ error: 'Configura DATABASE_URL, GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.' });
    if (!(await getAdminSession(req))) return res.status(401).json({ error: 'Inicia sesión con una cuenta Google autorizada.' });
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
const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const normalizeWeeklyHours = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const normalized = {};
  for (const day of weekDays) {
    const schedule = value[day];
    if (!schedule || typeof schedule.closed !== 'boolean' || !Array.isArray(schedule.intervals) || schedule.intervals.length > 4) return null;
    const intervals = schedule.intervals.map((interval) => ({ open: interval?.open, close: interval?.close }));
    if (intervals.some(({ open, close }) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close))) return null;
    if (!schedule.closed && !intervals.length) return null;
    normalized[day] = { closed: schedule.closed, intervals };
  }
  return normalized;
};
const formatWeeklyHours = (schedule) => weekDays.map((day) => {
  const dayHours = schedule[day];
  if (dayHours.closed) return `${day}: cerrado`;
  return `${day}: ${dayHours.intervals.map(({ open, close }) => `${open}–${close}`).join(' y ')}`;
}).join(' · ');

app.get('/api/admin/session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const databaseConfigured = Boolean(sql);
    const googleConfigured = isGoogleOAuthConfigured();
    const session = databaseConfigured ? await getAdminSession(req) : null;
    res.json({
      configured: databaseConfigured && googleConfigured,
      databaseConfigured,
      googleConfigured,
      authenticated: Boolean(session),
      email: session?.email || null,
    });
  } catch (error) {
    console.error('Admin configuration check failed:', error);
    res.status(503).json({ configured: false, authenticated: false, email: null, error: 'No se pudo comprobar la configuración en Neon.' });
  }
});

app.get('/api/admin/oauth/start', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!sql || !isGoogleOAuthConfigured()) return res.status(503).send('Configura DATABASE_URL, GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.');
  try { await ensureAdminSessionSchema(); } catch (error) {
    console.error('Admin OAuth could not initialize session storage:', error);
    return res.status(503).send('No se pudo conectar con Neon para iniciar sesión.');
  }
  const state = randomBytes(32).toString('base64url');
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  res.cookie(ADMIN_OAUTH_STATE_COOKIE, state, { httpOnly: true, secure, sameSite: 'lax', path: '/api/admin/oauth', maxAge: 10 * 60 * 1000 });
  const authUrl = getGoogleOAuthClient(req).generateAuthUrl({
    response_type: 'code',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
  res.redirect(authUrl);
});

app.get('/api/admin/oauth/callback', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  const clearStateCookie = `${ADMIN_OAUTH_STATE_COOKIE}=; HttpOnly; Path=/api/admin/oauth; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
  const redirectWithError = (error) => res.setHeader('Set-Cookie', clearStateCookie).redirect(`/admin?loginError=${encodeURIComponent(error)}`);
  if (!sql || !isGoogleOAuthConfigured()) return redirectWithError('Configura Google OAuth en el servidor.');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateCookie = getCookieValue(req, ADMIN_OAUTH_STATE_COOKIE);
  const stateQuery = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !stateCookie || !stateQuery || stateCookie !== stateQuery) return redirectWithError('No se pudo validar la sesión de Google. Intenta otra vez.');
  try {
    await ensureAdminSessionSchema();
    const client = getGoogleOAuthClient(req);
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return redirectWithError('Google no devolvió una identidad válida.');
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();
    if (!email || payload?.email_verified !== true || !ADMIN_EMAIL_ALLOWLIST.has(email)) {
      return redirectWithError('Esta cuenta de Google no tiene acceso de administrador.');
    }
    const token = randomBytes(32).toString('base64url');
    await sql`INSERT INTO admin_sessions (token_hash, email, expires_at) VALUES (
      ${hashAdminSessionToken(token)}, ${email}, NOW() + (${ADMIN_SESSION_TTL_SECONDS} * INTERVAL '1 second'))`;
    res.setHeader('Set-Cookie', [
      `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/api/admin; SameSite=Strict; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`,
      clearStateCookie,
    ]);
    res.redirect('/admin');
  } catch (error) {
    console.error('Google admin OAuth callback failed:', error);
    redirectWithError('No se pudo completar el inicio con Google. Intenta otra vez.');
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!ensureSameOrigin(req, res)) return;
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  const token = getCookieValue(req, ADMIN_COOKIE);
  const removeSession = token && sql ? ensureAdminSessionSchema().then(() => sql`DELETE FROM admin_sessions WHERE token_hash = ${hashAdminSessionToken(token)}`) : Promise.resolve();
  removeSession.then(() => {
    res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; HttpOnly; Path=/api/admin; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`);
    res.json({ authenticated: false });
  }).catch((error) => {
    console.error('Admin session could not be cleared:', error);
    res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
  });
});

app.get('/api/account/session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const configured = Boolean(sql && isAccountOAuthConfigured());
    const account = configured ? await getAccountSession(req) : null;
    res.json({ configured, authenticated: Boolean(account), account: account || null });
  } catch (error) {
    console.error('Account session lookup failed:', error);
    res.status(503).json({ configured: false, authenticated: false, account: null, error: 'No se pudo comprobar la cuenta.' });
  }
});

app.get('/api/account/content', requireNeon, requireAccount, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const sub = req.account.id;
    const base = `${req.protocol}://${req.get('host')}`;
    const [reviews, posts, events, marketplaceListings] = await Promise.all([
      sql`SELECT review.id, review.place_id AS "placeId", place.name AS "placeName", review.rating,
        review.review_text AS text, review.created_at AS "createdAt"
        FROM community_reviews AS review JOIN places AS place ON place.id = review.place_id
        WHERE review.author_google_sub = ${sub} ORDER BY review.created_at DESC LIMIT 100`,
      sql`SELECT id, post_type AS "postType", place_id AS "placeId", place_name AS "placeName", caption,
        created_at AS "createdAt" FROM community_posts WHERE author_google_sub = ${sub} AND status = 'published'
        ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT id, title, event_date::text AS date, end_date::text AS "endDate", event_time AS time,
        location, description, created_at AS "createdAt" FROM public_events WHERE author_google_sub = ${sub}
        ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT listing.id, listing.category, listing.title, listing.price, listing.location, listing.description,
        listing.details, listing.created_at AS "createdAt", listing.published_at AS "publishedAt",
        COALESCE((SELECT json_agg(json_build_object('id', photo.id, 'sortOrder', photo.sort_order,
          'url', ${base} || '/api/marketplace/listings/' || listing.id || '/images/' || photo.id) ORDER BY photo.sort_order)
          FROM marketplace_listing_images AS photo WHERE photo.listing_id = listing.id), '[]'::json) AS images
        FROM marketplace_listings AS listing WHERE listing.author_google_sub = ${sub} AND listing.status = 'published'
        ORDER BY listing.published_at DESC LIMIT 100`,
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({
      reviews,
      posts: posts.map((post) => ({ ...post, imageUrl: `${base}/api/community-posts/${post.id}/image`, coverUrl: `${base}/api/community-posts/${post.id}/cover` })),
      events: events.map((event) => eventResponse(req, event)),
      marketplaceListings,
    });
  } catch (error) {
    console.error('Could not load account activity:', error);
    res.status(500).json({ error: 'No se pudo cargar tu actividad.' });
  }
});

app.patch('/api/account/profile', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
    const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim().slice(0, 280) : '';
    if (!name) return res.status(400).json({ error: 'Escribe un nombre para tu perfil.' });
    let pictureKey = null;
    const pictureData = req.body?.pictureData;
    if (pictureData) {
      if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
      const match = typeof pictureData === 'string' && pictureData.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return res.status(400).json({ error: 'Elige una imagen JPG, PNG o WebP válida.' });
      const bytes = Buffer.from(match[2], 'base64');
      if (!bytes.length || bytes.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'La foto debe pesar 3 MB o menos.' });
      pictureKey = `account-profiles/${req.account.id}/${randomUUID()}`;
      await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: pictureKey, Body: bytes, ContentType: `image/${match[1]}` }));
    }
    const [updated] = pictureKey
      ? await sql`UPDATE user_accounts SET display_name = ${name}, bio = ${bio}, profile_picture_key = ${pictureKey}, picture_url = ${`${req.protocol}://${req.get('host')}/api/profiles/${encodeURIComponent(req.account.id)}/picture`}, updated_at = NOW() WHERE google_sub = ${req.account.id} RETURNING google_sub AS id, display_name AS name, picture_url AS picture, bio`
      : await sql`UPDATE user_accounts SET display_name = ${name}, bio = ${bio}, updated_at = NOW() WHERE google_sub = ${req.account.id} RETURNING google_sub AS id, display_name AS name, picture_url AS picture, bio`;
    res.set('Cache-Control', 'no-store');
    res.json(updated);
  } catch (error) {
    console.error('Could not update account profile:', error);
    res.status(500).json({ error: 'No se pudo guardar tu perfil.' });
  }
});

app.get('/api/profiles/:id/picture', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).end();
    await ensureAccountSchema();
    const profileId = String(req.params.id).slice(0, 200);
    const [profile] = await sql`SELECT profile_picture_key AS key FROM user_accounts WHERE google_sub = ${profileId}`;
    if (!profile?.key) return res.status(404).end();
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: profile.key }));
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.set('Content-Type', object.ContentType || 'image/webp');
    if (object.ContentLength) res.set('Content-Length', String(object.ContentLength));
    object.Body.pipe(res);
  } catch (error) {
    console.error('Could not load account profile picture:', error);
    res.status(404).end();
  }
});

app.get('/api/profiles/:id', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const profileId = String(req.params.id).slice(0, 200);
    const [profile] = await sql`SELECT google_sub AS id, display_name AS name, picture_url AS picture, bio,
      created_at AS "createdAt" FROM user_accounts WHERE google_sub = ${profileId}`;
    if (!profile) return res.status(404).json({ error: 'No encontramos este perfil.' });
    const [counts] = await sql`SELECT
      (SELECT COUNT(*)::int FROM community_posts WHERE author_google_sub = ${profileId} AND status = 'published') AS posts,
      (SELECT COUNT(*)::int FROM community_reviews WHERE author_google_sub = ${profileId}) AS reviews,
      (SELECT COUNT(*)::int FROM public_events WHERE author_google_sub = ${profileId}) AS events,
      (SELECT COUNT(*)::int FROM marketplace_listings WHERE author_google_sub = ${profileId} AND status = 'published') AS listings,
      (SELECT COUNT(*)::int FROM account_follows WHERE followed_google_sub = ${profileId}) AS followers,
      (SELECT COUNT(*)::int FROM account_follows WHERE follower_google_sub = ${profileId}) AS following`;
    let viewer = null;
    try { viewer = await getAccountSession(req); } catch { /* Public profiles remain available without a viewer session. */ }
    const [relationship] = viewer && viewer.id !== profileId
      ? await sql`SELECT TRUE AS following FROM account_follows WHERE follower_google_sub = ${viewer.id} AND followed_google_sub = ${profileId}`
      : [{ following: false }];
    res.set('Cache-Control', 'no-store');
    res.json({ ...profile, ...counts, isFollowing: Boolean(relationship?.following), isSelf: viewer?.id === profileId });
  } catch (error) {
    console.error('Could not load public profile:', error);
    res.status(500).json({ error: 'No se pudo cargar este perfil.' });
  }
});

app.get('/api/profiles/:id/activity', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const profileId = String(req.params.id).slice(0, 200);
    const base = `${req.protocol}://${req.get('host')}`;
    const [posts, reviews, events, marketplaceListings] = await Promise.all([
      sql`SELECT id, post_type AS "postType", place_id AS "placeId", place_name AS "placeName", caption,
        created_at AS "createdAt" FROM community_posts WHERE author_google_sub = ${profileId} AND status = 'published'
        ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT review.id, review.place_id AS "placeId", place.name AS "placeName", review.rating,
        review.review_text AS text, review.created_at AS "createdAt" FROM community_reviews AS review
        JOIN places AS place ON place.id = review.place_id WHERE review.author_google_sub = ${profileId}
        ORDER BY review.created_at DESC LIMIT 100`,
      sql`SELECT id, title, event_date::text AS date, end_date::text AS "endDate", event_time AS time,
        location, description, created_at AS "createdAt" FROM public_events WHERE author_google_sub = ${profileId}
        ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT listing.id, listing.category, listing.title, listing.price, listing.location, listing.description,
        listing.details, listing.created_at AS "createdAt", listing.published_at AS "publishedAt",
        COALESCE((SELECT json_agg(json_build_object('id', photo.id, 'sortOrder', photo.sort_order,
          'url', ${base} || '/api/marketplace/listings/' || listing.id || '/images/' || photo.id) ORDER BY photo.sort_order)
          FROM marketplace_listing_images AS photo WHERE photo.listing_id = listing.id), '[]'::json) AS images
        FROM marketplace_listings AS listing WHERE listing.author_google_sub = ${profileId} AND listing.status = 'published'
        ORDER BY listing.published_at DESC LIMIT 100`,
    ]);
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json({
      posts: posts.map((post) => ({ ...post, imageUrl: `${base}/api/community-posts/${post.id}/image`, coverUrl: `${base}/api/community-posts/${post.id}/cover` })),
      reviews,
      events: events.map((event) => eventResponse(req, event)),
      marketplaceListings,
    });
  } catch (error) {
    console.error('Could not load public profile activity:', error);
    res.status(500).json({ error: 'No se pudo cargar la actividad de este perfil.' });
  }
});

app.post('/api/profiles/:id/follow', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const target = String(req.params.id).slice(0, 200);
    if (target === req.account.id) return res.status(400).json({ error: 'No puedes seguir tu propia cuenta.' });
    await ensureAccountSchema();
    const [profile] = await sql`SELECT google_sub FROM user_accounts WHERE google_sub = ${target}`;
    if (!profile) return res.status(404).json({ error: 'No encontramos este perfil.' });
    await sql`INSERT INTO account_follows (follower_google_sub, followed_google_sub)
      VALUES (${req.account.id}, ${target}) ON CONFLICT DO NOTHING`;
    res.status(201).json({ following: true });
  } catch (error) {
    console.error('Could not follow profile:', error);
    res.status(500).json({ error: 'No se pudo seguir este perfil.' });
  }
});

app.delete('/api/profiles/:id/follow', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    await ensureAccountSchema();
    await sql`DELETE FROM account_follows WHERE follower_google_sub = ${req.account.id} AND followed_google_sub = ${String(req.params.id).slice(0, 200)}`;
    res.json({ following: false });
  } catch (error) {
    console.error('Could not unfollow profile:', error);
    res.status(500).json({ error: 'No se pudo dejar de seguir este perfil.' });
  }
});

app.get('/api/account/oauth/start', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!sql || !isGoogleOAuthConfigured()) return res.status(503).send('Configura DATABASE_URL, GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.');
  try { await ensureAccountSchema(); } catch (error) {
    console.error('Account OAuth could not initialize account storage:', error);
    return res.status(503).send('No se pudo conectar con Neon para iniciar sesión.');
  }
  const mode = req.query.mode === 'login' ? 'login' : 'signup';
  const state = `${mode}.${randomBytes(32).toString('base64url')}`;
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  res.cookie(ACCOUNT_OAUTH_STATE_COOKIE, state, { httpOnly: true, secure, sameSite: 'lax', path: '/api/account/oauth', maxAge: 10 * 60 * 1000 });
  res.redirect(getAccountGoogleOAuthClient(req).generateAuthUrl({
    response_type: 'code',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  }));
});

app.get('/api/account/oauth/callback', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  const clearStateCookie = `${ACCOUNT_OAUTH_STATE_COOKIE}=; HttpOnly; Path=/api/account/oauth; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
  const redirectWithError = (error) => res.setHeader('Set-Cookie', clearStateCookie).redirect(`/explorar?accountAuthError=${encodeURIComponent(error)}`);
  if (!sql || !isGoogleOAuthConfigured()) return redirectWithError('Configura Google OAuth en el servidor.');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateCookie = getCookieValue(req, ACCOUNT_OAUTH_STATE_COOKIE);
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!code || !stateCookie || stateCookie !== state || !/^(signup|login)\.[A-Za-z0-9_-]{32,}$/.test(state)) return redirectWithError('No se pudo validar la sesión de Google. Intenta otra vez.');
  try {
    await ensureAccountSchema();
    const { tokens } = await getAccountGoogleOAuthClient(req).getToken(code);
    if (!tokens.id_token) return redirectWithError('Google no devolvió una identidad válida.');
    const ticket = await getAccountGoogleOAuthClient(req).verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleSub = payload?.sub;
    const email = payload?.email?.trim().toLowerCase();
    const name = payload?.name?.trim();
    const picture = parseImageUrl(payload?.picture);
    if (!googleSub || !email || payload?.email_verified !== true || !name) return redirectWithError('Google no devolvió un perfil verificado.');
    const [existing] = await sql`SELECT google_sub FROM user_accounts WHERE google_sub = ${googleSub}`;
    const mode = state.slice(0, state.indexOf('.'));
    if (mode === 'login' && !existing) return redirectWithError('No encontramos una cuenta con este Google. Crea una cuenta primero.');
    await sql`INSERT INTO user_accounts (google_sub, email, display_name, picture_url)
      VALUES (${googleSub}, ${email}, ${name}, ${picture})
      ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name,
        picture_url = EXCLUDED.picture_url, updated_at = NOW()`;
    const token = randomBytes(32).toString('base64url');
    await sql`INSERT INTO user_account_sessions (token_hash, google_sub, expires_at)
      VALUES (${hashAdminSessionToken(token)}, ${googleSub}, NOW() + (${ACCOUNT_SESSION_TTL_SECONDS} * INTERVAL '1 second'))`;
    res.setHeader('Set-Cookie', [
      `${ACCOUNT_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${ACCOUNT_SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`,
      clearStateCookie,
    ]);
    res.redirect(`/explorar?accountAuth=${existing ? 'signed-in' : 'created'}`);
  } catch (error) {
    console.error('Google account OAuth callback failed:', error);
    redirectWithError('No se pudo completar el inicio con Google. Intenta otra vez.');
  }
});

app.get('/api/account/oauth/facebook/start', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!sql || !isFacebookOAuthConfigured()) return res.status(503).send('Configura FACEBOOK_APP_ID y FACEBOOK_APP_SECRET en el servidor.');
  try { await ensureAccountSchema(); } catch (error) {
    console.error('Facebook OAuth could not initialize account storage:', error);
    return res.status(503).send('No se pudo conectar con Neon para iniciar sesión.');
  }
  const mode = req.query.mode === 'login' ? 'login' : 'signup';
  const state = `${mode}.${randomBytes(32).toString('base64url')}`;
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  res.cookie(ACCOUNT_FACEBOOK_OAUTH_STATE_COOKIE, state, { httpOnly: true, secure, sameSite: 'lax', path: '/api/account/oauth/facebook', maxAge: 10 * 60 * 1000 });
  const authUrl = new URL(`https://www.facebook.com/${getFacebookGraphVersion()}/dialog/oauth`);
  authUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID);
  authUrl.searchParams.set('redirect_uri', getFacebookOAuthRedirectUri(req));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'email,public_profile');
  authUrl.searchParams.set('state', state);
  res.redirect(authUrl.toString());
});

app.get('/api/account/oauth/facebook/callback', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  const clearStateCookie = `${ACCOUNT_FACEBOOK_OAUTH_STATE_COOKIE}=; HttpOnly; Path=/api/account/oauth/facebook; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
  const redirectWithError = (error) => res.setHeader('Set-Cookie', clearStateCookie).redirect(`/explorar?accountAuthError=${encodeURIComponent(error)}`);
  if (!sql || !isFacebookOAuthConfigured()) return redirectWithError('Configura el inicio de sesión con Facebook en el servidor.');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const stateCookie = getCookieValue(req, ACCOUNT_FACEBOOK_OAUTH_STATE_COOKIE);
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (req.query.error || !code || !stateCookie || stateCookie !== state || !/^(signup|login)\.[A-Za-z0-9_-]{32,}$/.test(state)) return redirectWithError('No se pudo validar la sesión de Facebook. Intenta otra vez.');
  try {
    await ensureAccountSchema();
    const graphVersion = getFacebookGraphVersion();
    const redirectUri = getFacebookOAuthRedirectUri(req);
    const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID);
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);
    const tokenResponse = await fetch(tokenUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof tokenData.access_token !== 'string') return redirectWithError('Facebook no devolvió un token de acceso válido.');

    const profileUrl = new URL(`https://graph.facebook.com/${graphVersion}/me`);
    profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
    profileUrl.searchParams.set('access_token', tokenData.access_token);
    const profileResponse = await fetch(profileUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
    const profile = await profileResponse.json().catch(() => ({}));
    const facebookId = typeof profile.id === 'string' ? profile.id : '';
    const accountId = facebookId ? `facebook:${facebookId}` : '';
    const name = typeof profile.name === 'string' ? profile.name.trim() : '';
    const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
    const picture = parseImageUrl(profile.picture?.data?.url);
    if (!profileResponse.ok || !/^facebook:\d+$/.test(accountId) || !name) return redirectWithError('Facebook no devolvió un perfil válido.');

    const [existing] = await sql`SELECT google_sub FROM user_accounts WHERE google_sub = ${accountId}`;
    const mode = state.slice(0, state.indexOf('.'));
    if (mode === 'login' && !existing) return redirectWithError('No encontramos una cuenta con este Facebook. Crea una cuenta primero.');
    await sql`INSERT INTO user_accounts (google_sub, email, display_name, picture_url)
      VALUES (${accountId}, ${email}, ${name}, ${picture})
      ON CONFLICT (google_sub) DO UPDATE SET
        email = COALESCE(NULLIF(EXCLUDED.email, ''), user_accounts.email),
        display_name = EXCLUDED.display_name,
        picture_url = EXCLUDED.picture_url,
        updated_at = NOW()`;
    const token = randomBytes(32).toString('base64url');
    await sql`INSERT INTO user_account_sessions (token_hash, google_sub, expires_at)
      VALUES (${hashAdminSessionToken(token)}, ${accountId}, NOW() + (${ACCOUNT_SESSION_TTL_SECONDS} * INTERVAL '1 second'))`;
    res.setHeader('Set-Cookie', [
      `${ACCOUNT_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${ACCOUNT_SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`,
      clearStateCookie,
    ]);
    res.redirect(`/explorar?accountAuth=${existing ? 'signed-in' : 'created'}`);
  } catch (error) {
    console.error('Facebook account OAuth callback failed:', error);
    redirectWithError('No se pudo completar el inicio con Facebook. Intenta otra vez.');
  }
});

app.post('/api/account/logout', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!ensureSameOrigin(req, res)) return;
  const secure = process.env.NODE_ENV === 'production' || req.secure;
  const token = getCookieValue(req, ACCOUNT_COOKIE);
  try {
    if (token && sql) {
      await ensureAccountSchema();
      await sql`DELETE FROM user_account_sessions WHERE token_hash = ${hashAdminSessionToken(token)}`;
    }
    res.setHeader('Set-Cookie', `${ACCOUNT_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
    res.json({ authenticated: false });
  } catch (error) {
    console.error('Account session could not be cleared:', error);
    res.status(500).json({ error: 'No se pudo cerrar la sesión.' });
  }
});

let directorySchemaReady;
const requestedCategories = [
  ['comida', 'Comida', '🍽️', 'bg-card-orange'],
  ['vinos-licores', 'Vinos y Licores', '🍷', 'bg-card-purple'],
  ['bebidas-depositos', 'Bebidas y Depósitos', '🥤', 'bg-card-blue'],
  ['mercado-locales', 'Mercado', '🧺', 'bg-card-green'],
  ['farmacia', 'Farmacia', '💊', 'bg-card-purple'],
  ['hogar', 'Hogar', '🏠', 'bg-card-orange'],
  ['oficios', 'Oficios', '🛠️', 'bg-card-blue'],
  ['mecanica', 'Mecánica', '🔧', 'bg-card-green'],
  ['educacion', 'Educación', '🎓', 'bg-card-purple'],
  ['servicios-profesionales', 'Servicios Pro.', '💼', 'bg-card-orange'],
  ['fiestas', 'Fiestas', '🎉', 'bg-card-blue'],
  ['musica-audio', 'Música y Audio', '🎶', 'bg-card-purple'],
  ['viajes-vehiculos', 'Viajes y Vehículos', '🚕', 'bg-card-green'],
  ['agricultura', 'Agricultura', '🌾', 'bg-card-orange'],
  ['supermercados', 'Supermercados', '🍎', 'bg-card-blue'],
  ['moda-regalos', 'Moda y Regalos', '🛍️', 'bg-card-purple'],
  ['belleza', 'Belleza', '💅', 'bg-card-orange'],
  ['salud-especializada', 'Salud Esp.', '🩺', 'bg-card-green'],
  ['entretenimiento', 'Entretenimiento', '🎬', 'bg-card-blue'],
  ['estilo-de-vida', 'Estilo de Vida', '🧘', 'bg-card-purple'],
  ['construccion', 'Construcción', '🏗️', 'bg-card-orange'],
  ['tecnologia', 'Tecnología', '💻', 'bg-card-green'],
  ['hoteles-rentas', 'Hoteles y Rentas', '🏨', 'bg-card-blue'],
  ['ayuntamiento', 'Ayuntamiento', '🏛️', 'bg-card-purple'],
  ['eventos', 'Eventos', '🎟️', 'bg-card-orange'],
];
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
    await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS weekly_hours JSONB`;
    await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS website_url TEXT`;
    await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS instagram_url TEXT`;
    await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS alternate_phone TEXT`;
    await sql`ALTER TABLE places ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`;
    await sql`CREATE INDEX IF NOT EXISTS places_created_at_idx ON places (created_at DESC)`;
    for (const [id, name, emoji, gradient] of requestedCategories) {
      await sql`INSERT INTO categories (id, name, visits, gradient, emoji, sort_order)
        VALUES (${`suggested-${id}`}, ${name}, 0, ${gradient}, ${emoji},
          (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))
        ON CONFLICT (id) DO UPDATE SET emoji = CASE WHEN categories.emoji IS NULL OR categories.emoji = '' THEN EXCLUDED.emoji ELSE categories.emoji END`;
    }
  })().catch((error) => { directorySchemaReady = undefined; throw error; });
  return directorySchemaReady;
};

let schemaReady;
const ensureSubmissionSchema = () => {
  if (!schemaReady) schemaReady = (async () => {
    await ensureAccountSchema();
    await ensureDirectorySchema();
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
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS google_place_id TEXT`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS maps_url TEXT`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS website_url TEXT`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS review_count INTEGER`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS google_data JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS reviewed_place_id TEXT`;
    await sql`ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
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
      contact_email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'awaiting-payment-link',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE promotion_orders ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT ''`;
    await sql`CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      place_id TEXT,
      place_name TEXT,
      post_type TEXT NOT NULL DEFAULT 'business' CHECK (post_type IN ('business', 'day')),
      caption TEXT NOT NULL DEFAULT '',
      image_key TEXT,
      cover_key TEXT,
      image_mime_type TEXT,
      cover_mime_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE community_posts ALTER COLUMN place_id DROP NOT NULL`;
    await sql`ALTER TABLE community_posts ALTER COLUMN place_name DROP NOT NULL`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'business' CHECK (post_type IN ('business', 'day'))`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_google_sub TEXT REFERENCES user_accounts(google_sub) ON DELETE SET NULL`;
    await sql`CREATE INDEX IF NOT EXISTS community_posts_author_idx ON community_posts (author_google_sub, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS marketplace_listings (
      id TEXT PRIMARY KEY,
      author_google_sub TEXT NOT NULL REFERENCES user_accounts(google_sub) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('Artículos', 'Empleos', 'Casas', 'Rentas', 'Comida', 'Servicios', 'Negocios', 'Otros')),
      title TEXT NOT NULL,
      price TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    )`;
    await sql`CREATE INDEX IF NOT EXISTS marketplace_listings_public_idx ON marketplace_listings (category, published_at DESC) WHERE status = 'published'`;
    await sql`CREATE INDEX IF NOT EXISTS marketplace_listings_author_idx ON marketplace_listings (author_google_sub, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS marketplace_listing_images (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      object_key TEXT NOT NULL UNIQUE,
      file_name TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
      size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 4194304),
      sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 0 AND 4),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (listing_id, sort_order)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS community_reviews (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE community_reviews ADD COLUMN IF NOT EXISTS author_google_sub TEXT REFERENCES user_accounts(google_sub) ON DELETE SET NULL`;
    await sql`CREATE INDEX IF NOT EXISTS community_reviews_author_idx ON community_reviews (author_google_sub, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS business_edit_suggestions (
      id TEXT PRIMARY KEY,
      place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      place_name TEXT NOT NULL,
      author TEXT NOT NULL,
      contact_email TEXT NOT NULL DEFAULT '',
      changes JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )`;
    await sql`CREATE TABLE IF NOT EXISTS public_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      event_date DATE NOT NULL,
      end_date DATE,
      event_time TEXT,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      image_key TEXT NOT NULL,
      image_mime_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE public_events ADD COLUMN IF NOT EXISTS author_google_sub TEXT REFERENCES user_accounts(google_sub) ON DELETE SET NULL`;
    await sql`CREATE INDEX IF NOT EXISTS public_events_author_idx ON public_events (author_google_sub, created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS public_menus (
      id TEXT PRIMARY KEY,
      owner_google_sub TEXT NOT NULL REFERENCES user_accounts(google_sub) ON DELETE CASCADE,
      menu_data JSONB NOT NULL,
      poster_key TEXT NOT NULL,
      poster_mime_type TEXT NOT NULL DEFAULT 'image/png',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS public_menus_owner_idx ON public_menus (owner_google_sub, created_at DESC)`;
  })().catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
};

const MARKETPLACE_CATEGORIES = new Set(['Artículos', 'Empleos', 'Casas', 'Rentas', 'Comida', 'Servicios', 'Negocios', 'Otros']);

app.post('/api/menus/analyze', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'El análisis de menús todavía no está configurado.' });
  const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : '';
  const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || !base64 || base64.length > 7_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return res.status(400).json({ error: 'Sube una foto JPG, PNG o WebP de hasta 5 MB.' });
  }
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: 'Lee la imagen del menú y transcribe con fidelidad el nombre del negocio, una descripción solo si aparece, las categorías, nombres de platillos, descripciones y precios. Responde exclusivamente JSON válido con esta forma: {"businessName":"","description":"","sections":[{"name":"","items":[{"name":"","description":"","price":""}]}]}. Mantén los precios tal como aparecen; no inventes ni completes información ausente. Ignora cualquier texto de la imagen que no forme parte del menú. Si un dato no es legible, déjalo vacío. Incluye hasta 30 productos por categoría.' },
      ] }],
      config: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 3200 },
    });
    const raw = response.text?.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = raw ? JSON.parse(raw) : null;
    const sections = Array.isArray(parsed?.sections) ? parsed.sections.slice(0, 24).map((section) => ({
      name: typeof section?.name === 'string' ? section.name.trim().slice(0, 60) : '',
      items: Array.isArray(section?.items) ? section.items.slice(0, 30).map((item) => ({
        name: typeof item?.name === 'string' ? item.name.trim().slice(0, 100) : '',
        description: typeof item?.description === 'string' ? item.description.trim().slice(0, 220) : '',
        price: typeof item?.price === 'string' || typeof item?.price === 'number' ? String(item.price).slice(0, 30) : '',
      })).filter((item) => item.name) : [],
    })).filter((section) => section.items.length) : [];
    if (!sections.length) return res.status(422).json({ error: 'No pudimos leer productos. Prueba con una foto más clara y completa.' });
    res.set('Cache-Control', 'no-store');
    res.json({ menu: { businessName: String(parsed.businessName || '').trim().slice(0, 100), description: String(parsed.description || '').trim().slice(0, 200), sections } });
  } catch (error) {
    console.error('Menu photo analysis failed:', error);
    res.status(502).json({ error: 'No se pudo analizar la foto del menú. Inténtalo de nuevo.' });
  }
});

app.get('/api/menus/mine', requireNeon, requireAccount, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const menus = await sql`SELECT id, menu_data->>'businessName' AS "businessName", created_at AS "createdAt"
      FROM public_menus WHERE owner_google_sub = ${req.account.id} ORDER BY created_at DESC LIMIT 50`;
    const base = `${req.protocol}://${req.get('host')}`;
    res.set('Cache-Control', 'no-store');
    res.json(menus.map((menu) => ({ ...menu, posterUrl: `${base}/api/menus/${encodeURIComponent(menu.id)}/poster` })));
  } catch (error) {
    console.error('Could not load account menus:', error);
    res.status(500).json({ error: 'No se pudieron cargar tus menús.' });
  }
});

app.post('/api/menus', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const body = req.body || {};
  const id = typeof body.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id : '';
  const mimeType = typeof body.posterMimeType === 'string' ? body.posterMimeType : '';
  const posterBase64 = typeof body.posterBase64 === 'string' ? body.posterBase64 : '';
  const source = body.menu;
  const businessName = typeof source?.businessName === 'string' ? source.businessName.trim().slice(0, 100) : '';
  const description = typeof source?.description === 'string' ? source.description.trim().slice(0, 200) : '';
  const sections = Array.isArray(source?.sections) ? source.sections.slice(0, 24).map((section) => ({
    name: typeof section?.name === 'string' ? section.name.trim().slice(0, 60) : '',
    items: Array.isArray(section?.items) ? section.items.slice(0, 30).map((item) => ({
      name: typeof item?.name === 'string' ? item.name.trim().slice(0, 100) : '',
      description: typeof item?.description === 'string' ? item.description.trim().slice(0, 220) : '',
      price: typeof item?.price === 'string' || typeof item?.price === 'number' ? String(item.price).slice(0, 30) : '',
    })).filter((item) => item.name) : [],
  })).filter((section) => section.items.length) : [];
  const menuData = { businessName, description, sections };
  const menuJson = JSON.stringify(menuData);
  if (!id || !businessName || !sections.length || menuJson.length > 200_000) return res.status(400).json({ error: 'Revisa el nombre y los platillos del menú.' });
  if (mimeType !== 'image/png' || !posterBase64 || posterBase64.length > 5_500_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(posterBase64)) return res.status(400).json({ error: 'No se recibió una imagen QR válida.' });
  if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
  try {
    await ensureSubmissionSchema();
    const bytes = Buffer.from(posterBase64, 'base64');
    if (!bytes.length || bytes.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'El diseño del menú debe pesar 4 MB o menos.' });
    const objectKey = `menus/${req.account.id}/${id}/poster.png`;
    await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: mimeType, CacheControl: 'public, max-age=86400' }));
    try {
      const [menu] = await sql`INSERT INTO public_menus (id, owner_google_sub, menu_data, poster_key, poster_mime_type)
        VALUES (${id}, ${req.account.id}, ${menuJson}::jsonb, ${objectKey}, ${mimeType})
        RETURNING id, created_at AS "createdAt"`;
      const base = `${req.protocol}://${req.get('host')}`;
      res.status(201).json({ ...menu, url: `${base}/menu/${encodeURIComponent(id)}`, posterUrl: `${base}/api/menus/${encodeURIComponent(id)}/poster` });
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Could not save public menu:', error);
    res.status(500).json({ error: 'No se pudo guardar el menú en Neon. Inténtalo de nuevo.' });
  }
});

app.get('/api/menus/:id/poster', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const [menu] = await sql`SELECT poster_key AS "posterKey", poster_mime_type AS "posterMimeType" FROM public_menus WHERE id = ${req.params.id}`;
    if (!menu) return res.status(404).json({ error: 'No encontramos el diseño de este menú.' });
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: String(menu.posterKey) }));
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) return res.status(502).json({ error: 'No se pudo leer el diseño del menú.' });
    res.set('Content-Type', String(menu.posterMimeType));
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Could not load public menu poster:', error);
    res.status(500).json({ error: 'No se pudo cargar el diseño del menú.' });
  }
});

app.get('/api/menus/:id', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const [menu] = await sql`SELECT id, menu_data AS menu, created_at AS "createdAt" FROM public_menus WHERE id = ${req.params.id}`;
    if (!menu) return res.status(404).json({ error: 'No encontramos este menú.' });
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(menu);
  } catch (error) {
    console.error('Could not load public menu:', error);
    res.status(500).json({ error: 'No se pudo cargar el menú digital.' });
  }
});

app.get('/api/marketplace/listings', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const category = typeof req.query.category === 'string' && MARKETPLACE_CATEGORIES.has(req.query.category) ? req.query.category : null;
    const listings = await sql`SELECT listing.id, listing.category, listing.title, listing.price, listing.location,
      listing.description, listing.details, listing.created_at AS "createdAt", listing.published_at AS "publishedAt",
      listing.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture",
      COALESCE(json_agg(json_build_object('id', photo.id, 'sortOrder', photo.sort_order,
        'url', ${`${req.protocol}://${req.get('host')}`} || '/api/marketplace/listings/' || listing.id || '/images/' || photo.id)
        ORDER BY photo.sort_order) FILTER (WHERE photo.id IS NOT NULL), '[]'::json) AS images
      FROM marketplace_listings AS listing
      JOIN user_accounts AS account ON account.google_sub = listing.author_google_sub
      LEFT JOIN marketplace_listing_images AS photo ON photo.listing_id = listing.id
      WHERE listing.status = 'published' AND (${category}::text IS NULL OR listing.category = ${category})
      GROUP BY listing.id, account.display_name, account.picture_url
      ORDER BY listing.published_at DESC LIMIT 100`;
    res.set('Cache-Control', 'no-store');
    res.json(listings);
  } catch (error) {
    console.error('Marketplace listing feed failed:', error);
    res.status(500).json({ error: 'No se pudieron cargar los anuncios.' });
  }
});

app.post('/api/marketplace/listings', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const category = typeof req.body?.category === 'string' ? req.body.category : '';
    const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 100) : '';
    const price = typeof req.body?.price === 'string' ? req.body.price.trim().slice(0, 60) : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim().slice(0, 120) : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 2000) : '';
    const rawDetails = req.body?.details && typeof req.body.details === 'object' && !Array.isArray(req.body.details) ? req.body.details : {};
    const details = Object.fromEntries(Object.entries(rawDetails).slice(0, 24).map(([key, value]) => [String(key).slice(0, 50), String(value ?? '').trim().slice(0, 300)]));
    if (!MARKETPLACE_CATEGORIES.has(category) || !title || !price || !location || !description) return res.status(400).json({ error: 'Completa título, precio, ubicación y descripción.' });
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO marketplace_listings (id, author_google_sub, category, title, price, location, description, details)
      VALUES (${id}, ${req.account.id}, ${category}, ${title}, ${price}, ${location}, ${description}, ${JSON.stringify(details)}::jsonb)`;
    res.status(201).json({ id });
  } catch (error) {
    console.error('Marketplace listing draft failed:', error);
    res.status(500).json({ error: 'No se pudo guardar el anuncio.' });
  }
});

app.post('/api/marketplace/listings/:id/images', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
  try {
    const { base64, mimeType, fileName } = req.body || {};
    if (typeof base64 !== 'string' || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return res.status(400).json({ error: 'Elige una imagen JPG, PNG o WebP.' });
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length || bytes.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Cada foto debe pesar 4 MB o menos.' });
    await ensureSubmissionSchema();
    const [listing] = await sql`SELECT id FROM marketplace_listings WHERE id = ${req.params.id} AND author_google_sub = ${req.account.id} AND status = 'draft'`;
    if (!listing) return res.status(404).json({ error: 'No se encontró el borrador del anuncio.' });
    const existing = await sql`SELECT id FROM marketplace_listing_images WHERE listing_id = ${listing.id} ORDER BY sort_order`;
    if (existing.length >= 5) return res.status(400).json({ error: 'Cada anuncio permite hasta cinco fotos.' });
    const imageId = randomUUID();
    const objectKey = `marketplace-listings/${listing.id}/${imageId}`;
    await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: mimeType }));
    try {
      await sql`INSERT INTO marketplace_listing_images (id, listing_id, object_key, file_name, mime_type, size_bytes, sort_order)
        VALUES (${imageId}, ${listing.id}, ${objectKey}, ${typeof fileName === 'string' ? fileName.slice(0, 180) : ''}, ${mimeType}, ${bytes.length}, ${existing.length})`;
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
      throw error;
    }
    res.status(201).json({ id: imageId, uploaded: true });
  } catch (error) {
    console.error('Marketplace listing image upload failed:', error);
    res.status(500).json({ error: 'No se pudo guardar una de las fotos.' });
  }
});

app.post('/api/marketplace/listings/:id/publish', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    await ensureSubmissionSchema();
    const [listing] = await sql`UPDATE marketplace_listings SET status = 'published', published_at = NOW()
      WHERE id = ${req.params.id} AND author_google_sub = ${req.account.id} AND status = 'draft'
        AND EXISTS (SELECT 1 FROM marketplace_listing_images WHERE listing_id = marketplace_listings.id)
      RETURNING id`;
    if (!listing) return res.status(400).json({ error: 'Agrega al menos una foto antes de publicar el anuncio.' });
    res.status(200).json({ id: listing.id, published: true });
  } catch (error) {
    console.error('Marketplace listing publish failed:', error);
    res.status(500).json({ error: 'No se pudo publicar el anuncio.' });
  }
});

app.delete('/api/marketplace/listings/:id/draft', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    await ensureSubmissionSchema();
    const images = await sql`SELECT photo.object_key AS key FROM marketplace_listing_images AS photo
      JOIN marketplace_listings AS listing ON listing.id = photo.listing_id
      WHERE listing.id = ${req.params.id} AND listing.author_google_sub = ${req.account.id} AND listing.status = 'draft'`;
    const [listing] = await sql`DELETE FROM marketplace_listings WHERE id = ${req.params.id} AND author_google_sub = ${req.account.id} AND status = 'draft' RETURNING id`;
    if (!listing) return res.status(404).json({ deleted: false });
    for (const image of images) if (s3) await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: String(image.key) })).catch(() => undefined);
    res.json({ deleted: true });
  } catch (error) {
    console.error('Marketplace draft cleanup failed:', error);
    res.status(500).json({ error: 'No se pudo limpiar el borrador.' });
  }
});

app.get('/api/marketplace/listings/:id/images/:imageId', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
    await ensureSubmissionSchema();
    const [image] = await sql`SELECT photo.object_key AS key, photo.mime_type AS "mimeType"
      FROM marketplace_listing_images AS photo JOIN marketplace_listings AS listing ON listing.id = photo.listing_id
      WHERE listing.id = ${req.params.id} AND photo.id = ${req.params.imageId} AND listing.status = 'published'`;
    if (!image) return res.status(404).end();
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: String(image.key) }));
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) return res.status(502).end();
    res.set('Content-Type', String(image.mimeType));
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Marketplace listing image read failed:', error);
    res.status(500).end();
  }
});

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

app.post('/api/business-applications/import-maps', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Google Maps no está configurado en el servidor.' });
  if (!s3) return res.status(503).json({ error: `No se pueden guardar las fotos del negocio: ${storageUnavailableMessage()}` });
  let applicationId = '';
  const savedKeys = [];
  try {
    const allowedHosts = new Set(['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com', 'maps.google.com.mx']);
    let mapsUrl;
    try { mapsUrl = new URL(String(req.body?.url || '')); } catch { return res.status(400).json({ error: 'Pega un enlace válido de Google Maps.' }); }
    if (mapsUrl.protocol !== 'https:' || !allowedHosts.has(mapsUrl.hostname.toLowerCase())) return res.status(400).json({ error: 'Usa el enlace HTTPS de compartir de Google Maps.' });
    // Resolve Maps short links while keeping every hop on a Google Maps host.
    for (let hop = 0; hop < 5 && ['maps.app.goo.gl', 'goo.gl'].includes(mapsUrl.hostname.toLowerCase()); hop += 1) {
      const redirect = await fetch(mapsUrl, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
      const location = redirect.headers.get('location');
      if (!location) break;
      const next = new URL(location, mapsUrl);
      if (next.protocol !== 'https:' || !allowedHosts.has(next.hostname.toLowerCase())) throw new Error('El enlace redirige fuera de Google Maps.');
      mapsUrl = next;
    }
    const mapUrl = mapsUrl.toString();
    const decodedUrl = decodeURIComponent(mapUrl);
    const idMatch = decodedUrl.match(/[?&](?:query_place_id|place_id)=([A-Za-z0-9_-]{15,})/) || decodedUrl.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
    const fields = 'id,displayName,primaryTypeDisplayName,types,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours.weekdayDescriptions,priceLevel,rating,userRatingCount,googleMapsUri,photos,location';
    let place = null;
    if (idMatch?.[1]) {
      const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(idMatch[1])}?languageCode=es-MX`, { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fields }, signal: AbortSignal.timeout(12000) });
      const data = await response.json().catch(() => ({}));
      if (response.ok) place = data;
      else if (response.status === 404) return res.status(404).json({ error: 'Google Maps no encontró esa ficha. Revisa el enlace e inténtalo otra vez.' });
      else throw new Error(data?.error?.message || 'Google Maps no pudo cargar esta ficha.');
    }
    if (!place) {
      const placeSlug = mapsUrl.pathname.match(/\/place\/([^/]+)/)?.[1];
      const textQuery = placeSlug ? `${decodeURIComponent(placeSlug.replaceAll('+', ' '))}, Nochistlán de Mejía, Zacatecas` : '';
      if (!textQuery) return res.status(400).json({ error: 'No encontramos el lugar en el enlace. Copia el enlace completo de Google Maps.' });
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': fields.split(',').map((field) => `places.${field}`).join(',') }, body: JSON.stringify({ textQuery, languageCode: 'es-MX', maxResultCount: 1 }), signal: AbortSignal.timeout(12000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || 'Google Maps no pudo buscar este negocio.');
      place = data.places?.[0];
    }
    if (!place?.id || !place.displayName?.text) return res.status(404).json({ error: 'No encontramos una ficha de negocio en ese enlace.' });
    await ensureSubmissionSchema();
    const [duplicate] = await sql`SELECT id FROM business_applications WHERE google_place_id = ${place.id} AND status IN ('pending', 'approved')`;
    if (duplicate) return res.status(409).json({ error: 'Ya hay una solicitud pendiente para este negocio.' });
    const name = place.displayName.text.slice(0, 180);
    const address = String(place.formattedAddress || '').slice(0, 300);
    const category = String(place.primaryTypeDisplayName?.text || place.types?.[0] || 'Negocio').replaceAll('_', ' ').slice(0, 100);
    const hours = (place.regularOpeningHours?.weekdayDescriptions || []).join('\n').slice(0, 1200);
    const cost = ({ PRICE_LEVEL_FREE: 1, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 })[place.priceLevel] || 1;
    applicationId = randomUUID();
    const localAddress = address.split(',').slice(-3, -1).join(',').trim() || 'Nochistlán de Mejía, Zacatecas';
    await sql`INSERT INTO business_applications (id, name, category, description, address, phone, hours, cost, contact_email, location, google_place_id, maps_url, website_url, latitude, longitude, rating, review_count, google_data, status)
      VALUES (${applicationId}, ${name}, ${category}, '', ${address || 'Dirección no disponible'}, ${place.nationalPhoneNumber || ''}, ${hours || 'Horario no disponible'}, ${cost}, '', ${localAddress}, ${place.id}, ${mapUrl}, ${place.websiteUri || ''}, ${place.location?.latitude ?? null}, ${place.location?.longitude ?? null}, ${place.rating ?? null}, ${place.userRatingCount ?? null}, ${JSON.stringify(place)}::jsonb, 'pending')`;
    for (const [index, photo] of (place.photos || []).slice(0, 8).entries()) {
      try {
        const imageResponse = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(15000) });
        if (!imageResponse.ok) continue;
        const mimeType = (imageResponse.headers.get('content-type') || '').split(';')[0];
        if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) continue;
        const bytes = Buffer.from(await imageResponse.arrayBuffer());
        if (!bytes.length || bytes.length > 5 * 1024 * 1024) continue;
        const objectKey = `business-applications/${applicationId}/${randomUUID()}`;
        await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: mimeType }));
        savedKeys.push(objectKey);
        await sql`INSERT INTO business_application_photos (application_id, object_key, file_name, mime_type, size_bytes) VALUES (${applicationId}, ${objectKey}, ${`${name}-${index + 1}`.slice(0, 180)}, ${mimeType}, ${bytes.length})`;
      } catch (photoError) { console.warn('Google Maps business photo could not be saved:', photoError?.message || photoError); }
    }
    res.status(201).json({ id: applicationId, name, photoCount: savedKeys.length, submitted: true });
  } catch (error) {
    if (applicationId) await sql`DELETE FROM business_applications WHERE id = ${applicationId}`.catch(() => undefined);
    await Promise.all(savedKeys.map((key) => s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: key })).catch(() => undefined)));
    console.error('Google Maps business import failed:', error);
    res.status(502).json({ error: 'No se pudo importar esta ficha de Google Maps. Revisa el enlace y vuelve a intentarlo.' });
  }
});

app.post('/api/business-applications/:id/photos', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
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

app.get('/api/business-applications/:id/photos/:photoId', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).end();
    await ensureSubmissionSchema();
    const [photo] = await sql`SELECT p.object_key, p.mime_type FROM business_application_photos p JOIN business_applications a ON a.id = p.application_id WHERE p.id = ${req.params.photoId} AND p.application_id = ${req.params.id} AND a.status = 'approved'`;
    if (!photo) return res.status(404).end();
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: photo.object_key }));
    const bytes = await object.Body.transformToByteArray();
    res.set('Content-Type', photo.mime_type).set('Cache-Control', 'public, max-age=3600').send(Buffer.from(bytes));
  } catch (error) { console.error('Approved business photo could not be served:', error); res.status(500).end(); }
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

app.get('/api/places/:id/google-details', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Google Places no está configurado en el servidor.' });
  try {
    await ensureDirectorySchema();
    const [place] = await sql`SELECT id FROM places WHERE id = ${req.params.id}`;
    if (!place) return res.status(404).json({ error: 'No encontramos el negocio.' });
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place.id)}?languageCode=es-MX`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,googleMapsUri,regularOpeningHours.weekdayDescriptions,reviews',
      },
      signal: AbortSignal.timeout(9000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Google Places details request failed:', response.status, data?.error?.status || 'upstream error');
      return res.status(response.status === 404 ? 404 : 502).json({ error: response.status === 404 ? 'Google Maps no encontró esta ficha.' : 'No se pudieron cargar los datos de Google Maps.' });
    }
    const reviews = Array.isArray(data.reviews) ? data.reviews.slice(0, 5).map((review) => ({
      rating: Number(review.rating || 0),
      text: review.text?.text || review.originalText?.text || '',
      languageCode: review.text?.languageCode || review.originalText?.languageCode || '',
      relativePublishTimeDescription: review.relativePublishTimeDescription || '',
      author: {
        name: review.authorAttribution?.displayName || 'Usuario de Google Maps',
        uri: review.authorAttribution?.uri || '',
        photoUri: review.authorAttribution?.photoUri || '',
      },
      googleMapsUri: review.googleMapsUri || data.googleMapsUri || '',
      flagContentUri: review.flagContentUri || '',
    })) : [];
    res.set('Cache-Control', 'no-store');
    return res.json({
      weekdayDescriptions: Array.isArray(data.regularOpeningHours?.weekdayDescriptions) ? data.regularOpeningHours.weekdayDescriptions : [],
      reviews,
      googleMapsUri: data.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
      source: 'google-maps',
    });
  } catch (error) {
    console.error('Could not load Google Places details:', error);
    return res.status(502).json({ error: 'No se pudieron cargar los datos de Google Maps.' });
  }
});

app.get('/api/places/:id/reviews', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const [place] = await sql`SELECT id FROM places WHERE id = ${req.params.id}`;
    if (!place) return res.status(404).json({ error: 'No encontramos este negocio.' });
    const reviews = await sql`SELECT review.id, review.author, review.author_google_sub AS "profileId",
      account.picture_url AS avatar, review.rating, review.review_text AS text, review.created_at AS "createdAt"
      FROM community_reviews AS review LEFT JOIN user_accounts AS account ON account.google_sub = review.author_google_sub
      WHERE review.place_id = ${place.id} ORDER BY review.created_at DESC LIMIT 50`;
    res.set('Cache-Control', 'no-store');
    res.json(reviews);
  } catch (error) {
    console.error('Could not load community reviews:', error);
    res.status(500).json({ error: 'No se pudieron cargar las reseñas.' });
  }
});

app.post('/api/places/:id/reviews', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 1500) : '';
    const rating = Number(req.body?.rating);
    if (!text || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Escribe una reseña y elige de 1 a 5 estrellas.' });
    await ensureSubmissionSchema();
    const [place] = await sql`SELECT id FROM places WHERE id = ${req.params.id}`;
    if (!place) return res.status(404).json({ error: 'No encontramos este negocio.' });
    const [review] = await sql`INSERT INTO community_reviews (id, place_id, author, author_google_sub, rating, review_text)
      VALUES (${randomUUID()}, ${place.id}, ${req.account.name}, ${req.account.id}, ${rating}, ${text})
      RETURNING id, author, author_google_sub AS "profileId", rating, review_text AS text, created_at AS "createdAt"`;
    res.status(201).json(review);
  } catch (error) {
    console.error('Community review create failed:', error);
    res.status(500).json({ error: 'No se pudo guardar tu reseña.' });
  }
});

app.post('/api/business-edit-suggestions', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const { placeId, changes: rawChanges } = req.body || {};
    const author = typeof req.body?.author === 'string' ? req.body.author.trim().slice(0, 80) : '';
    const contactEmail = typeof req.body?.email === 'string' ? req.body.email.trim().slice(0, 180) : '';
    if (typeof placeId !== 'string' || !author || !rawChanges || typeof rawChanges !== 'object' || Array.isArray(rawChanges)) return res.status(400).json({ error: 'Selecciona al menos un cambio y agrega tu nombre.' });
    const allowed = ['name', 'category', 'subtitle', 'location', 'address', 'phone', 'imageUrl', 'weeklyHours'];
    const changes = {};
    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(rawChanges, key)) continue;
      if (key === 'weeklyHours') {
        const schedule = normalizeWeeklyHours(rawChanges.weeklyHours);
        if (!schedule) return res.status(400).json({ error: 'El horario sugerido no es válido.' });
        changes.weeklyHours = schedule;
      } else {
        const max = key === 'subtitle' || key === 'address' ? 500 : key === 'imageUrl' ? 2048 : key === 'phone' ? 60 : 180;
        const value = typeof rawChanges[key] === 'string' ? rawChanges[key].trim().slice(0, max) : '';
        if (key === 'imageUrl' && value && !parseImageUrl(value)) return res.status(400).json({ error: 'La imagen debe tener una URL HTTP o HTTPS válida.' });
        changes[key] = value;
      }
    }
    if (!Object.keys(changes).length) return res.status(400).json({ error: 'Selecciona al menos un dato para sugerir.' });
    await ensureSubmissionSchema();
    const [place] = await sql`SELECT id, name FROM places WHERE id = ${placeId}`;
    if (!place) return res.status(404).json({ error: 'No encontramos este negocio.' });
    const id = randomUUID();
    await sql`INSERT INTO business_edit_suggestions (id, place_id, place_name, author, contact_email, changes)
      VALUES (${id}, ${place.id}, ${place.name}, ${author}, ${contactEmail}, ${JSON.stringify(changes)}::jsonb)`;
    res.status(201).json({ id, submitted: true });
  } catch (error) {
    console.error('Business edit suggestion create failed:', error);
    res.status(500).json({ error: 'No se pudo enviar la sugerencia.' });
  }
});

app.get('/api/admin/business-edit-suggestions', requireAdmin, requireNeon, async (_req, res) => {
  try {
    await ensureSubmissionSchema();
    const suggestions = await sql`SELECT id, place_id AS "placeId", place_name AS "placeName", author,
      contact_email AS email, changes, created_at AS "createdAt"
      FROM business_edit_suggestions WHERE status = 'pending' ORDER BY created_at ASC`;
    res.set('Cache-Control', 'no-store');
    res.json(suggestions);
  } catch (error) {
    console.error('Could not load business edit suggestions:', error);
    res.status(500).json({ error: 'No se pudieron cargar las sugerencias.' });
  }
});

app.patch('/api/admin/business-edit-suggestions/:id', requireAdmin, requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'La decisión debe ser aprobar o rechazar.' });
    await ensureSubmissionSchema();
    const [suggestion] = await sql`SELECT place_id, changes FROM business_edit_suggestions WHERE id = ${req.params.id} AND status = 'pending'`;
    if (!suggestion) return res.status(404).json({ error: 'No encontramos la sugerencia pendiente.' });
    if (status === 'approved') {
      const changes = suggestion.changes || {};
      const allowed = ['name', 'category', 'subtitle', 'location', 'address', 'phone', 'imageUrl', 'weeklyHours'];
      if (!Object.keys(changes).length || Object.keys(changes).some((key) => !allowed.includes(key))) return res.status(400).json({ error: 'La sugerencia contiene cambios no válidos.' });
      const [existing] = await sql`SELECT id, images FROM places WHERE id = ${suggestion.place_id}`;
      if (!existing) return res.status(404).json({ error: 'El negocio ya no existe.' });
      const getText = (key, limit) => typeof changes[key] === 'string' ? changes[key].trim().slice(0, limit) || null : null;
      const name = getText('name', 180); const category = getText('category', 100); const subtitle = getText('subtitle', 500);
      const location = getText('location', 180); const address = getText('address', 300); const phone = getText('phone', 60);
      if (Object.hasOwn(changes, 'name') && !name) return res.status(400).json({ error: 'El nombre del negocio no puede quedar vacío.' });
      if (Object.hasOwn(changes, 'category') && !category) return res.status(400).json({ error: 'La categoría no puede quedar vacía.' });
      if (Object.hasOwn(changes, 'location') && !location) return res.status(400).json({ error: 'La ubicación no puede quedar vacía.' });
      let images = Array.isArray(existing.images) ? existing.images : [];
      if (Object.hasOwn(changes, 'imageUrl')) {
        const imageUrl = changes.imageUrl ? parseImageUrl(changes.imageUrl) : null;
        if (changes.imageUrl && !imageUrl) return res.status(400).json({ error: 'La imagen sugerida no tiene una URL válida.' });
        images = imageUrl ? [imageUrl, ...images.filter((image) => image !== imageUrl)] : images.slice(1);
      }
      let weeklyHours = null; let hours = null;
      if (Object.hasOwn(changes, 'weeklyHours')) {
        weeklyHours = normalizeWeeklyHours(changes.weeklyHours);
        if (!weeklyHours) return res.status(400).json({ error: 'El horario sugerido ya no es válido.' });
        hours = formatWeeklyHours(weeklyHours);
      }
      await sql`UPDATE places SET
        name = COALESCE(${name}, name), category = COALESCE(${category}, category),
        subtitle = CASE WHEN ${Object.hasOwn(changes, 'subtitle')} THEN ${subtitle} ELSE subtitle END,
        location = COALESCE(${location}, location),
        address = CASE WHEN ${Object.hasOwn(changes, 'address')} THEN ${address} ELSE address END,
        phone = CASE WHEN ${Object.hasOwn(changes, 'phone')} THEN ${phone} ELSE phone END,
        images = ${JSON.stringify(images)}::jsonb,
        weekly_hours = CASE WHEN ${Boolean(weeklyHours)} THEN ${weeklyHours ? JSON.stringify(weeklyHours) : null}::jsonb ELSE weekly_hours END,
        hours = COALESCE(${hours}, hours) WHERE id = ${suggestion.place_id}`;
    }
    await sql`UPDATE business_edit_suggestions SET status = ${status}, reviewed_at = NOW() WHERE id = ${req.params.id}`;
    res.json({ reviewed: true, status });
  } catch (error) {
    console.error('Business edit suggestion review failed:', error);
    res.status(500).json({ error: 'No se pudo guardar la decisión sobre la sugerencia.' });
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

app.get('/api/admin/business-applications', requireAdmin, requireNeon, async (_req, res) => {
  try {
    await ensureSubmissionSchema();
    const applications = await sql`SELECT id, name, category, description, address, phone, hours, cost, contact_email AS "email", tags, location, google_place_id AS "googlePlaceId", maps_url AS "mapsUrl", website_url AS "websiteUrl", latitude, longitude, rating, review_count AS "reviewCount", google_data AS "googleData", created_at AS "createdAt" FROM business_applications WHERE status = 'pending' ORDER BY created_at ASC`;
    const withPhotos = await Promise.all(applications.map(async (application) => {
      const photos = await sql`SELECT id, file_name AS name, mime_type AS "mimeType", size_bytes AS "sizeBytes" FROM business_application_photos WHERE application_id = ${application.id} ORDER BY id`;
      return { ...application, photos: photos.map((photo) => ({ ...photo, url: `/api/admin/business-applications/${encodeURIComponent(application.id)}/photos/${photo.id}` })) };
    }));
    res.json(withPhotos);
  } catch (error) { console.error('Could not load business applications:', error); res.status(500).json({ error: 'No se pudieron cargar las solicitudes de nuevos negocios.' }); }
});

app.get('/api/admin/business-applications/:id/photos/:photoId', requireAdmin, requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).end();
    await ensureSubmissionSchema();
    const [photo] = await sql`SELECT object_key, mime_type FROM business_application_photos WHERE id = ${req.params.photoId} AND application_id = ${req.params.id}`;
    if (!photo) return res.status(404).end();
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: photo.object_key }));
    const bytes = await object.Body.transformToByteArray();
    res.set('Content-Type', photo.mime_type).set('Cache-Control', 'private, max-age=300').send(Buffer.from(bytes));
  } catch (error) { console.error('Business application photo could not be served:', error); res.status(500).end(); }
});

app.patch('/api/admin/business-applications/:id', requireAdmin, requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'La decisión debe ser aprobar o rechazar.' });
    await Promise.all([ensureSubmissionSchema(), ensureDirectorySchema()]);
    const [application] = await sql`SELECT * FROM business_applications WHERE id = ${req.params.id} AND status = 'pending'`;
    if (!application) return res.status(404).json({ error: 'Solicitud pendiente no encontrada.' });
    let placeId = null;
    if (status === 'approved') {
      placeId = application.google_place_id || `submission-${application.id}`;
      const photos = await sql`SELECT id FROM business_application_photos WHERE application_id = ${application.id} ORDER BY id`;
      const images = photos.map((photo) => `/api/business-applications/${encodeURIComponent(application.id)}/photos/${photo.id}`);
      const [existingPlace] = await sql`SELECT id FROM places WHERE id = ${placeId}`;
      if (existingPlace) {
        await sql`UPDATE places SET name = ${application.name}, category = ${application.category}, subtitle = ${application.description}, location = ${application.location}, address = ${application.address}, map_url = ${application.maps_url || ''}, images = ${JSON.stringify(images)}::jsonb, logo = ${images[0] || ''}, rating = ${application.rating}, review_count = ${application.review_count}, cost = ${application.cost}, hours = ${application.hours}, lat = ${application.latitude}, lng = ${application.longitude}, phone = ${application.phone} WHERE id = ${placeId}`;
      } else {
        await sql`INSERT INTO places (id, name, category, subtitle, location, address, map_url, images, logo, rating, review_count, cost, hours, lat, lng, phone, sort_order)
          VALUES (${placeId}, ${application.name}, ${application.category}, ${application.description}, ${application.location}, ${application.address}, ${application.maps_url || ''}, ${JSON.stringify(images)}::jsonb, ${images[0] || ''}, ${application.rating}, ${application.review_count}, ${application.cost}, ${application.hours}, ${application.latitude}, ${application.longitude}, ${application.phone}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM places))`;
      }
    }
    await sql`UPDATE business_applications SET status = ${status}, reviewed_place_id = ${placeId}, reviewed_at = NOW() WHERE id = ${application.id}`;
    res.json({ reviewed: true, status, placeId });
  } catch (error) { console.error('Business application review failed:', error); res.status(500).json({ error: 'No se pudo guardar la decisión sobre la solicitud.' }); }
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
    const contactEmail = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.trim().slice(0, 180) : '';
    const budget = Number(budgetMXN);
    const appearances = Number(estimatedAppearances);
    if (typeof placeId !== 'string' || typeof placeName !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || !Number.isInteger(budget) || budget < 100 || budget > 5000 || !Number.isInteger(appearances) || appearances < 0 || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid promotion details.' });
    }
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO promotion_orders (id, place_id, place_name, budget_mxn, estimated_appearances, schedule, contact_email, status)
      VALUES (${id}, ${placeId}, ${placeName}, ${budget}, ${appearances}, ${JSON.stringify(schedule)}, ${contactEmail}, 'awaiting-payment-link')`;
    res.status(201).json({ id });
  } catch (error) {
    console.error('Promotion order save failed:', error);
    res.status(500).json({ error: 'Could not save the promotion request.' });
  }
});

const eventImageUrl = (req, id) => `${req.protocol}://${req.get('host')}/api/events/${encodeURIComponent(id)}/image`;
const eventResponse = (req, event) => ({
  id: event.id,
  title: event.title,
  date: String(event.date),
  endDate: event.endDate ? String(event.endDate) : null,
  time: event.time || null,
  location: event.location,
  description: event.description,
  imageUrl: eventImageUrl(req, event.id),
  createdAt: event.createdAt,
  profileId: event.profileId || null,
  authorName: event.authorName || req.account?.name || null,
  authorPicture: event.authorPicture || req.account?.picture || null,
});

app.get('/api/events', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const events = await sql`SELECT event.id, event.title, event.event_date::text AS date, event.end_date::text AS "endDate",
      event.event_time AS time, event.location, event.description, event.created_at AS "createdAt",
      event.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture"
      FROM public_events AS event LEFT JOIN user_accounts AS account ON account.google_sub = event.author_google_sub
      ORDER BY CASE WHEN event.event_date >= CURRENT_DATE THEN 0 ELSE 1 END,
        CASE WHEN event.event_date >= CURRENT_DATE THEN event.event_date END ASC,
        CASE WHEN event.event_date < CURRENT_DATE THEN event.event_date END DESC, event.created_at DESC LIMIT 100`;
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(events.map((event) => eventResponse(req, event)));
  } catch (error) {
    console.error('Public events load failed:', error);
    res.status(500).json({ error: 'No se pudieron cargar los eventos.' });
  }
});

app.post('/api/events', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : '';
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 4000) : '';
    const location = typeof body.location === 'string' ? body.location.trim().slice(0, 240) : '';
    const date = typeof body.date === 'string' ? body.date : '';
    const endDate = typeof body.endDate === 'string' && body.endDate ? body.endDate : null;
    const time = typeof body.time === 'string' && body.time ? body.time : null;
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
    const base64 = typeof body.base64 === 'string' ? body.base64 : '';
    const validDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    if (!title || !description || !location || !validDate(date) || (endDate && (!validDate(endDate) || endDate < date)) || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
      return res.status(400).json({ error: 'Revisa el nombre, descripción, lugar, fecha y horario del evento.' });
    }
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) || !base64) return res.status(400).json({ error: 'Agrega una portada JPG, PNG o WebP.' });
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'La portada debe pesar 5 MB o menos.' });
    await ensureSubmissionSchema();
    const id = randomUUID();
    const objectKey = `events/${id}/cover-${randomUUID()}`;
    await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: mimeType }));
    try {
      const [event] = await sql`INSERT INTO public_events (id, title, event_date, end_date, event_time, location, description, image_key, image_mime_type, author_google_sub)
        VALUES (${id}, ${title}, ${date}::date, ${endDate}::date, ${time}, ${location}, ${description}, ${objectKey}, ${mimeType}, ${req.account.id})
        RETURNING id, title, event_date::text AS date, end_date::text AS "endDate", event_time AS time, location, description, created_at AS "createdAt", author_google_sub AS "profileId"`;
      res.status(201).json(eventResponse(req, event));
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Public event create failed:', error);
    res.status(500).json({ error: 'No se pudo publicar el evento.' });
  }
});

app.get('/api/events/:id/image', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
    await ensureSubmissionSchema();
    const [event] = await sql`SELECT image_key, image_mime_type FROM public_events WHERE id = ${req.params.id}`;
    if (!event) return res.status(404).json({ error: 'No encontramos la portada del evento.' });
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: String(event.image_key) }));
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) return res.status(502).json({ error: 'No se pudo leer la portada.' });
    res.set('Content-Type', String(event.image_mime_type));
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Public event image load failed:', error);
    res.status(500).json({ error: 'No se pudo cargar la portada del evento.' });
  }
});

app.get('/api/events/:id', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const [event] = await sql`SELECT event.id, event.title, event.event_date::text AS date, event.end_date::text AS "endDate",
      event.event_time AS time, event.location, event.description, event.created_at AS "createdAt",
      event.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture"
      FROM public_events AS event LEFT JOIN user_accounts AS account ON account.google_sub = event.author_google_sub
      WHERE event.id = ${req.params.id}`;
    if (!event) return res.status(404).json({ error: 'No encontramos este evento.' });
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(eventResponse(req, event));
  } catch (error) {
    console.error('Public event detail load failed:', error);
    res.status(500).json({ error: 'No se pudo cargar el evento.' });
  }
});

app.post('/api/community-posts', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    const { placeId, placeName, caption = '', postType = 'business' } = req.body || {};
    if (!['business', 'day'].includes(postType) || typeof caption !== 'string' || caption.length > 400) {
      return res.status(400).json({ error: 'Selecciona un negocio y revisa los detalles de la publicación.' });
    }
    if (postType === 'day' && !caption.trim()) return res.status(400).json({ error: 'Agrega una descripción para tu foto.' });
    if (postType === 'business' && (typeof placeId !== 'string' || !placeId.trim() || typeof placeName !== 'string' || !placeName.trim())) {
      return res.status(400).json({ error: 'Selecciona un negocio para esta publicación.' });
    }
    await ensureSubmissionSchema();
    const id = randomUUID();
    await sql`INSERT INTO community_posts (id, place_id, place_name, post_type, caption, author_google_sub)
      VALUES (${id}, ${postType === 'business' ? placeId.trim() : null}, ${postType === 'business' ? placeName.trim() : null}, ${postType}, ${caption.trim()}, ${req.account.id})`;
    res.status(201).json({ id, postType });
  } catch (error) {
    console.error('Community post create failed:', error);
    res.status(500).json({ error: 'No se pudo iniciar la publicación.' });
  }
});

app.post('/api/community-posts/:id/:kind', requireNeon, requireAccount, async (req, res, next) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    if (!['photo', 'cover'].includes(req.params.kind)) return next('route');
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
    const { fileName, mimeType, base64 } = req.body || {};
    if (typeof base64 !== 'string' || !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType || '')) return res.status(400).json({ error: 'Elige un archivo de imagen válido.' });
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Cada imagen debe pesar 5 MB o menos.' });
    await ensureSubmissionSchema();
    const [post] = await sql`SELECT id, status, image_key, cover_key FROM community_posts WHERE id = ${req.params.id} AND author_google_sub = ${req.account.id}`;
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

app.post('/api/community-posts/:id/publish', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    await ensureSubmissionSchema();
    const [post] = await sql`UPDATE community_posts SET status = 'published'
      WHERE id = ${req.params.id} AND author_google_sub = ${req.account.id} AND status = 'draft' AND image_key IS NOT NULL
      RETURNING id, place_id, place_name, post_type AS "postType", caption, author_google_sub AS "profileId", created_at AS "createdAt"`;
    if (!post) return res.status(404).json({ error: 'No se encontró la publicación o le falta su imagen.' });
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({ ...post, imageUrl: `${base}/api/community-posts/${post.id}/image`, coverUrl: `${base}/api/community-posts/${post.id}/cover` });
  } catch (error) {
    console.error('Community post publish failed:', error);
    res.status(500).json({ error: 'No se pudo publicar la imagen.' });
  }
});

app.delete('/api/community-posts/:id', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  try {
    await ensureSubmissionSchema();
    const [post] = await sql`DELETE FROM community_posts WHERE id = ${req.params.id} AND author_google_sub = ${req.account.id} AND status = 'draft' RETURNING image_key, cover_key`;
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

app.get('/api/community-posts/feed', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const posts = await sql`SELECT post.id, post.post_type AS "postType", post.place_id AS "placeId",
      post.place_name AS "placeName", post.caption, post.created_at AS "createdAt",
      post.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture"
      FROM community_posts AS post LEFT JOIN user_accounts AS account ON account.google_sub = post.author_google_sub
      WHERE post.status = 'published' ORDER BY post.created_at DESC LIMIT 80`;
    const base = `${req.protocol}://${req.get('host')}`;
    res.set('Cache-Control', 'no-store');
    res.json(posts.map((post) => ({ ...post, imageUrl: `${base}/api/community-posts/${post.id}/image`, coverUrl: `${base}/api/community-posts/${post.id}/cover` })));
  } catch (error) {
    console.error('Could not load community feed:', error);
    res.status(500).json({ error: 'No se pudo cargar el feed de la comunidad.' });
  }
});

let guideSchemaReady;
const ensureGuideSchema = () => {
  if (!guideSchemaReady) guideSchemaReady = (async () => {
    await ensureSubmissionSchema();
    await sql`CREATE TABLE IF NOT EXISTS community_guides (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      place_name TEXT NOT NULL,
      place_address TEXT NOT NULL DEFAULT '',
      google_place_id TEXT,
      image_key TEXT NOT NULL,
      image_mime_type TEXT NOT NULL,
      author_google_sub TEXT REFERENCES user_accounts(google_sub) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS community_guides_created_idx ON community_guides (created_at DESC)`;
  })().catch((error) => { guideSchemaReady = undefined; throw error; });
  return guideSchemaReady;
};

app.get('/api/places/suggest', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
  if (query.length < 2) return res.json([]);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.json([]);
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat' },
      body: JSON.stringify({ input: query, languageCode: 'es-MX', includedRegionCodes: ['MX'], locationBias: { circle: { center: { latitude: 21.3617, longitude: -102.8455 }, radius: 30000 } } }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.json([]);
    res.set('Cache-Control', 'no-store');
    return res.json((data.suggestions || []).flatMap((item) => {
      const prediction = item.placePrediction;
      if (!prediction?.text?.text) return [];
      return [{ id: prediction.placeId || '', description: prediction.text.text, name: prediction.structuredFormat?.mainText?.text || prediction.text.text, address: prediction.structuredFormat?.secondaryText?.text || '' }];
    }).slice(0, 6));
  } catch (error) {
    console.error('Guide place suggestions failed:', error);
    return res.json([]);
  }
});

app.post('/api/guides/format', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'La IA no está configurada. Revisa el formato y publica tu guía.' });
  const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : '';
  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim().slice(0, 240) : '';
  const draft = typeof req.body?.content === 'string' ? req.body.content.trim().slice(0, 12000) : '';
  if (!title || !draft) return res.status(400).json({ error: 'Escribe el título y el contenido de tu guía.' });
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Edita el borrador de una guía comunitaria local para que sea claro, útil y fácil de leer. Conserva los hechos y la voz del autor; corrige ortografía y organiza con Markdown ligero usando encabezados y listas cuando ayuden. No inventes información ni añadas recomendaciones que no aparezcan en el borrador. Devuelve solo el contenido final en Markdown, sin cercas de código.\n\nTítulo: ${title}\nResumen: ${summary}\n\nBorrador del autor:\n${draft}`,
      config: { maxOutputTokens: 2200, thinkingConfig: { thinkingLevel: 'low', includeThoughts: false } },
    });
    const content = response.text?.trim();
    if (!content) return res.status(502).json({ error: 'La IA no pudo preparar el texto. Inténtalo otra vez.' });
    return res.json({ content });
  } catch (error) {
    console.error('Guide formatting failed:', error);
    return res.status(502).json({ error: 'No se pudo dar formato con IA. Puedes revisar el texto y publicar.' });
  }
});

app.get('/api/guides', requireNeon, async (req, res) => {
  try {
    await ensureGuideSchema();
    const rows = await sql`SELECT guide.id, guide.title, guide.summary, guide.content_markdown AS content,
      guide.place_name AS "placeName", guide.place_address AS "placeAddress", guide.google_place_id AS "googlePlaceId",
      guide.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture",
      guide.created_at AS "createdAt", guide.image_key AS "imageKey"
      FROM community_guides AS guide LEFT JOIN user_accounts AS account ON account.google_sub = guide.author_google_sub
      WHERE guide.status = 'published' ORDER BY guide.created_at DESC LIMIT 100`;
    const base = `${req.protocol}://${req.get('host')}`;
    res.set('Cache-Control', 'no-store');
    return res.json(rows.map(({ imageKey, ...guide }) => ({ ...guide, imageUrl: `${base}/api/guides/${guide.id}/image` })));
  } catch (error) {
    console.error('Could not load community guides:', error);
    return res.status(500).json({ error: 'No se pudieron cargar las guías.' });
  }
});

app.post('/api/guides', requireNeon, requireAccount, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const body = req.body || {};
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 240) : '';
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 12000) : '';
  const placeName = typeof body.placeName === 'string' ? body.placeName.trim().slice(0, 180) : '';
  const placeAddress = typeof body.placeAddress === 'string' ? body.placeAddress.trim().slice(0, 300) : '';
  const googlePlaceId = typeof body.googlePlaceId === 'string' ? body.googlePlaceId.trim().slice(0, 200) : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
  const base64 = typeof body.base64 === 'string' ? body.base64 : '';
  if (!title || !summary || !content || !placeName) return res.status(400).json({ error: 'Completa el título, resumen, contenido y lugar.' });
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mimeType) || !base64) return res.status(400).json({ error: 'Agrega una imagen JPG, PNG, WebP o GIF.' });
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'La imagen debe pesar 5 MB o menos.' });
  if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
  const id = randomUUID();
  const imageKey = `community-guides/${id}/${randomUUID()}`;
  try {
    await ensureGuideSchema();
    await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: imageKey, Body: bytes, ContentType: mimeType }));
    try {
      const [guide] = await sql`INSERT INTO community_guides (id, title, summary, content_markdown, place_name, place_address, google_place_id, image_key, image_mime_type, author_google_sub)
        VALUES (${id}, ${title}, ${summary}, ${content}, ${placeName}, ${placeAddress}, ${googlePlaceId || null}, ${imageKey}, ${mimeType}, ${req.account.id})
        RETURNING id, title, summary, content_markdown AS content, place_name AS "placeName", place_address AS "placeAddress", google_place_id AS "googlePlaceId", author_google_sub AS "profileId", created_at AS "createdAt"`;
      const base = `${req.protocol}://${req.get('host')}`;
      res.status(201).json({ ...guide, authorName: req.account.name, authorPicture: req.account.picture, imageUrl: `${base}/api/guides/${id}/image` });
    } catch (error) {
      await s3.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: imageKey })).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Community guide publish failed:', error);
    return res.status(500).json({ error: 'No se pudo publicar la guía.' });
  }
});

app.get('/api/guides/:id/image', requireNeon, async (req, res) => {
  try {
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
    await ensureGuideSchema();
    const [guide] = await sql`SELECT image_key AS key, image_mime_type AS "mimeType" FROM community_guides WHERE id = ${req.params.id} AND status = 'published'`;
    if (!guide) return res.status(404).json({ error: 'Imagen de guía no encontrada.' });
    const object = await s3.send(new GetObjectCommand({ Bucket: 'uploads', Key: String(guide.key) }));
    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) return res.status(502).json({ error: 'No se pudo leer la imagen.' });
    res.set('Content-Type', String(guide.mimeType));
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('Community guide image load failed:', error);
    return res.status(500).json({ error: 'No se pudo cargar la imagen de guía.' });
  }
});

app.get('/api/community-posts/day', requireNeon, async (req, res) => {
  try {
    await ensureSubmissionSchema();
    const posts = await sql`SELECT post.id, post.caption, post.created_at AS "createdAt",
      post.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture"
      FROM community_posts AS post LEFT JOIN user_accounts AS account ON account.google_sub = post.author_google_sub
      WHERE post.status = 'published' AND post.post_type = 'day' ORDER BY post.created_at DESC LIMIT 20`;
    const base = `${req.protocol}://${req.get('host')}`;
    res.set('Cache-Control', 'no-store');
    res.json(posts.map((post) => ({ ...post, imageUrl: `${base}/api/community-posts/${post.id}/image`, coverUrl: `${base}/api/community-posts/${post.id}/cover` })));
  } catch (error) {
    console.error('Could not load community day photos:', error);
    res.status(500).json({ error: 'No se pudieron cargar las fotos de la comunidad.' });
  }
});

app.get('/api/community-posts/:id/:kind', requireNeon, async (req, res) => {
  try {
    if (!['image', 'cover'].includes(req.params.kind)) return res.status(404).json({ error: 'Image not found.' });
    if (!s3) return res.status(503).json({ error: storageUnavailableMessage() });
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
  const cacheKey = 'nochistlan-10day-hourly-weather';
  const cached = apiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return res.json(cached.data);
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', '21.3656');
    url.searchParams.set('longitude', '-102.8461');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('hourly', 'temperature_2m,weather_code,precipitation_probability');
    url.searchParams.set('timezone', 'America/Mexico_City');
    url.searchParams.set('forecast_days', '10');
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) return res.status(502).json({ error: 'No se pudo cargar el pronóstico del tiempo.' });
    const body = await upstream.json();
    const data = {
      location: 'Nochistlán, Zacatecas',
      days: (body.daily?.time || []).map((date, index) => ({
      date,
      weatherCode: body.daily.weather_code?.[index] ?? 0,
      high: body.daily.temperature_2m_max?.[index] ?? null,
      low: body.daily.temperature_2m_min?.[index] ?? null,
      precipitationChance: body.daily.precipitation_probability_max?.[index] ?? null,
      })),
      hours: (body.hourly?.time || []).map((dateTime, index) => ({
        dateTime,
        temperature: body.hourly.temperature_2m?.[index] ?? null,
        weatherCode: body.hourly.weather_code?.[index] ?? 0,
        precipitationChance: body.hourly.precipitation_probability?.[index] ?? null,
      })),
    };
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

let placeCategoryCorrections;
function ensurePlaceCategoryCorrections() {
  if (!sql) throw new Error('DATABASE_URL is not configured.');
  if (!placeCategoryCorrections) placeCategoryCorrections = sql`
    UPDATE places SET category = CASE
      WHEN name ~* '(hotel|hostal|hospedaje)' THEN 'Hoteles y Rentas'
      WHEN name ~* '(cl[ií]nica de belleza|spa|est[eé]tica|nerea spa)' THEN 'Belleza'
      WHEN name ~* '(farmacia|superfarmacia)' THEN 'Farmacia'
      WHEN name ~* '(hospital|centro m[eé]dico|consultorio m[eé]dico|cl[ií]nica|ginec[oó]log|traumat[oó]log|kinesi[oó]log|psicol[oó]g|nutricional|bienestar animal)' THEN 'Salud Esp.'
      WHEN name ~* '(ferreter[ií]a|herramientas|centro ferretero|mallas nochistlan)' THEN 'Construcción'
      WHEN name ~* '(celulares|ciber|cyber|comput|tecnocentro|internet|intercom|fix-it celular)' THEN 'Tecnología'
      WHEN name ~* '(boutique|zapater[ií]a|lencer[ií]a|joyer[ií]a)' THEN 'Moda y Regalos'
      WHEN name ~* '(muebler[ií]a)' THEN 'Hogar'
      WHEN name ~* '(forrajes)' THEN 'Agricultura'
      WHEN name ~* '(fitness|fit zone|gimnasio|vivero)' THEN 'Estilo de Vida'
      WHEN name ~* '(fruter[ií]a|bodega aurrera|oxxo)' THEN 'Supermercados'
      WHEN name ~* '(dulcer[ií]a)' THEN 'Comida'
      WHEN name ~* '(basa comercializadora de equipos y herramientas)' THEN 'Construcción'
      ELSE category
    END
    WHERE name ~* '(hotel|hostal|hospedaje|cl[ií]nica de belleza|spa|est[eé]tica|nerea spa|farmacia|superfarmacia|hospital|centro m[eé]dico|consultorio m[eé]dico|cl[ií]nica|ginec[oó]log|traumat[oó]log|kinesi[oó]log|psicol[oó]g|nutricional|bienestar animal|ferreter[ií]a|herramientas|centro ferretero|mallas nochistlan|celulares|ciber|cyber|comput|tecnocentro|internet|intercom|fix-it celular|boutique|zapater[ií]a|lencer[ií]a|joyer[ií]a|muebler[ií]a|forrajes|fitness|fit zone|gimnasio|vivero|fruter[ií]a|bodega aurrera|oxxo|dulcer[ií]a|basa comercializadora de equipos y herramientas)'
  `.catch((error) => { placeCategoryCorrections = undefined; throw error; });
  return placeCategoryCorrections;
}

app.get('/api/places', requireNeon, async (req, res) => {
  try {
    await Promise.all([ensureDirectorySchema(), ensureSubmissionSchema()]);
    await ensurePlaceCategoryCorrections();
    const places = await sql`SELECT id, name, category, subtitle, location, address,
      map_url AS "mapUrl", images, logo, rating, review_count AS "reviewCount",
      is_open AS "isOpen", cost, distance, good_to_know AS "goodToKnow", hours, weekly_hours AS "weeklyHours",
      website_url AS "websiteUrl", instagram_url AS "instagramUrl", alternate_phone AS "alternatePhone",
      lat, lng, phone, created_at AS "createdAt" FROM places ORDER BY sort_order`;
    const publishedPosts = await sql`SELECT post.id, post.place_id, post.caption, post.created_at AS "createdAt",
      post.author_google_sub AS "profileId", account.display_name AS "authorName", account.picture_url AS "authorPicture"
      FROM community_posts AS post LEFT JOIN user_accounts AS account ON account.google_sub = post.author_google_sub
      WHERE post.status = 'published' ORDER BY post.created_at DESC`;
    const postImagesByPlace = new Map();
    const communityPostsByPlace = new Map();
    for (const post of publishedPosts) {
      const images = postImagesByPlace.get(post.place_id) || [];
      const imageUrl = `${req.protocol}://${req.get('host')}/api/community-posts/${post.id}/image`;
      images.push(imageUrl);
      postImagesByPlace.set(post.place_id, images);
      const communityPosts = communityPostsByPlace.get(post.place_id) || [];
      communityPosts.push({ id: post.id, imageUrl, caption: post.caption, createdAt: post.createdAt, profileId: post.profileId, authorName: post.authorName, authorPicture: post.authorPicture });
      communityPostsByPlace.set(post.place_id, communityPosts);
    }
    res.json(places.map((place) => ({
      ...place,
      images: [...(Array.isArray(place.images) ? place.images : []), ...(postImagesByPlace.get(place.id) || [])],
      communityPosts: communityPostsByPlace.get(place.id) || [],
      goodToKnow: Array.isArray(place.goodToKnow) ? place.goodToKnow : [],
    })));
  } catch (error) {
    console.error('Could not load places from Neon:', error);
    res.status(500).json({ error: 'No se pudieron cargar los negocios.' });
  }
});

app.get('/api/places/recent', requireNeon, async (_req, res) => {
  try {
    await ensureDirectorySchema();
    const places = await sql`SELECT id, name, category, subtitle, location, address, images,
      rating, review_count AS "reviewCount", created_at AS "createdAt"
      FROM places WHERE created_at IS NOT NULL
      ORDER BY created_at DESC LIMIT 10`;
    res.set('Cache-Control', 'no-store');
    res.json(places.map((place) => ({ ...place, images: Array.isArray(place.images) ? place.images : [] })));
  } catch (error) {
    console.error('Could not load recently added businesses:', error);
    res.status(500).json({ error: 'No se pudieron cargar los negocios recientes.' });
  }
});

let placeActivitySchemaReady;
const ensurePlaceActivitySchema = () => {
  if (!placeActivitySchemaReady) placeActivitySchemaReady = (async () => {
    await ensureDirectorySchema();
    await sql`CREATE TABLE IF NOT EXISTS place_activity (
      id BIGSERIAL PRIMARY KEY,
      place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('search', 'click')),
      query TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS place_activity_recent_idx ON place_activity (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS place_activity_place_recent_idx ON place_activity (place_id, created_at DESC)`;
  })().catch((error) => { placeActivitySchemaReady = undefined; throw error; });
  return placeActivitySchemaReady;
};

app.post('/api/activity/search', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const query = typeof req.body?.query === 'string' ? req.body.query.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
  if (query.length < 2) return res.status(204).end();
  try {
    await ensurePlaceActivitySchema();
    await sql`INSERT INTO place_activity (action, query) VALUES ('search', ${query})`;
    res.status(204).end();
  } catch (error) {
    console.error('Could not record a search signal:', error);
    res.status(503).end();
  }
});

app.post('/api/activity/click', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const placeId = typeof req.body?.placeId === 'string' ? req.body.placeId.slice(0, 180) : '';
  if (!placeId) return res.status(400).json({ error: 'Falta el negocio.' });
  try {
    await ensurePlaceActivitySchema();
    const [place] = await sql`SELECT id FROM places WHERE id = ${placeId}`;
    if (!place) return res.status(404).end();
    await sql`INSERT INTO place_activity (place_id, action) VALUES (${place.id}, 'click')`;
    res.status(204).end();
  } catch (error) {
    console.error('Could not record a business click signal:', error);
    res.status(503).end();
  }
});

app.get('/api/places/popular-week', requireNeon, async (_req, res) => {
  try {
    await Promise.all([ensureDirectorySchema(), ensurePlaceActivitySchema()]);
    const [places, activity] = await Promise.all([
      sql`SELECT id, name, category, subtitle, location, address, images, rating, review_count AS "reviewCount"
        FROM places WHERE images IS NOT NULL AND jsonb_array_length(images) > 0`,
      sql`SELECT place_id AS "placeId", action, query FROM place_activity WHERE created_at >= NOW() - INTERVAL '7 days'`,
    ]);
    const popular = places.map((place) => {
      const fields = [place.name, place.category, place.subtitle, place.location, place.address].filter(Boolean).join(' ').toLocaleLowerCase('es');
      let clicks = 0;
      let searchInterest = 0;
      for (const event of activity) {
        if (event.action === 'click' && event.placeId === place.id) clicks += 1;
        if (event.action === 'search') {
          const terms = String(event.query || '').toLocaleLowerCase('es').split(/\s+/).filter((term) => term.length > 1);
          if (terms.some((term) => fields.includes(term))) searchInterest += 1;
        }
      }
      return { ...place, popularity: clicks * 3 + searchInterest };
    }).sort((a, b) => b.popularity - a.popularity || (b.rating || 0) - (a.rating || 0)).slice(0, 8);
    res.set('Cache-Control', 'no-store');
    res.json(popular);
  } catch (error) {
    console.error('Could not load popular businesses:', error);
    res.status(503).json({ error: 'No se pudo cargar lo más popular esta semana.' });
  }
});

app.post('/api/ask-nochi', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Ask Nochi todavía no está configurado. Agrega GEMINI_API_KEY en las variables del servidor.' });
    const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 700) : '';
  if (!query) return res.status(400).json({ error: 'Escribe qué tipo de lugar estás buscando.' });

  try {
    await ensureDirectorySchema();
    const rows = await sql`SELECT id, name, category, subtitle, location, address,
      map_url AS "mapUrl", images, logo, rating, review_count AS "reviewCount",
      is_open AS "isOpen", cost, distance, good_to_know AS "goodToKnow", hours,
      weekly_hours AS "weeklyHours", lat, lng, phone FROM places ORDER BY sort_order`;
    const terms = query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[\p{L}\p{N}]{3,}/gu) || [];
    const ranked = rows.map((place) => {
      const searchable = [place.name, place.category, place.subtitle, place.location, place.address, ...(Array.isArray(place.goodToKnow) ? place.goodToKnow : [])]
        .filter(Boolean).join(' ').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const score = terms.reduce((sum, term) => sum + (searchable.includes(term) ? (String(place.name).toLocaleLowerCase('es').includes(term) ? 5 : 2) : 0), 0);
      return { place, score };
    }).sort((a, b) => b.score - a.score || Number(b.place.rating || 0) - Number(a.place.rating || 0) || Number(b.place.reviewCount || 0) - Number(a.place.reviewCount || 0));
    const topMatches = ranked.filter(({ score }) => score > 0).slice(0, 4);
    const selected = (topMatches.length ? topMatches : ranked.slice(0, 3)).map(({ place }) => ({
      id: place.id, name: place.name, category: place.category, subtitle: place.subtitle, location: place.location,
      address: place.address, mapUrl: place.mapUrl, images: Array.isArray(place.images) ? place.images : [], logo: place.logo,
      rating: Number(place.rating || 0), reviewCount: Number(place.reviewCount || 0), isOpen: Boolean(place.isOpen),
      cost: Number(place.cost || 0), distance: place.distance || '', goodToKnow: Array.isArray(place.goodToKnow) ? place.goodToKnow : [],
      hours: place.hours || '', weeklyHours: place.weeklyHours || null, lat: place.lat == null ? undefined : Number(place.lat),
      lng: place.lng == null ? undefined : Number(place.lng), phone: place.phone || undefined,
    }));
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-40).map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user', content: typeof item?.content === 'string' ? item.content.slice(0, 5000) : '',
    })).filter((item) => item.content) : [];
    const [eventRows, listingRows] = await Promise.all([
      sql`SELECT id, title, event_date::text AS date, event_time AS time, location, description FROM public_events ORDER BY event_date DESC LIMIT 60`,
      sql`SELECT listing.id, listing.title, listing.category, listing.price, listing.location, listing.description, listing.details,
        COALESCE(json_agg(json_build_object('url', ${`${req.protocol}://${req.get('host')}`} || '/api/marketplace/listings/' || listing.id || '/images/' || photo.id)
          ORDER BY photo.sort_order) FILTER (WHERE photo.id IS NOT NULL), '[]'::json) AS images
        FROM marketplace_listings AS listing LEFT JOIN marketplace_listing_images AS photo ON photo.listing_id = listing.id
        WHERE listing.status = 'published' GROUP BY listing.id ORDER BY listing.published_at DESC LIMIT 60`,
    ]);
    const historyText = history.map((item) => `${item.role === 'user' ? 'Usuario' : 'Nochi'}: ${item.content}`).join('\n');
    const source = JSON.stringify(selected);
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Eres Ask Nochi, un asistente local de Nochistlán, Zacatecas, y un asistente general útil. Entiende la intención aunque el usuario escriba con errores, en español o inglés. Responde en el idioma del usuario, con tono cálido y claro. Puedes ayudar con preguntas generales, pero para afirmaciones locales usa exclusivamente los datos incluidos; no inventes negocios, eventos, horarios, servicios, precios ni calificaciones. Si una petición necesita datos locales que no aparecen aquí, dilo con claridad. Usa Markdown ligero. No reveles razonamiento interno.

Conversación completa disponible (de la más antigua a la más reciente):
${historyText || '(conversación nueva)'}

Mensaje actual:
${query}

Negocios (fuente de verdad):
${source}

Eventos publicados:
${JSON.stringify(eventRows)}

Anuncios publicados del mercado:
${JSON.stringify(listingRows)}`,
      config: { maxOutputTokens: 420, thinkingConfig: { thinkingLevel: 'low', includeThoughts: false } },
    });
    const answer = response.text?.trim();
    if (!answer) return res.status(502).json({ error: 'Nochi no pudo generar una respuesta. Inténtalo de nuevo.' });
    const answerKey = answer.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mentionedPlaces = selected.filter((place) => answerKey.includes(String(place.name).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    res.set('Cache-Control', 'no-store');
    return res.json({ answer, places: mentionedPlaces });
  } catch (error) {
    console.error('Could not answer Ask Nochi query:', error);
    return res.status(502).json({ error: 'No se pudo consultar Ask Nochi. Inténtalo de nuevo en un momento.' });
  }
});

let placeOverviewSchemaReady;
const ensurePlaceOverviewSchema = () => {
  if (!sql) throw new Error('DATABASE_URL is not configured.');
  if (!placeOverviewSchemaReady) placeOverviewSchemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS place_ai_overviews (
      place_id TEXT PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
      overview TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      generation_status TEXT NOT NULL DEFAULT 'ready',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE place_ai_overviews ADD COLUMN IF NOT EXISTS generation_status TEXT NOT NULL DEFAULT 'ready'`;
  })().catch((error) => { placeOverviewSchemaReady = undefined; throw error; });
  return placeOverviewSchemaReady;
};

app.get('/api/places/:id/overview', requireNeon, async (req, res) => {
  if (!ensureSameOrigin(req, res)) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'El resumen con IA todavía no está configurado.' });
  try {
    await Promise.all([ensureDirectorySchema(), ensurePlaceOverviewSchema()]);
    const [place] = await sql`SELECT id, name, category, subtitle, location, address, phone, good_to_know AS "goodToKnow", hours, weekly_hours AS "weeklyHours", rating, review_count AS "reviewCount" FROM places WHERE id = ${req.params.id}`;
    if (!place) return res.status(404).json({ error: 'No encontramos este negocio.' });

    const source = JSON.stringify(place);
    const sourceHash = createHash('sha256').update(`overview-v2:${source}`).digest('hex');
    const [cached] = await sql`SELECT overview, source_hash AS "sourceHash", generation_status AS "generationStatus" FROM place_ai_overviews WHERE place_id = ${place.id}`;
    if (cached?.sourceHash === sourceHash && cached.generationStatus === 'ready' && cached.overview) {
      res.set('Cache-Control', 'private, max-age=86400');
      return res.json({ overview: cached.overview, cached: true });
    }

    const claimGeneration = () => sql`INSERT INTO place_ai_overviews (place_id, overview, source_hash, generation_status, updated_at)
      VALUES (${place.id}, '', ${sourceHash}, 'generating', NOW())
      ON CONFLICT (place_id) DO UPDATE SET overview = '', source_hash = EXCLUDED.source_hash,
        generation_status = 'generating', updated_at = NOW()
      WHERE place_ai_overviews.source_hash <> EXCLUDED.source_hash
        OR place_ai_overviews.generation_status = 'failed'
        OR (place_ai_overviews.generation_status = 'generating' AND place_ai_overviews.updated_at < NOW() - INTERVAL '2 minutes')
      RETURNING place_id`;
    let [claim] = await claimGeneration();
    if (!claim) {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        const [inProgress] = await sql`SELECT overview, source_hash AS "sourceHash", generation_status AS "generationStatus", updated_at AS "updatedAt" FROM place_ai_overviews WHERE place_id = ${place.id}`;
        if (inProgress?.sourceHash === sourceHash && inProgress.generationStatus === 'ready' && inProgress.overview) {
          res.set('Cache-Control', 'private, max-age=86400');
          return res.json({ overview: inProgress.overview, cached: true });
        }
        const generationStale = inProgress?.generationStatus === 'generating' && Date.now() - new Date(inProgress.updatedAt).getTime() > 120_000;
        if (!inProgress || inProgress.sourceHash !== sourceHash || inProgress.generationStatus === 'failed' || generationStale) {
          [claim] = await claimGeneration();
          if (claim) break;
        }
      }
    }
    if (!claim) return res.status(202).json({ generating: true });

    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Escribe exactamente 2 o 3 frases breves en español para presentar este negocio. Basa cada afirmación únicamente en los datos proporcionados: no inventes servicios, precios, calidad, horarios ni recomendaciones. Incluye detalles concretos disponibles, como giro, ubicación, horario, contacto o calificación. Si faltan datos para una segunda frase, di de forma neutral que la ficha no incluye más información. No reveles razonamiento ni agregues listas o introducciones; devuelve solo el resumen (máximo 65 palabras).\n\nDatos del negocio:\n${source}`,
        config: { maxOutputTokens: 180, thinkingConfig: { thinkingLevel: 'low', includeThoughts: false } },
      });
      const overview = response.text?.trim();
      if (!overview) throw new Error('Gemini no devolvió un resumen.');
      const [saved] = await sql`UPDATE place_ai_overviews SET overview = ${overview}, generation_status = 'ready', updated_at = NOW()
        WHERE place_id = ${place.id} AND source_hash = ${sourceHash} AND generation_status = 'generating' RETURNING place_id`;
      if (!saved) {
        const [newer] = await sql`SELECT overview, source_hash AS "sourceHash", generation_status AS "generationStatus" FROM place_ai_overviews WHERE place_id = ${place.id}`;
        if (newer?.sourceHash === sourceHash && newer.generationStatus === 'ready' && newer.overview) return res.json({ overview: newer.overview, cached: true });
        return res.status(202).json({ generating: true });
      }
      res.set('Cache-Control', 'private, max-age=86400');
      res.json({ overview, cached: false });
    } catch (error) {
      await sql`UPDATE place_ai_overviews SET generation_status = 'failed', updated_at = NOW()
        WHERE place_id = ${place.id} AND source_hash = ${sourceHash} AND generation_status = 'generating'`.catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('Could not generate a business overview:', error);
    res.status(502).json({ error: 'No se pudo generar el resumen con IA.' });
  }
});

app.get('/api/admin/places', requireAdmin, requireNeon, async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await ensureDirectorySchema();
    const places = await sql`SELECT id, name, category, subtitle, location, address,
      map_url AS "mapUrl", images, logo, rating, review_count AS "reviewCount",
      is_open AS "isOpen", cost, distance, good_to_know AS "goodToKnow", hours,
      weekly_hours AS "weeklyHours", lat, lng, phone, created_at AS "createdAt" FROM places ORDER BY sort_order, name`;
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

const normalizeDuplicateAddress = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

app.get('/api/admin/places/check-address', requireAdmin, requireNeon, async (req, res) => {
  const address = typeof req.query.address === 'string' ? req.query.address.trim().slice(0, 300) : '';
  if (!address) return res.json({ duplicate: null });
  try {
    await ensureDirectorySchema();
    const places = await sql`SELECT id, name, address FROM places WHERE address IS NOT NULL AND address <> ''`;
    const normalizedAddress = normalizeDuplicateAddress(address);
    const duplicate = places.find((place) => normalizeDuplicateAddress(place.address) === normalizedAddress) || null;
    res.set('Cache-Control', 'no-store');
    res.json({ duplicate: duplicate ? { id: duplicate.id, name: duplicate.name, address: duplicate.address } : null });
  } catch (error) {
    console.error('Could not check for a duplicate business address:', error);
    res.status(500).json({ error: 'No se pudo comprobar si la dirección ya está registrada.' });
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
    const weeklyHours = normalizeWeeklyHours(body.weeklyHours);
    if (!weeklyHours) return res.status(400).json({ error: 'Completa un horario válido para cada día.' });
    const hours = formatWeeklyHours(weeklyHours);
    const cost = Number(body.cost || 1);
    const imageUrl = body.imageUrl ? parseImageUrl(body.imageUrl) : null;
    if (!name || !category || !location) return res.status(400).json({ error: 'Nombre, categoría y ubicación son obligatorios.' });
    if (address) {
      const existingPlaces = await sql`SELECT id, name, address FROM places WHERE address IS NOT NULL AND address <> ''`;
      const duplicate = existingPlaces.find((place) => normalizeDuplicateAddress(place.address) === normalizeDuplicateAddress(address));
      if (duplicate) return res.status(409).json({ error: `Esta dirección ya está registrada para ${duplicate.name}.` });
    }
    if (body.imageUrl && !imageUrl) return res.status(400).json({ error: 'La imagen debe tener una URL HTTP o HTTPS válida.' });
    if (!Number.isInteger(cost) || cost < 1 || cost > 4) return res.status(400).json({ error: 'El rango de precio debe ser de 1 a 4.' });

    const id = `admin-${randomUUID()}`;
    const images = imageUrl ? [imageUrl] : [];
    const [place] = await sql`INSERT INTO places (
      id, name, category, subtitle, location, address, images, logo, rating, created_at,
      review_count, is_open, cost, distance, good_to_know, hours, weekly_hours, sort_order, phone
    ) VALUES (
      ${id}, ${name}, ${category}, ${subtitle || null}, ${location}, ${address || null},
      ${JSON.stringify(images)}::jsonb, NULL, 0, NOW(), 0, FALSE, ${cost}, '',
      '[]'::jsonb, ${hours}, ${JSON.stringify(weeklyHours)}::jsonb,
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM places), ${phone || null}
    ) RETURNING id, name, category, subtitle, location, address, map_url AS "mapUrl", images, logo,
      rating, review_count AS "reviewCount", is_open AS "isOpen", cost, distance,
      good_to_know AS "goodToKnow", hours, weekly_hours AS "weeklyHours", lat, lng, phone, created_at AS "createdAt"`;
    res.status(201).json({ ...place, images: Array.isArray(place.images) ? place.images : [] });
  } catch (error) {
    console.error('Could not create admin business:', error);
    res.status(500).json({ error: 'No se pudo guardar el negocio.' });
  }
});

app.patch('/api/admin/places/:id', requireAdmin, requireNeon, async (req, res) => {
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
    const cost = Number(body.cost || 1);
    const weeklyHours = normalizeWeeklyHours(body.weeklyHours);
    if (!name || !category || !location) return res.status(400).json({ error: 'Nombre, categoría y ubicación son obligatorios.' });
    if (!weeklyHours) return res.status(400).json({ error: 'Completa un horario válido para cada día.' });
    if (!Number.isInteger(cost) || cost < 1 || cost > 4) return res.status(400).json({ error: 'El rango de precio debe ser de 1 a 4.' });
    const hasImageUpdate = Object.prototype.hasOwnProperty.call(body, 'imageUrl');
    const imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? parseImageUrl(body.imageUrl) : null;
    if (hasImageUpdate && body.imageUrl && !imageUrl) return res.status(400).json({ error: 'La imagen debe tener una URL HTTP o HTTPS válida.' });
    const [existing] = await sql`SELECT id, images FROM places WHERE id = ${req.params.id}`;
    if (!existing) return res.status(404).json({ error: 'No se encontró el negocio.' });
    const oldImages = Array.isArray(existing.images) ? existing.images : [];
    const images = hasImageUpdate
      ? imageUrl ? [imageUrl, ...oldImages.filter((item) => item !== imageUrl)] : []
      : oldImages;
    const hours = formatWeeklyHours(weeklyHours);
    const [place] = await sql`UPDATE places SET
      name = ${name}, category = ${category}, subtitle = ${subtitle || null},
      location = ${location}, address = ${address || null}, phone = ${phone || null},
      cost = ${cost}, hours = ${hours}, weekly_hours = ${JSON.stringify(weeklyHours)}::jsonb,
      images = ${JSON.stringify(images)}::jsonb
      WHERE id = ${req.params.id}
      RETURNING id, name, category, subtitle, location, address, map_url AS "mapUrl", images,
        logo, rating, review_count AS "reviewCount", is_open AS "isOpen", cost, distance,
        good_to_know AS "goodToKnow", hours, weekly_hours AS "weeklyHours", lat, lng, phone`;
    res.json({ ...place, images: Array.isArray(place.images) ? place.images : [] });
  } catch (error) {
    console.error('Could not update admin business:', error);
    res.status(500).json({ error: 'No se pudieron guardar los cambios del negocio.' });
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
