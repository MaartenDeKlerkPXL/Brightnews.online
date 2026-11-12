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
        .slice(0, 80).replace(/-+$/, '') || 'thema';
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

// De "nr"-velden zijn indexen in de artikellijst; een model dat nr 9 geeft
// bij 5 artikelen zou verderop `artikelen[8].id` laten crashen — midden in
// de per-taal-schrijfloop, met halve pagina's zonder manifest-entry als
// gevolg. Eis daarom exact de set 1..n, zonder gaten of dubbelen.
function nrsGeldig(items, aantal) {
    if (!Array.isArray(items) || items.length !== aantal) return false;
    const nrs = new Set(items.map(i => Number(i?.nr)));
    if (nrs.size !== aantal) return false;
    for (let n = 1; n <= aantal; n++) if (!nrs.has(n)) return false;
    return true;
}

async function vertaalThema(moeder, lang) {
    for (let poging = 0; poging < 2; poging++) {
        const antwoord = await aiCall({
            rol: 'vertalen',
            prompt: `Vertaal deze BrightNews-themapagina van het Nederlands naar het ${TAAL_NAMEN[lang]}. Vertaal natuurlijk en journalistiek, als iemand die de doeltaal als moedertaal schrijft. Regels (steekproef 2026-09-10): (1) behoud het geslacht uit het origineel — kop en tekst mogen elkaar nooit tegenspreken; (2) vertaal namen van organisaties, merken, producten en instellingen NIET; (3) voeg NIETS toe en laat NIETS weg; (4) volg de titelconventie van de doeltaal — Frans en Spaans gebruiken gewone zinsstijl, geen hoofdletter op elk woord; (5) laat verwijzingen tussen blokhaken zoals [1] exact staan; (6) schrijf aanhalingstekens bínnen een tekstveld als typografische tekens („…“, ‘…’ of »…«) en nooit als kaal recht teken " — dat maakt het JSON ongeldig. "meta_d" blijft maximaal 155 tekens; het aantal items en hun "nr" blijven exact gelijk.
INVOER:
${JSON.stringify(moeder)}
Antwoord UITSLUITEND met geldig JSON in exact dezelfde vorm — regeleindes binnen een tekstveld als \\n\\n: {"titel": "..", "intro": "..", "meta_d": "..", "items": [{"nr": 1, "waarom": ".."}]}`,
        });
        const data = verwerkAIResponse(antwoord.tekst);
        if (data?.titel && data?.intro && nrsGeldig(data?.items, moeder.items.length)) {
            return data;
        }
        console.error(`🔎 Themavertaling ${lang} onbruikbaar (poging ${poging + 1}): ${String(antwoord.tekst).replace(/\s+/g, ' ').slice(0, 160)}`);
        await wacht(1000);
    }
    return null;
}

