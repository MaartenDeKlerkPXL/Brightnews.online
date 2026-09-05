// AI-adapter met fallback-keten (besluit Erik 2026-09-05, "punt 1"): één
// aanspreekpunt voor alle AI-calls, met een provider-volgorde per rol. De
// storing van 2026-09-04 (Mistral wees account-breed alles af terwijl het
// dashboard groen stond) mag nooit meer drie dagen stilstand kosten: valt de
// primaire provider uit, dan neemt de volgende in de keten het over.
//
// Rollen i.p.v. modellen op de call-sites: de pipeline vraagt om 'selectie',
// 'schrijven' of 'vertalen'; wélk model dat doet is hier één regel config.
// - selectie:  goedkoop en deterministisch scoren (Claude Haiku 4.5, temp 0)
// - schrijven: de moederteksten die lezers zien (Claude Sonnet 5)
// - vertalen:  mechanisch werk (Claude Haiku 4.5, temp 0)
// Mistral staat als slapende fallback in de keten: alleen actief als er een
// MISTRAL_API_KEY in de omgeving staat (besluit 2026-09-05: geen PAYG, dus
// in de praktijk leeg tot er ooit een tweede provider wordt aangesloten).
const Anthropic = require('@anthropic-ai/sdk');
const { Mistral } = require('@mistralai/mistralai');

// Let op Sonnet 5: sampling-parameters (temperature e.d.) zijn daar door de
// API verwijderd en geven een 400 — daarom géén temperature bij 'schrijven'.
const CONFIG = {
    anthropic: {
        selectie: { model: 'claude-haiku-4-5', temperature: 0, maxTokens: 3000 },
        schrijven: { model: 'claude-sonnet-5', maxTokens: 4000 },
        vertalen: { model: 'claude-haiku-4-5', temperature: 0, maxTokens: 4000 },
    },
    mistral: {
        selectie: { model: 'mistral-medium-latest', temperature: 0, maxTokens: 3000 },
        schrijven: { model: 'mistral-medium-latest', maxTokens: 4000 },
        vertalen: { model: 'mistral-small-latest', temperature: 0, maxTokens: 4000 },
    },
};

const anthropicClient = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;
const mistralClient = process.env.MISTRAL_API_KEY
    ? new Mistral({ apiKey: process.env.MISTRAL_API_KEY })
    : null;

// Volgorde = fallback-keten. Alleen providers mét key doen mee.
const KETEN = [
    anthropicClient && 'anthropic',
    mistralClient && 'mistral',
].filter(Boolean);

function wacht(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Testhaak: een harness kan hier een neppe handler zetten zodat de hele
// pipeline-flow zonder netwerk of keys te testen is. Productie raakt dit niet.
let mockHandler = null;
function _setMockHandler(fn) { mockHandler = fn; }

async function callAnthropic(cfg, prompt) {
    const antwoord = await anthropicClient.messages.create({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
        messages: [{ role: 'user', content: prompt }],
    });
    return {
        tekst: antwoord.content.map(b => (b.type === 'text' ? b.text : '')).join(''),
        tokens: (antwoord.usage?.input_tokens ?? 0) + (antwoord.usage?.output_tokens ?? 0),
    };
}

async function callMistral(cfg, prompt) {
    const antwoord = await mistralClient.chat.complete({
        model: cfg.model,
        ...(cfg.temperature !== undefined ? { temperature: cfg.temperature } : {}),
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' },
    });
    return {
        tekst: antwoord.choices[0].message.content,
        tokens: antwoord.usage?.totalTokens ?? 0,
    };
}

const CALLERS = { anthropic: callAnthropic, mistral: callMistral };

// Eén AI-call: probeert de keten in volgorde, met per provider 3 pogingen
// (backoff 5s/10s). Retourneert { tekst, tokens, provider }; gooit pas als
// de héle keten faalt — de aanroeper beslist wat dat voor het item betekent
// (nooit in seenLinks; herkansing volgende run, zelfde patroon als altijd).
async function aiCall({ rol, prompt }) {
    if (mockHandler) return mockHandler({ rol, prompt });
    if (KETEN.length === 0) {
        throw new Error('Geen AI-provider geconfigureerd (ANTHROPIC_API_KEY ontbreekt).');
    }
    let laatsteFout = null;
    for (const provider of KETEN) {
        const cfg = CONFIG[provider][rol];
        if (!cfg) throw new Error(`Onbekende rol: ${rol}`);
        for (let poging = 0; poging < 3; poging++) {
            try {
                const resultaat = await CALLERS[provider](cfg, prompt);
                return { ...resultaat, provider };
            } catch (err) {
                laatsteFout = err;
                if (poging < 2) {
                    const delay = 5000 * Math.pow(2, poging);
                    console.warn(`⏳ ${provider}/${rol}-fout (${String(err.message).slice(0, 120)}), nieuwe poging over ${delay}ms`);
                    await wacht(delay);
                }
            }
        }
        console.error(`❌ Provider ${provider} faalt voor rol ${rol} — door naar de volgende in de keten.`);
    }
    throw laatsteFout;
}

// Robuuste JSON-parser voor modelantwoorden (herijking ronde 2, 2026-09-06):
// in de eerste Claude-run strandde ~30% van de schrijfcalls op ongeldig JSON
// — vooral letterlijke regeleindes bínnen strings (de alinea's van "lang")
// en losse tekst rond het object. Drie trappen: kaal parsen → eerste
// {...}-blok → regeleindes binnen strings escapen en opnieuw.
function repareerRegeleindes(s) {
    let uit = '';
    let inString = false;
    let escaped = false;
    for (const ch of s) {
        if (!inString) {
            if (ch === '"') inString = true;
            uit += ch;
            continue;
        }
        if (escaped) { uit += ch; escaped = false; continue; }
        if (ch === '\\') { uit += ch; escaped = true; continue; }
        if (ch === '"') { inString = false; uit += ch; continue; }
        if (ch === '\n') { uit += '\\n'; continue; }
        if (ch === '\r') { continue; }
        if (ch === '\t') { uit += '\\t'; continue; }
        uit += ch;
    }
    return uit;
}

function verwerkAIResponse(ruw) {
    const tekst = String(ruw ?? '').replace(/```(json)?/g, '').trim();
    try { return JSON.parse(tekst); } catch { /* volgende trap */ }
    const start = tekst.indexOf('{');
    const eind = tekst.lastIndexOf('}');
    if (start < 0 || eind <= start) return null;
    const kern = tekst.slice(start, eind + 1);
    try { return JSON.parse(kern); } catch { /* volgende trap */ }
    try { return JSON.parse(repareerRegeleindes(kern)); } catch (err) {
        console.error('❌ JSON Parse Fout (na reparatie):', err.message);
        return null;
    }
}

module.exports = { aiCall, KETEN, verwerkAIResponse, _setMockHandler };
