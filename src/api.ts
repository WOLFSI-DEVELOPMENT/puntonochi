export function apiFetch(path: string, init?: RequestInit) {
  // Keep API calls same-origin so session cookies reach the Vercel API handlers.
  return fetch(path, init);
}
