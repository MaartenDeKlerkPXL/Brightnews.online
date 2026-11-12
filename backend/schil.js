// De paginaschil van BrightNews: header en footer, vanuit één bron.
//
// Waarom dit bestand bestaat: tot 2026-10-29 stonden de navigatiebalk en de
// footer met de hand gekopieerd in dertien pagina's, plus nog een kopie in
// het artikelsjabloon. Een wijziging aan de navigatie betekende dus vijftien
// keer hetzelfde werk, en de kopieën liepen uit elkaar (relatieve paden hier,
// absolute daar). Voor redesign v5 moet de schil helemaal om, en dat moet één
// keer kunnen.
//
// De bron staat in partials/header.html en partials/footer.html. Gebruikt
// door:
//   - backend/stempel-schil.js       (de vaste pagina's in de root)
//   - backend/generate-articles.js   (het artikelsjabloon)
//   - backend/generate-categorieen.js (de 30 categoriepagina's)
//
// Alle paden in de partials zijn absoluut (/index.html, /assets/...). Dat
// werkt op elke diepte: in de root, en twee mappen diep in /articles/nl/.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

// Vertalingen uit data/translations.js, dat in de browser window.translations
// zet. Hier in een kale sandbox uitgevoerd, net als in de generators.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
const T = sandbox.window.translations;

// Zelfde terugval als in de generators: eigen taal, anders Engels.
function t(lang, key) {
    return (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;
}

function leesPartial(naam) {
    return fs.readFileSync(path.join(root, 'partials', naam), 'utf8').trimEnd();
}

// Zet relatieve paden om naar absolute. De partials zijn al absoluut; dit
// blijft voor HTML die van elders komt.
function maakPadenAbsoluut(html) {
    return html.replace(/\b(src|href)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]+)"/gi,
        (heel, attr, pad) => `${attr}="/${pad}"`);
}

// De partials staan met data-i18n op elk tekstelement. In de browser vult
// vertaalStatischeTeksten() in index.js de taal in, met innerHTML: een
// vertaling mag dus opmaak bevatten (23 sleutels doen dat, zoals footer_text
// met <strong>). Voor statische pagina's doen we hier precies hetzelfde, zodat
// een bezoeker of crawler zonder JavaScript al de goede woorden én opmaak ziet.
//
// Tot 2026-10-29 escapete het artikelsjabloon die vertalingen, waardoor er in
// de statische HTML letterlijk "&lt;strong&gt;" stond. De vertalingen komen
// uit ons eigen data/translations.js, met hetzelfde vertrouwen als in de
// browser; vandaar zonder escapen.
//
// Eén voorzorg: bevat een element een genest element met dezelfde tag, dan
// is het einde niet betrouwbaar met een reguliere expressie te vinden. Dat
// element blijft ongemoeid; de browser vertaalt het dan alsnog.
function vertaalSchil(html, lang) {
    return html.replace(
        /(<(\w+)\b[^>]*\sdata-i18n="([a-z0-9_]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
        (heel, opening, tag, sleutel, inhoud, sluiting) => {
            if (new RegExp(`<${tag}[\\s>]`, 'i').test(inhoud)) return heel;
            const vertaling = t(lang, sleutel);
            if (!vertaling || vertaling === sleutel) return heel;
            return opening + vertaling + sluiting;
        }
    );
}

// De schil zoals hij in de bron staat (onvertaald, met data-i18n), voor de
// vaste pagina's: daar vertaalt de browser.
function leesSchil() {
    return { header: leesPartial('header.html'), footer: leesPartial('footer.html') };
}

// De schil van redesign v5 (partials/v5/). Staat los van de huidige, zodat
// v5-pagina's naast de live pagina's kunnen bestaan tot de overstap.
function leesSchilV5() {
    return {
        thema: leesPartial('thema-head.html'),
        header: leesPartial('v5/header.html'),
        footer: leesPartial('v5/footer.html'),
    };
}

// De schil al vertaald naar één taal, voor gegenereerde pagina's.
function schilVoorTaal(lang) {
    const { header, footer } = leesSchil();
    return { header: vertaalSchil(header, lang), footer: vertaalSchil(footer, lang) };
}

const CSP_V5 = "default-src 'self'; connect-src 'self' https://rquuqypgaannrakdrabj.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const RSS_TAALNAAM = { nl: 'Nederlands', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español' };

function escapeAttr(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Een gegenereerde v5-pagina (categorie, thema) met de v5-schil in één taal.
// varianten: { taal: pad } van dezelfde pagina in elke taal. Die worden de
// hreflangs, en data-alt-{taal} op <body>: daarmee gaat een taalkeuze in het
// instellingenpaneel naar die variant (js/v5/schil.js).
function v5Pagina({ lang, titel, beschrijving, pad, varianten, ogType = 'website', ogImage, main, scripts = [] }) {
    const SITE = 'https://brightnews.online';
    const { thema, header, footer } = leesSchilV5();
    const talen = Object.keys(varianten);
    const hreflangs = talen.map(l => `    <link rel="alternate" hreflang="${l}" href="${SITE}${varianten[l]}">`).join('\n');
    const xDefault = varianten.en || varianten[lang];
    const rss = [lang, ...Object.keys(RSS_TAALNAAM).filter(l => l !== lang)]
        .map(l => `    <link rel="alternate" type="application/rss+xml" title="BrightNews (${RSS_TAALNAAM[l]})" href="/feed-${l}.xml">`).join('\n');
    const alt = talen.map(l => ` data-alt-${l}="${escapeAttr(varianten[l])}"`).join('');
    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${CSP_V5}">
    <meta name="robots" content="max-image-preview:large">
    <title>${escapeAttr(titel)} | BrightNews</title>
${thema}
    <meta name="description" content="${escapeAttr(beschrijving)}">
    <link rel="canonical" href="${SITE}${pad}">
${hreflangs}
    <link rel="alternate" hreflang="x-default" href="${SITE}${xDefault}">
${rss}
    <meta property="og:title" content="${escapeAttr(titel)}">
    <meta property="og:description" content="${escapeAttr(beschrijving)}">
    <meta property="og:url" content="${SITE}${pad}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:image" content="${escapeAttr(ogImage || `${SITE}/assets/brightnews-logo.png`)}">
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0a120d" media="(prefers-color-scheme: dark)">
    <link rel="icon" type="image/png" href="/assets/brightnews-logo-faviconv5.png">
    <link rel="preload" href="/assets/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/assets/fonts/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/css/fonts.css">
    <link rel="stylesheet" href="/css/tokens.css">
    <link rel="stylesheet" href="/css/v5/basis.css">
    <link rel="stylesheet" href="/css/v5/componenten.css">
    <link rel="stylesheet" href="/css/v5/paginas.css">
</head>
<body data-sectie="nieuws"${alt}>
${vertaalSchil(header, lang)}

<main id="inhoud">
${main}
</main>

${vertaalSchil(footer, lang)}
<script src="/data/translations.js" defer></script>
<script src="/js/v5/schil.js" defer></script>
${scripts.map(src => `<script src="${src}" defer></script>`).join('\n')}
</body>
</html>
`;
}

module.exports = { leesSchil, leesSchilV5, schilVoorTaal, vertaalSchil, maakPadenAbsoluut, v5Pagina, CSP_V5 };
