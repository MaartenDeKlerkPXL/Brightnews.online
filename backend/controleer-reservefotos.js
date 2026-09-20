#!/usr/bin/env node
/**
 * Telt of er nog genoeg reservefoto's zijn voor de homepage.
 *
 * Waarom dit bestaat: een artikel zonder eigen foto, of met een foto die al
 * bij een ander artikel staat, krijgt een reservefoto uit assets/fallback/.
 * Die komt bij voorkeur uit zijn eigen categorie. Zijn er in een categorie
 * meer artikelen die een reservefoto nodig hebben dan er foto's zijn, dan
 * leent de site er een uit een andere categorie — een wetenschapsartikel met
 * een gezondheidsfoto erboven. En is werkelijk alles op, dan komt dezelfde
 * foto twee keer op de pagina.
 *
 * Dat gebeurt geleidelijk: op 2026-09-10 waren er 14 reservefoto's nodig, op
 * 20 september 25 à 27, omdat bronnen steeds vaker dezelfde foto meesturen.
 * Zonder meting merk je het pas als het al zichtbaar is. Dit script draait
 * elke nacht mee in de beoordeling (zie nachtelijke-beoordeling-prompt.md).
 *
 * Dit script wijzigt niets en faalt nooit op een tekort — het rapporteert
 * alleen. Bewust: een tekort is geen storing, het is een voorraad die
 * aangevuld moet worden, en dat kan alleen een mens.
 *
 * Draaien:  node backend/controleer-reservefotos.js
 *           node backend/controleer-reservefotos.js --json
 */

const fs = require('fs');
const path = require('path');

const WORTEL = path.join(__dirname, '..');
const FALLBACK_MAP = path.join(WORTEL, 'assets', 'fallback');
const NIEUWS = path.join(WORTEL, 'data', 'news_nl.json');
const INDEX_JS = path.join(WORTEL, 'index.js');

// Vanaf hoeveel geleende foto's in één categorie is het de moeite van het
// melden waard. Onder deze grens valt het niemand op.
const MELDGRENS = 2;

/**
 * Dezelfde sleutel als index.js gebruikt om twee keer dezelfde foto te
 * herkennen: voor Unsplash-URL's de photo-id (dezelfde foto komt binnen met
 * wisselende query-parameters), voor de rest de URL zelf.
 */
function fotoSleutel(url) {
    const m = String(url).match(/photo-[0-9a-zA-Z-]+/);
    return m ? m[0] : String(url);
}

/**
 * Leest RESERVE_PER_CATEGORIE uit index.js in plaats van het hier te
 * herhalen. Dat getal is leidend voor de site: staat een foto wel in de map
 * maar niet in dit getal, dan gebruikt de site hem niet.
 */
function leesAantallenUitIndexJs() {
    const bron = fs.readFileSync(INDEX_JS, 'utf8');
    const blok = bron.match(/const RESERVE_PER_CATEGORIE = \{([^}]*)\}/);
    if (!blok) throw new Error('RESERVE_PER_CATEGORIE niet gevonden in index.js');
    const uit = {};
    for (const m of blok[1].matchAll(/'([^']+)'\s*:\s*(\d+)/g)) uit[m[1]] = Number(m[2]);
    return uit;
}

/** Telt de bestanden die er werkelijk staan, per categorie. */
function telBestandenOpSchijf() {
    const uit = {};
    for (const naam of fs.readdirSync(FALLBACK_MAP)) {
        const m = naam.match(/^([a-z]+)-(\d+)\.jpg$/i);
        if (!m) continue;
        const cat = m[1].toLowerCase();
        uit[cat] = (uit[cat] || 0) + 1;
    }
    return uit;
}

/**
 * Loopt de homepagelijst af zoals tekenPortie() dat doet en telt per
 * categorie hoeveel artikelen een reservefoto nodig hebben. Een artikel heeft
 * er een nodig als het geen eigen foto heeft, of als die foto al eerder in de
 * lijst voorkwam.
 */
function telBehoefte(artikelen) {
    const gezien = new Set();
    const nodig = {};
    for (const artikel of artikelen) {
        const url = artikel && artikel.image;
        const sleutel = url ? fotoSleutel(url) : null;
        if (!sleutel || gezien.has(sleutel)) {
            const cat = (artikel && artikel.category) || 'onbekend';
            nodig[cat] = (nodig[cat] || 0) + 1;
            continue;
        }
        gezien.add(sleutel);
    }
    return nodig;
}

