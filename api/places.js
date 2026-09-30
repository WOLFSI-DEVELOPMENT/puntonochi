import app from '../server.js';

export default function placesHandler(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const reviewPlaceId = requestUrl.searchParams.get('__reviewPlaceId');
  const overviewPlaceId = requestUrl.searchParams.get('__overviewPlaceId');
  const eventPath = requestUrl.searchParams.get('__eventPath');
  const eventList = requestUrl.searchParams.get('__eventList');
  const menuPath = requestUrl.searchParams.get('__menuPath');
  const businessApplicationPath = requestUrl.searchParams.get('__businessApplicationPath');
  const recent = requestUrl.searchParams.get('__recent');
  const popularWeek = requestUrl.searchParams.get('__popularWeek');

  if (businessApplicationPath) {
    requestUrl.searchParams.delete('__businessApplicationPath');
    req.url = `/api/business-applications/${businessApplicationPath}${requestUrl.search}`;
  } else if (overviewPlaceId) {
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
  } else if (menuPath) {
    if (!/^(?:analyze|mine|collection|[A-Za-z0-9-]+(?:\/poster)?)$/.test(menuPath)) return res.status(404).json({ error: 'Menu route not found.' });
    requestUrl.searchParams.delete('__menuPath');
    req.url = `${menuPath === 'collection' ? '/api/menus' : `/api/menus/${menuPath}`}${requestUrl.search}`;
  } else if (recent) {
    requestUrl.searchParams.delete('__recent');
    req.url = `/api/places/recent${requestUrl.search}`;
  } else if (popularWeek) {
    requestUrl.searchParams.delete('__popularWeek');
    req.url = `/api/places/popular-week${requestUrl.search}`;
  }

  return app(req, res);
}
