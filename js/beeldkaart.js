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

function laadLogo() {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        // Geen logo is geen reden om de kaart niet te maken.
        img.onerror = () => resolve(null);
        img.src = KAART.logo;
    });
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
 * @param {{kop: string, soort?: string, taal?: string}} gegevens
 */
export async function tekenBeeldkaart(canvas, { kop, soort, taal = 'nl' }) {
    const G = KAART.formaat;
    const M = KAART.marge;
    canvas.width = G;
    canvas.height = G;
    const ctx = canvas.getContext('2d');

    const [, logo] = await Promise.all([wachtOpLetter(), laadLogo()]);

    ctx.fillStyle = KAART.achtergrond;
    ctx.fillRect(0, 0, G, G);

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
    ctx.fillStyle = KAART.tekst;
    ctx.textBaseline = 'top';
    regels.forEach((regel, i) => {
        ctx.fillText(regel, M, kopBoven + i * regelhoogte);
    });

    // Lijn en adres onderaan.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = KAART.tekst;
    ctx.fillRect(M, 938, breedte, 3);
    ctx.globalAlpha = 1;
    ctx.font = `600 30px ${KAART.letter}`;
    ctx.fillStyle = KAART.groen;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('brightnews.online', M, 994);

    return canvas;
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
