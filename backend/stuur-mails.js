// De welkomstreeks versturen (TODO punt 60).
//
// Draait één keer per dag via .github/workflows/welkomstreeks.yml. Kijkt wie
// er vandaag een mail toekomt, stuurt die, en schrijft het weg in mail_log
// zodat niemand hem twee keer krijgt.
//
// Drie momenten, uit backend/mailteksten.js: dag 0 (welkom), dag 3 en dag 7.
// De teksten staan bewust in dat aparte bestand — wie de toon wil bijstellen
// hoeft dit script niet te lezen.
//
// Nodig als secret:
//   SUPABASE_SERVICE_ROLE_KEY  (bestaat al)
//   RESEND_API_KEY             (nieuw — zie TODO punt 60)
//
// Zonder RESEND_API_KEY stopt het script netjes en doet niets. Dat is
// expres: de Action mag al bestaan voordat de verzenddienst er is.
//
// DROOGLOOP: `node backend/stuur-mails.js --droog` stuurt niets en drukt af
// wie er vandaag een mail zou krijgen. Gebruik dat de eerste keer.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { MAILS, VOET, TALEN, SOORTEN, DAGEN, vulIn } = require('./mailteksten');
const { mailHtml, escape } = require('./mailopmaak');

const SITE = 'https://brightnews.online';
const AFZENDER = 'BrightNews <info@brightnews.online>';
const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const DROOG = process.argv.includes('--droog');


function client() {
    const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sleutel) {
        console.error('💥 SUPABASE_SERVICE_ROLE_KEY ontbreekt — gestopt.');
        process.exit(1);
    }
    return createClient(SUPABASE_URL, sleutel);
}

// Hoeveel hele dagen geleden is deze gebruiker aangemaakt?
function dagenGeleden(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    return Math.floor(ms / 86400000);
}

// Welke mail hoort deze gebruiker vandaag te krijgen? De laatste die hij
// verdient en nog niet heeft gehad — zo krijgt iemand die zich vier dagen
// geleden aanmeldde terwijl het script stillag niet ineens drie mails, maar
// alleen de mail die bij zijn leeftijd hoort.
function welkeMail(dagen, alGehad) {
    let keuze = null;
    for (const soort of SOORTEN) {
        if (dagen >= DAGEN[soort] && !alGehad.has(soort)) keuze = soort;
    }
    return keuze;
}

function taalVan(gebruiker) {
    const t = gebruiker.user_metadata?.preferred_lang;
    return TALEN.includes(t) ? t : 'nl';
}

function voornaam(gebruiker, taal) {
    const vol = String(gebruiker.user_metadata?.full_name || '').trim();
    if (vol) return vol.split(/\s+/)[0];
    return { nl: 'daar', en: 'there', de: 'du', fr: 'à vous', es: 'hola' }[taal] || 'daar';
}

// Het best scorende artikel in die taal, voor mail 2. Komt uit de feed die de
// marketing-agent toch al elke nacht schrijft — geen extra bron, geen AI-call.
function besteArtikel(taal) {
    const p = path.join(__dirname, '..', 'data', 'marketing-feed.json');
    if (!fs.existsSync(p)) return null;
    const feed = JSON.parse(fs.readFileSync(p, 'utf8'));
    const top = feed.perTaal?.[taal]?.top?.[0];
    return top ? { titel: top.titel, url: top.url } : null;
}

// Eén opmaak voor alle drie de mails: de v5-huisstijl uit backend/mailopmaak.js,
// dezelfde als de mails van Supabase (TODO 74).
function bouwHtml({ kop, alinea, knop, knopUrl, taal, afmeldUrl }) {
    const voet = VOET[taal] || VOET.nl;
    return mailHtml({
        taal,
        kop: escape(kop),
        alineas: alinea.map(escape),
        knop: escape(knop),
        knopUrl: escape(knopUrl),
        voet: [
            escape(voet.reden),
            `${escape(voet.afmeld)} <a href="${escape(afmeldUrl)}" style="color:#4e574d">${escape(voet.afmeldLink)}</a>`,
        ],
    });
}

async function verstuur({ naar, onderwerp, html, afmeldUrl }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        // List-Unsubscribe: Gmail en Apple Mail tonen dan zelf een afmeldknop.
        // Zonder List-Unsubscribe-Post (één klik vraagt een POST-adres, en
        // GitHub Pages kan geen POST): de knop opent de afmeldpagina.
        body: JSON.stringify({ from: AFZENDER, to: [naar], subject: onderwerp, html, headers: { 'List-Unsubscribe': `<${afmeldUrl}>` } }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).id ?? null;
}

// auth.users is alleen via de admin-API te lezen; listUsers pagineert.
async function alleGebruikers(db) {
    const uit = [];
    for (let pagina = 1; pagina <= 20; pagina++) {
        const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
        if (error) throw new Error(`listUsers: ${error.message}`);
        uit.push(...(data?.users ?? []));
        if ((data?.users ?? []).length < 200) break;
    }
    return uit;
}

