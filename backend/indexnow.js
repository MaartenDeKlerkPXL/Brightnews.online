// IndexNow (punt 50, 2026-09-27).
//
// Van de URL's in onze sitemap staat het overgrote deel op "gevonden —
// momenteel niet geïndexeerd" (punt 23): een zoekmachine komt langs wanneer
// het hem uitkomt, en bij een domein zonder geschiedenis is dat zelden. Met
// IndexNow geven we bij elke run zelf een seintje met de verse URL's.
//
// Wat het WEL doet: sneller opgehaald worden. Wat het NIET doet: beter
// gevonden worden — dat hangt af van de inhoud en van links van buitenaf.
// En let op: Google doet niet mee. Dit werkt voor Bing, Yandex en een paar
// kleinere; de deelnemers delen meldingen onderling.
//
// De sleutel is publiek by design: hij moet als tekstbestand in de root te
// downloaden zijn, anders weigert de dienst de melding. Dit is dus GEEN
// secret en hoort gewoon in de repo.
//
// Aanroep (zie .github/workflows/update-news.yml, ná generate-sitemap.js):
//   node backend/indexnow.js
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://brightnews.online';
const HOST = 'brightnews.online';
const SLEUTEL = 'b022d2ba1243089fbcdd85248b11145c';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const root = path.join(__dirname, '..');

// Eén melding per run met de verse URL's. De nieuwssitemap bevat precies wat
// we bedoelen — alles van de afgelopen 48 uur — dus die lezen we uit in
// plaats van de logica te herhalen.
function verseUrls() {
    const pad = path.join(root, 'news-sitemap.xml');
    if (!fs.existsSync(pad)) return [];
    const xml = fs.readFileSync(pad, 'utf8');
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}

async function main() {
    // Het sleutelbestand moet bestaan én dezelfde waarde bevatten, anders
    // wijst de dienst de melding af met een 403 die verder niets uitlegt.
    const sleutelPad = path.join(root, `${SLEUTEL}.txt`);
    if (!fs.existsSync(sleutelPad) || fs.readFileSync(sleutelPad, 'utf8').trim() !== SLEUTEL) {
        console.error(`⚠️  ${SLEUTEL}.txt ontbreekt of bevat iets anders — IndexNow zou een 403 geven. Overgeslagen.`);
        return;
    }

    const urls = [`${SITE_URL}/`, ...verseUrls()];
    if (urls.length <= 1) {
        console.log('ℹ️  Geen verse artikelen — niets te melden bij IndexNow.');
        return;
    }

    const body = { host: HOST, key: SLEUTEL, keyLocation: `${SITE_URL}/${SLEUTEL}.txt`, urlList: urls };

    try {
        const antwoord = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
        });
        // 200 en 202 zijn allebei goed; 202 betekent "aangenomen, sleutel
        // wordt nog gecontroleerd".
        if (antwoord.ok) {
            console.log(`📨 IndexNow: ${urls.length} URL's gemeld (${antwoord.status}).`);
        } else {
            console.error(`⚠️  IndexNow gaf ${antwoord.status} ${antwoord.statusText}. ${urls.length} URL's niet gemeld.`);
        }
    } catch (err) {
        // Nooit de run laten vallen: dit is een extraatje, geen publicatiestap.
        console.error(`⚠️  IndexNow onbereikbaar (${err.message}). Overgeslagen.`);
    }
}

main();
