// Service Worker for background operations
const CACHE_NAME = 'p2p-file-transfer-v1';

// Files to cache for offline access
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle background sync for file transfers
self.addEventListener('sync', (event) => {
  if (event.tag === 'fileTransfer') {
    event.waitUntil(handleFileTransfer());
  }
});

// Handle background fetch for file transfers
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Keep service worker alive for background operations
self.addEventListener('message', (event) => {
  if (event.data === 'keepAlive') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage('keepAliveResponse');
      });
    });
  }
});
