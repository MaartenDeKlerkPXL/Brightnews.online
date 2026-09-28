// Zet 'noindex, follow' op de artikelpagina's die in
// data/uitgesloten-artikelen.json staan (punt 3 uit TODO.md).
//
// Waarom niet gewoon weggooien: de URL's staan in Google en in
// articles/manifest.json, en CLAUDE.md zegt niet voor niets dat statische
// artikelpagina's nooit verdwijnen — een 404 op een geindexeerde URL is
// schadelijker dan de pagina zelf. Met 'noindex, follow' valt hij uit de
// zoekresultaten, blijft de link werken en houden de links erop hun waarde.
//
// Het script is idempotent: twee keer draaien verandert niets.
// Gebruik: node backend/verberg-uitgesloten.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const ROBOTS_REGEL = '    <meta name="robots" content="noindex, follow">';

function lijst() {
    const p = path.join(root, 'data', 'uitgesloten-artikelen.json');
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf8')).artikelen || {};
}

function slugsPerTaal(id) {
    const p = path.join(root, 'articles', 'manifest.json');
    if (!fs.existsSync(p)) return null;
    const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
    return manifest.articles?.[id]?.slugs || null;
}

function verberg(bestand) {
    let html = fs.readFileSync(bestand, 'utf8');
    // Specifiek op 'noindex' testen, niet op een willekeurige robots-meta:
    // het artikelsjabloon krijgt (punt 51) zelf een robots-regel met
    // max-image-preview, en die mag een échte uitsluiting niet maskeren.
    // Twee robots-meta's naast elkaar zijn geldig; Google combineert ze.
    if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) return false;
    // Direct na de titel, waar de canonical ook staat — één vaste plek,
    // zodat een volgende run hem terugvindt.
    const anker = html.indexOf('</title>');
    if (anker === -1) return false;
    const na = html.indexOf('\n', anker);
    html = html.slice(0, na + 1) + ROBOTS_REGEL + '\n' + html.slice(na + 1);
    fs.writeFileSync(bestand, html);
    return true;
}

function main() {
    const uitgesloten = lijst();
    const ids = Object.keys(uitgesloten);
    if (ids.length === 0) {
        console.log('Geen uitgesloten artikelen — niets te doen.');
        return;
    }

    let aangepast = 0;
    let alGoed = 0;
    let nietGevonden = 0;

    for (const id of ids) {
        const slugs = slugsPerTaal(id);
        if (!slugs) {
            console.warn(`⚠️  ${id} staat niet in articles/manifest.json.`);
            nietGevonden++;
            continue;
        }
        for (const lang of TALEN) {
            if (!slugs[lang]) continue;
            const bestand = path.join(root, 'articles', lang, `${slugs[lang]}-${id}.html`);
            if (!fs.existsSync(bestand)) {
                nietGevonden++;
                continue;
            }
            if (verberg(bestand)) aangepast++;
            else alGoed++;
        }
    }

    console.log(`🙈 Uitgesloten artikelen: ${ids.length}`);
    console.log(`   ${aangepast} pagina's op noindex gezet, ${alGoed} stonden er al op.`);
    if (nietGevonden) console.log(`   ${nietGevonden} pagina's niet gevonden (overgeslagen).`);
    console.log('   Draai hierna backend/generate-sitemap.js.');
}

main();
