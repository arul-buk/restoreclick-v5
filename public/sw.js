// This is a basic service worker for PWA functionality
// It will be automatically registered by PWAServiceWorkerRegister component in production

const CACHE_NAME = 'restoreclick-v1';
const urlsToCache = [
  '/',
  '/blog',
  '/_next/static/css',
  '/_next/static/chunks',
  // Add other important URLs to cache
];

// Install event - cache important files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  // Only apply cache-first strategy to GET requests.
  // For other methods (POST, PUT, etc.), let the browser handle them directly
  // or implement a network-first strategy if SW intervention is needed.
  if (event.request.method !== 'GET') {
    // console.log('Service Worker: Bypassing cache for non-GET request', event.request.method, event.request.url);
    // event.respondWith(fetch(event.request)); // Uncomment if you want SW to proxy non-GET
    return; // Let browser handle non-GET requests by default
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch((error) => {
          console.error('Service Worker: Fetch failed for', event.request.url, error);
          // You could return a custom offline page from cache here if you have one:
          // return caches.match('/offline.html');
          // For now, return a generic network error response.
          return new Response('Network error trying to fetch resource.', {
            status: 503, // Service Unavailable
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});
