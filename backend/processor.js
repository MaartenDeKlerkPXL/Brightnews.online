const RSSParser = require('rss-parser');
const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs-extra');
require('dotenv').config();

const parser = new RSSParser();
const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const FEEDS = [
    { name: 'NU.nl', url: 'https://www.nu.nl/rss/goed-nieuws' },
    { name: 'Positive.News', url: 'https://www.positive.news/feed/' },
    { name: 'GoodNewsNetwork.org', url: 'https://www.goodnewsnetwork.org/category/news/feed/' },
    { name: 'CNTraveler.com', url: 'https://www.cntraveler.com/feed/rss' },
    { name: 'Adventure-Journal.com', url: 'https://www.adventure-journal.com/feed/' },
    { name: 'Bright.nl', url: 'https://www.bright.nl/rss' },
    { name: 'BusinessInsider.com', url: 'https://www.businessinsider.com/rss' }
];

/**
 * Schoon de AI tekst op en parse naar JSON
 */
function verwerkAIResponse(rawText) {
    try {
        const cleanJson = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        return JSON.parse(cleanJson);
    } catch (err) {
        console.error("❌ JSON Parse Fout:", err.message);
        // We stoppen niet het hele proces bij 1 fout artikel, maar loggen het wel
        return null;
    }
}
async function processNews() {
    console.log("🚀 Starten met nieuws ophalen...");

    let languages = { nl: [], en: [], de: [], fr: [], es: [] };

    // 1. Laad bestaande data
    for (const lang of Object.keys(languages)) {
        try {
            languages[lang] = await fs.readJson(`./data/news_${lang}.json`);
        } catch (e) {
            console.log(`Nieuw bestand voor ${lang} aanmaken.`);
            languages[lang] = [];
        }
    }

    // 2. Loop door alle RSS feeds
    for (const feedInfo of FEEDS) {
        try {
            console.log(`📡 Scannen: ${feedInfo.name}`);
            const feed = await parser.parseURL(feedInfo.url);

            // Verwerk de 2 nieuwste items (verlaagd om de 60-minuten limiet te halen)
            for (const item of feed.items.slice(0, 5)) {
                // Check of we dit artikel al hebben
                if (languages.nl.some(art => art.link === item.link)) {
                    console.log(`⏭️ Overslaan: ${item.title}`);
                    continue;
                }

                console.log(`🧠 Analyseren: ${item.title}`);

                // Pak afbeelding uit RSS
                const imageUrl = item.enclosure?.url ||
                    (item.content?.match(/src="([^"]+)"/)?.[1]) ||
                    null;

                try {
                    const chatResponse = await client.chat.complete({
                        model: 'mistral-small-latest',
                        messages: [{
                            role: 'user',
                            content: `Analyseer dit nieuws: "${item.title} - ${item.contentSnippet}". 
                                    Als het zeer positief is, schrijf dan een inspirerend, intressant en vooral een positief artikel van ongeveer 300 woorden. 
                                    Gebruik een professionele maar vooral zeer positieve journalistieke stijl. 
                                    Vertaal dit volledige artikel naar NL, EN, DE, FR en ES.
                                    
                                    Classificeer elk artikel in precies één van de volgende categorieën: Tech, Health, Science, Lifestyle, Environment, of Finance. Voeg dit toe als een nieuw veld "category" in de JSON-output.
                                    
                                    Antwoord enkel in dit JSON formaat:
                                    {
                                     "isBright": true, 
                                     "nl": {"t": "titel", "s": "artikel van 300 woorden..."},
                                     "en": {"t": "...", "s": "..."}, 
                                     "de": {"t": "...", "s": "..."}, 
                                     "fr": {"t": "...", "s": "..."}, 
                                     "es": {"t": "...", "s": "..."}
                                    }
                                    Niet positief? Antwoord enkel: {"isBright": false}`
                        }],
                        responseFormat: { type: 'json_object' }
                    });

                    const data = verwerkAIResponse(chatResponse.choices[0].message.content);

                    if (data && data.isBright) {
                        console.log(`✨ Positief nieuws gevonden! (${item.title})`);
                        const articleId = Date.now() + Math.random().toString(36).substr(2, 9);

                        Object.keys(languages).forEach(lang => {
                            languages[lang].unshift({
                                id: articleId,
                                title: data[lang].t,
                                summary: data[lang].s,
                                link: item.link,
                                source: feedInfo.name,
                                image: imageUrl,
                                date: new Date().toISOString()
                            });
                            // Maximaal 50 artikelen per taal
                            if (languages[lang].length > 50) languages[lang].pop();
                        });
                    } else {
                        console.log(`☁️ Artikel niet positief bevonden.`);
                    }
                } catch (aiErr) {
                    console.error(`❌ AI Fout bij artikel: ${item.title}`, aiErr.message);
                }
            }
        } catch (feedErr) {
            console.error(`❌ Feed Fout bij ${feedInfo.name}:`, feedErr.message);
        }
    }

    // 3. Opslaan van alle bestanden
    console.log("💾 Resultaten opslaan naar JSON...");
    for (const [lang, items] of Object.entries(languages)) {
        await fs.ensureDir('./data');
        await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
    }
}

async function main() {
    try {
        await processNews();
        console.log("✅ Alles succesvol verwerkt.");
        // Forceer het afsluiten van het proces
        process.exit(0);
    } catch (err) {
        console.error("💥 Fatale fout:", err);
        process.exit(1);
    }
}

main();