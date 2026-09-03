const RSSParser = require('rss-parser');
const { Mistral } = require('@mistralai/mistralai');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const Sentiment = require('sentiment');
require('dotenv').config();

// customFields is essentieel: zonder deze mapping leest rss-parser
// media:content, media:thumbnail en content:encoded helemaal niet uit,
// waardoor vrijwel elk artikel op een Unsplash-fallbackfoto terugviel
// (gemeten: 132 van de 150 artikelen).
const parser = new RSSParser({
    customFields: {
        item: [
            ['media:content', 'media:content', { keepArray: true }],
            ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
            ['content:encoded', 'contentEncoded'],
        ],
    },
});
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const sentiment = new Sentiment();

// media:content/media:thumbnail komen (met keepArray) als lijst van objecten
// met de XML-attributen in .$ — pak de eerste met een bruikbare url.
function pakMediaUrl(veld) {
    if (!veld) return null;
    const lijst = Array.isArray(veld) ? veld : [veld];
    for (const m of lijst) {
        const url = m?.$?.url || m?.url;
        if (typeof url === 'string' && url.startsWith('http')) return url;
    }
    return null;
}

// Laatste redmiddel voor een echte foto: og:image van de artikelpagina zelf.
// Alleen aangeroepen voor al geaccepteerde artikelen zonder feed-afbeelding
// (max. een handvol fetches per run). Realistische User-Agent: sommige CDN's
// (o.a. Cloudflare) weigeren kale bot-agents.
async function haalOgImage(pageUrl) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(pageUrl, {
            signal: ctrl.signal,
            redirect: 'follow',
            // Volledige browser-UA: o.a. NPR weigert kale bot-agents (getest).
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const html = (await res.text()).slice(0, 200000);
        const m = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        return m && m[1].startsWith('http') ? m[1] : null;
    } catch {
        return null;
    }
}

