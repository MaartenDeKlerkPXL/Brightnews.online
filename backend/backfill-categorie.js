// Eenmalige aanvulling van het manifest met de categorie per artikel
// (bij TODO-punt 36, 2026-09-23).
//
// De categorie stond nergens in het manifest, waardoor "meer uit deze
// categorie" niet te bouwen was en het linkblok op datum moest werken. De
// generator schrijft de categorie voortaan zelf mee; dit script haalt op wat
// er van het verleden nog te achterhalen valt, uit drie bronnen:
//
//   1. data/news_*.json           — de artikelen die nog in de actuele lijst staan.
//   2. het digest-id              — dagoverzichten heten dg-JJJJMMDD-categorie.
//   3. de reservefoto in de HTML  — een artikel zonder eigen foto kreeg er een
//                                   uit assets/fallback/<categorie>-N.jpg.
//
// Let op bij bron 3: reserveAfbeelding() in generate-articles.js valt terug op
// Lifestyle als de categorie niet in RESERVE_PER_CATEGORIE staat. Een artikel
// met een categorie buiten die zes (er bestaat bijvoorbeeld 'General') leest
// daardoor als Lifestyle. Dat is een handvol gevallen en het ergste gevolg is
// een iets minder passende suggestie — geen kapotte pagina.
//
// Wat overblijft zonder categorie houdt gewoon de datumburen.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const FALLBACK = /assets\/fallback\/([a-z]+)-\d+\.jpg/;

function hoofdletter(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function main() {
    const dryRun = process.argv.includes('--dry-run');
    const manifestPad = path.join(root, 'articles/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
    const arts = manifest.articles || {};
    const bron = { actueel: 0, digestId: 0, reservefoto: 0 };

    // 1. actuele lijsten
    for (const lang of TALEN) {
        const p = path.join(root, `data/news_${lang}.json`);
        if (!fs.existsSync(p)) continue;
        for (const a of JSON.parse(fs.readFileSync(p, 'utf8'))) {
            const id = String(a.id || '');
            if (!id || !a.category || !arts[id] || arts[id].category) continue;
            arts[id].category = a.category;
            bron.actueel++;
        }
    }

    // 2. het digest-id verraadt de categorie
    for (const [id, e] of Object.entries(arts)) {
        if (e.category) continue;
        const m = /^dg-\d+-([a-z]+)$/.exec(id);
        if (m) { e.category = hoofdletter(m[1]); bron.digestId++; }
    }

    // 3. de reservefoto in de Nederlandse pagina
    for (const [id, e] of Object.entries(arts)) {
        if (e.category) continue;
        const slug = e.slugs && e.slugs.nl;
        if (!slug) continue;
        const p = path.join(root, 'articles', 'nl', `${slug}-${id}.html`);
        if (!fs.existsSync(p)) continue;
        const m = FALLBACK.exec(fs.readFileSync(p, 'utf8'));
        if (m) { e.category = hoofdletter(m[1]); bron.reservefoto++; }
    }

    const met = Object.values(arts).filter(e => e.category).length;
    const verdeling = {};
    for (const e of Object.values(arts)) if (e.category) verdeling[e.category] = (verdeling[e.category] || 0) + 1;

    if (!dryRun) fs.writeFileSync(manifestPad, JSON.stringify(manifest, null, 1));

    console.log(`${dryRun ? '[proefdraai] ' : ''}uit de actuele lijst: ${bron.actueel} | uit het digest-id: ${bron.digestId} | uit de reservefoto: ${bron.reservefoto}`);
    console.log(`met categorie: ${met} van ${Object.keys(arts).length} (${Math.round(met / Object.keys(arts).length * 100)}%)`);
    console.log('verdeling:', verdeling);
}

main();
