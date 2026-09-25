import app from '../server.js';

export default function adminDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const adminPath = requestUrl.searchParams.get('__adminPath');
  if (!adminPath) return res.status(404).json({ error: 'Admin route not found.' });

  requestUrl.searchParams.delete('__adminPath');
  req.url = `/api/admin/${adminPath}${requestUrl.search}`;
  return app(req, res);
}
