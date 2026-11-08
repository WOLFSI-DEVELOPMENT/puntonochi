// Postgres client for Supabase with the same tagged-template API the app used
// with @neondatabase/serverless:  const rows = await sql`select * from t where id = ${id}`;
import pg from 'pg';

const pools = new Map();

export function databaseUrl() {
  return process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL || '';
}

export function createSql(connectionString = databaseUrl()) {
  if (!connectionString) return null;
  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10_000,
    });
    pools.set(connectionString, pool);
  }
  const sql = async (strings, ...values) => {
    const text = strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''), '');
    const result = await pool.query(text, values);
    return result.rows;
  };
  sql.query = async (text, params = []) => (await pool.query(text, params)).rows;
  sql.pool = pool;
  return sql;
}
