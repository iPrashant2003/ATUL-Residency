// ATUL Residency — Service Worker
// Powered by Google Workbox CDN for robust caching and offline resilience

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('✓ Workbox loaded successfully.');

  const { registerRoute, NavigationRoute } = workbox.routing;
  const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { ExpirationPlugin } = workbox.expiration;

  // Pre-cache core shell resources on install
  const OFFLINE_CACHE_NAME = 'atul-residency-offline-v1';
  const PRECACHE_ASSETS = [
    '/offline',
    '/manifest.json',
    '/favicon.ico',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/apple-touch-icon.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-192.png',
    '/icons/icon-maskable-512.png'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(OFFLINE_CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      }).then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== OFFLINE_CACHE_NAME && key.startsWith('atul-residency'))
            .map((key) => caches.delete(key))
        );
      }).then(() => self.clients.claim())
    );
  });

  // 1. Navigation Route Handler (Pages)
  // Network first, fall back to offline pre-cached page if connection is unavailable
  const navigationHandler = async (params) => {
    const networkFirst = new NetworkFirst({
      cacheName: 'atul-residency-pages',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    });

    try {
      // Exclude API routes and bot API requests
      const url = new URL(params.request.url);
      if (url.pathname.startsWith('/api/') || url.port === '3001') {
        return await fetch(params.request);
      }
      return await networkFirst.handle(params);
    } catch (error) {
      // Network failed, serve the cached offline page
      return (await caches.match('/offline')) || Response.error();
    }
  };

  registerRoute(new NavigationRoute(navigationHandler));

  // 2. Static Stylesheets & Scripts
  // Stale-While-Revalidate: load from cache immediately, update in background
  registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
    new StaleWhileRevalidate({
      cacheName: 'atul-residency-static-assets',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        })
      ]
    })
  );

  // 3. Image Assets Caching
  // Cache-First: retrieve immediately from cache, bypass network
  registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
      cacheName: 'atul-residency-images',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        })
      ]
    })
  );

  // 4. Web Fonts Caching
  registerRoute(
    ({ request }) => request.destination === 'font',
    new CacheFirst({
      cacheName: 'atul-residency-fonts',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 180 * 24 * 60 * 60 // 180 days
        })
      ]
    })
  );

  // 5. Handle Push Notifications
  self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New notification from Atul Residency',
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/icon-192.png',
        sound: '/notification.wav',
        data: data.data || { url: '/' },
        vibrate: [100, 50, 100],
        actions: [
          { action: 'open', title: 'Open Portal' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'ATUL Residency', options)
      );
    } catch (err) {
      console.error('Failed to parse push event:', err);
    }
  });

  // 6. Handle Notification Clicks
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // If an app window is already open, focus it and redirect
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => focusedClient.navigate(targetUrl));
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  });

} else {
  console.log('⚠️ Workbox failed to load. Falling back to basic fetch passthrough.');

  self.addEventListener('fetch', (event) => {
    // Basic service worker pass-through
  });
}
