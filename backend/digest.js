// Het dagoverzicht ("digest"): één AI-geschreven artikel per dag over de
// verhalen van gisteren, met [n]-verwijzingen naar de besproken artikelen.
// Doel: interesse wekken (besluit 2026-09-05).
//
// Sinds UX-review fase 4 (TODO 83, 2026-11-16): één overzicht per dag, over
// alle onderwerpen samen (geen categorie), met alleen de verhalen van die dag.
// Een dag loopt van 00:00 tot 24:00 Nederlandse tijd, net als Vandaag en
// Gisteren op de site. Daarvóór: één per categorie, uit de laatste 3 dagen,
// op UTC; dat gaf soms twee overzichten op één dag en soms geen.
//
// Draait elke Action-run maar is idempotent: bestaat er al een overzicht van
// gisteren, dan gebeurt er niets. De nachtrun (0:17 UTC, dus 01:17 of 02:17 in
// Nederland) maakt hem normaal; de middagrun vangt een mislukte nacht op. Prompt/tone-of-voice is itereerbaar via
// digest-prompt.md (zelfde lus als selectie-prompt.md); elke digest logt
// zijn prompthash in data/digest-log.json.
//
// Paywall: zelfde model als gewone artikelen — de volledige tekst staat
// alléén in articles_full (eerst álle 5 talen opgeslagen, anders categorie
// overgeslagen); publiek staat een ruimere teaser (~100 woorden).
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
require('dotenv').config();
// Claude-migratie 2026-09-05: AI via de adapter met fallback-keten; de
// digest wordt één keer in het Nederlands geschreven (rol 'schrijven') en
// daarna vertaald (rol 'vertalen') — alle talen vertellen zo hetzelfde
// verhaal en vertalen is goedkoper dan vijf keer genereren.
const { aiCall, verwerkAIResponse } = require('./ai-adapter');
const { verwijderVerweesdeDigests } = require('./digest-opruiming');

