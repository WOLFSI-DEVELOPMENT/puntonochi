import app from '../server.js';

export default function accountDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const profilePath = requestUrl.searchParams.get('__profilePath');
  if (profilePath) {
    if (!/^[A-Za-z0-9_.:%-]+(?:\/(?:activity|follow|picture))?$/.test(profilePath)) {
      return res.status(404).json({ error: 'Profile route not found.' });
    }
    const encodedPath = profilePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    requestUrl.searchParams.delete('__profilePath');
    req.url = `/api/profiles/${encodedPath}${requestUrl.search}`;
    return app(req, res);
  }

  const accountPath = requestUrl.searchParams.get('__accountPath');
  if (!accountPath) return res.status(404).json({ error: 'Account route not found.' });
  requestUrl.searchParams.delete('__accountPath');
  req.url = `/api/account/${accountPath}${requestUrl.search}`;
  return app(req, res);
}
