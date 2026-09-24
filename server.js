import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

const app = express();
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

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`API Server listening on http://localhost:${port}`);
  });
}

export default app;