const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const TAAL_NAMEN = { nl: 'Nederlands', en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans' };
// Regels uit de vertaalsteekproef (2026-09-10); de titelregel sinds fase 4.
const VERTAAL_OPDRACHT = lang => `Vertaal dit BrightNews-dagoverzicht van het Nederlands naar het ${TAAL_NAMEN[lang]}. Vertaal natuurlijk en journalistiek, als iemand die de doeltaal als moedertaal schrijft. Regels: (1) behoud het geslacht uit het origineel — kop en tekst mogen elkaar nooit tegenspreken; (2) vertaal namen van organisaties, merken, producten en instellingen NIET; (3) voeg NIETS toe en laat NIETS weg; (4) volg de titelconventie van de doeltaal: Engels, Frans en Spaans gebruiken gewone zinsstijl, Duits alleen hoofdletters op zelfstandige naamwoorden; nooit een hoofdletter op elk woord; (5) laat verwijzingen tussen blokhaken zoals [1] exact staan; (6) schrijf aanhalingstekens bínnen een tekstveld als typografische tekens („…“, ‘…’ of »…«) en nooit als kaal recht teken " — dat maakt het JSON ongeldig; (7) noem geen datum of weekdag die niet in het origineel staat. Behoud de alinea-indeling (lege regels). "meta_d" blijft maximaal 155 tekens.`;

const MIN_ARTIKELEN = 2;   // minder dan dit → geen dagoverzicht (een dag heeft er 2 tot 8)
const BASIS_TOP = 5;       // "top 5", …
const MAX_ARTIKELEN = 8;   // …aangevuld met extra 9+-scoorders tot max 8
const TEASER_WOORDEN = 100; // ruimere teaser dan gewone artikelen (60)

const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const promptBestand = fs.readFileSync(`${__dirname}/digest-prompt.md`, 'utf8');
const promptSjabloon = promptBestand.split('---PROMPT---')[1]?.trim();
if (!promptSjabloon) {
    console.error('💥 digest-prompt.md mist het ---PROMPT----blok — gestopt.');
    process.exit(1);
}
const PROMPT_HASH = crypto.createHash('sha256').update(promptSjabloon).digest('hex').slice(0, 12);

async function wacht(ms) { return new Promise(r => setTimeout(r, ms)); }

// verwerkAIResponse komt uit ai-adapter.js (robuuste drietrapse parser).

function maakTeaser(tekst, maxWoorden) {
    if (!tekst) return '';
    const woorden = String(tekst).split(/\s+/);
    if (woorden.length <= maxWoorden) return String(tekst);
    return woorden.slice(0, maxWoorden).join(' ') + '...';
}

function telWoorden(tekst) {
    return String(tekst || '').split(/\s+/).filter(Boolean).length;
}

// Top-selectie: de 5 hoogst scorende artikelen van de dag, aangevuld met
// eventuele extra artikelen met score ≥ 9 tot maximaal 8 ("variatie 3–8").
// Artikelen zonder score (van vóór deze feature) tellen als 0 en vallen dus
// alleen in een digest als er weinig anders is.
function kiesTop(artikelen) {
    const gesorteerd = [...artikelen].sort((a, b) =>
        (b.score ?? 0) - (a.score ?? 0) || new Date(b.date) - new Date(a.date));
    const top = gesorteerd.slice(0, BASIS_TOP);
    for (const extra of gesorteerd.slice(BASIS_TOP)) {
        if (top.length >= MAX_ARTIKELEN) break;
        if ((extra.score ?? 0) >= 9) top.push(extra);
    }
    return top;
}

// Volledige tekst per artikel ophalen voor de digest-input: articles_full
// (service_role) heeft de complete samenvatting; artikelen van vóór fase 1.4
// hebben daar geen rij en vallen terug op de (dan nog complete) summary.
async function haalVolledigeTeksten(ids, lang, perTaalIndex) {
    const { data, error } = await supabaseAdmin
        .from('articles_full')
        .select('id, full_text')
        .eq('lang', lang)
        .in('id', ids.map(String));
    if (error) throw new Error(`articles_full lezen mislukt (${lang}): ${error.message}`);
    const perId = Object.fromEntries((data || []).map(r => [String(r.id), r.full_text]));
    return ids.map(id => {
        const vol = perId[String(id)];
        if (vol) return vol;
        const summary = perTaalIndex[lang]?.[id]?.summary || '';
        // Een op "..." eindigende summary is een afgekapte teaser: de digest
        // bouwt dan op een halve tekst. Niet fataal, wel het weten waard.
        if (summary.trim().endsWith('...')) {
            console.warn(`⚠️ Digest-input voor ${id} (${lang}) mist in articles_full — teruggevallen op een afgekapte teaser.`);
        }
        return summary;
    });
}

// Tijdwoorden die in een dagoverzicht niet kloppen: het verschijnt pas de dag
// erna, en de pagina toont de datum al. De prompt verbiedt ze; staat er toch
// een in (dat gebeurde in het eerste overzicht, 2026-11-17), dan wordt de
// tekst één keer opnieuw geschreven.
const TIJDWOORDEN = /\b(vandaag|gisteren|morgen|vanochtend|vanmiddag|vanavond|vannacht|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i;

// Een dag met weinig verhalen krijgt een korter overzicht: anders vult de AI
// aan met algemeenheden. [prompt, ondergrens, bovengrens] in woorden.
function lengte(aantal) {
    return aantal <= 3 ? ['200 tot 300', 150, 450] : ['350 tot 500', 250, 700];
}

// De dag (YYYY-MM-DD) van een moment, in Nederlandse tijd, zoals dagVan() in
// js/v5/gedeeld.js.
const dagFormaat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
});
const dagVan = moment => dagFormaat.format(new Date(moment));

// Gisteren in Nederland. Via 12:00 UTC van vandaag, zodat zomertijd geen
// dag kan overslaan.
function gisterenVan(nu) {
    return dagVan(Date.parse(`${dagVan(nu)}T12:00:00Z`) - 24 * 3600 * 1000);
}

