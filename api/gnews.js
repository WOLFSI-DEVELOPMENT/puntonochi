export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GNews is not configured on the server.' });
  try {
    const url = new URL('https://gnews.io/api/v4/top-headlines');
    url.searchParams.set('country', 'mx');
    url.searchParams.set('lang', 'es');
    url.searchParams.set('max', '10');
    url.searchParams.set('apikey', apiKey);
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: 'GNews no pudo cargar las noticias. Inténtalo más tarde.' });
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      totalArticles: Number(body.totalArticles || 0),
      articles: (body.articles || []).map((article) => ({
        title: article.title || '', description: article.description || '', content: article.content || '',
        url: article.url || '', image: article.image || '', publishedAt: article.publishedAt || '', source: article.source?.name || '',
      })),
    });
  } catch (error) {
    console.error('GNews request failed:', error);
    return res.status(502).json({ error: 'No se pudo conectar con GNews.' });
  }
}