function meet() {
    const ruw = JSON.parse(fs.readFileSync(NIEUWS, 'utf8'));
    const artikelen = Array.isArray(ruw) ? ruw : (ruw.articles || []);
    const beschikbaar = leesAantallenUitIndexJs();
    const opSchijf = telBestandenOpSchijf();
    const nodig = telBehoefte(artikelen);

    const categorieen = [...new Set([...Object.keys(beschikbaar), ...Object.keys(nodig)])].sort();
    const regels = categorieen.map((cat) => {
        const heeft = beschikbaar[cat] || 0;
        const wil = nodig[cat] || 0;
        return {
            categorie: cat,
            beschikbaar: heeft,
            opSchijf: opSchijf[cat.toLowerCase()] || 0,
            nodig: wil,
            tekort: Math.max(0, wil - heeft)
        };
    });

    const totaalNodig = regels.reduce((a, r) => a + r.nodig, 0);
    const totaalBeschikbaar = regels.reduce((a, r) => a + r.beschikbaar, 0);
    return {
        gemeten: new Date().toISOString(),
        artikelen: artikelen.length,
        totaalNodig,
        totaalBeschikbaar,
        // Foto's die uit een andere categorie geleend moeten worden.
        geleend: regels.reduce((a, r) => a + r.tekort, 0),
        // Pas als het totaal niet meer past komt dezelfde foto twee keer op
        // de pagina. Dat is het punt waarop een bezoeker het echt ziet.
        dubbel: Math.max(0, totaalNodig - totaalBeschikbaar),
        regels
    };
}

function rapporteer(m) {
    const lijnen = [];
    lijnen.push(`Reservefoto's op ${m.gemeten.slice(0, 10)} — ${m.artikelen} artikelen op de homepage`);
    lijnen.push('');
    lijnen.push('| Categorie | Beschikbaar | Nodig | Tekort |');
    lijnen.push('|---|---|---|---|');
    for (const r of m.regels) {
        lijnen.push(`| ${r.categorie} | ${r.beschikbaar} | ${r.nodig} | ${r.tekort || '—'} |`);
    }
    lijnen.push('');
    lijnen.push(`Totaal: ${m.totaalNodig} nodig, ${m.totaalBeschikbaar} beschikbaar.`);

    if (m.dubbel > 0) {
        lijnen.push(`**${m.dubbel} foto('s) komen twee keer op de pagina** — de voorraad is op.`);
    }
    const knel = m.regels.filter((r) => r.tekort >= MELDGRENS);
    if (knel.length) {
        const namen = knel.map((r) => `${r.categorie} (${r.tekort})`).join(', ');
        lijnen.push(`Geleend uit een andere categorie: ${m.geleend} foto's. Knelt bij ${namen}.`);
        lijnen.push(`Aanvullen in \`assets/fallback/\` als \`<categorie>-<nummer>.jpg\`, en daarna het getal in \`RESERVE_PER_CATEGORIE\` in \`index.js\` mee ophogen.`);
    } else if (m.geleend === 0) {
        lijnen.push('Elke categorie heeft genoeg eigen foto\'s. Niets te doen.');
    } else {
        lijnen.push(`Geleend uit een andere categorie: ${m.geleend} foto's. Dat valt nog niet op.`);
    }

    // Bestanden die op schijf staan maar niet meegeteld worden door index.js:
    // stille verspilling, en precies de fout die gemaakt wordt als iemand wel
    // foto's aanlevert maar het getal vergeet.
    for (const r of m.regels) {
        if (r.opSchijf > r.beschikbaar) {
            lijnen.push(`Let op: ${r.categorie} heeft ${r.opSchijf} bestanden in de map maar RESERVE_PER_CATEGORIE staat op ${r.beschikbaar}. De site gebruikt er ${r.beschikbaar}.`);
        }
        if (r.opSchijf < r.beschikbaar) {
            lijnen.push(`Let op: ${r.categorie} verwacht ${r.beschikbaar} bestanden maar er staan er ${r.opSchijf} in de map. De site vraagt een bestand op dat er niet is.`);
        }
    }
    return lijnen.join('\n');
}

const meting = meet();
if (process.argv.includes('--json')) {
    console.log(JSON.stringify(meting, null, 2));
} else {
    console.log(rapporteer(meting));
}