async function main() {
    if (!DROOG && !process.env.RESEND_API_KEY) {
        console.log('📭 RESEND_API_KEY ontbreekt — nog geen verzenddienst, dus niets te doen.');
        return;
    }

    const db = client();
    const gebruikers = await alleGebruikers(db);
    console.log(`👥 ${gebruikers.length} accounts.`);

    const { data: logRijen, error: logFout } = await db.from('mail_log').select('uid, soort');
    if (logFout) throw new Error(`mail_log lezen mislukt: ${logFout.message}`);
    const gehad = new Map();
    for (const r of logRijen ?? []) {
        if (!gehad.has(r.uid)) gehad.set(r.uid, new Set());
        gehad.get(r.uid).add(r.soort);
    }

    const { data: vkRijen, error: vkFout } = await db.from('mail_voorkeuren').select('uid, token, afgemeld');
    if (vkFout) throw new Error(`mail_voorkeuren lezen mislukt: ${vkFout.message}`);
    const voorkeur = new Map((vkRijen ?? []).map(r => [r.uid, r]));

    let verstuurd = 0;
    let overgeslagen = 0;
    let mislukt = 0;

    for (const g of gebruikers) {
        // Niet-bevestigde adressen krijgen niets: die mail bounced toch, en
        // een bounce kost reputatie bij elke verzenddienst.
        if (!g.email || !g.email_confirmed_at) { overgeslagen++; continue; }

        let vk = voorkeur.get(g.id);
        if (!vk) {
            // Vinkte de lezer bij Account maken "Stuur me geen welkomstmails"
            // aan (v5-inloggen.html), dan begint hij afgemeld. Zo klopt ook de
            // mails-schakelaar in Mijn account meteen.
            const afgemeld = g.user_metadata?.geen_welkomstmails === true;
            const { data, error } = await db.from('mail_voorkeuren')
                .insert({ uid: g.id, afgemeld, ...(afgemeld ? { afgemeld_op: new Date().toISOString() } : {}) })
                .select('uid, token, afgemeld').single();
            if (error?.code === '23505') {
                // Intussen zelf aangemaakt via Mijn account (zet_mails): die rij geldt.
                const opnieuw = await db.from('mail_voorkeuren').select('uid, token, afgemeld').eq('uid', g.id).single();
                if (opnieuw.error) { console.warn(`⚠️  voorkeuren lezen mislukt voor ${g.id}: ${opnieuw.error.message}`); mislukt++; continue; }
                vk = opnieuw.data;
            } else if (error) { console.warn(`⚠️  voorkeuren aanmaken mislukt voor ${g.id}: ${error.message}`); mislukt++; continue; }
            else vk = data;
        }
        if (vk.afgemeld) { overgeslagen++; continue; }

        const soort = welkeMail(dagenGeleden(g.created_at), gehad.get(g.id) ?? new Set());
        if (!soort) { overgeslagen++; continue; }

        const taal = taalVan(g);
        const sjabloon = (MAILS[taal] ?? MAILS.nl)[soort];
        const artikel = soort === 'dagdrie' ? besteArtikel(taal) : null;

        // Zonder artikel is mail 2 zinloos; dan liever overslaan en morgen
        // opnieuw proberen dan een mail met een gat erin sturen.
        if (soort === 'dagdrie' && !artikel) { overgeslagen++; continue; }

        const waarden = {
            naam: voornaam(g, taal),
            artikel_titel: artikel?.titel ?? '',
        };
        const knopUrl = soort === 'dagdrie' ? artikel.url
            : soort === 'dagzeven' ? `${SITE}/abonnementen.html`
                : `${SITE}/`;

        const html = bouwHtml({
            kop: vulIn(sjabloon.kop, waarden),
            alinea: sjabloon.alinea.map(a => vulIn(a, waarden)),
            knop: sjabloon.knop,
            knopUrl,
            taal,
            afmeldUrl: `${SITE}/afmelden.html?t=${vk.token}`,
        });

        if (DROOG) {
            console.log(`   [droog] ${soort} → ${g.email} (${taal}) — "${sjabloon.onderwerp}"`);
            verstuurd++;
            continue;
        }

        try {
            const id = await verstuur({ naar: g.email, onderwerp: sjabloon.onderwerp, html, afmeldUrl: `${SITE}/afmelden.html?t=${vk.token}` });
            const { error } = await db.from('mail_log')
                .insert({ uid: g.id, soort, provider_id: id });
            if (error) console.warn(`⚠️  ${g.email}: verstuurd maar niet gelogd — ${error.message}`);
            verstuurd++;
        } catch (e) {
            console.warn(`⚠️  ${g.email}: ${e.message}`);
            mislukt++;
        }
    }

    console.log(`📬 ${verstuurd} ${DROOG ? 'zouden er vertrekken' : 'verstuurd'}, ${overgeslagen} overgeslagen, ${mislukt} mislukt.`);
    if (mislukt > 0 && !DROOG) process.exitCode = 1;
}

main().catch(e => {
    console.error('💥', e.message);
    process.exit(1);
});
