// Atul Residency Service Worker
// Caches the app shell so it loads instantly on repeat visits

const CACHE_NAME = 'atul-residency-v2';

// Pages and assets to pre-cache (app shell)
const PRECACHE_URLS = [
  '/',
  '/admin/dashboard',
  '/login',
  '/manifest.json',
];

// On install — pre-cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Don't fail install if a resource is not reachable
      });
    }).then(() => self.skipWaiting())
  );
});

// On activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - API routes: Network first (always fresh data)
// - Everything else: Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests, non-GET, and WhatsApp bot port
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.port === '3001'
  ) {
    return;
  }

  // API routes: network only (never cache live data)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // App pages: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
