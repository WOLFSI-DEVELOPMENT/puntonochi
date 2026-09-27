import app from '../server.js';

export default function profileDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const profilePath = requestUrl.searchParams.get('__profilePath');
  if (!profilePath) return res.status(404).json({ error: 'Profile route not found.' });
  requestUrl.searchParams.delete('__profilePath');
  req.url = `/api/profiles/${profilePath}${requestUrl.search}`;
  return app(req, res);
}
