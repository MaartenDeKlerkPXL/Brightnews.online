// Nachtelijke beoordeling van gepubliceerde artikelen (punt 46).
//
// Deze controle draaide van 10 t/m 18 september en viel toen stil: hij hing
// aan een handmatige planning buiten de repo, en toen die stopte merkte
// niemand het — terwijl CLAUDE.md bleef beschrijven dat hij elke nacht om
// 04:00 liep. Daarom staat hij nu als GitHub Action in de repo zelf
// (.github/workflows/nachtelijke-beoordeling.yml): dan valt hij niet
// geruisloos stil en ziet de ander het ook.
//
// De opdracht staat in backend/nachtelijke-beoordeling-prompt.md en wordt
// hieronder ingelezen, niet overgeschreven. Bewerk dat bestand om het gedrag
// te veranderen; dit script is alleen de loopjongen.
//
// Wat er anders is dan in de agent-versie van de prompt:
// - stap 1, 8 en 9 (git pullen, committen, en een wachtrij voor als git niet
//   lukt) doet de workflow. De wachtrij is daarmee overbodig: een Action die
//   niet kan pushen faalt zichtbaar in plaats van stil.
// - stap 3 en 6 zijn twee AI-calls (rol 'beoordelen'), geen agent met tools.
//
// Aanroep:  node backend/nachtelijke-beoordeling.js
// Vereist:  ANTHROPIC_API_KEY
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { aiCall } = require('./ai-adapter');

