import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | undefined;

function getStorageClient() {
  const { AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  if (!AWS_ENDPOINT_URL_S3 || !AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) return null;
  return new S3Client({ region: AWS_REGION, endpoint: AWS_ENDPOINT_URL_S3, forcePathStyle: true, credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY } });
}

async function ensureSchema() {
  if (!sql) throw new Error('DATABASE_URL is not configured.');
  if (!schemaReady) schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS business_applications (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
      address TEXT NOT NULL, phone TEXT NOT NULL, hours TEXT NOT NULL,
      cost INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 4), contact_email TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb, status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS business_application_photos (
      id BIGSERIAL PRIMARY KEY, application_id TEXT NOT NULL REFERENCES business_applications(id) ON DELETE CASCADE,
      object_key TEXT NOT NULL, file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL CHECK (size_bytes <= 5242880), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS promotion_orders (
      id TEXT PRIMARY KEY, place_id TEXT NOT NULL, place_name TEXT NOT NULL,
      budget_mxn INTEGER NOT NULL CHECK (budget_mxn BETWEEN 100 AND 5000),
      estimated_appearances INTEGER NOT NULL, schedule JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'simulated-checkout-complete', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY, place_id TEXT NOT NULL, place_name TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '', image_key TEXT, cover_key TEXT,
      image_mime_type TEXT, cover_mime_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })().catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
}

function json(data: unknown, status = 200, origin = '*') {
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'vary': 'Origin',
  } });
}

