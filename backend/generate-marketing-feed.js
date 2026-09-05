// Marketing-feed (besluit Erik 2026-09-05): het datafundament voor de
// marketing-agent die Maarten straks helpt BrightNews op de socials te
// promoten. Elke run schrijft dit script per taal de beste recente artikelen
// (selectiescore ≥ 8, max 5) plus de dagoverzichten naar
// data/marketing-feed.json — de agent hoeft dan alleen dit ene bestand te
// lezen om in vijf talen posts met werkende links te maken.
// Draait ná generate-articles.js: dan kent het manifest de statische URL's.
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://brightnews.online';
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const MIN_SCORE = 8;
const MAX_PER_TAAL = 5;
const VERS_UREN = 48;

const root = path.join(__dirname, '..');

function lees(pad, fallback) {
    try {
        return JSON.parse(fs.readFileSync(path.join(root, pad), 'utf8'));
    } catch {
        return fallback;
    }
}

const manifest = lees('articles/manifest.json', { articles: {} });

function urlVoor(artikel, lang) {
    const slug = manifest.articles?.[artikel.id]?.slugs?.[lang];
    return slug
        ? `${SITE_URL}/articles/${lang}/${slug}-${artikel.id}.html`
        : `${SITE_URL}/?id=${encodeURIComponent(artikel.id)}`;
}

const grens = Date.now() - VERS_UREN * 3600 * 1000;
const perTaal = {};
for (const lang of TALEN) {
    const artikelen = lees(`data/news_${lang}.json`, []);
    const vers = artikelen.filter(a => a.id && new Date(a.date).getTime() >= grens);
    perTaal[lang] = {
        top: vers
            .filter(a => a.type !== 'digest' && (a.score ?? 0) >= MIN_SCORE)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, MAX_PER_TAAL)
            .map(a => ({
                id: a.id,
                titel: a.title,
                teaser: a.summary,
                score: a.score ?? null,
                categorie: a.category ?? null,
                url: urlVoor(a, lang),
            })),
        dagoverzichten: vers
            .filter(a => a.type === 'digest')
            .map(a => ({
                id: a.id,
                titel: a.title,
                categorie: a.category ?? null,
                dag: a.digest_date ?? null,
                url: urlVoor(a, lang),
            })),
    };
}

const feed = {
    gegenereerd: new Date().toISOString(),
    site: SITE_URL,
    toelichting: 'Input voor de marketing-agent: beste artikelen (score ≥ 8) en dagoverzichten van de afgelopen 48 uur, per taal, met kant-en-klare links.',
    perTaal,
};

fs.writeFileSync(path.join(root, 'data/marketing-feed.json'), JSON.stringify(feed, null, 1));
const totalen = TALEN.map(l => `${l}:${perTaal[l].top.length}+${perTaal[l].dagoverzichten.length}`).join(' ');
console.log(`📣 Marketing-feed geschreven (top+digests per taal: ${totalen}).`);
