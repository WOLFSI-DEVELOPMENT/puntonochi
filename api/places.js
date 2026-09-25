import app from '../server.js';

export default function placesHandler(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const reviewPlaceId = requestUrl.searchParams.get('__reviewPlaceId');

  if (reviewPlaceId) {
    requestUrl.searchParams.delete('__reviewPlaceId');
    req.url = `/api/places/${encodeURIComponent(reviewPlaceId)}/reviews${requestUrl.search}`;
  }

  return app(req, res);
}
