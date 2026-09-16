// Gebundelde selectie (besluit Erik 2026-09-05, "punt 2"): tot 10 items per
// AI-call in plaats van één. De rubric (±1.100 tokens) wordt zo gedeeld door
// tien — ~80% minder selectie-input — en het aantal calls daalt 10×, wat ook
// elk per-minuut-limietprobleem oplost. Pure functies, los testbaar zonder
// netwerk; processor.js doet de call en de besluiten.
const BATCH_GROOTTE = 10;

// Vult het {AANTAL}/{ITEMS}-sjabloon uit selectie-prompt.md met genummerde
// items. Zelfde afkapgrenzen als de oude één-item-prompt.
function bouwBatchPrompt(sjabloon, items) {
    const itemTekst = items.map((item, i) =>
        `ITEM ${i + 1}\nTitel: "${String(item.title ?? '').slice(0, 300)}"\nTekst: "${String(item.contentSnippet ?? '').slice(0, 1200)}"`
    ).join('\n\n');
    return sjabloon
        .replaceAll('{AANTAL}', String(items.length))
        .replace('{ITEMS}', itemTekst);
}

// Zet de model-JSON om naar een score-array van exact `aantal` posities.
// Positie i hoort bij ITEM i+1; ontbrekende of onbruikbare items worden null
// (= herkansing volgende run, nooit in seenLinks). Het besluit valt in code:
// het "besluit"-veld van het model is alleen de afgedwongen dénkvolgorde.
// Toegestane poortwaarden (prompt v8, analyse 2026-09-10 bevinding 1): de
// afwijslijst werd via de scores omzeild — de inhoud van een weekoverzicht
// is oprecht positief, dus scoorde hij 3/3/3. De poort wijst nu af
// ongeacht de scores, en het log toont wélke categorie hoe vaak vangt.
const UITSLUITINGEN = ['geen', 'productnieuws', 'verzameleditie', 'politiek', 'misdaad-of-ramp', 'listicle', 'te-weinig-inhoud'];

function verwerkBatchScores(data, aantal, drempelTotaal, minima) {
    const perNr = new Map();
    for (const rij of Array.isArray(data?.items) ? data.items : []) {
        const nr = Number(rij?.nr);
        if (!Number.isInteger(nr) || nr < 1 || nr > aantal || perNr.has(nr)) continue;
        const scores = {
            gevoel: Number(rij.gevoel),
            formulering: Number(rij.formulering),
            relevantie: Number(rij.relevantie),
        };
        if (Object.values(scores).some(s => !Number.isFinite(s) || s < 0)) continue;
        // Onbekende poortwaarde telt als 'geen' (permissief): de scores en
        // de drempel beslissen dan gewoon, zoals vóór v8.
        const uitsluiting = UITSLUITINGEN.includes(rij.uitsluiting) ? rij.uitsluiting : 'geen';
        const totaal = scores.gevoel + scores.formulering + scores.relevantie;
        const geschikt = uitsluiting === 'geen'
            && totaal >= drempelTotaal
            && Object.entries(minima).every(([k, min]) => scores[k] >= min);
        perNr.set(nr, {
            ...scores,
            totaal,
            uitsluiting,
            geschikt,
            // Drift-signaal (analyse bevinding 3): zegt het model zelf iets
            // anders dan de rekenregel, dan telt de aanroeper dat.
            mismatch: (rij.besluit === 'ja') !== geschikt,
            reden: String(rij.reden ?? '').slice(0, 200),
        });
    }
    return Array.from({ length: aantal }, (_, i) => perNr.get(i + 1) ?? null);
}

module.exports = { BATCH_GROOTTE, bouwBatchPrompt, verwerkBatchScores };
