// Postfabriek (besluit Erik 2026-09-09, marketing fase M1): schrijft per dag
// één conceptpost per kanaal (instagram/facebook/linkedin/x) over het beste
// materiaal van vandaag, in het Nederlands (rol 'schrijven'), en vertaalt die
// naar de andere vier talen (rol 'vertalen'). Concepten belanden in
// data/marketing-posts.json; Maarten keurt ze in de cockpit (marketing.html)
// en zijn afwijzingen (marketing_feedback in Supabase) voeden de volgende
// generatie via {FEEDBACK} in backend/marketing-prompt.md.
// DRAFT-FIRST: dit script publiceert nooit iets — het schrijft alleen
// concepten; plaatsen doet een mens (fase M2: scheduler, ook dan pas na
// goedkeuring).
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
require('dotenv').config();
const { aiCall, verwerkAIResponse } = require('./ai-adapter');

const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const TAAL_NAMEN = { nl: 'Nederlands', en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans' };
const KANALEN = ['instagram', 'facebook', 'linkedin', 'x'];
const BEWAAR_DAGEN = 30;

const promptBestand = fs.readFileSync(`${__dirname}/marketing-prompt.md`, 'utf8');
const promptSjabloon = promptBestand.split('---PROMPT---')[1]?.trim();
if (!promptSjabloon) {
    console.error('💥 marketing-prompt.md mist het ---PROMPT----blok — gestopt.');
    process.exit(1);
}
const PROMPT_HASH = crypto.createHash('sha256').update(promptSjabloon).digest('hex').slice(0, 12);

const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function wacht(ms) { return new Promise(r => setTimeout(r, ms)); }

// Recente afwijzingen (met reden) uit de cockpit — de leerlus. Zonder
// Supabase-key of bij een fout: gewoon zonder feedback verder.
async function haalFeedback() {
    if (!supabaseAdmin) return '(nog geen feedback)';
    try {
        const sinds = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from('marketing_feedback')
            .select('post_key, reden')
            .eq('besluit', 'afgewezen')
            .gte('created_at', sinds)
            .not('reden', 'is', null)
            .order('created_at', { ascending: false })
            .limit(15);
        if (error || !data?.length) return '(nog geen feedback)';
        return data.map(r => `- ${String(r.reden).slice(0, 120)}`).join('\n');
    } catch {
        return '(nog geen feedback)';
    }
}

function bouwMateriaal(feed) {
    const nl = feed.perTaal?.nl;
    if (!nl) return null;
    const items = [
        ...nl.dagoverzichten.map(d => ({ soort: 'dagoverzicht', titel: d.titel, tekst: '', url: d.url })),
        ...nl.top.map(t => ({ soort: 'artikel', titel: t.titel, tekst: t.teaser, url: t.url })),
    ];
    if (!items.length) return null;
    // Eén onderwerp per dag houdt de review klein: het dagoverzicht als dat
    // er is (breedste verhaal), anders het hoogst scorende artikel.
    return items[0];
}

async function vertaalPosts(nlPosts, lang) {
    for (let poging = 0; poging < 2; poging++) {
        const antwoord = await aiCall({
            rol: 'vertalen',
            prompt: `Vertaal deze socialmediaposts van BrightNews van het Nederlands naar het ${TAAL_NAMEN[lang]}. Behoud per post de stijl en kanaalconventies (hashtags meevertalen waar dat natuurlijk is, emoji's laten staan) en laat de placeholder {URL} exact staan. Voeg niets toe, laat niets weg.
INVOER:
${JSON.stringify({ posts: nlPosts })}
Antwoord UITSLUITEND met geldig JSON in exact dezelfde vorm: {"posts": [{"kanaal": "..", "tekst": ".."}]}`,
        });
        const data = verwerkAIResponse(antwoord.tekst);
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        const perKanaal = Object.fromEntries(posts
            .filter(p => KANALEN.includes(p.kanaal) && typeof p.tekst === 'string' && p.tekst.trim())
            .map(p => [p.kanaal, p.tekst.trim()]));
        if (KANALEN.every(k => perKanaal[k])) return { perKanaal, tokens: antwoord.tokens };
        console.error(`🔎 Postvertaling ${lang} onbruikbaar (poging ${poging + 1}): ${String(antwoord.tekst).replace(/\s+/g, ' ').slice(0, 160)}`);
        await wacht(1000);
    }
    return null;
}

function utm(url, kanaal, dag) {
    const scheider = url.includes('?') ? '&' : '?';
    return `${url}${scheider}utm_source=${kanaal}&utm_medium=social&utm_campaign=dag-${dag}`;
}

async function main() {
    const dag = new Date().toISOString().slice(0, 10);
    const bestand = './data/marketing-posts.json';
    const opslag = await fs.readJson(bestand).catch(() => ({ dagen: [] }));
    if (!Array.isArray(opslag.dagen)) opslag.dagen = [];
    if (opslag.dagen.some(d => d.dag === dag)) {
        console.log(`ℹ️ Posts voor ${dag} bestaan al — niets te doen.`);
        return;
    }

    const feed = await fs.readJson('./data/marketing-feed.json').catch(() => null);
    const onderwerp = feed && bouwMateriaal(feed);
    if (!onderwerp) {
        console.log('ℹ️ Geen vers materiaal in de marketing-feed — geen posts vandaag.');
        return;
    }

    const feedback = await haalFeedback();
    const materiaal = `Soort: ${onderwerp.soort}\nTitel: ${onderwerp.titel}\nTekst: ${onderwerp.tekst || '(zie titel)'}\nLink (als {URL} invoegen): ${onderwerp.url}`;
    const prompt = promptSjabloon
        .replaceAll('{DATUM}', dag)
        .replace('{FEEDBACK}', feedback)
        .replace('{MATERIAAL}', materiaal);

    console.log(`📣 Postfabriek ${dag}: "${onderwerp.titel}" (${onderwerp.soort}); feedbackregels: ${feedback === '(nog geen feedback)' ? 0 : feedback.split('\n').length}`);

    let nlPosts = null;
    let tokens = 0;
    for (let poging = 0; poging < 2 && !nlPosts; poging++) {
        const antwoord = await aiCall({ rol: 'schrijven', prompt });
        tokens += antwoord.tokens;
        const data = verwerkAIResponse(antwoord.tekst);
        const posts = (Array.isArray(data?.posts) ? data.posts : [])
            .filter(p => KANALEN.includes(p.kanaal) && typeof p.tekst === 'string' && p.tekst.trim())
            .map(p => ({ kanaal: p.kanaal, tekst: p.tekst.trim() }));
        if (KANALEN.every(k => posts.some(p => p.kanaal === k))) nlPosts = posts;
        else console.error(`🔎 NL-posts onbruikbaar (poging ${poging + 1}): ${String(antwoord.tekst).replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    if (!nlPosts) {
        console.error('❌ Geen bruikbare NL-posts — volgende run opnieuw.');
        return;
    }

    const perTaal = { nl: Object.fromEntries(nlPosts.map(p => [p.kanaal, p.tekst])) };
    for (const lang of TALEN.filter(l => l !== 'nl')) {
        await wacht(1000);
        const vertaling = await vertaalPosts(nlPosts, lang);
        if (!vertaling) {
            console.error(`❌ Vertaling ${lang} mislukt — dag overgeslagen, volgende run opnieuw.`);
            return;
        }
        perTaal[lang] = vertaling.perKanaal;
        tokens += vertaling.tokens;
    }

    // {URL} pas hier invullen: per kanaal een eigen meetcode (utm), zodat het
    // weekrapport per kanaal kan zien wat kliks oplevert.
    for (const lang of TALEN) {
        for (const kanaal of KANALEN) {
            perTaal[lang][kanaal] = perTaal[lang][kanaal].replaceAll('{URL}', utm(onderwerp.url, kanaal, dag));
        }
    }

    opslag.dagen.unshift({
        dag,
        prompthash: PROMPT_HASH,
        onderwerp: { soort: onderwerp.soort, titel: onderwerp.titel, url: onderwerp.url },
        tokens,
        perTaal,
    });
    opslag.dagen = opslag.dagen.slice(0, BEWAAR_DAGEN);
    opslag.gegenereerd = new Date().toISOString();
    opslag.toelichting = 'Conceptposts voor de cockpit (marketing.html). DRAFT-FIRST: plaatsen doet een mens.';
    await fs.outputJson(bestand, opslag, { spaces: 1 });
    console.log(`✨ Posts voor ${dag} klaar: ${KANALEN.length} kanalen × ${TALEN.length} talen (${tokens} tokens).`);
}

main().catch(err => {
    console.error('💥 Postfabriek mislukt:', err);
    process.exit(1);
});
