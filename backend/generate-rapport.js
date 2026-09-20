// Weekrapport (besluit Erik 2026-09-09, marketing fase M1): elke week één
// leesbaar overzicht van de trechter — productie, selectie per bron,
// cockpit-oordelen, accounts en abonnees — plus een kort AI-advies. Output:
// data/rapporten/<ISO-week>.md en data/rapporten/laatste.md; de cockpit
// (marketing.html) toont de laatste. Idempotent per ISO-week.
// Bereik en zoekverkeer komen uit backend/meetlus.js (GA4 + Search Console).
// Staat de Google-sleutel er niet, dan valt alleen die sectie weg en zegt het
// rapport dat erbij — de rest van de cijfers blijft gewoon staan.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();
const { aiCall } = require('./ai-adapter');
const { haalBereik, schrijfBereikSectie } = require('./meetlus');

const root = path.join(__dirname, '..');

const SUPABASE_URL = 'https://rquuqypgaannrakdrabj.supabase.co';
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

function isoWeek(datum) {
    const d = new Date(Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate()));
    const dag = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dag);
    const jaarStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - jaarStart) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}

async function telRijen(tabel, filter) {
    if (!supabaseAdmin) return null;
    try {
        let q = supabaseAdmin.from(tabel).select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        return error ? null : count;
    } catch {
        return null;
    }
}

/**
 * Haalt de cockpit-oordelen op met hun post_key. Die sleutel is
 * `datum|kanaal`, dus hieruit valt af te lezen wélk kanaal wordt afgewezen.
 * Dat is het stuk waar de postprompt op bijgesteld kan worden: als Instagram
 * er stelselmatig uit valt en LinkedIn niet, zit het in de toon en niet in de
 * artikelen.
 */
async function oordelenPerKanaal(sindsIso) {
    if (!supabaseAdmin) return null;
    try {
        const { data, error } = await supabaseAdmin
            .from('marketing_feedback')
            .select('post_key, besluit')
            .gte('created_at', sindsIso);
        if (error || !data) return null;
        const perKanaal = {};
        for (const rij of data) {
            const kanaal = String(rij.post_key || '').split('|')[1] || 'onbekend';
            const k = (perKanaal[kanaal] ??= { goed: 0, afgewezen: 0 });
            if (rij.besluit === 'goed') k.goed++; else k.afgewezen++;
        }
        return perKanaal;
    } catch {
        return null;
    }
}

