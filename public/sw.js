const CACHE_NAME = 'puntonochi-shell-v5';
const APP_SHELL = ['/', '/manifest.webmanifest', '/pwa-192.png', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(async (cache) => {
        // Cache the entry JavaScript and CSS during installation so the next
        // PWA launch can paint from disk without waiting for the network.
        try {
          const shell = await cache.match('/');
          const html = await shell?.text();
          if (!html) return;
          const assets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)]
            .map((match) => match[1]);
          await Promise.allSettled(assets.map((asset) => cache.add(asset)));
        } catch {
          // A failed optional pre-cache must not prevent the app from installing.
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(async (keys) => {
        const oldShellCaches = keys.filter((key) => key.startsWith('puntonochi-shell-') && key !== CACHE_NAME);
        await Promise.all(oldShellCaches.map((key) => caches.delete(key)));
        return oldShellCaches.length > 0;
      })
      .then(() => self.clients.claim())
      .then(async (isUpdate) => {
        if (!isUpdate) return;
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        await Promise.all(windows.filter((client) => new URL(client.url).origin === self.location.origin).map((client) => client.navigate(client.url)));
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    const networkUpdate = fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        return caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)).then(() => response);
      }
      return response;
    });
    // A returning PWA should open from its saved shell immediately, even on a slow network.
    // Refresh the shell in the background; use the network on the first visit when no copy exists.
    event.waitUntil(networkUpdate.then(() => undefined).catch(() => undefined));
    event.respondWith(
      caches.match('/')
        .then((cached) => cached || networkUpdate)
        .catch(() => networkUpdate)
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || /\.(?:png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void cache.put(request, copy);
        }
        return response;
      })))
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'PuntoNochi', {
    body: payload.body || 'Hay novedades de Nochistlán para ti.',
    icon: payload.icon || '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: payload.tag || `puntonochi-${Date.now()}`,
    data: { url: payload.url || '/noticias' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/noticias', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.navigate(target).then(() => existing.focus());
    return clients.openWindow(target);
  }));
});
