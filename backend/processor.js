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
    { name: 'Adventure-Journal.com', url: 'https://www.adventure-journal.com/feed/' }
];

async function processNews() {
    let languages = { nl: [], en: [], de: [], fr: [], es: [] };

    for (const lang of Object.keys(languages)) {
        try {
            languages[lang] = await fs.readJson(`./data/news_${lang}.json`);
        } catch (e) { languages[lang] = []; }
    }

    for (const feedInfo of FEEDS) {
        try {
            console.log(`📡 Scannen: ${feedInfo.name}`);
            const feed = await parser.parseURL(feedInfo.url);

            for (const item of feed.items.slice(0, 5)) {
                if (languages.nl.some(art => art.link === item.link)) continue;

                // Pak de afbeelding uit de RSS (verschillende tags mogelijk)
                const imageUrl = item.enclosure?.url ||
                    (item.content?.match(/src="([^"]+)"/)?.[1]) ||
                    null;

                try {
                    const chatResponse = await client.chat.complete({
                        model: 'mistral-small-latest',
                        messages: [{
                            role: 'user',
                            content: `Analyseer: "${item.title}". Als het positief is, vertaal de titel EN maak een samenvatting van max 30 woorden in NL, EN, DE, FR en ES.
                            Antwoord enkel in dit JSON formaat:
                            {"isBright": true, 
                             "nl": {"t": "titel", "s": "samenvatting"},
                             "en": {"t": "...", "s": "..."}, 
                             "de": {"t": "...", "s": "..."}, 
                             "fr": {"t": "...", "s": "..."}, 
                             "es": {"t": "...", "s": "..."}}
                            Niet positief? {"isBright": false}`
                        }],
                        responseFormat: { type: 'json_object' }
                    });

                    const data = JSON.parse(chatResponse.choices[0].message.content);

                    if (data.isBright) {
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
                            if (languages[lang].length > 50) languages[lang].pop();
                        });
                    }
                } catch (aiErr) { console.error("AI Fout:", aiErr.message); }
            }
        } catch (feedErr) { console.error("Feed Fout:", feedInfo.name); }
    }

    for (const [lang, items] of Object.entries(languages)) {
        await fs.outputJson(`./data/news_${lang}.json`, items, { spaces: 2 });
    }
}
processNews();