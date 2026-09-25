import app from '../server.js';

export default function placesHandler(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const reviewPlaceId = requestUrl.searchParams.get('__reviewPlaceId');
  const overviewPlaceId = requestUrl.searchParams.get('__overviewPlaceId');
  const eventPath = requestUrl.searchParams.get('__eventPath');
  const eventList = requestUrl.searchParams.get('__eventList');

  if (overviewPlaceId) {
    requestUrl.searchParams.delete('__overviewPlaceId');
    req.url = `/api/places/${encodeURIComponent(overviewPlaceId)}/overview${requestUrl.search}`;
  } else if (reviewPlaceId) {
    requestUrl.searchParams.delete('__reviewPlaceId');
    req.url = `/api/places/${encodeURIComponent(reviewPlaceId)}/reviews${requestUrl.search}`;
  } else if (eventPath) {
    requestUrl.searchParams.delete('__eventPath');
    req.url = `/api/events/${eventPath}${requestUrl.search}`;
  } else if (eventList) {
    requestUrl.searchParams.delete('__eventList');
    req.url = `/api/events${requestUrl.search}`;
  }

  return app(req, res);
}
