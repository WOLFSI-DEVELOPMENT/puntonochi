export function apiFetch(path: string, init?: RequestInit) {
  // Keep API calls same-origin so session cookies work through Vercel's
  // external rewrite to Neon Functions in production.
  return fetch(path, init);
}
