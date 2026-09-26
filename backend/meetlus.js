/**
 * De meetlus: bereik en zoekverkeer erbij halen voor het weekrapport.
 *
 * Waarom dit bestaat: het weekrapport telt al wat we zélf maken (artikelen,
 * conceptposts) en wat er onderaan de trechter uitkomt (accounts, abonnees,
 * promocodes). Wat ertussenin zat ontbrak: hoeveel mensen er eigenlijk komen,
 * waar ze vandaan komen, en of een post iets opleverde. Daardoor kon je wel
 * zien dát er niemand betaalde, maar niet of dat kwam doordat er niemand kwam
 * of doordat wie kwam niet bleef. Dat verschil bepaalt wat je eraan doet.
 *
 * Twee bronnen, allebei van Google:
 * - **GA4** (property van `G-ZNFX3R9BQV`): bezoekers, sessies en vanaf welk
 *   kanaal. De UTM-tags die `generate-posts.js` in elke link zet komen hier
 *   terug als bron/medium, dus hier zie je of een post is aangeklikt.
 * - **Search Console**: vertoningen, kliks en op welke zoektermen. Dat is het
 *   verkeer dat niét van social komt.
 *
 * **Zonder sleutel doet dit niets en faalt het niet.** Zelfde patroon als de
 * Supabase-koppeling in `generate-rapport.js`: is `GOOGLE_SERVICE_ACCOUNT` er
 * niet, dan geeft elke functie `null` terug en zet het rapport er netjes bij
 * dat de koppeling nog niet staat. Het weekrapport hoort nooit om te vallen
 * omdat een meting niet lukt — dan verlies je ook de cijfers die wél werken.
 *
 * Instellen (eenmalig, zie TODO-punt 30):
 *   GOOGLE_SERVICE_ACCOUNT  de volledige service-account-JSON als één regel
 *   GA4_PROPERTY_ID         het numerieke property-id (niet G-ZNFX3R9BQV)
 *
 * Losse test:  node backend/meetlus.js
 */

const crypto = require('crypto');

const SITE = 'https://brightnews.online/';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly'
].join(' ');

/** base64url zonder padding — wat een JWT verwacht. */
function b64url(input) {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function leesServiceAccount() {
    const ruw = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!ruw) return null;
    try {
        const sa = JSON.parse(ruw);
        if (!sa.client_email || !sa.private_key) return null;
        return sa;
    } catch {
        // Een kapotte JSON is geen reden om het rapport te laten mislukken;
        // de meting valt gewoon weg en dat staat er dan bij.
        console.warn('⚠️ meetlus: GOOGLE_SERVICE_ACCOUNT is geen geldige JSON — meting overgeslagen.');
        return null;
    }
}

/**
 * Ruilt de service-account-sleutel om voor een toegangstoken. Met de hand
 * ondertekend (RS256) zodat er geen extra npm-pakket bij hoeft; Node kan dit
 * zelf en dit draait maar één keer per week.
 */
