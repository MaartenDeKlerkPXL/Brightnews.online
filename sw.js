// Bump deze versie bij elke inhoudelijke wijziging aan CSS/JS. Zonder dat
// blijven bestaande bezoekers vastzitten op een oude cache en krijgen ze
// nieuwe fixes nooit te zien (zie Fase 2-audit).
const CACHE_NAME = 'brightnews-v4'; // v4: Fase 7 — network-first voor HTML
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

// Verzoeken afhandelen (Offline support).
// HTML/navigaties: network-first — bezoekers zien nieuwe deploys direct,
// de cache is alleen nog terugval bij offline. Zonder dit bleven bestaande
// bezoekers op de oude site hangen tot een handmatige CACHE_NAME-bump.
// Overige assets: cache-first zoals voorheen (alleen de precache-lijst
// wordt ooit gevuld; er wordt bewust niets dynamisch bijgecachet, zodat
// nieuws-JSON en premium-content nooit in de cache belanden).
self.addEventListener('fetch', (event) => {
    const isHtml = event.request.mode === 'navigate'
        || (event.request.headers.get('accept') || '').includes('text/html');

    if (isHtml) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Alleen succesvolle same-origin pagina's als offline-terugval bewaren.
                    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
                        const kopie = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, kopie));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then((r) => r || caches.match('/index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});