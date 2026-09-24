const neonApiBase = (import.meta.env.VITE_NEON_API_BASE_URL || '').replace(/\/+$/, '');

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${neonApiBase}${path}`, init);
}
