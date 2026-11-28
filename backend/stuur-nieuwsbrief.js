// De wekelijkse nieuwsbrief versturen (TODO 49).
//
// Draait elke ochtend via .github/workflows/nieuwsbrief.yml. Een editie hoort
// bij een zaterdag: van de zaterdag ervoor 07:00 UTC tot die zaterdag 07:00
// UTC, dus elke dag van de week rekent het script dezelfde editie uit.
// Op zaterdag gaat hij naar de eerste abonnees; de dagen erna naar wie er nog
// niet aan toe kwam. Waarom over dagen verspreid: Resend is gratis tot 100
// mails per dag (en de welkomstreeks gebruikt er ook een paar). Per run gaan
// er hooguit NIEUWSBRIEF_PER_RUN (standaard 80) uit; meldt Resend dat de
// daglimiet op is, dan stopt de run netjes en gaat de volgende dag verder.
//
// Wie krijgt hem: bevestigd vóór het begin van de editie en niet afgemeld.
// nieuwsbrief_log (email, editie) is de sleutel, dus twee keer draaien stuurt
// niets dubbel.
//
// De inhoud: per taal de vijf best scorende verhalen van die week uit
// data/news_<taal>.json (zonder dagoverzichten), met UTM-tags.
//
// Nodig als secret: SUPABASE_SERVICE_ROLE_KEY en RESEND_API_KEY (bestaan al).
// Zonder RESEND_API_KEY doet het script niets.
//
//   node backend/stuur-nieuwsbrief.js --droog       wie hem zou krijgen, niets weg
//   node backend/stuur-nieuwsbrief.js --voorbeeld   alleen de mail in vijf talen
//                                                   als HTML in de tijdelijke map
//                                                   (geen database nodig)

const fs = require('fs');
const os = require('os');
const path = require('path');
require('dotenv').config();

const { NIEUWSBRIEF } = require('./nieuwsbriefteksten');
const { vulIn } = require('./mailteksten');
const { mailHtml, escape, KLEUR } = require('./mailopmaak');

const SITE = 'https://brightnews.online';
const AFZENDER = 'BrightNews <info@brightnews.online>';
const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const TALEN = Object.keys(NIEUWSBRIEF);
const AANTAL_VERHALEN = 5;
const PER_RUN = Number(process.env.NIEUWSBRIEF_PER_RUN) || 80;
const DROOG = process.argv.includes('--droog');
const VOORBEELD = process.argv.includes('--voorbeeld');

const wacht = ms => new Promise(r => setTimeout(r, ms));

// De zaterdag van deze editie (07:00 UTC), de laatste die al begonnen is.
function editieVan(nu = new Date()) {
    const d = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate(), 7));
    while (d.getUTCDay() !== 6 || d > nu) d.setUTCDate(d.getUTCDate() - 1);
    return d;
}

// "Een beetje" ingekort, op een woordgrens.
function kort(tekst, max = 170) {
    const schoon = String(tekst || '').replace(/\s+/g, ' ').replace(/\.{3}$/, '').trim();
    if (schoon.length <= max) return schoon;
    return `${schoon.slice(0, schoon.lastIndexOf(' ', max)).replace(/[\s.,;:!?-]+$/, '')}…`;
}

function verhalen(taal, editie) {
    const begin = editie.getTime() - 7 * 86400000;
    const bestand = path.join(__dirname, '..', 'data', `news_${taal}.json`);
    const feed = JSON.parse(fs.readFileSync(bestand, 'utf8'));
    return feed
        .filter(a => a.type !== 'digest' && a.slug && a.id)
        .filter(a => { const t = new Date(a.date).getTime(); return t >= begin && t < editie.getTime(); })
        .sort((a, b) => (b.score || 0) - (a.score || 0) || new Date(b.date) - new Date(a.date))
        .slice(0, AANTAL_VERHALEN);
}

function metUtm(url, editieDag) {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'nieuwsbrief');
    u.searchParams.set('utm_medium', 'email');
    u.searchParams.set('utm_campaign', `editie-${editieDag}`);
    return u.toString();
}

function bouwMail(taal, lijst, editieDag, afmeldUrl) {
    const t = NIEUWSBRIEF[taal];
    const items = lijst.map(a => {
        const url = metUtm(`${SITE}/articles/${taal}/${a.slug}-${a.id}.html`, editieDag);
        return `<a href="${escape(url)}" style="color:${KLEUR.tekst};font-weight:600;text-decoration:underline;text-underline-offset:3px">${escape(a.title)}</a><br>${escape(kort(a.summary))}`;
    });
    return {
        onderwerp: vulIn(t.onderwerp, { titel: lijst[0].title }),
        html: mailHtml({
            taal,
            kop: escape(t.kop),
            alineas: [escape(t.intro), ...items],
            knop: escape(t.knop),
            knopUrl: escape(metUtm(`${SITE}/`, editieDag)),
            voet: [
                escape(t.reden),
                `${escape(t.afmeld)} <a href="${escape(afmeldUrl)}" style="color:${KLEUR.zacht}">${escape(t.afmeldLink)}</a>`,
            ],
        }),
    };
}

