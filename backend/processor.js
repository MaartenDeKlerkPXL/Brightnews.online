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
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
        "https://unsplash.com/s/photos/tech",
        "https://unsplash.com/photos/central-computer-processors-cpu-concept-3d-renderingconceptual-image-_LIZ36OHGKk",
        "https://unsplash.com/photos/3d-illustration-computer-chip-a-processor-on-a-printed-circuit-board-the-concept-of-data-transfer-to-the-cloud-central-processor-in-the-form-of-artificial-intelligence-data-transfer-g6Nom1uBz6M",
        "https://unsplash.com/photos/teal-led-panel-EUsVwEOsblE",
        "https://unsplash.com/photos/programming-code-abstract-technology-background-of-software-developer-and-computer-script-ltpb_WinC3Y",
        "https://unsplash.com/photos/black-circuit-board-tmTidmpILWw",
        "https://unsplash.com/photos/cpu-semiconductor-technology-background-3d-illustration-oLpE1QsXXqU",
        "https://unsplash.com/photos/red-and-black-abstract-illustration-aQYgUYwnCsM"
    ],
    'Health': [
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
        "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
        "https://unsplash.com/photos/woman-walking-on-pathway-during-daytime-mNGaaLeWEp0",
        "https://unsplash.com/photos/four-person-hands-wrap-around-shoulders-while-looking-at-sunset-PGnqT0rXWLs",
        "https://unsplash.com/photos/person-wearing-orange-and-gray-nike-shoes-walking-on-gray-concrete-stairs-PHIgYUGQPvU",
        "https://unsplash.com/photos/girl-in-blue-jacket-holding-red-and-silver-ring-Y-3Dt0us7e0",
        "https://unsplash.com/photos/a-group-of-white-boxes-with-black-text-on-a-wooden-surface-Tuy2n9md0AI"
    ],
    'Science': [
        "https://unsplash.com/photos/water-droplets-on-glass-during-daytime-Mm1VIPqd0OA",
        "https://unsplash.com/photos/purple-and-pink-plasma-ball-OgvqXGL7XO4",
        "https://unsplash.com/photos/three-clear-beakers-placed-on-tabletop-lQGJCMY5qcM",
        "https://unsplash.com/photos/a-close-up-of-a-blue-light-in-the-dark-G66K_ERZRhM",
        "https://unsplash.com/photos/refill-of-liquid-on-tubes-pwcKF7L4-no",
        "https://unsplash.com/photos/water-droplets-on-a-surface-5nI9N2wNcBU",
        "https://unsplash.com/photos/a-blue-abstract-background-with-lines-and-dots-pREq0ns_p_E"
    ],
    'Lifestyle': [
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
        "https://unsplash.com/photos/photo-of-three-women-lifting-there-hands-tXiMrX3Gc-g",
        "https://unsplash.com/photos/man-wearing-white-shorts-holding-black-backpack-CihXnvELE00",
        "https://unsplash.com/photos/person-sitting-on-top-of-gray-rock-overlooking-mountain-during-daytime-z0nVqfrOqWA",
        "https://unsplash.com/photos/woman-on-hammock-near-to-river-KYTT8L5JLDs",
        "https://unsplash.com/photos/two-man-carrying-backpacks-during-daytime-M1aegHe2j6g",
        "https://unsplash.com/photos/man-sitting-on-chair-holding-phone-C2GI1fuoSQ8",
        "https://unsplash.com/photos/woman-wearing-white-sweater-carrying-a-daughter-YLMs82LF6FY",
        "https://unsplash.com/photos/person-holding-ballpoint-pen-writing-on-notebook-505eectW54k"
    ],
    'Environment': [
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
        "https://unsplash.com/photos/sunflower-field-pF_2lrjWiJE",
        "https://unsplash.com/photos/aerial-view-of-grass-mountains-x1w_Q78xNEY",
        "https://unsplash.com/photos/windmill-on-grass-field-during-golden-hour-0w-uTa0Xz7w",
        "https://unsplash.com/photos/selective-photography-of-green-leaf-plant-Rfflri94rs8",
        "https://unsplash.com/photos/green-plant-x8ZStukS2PM",
        "https://unsplash.com/photos/white-windmills-on-green-grass-field-under-white-clouds-and-blue-sky-ZKWgoRUYuMk",
        "https://unsplash.com/photos/landscape-photography-of-black-mountain-fecsiuPSJsc",
        "https://unsplash.com/photos/aerial-photo-of-wind-turbines-near-field-B09tL5bSQJk",
        "https://unsplash.com/photos/worms-eye-view-of-forest-during-day-time-19SC2oaVZW0",
        "https://unsplash.com/photos/green-grass-field-during-sunset-_RBcxo9AU-U"
    ],
    'Finance': [
        "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80",
        "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
        "https://unsplash.com/photos/person-in-black-suit-jacket-holding-white-tablet-computer-nApaSgkzaxg",
        "https://unsplash.com/photos/laptop-computer-on-glass-top-table-hpjSkU2UYSU",
        "https://unsplash.com/photos/person-holding-paper-near-pen-and-calculator-xoU52jUVUXA",
        "https://unsplash.com/photos/stacked-round-gold-colored-coins-on-white-surface-OApHds2yEGQ",
        "https://unsplash.com/photos/black-and-silver-laptop-computer-IrRbSND5EUc",
        "https://unsplash.com/photos/a-person-stacking-coins-on-top-of-a-table-jpqyfK7GB4w",
        "https://unsplash.com/photos/person-using-macbook-pro-on-table-amLfrL8LGls",
        "https://unsplash.com/photos/business-visual-data-analyzing-technology-by-creative-computer-software-ZJKfQ8Ber7E",
        "https://unsplash.com/photos/pink-pig-figurine-on-white-surface-pElSkGRA2NU",
        "https://unsplash.com/photos/black-android-smartphone-near-ballpoint-pen-tax-withholding-certificate-on-top-of-white-folder-M98NRBuzbpc",
        "https://unsplash.com/photos/pink-pig-coin-bank-on-brown-wooden-table-5OUMf1Mr5pU"
    ],
    'General': [
        "https://unsplash.com/photos/vintage-teal-typewriter-beside-book-jLwVAUtLOAQ",
        "https://unsplash.com/photos/half-moon-shines-brightly-in-the-blue-sky-UD0DV4VDpN8",
        "https://unsplash.com/photos/a-close-up-of-a-red-flower-with-a-blurry-background-5DrARooH5Dk",
        "https://unsplash.com/photos/a-mountain-range-with-a-body-of-water-in-the-foreground-akXi4v25wFw",
        "https://unsplash.com/photos/sea-waves-on-brown-sand-during-daytime-echUCa-GuFY",
        "https://unsplash.com/photos/birds-eye-view-of-dock-on-body-of-water-u6JASMpSHZU",
        "https://unsplash.com/photos/a-small-airplane-soars-through-a-bright-blue-sky-wy0ayhx8g6s",
        "https://unsplash.com/photos/a-view-of-a-city-with-white-buildings-AYB3NosOARk"
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

    for (const feedInfo of FEEDS) {
        try {
            console.log(`📡 Scannen: ${feedInfo.name}`);
            const feed = await parser.parseURL(feedInfo.url);

            for (const item of feed.items.slice(0, 5)) {
                if (languages.nl.some(art => art.link === item.link)) {
                    continue;
                }

                console.log(`🧠 Analyseren: ${item.title}`);

                // 2. Uitgebreide Afbeelding Scraper met BBC Fix
                let foundUrl =
                    item.enclosure?.url ||
                    item.media?.content?.$?.url ||
                    item.media?.thumbnail?.$?.url ||
                    (item.contentEncoded?.match(/src="([^"]+)"/)?.[1]) ||
                    (item.content?.match(/src="([^"]+)"/)?.[1]) ||
                    (item.description?.match(/src="([^"]+)"/)?.[1]) ||
                    null;

                if (foundUrl) {
                    // BBC Thumbnail Kwaliteit Fix
                    if (foundUrl.includes('ychef.files.bbci.co.uk')) {
                        foundUrl = foundUrl.replace(/\/\d+x\d+\//, '/800x450/');
                    }

                    const isHtml = foundUrl.toLowerCase().split('?')[0].endsWith('.html');
                    const isVideo = foundUrl.toLowerCase().includes('player') || foundUrl.toLowerCase().includes('video');
                    const isTooSmall = foundUrl.includes('144x81') || foundUrl.includes('150x150');

                    if (isHtml || isVideo || isTooSmall) {
                        foundUrl = null;
                    }
                }

                try {
                    const chatResponse = await client.chat.complete({
                        model: 'mistral-small-latest',
                        messages: [{
                            role: 'user',
                            content: `Analyseer dit nieuws: "${item.title} - ${item.contentSnippet}". 
                                    Als het zeer positief is, schrijf een inspirerend artikel (300 woorden). 
                                    Classificeer in: Tech, Health, Science, Lifestyle, Environment, of Finance.
                                    Antwoord in JSON: {"isBright": true, "category": "...", "nl": {"t": "..", "s": ".."}, "en": {...}, ...}`
                        }],
                        responseFormat: { type: 'json_object' }
                    });

                    const data = verwerkAIResponse(chatResponse.choices[0].message.content);

                    if (data && data.isBright) {
                        const category = data.category || 'General';
                        const articleId = Date.now() + Math.random().toString(36).substr(2, 9);

                        // 3. Slimme Anti-Dubbel Fallback Logica
                        let finalImage = foundUrl;

                        if (!finalImage) {
                            const fallbackLijst = categoryFallbacks[category] || categoryFallbacks['General'];
                            // Kijk welke afbeeldingen al in de huidige data staan
                            const gebruikteImages = languages.nl.map(a => a.image);
                            // Filter de lijst: pak alleen foto's die we nog NIET gebruiken
                            let uniekeOpties = fallbackLijst.filter(img => !gebruikteImages.includes(img));

                            // Als alles al een keer gebruikt is, reset de lijst
                            if (uniekeOpties.length === 0) uniekeOpties = fallbackLijst;

                            finalImage = uniekeOpties[Math.floor(Math.random() * uniekeOpties.length)];
                        }

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