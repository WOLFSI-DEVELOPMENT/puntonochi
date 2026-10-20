import app from '../server.js';

export default function contentDispatch(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const contentPath = requestUrl.searchParams.get('__contentPath');
  if (!contentPath || !/^(?:guides\/[A-Za-z0-9_-]+\/image|community-posts\/(?:feed|day|[A-Za-z0-9_-]+\/(?:image|cover)))$/.test(contentPath)) {
    return res.status(404).json({ error: 'Content route not found.' });
  }
  requestUrl.searchParams.delete('__contentPath');
  req.url = `/api/${contentPath}${requestUrl.search}`;
  return app(req, res);
}
