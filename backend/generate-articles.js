// Genereert statische artikelpagina's: articles/{taal}/{slug}-{id}.html voor
// elk artikel in data/news_{taal}.json, in alle 5 talen (Fase 6). Draait als
// stap in .github/workflows/update-news.yml, na de nieuws-update en vóór
// generate-sitemap.js (die leest het manifest hieronder voor de sitemap).
//
// Ontwerpbesluiten (vastgelegd in BRIGHTNEWS-OVERDRACHT-FABLE.md, Fase 6):
// - Eigen lichte buildstap, geen framework/bundler.
// - URL: articles/{taal}/{slug}-{id}.html met een deterministische,
//   ASCII-veilige slug — maakSlug() hieronder moet IDENTIEK blijven aan
//   maakArtikelSlug() in index.js (deelknoppen berekenen daar dezelfde URL).
// - Incrementeel en nooit verwijderen: pagina's van artikelen die uit de
//   actuele JSON zijn gevallen blijven bestaan (eenmaal geïndexeerde URL's
//   mogen niet verdwijnen); articles/manifest.json onthoudt ze voor de
//   sitemap. Pagina's van actuele artikelen worden idempotent hergenereerd
//   (zelfde input → zelfde bytes), zodat template-fixes overal doorwerken.
// - Teaser-truncatie: pre-Fase-1.4-artikelen hebben hun vólledige tekst als
//   summary in de publieke JSON; de generator publiceert NOOIT meer dan
//   ~60 woorden (zelfde maakTeaser() als processor.js). Premium-lezers
//   krijgen de volledige tekst client-side via get_full_article()/index.js.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { leesSchilV5, vertaalSchil } = require('./schil');

const SITE_URL = 'https://brightnews.online';
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const LOCALES = { nl: 'nl-NL', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };
const root = path.join(__dirname, '..');

