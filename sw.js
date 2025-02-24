const APP_VERSION = "0.1.6";
const CACHE_NAME = `lang-processor-cache-${APP_VERSION}`;
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/style.min.css",
  "./js/main.js",
  "./js/config.js",
  "./js/languageManager.js",
  "./js/textProcessor.js",
  "./js/ui.js",
  "./manifest.json",
];

// Add versioning info to the service worker
self.APP_VERSION = APP_VERSION;

self.addEventListener("install", (event) => {
  // Skip waiting to activate new service worker immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Check if the request URL is valid for caching
  if (!event.request.url.startsWith("http")) {
    return;
  }

  // Don't cache API requests
  if (event.request.url.includes("/api/")) {
    return event.respondWith(fetch(event.request));
  }

  // For navigation requests (HTML documents), always go to network first
  if (event.request.mode === "navigate") {
    return event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache error responses
          if (!response.ok) {
            throw new Error("Navigation fetch failed");
          }
          try {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone).catch((err) => {
                console.warn("Cache put failed:", err);
              });
            });
          } catch (error) {
            console.warn("Cache operation failed:", error);
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || Promise.reject("No cached response available");
          });
        })
    );
  }

  // For shared content requests or hash-based navigation, bypass cache
  if (event.request.url.includes("?share") || event.request.url.includes("#share=")) {
    return event.respondWith(fetch(event.request));
  }

  // For other assets, use cache-first strategy with proper error handling
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).then((response) => {
        try {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch((err) => {
              console.warn("Cache put failed:", err);
            });
          });
        } catch (error) {
          console.warn("Cache operation failed:", error);
        }
        return response;
      });
    })
  );
});

// Clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith("lang-processor-cache-") && cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients immediately
      self.clients.claim(),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "GET_VERSION") {
    event.ports[0].postMessage({
      version: APP_VERSION,
      timestamp: new Date().getTime(),
    });
  }
});
