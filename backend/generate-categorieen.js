// Categoriepagina's (punt 55, 2026-09-27).
//
// De site heeft zes categorieën, maar het filteren gebeurde uitsluitend met
// JavaScript op de homepage. Er bestond dus geen enkele indexeerbare URL voor
// "milieunieuws" of "wetenschapsnieuws" — 30 ontbrekende ingangen (zes
// categorieën × vijf talen). Bij een site waarvan 2.341 URL's op "gevonden,
// niet opgehaald" staan is dat precies wat ontbreekt: routes naar binnen.
//
// Deze pagina's zetten de artikelen *in de HTML*, niet via JavaScript — dat
// is het hele punt. Ze worden elke run opnieuw geschreven, net als de
// artikelpagina's.
//
// Aanroep (zie .github/workflows/update-news.yml, ná generate-articles.js
// want het manifest moet actueel zijn):
//   node backend/generate-categorieen.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE_URL = 'https://brightnews.online';
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const root = path.join(__dirname, '..');
const UITVOERMAP = 'categories';

// HOUD IN SYNC met renderFilterBar() in index.js: dezelfde zes namen, en ze
// moeten exact overeenkomen met het veld 'category' in data/news_<taal>.json.
// 'All' hoort er niet bij — dat is de homepage.
const CATEGORIEEN = ['Tech', 'Health', 'Science', 'Lifestyle', 'Environment', 'Finance'];

// Hoeveel artikelen een categoriepagina toont. Ruim genoeg om de pagina inhoud
// te geven, begrensd zodat hij niet eindeloos wordt.
const MAX_PER_PAGINA = 60;

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
const T = sandbox.window.translations;
function t(lang, key) {
    return (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// HOUD IN SYNC met maakSlug() in backend/generate-articles.js.
function maakSlug(tekst) {
    return String(tekst).toLowerCase()
        .normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80).replace(/-+$/, '') || 'categorie';
}

// De slug van een categorie is de vertaalde naam: /categories/nl/milieu.html
// leest beter en scoort beter dan /categories/nl/environment.html.
function categorieSlug(categorie, lang) {
    return maakSlug(t(lang, `filter_${categorie.toLowerCase()}`));
}

// --- De paginaschil uit index.html lichten ------------------------------
// Bewust niet overgeschreven: de navigatiebalk en de footer staan al op
// twaalf pagina's én in het artikelsjabloon, en een dertiende kopie zou
// daarbij achterlopen zodra iemand er iets aan verandert. Door ze hier uit
// index.html te halen volgen deze pagina's automatisch mee.
function leesSchil() {
    const bron = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    const headerStart = bron.indexOf('<header>');
    const headerEind = bron.indexOf('</header>', headerStart);
    if (headerStart < 0 || headerEind < 0) throw new Error('Kon <header> niet uit index.html lezen.');

    // LET OP: zoeken vanáf de main-footer, niet vanaf 0. Het geparkeerde
    // blok bovenin index.html bevat zelf ook een </footer>, en zoeken vanaf
    // het begin levert dan een negatieve slice op (die fout is op 2026-09-24
    // al een keer gemaakt bij feedback.html).
    const footerStart = bron.indexOf('<footer class="main-footer"');
    if (footerStart < 0) throw new Error('Kon <footer class="main-footer"> niet uit index.html lezen.');
    const footerEind = bron.indexOf('</footer>', footerStart);
    if (footerEind < 0) throw new Error('Kon het einde van de main-footer niet vinden.');

    return {
        header: maakPadenAbsoluut(bron.slice(headerStart, headerEind + '</header>'.length)),
        footer: maakPadenAbsoluut(bron.slice(footerStart, footerEind + '</footer>'.length)),
    };
}

// index.html staat in de root en gebruikt relatieve paden ("index.html",
// "assets/brightnews-logo.png"). Deze pagina's staan twee mappen diep, dus
// daar wijst zo'n pad naar /categories/nl/assets/... en is het logo stuk.
// Alles wat niet met een schema, /, # of mailto: begint krijgt een slash.
function maakPadenAbsoluut(html) {
    return html.replace(/\b(src|href)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]+)"/gi,
        (heel, attr, pad) => `${attr}="/${pad}"`);
}

