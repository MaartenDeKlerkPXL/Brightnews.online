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

// --- De pagina (redesign v5, sinds 2026-11-12) --------------------------
// De v5-schil en -opmaak via v5Pagina() in backend/schil.js. De kaarten zijn
// de story cards uit de stijlgids, hier al in de HTML (dat is het punt van
// deze pagina's: Google ziet de links zonder JavaScript).
const { v5Pagina } = require('./schil');

// HOUD IN SYNC met CATEGORIEEN in js/v5/gedeeld.js (de iconen).
const ICOON = { Tech: 'lightbulb', Health: 'ecg_heart', Science: 'science', Lifestyle: 'spa', Environment: 'eco', Finance: 'euro' };

function icoon(naam, klasse = '') {
    return `<svg class="icoon${klasse ? ` ${klasse}` : ''}" aria-hidden="true"><use href="/assets/iconen.svg#${naam}"/></svg>`;
}

function kaartHtml(artikel, lang, manifest) {
    const slug = manifest.articles?.[artikel.id]?.slugs?.[lang];
    // Zonder slug bestaat er (nog) geen statische pagina: dan de v5-artikelpagina.
    const href = slug
        ? `/articles/${lang}/${slug}-${artikel.id}.html`
        : `/artikel.html?id=${encodeURIComponent(artikel.id)}`;
    const beeld = /^(https:\/\/|\/)/.test(artikel.image || '')
        ? `<img class="story-card__beeld" src="${escapeHtml(artikel.image)}" alt="" loading="lazy" decoding="async">`
        : '<div class="story-card__beeld merkbeeld" aria-hidden="true"></div>';
    return `            <li><article class="story-card story-card--stacked">${beeld}<div class="story-card__tekst"><h2 class="story-card__titel"><a class="story-card__link" href="${escapeHtml(href)}">${escapeHtml(artikel.title)}</a></h2></div></article></li>`;
}

function paginaHtml(categorie, lang, artikelen, manifest) {
    const label = t(lang, `filter_${categorie.toLowerCase()}`);
    const titel = t(lang, 'cat_titel').replace('{cat}', label);
    const beschrijving = t(lang, 'cat_meta').replace('{cat}', label);
    const varianten = Object.fromEntries(TALEN.map(l => [l, `/${UITVOERMAP}/${l}/${categorieSlug(categorie, l)}.html`]));

    const kaarten = artikelen.length
        ? `        <ul class="editie-raster__rij editie-raster__rij--drie" role="list">
${artikelen.map(a => kaartHtml(a, lang, manifest)).join('\n')}
        </ul>`
        : `        <p>${escapeHtml(t(lang, 'cat_leeg'))}</p>`;

    // Onderling doorlinken: elke categoriepagina wijst naar de vijf andere.
    // Zonder die links zijn het losse eilanden die alleen via de sitemap te
    // bereiken zijn, hetzelfde probleem als de artikelpagina's hadden.
    const andere = CATEGORIEEN.filter(c => c !== categorie)
        .map(c => `            <li><a class="topic-link" href="/${UITVOERMAP}/${lang}/${categorieSlug(c, lang)}.html">${icoon(ICOON[c])}<span>${escapeHtml(t(lang, `filter_${c.toLowerCase()}`))}</span>${icoon('chevron_right', 'topic-link__chevron')}</a></li>`)
        .join('\n');

    const main = `    <section class="info-sectie info-sectie--intro" aria-labelledby="cat-titel">
        <div class="container info-tekst">
            <p class="type-overline">${escapeHtml(label)}</p>
            <h1 class="type-display-sm" id="cat-titel">${escapeHtml(titel)}</h1>
            <p class="info-tekst__lead">${escapeHtml(beschrijving)}</p>
        </div>
    </section>

    <section class="info-sectie" aria-label="${escapeHtml(titel)}">
        <div class="container">
${kaarten}
        </div>
    </section>

    <section class="info-sectie info-sectie--subtiel" aria-labelledby="cat-andere">
        <div class="container info-sectie__binnen">
            <h2 class="type-heading-lg" id="cat-andere">${escapeHtml(t(lang, 'cat_andere'))}</h2>
            <ul class="topic-links" role="list">
${andere}
            </ul>
        </div>
    </section>`;

    return v5Pagina({ lang, titel, beschrijving, pad: varianten[lang], varianten, sectie: 'themas', main });
}

function main() {
    const start = Date.now();
    const manifestPad = path.join(root, 'articles/manifest.json');
    const manifest = fs.existsSync(manifestPad)
        ? JSON.parse(fs.readFileSync(manifestPad, 'utf8'))
        : { articles: {} };

    let geschreven = 0;
    const telling = {};

    for (const lang of TALEN) {
        const pad = path.join(root, `data/news_${lang}.json`);
        if (!fs.existsSync(pad)) {
            console.warn(`⚠️  data/news_${lang}.json ontbreekt — taal overgeslagen.`);
            continue;
        }
        const alle = JSON.parse(fs.readFileSync(pad, 'utf8'));

        for (const categorie of CATEGORIEEN) {
            const artikelen = alle
                .filter(a => a.category === categorie && a.id && a.title)
                .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
                .slice(0, MAX_PER_PAGINA);

            const map = path.join(root, UITVOERMAP, lang);
            fs.mkdirSync(map, { recursive: true });
            const bestand = path.join(map, `${categorieSlug(categorie, lang)}.html`);
            fs.writeFileSync(bestand, paginaHtml(categorie, lang, artikelen, manifest));
            geschreven++;
            telling[`${lang}/${categorie}`] = artikelen.length;
        }
    }

    const leeg = Object.entries(telling).filter(([, n]) => n === 0).map(([k]) => k);
    console.log(`🗂️  ${geschreven} categoriepagina's geschreven in ${((Date.now() - start) / 1000).toFixed(1)}s.`);
    if (leeg.length) console.log(`   Zonder artikelen (nog): ${leeg.join(', ')}`);
}

if (require.main === module) main();

module.exports = { paginaHtml, categorieSlug, CATEGORIEEN };
