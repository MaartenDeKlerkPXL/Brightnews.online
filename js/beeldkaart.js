/* Beeldkaarten voor Instagram — punt 53, onderdeel 1.
 *
 * Instagram staat geen links toe in bijschriften, dus de post hangt volledig
 * van het beeld af. Nu is dat de persfoto bij het artikel: vaak generieke
 * stock die niets zegt. Dit maakt er een kaart van met de kop erop.
 *
 * Waarom een <canvas> en geen SVG of server-side PNG:
 *  - een PNG server-side renderen vraagt sharp of een headless browser; dat is
 *    een nieuwe (native) afhankelijkheid voor iets wat de browser gratis kan;
 *  - een SVG in een <img> laadt geen paginalettertypen, dus de kop zou in een
 *    systeemletter vallen — precies het merkkenmerk dat je wilt behouden;
 *  - de cockpit is toch waar Maarten de posts nakijkt en kopieert, dus de
 *    download hoort daar.
 *
 * Ontwerp (2026-11-19): de v5-huisstijl, gelijk aan het Illustrator-sjabloon
 * assets/sociale-media/post-sjabloon.svg. Wijzig je het een, wijzig dan ook
 * het ander. Roomgele kaart, logo linksboven, groen label met witte tekst,
 * kop in Instrument Sans SemiBold, een dunne lijn en het adres onderaan. De
 * kop hangt aan een vaste onderrand, zodat elke kaart in de feed op dezelfde
 * plek eindigt, hoe lang de kop ook is.
 *
 * Sinds 2026-11-23 met foto, gelijk aan assets/sociale-media/post-sjabloon-foto.svg
 * (en Maartens post-sjabloon.ai): de foto van het artikel vol beeld, een donker
 * verloop onderaan en bovenin, het lichte logo en een witte kop. Zonder
 * bruikbare foto valt de kaart terug op de roomgele versie.
 */

const KAART = {
    formaat: 1080,
    marge: 96,
    groen: '#186F49',
    achtergrond: '#FFF1C7',
    tekst: '#152019',
    letter: '"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    // De wordmark als SVG: de letters zijn paden, dus geen lettertype nodig.
    logo: '/assets/logo.svg',
    logoBreedte: 325,
    kopOnder: 900,
};

// De chip boven de kop. Een dagoverzicht en een los artikel zijn iets anders
// en dat mag je zien; onbekende soorten vallen terug op het merk zelf.
// De sleutels zijn de waarden die backend/generate-posts.js wegschrijft in
// onderwerp.soort: 'dagoverzicht' of 'artikel'. 'digest' staat erbij omdat de
// artikelen zelf dat woord als type gebruiken.
const SOORT_LABEL = {
    nl: { dagoverzicht: 'Dagoverzicht', digest: 'Dagoverzicht', standaard: 'Goed nieuws' },
    en: { dagoverzicht: 'Daily digest', digest: 'Daily digest', standaard: 'Good news' },
    de: { dagoverzicht: 'Tagesüberblick', digest: 'Tagesüberblick', standaard: 'Gute Nachrichten' },
    fr: { dagoverzicht: 'Résumé du jour', digest: 'Résumé du jour', standaard: 'Bonne nouvelle' },
    es: { dagoverzicht: 'Resumen del día', digest: 'Resumen del día', standaard: 'Buenas noticias' },
};

function label(soort, taal) {
    const set = SOORT_LABEL[taal] || SOORT_LABEL.nl;
    return set[String(soort || '').toLowerCase()] || set.standaard;
}

// Woorden over regels verdelen bij een gegeven lettergrootte.
function breekAf(ctx, tekst, maxBreedte) {
    const regels = [];
    let regel = '';
    for (const woord of String(tekst).split(/\s+/).filter(Boolean)) {
        const poging = regel ? `${regel} ${woord}` : woord;
        if (ctx.measureText(poging).width <= maxBreedte || !regel) {
            regel = poging;
        } else {
            regels.push(regel);
            regel = woord;
        }
    }
    if (regel) regels.push(regel);
    return regels;
}

/* Zoek de grootste lettergrootte waarbij de kop nog binnen het vlak past.
 * Een vaste grootte werkt niet: koppen lopen hier van vier woorden tot een
 * halve zin, en juist het formaat bepaalt of een kaart in de feed leesbaar is.
 * Aflopend zoeken in stappen van 4px is ruim snel genoeg (± 20 metingen). */