async function verstuur({ naar, onderwerp, html, afmeldUrl }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        // List-Unsubscribe zonder -Post: GitHub Pages kan geen POST, de knop
        // in het mailprogramma opent dus de afmeldpagina (zie stuur-mails.js).
        body: JSON.stringify({ from: AFZENDER, to: [naar], subject: onderwerp, html, headers: { 'List-Unsubscribe': `<${afmeldUrl}>` } }),
    });
    if (!res.ok) {
        const fout = new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
        fout.status = res.status;
        throw fout;
    }
    return (await res.json()).id ?? null;
}

function voorbeeld(editie) {
    const dag = editie.toISOString().slice(0, 10);
    for (const taal of TALEN) {
        const lijst = verhalen(taal, editie);
        if (!lijst.length) { console.log(`${taal}: geen verhalen deze week`); continue; }
        const { onderwerp, html } = bouwMail(taal, lijst, dag, `${SITE}/nieuwsbrief.html?afmelden=voorbeeld`);
        const uit = path.join(os.tmpdir(), `nieuwsbrief-${taal}.html`);
        fs.writeFileSync(uit, html);
        console.log(`${taal}: "${onderwerp}" (${lijst.length} verhalen) → ${uit}`);
    }
}

async function main() {
    const editie = editieVan();
    const editieDag = editie.toISOString().slice(0, 10);
    console.log(`📰 Editie van ${editieDag}.`);
    if (VOORBEELD) return voorbeeld(editie);

    if (!DROOG && !process.env.RESEND_API_KEY) {
        console.log('📭 RESEND_API_KEY ontbreekt, dus niets te doen.');
        return;
    }
    const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sleutel) { console.error('💥 SUPABASE_SERVICE_ROLE_KEY ontbreekt, gestopt.'); process.exit(1); }
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(SUPABASE_URL, sleutel);

    const { data: abonnees, error } = await db.from('nieuwsbrief_abonnees')
        .select('email, taal, token')
        .not('bevestigd_op', 'is', null)
        .is('afgemeld_op', null)
        .lt('bevestigd_op', editie.toISOString());
    if (error) throw new Error(`abonnees lezen mislukt: ${error.message}`);

    const { data: log, error: logFout } = await db.from('nieuwsbrief_log').select('email').eq('editie', editieDag);
    if (logFout) throw new Error(`log lezen mislukt: ${logFout.message}`);
    const gehad = new Set((log ?? []).map(r => r.email));
    const nog = (abonnees ?? []).filter(a => !gehad.has(a.email));

    // Openbare logs: geen adressen, alleen aantallen.
    console.log(`👥 ${abonnees?.length ?? 0} abonnees, ${gehad.size} hadden deze editie al, ${nog.length} te gaan (hooguit ${PER_RUN} per run).`);

    const lijsten = Object.fromEntries(TALEN.map(taal => [taal, verhalen(taal, editie)]));
    let verstuurd = 0;
    let mislukt = 0;

    for (const a of nog.slice(0, PER_RUN)) {
        const lijst = lijsten[a.taal]?.length ? lijsten[a.taal] : lijsten.en;
        const taal = lijsten[a.taal]?.length ? a.taal : 'en';
        if (!lijst.length) { console.warn('⚠️  geen verhalen deze week, gestopt'); break; }
        const afmeldUrl = `${SITE}/nieuwsbrief.html?afmelden=${a.token}`;
        const { onderwerp, html } = bouwMail(taal, lijst, editieDag, afmeldUrl);
        if (DROOG) { verstuurd++; continue; }
        try {
            const id = await verstuur({ naar: a.email, onderwerp, html, afmeldUrl });
            const { error: insFout } = await db.from('nieuwsbrief_log').insert({ email: a.email, editie: editieDag, provider_id: id });
            if (insFout) console.warn(`⚠️  verstuurd maar niet gelogd: ${insFout.message}`);
            verstuurd++;
        } catch (fout) {
            mislukt++;
            console.warn(`⚠️  ${fout.message}`);
            // Daglimiet van Resend: morgen verder.
            if (fout.status === 429) break;
        }
        await wacht(600); // Resend: 2 verzoeken per seconde
    }

    console.log(`${DROOG ? '🧪 Droogloop: zou versturen' : '✅ Verstuurd'}: ${verstuurd}${mislukt ? `, mislukt: ${mislukt}` : ''}.`);
    if (mislukt && !verstuurd) process.exit(1);
}

module.exports = { editieVan, kort };

if (require.main === module) {
    main().catch(fout => { console.error(`💥 ${fout.message}`); process.exit(1); });
}
