import app from '../server.js';

export default function sitemapBusinessesHandler(req, res) {
  req.url = '/sitemap-businesses.xml';
  return app(req, res);
}
