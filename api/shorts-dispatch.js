import app from '../server.js';

export default function shortsDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const shortPath = requestUrl.searchParams.get('__shortPath');
  if (shortPath !== null) {
    if (shortPath !== 'publish' && !/^[A-Za-z0-9_-]{1,80}\/(?:comments|reactions)$/.test(shortPath)) {
      return res.status(404).json({ error: 'PuntoShort route not found.' });
    }
    requestUrl.searchParams.delete('__shortPath');
    req.url = `/api/shorts/${shortPath}${requestUrl.search}`;
  } else {
    req.url = `/api/shorts${requestUrl.search}`;
  }

  return app(req, res);
}