export default async function api(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*';
  if (request.method === 'OPTIONS') return json({}, 204, origin);
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'GET' && (path === '/' || path === '/api')) return new Response('Hello from Neon Functions', { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': origin } });
  if (!sql) return json({ error: 'Neon database is unavailable.' }, 503, origin);

  try {
    await ensureSchema();

    if (request.method === 'POST' && path === '/api/business-applications') {
      const body = await request.json() as Record<string, unknown>;
      const required = ['name', 'category', 'description', 'address', 'phone', 'hours', 'email'];
      if (!required.every((key) => typeof body[key] === 'string' && (body[key] as string).trim()) || !Number.isInteger(Number(body.cost)) || Number(body.cost) < 1 || Number(body.cost) > 4 || !Array.isArray(body.tags)) {
        return json({ error: 'Complete all required business details.' }, 400, origin);
      }
      const id = randomUUID();
      await sql`INSERT INTO business_applications (id, name, category, description, address, phone, hours, cost, contact_email, tags)
        VALUES (${id}, ${String(body.name).trim()}, ${String(body.category).trim()}, ${String(body.description).trim()}, ${String(body.address).trim()}, ${String(body.phone).trim()}, ${String(body.hours).trim()}, ${Number(body.cost)}, ${String(body.email).trim()}, ${JSON.stringify(body.tags)})`;
      return json({ id }, 201, origin);
    }

    const photoMatch = path.match(/^\/api\/business-applications\/([^/]+)\/photos$/);
    if (request.method === 'POST' && photoMatch) {
      const storage = getStorageClient();
      if (!storage) return json({ error: 'Neon private storage is unavailable.' }, 503, origin);
      const body = await request.json() as { fileName?: string; mimeType?: string; base64?: string };
      if (typeof body.base64 !== 'string' || !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(body.mimeType || '')) return json({ error: 'Choose a supported image file.' }, 400, origin);
      const bytes = Buffer.from(body.base64, 'base64');
      if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return json({ error: 'Each image must be 5 MB or smaller.' }, 413, origin);
      const [application] = await sql`SELECT id FROM business_applications WHERE id = ${photoMatch[1]}`;
      if (!application) return json({ error: 'Business application not found.' }, 404, origin);
      const objectKey = `business-applications/${photoMatch[1]}/${randomUUID()}`;
      await storage.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: body.mimeType }));
      try {
        await sql`INSERT INTO business_application_photos (application_id, object_key, file_name, mime_type, size_bytes)
          VALUES (${photoMatch[1]}, ${objectKey}, ${(body.fileName || 'business-photo').slice(0, 180)}, ${body.mimeType}, ${bytes.length})`;
      } catch (error) {
        await storage.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
        throw error;
      }
      return json({ saved: true }, 201, origin);
    }

    const submitMatch = path.match(/^\/api\/business-applications\/([^/]+)\/submit$/);
    if (request.method === 'POST' && submitMatch) {
      const rows = await sql`UPDATE business_applications SET status = 'pending' WHERE id = ${submitMatch[1]} RETURNING id`;
      return rows.length ? json({ submitted: true }, 200, origin) : json({ error: 'Business application not found.' }, 404, origin);
    }

    if (request.method === 'POST' && path === '/api/promotions') {
      const body = await request.json() as Record<string, unknown>;
      const budget = Number(body.budgetMXN);
      const appearances = Number(body.estimatedAppearances);
      if (typeof body.placeId !== 'string' || typeof body.placeName !== 'string' || !Number.isInteger(budget) || budget < 100 || budget > 5000 || !Number.isInteger(appearances) || appearances < 0 || !Array.isArray(body.schedule)) return json({ error: 'Invalid promotion details.' }, 400, origin);
      const id = randomUUID();
      await sql`INSERT INTO promotion_orders (id, place_id, place_name, budget_mxn, estimated_appearances, schedule)
        VALUES (${id}, ${body.placeId}, ${body.placeName}, ${budget}, ${appearances}, ${JSON.stringify(body.schedule)})`;
      return json({ id }, 201, origin);
    }

    if (request.method === 'POST' && path === '/api/community-posts') {
      const body = await request.json() as Record<string, unknown>;
      if (typeof body.placeId !== 'string' || !body.placeId.trim() || typeof body.placeName !== 'string' || !body.placeName.trim() || typeof body.caption !== 'string' || body.caption.length > 400) {
        return json({ error: 'Selecciona un negocio y revisa los detalles de la publicación.' }, 400, origin);
      }
      const id = randomUUID();
      await sql`INSERT INTO community_posts (id, place_id, place_name, caption)
        VALUES (${id}, ${body.placeId.trim()}, ${body.placeName.trim()}, ${body.caption.trim()})`;
      return json({ id }, 201, origin);
    }

    const uploadPostMatch = path.match(/^\/api\/community-posts\/([^/]+)\/(photo|cover)$/);
    if (request.method === 'POST' && uploadPostMatch) {
      const storage = getStorageClient();
      if (!storage) return json({ error: 'Neon private storage is unavailable.' }, 503, origin);
      const body = await request.json() as { fileName?: string; mimeType?: string; base64?: string };
      if (typeof body.base64 !== 'string' || !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(body.mimeType || '')) return json({ error: 'Elige un archivo de imagen válido.' }, 400, origin);
      const bytes = Buffer.from(body.base64, 'base64');
      if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return json({ error: 'Cada imagen debe pesar 5 MB o menos.' }, 413, origin);
      const [post] = await sql`SELECT id, status FROM community_posts WHERE id = ${uploadPostMatch[1]}`;
      if (!post || post.status !== 'draft') return json({ error: 'No se encontró el borrador de publicación.' }, 404, origin);
      const objectKey = `community-posts/${uploadPostMatch[1]}/${uploadPostMatch[2]}-${randomUUID()}`;
      await storage.send(new PutObjectCommand({ Bucket: 'uploads', Key: objectKey, Body: bytes, ContentType: body.mimeType }));
      try {
        if (uploadPostMatch[2] === 'photo') {
          const [updated] = await sql`UPDATE community_posts SET image_key = ${objectKey}, image_mime_type = ${body.mimeType} WHERE id = ${post.id} AND status = 'draft' RETURNING id`;
          if (!updated) throw new Error('Post draft is no longer available.');
        } else {
          const [updated] = await sql`UPDATE community_posts SET cover_key = ${objectKey}, cover_mime_type = ${body.mimeType} WHERE id = ${post.id} AND status = 'draft' RETURNING id`;
          if (!updated) throw new Error('Post draft is no longer available.');
        }
      } catch (error) {
        await storage.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: objectKey })).catch(() => undefined);
        throw error;
      }
      return json({ uploaded: true }, 201, origin);
    }

    const postImageMatch = path.match(/^\/api\/community-posts\/([^/]+)\/(image|cover)$/);
    if (request.method === 'GET' && postImageMatch) {
      const [post] = await sql`SELECT image_key, image_mime_type, cover_key, cover_mime_type, status FROM community_posts WHERE id = ${postImageMatch[1]}`;
      if (!post || post.status !== 'published') return json({ error: 'Imagen de publicación no encontrada.' }, 404, origin);
      const isCover = postImageMatch[2] === 'cover';
      const objectKey = isCover ? post.cover_key : post.image_key;
      const mimeType = isCover ? post.cover_mime_type : post.image_mime_type;
      if (!objectKey || !mimeType) return json({ error: 'Imagen de publicación no encontrada.' }, 404, origin);
      const storage = getStorageClient();
      if (!storage) return json({ error: 'Neon private storage is unavailable.' }, 503, origin);
      const object = await storage.send(new GetObjectCommand({ Bucket: 'uploads', Key: String(objectKey) }));
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes) return json({ error: 'No se pudo leer la imagen.' }, 502, origin);
      return new Response(bytes, { headers: { 'content-type': String(mimeType), 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': origin, 'vary': 'Origin' } });
    }

    const publishPostMatch = path.match(/^\/api\/community-posts\/([^/]+)\/publish$/);
    if (request.method === 'POST' && publishPostMatch) {
      const [post] = await sql`UPDATE community_posts SET status = 'published'
        WHERE id = ${publishPostMatch[1]} AND status = 'draft' AND image_key IS NOT NULL
        RETURNING id, place_id, place_name, caption, created_at`;
      if (!post) return json({ error: 'No se encontró la publicación o le falta su imagen.' }, 404, origin);
      return json({ ...post, imageUrl: `${new URL(request.url).origin}/api/community-posts/${post.id}/image`, coverUrl: `${new URL(request.url).origin}/api/community-posts/${post.id}/cover` }, 200, origin);
    }

    const deletePostMatch = path.match(/^\/api\/community-posts\/([^/]+)$/);
    if (request.method === 'DELETE' && deletePostMatch) {
      const [post] = await sql`DELETE FROM community_posts WHERE id = ${deletePostMatch[1]} AND status = 'draft'
        RETURNING image_key, cover_key`;
      if (!post) return json({ deleted: false }, 404, origin);
      const storage = getStorageClient();
      if (storage) {
        for (const key of [post.image_key, post.cover_key]) {
          if (key) await storage.send(new DeleteObjectCommand({ Bucket: 'uploads', Key: String(key) })).catch(() => undefined);
        }
      }
      return json({ deleted: true }, 200, origin);
    }

    return json({ error: 'Not found.' }, 404, origin);
  } catch (error) {
    console.error('Neon API request failed:', error);
    return json({ error: 'Could not save your request. Please try again.' }, 500, origin);
  }
}
