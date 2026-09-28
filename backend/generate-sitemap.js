// Genereert sitemap.xml en robots.txt in de root van de site. Draait als
// stap in .github/workflows/update-news.yml (ná generate-articles.js) zodat
// beide bestanden altijd up-to-date zijn. Bevat de statische pagina's plus
// álle artikel-URL's uit articles/manifest.json — ook van artikelen die uit
// de actuele nieuws-JSON zijn gevallen (eenmaal geïndexeerde URL's blijven
// bestaan, Fase 6-besluit).
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://brightnews.online';

// LAST_MODIFIED is bewust een vaste datum, geen "vandaag" bij elke run: de
// statische pagina's veranderen niet elke keer de Action draait (alleen de
// nieuws-JSON doet dat), en een dagelijks meebewegende datum zou de Action
// elke run onnodig laten committen (de "geen wijzigingen"-check hieronder
// zou nooit meer stil zijn). Werk deze datum handmatig bij zodra je een
// van de PAGES daadwerkelijk inhoudelijk wijzigt.
const LAST_MODIFIED = '2026-09-01';

// Bijgehouden lijst statische pagina's (Fase 4/5-opschoning gecontroleerd:
// dit zijn de .html-bestanden in de root op het moment van schrijven, minus
// profiel.html, wachtwoord-vergeten.html en thanks.html: account-/
// transactiepagina's zonder indexeerbare meerwaarde, bewust weggelaten).
const PAGES = [
  { loc: '/', priority: '1.0' },
  { loc: '/over-ons.html', priority: '0.8' },
  { loc: '/abonnementen.html', priority: '0.8' },
  { loc: '/Privacy.html', priority: '0.3' },
  { loc: '/algemeene-voorwaarden.html', priority: '0.3' },
  { loc: '/refunds.html', priority: '0.3' },
  { loc: '/contact.html', priority: '0.5' },
  { loc: '/feedback.html', priority: '0.3' },
];

// Artikelen die door de selectie heen glipten en niet in Google horen
// (punt 3). Ze blijven bestaan en bereikbaar — alleen niet in de sitemap;
// backend/verberg-uitgesloten.js zet er daarnaast 'noindex, follow' op.
function uitgeslotenIds() {
  const p = path.join(__dirname, '..', 'data', 'uitgesloten-artikelen.json');
  if (!fs.existsSync(p)) return new Set();
  return new Set(Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).artikelen || {}));
}

