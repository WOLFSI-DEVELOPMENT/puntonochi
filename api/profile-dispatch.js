import app from '../server.js';

export default function profileDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const profilePath = requestUrl.searchParams.get('__profilePath') || '';
  if (!/^[A-Za-z0-9_.:%-]+(?:\/(?:activity|follow|picture))?$/.test(profilePath)) {
    return res.status(404).json({ error: 'Profile route not found.' });
  }
  const encodedPath = profilePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  requestUrl.searchParams.delete('__profilePath');
  req.url = `/api/profiles/${encodedPath}${requestUrl.search}`;
  return app(req, res);
}