// --- vertalingen laden (data/translations.js is een browser-script dat
// window.translations zet; hier in een kale sandbox uitgevoerd) ---
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
const T = sandbox.window.translations;
function t(lang, key) {
    return (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;
}

// Identiek aan maakTeaser() in backend/processor.js.
function maakTeaser(tekst, maxWoorden = 60) {
    if (!tekst) return '';
    const woorden = String(tekst).split(' ');
    if (woorden.length <= maxWoorden) return String(tekst);
    return woorden.slice(0, maxWoorden).join(' ') + '...';
}

// HOUD IN SYNC met maakArtikelSlug() in index.js.
function maakSlug(titel) {
    return String(titel).toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        // De eindtrim ook ná de slice: een afkap op precies 80 tekens kon
        // anders op '-' eindigen. Bestaande manifest-slugs blijven gewoon
        // gelden (die winnen hieronder van een herberekening).
        .slice(0, 80).replace(/-+$/, '') || 'artikel';
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function veiligeUrl(u, fallback) {
    return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : fallback;
}

// Afbeeldingen mogen ook een eigen, root-relatief pad zijn (/assets/fallback/…),
// dat processor.js toekent als de feed geen foto meelevert. Alleen dat ene pad
// toestaan, zodat er niets anders relatiefs doorheen glipt.
function veiligeAfbeelding(u, fallback) {
    if (typeof u === 'string' && /^\/assets\/[A-Za-z0-9/_-]+\.(jpg|jpeg|png|webp)$/.test(u)) return u;
    return veiligeUrl(u, fallback);
}

// Reservefoto's: eigen bestanden in assets/fallback/ (2026-09-08). Per
// categorie een eigen setje, en de keuze is deterministisch op artikel-id —
// dezelfde pagina levert bij elke generatie dezelfde foto, anders zou elke
// Action-run alle pagina's laten wijzigen.
const RESERVE_PER_CATEGORIE = {
    // Gelijkgetrokken met index.js en met wat er in assets/fallback/ staat
    // (2026-09-23). Deze stonden nog op de aantallen van vóór de aanvulling
    // van 20 september, waardoor artikelpagina's alleen de eerste vier
    // Science- en Lifestyle-foto's gebruikten en zestien nieuwe foto's hier
    // ongebruikt bleven liggen.
    'Tech': 4, 'Health': 5, 'Science': 11, 'Lifestyle': 9, 'Environment': 10, 'Finance': 4
};

function reserveAfbeelding(artikel) {
    const categorie = RESERVE_PER_CATEGORIE[artikel && artikel.category] ? artikel.category : 'Lifestyle';
    const aantal = RESERVE_PER_CATEGORIE[categorie];
    const id = String((artikel && artikel.id) || '');
    let som = 0;
    for (let i = 0; i < id.length; i++) som = (som + id.charCodeAt(i)) % 100000;
    return `/assets/fallback/${categorie.toLowerCase()}-${(som % aantal) + 1}.jpg`;
}

// "Meer goed nieuws": links naar de artikelen die vlak vóór en vlak ná dit
// artikel verschenen, in dezelfde taal.
//
// Waarom op datum en niet op categorie (punt 36, 2026-09-23): de categorie
// staat niet in het manifest en ook niet in de HTML van het archief, dus voor
// de ruim 450 gearchiveerde artikelen is die simpelweg niet meer te
// achterhalen. De datum staat er voor alle 609 wél.
//
// Op datum heeft bovendien een eigenschap die categorie niet heeft: het vormt
// één aaneengesloten ketting door het hele archief. Vanaf elke geïndexeerde
// pagina kan een crawler naar zijn buren lopen, en vandaar verder — zo is
// uiteindelijk elk artikel bereikbaar. Dat is precies wat ontbrak: Google
// kende 2.341 URL's alleen uit de sitemap en haalde ze niet op.
// De ruggengraat: twee artikelen aan elke kant, op datum. Dit is wat de
// ketting heel houdt — elke pagina raakt zijn directe buren, dus vanaf elke
// geïndexeerde pagina is het hele archief te belopen. Hier niet aan morrelen
// zonder de bereikbaarheid opnieuw na te rekenen.
const BUREN_PER_KANT = 2;

// Daar bovenop, als de categorie bekend is: twee artikelen uit dezelfde
// categorie. Die zijn voor een lezer relevanter dan "toevallig dezelfde week",
// maar ze mogen de datumketting niet vervangen — de categorie is maar voor
// 39% van het archief bekend (zie backend/backfill-categorie.js).
const CATEGORIE_EXTRA = 2;

function bouwBurenIndex(manifest) {
    const rijen = Object.entries(manifest.articles || {})
        .filter(([, e]) => e && e.date)
        .map(([id, e]) => ({ id, date: e.date, slugs: e.slugs || {}, titles: e.titles || {}, category: e.category || null }));
    // Nieuwste eerst; bij een gelijke datum op id, zodat de volgorde tussen
    // twee runs niet verspringt.
    rijen.sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : (a.date < b.date ? 1 : -1)));
    const positie = new Map(rijen.map((r, i) => [r.id, i]));
    return { rijen, positie };
}

// HOUD IN SYNC met categorieSlug() in backend/generate-categorieen.js: de
// slug van een categoriepagina is de vertaalde naam van die categorie.
const CATEGORIE_PAGINAS = ['Tech', 'Health', 'Science', 'Lifestyle', 'Environment', 'Finance'];
function categoriePaginaHref(categorie, lang) {
    if (!CATEGORIE_PAGINAS.includes(categorie)) return null;
    return `/categories/${lang}/${maakSlug(t(lang, `filter_${categorie.toLowerCase()}`))}.html`;
}

