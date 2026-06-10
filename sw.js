/* =========================================
   OmniBackup — Service Worker
   sw.js
   ========================================= */

const CACHE_NAME = 'omnibackup-v1';
const ASSETS = [
  '/omnibackup-v1/',
  '/omnibackup-v1/index.html',
  '/omnibackup-v1/style.css',
  '/omnibackup-v1/app.js',
  '/omnibackup-v1/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
