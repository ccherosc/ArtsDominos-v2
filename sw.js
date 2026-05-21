// ArtsDominos service worker — cache-first for all static assets
'use strict';

const CACHE = 'artsdominos-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/game.html',
  '/manifest.json',
  '/css/main.css',
  '/css/menu.css',
  '/css/game.css',
  '/js/storage.js',
  '/js/leaderboard.js',
  '/js/characters.js',
  '/js/engine.js',
  '/js/ai.js',
  '/js/scoring.js',
  '/js/sound.js',
  '/js/render.js',
  '/js/input.js',
  '/js/game.js',
  '/js/main.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET, skip Firebase/external requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
