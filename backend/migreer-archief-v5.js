// Zet het hele artikelarchief om naar het v5-sjabloon (planning 17 november).
//
// Waarom een apart script: generate-articles.js maakt alleen de artikelen
// opnieuw die nog in data/news_{taal}.json staan. De rest van het archief
// (3.470 pagina's op 12 november) kent alleen het manifest, en dat heeft geen
// samenvatting of foto. Die staan wél in de pagina zelf. Dit script leest ze
// daaruit en schrijft dezelfde pagina, op hetzelfde adres, in v5.
//
// Het leest twee soorten pagina's:
//   - het oude sjabloon (detail-container, data-role="body", ai-disclaimer);
//   - het v5-sjabloon: daar staan de gegevens als JSON in #artikel-gegevens.
// Daardoor mag het opnieuw draaien, bijvoorbeeld na de merge naar master,
// als de nieuws-Action intussen nog pagina's in het oude sjabloon schreef.
//
// Nooit verwijderen: elke pagina blijft op haar adres. Een pagina die niet te
// lezen is, blijft zoals hij is en staat in de uitvoer. Een pagina met
// noindex (uitgesloten artikel) houdt die.
//
//   node backend/migreer-archief-v5.js           alles omzetten
//   node backend/migreer-archief-v5.js --droog   alleen lezen en tellen
//   node backend/migreer-archief-v5.js --lokaal  testen vóór de overstap (negeert de rem op /v5-links)
//
// Daarna: node backend/generate-articles.js (de actuele artikelen, met de
// verse gegevens uit de feed) en node backend/generate-sitemap.js.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { paginaHtml, bouwBurenIndex, maakTeaser } = require('./generate-articles');
const { leesSchilV5 } = require('./schil');

