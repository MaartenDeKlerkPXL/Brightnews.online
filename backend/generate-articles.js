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
const { schilVoorTaal } = require('./schil');

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

function burenHtml(artikel, lang, burenIndex) {
    if (!burenIndex) return '';
    const { rijen, positie } = burenIndex;
    const i = positie.get(String(artikel.id));
    if (i === undefined) return '';

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

    const kandidaten = gekozen;
    if (!kandidaten.length) return '';

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

function paginaHtml(artikel, lang, slugsPerTaal, manifest, burenIndex) {
    // Header en footer uit partials/, al vertaald naar deze taal. Zelfde bron
    // als de vaste pagina's en de categoriepagina's (backend/schil.js).
    const schil = schilVoorTaal(lang);
    const rssLinks = rssLinksHtml(lang);
    const bestand = `${slugsPerTaal[lang]}-${artikel.id}.html`;
    const paginaUrl = `${SITE_URL}/articles/${lang}/${bestand}`;
    // Dagoverzichten (type 'digest') hebben server-side al een ruimere
    // teaser (~100 woorden) gekregen: niet opnieuw op 60 afkappen.
    const teaser = artikel.type === 'digest'
        ? String(artikel.summary || '')
        : maakTeaser(artikel.summary);
    const isIngekort = teaser !== String(artikel.summary || '') || String(artikel.summary || '').trim().endsWith('...');
    const beschrijving = (artikel.meta_description || teaser).slice(0, 155);
    const afbeelding = veiligeAfbeelding(artikel.image, reserveAfbeelding(artikel));
    // og:image en JSON-LD vereisen een absolute URL; een root-relatieve
    // reservefoto zou deel-previews (WhatsApp/LinkedIn) breken. De <img> op
    // de pagina zelf mag wél relatief blijven.
    const afbeeldingAbsoluut = afbeelding.startsWith('/') ? SITE_URL + afbeelding : afbeelding;
    const bron = artikel.source || t(lang, 'unknown_source');
    const bronLink = veiligeUrl(artikel.link, null);
    const isoDatum = artikel.date ? new Date(artikel.date).toISOString() : '';
    const toonDatum = artikel.date
        ? new Date(artikel.date).toLocaleDateString(LOCALES[lang], { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

    const hreflangs = TALEN.filter(l => slugsPerTaal[l])
        .map(l => `    <link rel="alternate" hreflang="${l}" href="${SITE_URL}/articles/${l}/${slugsPerTaal[l]}-${artikel.id}.html">`)
        .join('\n');
    const xDefaultSlug = slugsPerTaal.en || slugsPerTaal[lang];
    const xDefaultLang = slugsPerTaal.en ? 'en' : lang;
    const altAttrs = TALEN.filter(l => slugsPerTaal[l])
        .map(l => `data-alt-${l}="/articles/${l}/${slugsPerTaal[l]}-${artikel.id}.html"`)
        .join(' ');

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

    const alineas = teaser.split(/\n+/).map(s => s.trim()).filter(Boolean)
        .map(p => `                <p>${escapeHtml(p)}</p>`).join('\n') || `                <p>${escapeHtml(teaser)}</p>`;

    const paywall = isIngekort ? `
            <div class="paywall-overlay"><div class="paywall-content">
                <h2 data-i18n="premium_title">${escapeHtml(t(lang, 'premium_title'))}</h2>
                <p data-i18n="premium_text">${escapeHtml(t(lang, 'premium_text'))}</p>
                <button onclick="window.location.href='/profiel.html'" class="btn-primary-editorial" data-i18n="btn_login_to_read">${escapeHtml(t(lang, 'btn_login_to_read'))}</button>
            </div></div>` : '';

    // Dagoverzicht: klikbare lijst van de besproken artikelen — naar hun
    // statische pagina als het manifest die kent, anders de SPA-route (?id=).
    const refsHtml = Array.isArray(artikel.refs) && artikel.refs.length ? `
            <div class="digest-refs">
                <h2 data-i18n="digest_refs_title">${escapeHtml(t(lang, 'digest_refs_title'))}</h2>
                <ol>
${artikel.refs.map(ref => {
        const slug = manifest?.articles?.[ref.id]?.slugs?.[lang];
        const href = slug ? `/articles/${lang}/${slug}-${ref.id}.html` : `/?id=${encodeURIComponent(ref.id)}`;
        return `                    <li><a href="${escapeHtml(href)}">${escapeHtml(ref.title)}</a></li>`;
    }).join('\n')}
                </ol>
            </div>` : '';

    const disclaimerTekst = artikel.type === 'digest'
        ? String(t(lang, 'digest_notice'))
        : String(t(lang, 'ai_summary_notice')).replace('{source}', bron);
    const disclaimerLink = bronLink
        ? ` <a href="${escapeHtml(bronLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(`${t(lang, 'read_original')} ${bron}`.trim())}</a>`
        : '';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <!-- Google tag (gtag.js) — laadt pas na cookietoestemming, zie acceptCookies()/checkCookies() in index.js -->
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied'
        });
    </script>
    <link rel="icon" type="image/png" href="/assets/brightnews-logo-faviconv5.png">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Zonder deze regel mag Google alleen een miniatuur tonen, en een
         Discover-kaart is juist een grote beeldkaart (punt 51). Bewust
         alleen vooruit: het archief wordt niet opnieuw gegenereerd,
         want Discover toont vrijwel alleen vers nieuws. -->
    <meta name="robots" content="max-image-preview:large">
${rssLinks}
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://rquuqypgaannrakdrabj.supabase.co https://*.google-analytics.com https://www.googletagmanager.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'">
    <meta name="description" content="${escapeHtml(beschrijving)}">
    <title>${escapeHtml(artikel.title)} | BrightNews</title>
    <link rel="canonical" href="${paginaUrl}">
${hreflangs}
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/articles/${xDefaultLang}/${xDefaultSlug}-${artikel.id}.html">
    <meta property="og:title" content="${escapeHtml(artikel.title)}">
    <meta property="og:description" content="${escapeHtml(beschrijving)}">
    <meta property="og:image" content="${escapeHtml(afbeeldingAbsoluut)}">
    <meta property="og:url" content="${paginaUrl}">
    <meta property="og:type" content="article">
    <meta property="article:published_time" content="${isoDatum}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/pages/artikel.css">
    <link rel="stylesheet" href="/css/pages/categorie.css">
    <meta name="theme-color" content="var(--bright-green)">
    <script src="/js/vendor/supabase-js-2.112.4.js" defer></script>
    <script src="/js/supabase-init.js" defer></script>
    <script src="/js/betaal-config.js" defer></script>
    <script src="/js/auth.js" defer></script>
    <script src="/data/translations.js" defer></script>
    <script src="/js/main.js" defer></script>
    <script src="/index.js" defer></script>
    <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<a href="#main-content" class="skip-link" data-i18n="skip_to_content">${escapeHtml(t(lang, 'skip_to_content'))}</a>
${schil.header}
<main class="container" id="main-content" tabindex="-1">
    <div style="padding-top: 20px;">
        <div class="top-nav-alignment" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <a href="/index.html" class="back-btn-pill">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span data-i18n="back">${escapeHtml(t(lang, 'back'))}</span>
            </a>
        </div>
    </div>

    <div class="detail-container" data-static-article data-article-id="${escapeHtml(String(artikel.id))}" data-article-lang="${lang}" ${altAttrs}>
    <div class="detail-hero">
        <img class="detail-img" src="${escapeHtml(afbeelding)}" alt="${escapeHtml(artikel.image_alt || artikel.title)}" width="800" height="450" fetchpriority="high" decoding="async" onerror="this.onerror=null;this.src='${reserveAfbeelding(artikel)}';">
    </div>
    <div class="article-container" style="max-width: 800px; margin: 0 auto; padding: 20px;" itemscope itemtype="https://schema.org/NewsArticle">
        <header class="detail-header">
            <h1 itemprop="headline" style="margin-bottom: 10px;">${escapeHtml(artikel.title)}</h1>
${toonDatum ? `            <p class="artikel-datum">
                <time itemprop="datePublished" datetime="${isoDatum}">${escapeHtml(toonDatum)}</time>
            </p>` : ''}
        </header>

        <section class="article-body" itemprop="articleBody">
            <div data-role="body">
${alineas}${refsHtml}
            </div>${paywall}
    <div class="share-section">
        <p class="share-title" data-i18n="share_article">${escapeHtml(t(lang, 'share_article'))}</p>
        <div class="share-wrapper">
            <button onclick="toggleShareMenu(event)" class="share-main-btn" id="mainShareBtn">
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> <span id="share-btn-text" data-i18n="share_label">${escapeHtml(t(lang, 'share_label'))}</span>
            </button>
            <div id="shareMenu" class="share-dropdown">
                <a href="#" id="share-wa" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></a>
                <a href="#" id="share-fb" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg></a>
                <a href="#" id="share-x" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg></a>
                <a href="#" id="share-li" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
                <a href="#" id="share-mail"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>
                <button onclick="copyLink(event)"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
            </div>
        </div>
    </div>
<p class="ai-disclaimer" style="text-align: center; font-style: italic; color: var(--neutral-500); margin-top: 30px; font-size: 0.85em;">${escapeHtml(disclaimerTekst)}${disclaimerLink}</p>
        </section>
    </div>
    </div>
${burenHtml(artikel, lang, burenIndex)}</main>

${schil.footer}
<script>
    function toggleMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        if (menu) menu.classList.toggle('active');
    }
</script>
</body>
</html>`;
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

module.exports = { bouwBurenIndex, burenHtml, BUREN_PER_KANT };
