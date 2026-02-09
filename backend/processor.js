const RSSParser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Voeg hier zoveel feeds toe als je wilt!
const FEEDS = [
    'https://www.nu.nl/rss/goed-nieuws',
    'http://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.positive.news/feed/'
];

async function processNews() {
    let languages = {
        nl: [], en: [], fr: [], de: [], es: [] // 'es' toegevoegd
    };

    const seenLinks = new Set(); // Om dubbele artikelen te voorkomen

    for (const url of FEEDS) {
        console.log(`\n--- Scannen: ${url} ---`);
        try {
            const feed = await parser.parseURL(url);

            for (const item of feed.items.slice(0, 5)) {
                if (seenLinks.has(item.link)) continue;
                seenLinks.add(item.link);

                console.log(`Analyse: ${item.title.substring(0, 50)}...`);

                const prompt = `
        Analyseer dit bericht: "${item.title}"
        Is dit positief of hoopgevend? 
        Zo ja, maak een samenvatting (max 15 woorden) in 5 talen.
        Antwoord strikt in JSON: 
        {"isBright": true, "nl": "..", "en": "..", "fr": "..", "de": "..", "es": ".."}
        Indien niet positief: {"isBright": false}
    `;

                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const data = JSON.parse(response.text().replace(/```json|```/g, "").trim());

                    if (data.isBright) {
                        console.log("  ✅ Toegevoegd in 4 talen!");
                        // Voeg de vertaling toe aan de juiste lijst
                        Object.keys(languages).forEach(lang => {
                            languages[lang].push({
                                date: new Date().toISOString(),
                                title: data[lang],
                                link: item.link
                            });
                        });
                    }
                } catch (err) {
                    console.error("  ⚠️ Overslaan wegens fout of limiet.");
                }
                await sleep(6000); // Respecteer de rate limit
            }
        } catch (err) {
            console.error(`  ❌ Feed kon niet worden geladen.`);
        }
    }

    // Sla voor elke taal een apart bestand op
    for (const [lang, news] of Object.entries(languages)) {
        await fs.outputJson(`./data/news_${lang}.json`, news, { spaces: 2 });
    }

    console.log(`\n🚀 Klaar! Bestanden bijgewerkt voor NL, EN, FR en DE.`);
}

processNews();