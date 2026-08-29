// Bump deze versie bij elke inhoudelijke wijziging aan CSS/JS. Zonder dat
// blijven bestaande bezoekers vastzitten op een oude cache en krijgen ze
// nieuwe fixes nooit te zien (zie Fase 2-audit).
const CACHE_NAME = 'brightnews-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/css/global.css',
    '/css/components.css',
    '/js/main.js',
    '/assets/brightnews-logo.png'
];

// Installeren van de Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting()) // Nieuwe SW meteen actief, niet pas na sluiten van alle tabs
    );
});

// Oude caches opruimen zodra de nieuwe versie actief wordt, en meteen
// controle overnemen over al open pagina's (clients.claim).
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Verzoeken afhandelen (Offline support)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});