// De schil uit index.html staat in het Engels met data-i18n erop; op de
// homepage vult JavaScript dat aan. Hier zetten we de juiste taal er meteen
// in, zodat een bezoeker (en een crawler) zonder JavaScript al de goede
// woorden ziet. Alleen elementen met platte tekst: staat er opmaak in (een
// icoon naast de tekst), dan blijft het element ongemoeid — precies zoals
// `data-i18n` op de site zelf werkt.
function vertaalSchil(html, lang) {
    return html.replace(
        /(<(\w+)\b[^>]*\sdata-i18n="([a-z0-9_]+)"[^>]*>)([^<]*)(<\/\2>)/gi,
        (heel, opening, tag, sleutel, tekst, sluiting) => {
            const vertaling = t(lang, sleutel);
            if (!vertaling || vertaling === sleutel) return heel;
            return opening + escapeHtml(vertaling) + sluiting;
        }
    );
}

function kaartHtml(artikel, lang, manifest) {
    const entry = manifest.articles?.[artikel.id];
    const slug = entry?.slugs?.[lang];
    // Zonder slug bestaat er (nog) geen statische pagina; dan de
    // homepage-variant, net als generate-evergreen.js doet.
    const href = slug
        ? `/articles/${lang}/${slug}-${artikel.id}.html`
        : `/?id=${encodeURIComponent(artikel.id)}`;
    const samenvatting = String(artikel.summary || '').slice(0, 120);
    const alt = artikel.image_alt || artikel.title;
    return `            <article class="news-card">
                <a href="${escapeHtml(href)}" tabindex="-1" aria-hidden="true">
                    <img class="card-img" src="${escapeHtml(artikel.image || '/assets/brightnews-logo.png')}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" width="800" height="450">
                </a>
                <div class="card-content">
                    <h3><a href="${escapeHtml(href)}">${escapeHtml(artikel.title)}</a></h3>
                    <p>${escapeHtml(samenvatting)}${samenvatting.length === 120 ? '…' : ''}</p>
                </div>
            </article>`;
}

