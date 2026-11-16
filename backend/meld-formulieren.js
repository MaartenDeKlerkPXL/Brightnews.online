// De verzamelmail van de ochtend naar info@brightnews.online (TODO 83, fase 3).
//
// Draait één keer per dag via .github/workflows/meld-formulieren.yml. Stuurt in
// één mail alle feedback op artikelen die nog niet gemeld is, plus de
// contactberichten die niet direct als mail gingen (geen Resend-sleutel in de
// Vault, of meer dan 20 in een uur: supabase/fase3-meldingen-2026-11-16.sql).
// Daarna krijgen ze gemeld_op, zodat niets twee keer komt. Niets nieuws: geen mail.
//
// Nodig als secret: SUPABASE_SERVICE_ROLE_KEY en RESEND_API_KEY (bestaan al).
// Zonder RESEND_API_KEY stopt het script netjes.
//
//   node backend/meld-formulieren.js --droog    telt wat er in de mail zou komen, verstuurt niets

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SITE = 'https://brightnews.online';
const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const ADRES = 'info@brightnews.online';
const DROOG = process.argv.includes('--droog');

const KEUZE = {
    samenvatting: 'Fout in de samenvatting', bron: 'Bron of link klopt niet', geen_goed: 'Eigenlijk geen goed nieuws',
    fout_artikel: 'Fout in een artikel', idee: 'Idee voor de site', anders: 'Iets anders',
};
const ONDERWERP = {
    abonnement: 'Vraag over abonnement', account: 'Account of gegevens verwijderen', fout: 'Fout in een artikel',
    idee: 'Idee of suggestie', pers: 'Pers of samenwerking', anders: 'Iets anders',
};

const tijd = iso => new Date(iso).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short' });

// Het artikel waar de feedback over gaat: kop en adres uit het manifest.
function artikelRegel(id, taal, manifest) {
    if (!id) return 'Algemeen (geen artikel)';
    const item = manifest.articles?.[id];
    const lang = item?.slugs?.[taal] ? taal : 'nl';
    const slug = item?.slugs?.[lang];
    const titel = item?.titles?.[lang] || id;
    return slug ? `${titel}\n  ${SITE}/articles/${lang}/${slug}-${id}.html` : `${titel} (${id})`;
}

function bouwMail(feedback, contact, manifest) {
    const delen = [];
    if (feedback.length) {
        delen.push(`FEEDBACK OP ARTIKELEN (${feedback.length})`);
        for (const f of feedback) {
            delen.push([
                `• ${KEUZE[f.keuze] || f.keuze} · ${tijd(f.aangemaakt_op)} · ${f.taal || '?'}`,
                `  ${artikelRegel(f.artikel_id, f.taal, manifest)}`,
                f.toelichting ? `  "${f.toelichting.trim()}"` : null,
                f.email ? `  Antwoord graag aan: ${f.email}` : null,
            ].filter(Boolean).join('\n'));
        }
    }
    if (contact.length) {
        delen.push(`CONTACTBERICHTEN DIE NOG NIET GEMAILD WAREN (${contact.length})`);
        for (const c of contact) {
            delen.push([
                `• ${ONDERWERP[c.onderwerp] || c.onderwerp} · ${tijd(c.aangemaakt_op)} · ${c.taal || '?'}`,
                `  Van: ${c.naam ? `${c.naam} ` : ''}<${c.email}>`,
                `  ${c.bericht.trim().replace(/\n/g, '\n  ')}`,
            ].join('\n'));
        }
    }
    const aantal = feedback.length + contact.length;
    return {
        onderwerp: `BrightNews: ${aantal} ${aantal === 1 ? 'nieuwe melding' : 'nieuwe meldingen'}`,
        tekst: `${delen.join('\n\n')}\n\n-- \nAlles staat ook in Supabase (artikel_feedback en contactberichten).`,
    };
}

async function main() {
    if (!DROOG && !process.env.RESEND_API_KEY) {
        console.log('📭 RESEND_API_KEY ontbreekt: niets verstuurd.');
        return;
    }
    const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sleutel) { console.error('💥 SUPABASE_SERVICE_ROLE_KEY ontbreekt.'); process.exit(1); }
    const db = createClient(SUPABASE_URL, sleutel);

    // Een contactbericht van de laatste 10 minuten kan de trigger nog mailen.
    const grens = new Date(Date.now() - 10 * 60000).toISOString();
    const [fb, ct] = await Promise.all([
        db.from('artikel_feedback').select('*').is('gemeld_op', null).order('aangemaakt_op'),
        db.from('contactberichten').select('*').is('gemeld_op', null).lt('aangemaakt_op', grens).order('aangemaakt_op'),
    ]);
    if (fb.error || ct.error) throw new Error(`Supabase: ${(fb.error || ct.error).message}`);
    if (!fb.data.length && !ct.data.length) { console.log('✅ Niets nieuws.'); return; }

    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../articles/manifest.json'), 'utf8'));
    const mail = bouwMail(fb.data, ct.data, manifest);
    // Het log van een Action in deze openbare repo is voor iedereen te lezen:
    // alleen aantallen, nooit de berichten of mailadressen.
    if (DROOG) { console.log(`🧪 Droog: "${mail.onderwerp}" (${fb.data.length} feedback, ${ct.data.length} contact).`); return; }

    // Eén contactbericht: dan kan Beantwoorden meteen naar de afzender.
    const antwoord = !fb.data.length && ct.data.length === 1 ? { reply_to: ct.data[0].email } : {};
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `BrightNews <${ADRES}>`, to: [ADRES], subject: mail.onderwerp, text: mail.tekst, ...antwoord }),
    });
    // Alleen de status: de foutmelding van Resend kan een mailadres herhalen,
    // en dit log is openbaar.
    if (!res.ok) throw new Error(`Resend antwoordde ${res.status}`);

    // Pas na het versturen afvinken: mislukt de mail, dan komt alles morgen mee.
    const nu = new Date().toISOString();
    for (const [tabel, rijen] of [['artikel_feedback', fb.data], ['contactberichten', ct.data]]) {
        if (!rijen.length) continue;
        const { error } = await db.from(tabel).update({ gemeld_op: nu }).in('id', rijen.map(r => r.id));
        if (error) throw new Error(`${tabel} afvinken: ${error.message}`);
    }
    console.log(`📨 ${mail.onderwerp}`);
}

module.exports = { bouwMail };
if (require.main === module) main().catch(e => { console.error('💥', e.message); process.exit(1); });
