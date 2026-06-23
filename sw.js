const CACHE_NAME = 'nyekflix-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/home.css',
  '/home.js'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch events para gumana kahit offline yung basic layout
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});