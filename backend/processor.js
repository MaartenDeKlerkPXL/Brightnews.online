const RSSParser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We gebruiken gemini-2.0-flash, die stond in jouw lijst en is razendsnel
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const FEEDS = [
    'https://www.nu.nl/rss/goed-nieuws',
    'https://www.positive.news/feed/',
    'https://www.optimist.nl/feed/'
];

async function processNews() {
    let languages = { nl: [], en: [], de: [], fr: [], es: [] };
    console.log("🚀 Bright News Engine v2.0 start...");

    for (const url of FEEDS) {
        try {
            console.log(`\n📡 Scannen: ${url}`);
            const feed = await parser.parseURL(url);

            for (const item of feed.items.slice(0, 3)) {
                console.log(`   🧐 Analyse: ${item.title.substring(0, 50)}...`);

                const prompt = `
                    Is dit nieuwsbericht positief? "${item.title}"
                    Zo ja, vertaal kort (max 12 woorden) naar NL, EN, DE, FR en ES.
                    Antwoord STRIKT in dit JSON formaat:
                    {"isBright": true, "nl": "...", "en": "...", "de": "...", "fr": "...", "es": "..."}
                    Indien niet positief: {"isBright": false}
                `;

                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text().replace(/```json|```/g, "").trim();
                    const data = JSON.parse(text);

                    if (data.isBright) {
                        console.log("      ✅ Succes! Toegevoegd.");
                        Object.keys(languages).forEach(lang => {
                            languages[lang].push({
                                title: data[lang],
                                link: item.link,
                                date: new Date().toISOString()
                            });
                        });
                    } else {
                        console.log("      ❌ Niet positief.");
                    }
                } catch (aiErr) {
                    console.error("      ⚠️ AI Fout:", aiErr.message);
                }
                await sleep(4000);
            }
        } catch (feedErr) {
            console.error(`   ❌ Kon feed niet laden.`);
        }
    }

    // Opslaan
    for (const [lang, items] of Object.entries(languages)) {
        await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
    }
    console.log("\n✨ Klaar! De JSON bestanden zijn gevuld.");
}

processNews();