// RSS-autodiscovery (punt 47): eigen taal bovenaan.
const RSS_TAALNAAM = { nl: 'Nederlands', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español' };
function rssLinksHtml(eigenTaal) {
    return [eigenTaal, ...TALEN.filter(l => l !== eigenTaal)]
        .map(l => `    <link rel="alternate" type="application/rss+xml" title="BrightNews (${RSS_TAALNAAM[l]})" href="/feed-${l}.xml">`)
        .join('\n');
}

function paginaHtml(categorie, lang, artikelen, manifest, schil) {
    const rssLinks = rssLinksHtml(lang);
    const label = t(lang, `filter_${categorie.toLowerCase()}`);
    const titel = t(lang, 'cat_titel').replace('{cat}', label);
    const beschrijving = t(lang, 'cat_meta').replace('{cat}', label);
    const paginaUrl = `${SITE_URL}/${UITVOERMAP}/${lang}/${categorieSlug(categorie, lang)}.html`;

    const hreflangs = TALEN
        .map(l => `    <link rel="alternate" hreflang="${l}" href="${SITE_URL}/${UITVOERMAP}/${l}/${categorieSlug(categorie, l)}.html">`)
        .join('\n');

    const kaarten = artikelen.length
        ? artikelen.map(a => kaartHtml(a, lang, manifest)).join('\n')
        : `            <p class="categorie-leeg">${escapeHtml(t(lang, 'cat_leeg'))}</p>`;

    // Onderling doorlinken: elke categoriepagina wijst naar de vijf andere.
    // Zonder die links zijn het losse eilanden die alleen via de sitemap te
    // bereiken zijn — hetzelfde probleem als de artikelpagina's hadden.
    const andere = CATEGORIEEN.filter(c => c !== categorie)
        .map(c => `<a href="/${UITVOERMAP}/${lang}/${categorieSlug(c, lang)}.html">${escapeHtml(t(lang, `filter_${c.toLowerCase()}`))}</a>`)
        .join('\n            ');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="max-image-preview:large">
${rssLinks}
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://rquuqypgaannrakdrabj.supabase.co https://*.google-analytics.com https://www.googletagmanager.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'">
    <meta name="description" content="${escapeHtml(beschrijving)}">
    <title>${escapeHtml(titel)} | BrightNews</title>
    <link rel="canonical" href="${paginaUrl}">
${hreflangs}
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/${UITVOERMAP}/en/${categorieSlug(categorie, 'en')}.html">
    <meta property="og:title" content="${escapeHtml(titel)}">
    <meta property="og:description" content="${escapeHtml(beschrijving)}">
    <meta property="og:url" content="${paginaUrl}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${SITE_URL}/assets/brightnews-logo.png">
    <link rel="icon" type="image/png" href="/assets/brightnews-logo-faviconv5.png">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/components.css">
    <!-- .grid-container en .news-card staan in de paginastijl van de
         homepage; deze pagina gebruikt dezelfde kaarten. -->
    <link rel="stylesheet" href="/css/pages/index.css">
    <link rel="stylesheet" href="/css/pages/categorie.css">
    <script src="/data/translations.js" defer></script>
    <script src="/js/main.js" defer></script>
</head>
<body>
<a href="#main-content" class="skip-link" data-i18n="skip_to_content">${escapeHtml(t(lang, 'skip_to_content'))}</a>
${schil.header}
<main id="main-content" class="container categorie-pagina">
    <h1>${escapeHtml(titel)}</h1>
    <p class="categorie-intro">${escapeHtml(beschrijving)}</p>

    <div class="grid-container">
${kaarten}
    </div>

    <nav class="categorie-andere" aria-label="${escapeHtml(t(lang, 'cat_andere'))}">
        <h2>${escapeHtml(t(lang, 'cat_andere'))}</h2>
        <div class="categorie-links">
            ${andere}
        </div>
    </nav>
</main>
${schil.footer}
</body>
</html>
`;
}

function main() {
    const start = Date.now();
    const manifestPad = path.join(root, 'articles/manifest.json');
    const manifest = fs.existsSync(manifestPad)
        ? JSON.parse(fs.readFileSync(manifestPad, 'utf8'))
        : { articles: {} };

    const ruweSchil = leesSchil();
    let geschreven = 0;
    const telling = {};

    for (const lang of TALEN) {
        const pad = path.join(root, `data/news_${lang}.json`);
        if (!fs.existsSync(pad)) {
            console.warn(`⚠️  data/news_${lang}.json ontbreekt — taal overgeslagen.`);
            continue;
        }
        const alle = JSON.parse(fs.readFileSync(pad, 'utf8'));
        const schil = {
            header: vertaalSchil(ruweSchil.header, lang),
            footer: vertaalSchil(ruweSchil.footer, lang),
        };

        for (const categorie of CATEGORIEEN) {
            const artikelen = alle
                .filter(a => a.category === categorie && a.id && a.title)
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                .slice(0, MAX_PER_PAGINA);

            const map = path.join(root, UITVOERMAP, lang);
            fs.mkdirSync(map, { recursive: true });
            const bestand = path.join(map, `${categorieSlug(categorie, lang)}.html`);
            fs.writeFileSync(bestand, paginaHtml(categorie, lang, artikelen, manifest, schil));
            geschreven++;
            telling[`${lang}/${categorie}`] = artikelen.length;
        }
    }

    const leeg = Object.entries(telling).filter(([, n]) => n === 0).map(([k]) => k);
    console.log(`🗂️  ${geschreven} categoriepagina's geschreven in ${((Date.now() - start) / 1000).toFixed(1)}s.`);
    if (leeg.length) console.log(`   Zonder artikelen (nog): ${leeg.join(', ')}`);
}

main();
