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

// 4. Dagoverzichten (review-ronde 2026-09-26): de digest-stap draait met
//    continue-on-error en kan dus wekenlang stil falen — precies de fout die
//    deze controle bij de processor al vangt. Alarm alleen als er volgens de
//    digest-regels zelf wél materiaal lag (een categorie met ≥ 3 verse, nog
//    niet besproken artikelen) en er desondanks al > 2 dagen geen overzicht
//    is verschenen. Een rustige week zonder rijpe categorie blijft stil.
const digestLog = lees('digest-log.json') || [];
if (Array.isArray(nieuws) && nieuws.length) {
    const VENSTER_MS = 3 * 24 * 3600 * 1000;
    const alBesproken = new Set(digestLog.flatMap(d => d.ids ?? []));
    const perCategorie = {};
    for (const a of nieuws) {
        if (a.type === 'digest' || alBesproken.has(a.id)) continue;
        const leeftijd = Date.now() - new Date(a.date || 0).getTime();
        if (leeftijd >= 0 && leeftijd <= VENSTER_MS) {
            const c = a.category || 'General';
            perCategorie[c] = (perCategorie[c] ?? 0) + 1;
        }
    }
    const rijp = Object.entries(perCategorie).filter(([, n]) => n >= 3).map(([c]) => c);
    const nieuwsteDigest = digestLog.map(d => d.datum).filter(Boolean).sort().pop();
    const digestDagen = nieuwsteDigest
        ? (Date.now() - new Date(nieuwsteDigest).getTime()) / 86400000
        : Infinity;
    if (nieuwsteDigest) {
        opmerkingen.push(`nieuwste dagoverzicht: ${nieuwsteDigest} (${digestDagen.toFixed(1)} dagen oud)`);
    }
    if (rijp.length && digestDagen > 2) {
        alarmen.push([
            `Geen dagoverzicht sinds ${nieuwsteDigest ?? 'ooit'}, terwijl ${rijp.join(', ')} genoeg vers materiaal ${rijp.length === 1 ? 'heeft' : 'hebben'} (≥ 3 onbesproken artikelen).`,
            'De digest-stap draait met continue-on-error en faalt dus zonder rode run. ' +
            'Kijk in het log van de stap "📰 Dagoverzichten per categorie".'
        ]);
    }
}

// 5. Postfabriek (zelfde gat): de conceptposts staan in de afgeschermde
//    Supabase-tabel marketing_posts. Alarm als de marketing-feed materiaal
//    heeft maar er > 3 dagen geen conceptdag is bijgekomen. Zonder
//    service-key wordt deze check overgeslagen (dat staat er dan bij).
async function controleerPosts() {
    const feed = lees('marketing-feed.json');
    const materiaal = (feed?.perTaal?.nl?.top?.length ?? 0) + (feed?.perTaal?.nl?.dagoverzichten?.length ?? 0);
    if (!materiaal) return;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        opmerkingen.push('postfabriek-check overgeslagen (geen SUPABASE_SERVICE_ROLE_KEY)');
        return;
    }
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient('https://rquuqypgaannrakdrabj.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await supabase
            .from('marketing_posts').select('dag').order('dag', { ascending: false }).limit(1);
        if (error) throw new Error(error.message);
        const nieuwste = data?.[0]?.dag;
        const dagen = nieuwste ? (Date.now() - new Date(nieuwste).getTime()) / 86400000 : Infinity;
        if (nieuwste) opmerkingen.push(`nieuwste conceptpost-dag: ${nieuwste} (${dagen.toFixed(1)} dagen oud)`);
        if (dagen > 3) {
            alarmen.push([
                `Geen conceptposts sinds ${nieuwste ?? 'ooit'}, terwijl de marketing-feed materiaal heeft.`,
                'De postfabriek draait met continue-on-error en faalt dus zonder rode run. ' +
                'Kijk in het log van de stap "✍️ Postfabriek".'
            ]);
        }
    } catch (err) {
        // De controle zelf mag de run niet laten falen op een netwerkfout.
        opmerkingen.push(`postfabriek-check mislukt (${String(err.message).slice(0, 80)})`);
    }
}

(async () => {
await controleerPosts();

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
})();
