// RSS-feeds, één per taal (punt 47, 2026-09-27).
//
// De site had er geen. Voor een nieuwssite is dat ongebruikelijk: RSS is hoe
// aggregators, lezers-apps en andere sites nieuwe artikelen automatisch
// oppikken. Het is bereik dat vanzelf doorloopt zodra het er staat, zonder
// verdere moeite en zonder kosten.
//
// Aanroep (zie .github/workflows/update-news.yml, ná generate-articles.js
// want de feed linkt naar de statische artikelpagina's):
//   node backend/generate-rss.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE_URL = 'https://brightnews.online';
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const TAALCODES = { nl: 'nl-nl', en: 'en-us', de: 'de-de', fr: 'fr-fr', es: 'es-es' };
const root = path.join(__dirname, '..');

// Hoeveel artikelen er in een feed gaan. Lezers-apps halen een feed vaak maar
// eens per uur op; 30 is ruim genoeg om niets te missen en houdt het bestand
// klein.
const ITEMS_PER_FEED = 30;

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
const T = sandbox.window.translations;
function t(lang, key) {
    return (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;
}

// In XML is er geen HTML-escaping: & < > " ' moeten alle vijf weg, ook binnen
// een <title>. Een titel met een ampersand maakt de feed anders ongeldig, en
// een lezer-app laat dan de hele feed vallen in plaats van dat ene item.
function xml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
        // Stuurtekens zijn in XML 1.0 verboden en komen soms uit een bron mee.
        // Eén zo'n teken maakt de hele feed ongeldig, dus ze moeten eruit —
        // vandaar dat no-control-regex hier bewust uit staat.
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function rfc822(datum) {
    const d = datum ? new Date(datum) : new Date();
    return (isNaN(d) ? new Date() : d).toUTCString();
}

function feedHtml(lang, artikelen, manifest) {
    const zelfUrl = `${SITE_URL}/feed-${lang}.xml`;
    const items = artikelen.map(a => {
        const entry = manifest.articles?.[a.id];
        const slug = entry?.slugs?.[lang];
        const link = slug
            ? `${SITE_URL}/articles/${lang}/${slug}-${a.id}.html`
            : `${SITE_URL}/?id=${encodeURIComponent(a.id)}`;
        // De samenvatting is platte tekst; in <description> mag dat, mits
        // geëscaped. Geen CDATA: dat maakt het alleen maar breekbaarder.
        const omschrijving = String(a.summary || '').slice(0, 400);
        const afbeelding = a.image && /^https?:/.test(a.image)
            ? `\n            <enclosure url="${xml(a.image)}" type="image/jpeg" length="0"/>`
            : '';
        return `        <item>
            <title>${xml(a.title)}</title>
            <link>${xml(link)}</link>
            <guid isPermaLink="true">${xml(link)}</guid>
            <pubDate>${rfc822(a.date)}</pubDate>
            <description>${xml(omschrijving)}</description>${afbeelding}
        </item>`;
    }).join('\n');

    // Dezelfde titel en ondertitel als de homepage, zodat een lezer die de
    // feed toevoegt precies ziet wat hij op de site zag.
    const titel = t(lang, 'index_page_title');
    const omschrijving = t(lang, 'index_sub');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${xml(titel)}</title>
        <link>${SITE_URL}/</link>
        <atom:link href="${zelfUrl}" rel="self" type="application/rss+xml"/>
        <description>${xml(omschrijving)}</description>
        <language>${TAALCODES[lang]}</language>
        <lastBuildDate>${rfc822(artikelen[0] && artikelen[0].date)}</lastBuildDate>
        <ttl>60</ttl>
        <image>
            <url>${SITE_URL}/assets/brightnews-logo.png</url>
            <title>${xml(titel)}</title>
            <link>${SITE_URL}/</link>
        </image>
${items}
    </channel>
</rss>
`;
}

function main() {
    const manifestPad = path.join(root, 'articles/manifest.json');
    const manifest = fs.existsSync(manifestPad)
        ? JSON.parse(fs.readFileSync(manifestPad, 'utf8'))
        : { articles: {} };

    let geschreven = 0;
    for (const lang of TALEN) {
        const pad = path.join(root, `data/news_${lang}.json`);
        if (!fs.existsSync(pad)) {
            console.warn(`⚠️  data/news_${lang}.json ontbreekt — geen feed voor ${lang}.`);
            continue;
        }
        const artikelen = JSON.parse(fs.readFileSync(pad, 'utf8'))
            .filter(a => a.id && a.title)
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
            .slice(0, ITEMS_PER_FEED);

        fs.writeFileSync(path.join(root, `feed-${lang}.xml`), feedHtml(lang, artikelen, manifest));
        geschreven++;
    }
    console.log(`📡 ${geschreven} RSS-feeds geschreven (${ITEMS_PER_FEED} items per taal).`);
}

main();
