// Dagelijks categorie-artikel ("digest"): één AI-geschreven artikel per
// categorie over de top-artikelen van gisteren (UTC), met [n]-verwijzingen
// naar de besproken artikelen. Doel: interesse wekken (besluit 2026-09-05).
//
// Draait elke Action-run maar is idempotent: bestaat de digest van gisteren
// voor een categorie al in news_nl.json, dan wordt hij overgeslagen. De
// nachtcron (0:00 UTC) maakt ze dus normaal; de middagrun vangt een
// mislukte nacht op. Prompt/tone-of-voice is itereerbaar via
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

const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const TAAL_NAMEN = { nl: 'Nederlands', en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans' };
const TAAL_LOCALES = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };

const MIN_ARTIKELEN = 3;   // minder dan dit → geen digest voor die categorie
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
    return ids.map(id => perId[String(id)] || perTaalIndex[lang]?.[id]?.summary || '');
}

function bouwPrompt(lang, categorie, datum, items) {
    const datumTekst = datum.toLocaleDateString(TAAL_LOCALES[lang], {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    const itemTekst = items.map((it, i) =>
        `[${i + 1}] Titel: ${it.titel}\nTekst: ${it.tekst}`).join('\n\n');
    return promptSjabloon
        .replaceAll('{TAAL}', TAAL_NAMEN[lang])
        .replaceAll('{CATEGORIE}', categorie)
        .replaceAll('{DATUM}', datumTekst)
        .replaceAll('{AANTAL}', String(items.length))
        .replace('{ITEMS}', itemTekst);
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

    // "Die dag" = gisteren in UTC; de nachtcron draait vlak ná middernacht.
    const nu = new Date();
    const gisteren = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate() - 1));
    const dagString = gisteren.toISOString().slice(0, 10);

    const perTaalIndex = {};
    const languages = {};
    for (const lang of TALEN) {
        languages[lang] = await fs.readJson(`./data/news_${lang}.json`).catch(() => []);
        perTaalIndex[lang] = Object.fromEntries(languages[lang].map(a => [a.id, a]));
    }

    // Kandidaten van gisteren per categorie (digests zelf tellen nooit mee).
    const perCategorie = {};
    for (const artikel of languages.nl) {
        if (artikel.type === 'digest') continue;
        if (String(artikel.date || '').slice(0, 10) !== dagString) continue;
        (perCategorie[artikel.category || 'General'] ??= []).push(artikel);
    }

    const digestLog = await fs.readJson('./data/digest-log.json').catch(() => []);
    let mislukteCategorieenOpRij = 0;

    for (const [categorie, kandidaten] of Object.entries(perCategorie)) {
        const digestId = `dg-${dagString.replaceAll('-', '')}-${categorie.toLowerCase()}`;
        if (perTaalIndex.nl[digestId]) continue; // al gemaakt (idempotent)
        if (kandidaten.length < MIN_ARTIKELEN) {
            console.log(`ℹ️ ${categorie}: ${kandidaten.length} artikel(en) op ${dagString} — te weinig voor een digest.`);
            continue;
        }
        const top = kiesTop(kandidaten);
        console.log(`📰 Digest ${categorie} ${dagString}: ${top.length} artikelen (scores: ${top.map(a => a.score ?? '-').join(', ')})`);
        if (dryRun) {
            top.forEach((a, i) => console.log(`   [${i + 1}] ${a.title}`));
            continue;
        }

        // Circuitbreaker: falen twee categorieën volledig achter elkaar
        // (bijv. aanhoudende 429's), dan is doorproberen zinloos.
        if (mislukteCategorieenOpRij >= 2) {
            console.error('🛑 Twee categorieën op rij mislukt — digest-run gestopt; volgende run probeert opnieuw.');
            break;
        }

        try {
            const ids = top.map(a => a.id);
            // Moeder + vertaal: één Nederlandse moedertekst (rol 'schrijven'),
            // daarna per taal één vertaalcall (rol 'vertalen'). De
            // [n]-verwijzingen moeten de vertaling exact overleven.
            const perTaal = {};
            const nlTeksten = await haalVolledigeTeksten(ids, 'nl', perTaalIndex);
            const nlItems = ids.map((id, i) => ({
                titel: perTaalIndex.nl?.[id]?.title || top[i].title,
                tekst: nlTeksten[i],
            }));
            await wacht(1000);
            const moederAntwoord = await aiCall({
                rol: 'schrijven',
                prompt: bouwPrompt('nl', categorie, gisteren, nlItems),
            });
            const moeder = verwerkAIResponse(moederAntwoord.tekst);
            const moederWoorden = telWoorden(moeder?.tekst);
            if (!moeder?.titel || moederWoorden < 250 || moederWoorden > 700) {
                // Diagnose (2026-09-06): nachtcron 1 verloor Health+Tech aan
                // parse-uitval zonder spoor — log de kop van de rauwe respons.
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
                await wacht(1000);
                const antwoord = await aiCall({
                    rol: 'vertalen',
                    prompt: `Vertaal dit BrightNews-dagoverzicht van het Nederlands naar het ${TAAL_NAMEN[lang]}. Vertaal natuurlijk en journalistiek; voeg NIETS toe en laat NIETS weg. Behoud de alinea-indeling (lege regels) en laat de verwijzingen tussen blokhaken zoals [1] exact staan. "meta_d" blijft maximaal 155 tekens.
INVOER:
${JSON.stringify({ titel: perTaal.nl.titel, tekst: perTaal.nl.tekst, meta_d: perTaal.nl.meta_d })}
Antwoord UITSLUITEND met geldig JSON — alinea-scheidingen binnen "tekst" schrijf je als \\n\\n, nooit als echt regeleinde: {"titel": "..", "tekst": "..", "meta_d": ".."}`,
                });
                const data = verwerkAIResponse(antwoord.tekst);
                const woorden = telWoorden(data?.tekst);
                if (!data?.titel || woorden < 200) {
                    throw new Error(`onbruikbare digest-vertaling (${lang}): ${woorden} woorden`);
                }
                perTaal[lang] = {
                    titel: String(data.titel).trim(),
                    tekst: String(data.tekst).trim(),
                    meta_d: String(data.meta_d || '').slice(0, 155),
                    tokens: antwoord.tokens,
                };
            }

            // Atomair: eerst álle talen in articles_full, dan pas publiceren.
            for (const lang of TALEN) {
                const { error } = await supabaseAdmin.from('articles_full').upsert({
                    id: digestId, lang, full_text: perTaal[lang].tekst,
                }, { onConflict: 'id,lang' });
                if (error) throw new Error(`opslaan mislukt (${lang}): ${error.message}`);
            }

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
                    meta_keywords: categorie,
                    link: '',
                    source: 'BrightNews',
                    image: top[0].image || null,
                    date: new Date().toISOString(),
                    category: categorie,
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
                categorie,
                ids,
                prompthash: PROMPT_HASH,
                model: `moeder+vertaal (${moederAntwoord.provider})`,
                tokens: TALEN.reduce((som, l) => som + perTaal[l].tokens, 0),
                woorden: Object.fromEntries(TALEN.map(l => [l, telWoorden(perTaal[l].tekst)])),
            });
            mislukteCategorieenOpRij = 0;
            console.log(`✨ Digest gepubliceerd: ${perTaal.nl.titel}`);
        } catch (err) {
            // Niets half publiceren; volgende run probeert deze categorie
            // opnieuw (idempotentie-check hierboven).
            mislukteCategorieenOpRij++;
            console.error(`❌ Digest ${categorie} mislukt: ${err.message}`);
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