function bouwPrompt(lang, items) {
    const itemTekst = items.map((it, i) =>
        `[${i + 1}] Onderwerp: ${it.categorie}\nTitel: ${it.titel}\nTekst: ${it.tekst}`).join('\n\n');
    return promptSjabloon
        .replaceAll('{TAAL}', TAAL_NAMEN[lang])
        .replaceAll('{WOORDEN}', lengte(items.length)[0])
        .replaceAll('{AANTAL}', String(items.length))
        // Functie-vorm: een string-vervanger interpreteert $-patronen ($&, $'
        // e.d.) in de artikeltekst en zou de prompt daarmee stil verminken.
        .replace('{ITEMS}', () => itemTekst);
}

// De [n]-verwijzingen in een digesttekst. De prompt eist [1] t/m [AANTAL],
// elk precies één keer; de bronnenlijst onder het artikel nummert 1..n. Een
// tekst die [9] noemt bij 3 bronnen (of [2] weglaat) wijst dus naast de
// lijst en mag niet gepubliceerd worden.
function verwijzingen(tekst) {
    return new Set([...String(tekst ?? '').matchAll(/\[(\d+)\]/g)].map(m => Number(m[1])));
}

function verwijzingenKloppen(tekst, aantal) {
    const set = verwijzingen(tekst);
    if (set.size !== aantal) return false;
    for (let n = 1; n <= aantal; n++) if (!set.has(n)) return false;
    return true;
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    if (!supabaseAdmin && !dryRun) {
        // Zonder service-key kan de volledige digest nergens bewaard worden —
        // publiceren zou een teaser opleveren waarvan de volledige tekst
        // definitief ontbreekt (zelfde verzekering als in processor.js).
        console.error('💥 SUPABASE_SERVICE_ROLE_KEY ontbreekt — digest overgeslagen.');
        process.exit(1);
    }

    const nu = new Date();
    const dagString = gisterenVan(nu);
    const digestId = `dg-${dagString.replaceAll('-', '')}-dag`;

    const perTaalIndex = {};
    const languages = {};
    for (const lang of TALEN) {
        languages[lang] = await fs.readJson(`./data/news_${lang}.json`).catch(() => []);
        perTaalIndex[lang] = Object.fromEntries(languages[lang].map(a => [a.id, a]));
    }

    const digestLog = await fs.readJson('./data/digest-log.json').catch(() => []);

    // Kandidaten: alle verhalen van die dag, over alle onderwerpen. Een
    // verhaal dat al in een eerder overzicht stond (digest-log kent de ids),
    // telt niet opnieuw mee.
    const alBesproken = new Set(digestLog.flatMap(d => d.ids ?? []));
    const kandidaten = languages.nl.filter(a => a.type !== 'digest' && a.date
        && dagVan(a.date) === dagString && !alBesproken.has(a.id));

    // shortcut: alleen gisteren. Mislukken beide runs van vandaag, dan krijgt
    // gisteren geen overzicht meer (controleer-run.js slaat dan alarm). Pas
    // inhalen als dat vaker gebeurt.
    // Idempotent: één overzicht per dag. Ook een overzicht van vóór fase 4
    // (één per categorie) telt, anders staan er op de overgangsdag twee.
    if (languages.nl.some(a => a.type === 'digest' && a.digest_date === dagString)) {
        console.log(`ℹ️ Dagoverzicht van ${dagString} bestaat al.`);
    } else if (kandidaten.length < MIN_ARTIKELEN) {
        console.log(`ℹ️ ${kandidaten.length} verhaal/verhalen op ${dagString}: te weinig voor een dagoverzicht.`);
    } else {
        const top = kiesTop(kandidaten);
        const [, ondergrens, bovengrens] = lengte(top.length);
        console.log(`📰 Dagoverzicht ${dagString}: ${top.length} artikelen (scores: ${top.map(a => a.score ?? '-').join(', ')})`);
        if (dryRun) {
            top.forEach((a, i) => console.log(`   [${i + 1}] ${a.category}: ${a.title}`));
        } else {
            try {
                const ids = top.map(a => a.id);
                // Moeder + vertaal: één Nederlandse moedertekst (rol 'schrijven'),
                // daarna per taal één vertaalcall (rol 'vertalen'). De
                // [n]-verwijzingen moeten de vertaling exact overleven.
                const perTaal = {};
                const nlTeksten = await haalVolledigeTeksten(ids, 'nl', perTaalIndex);
                const nlItems = ids.map((id, i) => ({
                    categorie: top[i].category || 'General',
                    titel: perTaalIndex.nl?.[id]?.title || top[i].title,
                    tekst: nlTeksten[i],
                }));
                // Twee pogingen als er een tijdwoord in titel of tekst staat.
                let moederAntwoord;
                let moeder;
                for (let poging = 0; poging < 2; poging++) {
                    await wacht(1000);
                    moederAntwoord = await aiCall({ rol: 'schrijven', prompt: bouwPrompt('nl', nlItems) });
                    moeder = verwerkAIResponse(moederAntwoord.tekst);
                    const fout = `${moeder?.titel ?? ''} ${moeder?.tekst ?? ''}`.match(TIJDWOORDEN);
                    if (!fout) break;
                    console.warn(`🔁 Dagoverzicht noemt "${fout[0]}" (poging ${poging + 1}).`);
                    if (poging === 1) throw new Error(`dagoverzicht noemt een tijdwoord ("${fout[0]}")`);
                }
                const moederWoorden = telWoorden(moeder?.tekst);
                if (moeder?.titel && !verwijzingenKloppen(moeder.tekst, ids.length)) {
                    console.error(`🔎 Rauwe respons (kop): ${String(moederAntwoord.tekst).replace(/\s+/g, ' ').slice(0, 300)}`);
                    throw new Error(`digest-verwijzingen kloppen niet: [${[...verwijzingen(moeder.tekst)].join(',')}] bij ${ids.length} bronnen`);
                }
                if (!moeder?.titel || moederWoorden < ondergrens || moederWoorden > bovengrens) {
                    // Diagnose (2026-09-06): log de kop van de rauwe respons.
                    console.error(`🔎 Rauwe respons (kop): ${String(moederAntwoord.tekst).replace(/\s+/g, ' ').slice(0, 300)}`);
                    throw new Error(`onbruikbare digest-moedertekst: ${moederWoorden} woorden`);
                }
                perTaal.nl = {
                    titel: String(moeder.titel).trim(),
                    tekst: String(moeder.tekst).trim(),
                    meta_d: String(moeder.meta_d || '').slice(0, 155),
                    tokens: moederAntwoord.tokens,
                };
                for (const lang of TALEN.filter(l => l !== 'nl')) {
                    // Twee pogingen per taal (2026-09-09): zelfde stochastische
                    // parse-uitval als in de artikel-vertaalstap.
                    for (let poging = 0; poging < 2; poging++) {
                        await wacht(1000);
                        const antwoord = await aiCall({
                            rol: 'vertalen',
                            prompt: `${VERTAAL_OPDRACHT(lang)}
INVOER:
${JSON.stringify({ titel: perTaal.nl.titel, tekst: perTaal.nl.tekst, meta_d: perTaal.nl.meta_d })}
Antwoord UITSLUITEND met geldig JSON — alinea-scheidingen binnen "tekst" schrijf je als \\n\\n, nooit als echt regeleinde: {"titel": "..", "tekst": "..", "meta_d": ".."}`,
                        });
                        const data = verwerkAIResponse(antwoord.tekst);
                        const woorden = telWoorden(data?.tekst);
                        // De verwijzingen moeten de vertaling exact overleven:
                        // de bronnenlijst staat in élke taal onder het artikel.
                        if (data?.titel && woorden >= ondergrens * 0.8 && verwijzingenKloppen(data.tekst, ids.length)) {
                            perTaal[lang] = {
                                titel: String(data.titel).trim(),
                                tekst: String(data.tekst).trim(),
                                meta_d: String(data.meta_d || '').slice(0, 155),
                                tokens: antwoord.tokens,
                            };
                            break;
                        }
                        console.error(`🔎 Digest-vertaling ${lang} onbruikbaar (poging ${poging + 1}), rauwe kop: ${String(antwoord.tekst).replace(/\s+/g, ' ').slice(0, 200)}`);
                        if (poging === 1) throw new Error(`onbruikbare digest-vertaling (${lang}): ${woorden} woorden`);
                    }
                }

                // Atomair: eerst álle talen in articles_full, dan pas publiceren.
                for (const lang of TALEN) {
                    const { error } = await supabaseAdmin.from('articles_full').upsert({
                        id: digestId, lang, full_text: perTaal[lang].tekst,
                    }, { onConflict: 'id,lang' });
                    if (error) throw new Error(`opslaan mislukt (${lang}): ${error.message}`);
                }

                const onderwerpen = [...new Set(top.map(a => a.category).filter(Boolean))].join(', ');
                for (const lang of TALEN) {
                    const teaser = maakTeaser(perTaal[lang].tekst, TEASER_WOORDEN);
                    languages[lang].unshift({
                        id: digestId,
                        type: 'digest',
                        digest_date: dagString,
                        title: perTaal[lang].titel,
                        summary: teaser,
                        image_alt: perTaal[lang].titel,
                        meta_description: perTaal[lang].meta_d || teaser.slice(0, 155),
                        meta_keywords: onderwerpen,
                        link: '',
                        source: 'BrightNews',
                        // Geen foto: een dagoverzicht krijgt overal het merkbeeld,
                        // anders staat de foto van een verhaal er dubbel (fase 5).
                        image: null,
                        date: new Date().toISOString(),
                        // Geen categorie: het overzicht gaat over alle onderwerpen
                        // en staat dus niet op een onderwerppagina.
                        category: null,
                        refs: ids.map((id, i) => ({
                            id,
                            title: perTaalIndex[lang]?.[id]?.title || top[i].title,
                        })),
                    });
                    if (languages[lang].length > 150) languages[lang].pop();
                }

                digestLog.unshift({
                    datum: new Date().toISOString(),
                    dag: dagString,
                    categorie: null,
                    ids,
                    prompthash: PROMPT_HASH,
                    model: `moeder+vertaal (${moederAntwoord.provider})`,
                    tokens: TALEN.reduce((som, l) => som + perTaal[l].tokens, 0),
                    woorden: Object.fromEntries(TALEN.map(l => [l, telWoorden(perTaal[l].tekst)])),
                });
                console.log(`✨ Dagoverzicht gepubliceerd: ${perTaal.nl.titel}`);
            } catch (err) {
                // Niets half publiceren; de volgende run probeert het opnieuw.
                console.error(`❌ Dagoverzicht ${dagString} mislukt: ${err.message}`);
            }
        }
    }

    // Ook hier opruimen: digest.js schrijft dezelfde lijsten weg als
    // processor.js en zou anders een net opgeruimd overzicht terugzetten.
    for (const lang of Object.keys(languages)) {
        const { items, verwijderd } = verwijderVerweesdeDigests(languages[lang]);
        languages[lang] = items;
        if (lang === 'nl') {
            for (const d of verwijderd) {
                console.log(`🧹 Dagoverzicht verwijderd: ${d.categorie ?? 'dag'} ${d.dag} — nog ${d.levend} van ${d.totaal} bronnen.`);
            }
        }
    }

    if (!dryRun) {
        for (const [lang, items] of Object.entries(languages)) {
            await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
        }
        await fs.outputJson('./data/digest-log.json', digestLog.slice(0, 60), { spaces: 2 });
    }
}

main().catch(err => {
    console.error('💥 Digest-run mislukt:', err);
    process.exit(1);
});