// Teksten van de site (filter_*, v5_thema_*), zoals in de andere generators.
const vm = require('vm');
const { v5Pagina } = require('./schil');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
function t(lang, key) {
    const T = sandbox.window.translations;
    return (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;
}

// De links per item, uit het artikelmanifest (statische pagina) of anders
// de v5-artikelpagina.
function itemsVoorTaal(lang, data, artikelen, artikelManifest) {
    return data.items.map(item => {
        const artikel = artikelen[item.nr - 1];
        const slug = artikelManifest.articles?.[artikel.id]?.slugs?.[lang];
        return {
            href: slug ? `/articles/${lang}/${slug}-${artikel.id}.html` : `/artikel.html?id=${encodeURIComponent(artikel.id)}`,
            titel: artikel.perTaal[lang]?.title ?? artikel.perTaal.nl.title,
            waarom: item.waarom ?? '',
        };
    });
}

// Eén themapagina in redesign v5. pagina: { titel, intro, meta_d, datum
// (YYYY-MM-DD), categorie, items: [{ href, titel, waarom }] }. Die gegevens
// staan ook als JSON in de pagina (#thema-gegevens), zodat een volgende
// sjabloonwijziging de pagina opnieuw kan maken (backend/migreer-themas-v5.js).
function paginaHtml(lang, pagina, slugsPerTaal) {
    const varianten = Object.fromEntries(TALEN.filter(l => slugsPerTaal[l]).map(l => [l, `/themas/${l}/${slugsPerTaal[l]}.html`]));
    const beschrijving = String(pagina.meta_d ?? '').slice(0, 155);
    const datum = pagina.datum
        ? new Date(`${pagina.datum}T12:00:00Z`).toLocaleDateString(LOCALES[lang], { timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'long', day: 'numeric' })
        : '';
    const label = pagina.categorie ? t(lang, `filter_${String(pagina.categorie).toLowerCase()}`) : '';
    const overline = label && !label.startsWith('filter_') ? label : 'BrightNews';
    const intro = String(pagina.intro).split(/\n+/).map(s => s.trim()).filter(Boolean)
        .map(p => `            <p>${escapeHtml(p)}</p>`).join('\n');
    const eigen = /^\/(articles\/[a-z]{2}\/[a-z0-9-]+\.html|artikel\.html\?id=[A-Za-z0-9%-]+|\?id=[A-Za-z0-9%-]+)$/;
    const items = pagina.items.map(item => {
        const href = eigen.test(item.href || '') ? item.href : '/archief.html';
        return `            <li><article class="headline-item"><h2 class="headline-item__titel"><a class="headline-item__link" href="${escapeHtml(href)}">${escapeHtml(item.titel)}</a></h2>${item.waarom ? `<p class="headline-item__tekst">${escapeHtml(item.waarom)}</p>` : ''}</article></li>`;
    }).join('\n');
    const gegevens = JSON.stringify(pagina).replace(/</g, '\\u003c');

    const main = `    <section class="info-sectie info-sectie--intro" aria-labelledby="thema-titel">
        <div class="container info-tekst">
            <p class="type-overline">${escapeHtml(overline)}</p>
            <h1 class="type-display-sm" id="thema-titel">${escapeHtml(pagina.titel)}</h1>${datum ? `
            <p class="info-tekst__datum"><time datetime="${escapeHtml(pagina.datum)}">${escapeHtml(datum)}</time></p>` : ''}
${intro}
        </div>
    </section>

    <section class="info-sectie" aria-label="${escapeHtml(pagina.titel)}">
        <div class="container info-tekst">
            <ul class="koppen-lijst" role="list">
${items}
            </ul>
        </div>
    </section>
    <script type="application/json" id="thema-gegevens">${gegevens}</script>`;

    return v5Pagina({ lang, titel: pagina.titel, beschrijving, pad: varianten[lang], varianten, ogType: 'article', main });
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
        if (data?.titel && data?.intro && nrsGeldig(data?.items, artikelen.length)) moeder = data;
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

    // Week-id in de bestandsnaam: twee weken met (bijna) dezelfde AI-titel
    // zouden anders hetzelfde pad krijgen en de oude, al geïndexeerde pagina
    // overschrijven. Het manifest bewaart de volledige naam, dus de sitemap
    // en de hreflangs volgen vanzelf; oude entries houden hun oude naam.
    const slugsPerTaal = Object.fromEntries(TALEN.map(l =>
        [l, `${maakSlug(teksten[l].titel)}-${week.toLowerCase()}`]));
    const artikelManifest = await fs.readJson(path.join(root, 'articles/manifest.json')).catch(() => ({ articles: {} }));
    for (const lang of TALEN) {
        const dir = path.join(root, 'themas', lang);
        await fs.mkdirp(dir);
        const pagina = {
            titel: teksten[lang].titel, intro: teksten[lang].intro, meta_d: teksten[lang].meta_d,
            datum: new Date().toISOString().slice(0, 10), categorie,
            items: itemsVoorTaal(lang, teksten[lang], artikelen, artikelManifest),
        };
        await fs.writeFile(path.join(dir, `${slugsPerTaal[lang]}.html`), paginaHtml(lang, pagina, slugsPerTaal));
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

if (require.main === module) {
    main().catch(err => {
        console.error('💥 Evergreen mislukt:', err);
        process.exit(1);
    });
}

module.exports = { paginaHtml };
