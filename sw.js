// KAPAG MAY BINAGO KA SA CSS/JS/HTML MO, PALITAN MO ITONG VERSION NUMBER
// Halimbawa: Gawin mong 'nyekflix-v2', sa susunod na update 'nyekflix-v3'
const CACHE_NAME = 'nyekflix-v2'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',   
  '/js/home.js'       
];

// 1. INSTALL - Ise-save yung mga files sa phone
self.addEventListener('install', event => {
  // Pilitin ang app na gamitin agad yung bagong service worker
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ACTIVATE - Dito natin buburahin yung mga LUMANG cache kapag nagpalit ka ng version (v1 -> v2)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Binubura ang lumang cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. FETCH - Kukuha sa internet muna, kapag walang net (offline), kukuha sa cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});