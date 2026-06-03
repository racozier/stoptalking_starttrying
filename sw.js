const CACHE_NAME = 'st2-v36';
const STRAVA_ORIGIN = 'https://www.strava.com';
const ANTHROPIC_ORIGIN = 'https://api.anthropic.com';
const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/dashboard.js',
  './js/fitness.js',
  './js/study.js',
  './js/polish.js',
  './js/notes.js',
  './js/settings.js',
  './js/strava.js',
  './js/charts.js',
  './config.js',
  './manifest.json',
  './icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: 'reload' })))
    ).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-only for AI API calls (never cache)
  if (url.origin === ANTHROPIC_ORIGIN || url.origin === GEMINI_ORIGIN) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for Strava API calls
  if (url.origin === STRAVA_ORIGIN) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
