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
 *    download hoort daar. Zodra de publicatielus er is (punt 45, stap 4) kan
 *    dezelfde tekenfunctie naar een server-side canvas.
 *
 * Ontwerp: lichte kaart (--light-bg) met een dikke groene baan links, kop in
 * Schibsted Grotesk ExtraBold, links uitgelijnd. Bewust niet het standaard
 * volvlak-groen met witte gecentreerde tekst: in een Instagram-feed vol
 * schreeuwerige kaarten valt een rustige, redactionele kaart juist óp, en de
 * groene baan is dezelfde streep als de dagkop in de cockpit en de accenten
 * op de site — je ziet aan de vorm dat het BrightNews is, zonder groot logo.
 * Tekst op het groene vlak is wit (huisregel, TODO punt 44).
 */

const KAART = {
    formaat: 1080,
    baanBreedte: 28,
    marge: 96,
    groen: '#32CD32',
    achtergrond: '#F8FBF8',
    tekst: '#1A1A1A',
    letter: '"Schibsted Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    // De horizontale wordmark, niet het 'vierkante' logo: dat is dezelfde
    // wordmark op een vierkant doek met veel witruimte, en die wordt op
    // voetmaat onleesbaar.
    logo: '/assets/brightnews-logo.png',
    logoBreedte: 340,
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
        ctx.font = `800 ${grootte}px ${KAART.letter}`;
        const regels = breekAf(ctx, tekst, maxBreedte);
        const regelhoogte = Math.round(grootte * 1.14);
        if (regels.length * regelhoogte <= maxHoogte) {
            return { grootte, regels, regelhoogte };
        }
    }
    ctx.font = `800 ${minGrootte}px ${KAART.letter}`;
    const regels = breekAf(ctx, tekst, maxBreedte);
    return { grootte: minGrootte, regels, regelhoogte: Math.round(minGrootte * 1.14) };
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

// De merkletter moet geladen zijn vóór de eerste measureText, anders meet je
// de systeemletter op en klopt de afbreking niet meer met wat je tekent.
async function wachtOpLetter() {
    if (!document.fonts) return;
    try {
        await Promise.all([
            document.fonts.load('800 120px "Schibsted Grotesk"'),
            document.fonts.load('700 34px "Schibsted Grotesk"'),
            document.fonts.load('500 30px "Schibsted Grotesk"'),
        ]);
        await document.fonts.ready;
    } catch {
        // Letter niet beschikbaar: de fallback in KAART.letter neemt het over.
    }
}

/**
 * Tekent de beeldkaart op een canvas van 1080x1080.
 * @param {HTMLCanvasElement} canvas
 * @param {{kop: string, soort?: string, taal?: string}} gegevens
 */
export async function tekenBeeldkaart(canvas, { kop, soort, taal = 'nl' }) {
    const G = KAART.formaat;
    canvas.width = G;
    canvas.height = G;
    const ctx = canvas.getContext('2d');

    await wachtOpLetter();

    ctx.fillStyle = KAART.achtergrond;
    ctx.fillRect(0, 0, G, G);

    // De groene baan links — het herkenningspunt van de kaart.
    ctx.fillStyle = KAART.groen;
    ctx.fillRect(0, 0, KAART.baanBreedte, G);

    const x = KAART.baanBreedte + KAART.marge;
    const breedte = G - x - KAART.marge;

    // Chip: groen vlak, witte tekst (huisregel punt 44).
    const chipTekst = label(soort, taal).toUpperCase();
    ctx.font = `700 30px ${KAART.letter}`;
    const chipBreedte = ctx.measureText(chipTekst).width + 44;
    const chipY = KAART.marge + 40;
    ctx.fillStyle = KAART.groen;
    ctx.beginPath();
    ctx.roundRect(x, chipY, chipBreedte, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipTekst, x + 22, chipY + 27);

    // De kop krijgt alles tussen de chip en de voettekst.
    const kopBoven = chipY + 52 + 64;
    const voetHoogte = 190;
    const kopOnder = G - KAART.marge - voetHoogte;
    const { regels, regelhoogte } = pasKop(ctx, kop, breedte, kopOnder - kopBoven, 104, 48);

    // De kop hangt aan de ónderkant van zijn vlak, niet aan de bovenkant: zo
    // staat de tekst bij een kop van drie woorden op dezelfde optische plek
    // als bij een kop van twintig, en oogt de reeks als één serie in plaats
    // van als losse kaarten. De lucht valt dan boven de tekst, onder de chip.
    const blokHoogte = regels.length * regelhoogte;
    const start = kopOnder - blokHoogte;
    ctx.fillStyle = KAART.tekst;
    ctx.textBaseline = 'top';
    regels.forEach((regel, i) => {
        ctx.fillText(regel, x, start + i * regelhoogte);
    });

    // Voet: alleen de wordmark. Die bevat zelf al ".online", dus een losse
    // regel met de domeinnaam eronder is dubbelop.
    const logo = await laadLogo();
    if (logo && logo.naturalWidth) {
        const b = KAART.logoBreedte;
        const h = Math.round(b * (logo.naturalHeight / logo.naturalWidth));
        ctx.drawImage(logo, x, G - KAART.marge - h, b, h);
    }

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