const root = path.join(__dirname, '..');
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const DROOG = process.argv.includes('--droog');
// Alleen om lokaal te testen vóór de overstap: negeert de rem op /v5-links.
const LOKAAL = process.argv.includes('--lokaal');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
const T = sandbox.window.translations;
const t = (lang, key) => (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;

function ontsnap(s) {
    return String(s)
        .replace(/&#x([0-9a-f]+);/gi, (h, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&#(\d+);/g, (h, n) => String.fromCodePoint(Number(n)))
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

const zonderTags = s => ontsnap(String(s).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const eerste = (s, re) => (s.match(re) || [])[1];
const attr = (tag, naam) => {
    const w = eerste(tag, new RegExp(`\\s${naam}="([^"]*)"`));
    return w === undefined ? undefined : ontsnap(w);
};

// Alternatieve talen uit data-alt-{taal}="/articles/{taal}/{slug}-{id}.html".
function slugsUit(html, id, lang, bestandsnaam) {
    const slugs = {};
    for (const l of TALEN) {
        const pad = eerste(html, new RegExp(`data-alt-${l}="/articles/${l}/([^"]+)-${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.html"`));
        if (pad) slugs[l] = pad;
    }
    if (!slugs[lang]) slugs[lang] = bestandsnaam.slice(0, -(`-${id}.html`).length);
    return slugs;
}

// Het v5-sjabloon: de gegevens staan erin.
function leesV5(html) {
    const json = eerste(html, /<script type="application\/json" id="artikel-gegevens">([\s\S]*?)<\/script>/);
    if (!json) return null;
    return JSON.parse(json);
}

// Het oude sjabloon (generate-articles.js tot 2026-11-12).
function leesOud(html, lang) {
    const id = attr(eerste(html, /(<div class="detail-container"[^>]*>)/) || '', 'data-article-id');
    const titel = eerste(html, /<h1 itemprop="headline"[^>]*>([\s\S]*?)<\/h1>/);
    if (!id || !titel) return null;
    const img = eerste(html, /(<img class="detail-img"[^>]*>)/) || '';
    const lijf = eerste(html, /<div data-role="body">([\s\S]*?)<\/div>\s*(?:<div class="paywall-overlay"|<div class="share-section")/) || '';
    const tekstDeel = lijf.split('<div class="digest-refs">')[0];
    const alineas = [...tekstDeel.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => zonderTags(m[1])).filter(Boolean);
    const refsDeel = lijf.split('<div class="digest-refs">')[1] || '';
    const refs = [...refsDeel.matchAll(/<li><a href="([^"]*)">([\s\S]*?)<\/a><\/li>/g)].map(m => {
        const href = ontsnap(m[1]);
        return { id: eerste(href, /-([a-z0-9]+)\.html$/) || eerste(href, /[?&]id=([^&]+)/) || null, title: zonderTags(m[2]), href };
    });

    // Bron en link uit de regel onderaan ("… Lees het origineel bij X").
    const disclaimer = eerste(html, /<p class="ai-disclaimer"[^>]*>([\s\S]*?)<\/p>/) || '';
    const linkTag = eerste(disclaimer, /(<a [^>]*>)/);
    const link = linkTag ? attr(linkTag, 'href') : null;
    let bron = null;
    if (linkTag) {
        const linkTekst = zonderTags(eerste(disclaimer, /<a [^>]*>([\s\S]*?)<\/a>/) || '');
        const voor = t(lang, 'read_original');
        bron = linkTekst.startsWith(voor) ? linkTekst.slice(voor.length).trim() : null;
    }
    if (!bron) {
        // Zonder link: de bron uit de zin zelf ({source} in ai_summary_notice).
        const sjabloon = t(lang, 'ai_summary_notice');
        const [voor, na] = sjabloon.split('{source}');
        const zin = zonderTags(disclaimer.split('<a ')[0]);
        if (na !== undefined && zin.startsWith(voor.trim())) {
            const rest = zin.slice(voor.trim().length);
            bron = (na.trim() ? rest.slice(0, rest.lastIndexOf(na.trim())) : rest).trim() || null;
        }
    }

    const isDigest = id.startsWith('dg-') || refs.length > 0;
    return {
        id,
        title: zonderTags(titel),
        summary: alineas.join('\n\n'),
        image: attr(img, 'src') || null,
        image_alt: attr(img, 'alt') || null,
        date: attr(eerste(html, /(<time itemprop="datePublished"[^>]*>)/) || '', 'datetime') || null,
        source: isDigest ? null : bron,
        link: isDigest ? null : link,
        type: isDigest ? 'digest' : null,
        refs,
        meta_description: attr(eerste(html, /(<meta name="description"[^>]*>)/) || '', 'content') || null,
        // Het oude sjabloon zette alleen een paywall bij een ingekorte tekst.
        ingekort: html.includes('class="paywall-overlay"'),
    };
}

// De velden die een pagina na het schrijven moet teruggeven. Klopt dat niet,
// dan is het sjabloon stuk en zou de volgende run die gegevens kwijt zijn.
const MOET_TERUG = ['id', 'title', 'summary', 'image', 'date', 'source', 'link', 'type', 'ingekort'];

function zelfdeGegevens(artikel, terug) {
    if (!terug) return false;
    const iso = d => (d ? new Date(d).toISOString() : null);
    const verwacht = {
        ...artikel,
        summary: artikel.type === 'digest' ? String(artikel.summary || '') : maakTeaser(artikel.summary),
        date: iso(artikel.date),
        type: artikel.type === 'digest' ? 'digest' : null,
    };
    for (const k of MOET_TERUG) {
        if (k === 'ingekort' && typeof artikel.ingekort !== 'boolean') continue;
        if (k === 'date' ? iso(terug.date) !== verwacht.date : (terug[k] ?? null) !== (verwacht[k] ?? null)) return false;
    }
    return (terug.refs || []).length === (artikel.refs || []).length;
}

// Zolang de v5-schil naar /v5-*.html linkt (noindex, nofollow), mogen de
// geïndexeerde pagina's niet om: dan linken ze alleen nog naar pagina's die
// Google niet volgt. De overstap naar de echte adressen (18 november) haalt
// die links weg.
function schilLinktNaarVoorbeeld() {
    const { header, footer } = leesSchilV5();
    return /href="\/v5-/.test(header + footer);
}

function main() {
    const manifestPad = path.join(root, 'articles/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPad, 'utf8'));
    const burenIndex = bouwBurenIndex(manifest);
    let uitgesloten = new Set();
    try {
        const u = JSON.parse(fs.readFileSync(path.join(root, 'data/uitgesloten-artikelen.json'), 'utf8'));
        uitgesloten = new Set(Object.keys(u.artikelen || {}));
    } catch { /* geen lijst = niets uitgesloten */ }
    const tel = { gelezenOud: 0, gelezenV5: 0, ongewijzigd: 0, onleesbaar: [], kapot: [] };
    const teSchrijven = [];

    for (const lang of TALEN) {
        const map = path.join(root, 'articles', lang);
        if (!fs.existsSync(map)) continue;
        for (const naam of fs.readdirSync(map).sort()) {
            if (!naam.endsWith('.html')) continue;
            const bestand = path.join(map, naam);
            const html = fs.readFileSync(bestand, 'utf8');
            let artikel;
            try {
                artikel = leesV5(html);
                if (artikel) tel.gelezenV5++;
                else {
                    artikel = leesOud(html, lang);
                    if (artikel) tel.gelezenOud++;
                }
            } catch (fout) {
                artikel = null;
                console.warn(`⚠️  ${lang}/${naam}: ${fout.message}`);
            }
            if (!artikel || !artikel.id || !artikel.title || !naam.endsWith(`-${artikel.id}.html`)) {
                tel.onleesbaar.push(`${lang}/${naam}`);
                continue;
            }
            try {
                artikel.category = manifest.articles?.[artikel.id]?.category || artikel.category || null;
                const slugs = slugsUit(html, artikel.id, lang, naam);
                let nieuw = paginaHtml(artikel, lang, slugs, manifest, burenIndex);
                // Controle: leest de nieuwe pagina dezelfde gegevens terug?
                if (!zelfdeGegevens(artikel, leesV5(nieuw))) {
                    tel.kapot.push(`${lang}/${naam}`);
                    continue;
                }
                if (uitgesloten.has(String(artikel.id)) || /<meta name="robots" content="noindex/.test(html)) {
                    nieuw = nieuw.replace('</title>', '</title>\n    <meta name="robots" content="noindex, follow">');
                }
                if (nieuw === html) { tel.ongewijzigd++; continue; }
                teSchrijven.push([bestand, nieuw]);
            } catch (fout) {
                console.warn(`⚠️  ${lang}/${naam}: ${fout.message}`);
                tel.kapot.push(`${lang}/${naam}`);
            }
        }
    }

    const totaal = tel.gelezenOud + tel.gelezenV5 + tel.onleesbaar.length;
    // Rem: gaat er bij meer dan 1% iets mis, dan is het sjabloon of de lezer
    // stuk. Dan niets schrijven: liever een rode stap dan een beschadigd archief.
    const teVeelKapot = tel.kapot.length > Math.max(1, totaal * 0.01);
    const voorbeeld = !LOKAAL && schilLinktNaarVoorbeeld();
    const schrijven = !DROOG && !teVeelKapot && !voorbeeld;
    if (schrijven) teSchrijven.forEach(([bestand, html]) => fs.writeFileSync(bestand, html));

    console.log(`Archief naar v5${DROOG ? ' (droog)' : ''}: ${tel.gelezenOud} oud en ${tel.gelezenV5} v5 gelezen, ` +
        `${teSchrijven.length} ${schrijven ? 'geschreven' : 'zouden worden geschreven'}, ${tel.ongewijzigd} al gelijk, ` +
        `${tel.onleesbaar.length} onleesbaar en ${tel.kapot.length} met een sjabloonfout (blijven zoals ze zijn).`);
    [...tel.onleesbaar, ...tel.kapot].slice(0, 20).forEach(n => console.log(`   niet omgezet: ${n}`));
    if (teVeelKapot) console.error('❌ Meer dan 1% gaf een sjabloonfout: er is niets geschreven.');
    if (voorbeeld) console.error('⛔ De v5-schil linkt nog naar /v5-*.html (noindex). Eerst de echte adressen (planning 18 november); er is niets geschreven.');
    if (tel.onleesbaar.length || tel.kapot.length || (!DROOG && !schrijven && teSchrijven.length)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { leesOud, leesV5, zelfdeGegevens };
