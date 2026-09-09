// Evergreen-themapagina's (besluit Erik 2026-09-09, marketing fase M1):
// wekelijks één SEO-pagina per taal over het sterkste thema van de week —
// een geschreven intro (moeder+vertaal) plus de beste artikelen met interne
// links. Doel: long-tail zoekverkeer in vijf talen, zonder enige 1:1-tijd.
// Idempotent per ISO-week (themas/manifest.json); de Action probeert het
// elke run, dus vroeg in de week met te weinig materiaal schuift hij
// vanzelf op naar later in de week.
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();
const { aiCall, verwerkAIResponse } = require('./ai-adapter');

const SITE_URL = 'https://brightnews.online';
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const TAAL_NAMEN = { nl: 'Nederlands', en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans' };
const LOCALES = { nl: 'nl-NL', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };
const MIN_ARTIKELEN = 4;
const MAX_ARTIKELEN = 8;
const MIN_SCORE = 8;

const root = path.join(__dirname, '..');

// Zelfde slugregels als generate-articles.js (ASCII-veilig, stabiel).
function maakSlug(titel) {
    return String(titel).toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'thema';
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isoWeek(datum) {
    const d = new Date(Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate()));
    const dag = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dag);
    const jaarStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - jaarStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function wacht(ms) { return new Promise(r => setTimeout(r, ms)); }

async function vertaalThema(moeder, lang) {
    for (let poging = 0; poging < 2; poging++) {
        const antwoord = await aiCall({
            rol: 'vertalen',
            prompt: `Vertaal deze BrightNews-themapagina van het Nederlands naar het ${TAAL_NAMEN[lang]}. Vertaal natuurlijk en journalistiek; voeg niets toe, laat niets weg. "meta_d" blijft maximaal 155 tekens; het aantal items en hun "nr" blijven exact gelijk.
INVOER:
${JSON.stringify(moeder)}
Antwoord UITSLUITEND met geldig JSON in exact dezelfde vorm — regeleindes binnen een tekstveld als \\n\\n: {"titel": "..", "intro": "..", "meta_d": "..", "items": [{"nr": 1, "waarom": ".."}]}`,
        });
        const data = verwerkAIResponse(antwoord.tekst);
        if (data?.titel && data?.intro && Array.isArray(data?.items) && data.items.length === moeder.items.length) {
            return data;
        }
        console.error(`🔎 Themavertaling ${lang} onbruikbaar (poging ${poging + 1}): ${String(antwoord.tekst).replace(/\s+/g, ' ').slice(0, 160)}`);
        await wacht(1000);
    }
    return null;
}

function paginaHtml(lang, data, artikelen, slugsPerTaal, artikelManifest) {
    const slug = slugsPerTaal[lang];
    const paginaUrl = `${SITE_URL}/themas/${lang}/${slug}.html`;
    const hreflangs = TALEN
        .map(l => `    <link rel="alternate" hreflang="${l}" href="${SITE_URL}/themas/${l}/${slugsPerTaal[l]}.html">`)
        .join('\n');
    const intro = String(data.intro).split(/\n+/).map(s => s.trim()).filter(Boolean)
        .map(p => `            <p>${escapeHtml(p)}</p>`).join('\n');
    const items = data.items.map(item => {
        const artikel = artikelen[item.nr - 1];
        const entry = artikelManifest.articles?.[artikel.id];
        const href = entry?.slugs?.[lang]
            ? `/articles/${lang}/${entry.slugs[lang]}-${artikel.id}.html`
            : `/?id=${encodeURIComponent(artikel.id)}`;
        const titel = artikel.perTaal[lang]?.title ?? artikel.perTaal.nl.title;
        return `            <li>
                <a href="${href}">${escapeHtml(titel)}</a>
                <p>${escapeHtml(item.waarom ?? '')}</p>
            </li>`;
    }).join('\n');
    const datum = new Date().toLocaleDateString(LOCALES[lang], { year: 'numeric', month: 'long', day: 'numeric' });

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; object-src 'none'; base-uri 'self'; form-action 'self'">
    <meta name="description" content="${escapeHtml(String(data.meta_d ?? '').slice(0, 155))}">
    <title>${escapeHtml(data.titel)} | BrightNews</title>
    <link rel="canonical" href="${paginaUrl}">
${hreflangs}
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/themas/en/${slugsPerTaal.en}.html">
    <meta property="og:title" content="${escapeHtml(data.titel)}">
    <meta property="og:description" content="${escapeHtml(String(data.meta_d ?? '').slice(0, 155))}">
    <meta property="og:url" content="${paginaUrl}">
    <meta property="og:type" content="website">
    <link rel="icon" type="image/png" href="/assets/brightnews-logo-faviconv5.png">
    <link rel="stylesheet" href="/css/global.css">
    <link rel="stylesheet" href="/css/components.css">
    <style>
        .thema { max-width: 760px; margin: 0 auto; padding: 26px 20px 70px; }
        .thema header a img { max-width: 232px; height: auto; }
        .thema h1 { margin: 22px 0 6px; }
        .thema .datum { color: var(--medium-text); margin-bottom: 20px; }
        .thema ul { list-style: none; padding: 0; margin: 26px 0 0; display: flex; flex-direction: column; gap: 16px; }
        .thema li { background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; }
        .thema li a { font-weight: 700; color: var(--dark-text); }
        .thema li p { margin: 6px 0 0; color: var(--medium-text); font-size: .95rem; }
        .thema footer { margin-top: 40px; color: var(--medium-text); font-size: .85rem; }
    </style>
</head>
<body>
<main class="thema">
    <header><a href="/"><img src="/assets/brightnews-logo.png" width="463" height="94" alt="BrightNews"></a></header>
    <h1>${escapeHtml(data.titel)}</h1>
    <p class="datum">${escapeHtml(datum)} · BrightNews</p>
${intro}
    <ul>
${items}
    </ul>
    <footer>© BrightNews · <a href="/">brightnews.online</a></footer>
</main>
</body>
</html>
`;
}

async function main() {
    const week = isoWeek(new Date());
    const manifestPad = path.join(root, 'themas/manifest.json');
    const manifest = await fs.readJson(manifestPad).catch(() => ({ version: 1, themas: {} }));
    if (manifest.themas[week]) {
        console.log(`ℹ️ Themapagina voor ${week} bestaat al — niets te doen.`);
        return;
    }

    const perTaal = {};
    for (const lang of TALEN) {
        const lijst = await fs.readJson(path.join(root, `data/news_${lang}.json`)).catch(() => []);
        perTaal[lang] = Object.fromEntries(lijst.map(a => [a.id, a]));
    }
    const grens = Date.now() - 7 * 24 * 3600 * 1000;
    const kandidaten = Object.values(perTaal.nl).filter(a =>
        a.type !== 'digest' && (a.score ?? 0) >= MIN_SCORE && new Date(a.date).getTime() >= grens);
    const perCategorie = {};
    for (const a of kandidaten) (perCategorie[a.category || 'General'] ??= []).push(a);
    const beste = Object.entries(perCategorie).sort((x, y) => y[1].length - x[1].length)[0];
    if (!beste || beste[1].length < MIN_ARTIKELEN) {
        console.log(`ℹ️ Nog geen categorie met ≥${MIN_ARTIKELEN} topartikelen deze week — later opnieuw.`);
        return;
    }
    const [categorie, lijst] = beste;
    const artikelen = lijst
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, MAX_ARTIKELEN)
        .map(a => ({ id: a.id, perTaal: Object.fromEntries(TALEN.map(l => [l, perTaal[l][a.id]])) }));
    console.log(`🌿 Themapagina ${week}: ${categorie} met ${artikelen.length} artikelen.`);

    const materiaal = artikelen.map((a, i) =>
        `[${i + 1}] ${a.perTaal.nl.title}\n${a.perTaal.nl.summary}`).join('\n\n');
    let moeder = null;
    for (let poging = 0; poging < 2 && !moeder; poging++) {
        const antwoord = await aiCall({
            rol: 'schrijven',
            prompt: `Je bent redacteur bij BrightNews, een nieuwssite met uitsluitend positief nieuws. Schrijf in het Nederlands een themapagina over de beste ${categorie}-verhalen van deze week, op basis van de ${artikelen.length} berichten hieronder. Doel: een blijvende overzichtspagina die via zoekmachines gevonden wordt.
- "titel": aantrekkelijke, zoekbare titel (bevat het thema, niet het woord "inspirerend", geen woorden langer dan 24 letters)
- "intro": 150-250 woorden die het thema van deze week vangen, in alinea's gescheiden door een lege regel; gebruik UITSLUITEND informatie uit de berichten, verzin niets
- "items": voor elk bericht (nr 1 t/m ${artikelen.length}) één concrete zin "waarom" die nieuwsgierig maakt
- "meta_d": SEO-metabeschrijving van maximaal 155 tekens
De berichten:
${materiaal}
Antwoord UITSLUITEND met geldig JSON — regeleindes binnen een tekstveld als \\n\\n: {"titel": "..", "intro": "..", "meta_d": "..", "items": [{"nr": 1, "waarom": ".."}]}`,
        });
        const data = verwerkAIResponse(antwoord.tekst);
        if (data?.titel && data?.intro && Array.isArray(data?.items) && data.items.length === artikelen.length) moeder = data;
        else console.error(`🔎 Thema-moeder onbruikbaar (poging ${poging + 1}): ${String(antwoord.tekst).replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    if (!moeder) {
        console.error('❌ Geen bruikbare thematekst — volgende run opnieuw.');
        return;
    }

    const teksten = { nl: moeder };
    for (const lang of TALEN.filter(l => l !== 'nl')) {
        await wacht(1000);
        teksten[lang] = await vertaalThema(moeder, lang);
        if (!teksten[lang]) {
            console.error(`❌ Themavertaling ${lang} mislukt — volgende run opnieuw.`);
            return;
        }
    }

    const slugsPerTaal = Object.fromEntries(TALEN.map(l => [l, maakSlug(teksten[l].titel)]));
    const artikelManifest = await fs.readJson(path.join(root, 'articles/manifest.json')).catch(() => ({ articles: {} }));
    for (const lang of TALEN) {
        const dir = path.join(root, 'themas', lang);
        await fs.mkdirp(dir);
        await fs.writeFile(path.join(dir, `${slugsPerTaal[lang]}.html`),
            paginaHtml(lang, teksten[lang], artikelen, slugsPerTaal, artikelManifest));
    }
    manifest.themas[week] = {
        categorie,
        slugs: slugsPerTaal,
        datum: new Date().toISOString().slice(0, 10),
        ids: artikelen.map(a => a.id),
    };
    await fs.outputJson(manifestPad, manifest, { spaces: 1 });
    console.log(`✨ Themapagina's ${week} geschreven (${TALEN.length} talen): ${teksten.nl.titel}`);
}

main().catch(err => {
    console.error('💥 Evergreen mislukt:', err);
    process.exit(1);
});
