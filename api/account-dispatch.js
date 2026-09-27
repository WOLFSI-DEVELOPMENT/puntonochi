import app from '../server.js';

export default function accountDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const accountPath = requestUrl.searchParams.get('__accountPath');
  if (!accountPath) return res.status(404).json({ error: 'Account route not found.' });
  requestUrl.searchParams.delete('__accountPath');
  req.url = `/api/account/${accountPath}${requestUrl.search}`;
  return app(req, res);
}
