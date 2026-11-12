// De bestaande themapagina's (themas/{taal}/…) in het v5-sjabloon van
// backend/generate-evergreen.js (TODO 79, 2026-11-12).
//
// Een themapagina wordt één keer per week geschreven en daarna nooit meer: de
// AI-tekst staat alleen in de pagina zelf. Dit script leest hem daar terug en
// schrijft de pagina opnieuw, op hetzelfde adres. Een pagina die al v5 is,
// heeft haar gegevens als JSON (#thema-gegevens); die wordt daaruit opnieuw
// gemaakt. Zo kan het script na elke sjabloonwijziging opnieuw draaien.
//
//   node backend/migreer-themas-v5.js            alles omzetten
//   node backend/migreer-themas-v5.js --droog     alleen tellen
//
// Nooit een pagina verwijderen: lukt het lezen niet, dan blijft het bestand
// zoals het is en eindigt het script met een fout.
const fs = require('fs');
const path = require('path');
const { paginaHtml } = require('./generate-evergreen');

const root = path.join(__dirname, '..');

function ontsnap(s) {
    return String(s)
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

// Uit de oude opmaak (generate-evergreen.js vóór 2026-11-12).
function leesOud(html) {
    const titel = html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1];
    const meta = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
    const tussen = html.match(/<p class="datum">[\s\S]*?<\/p>([\s\S]*?)<ul>/)?.[1] ?? '';
    const intro = [...tussen.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => ontsnap(m[1].trim())).join('\n\n');
    const items = [...html.matchAll(/<li>\s*<a href="([^"]*)">([\s\S]*?)<\/a>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g)]
        .map(m => ({ href: ontsnap(m[1]), titel: ontsnap(m[2]), waarom: ontsnap(m[3]) }));
    if (!titel || !intro || !items.length) return null;
    return { titel: ontsnap(titel), intro, meta_d: ontsnap(meta), items };
}

function leesV5(html) {
    const json = html.match(/<script type="application\/json" id="thema-gegevens">([\s\S]*?)<\/script>/)?.[1];
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
}

// Een oude /?id=-link naar de statische pagina, als het manifest die kent.
function beterAdres(href, lang, artikelManifest) {
    let id = href.match(/^\/(?:\?id=|artikel\.html\?id=)([^&#]+)$/)?.[1];
    try { id = id && decodeURIComponent(id); } catch { return href; }
    const slug = id && artikelManifest.articles?.[id]?.slugs?.[lang];
    return slug ? `/articles/${lang}/${slug}-${id}.html` : href;
}

function main() {
    const droog = process.argv.includes('--droog');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'themas/manifest.json'), 'utf8'));
    const artikelManifest = JSON.parse(fs.readFileSync(path.join(root, 'articles/manifest.json'), 'utf8'));
    let geschreven = 0;
    const mislukt = [];

    for (const [week, entry] of Object.entries(manifest.themas || {})) {
        for (const [lang, slug] of Object.entries(entry.slugs || {})) {
            const bestand = path.join(root, 'themas', lang, `${slug}.html`);
            if (!fs.existsSync(bestand)) { mislukt.push(`${week} ${lang}: bestand ontbreekt`); continue; }
            const html = fs.readFileSync(bestand, 'utf8');
            const gelezen = leesV5(html) || leesOud(html);
            if (!gelezen) { mislukt.push(`${week} ${lang}: niet te lezen`); continue; }
            const pagina = {
                titel: gelezen.titel, intro: gelezen.intro, meta_d: gelezen.meta_d,
                datum: gelezen.datum || entry.datum || null,
                categorie: gelezen.categorie || entry.categorie || null,
                items: gelezen.items.map(i => ({ ...i, href: beterAdres(i.href, lang, artikelManifest) })),
            };
            const nieuw = paginaHtml(lang, pagina, entry.slugs);
            // Controle: wat erin ging, moet er weer uit te lezen zijn.
            const terug = leesV5(nieuw);
            if (!terug || terug.titel !== pagina.titel || terug.items.length !== pagina.items.length) {
                mislukt.push(`${week} ${lang}: controle mislukt`);
                continue;
            }
            if (!droog && nieuw !== html) fs.writeFileSync(bestand, nieuw);
            geschreven++;
        }
    }

    console.log(`🌿 ${geschreven} themapagina's ${droog ? 'gelezen (droog)' : 'in het v5-sjabloon'}.`);
    if (mislukt.length) {
        console.error(`❌ ${mislukt.length} niet omgezet (bestand ongemoeid):\n   ${mislukt.join('\n   ')}`);
        process.exit(1);
    }
}

main();
