const CACHE_NAME = 'lang-processor-v1';
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});