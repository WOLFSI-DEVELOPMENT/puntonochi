import { toFetchResponse, toReqRes } from 'fetch-to-node';
import app from './server.js';

/**
 * Keep the existing Express API while exposing it through Neon Functions'
 * Fetch Request/Response contract. Vercel rewrites /api requests here, so
 * browsers keep using the app's origin and its existing session cookies.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const { req, res } = toReqRes(request);
    const url = new URL(request.url);
    const originalUrl = `${url.pathname}${url.search}`;
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const forwardedProto = request.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1);

    req.url = originalUrl;
    Object.assign(req, { originalUrl });
    req.headers.host = forwardedHost;
    req.headers['x-forwarded-host'] = forwardedHost;
    req.headers['x-forwarded-proto'] = forwardedProto;

    app(req, res);
    return toFetchResponse(res);
  },
};