// De keuze van de buren, los van de opmaak: gedeeld door burenHtml() (oude
// sjabloon, nog gebruikt door backend/migratie-meer-nieuws.js) en burenV5().
function kiesBuren(artikel, lang, burenIndex) {
    if (!burenIndex) return [];
    const { rijen, positie } = burenIndex;
    const i = positie.get(String(artikel.id));
    if (i === undefined) return [];

    const bruikbaar = r => r.slugs[lang] && r.titles[lang];
    const gekozen = [];
    const gezien = new Set([String(artikel.id)]);

    // Eerst dezelfde categorie, want dat is voor een lezer het sterkste
    // verband. Dichtstbijzijnd in tijd eerst, zodat het niet willekeurig oogt.
    const eigenCategorie = rijen[i].category;
    if (eigenCategorie) {
        const zelfde = rijen
            .map((r, j) => ({ r, afstand: Math.abs(j - i) }))
            .filter(({ r }) => r.category === eigenCategorie && !gezien.has(r.id) && bruikbaar(r))
            .sort((a, b) => a.afstand - b.afstand)
            .slice(0, CATEGORIE_EXTRA);
        for (const { r } of zelfde) { gekozen.push(r); gezien.add(r.id); }
    }

    // Daarna de datumburen: twee de ene kant op, twee de andere. Die gaan er
    // altijd bij, ook als de categorie al genoeg opleverde — zij vormen de
    // ketting. Elke richting telt zijn eigen twee, zodat een gat aan één kant
    // (bijvoorbeeld bij het nieuwste artikel) de andere kant niet opeet.
    for (const richting of [-1, 1]) {
        let gevonden = 0;
        for (let stap = 1; stap <= rijen.length && gevonden < BUREN_PER_KANT; stap++) {
            const j = i + richting * stap;
            if (j < 0 || j >= rijen.length) break;
            const r = rijen[j];
            if (gezien.has(r.id) || !bruikbaar(r)) continue;
            gekozen.push(r);
            gezien.add(r.id);
            gevonden++;
        }
    }

    return gekozen;
}

function burenHtml(artikel, lang, burenIndex) {
    const kandidaten = kiesBuren(artikel, lang, burenIndex);
    if (!kandidaten.length) return '';
    const eigenCategorie = burenIndex.rijen[burenIndex.positie.get(String(artikel.id))].category;

    // Eén link naar de volledige categoriepagina (punt 55). Zonder deze regel
    // zijn die dertig pagina's alleen via de sitemap bereikbaar, en een
    // sitemap is een suggestie waar Google bij dit domein weinig mee doet —
    // zie punt 23. Een link is een aanbeveling.
    const catHref = categoriePaginaHref(eigenCategorie, lang);
    const catLabel = eigenCategorie ? t(lang, `filter_${eigenCategorie.toLowerCase()}`) : '';
    const categorieLink = catHref
        ? `            <p class="meer-categorie"><a href="${catHref}">${escapeHtml(t(lang, 'cat_titel').replace('{cat}', catLabel))}</a></p>`
        : '';

    const items = kandidaten.map(r =>
        `                    <li><a href="/articles/${lang}/${r.slugs[lang]}-${r.id}.html">${escapeHtml(r.titles[lang])}</a></li>`
    ).join('\n');

    return `
    <nav class="meer-nieuws" aria-labelledby="meer-nieuws-kop">
        <div class="meer-nieuws-binnen">
            <h2 id="meer-nieuws-kop">${escapeHtml(t(lang, 'related_title'))}</h2>
            <!-- Bewust géén data-i18n: de links eronder staan in de taal van déze
                 pagina, dus de kop hoort dat ook te doen. Met data-i18n zou hij de
                 menutaal van de bezoeker volgen en kreeg je een Duitse kop boven
                 Nederlandse links. -->
            <ul>
${items}
            </ul>
${categorieLink}
        </div>
    </nav>
`;
}

