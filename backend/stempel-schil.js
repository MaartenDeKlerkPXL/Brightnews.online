// Zet de header en footer uit partials/ in alle vaste pagina's in de root.
//
// Gebruik: node backend/stempel-schil.js
//          node backend/stempel-schil.js --controle   (verandert niets; faalt
//                                                      als een pagina achterloopt)
//
// Werkt met markeringen in de HTML:
//     <!-- schil:header --> ... <!-- /schil:header -->
//     <!-- schil:footer --> ... <!-- /schil:footer -->
// Alles tussen een markeringspaar wordt bij elke run vervangen. Bewerk de
// header en footer dus nooit in een pagina zelf, maar in partials/.
//
// Heeft een pagina nog geen markeringen, dan zoekt het script de eerste
// <header> met de navigatie en de <footer class="main-footer">, en zet daar de
// markeringen omheen. Dat gebeurt één keer; daarna gaat het via de
// markeringen. Twee keer draaien verandert niets.

const fs = require('fs');
const path = require('path');
const { leesSchil } = require('./schil');

const root = path.join(__dirname, '..');
const CONTROLE = process.argv.includes('--controle');

// Pagina's zonder navigatie: de parkeerpagina en de interne cockpit.
const OVERSLAAN = new Set(['binnenkort.html', 'marketing.html']);

function blok(naam, inhoud) {
    return `<!-- schil:${naam} -->\n${inhoud}\n<!-- /schil:${naam} -->`;
}

function vervangBlok(html, naam, inhoud, zoekStart, zoekEind) {
    const open = `<!-- schil:${naam} -->`;
    const sluit = `<!-- /schil:${naam} -->`;
    const a = html.indexOf(open);
    if (a >= 0) {
        const b = html.indexOf(sluit, a);
        if (b < 0) throw new Error(`open markering zonder sluiting voor ${naam}`);
        return html.slice(0, a) + blok(naam, inhoud) + html.slice(b + sluit.length);
    }
    // Eerste keer: het oude blok opzoeken. zoekStart mag een reguliere
    // expressie zijn, zodat verschillen in inspringing niet uitmaken.
    const s = zoekStart instanceof RegExp ? html.search(zoekStart) : html.indexOf(zoekStart);
    if (s < 0) return null;
    const e = html.indexOf(zoekEind, s);
    if (e < 0) throw new Error(`geen ${zoekEind} na ${zoekStart}`);
    return html.slice(0, s) + blok(naam, inhoud) + html.slice(e + zoekEind.length);
}

function main() {
    const { header, footer } = leesSchil();
    const paginas = fs.readdirSync(root).filter(f => f.endsWith('.html') && !OVERSLAAN.has(f)).sort();

    let gewijzigd = 0;
    const achter = [];
    const zonder = [];

    for (const naam of paginas) {
        const pad = path.join(root, naam);
        const oud = fs.readFileSync(pad, 'utf8');

        // <header> met de navigatie: de eerste <header> die direct een
        // <nav class="container"> bevat. In index.html staat daarvóór het
        // parkeerbericht; dat heeft geen <header>, wel een eigen <footer>,
        // dus de footer zoeken we op zijn class.
        const nieuw = vervangBlok(oud, 'header', header, /<header>\s*<nav class="container">/, '</header>');
        if (nieuw === null) { zonder.push(naam); continue; }
        const metFooter = vervangBlok(nieuw, 'footer', footer, '<footer class="main-footer">', '</footer>');
        if (metFooter === null) { zonder.push(naam); continue; }

        if (metFooter !== oud) {
            if (CONTROLE) achter.push(naam);
            else { fs.writeFileSync(pad, metFooter); gewijzigd++; }
        }
    }

    if (zonder.length) console.log(`⚠️  Geen header of footer gevonden in: ${zonder.join(', ')}`);
    if (CONTROLE) {
        if (achter.length) {
            console.error(`❌ Loopt achter op partials/: ${achter.join(', ')}. Draai node backend/stempel-schil.js.`);
            process.exit(1);
        }
        console.log(`✅ Alle ${paginas.length - zonder.length} pagina's hebben de schil uit partials/.`);
        return;
    }
    console.log(`🧩 Schil bijgewerkt in ${gewijzigd} van ${paginas.length - zonder.length} pagina's.`);
}

main();
