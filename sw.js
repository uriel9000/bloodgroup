const CACHE_NAME = 'blood-group-predictor-v11';
const ASSETS = [
  './',
  'index.html',
  'app.html',
  'favicon.ico',
  'manifest.json',
  'css/landing.css',
  'css/styles.css',
  'js/runtime-config.js',
  'js/landing.js',
  'js/genetics.js',
  'js/db.js',
  'js/app.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(asset => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/admin-panel/backend/')
  ) {
    return;
  }

  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open('fonts-cache').then(cache =>
        cache.match(event.request).then(response =>
          response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
        )
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request).catch(() => {
        if (url.pathname.endsWith('/favicon.ico') || url.pathname.endsWith('favicon.ico')) {
          return new Response('', { status: 404 });
        }

        return new Response('Offline content not available.', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
