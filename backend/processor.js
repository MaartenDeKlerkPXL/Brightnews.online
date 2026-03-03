const RSSParser = require('rss-parser');
const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const FEEDS = [
    { name: 'Positive.News', url: 'https://www.positive.news/feed/' },
    { name: 'GoodNewsNetwork.org', url: 'https://www.goodnewsnetwork.org/category/news/feed/' },
    { name: 'CNTraveler.com', url: 'https://www.cntraveler.com/feed/rss' },
    { name: 'Adventure-Journal.com', url: 'https://www.adventure-journal.com/feed/' },
    { name: 'Bright.nl', url: 'https://www.bright.nl/rss' },
    { name: 'BusinessInsider.com', url: 'https://www.businessinsider.com/rss' },
    { name: 'Barefeetinthekitchen.com', url: 'barefeetinthekitchen.com/feed' },
    { name: 'Foxsports.com', url: 'https://api.foxsports.com/v2/content/optimized-rss?partnerKey=MB0Wehpmuj2lUhuRhQaafhBjAJqaPU244mlTDK1i&size=30' },
    { name: 'Nature.com', url: 'https://www.nature.com/nature.rss' },
    { name: 'Goingzerowaste.com', url: 'https://www.goingzerowaste.com/feed/' },
    { name: 'Newatlas.com', url: 'https://newatlas.com/index.rss' },
    { name: 'Ww2.kqed.org/mindshift', url: 'https://ww2.kqed.org/mindshift/feed/' },
    { name: 'Onbetterliving.com', url: 'https://onbetterliving.com/feed/' },
    { name: 'Wellnessblogster.nl', url: 'https://wellnessblogster.nl/feed/' },
    { name: 'Etonline.com', url: 'https://www.etonline.com/news/rss' },
    { name: 'Bbc.com/culture', url: 'https://www.bbc.com/culture/feed.rss' },
];

// 1. Categorie-specifieke Unsplash lijsten
const categoryFallbacks = {
    'Tech': [
        "https://images.https://images.unsplash.comphoto-1526374965328-7f61d4dc18c5?w=800&q=80",
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
        } catch (e) {
            languages[lang] = [];
        }
    }
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

            for (const item of feed.items.slice(0, 15)) {
                if (languages.nl.some(art => art.link === item.link)) {
                    continue;
                }

                console.log(`🧠 Analyseren: ${item.title}`);

                // 2. Uitgebreide Afbeelding Scraper met BBC Fix
                // 1. Uitgebreide Scraper
                let foundUrl =
                    item.media?.content?.$?.url ||
                    item['media:content']?.$?.url ||
                    item.enclosure?.url ||
                    item.contentEncoded?.match(/<img[^>]+src="([^">]+)"/i)?.[1] ||
                    item.description?.match(/<img[^>]+src="([^">]+)"/i)?.[1] ||
                    item.content?.match(/<img[^>]+src="([^">]+)"/i)?.[1] ||
                    item.media?.thumbnail?.$?.url || null;

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

// 2. Anti-Dubbel Fallback Logica
                let finalImage = foundUrl;

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

                try {
                    const chatResponse = await client.chat.complete({
                        model: 'mistral-small-latest',
                        messages: [{
                            role: 'user',
                            content: `Analyseer dit nieuws: "${item.title} - ${item.contentSnippet}". 
                                    Als het zeer positief is, schrijf een inspirerend artikel (300 woorden). 
                                    geen oorlog wat of iets wat er te maken zou kunnen hebben.
                                    Classificeer in: Tech, Health, Science, Lifestyle, Environment, of Finance.
                                    Antwoord in JSON: {"isBright": true, "category": "...", "nl": {"t": "..", "s": ".."}, "en": {...}, "de": {...}, "fr": {...}, "es": {...},`
                        }],
                        responseFormat: { type: 'json_object' }
                    });

                    const data = verwerkAIResponse(chatResponse.choices[0].message.content);

                    if (data && data.isBright) {
                        const category = data.category || 'General';
                        const articleId = Date.now() + Math.random().toString(36).substr(2, 9);

                        // 3. Slimme Anti-Dubbel Fallback Logica
                        // let finalImage = foundUrl;
                        //
                        // if (!finalImage) {
                        //     const fallbackLijst = categoryFallbacks[category] || categoryFallbacks['General'];
                        //     // Kijk welke afbeeldingen al in de huidige data staan
                        //     const gebruikteImages = languages.nl.map(a => a.image);
                        //     // Filter de lijst: pak alleen foto's die we nog NIET gebruiken
                        //     let uniekeOpties = fallbackLijst.filter(img => !gebruikteImages.includes(img));
                        //
                        //     // Als alles al een keer gebruikt is, reset de lijst
                        //     if (uniekeOpties.length === 0) uniekeOpties = fallbackLijst;
                        //
                        //     finalImage = uniekeOpties[Math.floor(Math.random() * uniekeOpties.length)];
                        // }

                        Object.keys(languages).forEach(lang => {
                            languages[lang].unshift({
                                id: articleId,
                                title: data[lang].t,
                                summary: data[lang].s,
                                link: item.link,
                                source: feedInfo.name,
                                image: finalImage,
                                date: new Date().toISOString(),
                                category: category
                            });
                            if (languages[lang].length > 50) languages[lang].pop();
                        });
                        console.log(`✨ Succes: ${item.title} toegevoegd.`);
                    }
                } catch (aiErr) {
                    console.error(`❌ AI Fout:`, aiErr.message);
                }
            }
        } catch (feedErr) {
            console.error(`❌ Feed Fout:`, feedErr.message);
        }
    }

    console.log("💾 Opslaan...");
    for (const [lang, items] of Object.entries(languages)) {
        await fs.ensureDir('./data');
        await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
    }
}

async function main() {
    try {
        await processNews();
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

main();