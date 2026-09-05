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
const { Mistral } = require('@mistralai/mistralai');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
require('dotenv').config();

const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const TAAL_NAMEN = { nl: 'Nederlands', en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans' };
const TAAL_LOCALES = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };

// mistral-medium: dit is de enige lezer-gerichte langere tekst die we
// genereren (6 categorieën × 5 talen = max 30 calls/dag); schrijfkwaliteit
// weegt hier zwaarder dan bij de bron-getrouwe samenvattingen.
const DIGEST_MODEL = 'mistral-medium-latest';
const MIN_ARTIKELEN = 3;   // minder dan dit → geen digest voor die categorie
const BASIS_TOP = 5;       // "top 5", …
const MAX_ARTIKELEN = 8;   // …aangevuld met extra 9+-scoorders tot max 8
const TEASER_WOORDEN = 100; // ruimere teaser dan gewone artikelen (60)

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

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

async function mistralMetRetry(params, pogingen = 3) {
    for (let i = 0; i < pogingen; i++) {
        try {
            return await client.chat.complete(params);
        } catch (err) {
            if (i === pogingen - 1) throw err;
            const delay = 5000 * Math.pow(2, i);
            console.warn(`⏳ Mistral-fout (${err.message}), nieuwe poging over ${delay}ms`);
            await wacht(delay);
        }
    }
}

function verwerkAIResponse(ruw) {
    try {
        return JSON.parse(String(ruw).replace(/^```(json)?/m, '').replace(/```$/m, '').trim());
    } catch {
        return null;
    }
}

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
            // Per taal één call: 5 × ~450 woorden past niet betrouwbaar in
            // één JSON-antwoord (het bestaande 5-talen-patroon werkt alleen
            // voor korte samenvattingen).
            const perTaal = {};
            for (const lang of TALEN) {
                const teksten = await haalVolledigeTeksten(ids, lang, perTaalIndex);
                const items = ids.map((id, i) => ({
                    titel: perTaalIndex[lang]?.[id]?.title || top[i].title,
                    tekst: teksten[i],
                }));
                await wacht(1500);
                const antwoord = await mistralMetRetry({
                    model: DIGEST_MODEL,
                    temperature: 0.4,
                    messages: [{ role: 'user', content: bouwPrompt(lang, categorie, gisteren, items) }],
                    responseFormat: { type: 'json_object' },
                });
                const data = verwerkAIResponse(antwoord.choices[0].message.content);
                const woorden = telWoorden(data?.tekst);
                if (!data?.titel || woorden < 250 || woorden > 700) {
                    throw new Error(`onbruikbare digest-respons (${lang}): ${woorden} woorden`);
                }
                perTaal[lang] = {
                    titel: String(data.titel).trim(),
                    tekst: String(data.tekst).trim(),
                    meta_d: String(data.meta_d || '').slice(0, 155),
                    tokens: antwoord.usage?.totalTokens ?? 0,
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
                model: DIGEST_MODEL,
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