function pasKop(ctx, tekst, maxBreedte, maxHoogte, maxGrootte, minGrootte) {
    for (let grootte = maxGrootte; grootte >= minGrootte; grootte -= 4) {
        ctx.font = `600 ${grootte}px ${KAART.letter}`;
        const regels = breekAf(ctx, tekst, maxBreedte);
        const regelhoogte = Math.round(grootte * 1.16);
        if (regels.length * regelhoogte <= maxHoogte) {
            return { grootte, regels, regelhoogte };
        }
    }
    ctx.font = `600 ${minGrootte}px ${KAART.letter}`;
    const regels = breekAf(ctx, tekst, maxBreedte);
    return { grootte: minGrootte, regels, regelhoogte: Math.round(minGrootte * 1.16) };
}

function laadBeeld(src, crossOrigin) {
    return new Promise(resolve => {
        const img = new Image();
        if (crossOrigin) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img.naturalWidth ? img : null);
        // Geen beeld is geen reden om de kaart niet te maken.
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// Het lichte logo voor op een foto: dezelfde paden, de kleuren van de
// donkere modus. Als data:-adres, want de CSP van de cockpit laat blob: niet toe.
let lichtLogo = null;
function laadLogo(licht) {
    if (!licht) return laadBeeld(KAART.logo);
    if (!lichtLogo) {
        lichtLogo = fetch(KAART.logo).then(r => r.text()).then(svg => {
            const licht = svg.replaceAll('#152019', '#F7F8F3').replaceAll('#186F49', '#6FC294');
            return laadBeeld(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(licht)}`);
        }).catch(() => null);
    }
    return lichtLogo;
}

/* De foto van een artikel: de og:image van de pagina. Het merkbeeld
 * (deelafbeelding.png) is geen foto; dat hebben dagoverzichten, en dan nemen
 * we de foto van het eerste verhaal waar het overzicht naar linkt. */
const GEEN_FOTO = /deelafbeelding\.png/;
async function ogImage(pad) {
    const res = await fetch(pad);
    if (!res.ok) return { foto: null, html: '' };
    const html = await res.text();
    const m = html.match(/<meta property="og:image" content="([^"]+)"/);
    const foto = m ? m[1].replaceAll('&amp;', '&').replace(/&#0?38;/g, '&') : null;
    return { foto: foto && !GEEN_FOTO.test(foto) ? foto : null, html };
}

const fotoCache = new Map();
function zoekFoto(artikelUrl) {
    if (!artikelUrl) return Promise.resolve(null);
    if (!fotoCache.has(artikelUrl)) {
        fotoCache.set(artikelUrl, (async () => {
            // Altijd via het eigen pad, zodat het ook lokaal werkt.
            const pad = new URL(artikelUrl, location.href).pathname;
            const eerste = await ogImage(pad);
            if (eerste.foto) return eerste.foto;
            const link = [...eerste.html.matchAll(/href="(\/articles\/[^"]+\.html)"/g)]
                .map(x => x[1]).find(p => p !== pad);
            return link ? (await ogImage(link)).foto : null;
        })().catch(() => null));
    }
    return fotoCache.get(artikelUrl);
}

/* Een foto van een andere site mag het canvas alleen in als die site het
 * toestaat (CORS); anders is de PNG niet te downloaden. GoodNewsNetwork en
 * Optimist Daily staan het niet toe, dus externe foto's gaan via wsrv.nl, een
 * open beeldproxy die het wél toestaat en meteen op 1080 verkleint. Alleen het
 * (openbare) fotoadres gaat daarheen. Valt de proxy weg, dan de roomgele kaart. */
function laadFoto(url) {
    if (!url) return null;
    const u = new URL(url, location.href);
    if (u.hostname === 'brightnews.online' || u.origin === location.origin) {
        return laadBeeld(u.pathname);
    }
    return laadBeeld(`https://wsrv.nl/?url=${encodeURIComponent(u.href)}&w=1080&h=1080&fit=cover`, true);
}

function tekenCover(ctx, img, G) {
    const schaal = Math.max(G / img.naturalWidth, G / img.naturalHeight);
    const b = img.naturalWidth * schaal;
    const h = img.naturalHeight * schaal;
    ctx.drawImage(img, (G - b) / 2, (G - h) / 2, b, h);
}

function verloop(ctx, y0, y1, stops) {
    const v = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [plek, dekking] of stops) v.addColorStop(plek, `rgba(10, 18, 13, ${dekking})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, y0, KAART.formaat, y1 - y0);
}

// De cockpit laadt de oude stylesheet zonder Instrument Sans, dus de kaart
// registreert de letter zelf. Hij moet geladen zijn vóór de eerste
// measureText, anders klopt de afbreking niet met wat je tekent.
let letterGeladen = null;
function wachtOpLetter() {
    if (!letterGeladen) {
        letterGeladen = (async () => {
            if (!document.fonts || typeof FontFace === 'undefined') return;
            try {
                const letter = new FontFace('Instrument Sans',
                    'url(/assets/fonts/instrument-sans-latin.woff2) format("woff2")',
                    { weight: '500 600' });
                document.fonts.add(await letter.load());
            } catch {
                // Letter niet beschikbaar: de fallback in KAART.letter neemt het over.
            }
        })();
    }
    return letterGeladen;
}

/**
 * Tekent de beeldkaart op een canvas van 1080x1080.
 * @param {HTMLCanvasElement} canvas
 * @param {{kop: string, soort?: string, taal?: string, artikelUrl?: string}} gegevens
 * @returns {Promise<{metFoto: boolean}>}
 */
export async function tekenBeeldkaart(canvas, { kop, soort, taal = 'nl', artikelUrl }) {
    const G = KAART.formaat;
    const M = KAART.marge;

    const [, foto] = await Promise.all([wachtOpLetter(), zoekFoto(artikelUrl).then(laadFoto)]);
    const logo = await laadLogo(Boolean(foto));

    // Pas na het laden het doek wissen: anders knippert het voorbeeld.
    canvas.width = G;
    canvas.height = G;
    const ctx = canvas.getContext('2d');
    const kleur = foto
        ? { kop: '#FFFFFF', lijn: '#FFFFFF', lijnDekking: 0.3, adres: '#6FC294' }
        : { kop: KAART.tekst, lijn: KAART.tekst, lijnDekking: 0.12, adres: KAART.groen };

    if (foto) {
        tekenCover(ctx, foto, G);
        verloop(ctx, 0, G, [[0, 0], [0.38, 0], [0.72, 0.72], [1, 0.9]]);
        verloop(ctx, 0, 300, [[0, 0.5], [1, 0]]);
    } else {
        ctx.fillStyle = KAART.achtergrond;
        ctx.fillRect(0, 0, G, G);
    }

    // Logo linksboven.
    let logoOnder = M;
    if (logo && logo.naturalWidth) {
        const b = KAART.logoBreedte;
        const h = Math.round(b * (logo.naturalHeight / logo.naturalWidth));
        ctx.drawImage(logo, M, 92, b, h);
        logoOnder = 92 + h;
    }

    // De kop eindigt altijd op KAART.kopOnder; het label staat er vlak boven.
    const breedte = G - 2 * M;
    const chipHoogte = 56;
    const ruimte = KAART.kopOnder - (logoOnder + 80) - chipHoogte - 40;
    const { grootte, regels, regelhoogte } = pasKop(ctx, kop, breedte, ruimte, 80, 48);
    const kopBoven = KAART.kopOnder - regels.length * regelhoogte;

    // Label: groen vlak, witte tekst (huisregel punt 44).
    const chipTekst = label(soort, taal).toUpperCase();
    ctx.font = `600 26px ${KAART.letter}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    const chipBreedte = ctx.measureText(chipTekst).width + 52;
    const chipY = kopBoven - 40 - chipHoogte;
    ctx.fillStyle = KAART.groen;
    ctx.beginPath();
    ctx.roundRect(M, chipY, chipBreedte, chipHoogte, chipHoogte / 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipTekst, M + 26, chipY + chipHoogte / 2 + 1);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    // De kop.
    ctx.font = `600 ${grootte}px ${KAART.letter}`;
    ctx.fillStyle = kleur.kop;
    ctx.textBaseline = 'top';
    regels.forEach((regel, i) => {
        ctx.fillText(regel, M, kopBoven + i * regelhoogte);
    });

    // Lijn en adres onderaan.
    ctx.globalAlpha = kleur.lijnDekking;
    ctx.fillStyle = kleur.lijn;
    ctx.fillRect(M, 938, breedte, 3);
    ctx.globalAlpha = 1;
    ctx.font = `600 30px ${KAART.letter}`;
    ctx.fillStyle = kleur.adres;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('brightnews.online', M, 994);

    return { metFoto: Boolean(foto) };
}

/** Bestandsnaam zonder rare tekens, zodat de download herkenbaar blijft. */
export function kaartBestandsnaam(kop, taal) {
    const slug = String(kop).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
    return `brightnews-${taal}-${slug || 'kaart'}.png`;
}

/** Canvas naar een PNG-download. */
export function downloadKaart(canvas, bestandsnaam) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Kon de kaart niet omzetten naar PNG.'));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = bestandsnaam;
            document.body.appendChild(a);
            a.click();
            a.remove();
            // Direct vrijgeven kan de download afbreken in Safari.
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            resolve();
        }, 'image/png');
    });
}
