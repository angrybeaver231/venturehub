const CACHE_NAME = 'business-club-v2';
const STATIC_CACHE = 'business-club-static-v2';
const DYNAMIC_CACHE = 'business-club-dynamic-v2';

// Media extensions that must never be intercepted/cached by the service worker.
// The Cache API cannot store 206 Partial Content responses, and intercepting
// these breaks <video>/<audio> streaming and seeking.
const MEDIA_RE = /\.(mp4|webm|mov|m4v|ogg|ogv|mp3|wav|m4a|aac|flac)$/i;

// A response must not be cached if it is a partial/range response or media.
// The Cache API rejects 206 responses, and caching media this way breaks
// streaming/seeking. This catches extensionless media URLs too.
function isUncacheableResponse(response) {
  if (response.status !== 200) return true;
  if (response.headers.get('Content-Range')) return true;
  const type = response.headers.get('Content-Type') || '';
  return type.startsWith('video/') || type.startsWith('audio/');
}

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

const API_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log('[Service Worker] Caching static assets');
      // Cache assets one by one, skipping failures
      for (const url of STATIC_ASSETS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log('[Service Worker] Cached:', url);
          }
        } catch (err) {
          console.warn('[Service Worker] Failed to cache:', url, err);
        }
      }
    }).catch(err => {
      console.error('[Service Worker] Cache setup failed:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Never intercept range requests or media files. The Cache API cannot store
  // 206 Partial Content responses, and intercepting these breaks <video>/
  // <audio> playback and seeking. Let the browser handle them natively.
  if (request.headers.has('range') || MEDIA_RE.test(url.pathname)) {
    return;
  }

  // Navigation requests (pages) - Serve app shell from cache when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (isUncacheableResponse(response)) {
            return response;
          }
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Network failed, serve cached app shell
          return caches.match('/').then((cached) => {
            if (cached) {
              console.log('[Service Worker] Serving cached app shell for navigation');
              return cached;
            }
            // Fallback to offline message
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/html'
              })
            });
          });
        })
    );
    return;
  }

  // API requests - Network first, cache fallback with short TTL
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (!isUncacheableResponse(response)) {
            // Cache successful API responses
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          // Network failed, try cache
          const cached = await cache.match(request);
          if (cached) {
            console.log('[Service Worker] Serving cached API response for', url.pathname);
            return cached;
          }
          throw error;
        }
      })
    );
    return;
  }

  // Static assets - Cache first, network fallback
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          return caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // All other requests - Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache full, non-media 200 responses. The Cache API rejects 206
        // partials, and caching media breaks streaming/seeking.
        if (isUncacheableResponse(response)) {
          return response;
        }
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
