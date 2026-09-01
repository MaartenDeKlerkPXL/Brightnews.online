// Genereert sitemap.xml en robots.txt in de root van de site. Draait als
// stap in .github/workflows/update-news.yml zodat beide bestanden altijd
// meegenomen en up-to-date zijn. Bevat alleen de statische pagina's (geen
// losse artikel-URL's: die bestaan niet als losse HTML-bestanden, artikelen
// worden client-side gerenderd vanuit data/news_*.json).
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
  { loc: '/launch.html', priority: '0.1' },
];

function generateSitemap() {
  const urls = PAGES.map(({ loc, priority }) => `  <url>
    <loc>${SITE_URL}${loc}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
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