function wacht(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry met exponentiële backoff rond de Mistral-call (429/timeout/netwerk).
async function mistralMetRetry(params, pogingen = 3) {
    for (let i = 0; i < pogingen; i++) {
        try {
            return await client.chat.complete(params);
        } catch (err) {
            if (i === pogingen - 1) throw err;
            const delay = 2000 * Math.pow(2, i);
            console.warn(`⏳ Mistral-fout (${err.message}), nieuwe poging over ${delay}ms`);
            await wacht(delay);
        }
    }
}

// Nodig om de volledige artikeltekst apart van de publieke JSON op te slaan
// (echte paywall, Fase 1.4). SUPABASE_SERVICE_ROLE_KEY moet als GitHub Secret
// staan; lokaal kan hij in .env. Zonder deze key wordt alleen de teaser
// geschreven en NIET de volledige tekst (geen stille paywall-omzeiling).
const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
if (!supabaseAdmin) {
    // Zonder key zou de teaser wél gepubliceerd worden maar de volledige tekst
    // nérgens bewaard blijven (de AI-output bestaat daarna niet meer) — premium-
    // lezers krijgen dat artikel dan voorgoed alleen als teaser. Hard afbreken
    // is veiliger dan half publiceren.
    console.error('💥 SUPABASE_SERVICE_ROLE_KEY ontbreekt — run afgebroken.');
    process.exit(1);
}

// --- Selectiestap (reviewbesluit 2026-09-02) ---------------------------------
// De prompt die bepaalt welke artikelen BrightNews haalt staat in het los
// bewerkbare backend/selectie-prompt.md (criteria: goed gevoel, positieve
// formulering, maatschappelijk relevant of persoonlijke touch). ITEREREN:
// pas dat bestand aan, start de Action handmatig (Actions → Run workflow) en
// beoordeel daarna data/selectie-log.json — daar staat per item de beslissing
// mét deelscores en reden, ook van de afwijzingen.
// De drempels hieronder zijn de code-kant van dezelfde regel als in de prompt
// (de som wordt hier zelf berekend; het model hoeft niet te kunnen rekenen).
const SELECTIE_DREMPEL_TOTAAL = 7;
const SELECTIE_MINIMA = { gevoel: 2, formulering: 2, relevantie: 2 };
const SELECTIE_LOG_MAX = 300;
const selectiePromptSjabloon = require('fs').readFileSync(
    require('path').join(__dirname, 'selectie-prompt.md'), 'utf8');
// Hash van de promptversie: door de selectie afgewezen items ('sel') krijgen
// automatisch een herkansing zodra de prompt wijzigt — anders zou elke
// promptiteratie alleen op gloednieuwe items te toetsen zijn. De versie van
// schoonSnippet telt mee: ook een wijziging in de opschoning verandert wat
// het model te zien krijgt en verdient dus een herkansing.
const SNIPPET_SCHOON_VERSIE = 'snippet-schoon-v1';
const SELECTIE_PROMPT_HASH = require('crypto')
    .createHash('md5').update(selectiePromptSjabloon)
    .update(SNIPPET_SCHOON_VERSIE).digest('hex').slice(0, 8);

// WordPress-feeds (o.a. GoodNewsNetwork) sluiten contentSnippet af met
// "The post <titel> appeared first on <bron>." — het selectiemodel las dat
// als commerciële zelfpromotie en wees daardoor kernmateriaal af (run
// 2026-09-02: kat-stationschef, 0/10 "commerciële promotie van Good News
// Network"). Trailer strippen vóór sentiment, selectie én samenvatting.
function schoonSnippet(tekst) {
    return String(tekst ?? '')
        .replace(/\s*The post [\s\S]{0,300}? appeared first on [^.]{0,120}\.?\s*$/, '')
        .trim();
}

function bouwSelectiePrompt(item) {
    return selectiePromptSjabloon
        .replace('{TITEL}', String(item.title ?? '').slice(0, 300))
        .replace('{TEKST}', String(item.contentSnippet ?? '').slice(0, 1200));
}

// Welk model de selectie doet. mistral-small bleek als beoordelaar te
// wispelturig: runs van 2026-09-02/03 gaven op identieke items totaal
// verschillende scores (Pokémon-item: 8 → 0 → 0, zelfs mét dat item als
// ijkvoorbeeld ín de prompt). medium is de middenweg tussen kwaliteit en
// kosten (~66 calls × ~1,5k tokens per run).
const SELECTIE_MODEL = 'mistral-medium-latest';

// Beoordeelt één item met de selectieprompt. Retourneert { geschikt, log }.
// Bij een onbruikbare AI-respons wordt het item afgewezen-voor-nu maar NIET
// in seenLinks gezet, zodat het de volgende run een nieuwe kans krijgt.
async function selecteerItem(item, statistieken) {
    const antwoord = await mistralMetRetry({
        model: SELECTIE_MODEL,
        // temperature 0: een beoordelaar hoort deterministisch te zijn;
        // met de default-temperatuur zwalkten scores tussen runs.
        temperature: 0,
        messages: [{ role: 'user', content: bouwSelectiePrompt(item) }],
        responseFormat: { type: 'json_object' }
    });
    statistieken.aiCalls++;
    statistieken.aiTokens += antwoord.usage?.totalTokens ?? 0;
    const data = verwerkAIResponse(antwoord.choices[0].message.content);
    if (!data) return { geschikt: false, herkansing: true, log: null };

    const scores = {
        gevoel: Number(data.gevoel) || 0,
        formulering: Number(data.formulering) || 0,
        relevantie: Number(data.relevantie) || 0,
    };
    const totaal = scores.gevoel + scores.formulering + scores.relevantie;
    // Het besluit volgt volledig uit de scores; het model scoort en motiveert
    // alleen. Een eigen "besluit"-veld van het model woog eerder mee en
    // veto'de op 2026-09-02 een 3/3/2-item met de rekenfout "relevantie is
    // te laag (2)" — terwijl de regel relevantie ≥ 2 eiste.
    const geschikt = totaal >= SELECTIE_DREMPEL_TOTAAL
        && Object.entries(SELECTIE_MINIMA).every(([k, min]) => scores[k] >= min);
    return {
        geschikt,
        herkansing: false,
        log: {
            datum: new Date().toISOString(),
            bron: item.bronNaam ?? null,
            titel: String(item.title ?? '').slice(0, 140),
            ...scores,
            totaal,
            besluit: geschikt ? 'ja' : 'nee',
            reden: String(data.reden ?? '').slice(0, 200),
        },
    };
}

function maakTeaser(tekst, maxWoorden = 60) {
    if (!tekst) return '';
    const woorden = tekst.split(' ');
    if (woorden.length <= maxWoorden) return tekst;
    return woorden.slice(0, maxWoorden).join(' ') + '...';
}

const FEEDS = [
    { name: 'Positive.News', url: 'https://www.positive.news/feed/' },
    { name: 'GoodNewsNetwork.org', url: 'https://www.goodnewsnetwork.org/category/news/feed/' },
    { name: 'CNTraveler.com', url: 'https://www.cntraveler.com/feed/rss' },
    { name: 'Adventure-Journal.com', url: 'https://www.adventure-journal.com/feed/' },
    { name: 'Bright.nl', url: 'https://www.bright.nl/rss' },
    { name: 'BusinessInsider.com', url: 'https://www.businessinsider.com/rss' },
    { name: 'Barefeetinthekitchen.com', url: 'https://barefeetinthekitchen.com/feed' },
    { name: 'Nature.com', url: 'https://www.nature.com/nature.rss' },
    { name: 'Goingzerowaste.com', url: 'https://www.goingzerowaste.com/feed/' },
    { name: 'Newatlas.com', url: 'https://newatlas.com/index.rss' },
    { name: 'Ww2.kqed.org/mindshift', url: 'https://ww2.kqed.org/mindshift/feed/' },
    { name: 'Onbetterliving.com', url: 'https://onbetterliving.com/feed/' },
    { name: 'Wellnessblogster.nl', url: 'https://wellnessblogster.nl/feed/' },
    { name: 'BBC.com/culture', url: 'https://www.bbc.com/culture/feed.rss' },
    { name: 'Openaccessgovernment.org', url: 'https://www.openaccessgovernment.org/category/open-access-news/research-innovation-news/feed/' },
    { name: 'PBS.org', url: 'https://www.pbs.org/wnet/nature/blog/feed/' },
    { name: 'Earth911.com', url: 'https://earth911.com/feed/' },
    { name: 'Theecologist.org', url: 'https://theecologist.org/whats_new/feed' },
    { name: 'Environmentuk.net', url: 'https://www.environmentuk.net/index.php?format=feed&type=rss' },
    { name: 'Ourculturemag.com', url: 'https://ourculturemag.com/feed/' },
    { name: 'Honeygood.com', url: 'https://www.honeygood.com/feed/' },
    { name: 'Addicted2success.com', url: 'https://addicted2success.com/feed/' },
    { name: 'Positivityguides.net', url: 'https://www.positivityguides.net/feed/' },
    { name: 'Sciencenews.org', url: 'https://www.sciencenews.org/feed' },
    { name: 'NPR.org', url: 'https://feeds.npr.org/1007/rss.xml' },
    { name: 'Dumblittleman.com', url: 'https://www.dumblittleman.com/feed/' },
    { name: 'Lifeoptimizer.org', url: 'https://www.lifeoptimizer.org/blog/feed/' },
    { name: 'Lifehack.org', url: 'https://www.lifehack.org/feed' },
    { name: 'Hackslifestyle.com', url: 'https://hackslifestyle.com/feed/' },
    { name: 'Happierhuman.com', url: 'https://www.happierhuman.com/feed/' },
    { name: 'Mindbodygreen.com', url: 'https://www.mindbodygreen.com/rss/featured.xml' },
    { name: 'Fortune.com', url: 'https://fortune.com/feed/fortune-feeds/?id=3230629' },
    { name: 'GFmag.com', url: 'https://gfmag.com/feed/' },
];

// 1. Categorie-specifieke Unsplash lijsten
const categoryFallbacks = {
    'Tech': [
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
        "https://images.unsplash.com/photo-1576400883215-7083980b6193",
        "https://images.unsplash.com/photo-1580584126903-c17d41830450"
    ],
    'Health': [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
        "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
        // "https://unsplash.com/photos/woman-walking-on-pathway-during-daytime-mNGaaLeWEp0",
        // "https://unsplash.com/photos/four-person-hands-wrap-around-shoulders-while-looking-at-sunset-PGnqT0rXWLs",
        // "https://unsplash.com/photos/person-wearing-orange-and-gray-nike-shoes-walking-on-gray-concrete-stairs-PHIgYUGQPvU",
        // "https://unsplash.com/photos/girl-in-blue-jacket-holding-red-and-silver-ring-Y-3Dt0us7e0",
        // "https://unsplash.com/photos/a-group-of-white-boxes-with-black-text-on-a-wooden-surface-Tuy2n9md0AI"
    ],
    'Science': [
        "https://images.unsplash.com/photo-1554475901-4538ddfbccc2?w=800&q=80", // OgvqXGL7XO4
        "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80", // lQGJCMY5qcM
        "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&q=80", // 5nI9N2wNcBU
        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80", // Modern laboratorium
        "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80", // Sterrenstelsel / Ruimtevaart
        // "https://unsplash.com/photos/water-droplets-on-glass-during-daytime-Mm1VIPqd0OA",
        // "https://unsplash.com/photos/purple-and-pink-plasma-ball-OgvqXGL7XO4",
        // "https://unsplash.com/photos/three-clear-beakers-placed-on-tabletop-lQGJCMY5qcM",
        // "https://unsplash.com/photos/a-close-up-of-a-blue-light-in-the-dark-G66K_ERZRhM",
        // "https://unsplash.com/photos/refill-of-liquid-on-tubes-pwcKF7L4-no",
        // "https://unsplash.com/photos/water-droplets-on-a-surface-5nI9N2wNcBU",
        // "https://unsplash.com/photos/a-blue-abstract-background-with-lines-and-dots-pREq0ns_p_E"
    ],
    'Lifestyle': [
        "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&q=80", // tXiMrX3Gc-g
        "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=80", // CihXnvELE00
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", // z0nVqfrOqWA
        "https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?w=800&q=80", // KYTT8L5JLDs
        "https://images.unsplash.com/photo-1464998857633-50e59fbf2fe6?w=800&q=80", // M1aegHe2j6g
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80", // C2GI1fuoSQ8
        // "https://unsplash.com/photos/photo-of-three-women-lifting-there-hands-tXiMrX3Gc-g",
        // "https://unsplash.com/photos/man-wearing-white-shorts-holding-black-backpack-CihXnvELE00",
        // "https://unsplash.com/photos/person-sitting-on-top-of-gray-rock-overlooking-mountain-during-daytime-z0nVqfrOqWA",
        // "https://unsplash.com/photos/woman-on-hammock-near-to-river-KYTT8L5JLDs",
        // "https://unsplash.com/photos/two-man-carrying-backpacks-during-daytime-M1aegHe2j6g",
        // "https://unsplash.com/photos/man-sitting-on-chair-holding-phone-C2GI1fuoSQ8",
        // "https://unsplash.com/photos/woman-wearing-white-sweater-carrying-a-daughter-YLMs82LF6FY",
        "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e"
    ],
    'Environment': [
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    ],
    'Finance': [
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
        "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80", // Groeiend plantje uit munten
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80", // Professionele financiële koersgrafieken
        "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&q=80", // Stapels munten en goudstukken (Rijkdom)
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80", // Business data en grafieken op een scherm
        "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=800&q=80", // Een spaarvarken in het zonlicht (Besparingen)
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80"  // Moderne boekhouding en rekenmachine (Overzicht)

    ],
    'General': [
        "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80", // Prachtige zonsopgang
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80", // Kleurrijk landschap / Natuur
        "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=800&q=80", // Zonnig strand / Vakantiegevoel
        "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800&q=80"  // Blauwe lucht met witte wolken
    ]
};

function verwerkAIResponse(rawText) {
    try {
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (err) {
        console.error("❌ JSON Parse Fout:", err.message);
        return null;
    }
}

async function processNews() {
    console.log("🚀 Starten met nieuws ophalen...");
    let languages = { nl: [], en: [], de: [], fr: [], es: [] };

    for (const lang of Object.keys(languages)) {
        try {
            languages[lang] = await fs.readJson(`./data/news_${lang}.json`);
        } catch {
            languages[lang] = [];
        }
    }

    // Persistent geheugen van beoordeelde links, los van de 150-cap in de
    // nieuws-JSON. Zonder dit werd elk item dat uit de actuele lijst was
    // gevallen (of eerder was afgewezen) bij elke run opnieuw door Mistral
    // beoordeeld — verreweg de grootste kostenpost van de pipeline.
    // Statussen: 'ok' (gepubliceerd), 'nee' (AI: niet positief),
    // 'sent' (sentiment-voorfilter). AI-fouten worden bewust NIET onthouden,
    // zodat die items de volgende run opnieuw geprobeerd worden.
    let seenLinks = {};
    try {
        seenLinks = await fs.readJson('./data/seen_links.json');
    } catch {
        // Bestand bestaat nog niet (eerste run met deze feature) — leeg starten.
    }

    // Selectie-log: de recentste beslissingen van de selectiestap (ook de
    // afwijzingen, mét reden) — het gereedschap om selectie-prompt.md
    // iteratief te verbeteren.
    let selectieLog = [];
    try {
        selectieLog = await fs.readJson('./data/selectie-log.json');
    } catch {
        // eerste run met deze feature
    }
    const nieuweSelectieLogs = [];

    const statistieken = {
        start: new Date().toISOString(),
        kandidaten: 0,
        alGezien: 0,
        tekstTeKort: 0,
        sentimentGeweigerd: 0,
        selectieAfgewezen: 0,
        aiCalls: 0,
        aiTokens: 0,
        afgewezen: 0,
        incompleet: 0,
        geaccepteerd: 0,
        opslaanMislukt: 0,
        feedFouten: 0,
    };
    function fixUnsplashUrl(url) {
        if (url?.includes('unsplash.com/photos/') && !url.includes('images.unsplash.com')) {
            const id = url.split('/').pop();
            return `https://images.unsplash.com/photo-${id}?w=800&q=80`;
        }
        return url;
    }

    for (const feedInfo of FEEDS) {
        try {
            console.log(`📡 Scannen: ${feedInfo.name}`);
            const feed = await parser.parseURL(feedInfo.url);

            for (const item of feed.items.slice(0, 30)) {
                if (!item.link) continue;
                statistieken.kandidaten++;

                const gezien = seenLinks[item.link];
                const herkansing = gezien?.s === 'sel' && gezien.p !== SELECTIE_PROMPT_HASH;
                if ((gezien && !herkansing) || languages.nl.some(art => art.link === item.link)) {
                    statistieken.alGezien++;
                    continue;
                }

                item.contentSnippet = schoonSnippet(item.contentSnippet);

                // Zonder brontekst valt er niets te selecteren én niets
                // bron-getrouw samen te vatten (Nature-feed: 22 van de 39
                // AI-calls op 2026-09-02 gingen naar snippetloze items die
                // allemaal op "geen inhoud" strandden). Direct overslaan,
                // zonder AI-call, en onthouden.
                if (item.contentSnippet.length < 25) {
                    seenLinks[item.link] = { s: 'leeg', t: new Date().toISOString() };
                    statistieken.tekstTeKort++;
                    continue;
                }

                // Goedkope voorfilter vóór de (betaalde) AI-call: duidelijk
                // negatieve items direct afwijzen. AFINN is Engelstalig —
                // niet-Engelse teksten scoren ~0 en gaan dus gewoon door naar
                // de AI (geen oneerlijke afwijzing van bijv. NL-items).
                const sentimentScore = sentiment.analyze(`${item.title || ''} ${item.contentSnippet || ''}`).score;
                if (sentimentScore <= -3) {
                    seenLinks[item.link] = { s: 'sent', t: new Date().toISOString() };
                    statistieken.sentimentGeweigerd++;
                    continue;
                }

                console.log(`🧠 Analyseren: ${item.title}`);

                // Selectiestap (los itereerbaar, zie selectie-prompt.md):
                // beoordeelt alleen — pas als het item dit haalt, volgt de
                // duurdere samenvattings-/vertaalstap hieronder.
                try {
                    await wacht(400);
                    item.bronNaam = feedInfo.name;
                    const selectie = await selecteerItem(item, statistieken);
                    if (selectie.log) nieuweSelectieLogs.push(selectie.log);
                    if (!selectie.geschikt) {
                        if (!selectie.herkansing) {
                            seenLinks[item.link] = { s: 'sel', t: new Date().toISOString(), p: SELECTIE_PROMPT_HASH };
                            statistieken.selectieAfgewezen++;
                        }
                        continue;
                    }
                } catch (selErr) {
                    // Niet in seenLinks: volgende run opnieuw proberen.
                    console.error(`❌ Selectie-fout:`, selErr.message);
                    continue;
                }

                // Afbeelding uit de feed halen. Volgorde: media:content →
                // enclosure → media:thumbnail → <img> in content:encoded/content.
                let foundUrl =
                    pakMediaUrl(item['media:content']) ||
                    item.enclosure?.url ||
                    pakMediaUrl(item['media:thumbnail']) ||
                    item.contentEncoded?.match(/<img[^>]+src="([^">]+)"/i)?.[1] ||
                    item.content?.match(/<img[^>]+src="([^">]+)"/i)?.[1] || null;

                if (foundUrl === "") foundUrl = null;

                if (foundUrl) {
                    if (foundUrl.includes('ychef.files.bbci.co.uk')) {
                        foundUrl = foundUrl.replace(/\/\d+x\d+\//, '/800x450/');
                    }

                    foundUrl = fixUnsplashUrl(foundUrl);

                    const lowUrl = foundUrl.toLowerCase();
                    const isHtml = lowUrl.split('?')[0].endsWith('.html');
                    const isVideo = lowUrl.includes('player') || lowUrl.includes('video');
                    const isSmall = lowUrl.includes('144x81') || lowUrl.includes('150x150');

                    if (isHtml || isVideo || isSmall) foundUrl = null;
                }

                try {
                    await wacht(500); // simpele rate limiting richting Mistral
                    statistieken.aiCalls++;
                    // Prompt bewust bron-getrouw (besluit review 2026-09-01):
                    // korte samenvatting op basis van wat de bron écht zegt,
                    // in plaats van een "artikel van minimaal 300 woorden" uit
                    // een snippet van twee zinnen (hallucinatierisico).
                    const chatResponse = await mistralMetRetry({
                        model: 'mistral-small-latest',
                        messages: [{
                            role: 'user',
                            content: `Beoordeel dit nieuwsitem: "${item.title} - ${item.contentSnippet}".
                Stap 1 — filter: is dit duidelijk positief, hoopgevend nieuws? Niets over oorlog, geweld, rampen, misdaad of verlies — ook niet zijdelings. Zo nee, antwoord exact {"isBright": false}.
                Stap 2 — alleen bij positief nieuws: schrijf per taal (nl, en, de, fr, es) een feitelijke, journalistieke samenvatting (veld "s") die UITSLUITEND gebruikt wat in de titel en tekst hierboven staat. Verzin of veronderstel NIETS: geen extra feiten, namen, cijfers, citaten, achtergronden of gevolgen die er niet letterlijk in de bron staan. Is de bron kort, houd de samenvatting dan ook kort — liever 60 bron-getrouwe woorden dan tekst aangevuld met verzinsels (maximaal ±150 woorden).
                Geef per taal ook: een pakkende titel "t" (zonder het woord "inspirerend", geen woorden langer dan 24 letters), een foto-alt-tekst "alt", een SEO-meta-beschrijving "meta_d" van max 155 tekens en relevante keywords "meta_k".
                Classificeer in: Tech, Health, Science, Lifestyle, Environment, of Finance.
                Antwoord in JSON: {"isBright": true, "category": "...", "nl": {"t": "..", "s": "..", "alt": "..", "meta_d": "..", "meta_k": ".."}, "en": {"t": "..", "s": "..", "alt": "..", "meta_d": "..", "meta_k": ".."}, "de": {"t": "..", "s": "..", "alt": "..", "meta_d": "..", "meta_k": ".."}, "fr": {"t": "..", "s": "..", "alt": "..", "meta_d": "..", "meta_k": ".."}, "es": {"t": "..", "s": "..", "alt": "..", "meta_d": "..", "meta_k": ".."}}`
                        }],
                        responseFormat: { type: 'json_object' }
                    });
                    statistieken.aiTokens += chatResponse.usage?.totalTokens ?? 0;

                    const data = verwerkAIResponse(chatResponse.choices[0].message.content);

                    if (data && !data.isBright) {
                        // Definitief afgewezen: onthouden zodat dit item niet
                        // elke run opnieuw een AI-call kost.
                        seenLinks[item.link] = { s: 'nee', t: new Date().toISOString() };
                        statistieken.afgewezen++;
                    }

                    // Cross-taal-validatie: alle 5 taalobjecten moeten compleet
                    // zijn vóór er ook maar íéts gepubliceerd wordt. Zonder deze
                    // check kon een ontbrekende taal halverwege het toevoegen
                    // crashen en liepen de taalbestanden blijvend uit de pas.
                    const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
                    const VELDEN = ['t', 's', 'alt', 'meta_d', 'meta_k'];
                    const compleet = data && data.isBright
                        && TALEN.every(l => data[l] && VELDEN.every(v => typeof data[l][v] === 'string' && data[l][v].trim().length > 0));

                    if (data && data.isBright && !compleet) {
                        // Niet in seenLinks: volgende run krijgt dit item een
                        // nieuwe kans op een complete AI-respons.
                        statistieken.incompleet++;
                        console.error(`⚠️ Incomplete AI-respons (taal/veld ontbreekt), artikel overgeslagen: ${item.title}`);
                    }

                    if (compleet) {
                        const category = data.category || 'General';
                        const articleId = Date.now() + Math.random().toString(36).substr(2, 9);

                        let finalImage = foundUrl;

                        // Geen feed-afbeelding? Probeer og:image van de
                        // artikelpagina (alleen voor geaccepteerde artikelen,
                        // dus hooguit een paar fetches per run).
                        if (!finalImage && /^https?:\/\//i.test(item.link)) {
                            finalImage = await haalOgImage(item.link);
                            if (finalImage) console.log(`🖼️ og:image gevonden voor: ${item.title}`);
                        }

                        if (!finalImage) {
                            const fallbackLijst = categoryFallbacks[category] || categoryFallbacks['General'];

                            // Check bestaande data op schijf + nieuw toegevoegde artikelen in deze run
                            const imagesOpSchijf = languages.nl.map(a => a.image);
                            const imagesInGeheugen = Object.values(languages).flat().map(a => a.image);
                            const alleGebruikteImages = [...imagesOpSchijf, ...imagesInGeheugen];

                            let uniekeOpties = fallbackLijst.filter(img => !alleGebruikteImages.includes(img));

                            if (uniekeOpties.length === 0) uniekeOpties = fallbackLijst;

                            finalImage = uniekeOpties[Math.floor(Math.random() * uniekeOpties.length)];
                        }

                        // Volledige tekst apart opslaan (alleen voor Premium-lezers
                        // op te vragen via get_full_article()). Eerst voor ÁLLE talen
                        // opslaan en pas daarna publiceren: mislukt één upsert, dan
                        // slaan we het hele artikel over — anders staat er een teaser
                        // online waarvan de volledige tekst nergens bewaard is.
                        // Let op: supabase-js gooit niet bij een DB-fout maar geeft
                        // { error } terug; die wordt hier dus expliciet gecheckt.
                        let opslaanGelukt = true;
                        for (const lang of Object.keys(languages)) {
                            try {
                                const { error } = await supabaseAdmin.from('articles_full').upsert({
                                    id: String(articleId),
                                    lang,
                                    full_text: data[lang].s
                                }, { onConflict: 'id,lang' });
                                if (error) throw new Error(error.message);
                            } catch (err) {
                                console.error(`❌ Kon volledige tekst niet opslaan (${lang}): ${err.message} — artikel overgeslagen.`);
                                opslaanGelukt = false;
                                break;
                            }
                        }
                        if (!opslaanGelukt) {
                            statistieken.opslaanMislukt++;
                            continue;
                        }

                        for (const lang of Object.keys(languages)) {
                            const volledigeTekst = data[lang].s;

                            languages[lang].unshift({
                                id: articleId,
                                title: data[lang].t,
                                summary: maakTeaser(volledigeTekst),
                                image_alt: data[lang].alt,
                                meta_description: data[lang].meta_d, // Toevoegen!
                                meta_keywords: data[lang].meta_k,    // Toevoegen!
                                link: item.link,
                                source: feedInfo.name,
                                image: finalImage,
                                date: new Date().toISOString(),
                                category: category
                            });
                            if (languages[lang].length > 150) languages[lang].pop();
                        }
                        seenLinks[item.link] = { s: 'ok', t: new Date().toISOString() };
                        statistieken.geaccepteerd++;
                        console.log(`✨ Succes: ${item.title} toegevoegd.`);
                    }
                } catch (aiErr) {
                    // Bewust niet in seenLinks: volgende run opnieuw proberen.
                    console.error(`❌ AI Fout:`, aiErr.message);
                }
            }
        } catch (feedErr) {
            statistieken.feedFouten++;
            console.error(`❌ Feed Fout:`, feedErr.message);
        }
    }

    console.log("💾 Opslaan...");
    for (const [lang, items] of Object.entries(languages)) {
        await fs.ensureDir('./data');
        await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
    }

    // seen_links begrenzen zodat het bestand niet eindeloos groeit:
    // bewaar de 8000 recentst beoordeelde links.
    const MAX_SEEN = 8000;
    const entries = Object.entries(seenLinks);
    if (entries.length > MAX_SEEN) {
        entries.sort((a, b) => String(b[1].t).localeCompare(String(a[1].t)));
        seenLinks = Object.fromEntries(entries.slice(0, MAX_SEEN));
    }
    await fs.outputJson('./data/seen_links.json', seenLinks, { spaces: 0 });

    selectieLog = [...nieuweSelectieLogs, ...selectieLog].slice(0, SELECTIE_LOG_MAX);
    await fs.outputJson('./data/selectie-log.json', selectieLog, { spaces: 1 });

    statistieken.einde = new Date().toISOString();
    await fs.outputJson('./data/last_run.json', statistieken, { spaces: 2 });
    console.log('📊 Run-statistieken:', JSON.stringify(statistieken));
}

async function main() {
    try {
        await processNews();
        process.exit(0);
    } catch (err) {
        // Zonder deze log toont het Action-log bij een topniveau-crash niets.
        console.error('💥 Run mislukt:', err);
        process.exit(1);
    }
}

main();