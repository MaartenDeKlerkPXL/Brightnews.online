// Bump deze versie alleen als dit bestand of de ASSETS-lijst verandert. Sinds
// v40 haalt de worker CSS en JS eerst van het netwerk (zie fetch hieronder),
// dus een wijziging aan een stylesheet of script is zonder bump te zien.
const CACHE_NAME = 'brightnews-v40'; // v40 (2026-11-12): precache naar de v5-bestanden; alles netwerk-eerst, de cache is alleen nog offline terugval. v39: overstap naar redesign v5. Oudere versies: zie git log van sw.js.
// Wat de v5-home nodig heeft om offline te openen. Een bestand dat ontbreekt,
// blokkeert de installatie niet (zie install).
const ASSETS = [
    '/',
    '/index.html',
    '/css/fonts.css',
    '/css/tokens.css',
    '/css/v5/basis.css',
    '/css/v5/componenten.css',
    '/css/v5/paginas.css',
    '/js/v5/gedeeld.js',
    '/js/v5/schil.js',
    '/js/v5/home.js',
    '/js/supabase-init.js',
    '/js/vendor/supabase-js-2.112.4.js',
    '/data/translations.js',
    '/assets/iconen.svg',
    '/assets/fonts/figtree-latin.woff2',
    '/assets/fonts/instrument-sans-latin.woff2',
    '/assets/brightnews-logo.png',
    '/assets/brightnews-logo-faviconv5.png'
];

// Installeren van de Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // cache: 'reload' — vers van het netwerk, niet uit de HTTP-cache.
            // Zonder dit bakte een install vlak na een deploy de oude versie
            // van een asset (max-age 600) permanent in de nieuwe SW-cache.
            // Per bestand en zonder te falen: met addAll hield één ontbrekend
            // bestand iedereen voor altijd op de vorige worker.
            return Promise.all(ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
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

// Verzoeken afhandelen. Alleen GET op de eigen site; de rest (Supabase,
// Google, Stripe) gaat buiten de worker om.
// Alles netwerk-eerst: bezoekers zien een nieuwe deploy meteen, ook van CSS
// en JS. De cache is alleen terugval als er geen verbinding is. Er wordt niets
// dynamisch bijgecachet behalve HTML zonder querystring, zodat nieuws-JSON
// en premium-tekst nooit in de cache belanden.
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    const isHtml = event.request.mode === 'navigate'
        || (event.request.headers.get('accept') || '').includes('text/html');

    if (isHtml) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Elke ?id=/?v=-variant apart cachen liet de cache
                    // onbegrensd groeien (duizenden entries).
                    if (response.ok && !url.search) {
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
        fetch(event.request).catch(() => caches.match(event.request).then((r) => r || Response.error()))
    );
});
