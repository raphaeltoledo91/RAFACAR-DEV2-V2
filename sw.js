const CACHE_NAME = 'rafacar-mobile-v1';
const scopePath = new URL(self.registration.scope).pathname;
const scopedPath = (value = '') => new URL(value, self.registration.scope).pathname;
const APP_SHELL = [
  scopedPath(''),
  scopedPath('manifest.webmanifest'),
  scopedPath('brand/rafacar-app-icon-512.png'),
  scopedPath('brand/rafacar-logo-light-remastered.png'),
  scopedPath('brand/rafacar-logo-dark-remastered.png')
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (!url.pathname.startsWith(scopePath)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(scopedPath(''))));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
