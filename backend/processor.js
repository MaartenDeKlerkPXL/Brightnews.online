const RSSParser = require('rss-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const FEEDS = [
    'https://feeds.nos.nl/nosnieuwsalgemeen',
    'http://feeds.bbci.co.uk/news/rss.xml'
];

async function processNews() {
    let allBrightNews = [];

    for (const url of FEEDS) {
        console.log(`\x1b[36m%s\x1b[0m`, `Bezig met ophalen: ${url}`);
        try {
            const feed = await parser.parseURL(url);

            for (const item of feed.items.slice(0, 10)) { // We checken de top 10 voor meer kans op succes
                const prompt = `
                    Analyseer dit nieuwsbericht: "${item.title} - ${item.contentSnippet}"
                    Is dit positief, hoopgevend of constructief nieuws? 
                    Zo ja, maak een korte samenvatting (max 20 woorden) en vertaal deze naar NL, EN, DE, FR.
                    Antwoord strikt en uitsluitend in dit JSON formaat: 
                    {"isBright": true, "nl": "...", "en": "...", "de": "...", "fr": "..."}
                    Indien niet positief, antwoord dan: {"isBright": false}
                `;

                try {
                    const result = await model.generateContent(prompt);
                    let text = result.response.text();

                    // Schoonmaken van Gemini output (verwijdert eventuele markdown code blocks)
                    text = text.replace(/```json|```/g, "").trim();

                    const aiResponse = JSON.parse(text);

                    if (aiResponse.isBright) {
                        console.log(`✅ Bright News gevonden: ${item.title}`);
                        allBrightNews.push({
                            date: new Date().toISOString(),
                            originalTitle: item.title,
                            link: item.link,
                            content: aiResponse
                        });
                    }
                } catch (err) {
                    console.error("Fout bij AI verwerking voor dit artikel.");
                }
            }
        } catch (err) {
            console.error(`Kon feed ${url} niet laden.`);
        }
    }

    // Bestandsverwerking binnen de functie zodat 'allBrightNews' beschikbaar is
    if (allBrightNews.length > 0) {
        await fs.ensureDir('./data'); // Zorgt dat de map bestaat
        await fs.outputJson('./data/news_nl.json', allBrightNews, { spaces: 2 });
        console.log(`\x1b[32m%s\x1b[0m`, `Succes! ${allBrightNews.length} artikelen opgeslagen in news_nl.json`);
    } else {
        console.log("\x1b[33m%s\x1b[0m", "Proces voltooid, maar geen 'Bright' nieuws gevonden vandaag.");
    }
}

// Start het proces
processNews();