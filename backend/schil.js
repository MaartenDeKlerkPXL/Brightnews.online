// De paginaschil van BrightNews: header en footer, vanuit één bron.
//
// Waarom dit bestand bestaat: tot 2026-10-29 stonden de navigatiebalk en de
// footer met de hand gekopieerd in dertien pagina's, plus nog een kopie in
// het artikelsjabloon. Een wijziging aan de navigatie betekende dus vijftien
// keer hetzelfde werk, en de kopieën liepen uit elkaar (relatieve paden hier,
// absolute daar). Voor redesign v5 moet de schil helemaal om, en dat moet één
// keer kunnen.
//
// De bron staat in partials/header.html en partials/footer.html. Gebruikt
// door:
//   - backend/stempel-schil.js       (de vaste pagina's in de root)
//   - backend/generate-articles.js   (het artikelsjabloon)
//   - backend/generate-categorieen.js (de 30 categoriepagina's)
//
// Alle paden in de partials zijn absoluut (/index.html, /assets/...). Dat
// werkt op elke diepte: in de root, en twee mappen diep in /articles/nl/.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

// Vertalingen uit data/translations.js, dat in de browser window.translations
// zet. Hier in een kale sandbox uitgevoerd, net als in de generators.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/translations.js'), 'utf8'), sandbox);
const T = sandbox.window.translations;

// Zelfde terugval als in de generators: eigen taal, anders Engels.
function t(lang, key) {
    return (T[lang] && T[lang][key]) || (T.en && T.en[key]) || key;
}

function leesPartial(naam) {
    return fs.readFileSync(path.join(root, 'partials', naam), 'utf8').trimEnd();
}

// Zet relatieve paden om naar absolute. De partials zijn al absoluut; dit
// blijft voor HTML die van elders komt.
function maakPadenAbsoluut(html) {
    return html.replace(/\b(src|href)="(?!https?:|\/|#|mailto:|tel:|data:)([^"]+)"/gi,
        (heel, attr, pad) => `${attr}="/${pad}"`);
}

// De partials staan met data-i18n op elk tekstelement. In de browser vult
// vertaalStatischeTeksten() in index.js de taal in, met innerHTML: een
// vertaling mag dus opmaak bevatten (23 sleutels doen dat, zoals footer_text
// met <strong>). Voor statische pagina's doen we hier precies hetzelfde, zodat
// een bezoeker of crawler zonder JavaScript al de goede woorden én opmaak ziet.
//
// Tot 2026-10-29 escapete het artikelsjabloon die vertalingen, waardoor er in
// de statische HTML letterlijk "&lt;strong&gt;" stond. De vertalingen komen
// uit ons eigen data/translations.js, met hetzelfde vertrouwen als in de
// browser; vandaar zonder escapen.
//
// Eén voorzorg: bevat een element een genest element met dezelfde tag, dan
// is het einde niet betrouwbaar met een reguliere expressie te vinden. Dat
// element blijft ongemoeid; de browser vertaalt het dan alsnog.
function vertaalSchil(html, lang) {
    return html.replace(
        /(<(\w+)\b[^>]*\sdata-i18n="([a-z0-9_]+)"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
        (heel, opening, tag, sleutel, inhoud, sluiting) => {
            if (new RegExp(`<${tag}[\\s>]`, 'i').test(inhoud)) return heel;
            const vertaling = t(lang, sleutel);
            if (!vertaling || vertaling === sleutel) return heel;
            return opening + vertaling + sluiting;
        }
    );
}

// De schil zoals hij in de bron staat (onvertaald, met data-i18n), voor de
// vaste pagina's: daar vertaalt de browser.
function leesSchil() {
    return { header: leesPartial('header.html'), footer: leesPartial('footer.html') };
}

// De schil al vertaald naar één taal, voor gegenereerde pagina's.
function schilVoorTaal(lang) {
    const { header, footer } = leesSchil();
    return { header: vertaalSchil(header, lang), footer: vertaalSchil(footer, lang) };
}

module.exports = { leesSchil, schilVoorTaal, vertaalSchil, maakPadenAbsoluut };
