// Eenmalige migratie van het artikelarchief (TODO-punten 16 en 36).
//
// generate-articles.js schrijft alleen de artikelen die nog in
// data/news_*.json staan — dat zijn er 150 per taal. De rest van het archief
// blijft bewust bestaan (geïndexeerde URL's mogen niet sterven) maar loopt
// daardoor achter op het sjabloon, en zou het nieuwe "meer goed nieuws"-blok
// nooit krijgen. De brondata van die oudere artikelen is er niet meer, dus
// opnieuw genereren kan niet; deze migratie past daarom twee dingen aan in de
// bestaande HTML.
//
// 1. Punt 36 — het blok met links naar de datumburen invoegen vóór </main>.
//    De HTML daarvan komt uit burenHtml() in generate-articles.js zelf, zodat
//    archief en sjabloon niet uit elkaar kunnen lopen.
// 2. Punt 16 — de oude taalkiezer vervangen door de huidige. Dat scheelt
//    precies één regel; zonder JavaScript zag je anders nog de oude balk.
//
// Idempotent: een pagina die het blok of de nieuwe kiezer al heeft, wordt
// overgeslagen. Draaien met --dry-run om alleen te tellen.

const fs = require('fs');
const path = require('path');
const { bouwBurenIndex, burenHtml } = require('./generate-articles');

const root = path.join(__dirname, '..');
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];

// Er blijken drie generaties te bestaan, precies zoals punt 16 vermoedde.
// Geteld over alle 3.045 pagina's: 930 met een kale vlag-emoji zonder span,
// 1.225 met de vlag in een span maar zonder taal-naam/taal-code, en 890 die
// al goed staan. De twee oude varianten gaan allebei naar de huidige.
const NIEUWE_KIEZER = '<span class="taal-vlag">🇺🇸</span><span class="taal-naam">English</span>'
    + '<span class="taal-code" aria-hidden="true">EN</span> <span class="arrow">▼</span>';

const OUDE_KIEZERS = [
    '<span class="taal-vlag">🇺🇸</span> English <span class="arrow">▼</span>',
    '🇺🇸 English <span class="arrow">▼</span>',
];

function main() {
    const dryRun = process.argv.includes('--dry-run');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'articles/manifest.json'), 'utf8'));
    const burenIndex = bouwBurenIndex(manifest);

    const telling = { bekeken: 0, blokToegevoegd: 0, kiezerBijgewerkt: 0, geschreven: 0, overgeslagen: 0, geenAnker: [] };

    for (const [id, entry] of Object.entries(manifest.articles || {})) {
        for (const lang of TALEN) {
            const slug = entry.slugs?.[lang];
            if (!slug) continue;
            const bestand = path.join(root, 'articles', lang, `${slug}-${id}.html`);
            if (!fs.existsSync(bestand)) continue;

            telling.bekeken++;
            let html = fs.readFileSync(bestand, 'utf8');
            const origineel = html;

            if (!html.includes('class="meer-nieuws"')) {
                const blok = burenHtml({ id }, lang, burenIndex);
                if (blok) {
                    if (!html.includes('</main>')) {
                        telling.geenAnker.push(bestand);
                    } else {
                        html = html.replace('</main>', `${blok}</main>`);
                        telling.blokToegevoegd++;
                    }
                }
            }

            // Op volgorde: de langste variant eerst, anders zou de kale
            // emoji-versie ook binnen de span-versie matchen.
            for (const oudeKiezer of OUDE_KIEZERS) {
                if (html.includes(oudeKiezer)) {
                    html = html.replace(oudeKiezer, NIEUWE_KIEZER);
                    telling.kiezerBijgewerkt++;
                    break;
                }
            }

            if (html === origineel) {
                telling.overgeslagen++;
                continue;
            }
            if (!dryRun) fs.writeFileSync(bestand, html);
            telling.geschreven++;
        }
    }

    console.log(`${dryRun ? '[proefdraai] ' : ''}bekeken: ${telling.bekeken}`);
    console.log(`  blok toegevoegd:    ${telling.blokToegevoegd}`);
    console.log(`  taalkiezer bijgewerkt: ${telling.kiezerBijgewerkt}`);
    console.log(`  geschreven:         ${telling.geschreven}`);
    console.log(`  al in orde:         ${telling.overgeslagen}`);
    if (telling.geenAnker.length) {
        console.log(`  ⚠️  geen </main> gevonden in ${telling.geenAnker.length} bestand(en), overgeslagen:`);
        telling.geenAnker.slice(0, 5).forEach(f => console.log(`     ${f}`));
    }
}

main();
