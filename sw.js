const APP_VERSION = '0.1.0'; // Update this when you make changes
const CACHE_NAME = `lang-processor-${APP_VERSION}`;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.min.css',
  './js/main.js',
  './js/config.js',
  './js/languageManager.js',
  './js/textProcessor.js',
  './js/ui.js',
  './manifest.json'
];

// Add versioning info to the service worker
self.APP_VERSION = APP_VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Don't cache API requests
  if (event.request.url.includes('/api/')) {
    return event.respondWith(fetch(event.request));
  }

  // For navigation requests (HTML documents), use network-first strategy
  if (event.request.mode === 'navigate') {
    return event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }

  // For other assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
    })
  );
});

// Clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients immediately
      self.clients.claim()
    ])
  );
});

// Add message handling for version checks
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage(APP_VERSION);
  }
});