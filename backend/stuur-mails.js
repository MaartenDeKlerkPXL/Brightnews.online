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

const SITE = 'https://brightnews.online';
const AFZENDER = 'BrightNews <info@brightnews.online>';
const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const DROOG = process.argv.includes('--droog');

const GROEN = '#32CD32';
const DONKER = '#1A1A1A';

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

function escape(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Eén sjabloon voor alle drie de mails. Tabel-layout en inline stijlen: dat is
// geen slordigheid maar de enige opmaak die Outlook en Gmail allebei correct
// tonen. Geen externe afbeeldingen, dus niets valt weg als beelden uitstaan.
function bouwHtml({ kop, alinea, knop, knopUrl, taal, afmeldUrl }) {
    const voet = VOET[taal] || VOET.nl;
    const alineas = alinea.map(a =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${DONKER}">${escape(a)}</p>`
    ).join('');
    return `<!DOCTYPE html>
<html lang="${taal}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FBF8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FBF8">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="height:6px;background:${GROEN};font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:32px 32px 8px">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${GROEN}">BrightNews</p>
    <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;color:${DONKER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${escape(kop)}</h1>
  </td></tr>
  <tr><td style="padding:0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${alineas}</td></tr>
  <tr><td style="padding:12px 32px 36px">
    <a href="${escape(knopUrl)}" style="display:inline-block;background:${GROEN};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${escape(knop)}</a>
  </td></tr>
  <tr><td style="padding:20px 32px 28px;border-top:1px solid #E6EDE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6B726B">${escape(voet.reden)}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#6B726B">${escape(voet.afmeld)}
      <a href="${escape(afmeldUrl)}" style="color:#6B726B">${escape(voet.afmeldLink)}</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

async function verstuur({ naar, onderwerp, html }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: AFZENDER, to: [naar], subject: onderwerp, html }),
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
            const { data, error } = await db.from('mail_voorkeuren')
                .insert({ uid: g.id }).select('uid, token, afgemeld').single();
            if (error) { console.warn(`⚠️  voorkeuren aanmaken mislukt voor ${g.id}: ${error.message}`); mislukt++; continue; }
            vk = data;
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
            const id = await verstuur({ naar: g.email, onderwerp: sjabloon.onderwerp, html });
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
