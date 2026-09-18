// Controle na afloop van een pipeline-run: is er écht iets gebeurd?
//
// Aanleiding (2026-09-10 t/m 13): het Anthropic-tegoed was op, elke AI-aanroep
// gaf "credit balance is too low", en de run accepteerde nul artikelen. De
// Action meldde desondanks "success", dus er ging geen mail uit en de site
// stond drie dagen stil voor iemand het doorhad.
//
// Deze controle draait ná de commit-en-push-stap, zodat een alarm nooit het
// werk van een geslaagde run weggooit. Hij faalt alleen bij toestanden die
// ondubbelzinnig kapot zijn — niet bij een rustige dag waarop er gewoon niets
// goeds langskwam. Dat onderscheid is het hele punt: een alarm dat te vaak
// afgaat, wordt genegeerd.
const fs = require('fs');
const path = require('path');

const MAX_DAGEN_ZONDER_ARTIKEL = 3;

function lees(bestand) {
    const pad = path.join(__dirname, '..', 'data', bestand);
    if (!fs.existsSync(pad)) return null;
    try {
        return JSON.parse(fs.readFileSync(pad, 'utf8'));
    } catch {
        return null;
    }
}

const run = lees('last_run.json');
const alarmen = [];
const opmerkingen = [];

if (!run) {
    alarmen.push([
        'data/last_run.json ontbreekt of is onleesbaar.',
        'De processor-stap is dan niet (volledig) gedraaid. Kijk in het log van de AI-stap.'
    ]);
} else {
    const kandidaten = run.kandidaten || 0;
    const alGezien = run.alGezien || 0;
    const tekstOpgehaald = run.tekstOpgehaald || 0;
    const aiCalls = run.aiCalls || 0;
    const geaccepteerd = run.geaccepteerd || 0;
    const feedFouten = run.feedFouten || 0;

    opmerkingen.push(
        `kandidaten ${kandidaten} · al gezien ${alGezien} · tekst opgehaald ` +
        `${tekstOpgehaald} · AI-aanroepen ${aiCalls} · geaccepteerd ${geaccepteerd}`
    );

    // 1. Geen enkele kandidaat: alle feeds faalden of de bronnenlijst is leeg.
    if (kandidaten === 0) {
        alarmen.push([
            'Nul kandidaten opgehaald uit de RSS-feeds.',
            `feedFouten staat op ${feedFouten}. Normaal levert een run er een paar honderd. ` +
            'Controleer de bronnenlijst en of de feeds bereikbaar zijn.'
        ]);
    }

    // 2. Wél werk, maar de AI-keten kwam nooit aan bod. Dit is precies de
    //    handtekening van de storing van september: 22 teksten opgehaald,
    //    0 AI-aanroepen, 2 selectiefouten.
    if (tekstOpgehaald > 0 && aiCalls === 0) {
        alarmen.push([
            `Er waren ${tekstOpgehaald} artikelen om te beoordelen, maar er is geen enkele ` +
            'AI-aanroep gelukt.',
            'De hele providerketen faalt. Meestal betekent dit dat het tegoed op is ' +
            '("Your credit balance is too low") of dat de API-sleutel niet meer geldig is. ' +
            'Kijk op console.anthropic.com onder Billing, en in het log van de AI-stap.'
        ]);
    }
}

// 3. Achtervang: ook als de cijfers hierboven er goed uitzien, hoort er met
//    twee runs per dag niet dagenlang niets nieuws te verschijnen.
const nieuws = lees('news_nl.json');
if (Array.isArray(nieuws) && nieuws.length) {
    const datums = nieuws.map(a => a.date).filter(Boolean).sort();
    const nieuwste = datums[datums.length - 1];
    const dagen = (Date.now() - new Date(nieuwste).getTime()) / 86400000;
    opmerkingen.push(`nieuwste artikel: ${nieuwste} (${dagen.toFixed(1)} dagen oud)`);
    if (dagen > MAX_DAGEN_ZONDER_ARTIKEL) {
        alarmen.push([
            `Er is al ${dagen.toFixed(1)} dagen geen nieuw artikel gepubliceerd.`,
            'Zelfs op een rustige week hoort er met twee runs per dag vaker iets door te ' +
            'komen. Kijk of de selectie niet te streng staat en of de AI-stap wel slaagt.'
        ]);
    }
}

console.log('— Controle van de run —');
opmerkingen.forEach(r => console.log('  ' + r));

if (alarmen.length === 0) {
    console.log('✅ Run ziet er gezond uit.');
    process.exit(0);
}

console.log('');
console.error(`❌ ${alarmen.length} probleem(en) gevonden:`);
alarmen.forEach(([wat, waarom], i) => {
    console.error('');
    console.error(`  ${i + 1}. ${wat}`);
    console.error(`     ${waarom}`);
});
console.error('');
console.error('De data van deze run is wél opgeslagen; deze stap draait daarna.');
console.error('Deze stap faalt met opzet, zodat GitHub een melding stuurt in plaats van');
console.error('dat een stille storing dagenlang onopgemerkt blijft.');
process.exit(1);