const root = path.join(__dirname, '..');
const TALEN_ROULATIE = {
    // Zoals in de prompt: Duits en Spaans twee keer per week, want die gaven
    // in de steekproef van 2026-09-10 de meeste problemen.
    0: 'es', 1: 'en', 2: 'de', 3: 'fr', 4: 'es', 5: 'en', 6: 'de',
};
const TAALNAAM = { en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans' };
const STAND_PAD = path.join(root, 'data/beoordeling-stand.json');
const TERUGVAL_UREN = 48;

function lees(bestand) {
    const p = path.join(root, bestand);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function schrijfStand(stand) {
    fs.writeFileSync(STAND_PAD, JSON.stringify(stand, null, 2) + '\n');
}

function leesStand() {
    try {
        return JSON.parse(fs.readFileSync(STAND_PAD, 'utf8'));
    } catch {
        return {};
    }
}

// Alleen het deel ónder de streep uit de prompt: daarboven staat toelichting
// die expliciet niet aan de agent gegeven mag worden.
function leesOpdracht() {
    const bron = lees('backend/nachtelijke-beoordeling-prompt.md');
    if (!bron) throw new Error('backend/nachtelijke-beoordeling-prompt.md ontbreekt.');
    const deel = bron.split('## De opdracht (dit deel meegeven aan de agent)')[1];
    if (!deel) throw new Error('Kon het opdracht-deel niet uit de prompt lezen — is de kop veranderd?');
    return deel.trim();
}

// Amsterdamse tijd, want zo staan alle eerdere blokken erin. De Action draait
// op UTC; hardcoderen van +2 zou in de winter een uur schelen.
function amsterdam(datum = new Date()) {
    const d = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Amsterdam',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(datum);
    return { datum: d.slice(0, 10), tijd: d.slice(11, 16) };
}

function weekdagAmsterdam(datum = new Date()) {
    const naam = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', weekday: 'short' }).format(datum);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(naam);
}

// Voegt toe onder een kop, of maakt die kop aan als laatste van het document.
// Nooit herschrijven of verwijderen — dat verbiedt de opdracht expliciet.
//
// Het kopniveau doet er bewust niet toe: in selectie-prompt-analyse.md staat
// "Dagelijkse beoordeling" als `#` en niet als `##`. Zoeken op de letterlijke
// tekst met twee hekjes maakte er een tweede kop van, onderaan, los van de
// negen blokken die er al stonden.
function voegToe(bestand, koptekst, blok) {
    const p = path.join(root, bestand);
    let s = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# ${path.basename(bestand)}\n`;
    const bestaat = new RegExp(`^#{1,6}\\s+${koptekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'mi').test(s);
    if (!bestaat) s = s.replace(/\s*$/, '\n\n') + `## ${koptekst}\n`;
    fs.writeFileSync(p, s.replace(/\s*$/, '\n\n') + blok.trim() + '\n');
}

async function beoordeelArtikelen(nieuwe, volledig, opdracht) {
    const criteria = lees('backend/selectie-prompt.md') || '(selectie-prompt.md ontbreekt)';
    const { datum, tijd } = amsterdam();
    const materiaal = nieuwe.map(a => [
        `- id: ${a.id}`,
        `  titel: ${a.title}`,
        `  gepubliceerd: ${a.date}`,
        `  categorie: ${a.category}`,
        `  bron: ${a.source}`,
        `  samenvatting: ${String(a.summary || '').slice(0, 700)}`,
    ].join('\n')).join('\n\n');

    const prompt = `${opdracht}

---

BELANGRIJK — zo draai jíj vannacht:

Je hebt geen git en geen bestandssysteem. Stap 1, 2, 6, 7, 8 en 9 uit de
opdracht hierboven zijn al voor je gedaan of komen later; jij doet **alleen
stap 3, 4 en 5**: beoordelen, opschrijven, patronen signaleren.

Antwoord met **uitsluitend het markdown-blok** uit stap 4 — begin met de
"### "-kop en schrijf er geen inleiding of afsluiting omheen.

Gebruik als kop: \`### ${datum}, ${tijd} Europe/Amsterdam\`
${volledig ? 'Dit is de wekelijkse volledige controle; vermeld dat in de kopregel.' : ''}

De maatstaf uit backend/selectie-prompt.md, waar de opdracht naar verwijst:

<selectieprompt>
${criteria}
</selectieprompt>

De artikelen die je vannacht beoordeelt (${nieuwe.length} stuks):

<artikelen>
${materiaal}
</artikelen>`;

    const antwoord = await aiCall({ rol: 'beoordelen', prompt });
    return String(antwoord.tekst || '').trim();
}

async function beoordeelVertaling(artikelNl, artikelVertaald, taal, opdracht) {
    const { datum } = amsterdam();
    const prompt = `${opdracht}

---

BELANGRIJK — zo draai jíj vannacht:

Je doet **alleen stap 6**: één vertaald artikel nakijken. De taal en het
artikel zijn al voor je gekozen. Je hebt geen git en geen bestandssysteem.

Antwoord met **uitsluitend het markdown-blok** uit stap 6 — begin met de
"### "-kop, geen inleiding of afsluiting.

Gebruik als kop: \`### ${datum}, ${TAALNAAM[taal]}\`

<nederlands>
titel: ${artikelNl.title}
samenvatting: ${artikelNl.summary || ''}
</nederlands>

<vertaling taal="${TAALNAAM[taal]}">
titel: ${artikelVertaald.title}
samenvatting: ${artikelVertaald.summary || ''}
</vertaling>`;

    const antwoord = await aiCall({ rol: 'beoordelen', prompt });
    return String(antwoord.tekst || '').trim();
}

// Stap 7. Het script faalt nooit en wijzigt niets; we schrijven alleen weg
// als er écht iets te melden valt én het beeld veranderd is sinds de vorige
// melding. Dit is een rookmelder, geen dagboek.
function reservefotos(stand) {
    let uitvoer;
    try {
        uitvoer = execFileSync('node', [path.join(__dirname, 'controleer-reservefotos.js')], { encoding: 'utf8' });
    } catch (err) {
        console.warn(`⚠️  controleer-reservefotos.js liep vast: ${err.message}`);
        return null;
    }
    const tabel = uitvoer.slice(uitvoer.indexOf('| Categorie')).trim();
    const zorgelijk = /Let op|twee keer|tekort/i.test(uitvoer) && !/Niets te doen/.test(uitvoer);
    if (!zorgelijk) return { tabel, blok: null };
    if (stand.reservefotosTabel === tabel) return { tabel, blok: null };
    const { datum } = amsterdam();
    return { tabel, blok: `### ${datum}\n\n${uitvoer.trim()}` };
}

async function main() {
    const opdracht = leesOpdracht();
    const stand = leesStand();
    const nu = new Date();
    const volledig = weekdagAmsterdam(nu) === 1; // maandag: hele feed

    const alle = JSON.parse(fs.readFileSync(path.join(root, 'data/news_nl.json'), 'utf8'))
        .filter(a => a.id && a.title && a.type !== 'digest');

    const grens = stand.laatsteArtikelDatum
        || new Date(nu.getTime() - TERUGVAL_UREN * 3600 * 1000).toISOString();
    const nieuwe = (volledig ? alle : alle.filter(a => String(a.date || '') > grens))
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

    if (!nieuwe.length) {
        const { datum, tijd } = amsterdam(nu);
        voegToe('backend/selectie-prompt-analyse.md', 'Dagelijkse beoordeling',
            `### ${datum}, ${tijd} Europe/Amsterdam\n\nNiets nieuws sinds de vorige beoordeling — geen artikelen om te wegen.`);
        schrijfStand({ ...stand, laatsteRun: nu.toISOString() });
        console.log('ℹ️  Geen nieuwe artikelen; regel weggeschreven en gestopt.');
        return;
    }

    console.log(`🌙 ${nieuwe.length} artikelen te beoordelen${volledig ? ' (maandag: volledige controle)' : ''}.`);
    const blok = await beoordeelArtikelen(nieuwe, volledig, opdracht);
    if (!blok.startsWith('###')) throw new Error(`Onverwacht antwoord (begint niet met ###): ${blok.slice(0, 120)}`);
    voegToe('backend/selectie-prompt-analyse.md', 'Dagelijkse beoordeling', blok);

    // Stap 6: één vertaald artikel, taal rouleert op de dag van de week.
    const taal = TALEN_ROULATIE[weekdagAmsterdam(nu)];
    try {
        const vertaald = JSON.parse(fs.readFileSync(path.join(root, `data/news_${taal}.json`), 'utf8'));
        const perId = new Map(vertaald.map(a => [String(a.id), a]));
        const kandidaat = nieuwe.find(a => perId.has(String(a.id)));
        if (kandidaat) {
            const vertaalBlok = await beoordeelVertaling(kandidaat, perId.get(String(kandidaat.id)), taal, opdracht);
            if (vertaalBlok.startsWith('###')) {
                voegToe('backend/vertaal-steekproef.md', 'Nachtelijke steekproeven', vertaalBlok);
                console.log(`🔤 Vertaalsteekproef ${TAALNAAM[taal]} weggeschreven.`);
            } else {
                console.warn('⚠️  Vertaalsteekproef gaf een onverwacht antwoord — overgeslagen.');
            }
        } else {
            console.log(`ℹ️  Geen van de nieuwe artikelen staat ook in het ${TAALNAAM[taal]} — steekproef overgeslagen.`);
        }
    } catch (err) {
        // Een mislukte steekproef mag de beoordeling niet meeslepen: die is af
        // en staat al op schijf.
        console.warn(`⚠️  Vertaalsteekproef mislukt (${err.message}) — beoordeling blijft staan.`);
    }

    const fotos = reservefotos(stand);
    if (fotos?.blok) {
        voegToe('backend/reservefotos-log.md', 'Nachtelijke meldingen', fotos.blok);
        console.log('📷 Reservefoto-melding weggeschreven.');
    }

    schrijfStand({
        laatsteRun: nu.toISOString(),
        laatsteArtikelDatum: nieuwe[nieuwe.length - 1].date,
        aantalBeoordeeld: nieuwe.length,
        reservefotosTabel: fotos?.tabel ?? stand.reservefotosTabel ?? null,
    });
    console.log('✅ Nachtelijke beoordeling klaar.');
}

main().catch(err => {
    console.error('💥 Nachtelijke beoordeling mislukt:', err);
    process.exit(1);
});
