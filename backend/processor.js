const RSSParser = require('rss-parser');
const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const FEEDS = [
    'https://www.nu.nl/rss/goed-nieuws',
    'https://www.positive.news/feed/',
    'https://www.optimist.nl/feed/'
];

async function processNews() {
    let languages = { nl: [], en: [], de: [], fr: [], es: [] };
    console.log("🚀 Bright News Engine (Mistral Edition) start...");

    for (const url of FEEDS) {
        try {
            console.log(`\n📡 Scannen: ${url}`);
            const feed = await parser.parseURL(url);

            for (const item of feed.items.slice(0, 3)) { // Top 3 per bron
                console.log(`   🧐 Analyse: ${item.title.substring(0, 50)}...`);

                try {
                    const chatResponse = await client.chat.complete({
                        model: 'mistral-small-latest',
                        messages: [{
                            role: 'user',
                            content: `Is dit positief nieuws? "${item.title}". 
                            Zo ja, vertaal kort naar NL, EN, DE, FR en ES.
                            Antwoord ALTIJD en ALLEEN met dit JSON formaat:
                            {"isBright": true, "nl": "...", "en": "...", "de": "...", "fr": "...", "es": "..."}
                            Indien niet positief: {"isBright": false}`
                        }],
                        responseFormat: { type: 'json_object' } // Dwingt JSON af
                    });

                    const data = JSON.parse(chatResponse.choices[0].message.content);

                    if (data.isBright) {
                        console.log("      ✅ Succes! Mistral heeft het vertaald.");
                        Object.keys(languages).forEach(lang => {
                            languages[lang].push({
                                title: data[lang],
                                link: item.link,
                                date: new Date().toISOString()
                            });
                        });
                    } else {
                        console.log("      ❌ Overgeslagen.");
                    }
                } catch (aiErr) {
                    console.error("      ⚠️ Mistral Fout:", aiErr.message);
                }
            }
        } catch (feedErr) {
            console.error(`   ❌ Kon feed niet laden.`);
        }
    }

    // Opslaan naar de data map
    for (const [lang, items] of Object.entries(languages)) {
        await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
    }
    console.log("\n✨ De Franse slag werkt! Je JSON bestanden zijn gevuld.");
}

processNews();