// RSS-autodiscovery (punt 47): de feed van déze taal bovenaan, want een
// lezer-app pakt standaard de eerste.
const RSS_TAALNAAM = { nl: 'Nederlands', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español' };
function rssLinksHtml(eigenTaal) {
    const volgorde = [eigenTaal, ...TALEN.filter(l => l !== eigenTaal)];
    return volgorde
        .map(l => `    <link rel="alternate" type="application/rss+xml" title="BrightNews (${RSS_TAALNAAM[l]})" href="/feed-${l}.xml">`)
        .join('\n');
}

// Datum en tijd zoals de v5-artikelpagina ze toont ("Woensdag 28 oktober
// 2026, 14:05"), vast in Nederlandse tijd: een statische pagina kent de
// tijdzone van de lezer niet.
function datumTijd(iso, lang) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const datum = new Intl.DateTimeFormat(LOCALES[lang], { timeZone: 'Europe/Amsterdam', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const tijd = new Intl.DateTimeFormat(LOCALES[lang], { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }).format(d);
    return `${datum.charAt(0).toLocaleUpperCase(LOCALES[lang])}${datum.slice(1)}, ${tijd}`;
}

function icoon(naam) {
    return `<svg class="icoon" aria-hidden="true"><use href="/assets/iconen.svg#${naam}"/></svg>`;
}

function vul(tekst, waarden) {
    return String(tekst).replace(/\{(\w+)\}/g, (heel, k) => (k in waarden ? waarden[k] : heel));
}

// "Meer goed nieuws" in v5: dezelfde keuze als burenHtml() (de datumketting
// plus twee uit dezelfde categorie), als koppenlijst in de band onderaan.
// Hier niet aan morrelen zonder de bereikbaarheid na te rekenen: deze links
// houden het hele archief voor Google bereikbaar (punt 36).
function burenV5(artikel, lang, burenIndex) {
    const gekozen = kiesBuren(artikel, lang, burenIndex);
    if (!gekozen.length) return '';
    const eigenCategorie = burenIndex.rijen[burenIndex.positie.get(String(artikel.id))]?.category;
    const catHref = categoriePaginaHref(eigenCategorie, lang);
    const catLabel = eigenCategorie ? t(lang, `filter_${eigenCategorie.toLowerCase()}`) : '';
    const items = gekozen.map(r => {
        const label = CATEGORIE_PAGINAS.includes(r.category)
            ? `<span class="categorie-label">${escapeHtml(t(lang, `filter_${r.category.toLowerCase()}`))}</span>` : '';
        return `            <li><article class="headline-item">${label}<h3 class="headline-item__titel"><a class="headline-item__link" href="/articles/${lang}/${r.slugs[lang]}-${r.id}.html">${escapeHtml(r.titles[lang])}</a></h3></article></li>`;
    }).join('\n');
    const categorieLink = catHref
        ? `\n        <p class="verwijzing"><a href="${catHref}">${escapeHtml(t(lang, 'cat_titel').replace('{cat}', catLabel))}</a></p>`
        : '';
    return `
<section class="meer-band" aria-labelledby="kop-meer">
    <div class="container meer-band__binnen">
        <h2 class="meer-band__titel" id="kop-meer">${escapeHtml(t(lang, 'related_title'))}</h2>
        <ul class="koppen-raster" role="list">
${items}
        </ul>${categorieLink}
    </div>
</section>`;
}

// De pagina van één artikel in redesign v5. Wat er statisch in staat (tekst,
// foto, bron, buren) is wat Google en een lezer zonder JavaScript zien; de
// paywall en de deelknoppen zet js/v5/artikel.js erbij (statische modus).
//
// artikel: { id, title, summary, image, image_alt, date, category, source,
// link, type, refs[{id,title,href?}], meta_description, ingekort? }. Het archief komt
// hier ook langs (backend/migreer-archief-v5.js), met wat het uit de oude
// pagina las. Daarom staan die velden ook als JSON in de pagina
// (#artikel-gegevens): zo kan elke pagina later opnieuw gemaakt worden,
// ook als het artikel allang niet meer in de nieuws-JSON staat.
function paginaHtml(artikel, lang, slugsPerTaal, manifest, burenIndex) {
    const schil = leesSchilV5();
    const header = vertaalSchil(schil.header, lang);
    const footer = vertaalSchil(schil.footer, lang);
    const rssLinks = rssLinksHtml(lang);
    const bestand = `${slugsPerTaal[lang]}-${artikel.id}.html`;
    const paginaUrl = `${SITE_URL}/articles/${lang}/${bestand}`;
    const isDigest = artikel.type === 'digest';
    // Dagoverzichten hebben server-side al een ruimere teaser (~100 woorden)
    // gekregen: niet opnieuw op 60 afkappen.
    const teaser = isDigest ? String(artikel.summary || '') : maakTeaser(artikel.summary);
    // Is er meer dan deze samenvatting? Alleen dan heeft een paywall zin
    // (zelfde regel als het oude sjabloon). Het archief geeft het mee uit de
    // oude pagina (die had dan een paywall).
    const ingekort = typeof artikel.ingekort === 'boolean'
        ? artikel.ingekort
        : teaser !== String(artikel.summary || '') || String(artikel.summary || '').trim().endsWith('...');
    const beschrijving = (artikel.meta_description || teaser).slice(0, 155);
    const afbeelding = veiligeAfbeelding(artikel.image, reserveAfbeelding(artikel));
    // og:image en JSON-LD vereisen een absolute URL; een root-relatieve
    // reservefoto zou deel-previews (WhatsApp/LinkedIn) breken.
    const afbeeldingAbsoluut = afbeelding.startsWith('/') ? SITE_URL + afbeelding : afbeelding;
    const bron = artikel.source || '';
    const bronLink = veiligeUrl(artikel.link, null);
    const isoDatum = artikel.date && !Number.isNaN(new Date(artikel.date).getTime()) ? new Date(artikel.date).toISOString() : '';
    const toonDatum = isoDatum ? datumTijd(isoDatum, lang) : '';

    const hreflangs = TALEN.filter(l => slugsPerTaal[l])
        .map(l => `    <link rel="alternate" hreflang="${l}" href="${SITE_URL}/articles/${l}/${slugsPerTaal[l]}-${artikel.id}.html">`)
        .join('\n');
    const xDefaultSlug = slugsPerTaal.en || slugsPerTaal[lang];
    const xDefaultLang = slugsPerTaal.en ? 'en' : lang;
    const altAttrs = TALEN.filter(l => slugsPerTaal[l])
        .map(l => ` data-alt-${l}="/articles/${l}/${slugsPerTaal[l]}-${artikel.id}.html"`)
        .join('');

    const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: artikel.title,
        description: beschrijving,
        image: [afbeeldingAbsoluut],
        datePublished: isoDatum,
        dateModified: isoDatum,
        inLanguage: lang,
        mainEntityOfPage: { '@type': 'WebPage', '@id': paginaUrl },
        author: { '@type': 'Organization', name: 'BrightNews' },
        publisher: {
            '@type': 'Organization',
            name: 'BrightNews',
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/brightnews-logo.png` },
        },
    }).replace(/</g, '\\u003c');

    const refs = Array.isArray(artikel.refs) ? artikel.refs.filter(r => r && r.title) : [];
    const gegevens = JSON.stringify({
        id: String(artikel.id), title: artikel.title, summary: teaser, image: artikel.image || null,
        image_alt: artikel.image_alt || null, date: isoDatum || null, category: artikel.category || null,
        source: bron || null, link: bronLink, type: isDigest ? 'digest' : null,
        refs: refs.map(r => ({ id: r.id ? String(r.id) : null, title: r.title, href: r.href || null })),
        meta_description: artikel.meta_description || null, ingekort,
    }).replace(/</g, '\\u003c');

    const alineas = teaser.split(/\n+/).map(s => s.trim()).filter(Boolean)
        .map(p => `            <p>${escapeHtml(p)}</p>`).join('\n');

    const categorie = CATEGORIE_PAGINAS.includes(artikel.category)
        ? `<span class="badge">${escapeHtml(t(lang, `filter_${artikel.category.toLowerCase()}`))}</span>` : '';

    // Foto: de echte, anders de reservefoto die processor.js koos. Laadt hij
    // niet, dan maakt js/v5/artikel.js er het merkbeeld van (zoals in v5).
    const beeld = `<img class="artikel__beeld" src="${escapeHtml(afbeelding)}" alt="${escapeHtml(artikel.image_alt || '')}" width="960" height="540" fetchpriority="high" decoding="async">`;

    // Dagoverzicht: de besproken artikelen, naar hun statische pagina als het
    // manifest die kent, anders de oude route (?id=).
    const refsHtml = refs.length ? `
        <section class="artikel__bronnen" aria-labelledby="kop-besproken">
            <h2 class="type-heading-md" id="kop-besproken">${escapeHtml(t(lang, 'digest_refs_title'))}</h2>
            <ul class="koppen-raster" role="list">
${refs.map(ref => {
        const slug = ref.id && manifest?.articles?.[ref.id]?.slugs?.[lang];
        // Een bewaarde href alleen als hij naar een eigen artikel wijst.
        const eigen = typeof ref.href === 'string' && /^\/(articles\/[a-z]{2}\/[a-z0-9-]+\.html|\?id=[A-Za-z0-9-]+)$/.test(ref.href);
        const href = slug ? `/articles/${lang}/${slug}-${ref.id}.html` : eigen ? ref.href : `/?id=${encodeURIComponent(ref.id || '')}`;
        return `                <li><article class="headline-item"><h3 class="headline-item__titel"><a class="headline-item__link" href="${escapeHtml(href)}">${escapeHtml(ref.title)}</a></h3></article></li>`;
    }).join('\n')}
            </ul>
        </section>` : '';

    const bronBlok = isDigest
        ? `        <div class="source-attribution"><p>${escapeHtml(t(lang, 'digest_notice'))}</p></div>`
        : `        <div class="source-attribution">
            <p>${escapeHtml(vul(t(lang, 'v5_bron_artikel'), { bron: bron || t(lang, 'unknown_source') }))}</p>${bronLink ? `
            <a class="btn btn--secondary btn--sm" href="${escapeHtml(bronLink)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(t(lang, 'v5_lees_origineel'))}</span><span class="visueel-verborgen"> ${escapeHtml(t(lang, 'v5_nieuw_venster'))}</span>${icoon('open_in_new')}</a>` : ''}
        </div>`;

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' https://rquuqypgaannrakdrabj.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'">
    <!-- Een grote beeldkaart in Google Discover mag (punt 51). -->
    <meta name="robots" content="max-image-preview:large">
    <title>${escapeHtml(artikel.title)} | BrightNews</title>
${schil.thema}
    <meta name="description" content="${escapeHtml(beschrijving)}">
    <link rel="canonical" href="${paginaUrl}">
${hreflangs}
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/articles/${xDefaultLang}/${xDefaultSlug}-${artikel.id}.html">
${rssLinks}
    <meta property="og:title" content="${escapeHtml(artikel.title)}">
    <meta property="og:description" content="${escapeHtml(beschrijving)}">
    <meta property="og:image" content="${escapeHtml(afbeeldingAbsoluut)}">
    <meta property="og:url" content="${paginaUrl}">
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="${isoDatum}">
    <meta name="twitter:card" content="summary_large_image">
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
    <script type="application/ld+json">${jsonLd}</script>
    <script type="application/json" id="artikel-gegevens">${gegevens}</script>
</head>
<body data-sectie="nieuws">
${header}

<main id="inhoud">
    <article class="container artikel" data-statisch-artikel data-artikel-id="${escapeHtml(String(artikel.id))}" data-artikel-taal="${lang}"${ingekort ? ' data-ingekort' : ''}${altAttrs}>
        ${beeld}
        <header class="artikel__kop">
            <p class="artikel__meta">${categorie}${toonDatum ? `<time datetime="${isoDatum}">${escapeHtml(toonDatum)}</time>` : ''}</p>
            <h1 class="artikel__titel">${escapeHtml(artikel.title)}</h1>
        </header>
        <div class="artikel__tekst">
${alineas}
        </div>${refsHtml}
        <div data-deelbalk></div>
${bronBlok}
    </article>
${burenV5(artikel, lang, burenIndex)}
</main>

${footer}
<script src="/data/translations.js" defer></script>
<script src="/js/v5/schil.js" defer></script>
<script src="/js/v5/gedeeld.js" defer></script>
<script src="/js/v5/artikel.js" defer></script>
</body>
</html>
`;
}

function main() {
    const start = Date.now();
    const manifestPad = path.join(root, 'articles/manifest.json');
    let manifest = { version: 1, articles: {} };
    if (fs.existsSync(manifestPad)) {
        manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
    }

    // Artikelen per id verzamelen over alle talen heen.
    const perId = {};
    for (const lang of TALEN) {
        const pad = path.join(root, `data/news_${lang}.json`);
        if (!fs.existsSync(pad)) continue;
        for (const artikel of JSON.parse(fs.readFileSync(pad, 'utf8'))) {
            if (!artikel.id) continue;
            (perId[artikel.id] ??= {})[lang] = artikel;
        }
    }

    // Eerste ronde: alleen het manifest bijwerken. De burenlijst moet álle
    // slugs en titels kennen vóór er ook maar één pagina geschreven wordt,
    // anders linkt de eerste pagina naar buren die nog niet in het manifest
    // staan.
    let geschreven = 0;
    let nieuw = 0;
    const teSchrijven = [];
    for (const [id, perTaal] of Object.entries(perId)) {
        // Slug per taal: bestaande manifest-slug wint (URL-stabiliteit), anders
        // deterministisch afleiden uit de titel in die taal.
        const entry = (manifest.articles[id] ??= { slugs: {}, date: null });
        entry.titles ??= {};
        const slugsPerTaal = {};
        for (const lang of TALEN) {
            if (!perTaal[lang]) continue;
            slugsPerTaal[lang] = entry.slugs[lang] || maakSlug(perTaal[lang].title);
            entry.slugs[lang] = slugsPerTaal[lang];
            entry.date = entry.date || perTaal[lang].date || null;
            // De titel onthouden: die is nodig om vanuit een ánder artikel
            // hiernaartoe te linken (zie burenHtml). De slug volstaat daar
            // niet — daar kun je geen leesbare linktekst van maken.
            entry.titles[lang] = perTaal[lang].title;
            // De categorie is taal-onafhankelijk; de eerste taal die hem
            // levert wint. Nodig voor "meer uit deze categorie" in burenHtml.
            if (!entry.category && perTaal[lang].category) entry.category = perTaal[lang].category;
        }

        teSchrijven.push([id, perTaal, slugsPerTaal]);
    }

    // Tweede ronde: schrijven, nu mét een complete burenindex.
    // De uitsluitlijst (punt 3) hoort ook hiér gehonoreerd te worden: een
    // uitgesloten artikel dat nog in de actuele nieuws-JSON staat wordt
    // 2×/dag idempotent hergenereerd, en zonder deze regel zou dat de
    // noindex van backend/verberg-uitgesloten.js er stilletjes weer
    // afhalen. Voor gearchiveerde artikelen verandert dit niets.
    let uitgesloten = new Set();
    try {
        const u = JSON.parse(fs.readFileSync(path.join(root, 'data/uitgesloten-artikelen.json'), 'utf8'));
        uitgesloten = new Set(Object.keys(u.artikelen || {}));
    } catch { /* geen lijst = niets uitgesloten */ }
    const burenIndex = bouwBurenIndex(manifest);
    for (const [id, perTaal, slugsPerTaal] of teSchrijven) {
        for (const lang of Object.keys(slugsPerTaal)) {
            const dir = path.join(root, 'articles', lang);
            fs.mkdirSync(dir, { recursive: true });
            const naam = `${slugsPerTaal[lang]}-${id}.html`;
            // Vangnet: slug en id zijn per constructie [a-z0-9-], maar die
            // garantie staat elders (maakSlug, processor.js). Als er ooit
            // iets anders doorkomt, hoort dat een luide fout te zijn — geen
            // bestandsnaam met verrassingen erin.
            if (!/^[a-z0-9][a-z0-9-]*\.html$/.test(naam)) {
                console.error(`❌ Onveilige bestandsnaam overgeslagen: ${JSON.stringify(naam)}`);
                continue;
            }
            const bestand = path.join(dir, naam);
            const bestondAl = fs.existsSync(bestand);
            let html = paginaHtml(perTaal[lang], lang, slugsPerTaal, manifest, burenIndex);
            if (uitgesloten.has(String(id))) {
                html = html.replace('</title>', '</title>\n    <meta name="robots" content="noindex, follow">');
            }
            fs.writeFileSync(bestand, html);
            geschreven++;
            if (!bestondAl) nieuw++;
        }
    }

    fs.mkdirSync(path.dirname(manifestPad), { recursive: true });
    fs.writeFileSync(manifestPad, JSON.stringify(manifest, null, 1));

    const duurMs = Date.now() - start;
    const totaalInManifest = Object.keys(manifest.articles).length;
    console.log(`Artikelpagina's: ${geschreven} geschreven (${nieuw} nieuw) in ${duurMs}ms; manifest kent ${totaalInManifest} artikelen.`);
}

// Alleen draaien als dit bestand rechtstreeks wordt aangeroepen. Zo kan de
// archiefmigratie (backend/migratie-meer-nieuws.js) burenHtml hergebruiken
// in plaats van er een tweede kopie van te onderhouden.
if (require.main === module) main();

module.exports = { bouwBurenIndex, burenHtml, BUREN_PER_KANT, paginaHtml, maakSlug, maakTeaser };