async function haalToken(sa) {
    const nu = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: SCOPES,
        aud: TOKEN_URL,
        exp: nu + 3600,
        iat: nu
    }));
    const handtekening = crypto
        .createSign('RSA-SHA256')
        .update(`${header}.${claim}`)
        .sign(sa.private_key.replace(/\\n/g, '\n'));
    const jwt = `${header}.${claim}.${b64url(handtekening)}`;

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });
    if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 120)}`);
    return (await res.json()).access_token;
}

/** GA4: bezoekers en sessies per bron/medium over de opgegeven periode. */
async function haalGa4(token, vanIso, totIso) {
    const property = process.env.GA4_PROPERTY_ID;
    if (!property) return { fout: 'GA4_PROPERTY_ID ontbreekt' };

    const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dateRanges: [{ startDate: vanIso, endDate: totIso }],
                dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
                metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
                limit: 25
            })
        }
    );
    if (!res.ok) return { fout: `GA4 ${res.status}: ${(await res.text()).slice(0, 120)}` };

    const data = await res.json();
    const rijen = (data.rows || []).map(r => ({
        bron: r.dimensionValues[0].value,
        medium: r.dimensionValues[1].value,
        sessies: Number(r.metricValues[0].value),
        bezoekers: Number(r.metricValues[1].value)
    }));
    return {
        rijen,
        sessies: rijen.reduce((a, r) => a + r.sessies, 0),
        bezoekers: rijen.reduce((a, r) => a + r.bezoekers, 0),
        // Alles met medium 'social' komt van onze eigen posts: dat zijn de
        // UTM-tags die generate-posts.js meegeeft.
        viaSocial: rijen.filter(r => r.medium === 'social').reduce((a, r) => a + r.sessies, 0)
    };
}

/** Search Console: vertoningen, kliks en de zoektermen die het meest opleveren. */
async function haalSearchConsole(token, vanIso, totIso) {
    // Search Console kent twee property-vormen: URL-prefix ("https://…/") en
    // domein ("sc-domain:…"). Welke van de twee er in de console is
    // aangemaakt is vanaf hier niet te zien, en de verkeerde vorm geeft een
    // 403 — daarom proberen we ze allebei voordat we het opgeven.
    let laatsteFout = null;
    for (const site of [SITE, `sc-domain:${new URL(SITE).hostname}`]) {
        const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: vanIso, endDate: totIso, dimensions: ['query'], rowLimit: 10 })
        });
        if (res.ok) return verwerkSearchConsole(await res.json());
        laatsteFout = `Search Console ${res.status}: ${(await res.text()).slice(0, 120)}`;
        if (res.status !== 403 && res.status !== 404) break;
    }
    return { fout: laatsteFout };
}

function verwerkSearchConsole(data) {
    const rijen = (data.rows || []).map(r => ({
        term: r.keys[0],
        kliks: r.clicks,
        vertoningen: r.impressions,
        positie: Math.round(r.position * 10) / 10
    }));
    return {
        rijen,
        kliks: rijen.reduce((a, r) => a + r.kliks, 0),
        vertoningen: rijen.reduce((a, r) => a + r.vertoningen, 0)
    };
}

/**
 * Haalt beide bronnen op voor de afgelopen `dagen` dagen.
 * Geeft altijd een object terug; `beschikbaar: false` betekent dat er geen
 * koppeling is, niet dat er iets stuk is.
 */
async function haalBereik(dagen = 7) {
    const sa = leesServiceAccount();
    if (!sa) return { beschikbaar: false, reden: 'GOOGLE_SERVICE_ACCOUNT ontbreekt' };

    const totIso = new Date().toISOString().slice(0, 10);
    const vanIso = new Date(Date.now() - dagen * 24 * 3600 * 1000).toISOString().slice(0, 10);

    try {
        const token = await haalToken(sa);
        const [ga4, sc] = await Promise.all([
            haalGa4(token, vanIso, totIso).catch(e => ({ fout: String(e.message).slice(0, 120) })),
            haalSearchConsole(token, vanIso, totIso).catch(e => ({ fout: String(e.message).slice(0, 120) }))
        ]);
        return { beschikbaar: true, van: vanIso, tot: totIso, ga4, searchConsole: sc };
    } catch (err) {
        return { beschikbaar: false, reden: String(err.message).slice(0, 160) };
    }
}

/** Zet het resultaat om in het markdown-blok voor het weekrapport. */
function schrijfBereikSectie(meting) {
    if (!meting.beschikbaar) {
        return `## Bereik en zoekverkeer
Nog geen koppeling: **${meting.reden}**. Zolang die ontbreekt lees je de
cijfers handmatig af in GA4 en Search Console. Instellen staat als punt 30 in
\`TODO.md\`; het kost eenmalig een service-account in Google Cloud.
`;
    }

    const regels = [`## Bereik en zoekverkeer`, `*${meting.van} t/m ${meting.tot}*`, ''];

    if (meting.ga4.fout) {
        regels.push(`- GA4: meting mislukt (${meting.ga4.fout})`);
    } else {
        regels.push(`- Bezoekers: **${meting.ga4.bezoekers}** · sessies: **${meting.ga4.sessies}** · daarvan via social: **${meting.ga4.viaSocial}**`);
        if (meting.ga4.rijen.length) {
            regels.push('', '| Bron | Medium | Sessies |', '|---|---|---|');
            for (const r of meting.ga4.rijen.slice(0, 8)) {
                regels.push(`| ${r.bron} | ${r.medium} | ${r.sessies} |`);
            }
        }
    }

    regels.push('');
    if (meting.searchConsole.fout) {
        regels.push(`- Search Console: meting mislukt (${meting.searchConsole.fout})`);
    } else {
        regels.push(`- Zoekverkeer: **${meting.searchConsole.kliks}** kliks uit **${meting.searchConsole.vertoningen}** vertoningen`);
        if (meting.searchConsole.rijen.length) {
            regels.push('', '| Zoekterm | Kliks | Vertoningen | Positie |', '|---|---|---|---|');
            for (const r of meting.searchConsole.rijen.slice(0, 8)) {
                regels.push(`| ${r.term} | ${r.kliks} | ${r.vertoningen} | ${r.positie} |`);
            }
        }
    }

    return regels.join('\n') + '\n';
}

module.exports = { haalBereik, schrijfBereikSectie };

// Losse test: node backend/meetlus.js
if (require.main === module) {
    haalBereik(7).then(m => {
        console.log(JSON.stringify(m, null, 2));
        console.log('\n--- zoals het in het rapport komt ---\n');
        console.log(schrijfBereikSectie(m));
    });
}
