const RSSParser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We gebruiken 'gemini-flash-latest' uit jouw lijst voor een stabielere quota
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Alleen de NU.nl Goed Nieuws feed
const FEEDS = [
    'https://www.nu.nl/rss/goed-nieuws'
];

async function processNews() {
    let allBrightNews = [];

    for (const url of FEEDS) {
        console.log(`\n\x1b[36m%s\x1b[0m`, `--- Bron: ${url} ---`);
        try {
            const feed = await parser.parseURL(url);

            // We pakken de 10 nieuwste artikelen
            for (const item of feed.items.slice(0, 10)) {
                console.log(`Analyse: ${item.title.substring(0, 60)}...`);

                const prompt = `
                    Je bent de redacteur van Bright News. Analyseer dit bericht:
                    Titel: "${item.title}"
                    Beschrijving: "${item.contentSnippet || ''}"
                    
                    Vraag: Is dit positief of hoopgevend? 
                    Antwoord strikt in JSON: {"isBright": true, "summary": "Korte NL samenvatting max 15 woorden"}
                `;

                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text().replace(/```json|```/g, "").trim();
                    const aiResponse = JSON.parse(text);

                    if (aiResponse.isBright) {
                        console.log(`  ✅ Bright News!`);
                        allBrightNews.push({
                            date: new Date().toISOString(),
                            link: item.link,
                            title: aiResponse.summary
                        });
                    } else {
                        console.log(`  ❌ Filter: Niet positief genoeg.`);
                    }
                } catch (err) {
                    // Hier printen we nu de ECHTE foutmelding voor debugging
                    console.error(`  ⚠️ AI Fout: ${err.message.substring(0, 100)}`);

                    if (err.message.includes("429")) {
                        console.log("  (Quota bereikt, we wachten 30 seconden...)");
                        await sleep(30000);
                    }
                }

                // Altijd 4 seconden wachten om de 429-fout te voorkomen
                await sleep(4000);
            }
        } catch (err) {
            console.error(`Kon feed niet laden: ${err.message}`);
        }
    }

    if (allBrightNews.length > 0) {
        await fs.ensureDir('./data');
        await fs.outputJson('./data/news_nl.json', allBrightNews, { spaces: 2 });
        console.log(`\n\x1b[32mKlaar! ${allBrightNews.length} artikelen opgeslagen in news_nl.json\x1b[0m`);
    } else {
        console.log("\nGeen nieuwe artikelen kunnen verwerken.");
    }
}

processNews();