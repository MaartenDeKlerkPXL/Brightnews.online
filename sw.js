const CACHE_NAME = 'brightnews-v1';
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
        })
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