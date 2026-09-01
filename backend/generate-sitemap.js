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
];

// Artikel-URL's uit het manifest van generate-articles.js. lastmod is de
// publicatiedatum van het artikel (stabiel, dus geen commit-ruis).
function artikelUrls() {
  const manifestPad = path.join(__dirname, '..', 'articles', 'manifest.json');
  if (!fs.existsSync(manifestPad)) return [];
  const manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
  const urls = [];
  for (const [id, entry] of Object.entries(manifest.articles || {})) {
    const lastmod = entry.date ? String(entry.date).slice(0, 10) : LAST_MODIFIED;
    for (const [lang, slug] of Object.entries(entry.slugs || {})) {
      urls.push({ loc: `/articles/${lang}/${slug}-${id}.html`, priority: '0.6', lastmod });
    }
  }
  return urls;
}

function generateSitemap() {
  const alles = [
    ...PAGES.map(p => ({ ...p, lastmod: LAST_MODIFIED })),
    ...artikelUrls(),
  ];
  const urls = alles.map(({ loc, priority, lastmod }) => `  <url>
    <loc>${SITE_URL}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function generateRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

const root = path.join(__dirname, '..');
fs.writeFileSync(path.join(root, 'sitemap.xml'), generateSitemap());
fs.writeFileSync(path.join(root, 'robots.txt'), generateRobotsTxt());
console.log('sitemap.xml en robots.txt gegenereerd.');