async function main() {
    const week = isoWeek(new Date());
    const pad = path.join(root, `data/rapporten/${week}.md`);
    if (await fs.pathExists(pad)) {
        console.log(`ℹ️ Rapport ${week} bestaat al — niets te doen.`);
        return;
    }
    const grens = Date.now() - 7 * 24 * 3600 * 1000;
    const sindsIso = new Date(grens).toISOString();

    // Productie uit de eigen data.
    const nl = await fs.readJson(path.join(root, 'data/news_nl.json')).catch(() => []);
    const vers = nl.filter(a => new Date(a.date).getTime() >= grens);
    const artikelen = vers.filter(a => a.type !== 'digest');
    const digests = vers.filter(a => a.type === 'digest');
    const perCategorie = {};
    artikelen.forEach(a => { perCategorie[a.category] = (perCategorie[a.category] ?? 0) + 1; });

    // Selectie per bron uit het append-only archief.
    const archief = (await fs.readFile(path.join(root, 'data/selectie-archief.jsonl'), 'utf8').catch(() => ''))
        .split('\n').filter(Boolean).map(r => { try { return JSON.parse(r); } catch { return null; } })
        .filter(r => r && new Date(r.datum).getTime() >= grens);
    const perBron = {};
    archief.forEach(r => {
        const b = (perBron[r.bron] ??= { ja: 0, nee: 0 });
        b[r.besluit === 'ja' ? 'ja' : 'nee']++;
    });
    const bronRegels = Object.entries(perBron)
        .sort((x, y) => (y[1].ja + y[1].nee) - (x[1].ja + x[1].nee))
        .map(([bron, s]) => `| ${bron} | ${s.ja} | ${s.nee} | ${Math.round(100 * s.ja / (s.ja + s.nee))}% |`)
        .join('\n');

    // Cockpit en marketing.
    const posts = await fs.readJson(path.join(root, 'data/marketing-posts.json')).catch(() => ({ dagen: [] }));
    const postDagen = (posts.dagen ?? []).filter(d => new Date(d.dag).getTime() >= grens).length;
    const goedgekeurd = await telRijen('marketing_feedback', q => q.eq('besluit', 'goed').gte('created_at', sindsIso));
    const afgewezen = await telRijen('marketing_feedback', q => q.eq('besluit', 'afgewezen').gte('created_at', sindsIso));

    const perKanaal = await oordelenPerKanaal(sindsIso);

    // Bereik en zoekverkeer (leeg als de Google-sleutel er niet is).
    const bereik = await haalBereik(7);

    // Trechter-onderkant.
    const accounts = await telRijen('profiles');
    const abonnees = await telRijen('profiles', q => q.eq('is_premium', true));
    const promos = await telRijen('promo_redemptions');

    const kanaalRegels = !perKanaal
        ? '(geen verbinding met de cockpit-oordelen)'
        : Object.keys(perKanaal).length === 0
            ? '(deze week nog niets goedgekeurd of afgewezen — voed de cockpit, anders leert de postfabriek niets)'
            : ['| Kanaal | Goedgekeurd | Afgewezen |', '|---|---|---|']
                .concat(Object.entries(perKanaal)
                    .sort((a, b) => (b[1].goed + b[1].afgewezen) - (a[1].goed + a[1].afgewezen))
                    .map(([k, s]) => `| ${k} | ${s.goed} | ${s.afgewezen} |`))
                .join('\n');

    const cijfers = `# BrightNews weekrapport ${week}

*Automatisch gegenereerd op ${new Date().toISOString().slice(0, 10)} over de afgelopen 7 dagen.*

## Productie
- Artikelen gepubliceerd: **${artikelen.length}** (5 talen) — per categorie: ${Object.entries(perCategorie).map(([c, n]) => `${c} ${n}`).join(', ') || 'geen'}
- Dagoverzichten: **${digests.length}**
- Conceptpost-dagen uit de fabriek: **${postDagen}** · goedgekeurd: **${goedgekeurd ?? '?'}** · afgewezen: **${afgewezen ?? '?'}**

## Selectie per bron (acceptatiegraad)
| Bron | ja | nee | % |
|---|---|---|---|
${bronRegels || '| (geen beoordelingen) | | | |'}

## Cockpit per kanaal
${kanaalRegels}

${schrijfBereikSectie(bereik)}
## Trechter
- Accounts totaal: **${accounts ?? '?'}** · betalende abonnees: **${abonnees ?? '?'}** · promocodes ingewisseld: **${promos ?? '?'}**
- Break-even-doel: 20–28 abonnees (zie MARKETING-PLAN.md)
`;

    // Kort AI-advies op basis van de cijfers (1 call/week).
    let advies;
    try {
        const antwoord = await aiCall({
            rol: 'schrijven',
            prompt: `Je bent de marketingadviseur van BrightNews (positief nieuws, 5 talen; site nog geparkeerd tot de lancering). Hieronder het weekrapport. Geef in het Nederlands maximaal 3 concrete, uitvoerbare adviezen voor komende week, elk 1-2 zinnen, als markdown-opsomming. Wees specifiek (noem bronnen/categorieën/cijfers uit het rapport), geen algemeenheden.
${cijfers}`,
        });
        advies = `\n## AI-advies voor komende week\n${antwoord.tekst.trim()}\n`;
    } catch (err) {
        advies = `\n## AI-advies voor komende week\n(advies mislukt: ${String(err.message).slice(0, 80)})\n`;
    }

    const rapport = cijfers + advies;
    await fs.outputFile(pad, rapport);
    await fs.outputFile(path.join(root, 'data/rapporten/laatste.md'), rapport);
    console.log(`📊 Weekrapport ${week} geschreven (${artikelen.length} artikelen, ${digests.length} digests).`);
}

main().catch(err => {
    console.error('💥 Rapport mislukt:', err);
    process.exit(1);
});
