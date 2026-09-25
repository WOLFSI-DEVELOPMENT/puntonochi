import { neon } from '@neondatabase/serverless';
import webpush from 'web-push';

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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized.' });
  if (!process.env.DATABASE_URL || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(503).json({ error: 'Missing DATABASE_URL or VAPID keys.' });

  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://puntonochi.vercel.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const sql = neon(process.env.DATABASE_URL);
    await ensureSchema(sql);
    let article = null;
    if (process.env.GNEWS_API_KEY) {
      try {
        const newsUrl = new URL('https://gnews.io/api/v4/top-headlines');
        newsUrl.searchParams.set('country', 'mx'); newsUrl.searchParams.set('lang', 'es'); newsUrl.searchParams.set('max', '10'); newsUrl.searchParams.set('apikey', process.env.GNEWS_API_KEY);
        const newsResponse = await fetch(newsUrl);
        if (newsResponse.ok) article = (await newsResponse.json()).articles?.[0] || null;
        else console.error(`GNews returned ${newsResponse.status}; sending the daily app reminder without a headline.`);
      } catch (newsError) { console.error('GNews unavailable; sending the daily app reminder without a headline.', newsError); }
    }

    const mexicoHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    const isMorning = mexicoHour >= 7 && mexicoHour <= 9;
    let body = article?.title || 'Descubre negocios, lugares y novedades de Nochistlán.';
    if (mexicoHour >= 7 && mexicoHour <= 9) {
      try {
        const weatherResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.3667&longitude=-102.85&current=temperature_2m&timezone=America%2FMexico_City');
        if (weatherResponse.ok) {
          const weather = await weatherResponse.json();
          if (Number.isFinite(weather.current?.temperature_2m)) body = `Nochistlán: ${Math.round(weather.current.temperature_2m)}°C. ${body}`;
        }
      } catch { /* News can still be sent if the forecast is temporarily unavailable. */ }
    }
    if (isMorning) body = `Abre PuntoNochi hoy para mantener tu racha. ${body}`;
    const subscriptions = await sql`SELECT endpoint, subscription FROM push_subscriptions`;
    const result = await Promise.allSettled(subscriptions.map(({ endpoint, subscription }) => webpush.sendNotification(subscription, JSON.stringify({
      title: isMorning ? 'Buenos días, Nochistlán 🔥' : 'Noticias de México',
      body: body.slice(0, 170), url: '/noticias', icon: '/pwa-192.png',
      tag: `puntonochi-news-${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())}-${mexicoHour}`,
    })).catch(async (error) => {
      if (error.statusCode === 404 || error.statusCode === 410) await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
      throw error;
    })));
    const sent = result.filter((item) => item.status === 'fulfilled').length;
    return res.status(200).json({ sent, total: subscriptions.length });
  } catch (error) {
    console.error('News push cron failed:', error);
    return res.status(500).json({ error: 'Could not send news notifications.' });
  }
}
