import { neon } from '@neondatabase/serverless';

let schemaReady;
async function ensureSchema(sql) {
  if (!schemaReady) schemaReady = sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`.catch((error) => { schemaReady = undefined; throw error; });
  return schemaReady;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Invalid origin.' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Notifications database is not configured.' });
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint?.startsWith('https://') || !subscription.keys?.p256dh || !subscription.keys?.auth) return res.status(400).json({ error: 'Invalid push subscription.' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureSchema(sql);
    await sql`INSERT INTO push_subscriptions (endpoint, subscription) VALUES (${subscription.endpoint}, ${JSON.stringify(subscription)}::jsonb) ON CONFLICT (endpoint) DO UPDATE SET subscription = EXCLUDED.subscription, updated_at = NOW()`;
    return res.status(201).json({ subscribed: true });
  } catch (error) {
    console.error('Push subscription save failed:', error);
    return res.status(500).json({ error: 'Could not save this subscription.' });
  }
}
