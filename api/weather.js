export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
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
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({
      location: 'Nochistlán, Zacatecas',
      days: (body.daily?.time || []).map((date, index) => ({
        date,
        weatherCode: body.daily.weather_code?.[index] ?? 0,
        high: body.daily.temperature_2m_max?.[index] ?? null,
        low: body.daily.temperature_2m_min?.[index] ?? null,
        precipitationChance: body.daily.precipitation_probability_max?.[index] ?? null,
      })),
    });
  } catch (error) {
    console.error('Weather forecast request failed:', error);
    return res.status(502).json({ error: 'No se pudo conectar con el pronóstico del tiempo.' });
  }
}
