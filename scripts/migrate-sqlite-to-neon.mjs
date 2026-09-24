import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error('Set DATABASE_URL_UNPOOLED or DATABASE_URL before running this migration.');

const sqlite = new DatabaseSync(fileURLToPath(new URL('../database.sqlite', import.meta.url)), { readOnly: true });
const sql = neon(connectionString);

await sql`CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT,
  visits INTEGER,
  gradient TEXT,
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
)`;
await sql`CREATE TABLE IF NOT EXISTS colonias (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  cp TEXT,
  visits INTEGER,
  image TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
)`;
await sql`CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  subtitle TEXT,
  location TEXT,
  address TEXT,
  map_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  logo TEXT,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  cost INTEGER,
  distance TEXT,
  good_to_know JSONB NOT NULL DEFAULT '[]'::jsonb,
  hours TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
)`;

const tableSpecs = [
  {
    name: 'categories',
    query: (r) => sql`INSERT INTO categories (id, name, visits, gradient, emoji, sort_order)
      VALUES (${r.id}, ${r.name}, ${r.visits}, ${r.gradient}, ${r.emoji}, ${r.sort_order})
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, visits=EXCLUDED.visits, gradient=EXCLUDED.gradient, emoji=EXCLUDED.emoji, sort_order=EXCLUDED.sort_order`,
  },
  {
    name: 'colonias',
    query: (r) => sql`INSERT INTO colonias (id, name, type, cp, visits, image, sort_order)
      VALUES (${r.id}, ${r.name}, ${r.type}, ${r.cp}, ${r.visits}, ${r.image}, ${r.sort_order})
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, cp=EXCLUDED.cp, visits=EXCLUDED.visits, image=EXCLUDED.image, sort_order=EXCLUDED.sort_order`,
  },
  {
    name: 'places',
    query: (r) => sql`INSERT INTO places (id,name,category,subtitle,location,address,map_url,images,logo,rating,review_count,is_open,cost,distance,good_to_know,hours,lat,lng,phone,sort_order)
      VALUES (${r.id},${r.name},${r.category},${r.subtitle},${r.location},${r.address},${r.mapUrl},${JSON.stringify(JSON.parse(r.images || '[]'))}::jsonb,${r.logo},${r.rating},${r.reviewCount},${Boolean(r.isOpen)},${r.cost},${r.distance},${JSON.stringify(JSON.parse(r.goodToKnow || '[]'))}::jsonb,${r.hours},${r.lat},${r.lng},${r.phone},${r.sort_order})
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,subtitle=EXCLUDED.subtitle,location=EXCLUDED.location,address=EXCLUDED.address,map_url=EXCLUDED.map_url,images=EXCLUDED.images,logo=EXCLUDED.logo,rating=EXCLUDED.rating,review_count=EXCLUDED.review_count,is_open=EXCLUDED.is_open,cost=EXCLUDED.cost,distance=EXCLUDED.distance,good_to_know=EXCLUDED.good_to_know,hours=EXCLUDED.hours,lat=EXCLUDED.lat,lng=EXCLUDED.lng,phone=EXCLUDED.phone,sort_order=EXCLUDED.sort_order`,
  },
];

const totals = {};
for (const spec of tableSpecs) {
  const rows = sqlite.prepare(`SELECT rowid AS sort_order, * FROM "${spec.name}" ORDER BY rowid`).all();
  totals[spec.name] = rows.length;
  for (let index = 0; index < rows.length; index += 30) {
    const batch = rows.slice(index, index + 30).map((row) => spec.query(row));
    if (batch.length) await sql.transaction(batch);
  }
}

const verified = {};
for (const name of Object.keys(totals)) {
  const countRows = name === 'categories'
    ? await sql`SELECT COUNT(*)::int AS count FROM categories`
    : name === 'colonias'
      ? await sql`SELECT COUNT(*)::int AS count FROM colonias`
      : await sql`SELECT COUNT(*)::int AS count FROM places`;
  const [{ count }] = countRows;
  verified[name] = count;
  if (count !== totals[name]) throw new Error(`${name}: copied ${count} rows; expected ${totals[name]}.`);
}

console.log(JSON.stringify({ migrated: totals, verified }, null, 2));
sqlite.close();