// Artikel-URL's uit het manifest van generate-articles.js. lastmod is de
// publicatiedatum van het artikel (stabiel, dus geen commit-ruis).
function artikelUrls() {
  const manifestPad = path.join(__dirname, '..', 'articles', 'manifest.json');
  if (!fs.existsSync(manifestPad)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
  const uitgesloten = uitgeslotenIds();
  const urls = [];
  for (const [id, entry] of Object.entries(manifest.articles || {})) {
    if (uitgesloten.has(id)) continue;
    const lastmod = entry.date ? String(entry.date).slice(0, 10) : LAST_MODIFIED;
    for (const [lang, slug] of Object.entries(entry.slugs || {})) {
      urls.push({ loc: `/articles/${lang}/${slug}-${id}.html`, priority: '0.6', lastmod });
    }
  }
  return urls;
}

// Evergreen-themapagina's (fase M1, 2026-09-09) uit themas/manifest.json —
// zelfde principe als artikelen: eenmaal gepubliceerde URL's blijven bestaan.
function themaUrls() {
  const manifestPad = path.join(__dirname, '..', 'themas', 'manifest.json');
  if (!fs.existsSync(manifestPad)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
  const urls = [];
  for (const entry of Object.values(manifest.themas || {})) {
    for (const [lang, slug] of Object.entries(entry.slugs || {})) {
      urls.push({ loc: `/themas/${lang}/${slug}.html`, priority: '0.7', lastmod: entry.datum || LAST_MODIFIED });
    }
  }
  return urls;
}

// Categoriepagina's (punt 55, 2026-09-27): zes categorieën × vijf talen.
// Ze worden ook vanaf elke artikelpagina gelinkt, maar horen hier net zo goed
// in — het zijn ingangen, geen bijzaak, vandaar priority 0.8.
// HOUD IN SYNC met backend/generate-categorieen.js: dezelfde zes namen en
// dezelfde slug (de vertaalde categorienaam).
function categorieUrls() {
  const pad = path.join(__dirname, '..', 'categories');
  if (!fs.existsSync(pad)) return [];
  const urls = [];
  for (const lang of fs.readdirSync(pad)) {
    const map = path.join(pad, lang);
    if (!fs.statSync(map).isDirectory()) continue;
    for (const bestand of fs.readdirSync(map)) {
      if (!bestand.endsWith('.html')) continue;
      urls.push({ loc: `/categories/${lang}/${bestand}`, priority: '0.8', lastmod: LAST_MODIFIED });
    }
  }
  return urls;
}

// Vangnet: slugs en ids zijn nu per constructie XML-veilig ([a-z0-9-]), maar
// die garantie staat in twee andere bestanden — als die ooit verschuiven mag
// de sitemap niet stilletjes ongeldig worden.
function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateSitemap() {
  const alles = [
    ...PAGES.map(p => ({ ...p, lastmod: LAST_MODIFIED })),
    ...artikelUrls(),
    ...themaUrls(),
    ...categorieUrls(),
  ];
  const urls = alles.map(({ loc, priority, lastmod }) => `  <url>
    <loc>${SITE_URL}${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// Nieuwssitemap (punt 54, 2026-09-27). Google News wil naast de gewone
// sitemap een aparte lijst met alléén de artikelen van de afgelopen 48 uur,
// in het news:-formaat met publicatiedatum en taal. Dat is het verschil
// tussen "komt ooit langs" en "binnen een uur opgehaald", en bij nieuws is
// een dag te laat hetzelfde als niet gepubliceerd.
//
// Twee harde regels van Google, en die zitten hieronder ingebouwd: niets
// ouder dan twee dagen, en maximaal 1.000 URL's.
const NIEUWS_VENSTER_UREN = 48;
const NIEUWS_MAX = 1000;
const TAALNAAM = { nl: 'nl', en: 'en', de: 'de', fr: 'fr', es: 'es' };

function generateNewsSitemap() {
  const manifestPad = path.join(__dirname, '..', 'articles', 'manifest.json');
  if (!fs.existsSync(manifestPad)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
  const grens = Date.now() - NIEUWS_VENSTER_UREN * 3600 * 1000;

  const items = [];
  for (const [id, entry] of Object.entries(manifest.articles || {})) {
    const tijd = entry.date ? Date.parse(entry.date) : NaN;
    if (!Number.isFinite(tijd) || tijd < grens) continue;
    for (const [lang, slug] of Object.entries(entry.slugs || {})) {
      const titel = entry.titles?.[lang];
      // Zonder titel geen geldig news:title, en dan liever geen regel dan
      // een ongeldige: één fout item laat Google de hele sitemap afwijzen.
      if (!titel || !TAALNAAM[lang]) continue;
      items.push({ loc: `/articles/${lang}/${slug}-${id}.html`, lang, titel, datum: new Date(tijd).toISOString() });
    }
  }
  items.sort((a, b) => b.datum.localeCompare(a.datum));

  const urls = items.slice(0, NIEUWS_MAX).map(i => `  <url>
    <loc>${SITE_URL}${xmlEscape(i.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>BrightNews</news:name>
        <news:language>${TAALNAAM[i.lang]}</news:language>
      </news:publication>
      <news:publication_date>${i.datum}</news:publication_date>
      <news:title>${xmlEscape(i.titel)}</news:title>
    </news:news>
  </url>`).join('\n');

  return {
    aantal: Math.min(items.length, NIEUWS_MAX),
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`,
  };
}

function generateRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/news-sitemap.xml
`;
}

const root = path.join(__dirname, '..');
fs.writeFileSync(path.join(root, 'sitemap.xml'), generateSitemap());
fs.writeFileSync(path.join(root, 'robots.txt'), generateRobotsTxt());
const nieuws = generateNewsSitemap();
if (nieuws) {
  fs.writeFileSync(path.join(root, 'news-sitemap.xml'), nieuws.xml);
  console.log(`sitemap.xml, news-sitemap.xml (${nieuws.aantal} verse URL's) en robots.txt gegenereerd.`);
} else {
  console.log('sitemap.xml en robots.txt gegenereerd (geen manifest, dus geen nieuwssitemap).');
}
