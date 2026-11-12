// Test van de volgorde-regels in de stripe-webhook (review 2026-11-12).
// Draait de echte index.ts tegen een nep-database in het geheugen:
//   node supabase/functions/stripe-webhook/volgorde.test.mjs
// Nodig: Node 22.6 of nieuwer (module.stripTypeScriptTypes), geen pakketten.
import fs from 'fs';
import crypto from 'crypto';
import { stripTypeScriptTypes } from 'module';
let src = fs.readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
src = src.replace(/^import .*$/mg, '');
const js = stripTypeScriptTypes(src);

const db = { profiles: [] };
function tabel() {
  let filters = [], actie = null, waarde = null, of = null;
  const q = {
    select() { return q; },
    limit() { return q; },
    eq(k, v) { filters.push([k, v]); return q; },
    // Alleen de vorm die de webhook gebruikt: "kol.is.null,kol.lt|lte.\"iso\""
    or(uitdr) { of = uitdr.split(',').map(d => { const [k, op, ...rest] = d.split('.'); return [k, op, rest.join('.').replace(/"/g, '')]; }); return q; },
    update(v) { actie = 'update'; waarde = v; return q; },
    upsert(v) { const i = db.profiles.findIndex(p => p.id === v.id); if (i >= 0) Object.assign(db.profiles[i], v); else db.profiles.push({ ...v }); return Promise.resolve({ error: null }); },
    maybeSingle() { return Promise.resolve({ data: rijen()[0] ?? null, error: null }); },
    then(ok) {
      if (actie === 'update') { const r = rijen(); r.forEach(p => Object.assign(p, waarde)); return ok({ data: r.map(p => ({ id: p.id })), error: null }); }
      return ok({ data: rijen().map(p => ({ ...p })), error: null });
    },
  };
  const voldoet = p => !of || of.some(([k, op, v]) => op === 'is' ? p[k] == null
    : op === 'lt' ? new Date(p[k]) < new Date(v) : new Date(p[k]) <= new Date(v));
  const rijen = () => db.profiles.filter(p => filters.every(([k, v]) => p[k] === v) && voldoet(p));
  return q;
}
const env = { STRIPE_WEBHOOK_SECRET: 'whsec_test', SUPABASE_URL: 'x', SERVICE_ROLE_KEY: 'y' };
globalThis.Deno = { env: { get: k => env[k] } };
let handler;
new Function('serve', 'createClient', 'console', js)(h => { handler = h; }, () => ({ from: () => tabel() }), { log() {}, warn() {}, error() {} });

async function stuur(event) {
  const body = JSON.stringify({ livemode: true, ...event });
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex');
  const res = await handler(new Request('http://x', { method: 'POST', body, headers: { 'Stripe-Signature': `t=${t},v1=${sig}` } }));
  return [res.status, (await res.json()).message || (await Promise.resolve('')).toString()];
}
const T = 1_800_000_000;
const sub = (type, created, status, extra = {}) => ({ type, created, data: { object: { customer: 'cus_A', status, trial_end: T + 30 * 86400, items: { data: [{ current_period_end: T + 30 * 86400, price: { recurring: { interval: 'year' } } }] }, ...extra } } });
const premium = () => { const p = db.profiles[0]; return p.is_premium && (!p.premium_until || new Date(p.premium_until) > new Date()); };
const assert = (c, m) => { if (!c) { console.log('❌', m, JSON.stringify(db.profiles)); process.exitCode = 1; } else console.log('✅', m); };

db.profiles.push({ id: 'u1' });
await stuur({ type: 'checkout.session.completed', created: T, data: { object: { client_reference_id: 'u1', customer: 'cus_A', payment_status: 'no_payment_required' } } });
assert(premium() && db.profiles[0].stripe_customer_id === 'cus_A', 'checkout zet Premium en koppelt de klant');
await stuur(sub('customer.subscription.created', T, 'trialing'));
assert(db.profiles[0].abo_status === 'trialing' && db.profiles[0].plan_type === 'jaarlijks' && db.profiles[0].proef_tot, 'subscription.created: trialing, plan, proef_tot');
await stuur(sub('customer.subscription.updated', T + 10, 'trialing', { cancel_at_period_end: true }));
assert(db.profiles[0].opgezegd === true && premium(), 'opgezegd: Premium loopt door');
await stuur(sub('customer.subscription.deleted', T + 100, 'canceled'));
assert(!premium() && db.profiles[0].premium_until && db.profiles[0].abo_status === 'canceled', 'deleted: Premium uit, premium_until gezet (niet null)');
let [st, msg] = await stuur({ type: 'checkout.session.completed', created: T, data: { object: { client_reference_id: 'u1', customer: 'cus_A', payment_status: 'no_payment_required' } } });
assert(!premium() && st === 200, 'late checkout na deleted: overgeslagen (' + msg + ')');
[st, msg] = await stuur(sub('customer.subscription.updated', T + 50, 'active'));
assert(!premium() && db.profiles[0].abo_status === 'canceled', 'late updated na deleted: overgeslagen (' + msg + ')');
// opnieuw abonneren na opzeggen mag wel
await stuur({ type: 'checkout.session.completed', created: T + 200, data: { object: { client_reference_id: 'u1', customer: 'cus_B', payment_status: 'no_payment_required' } } });
assert(premium() && db.profiles[0].stripe_customer_id === 'cus_B', 'nieuw abonnement na opzeggen: gekoppeld');
await stuur({ ...sub('customer.subscription.created', T + 200, 'trialing'), data: { object: { ...sub('x', 0, 'trialing').data.object, customer: 'cus_B' } } });
assert(db.profiles[0].abo_status === 'trialing', 'nieuwe proef actief');
// tweede afrekening terwijl de proef loopt: niet koppelen
[st, msg] = await stuur({ type: 'checkout.session.completed', created: T + 300, data: { object: { client_reference_id: 'u1', customer: 'cus_C', payment_status: 'no_payment_required' } } });
assert(db.profiles[0].stripe_customer_id === 'cus_B' && st === 200, 'tweede abonnement tijdens proef: niet gekoppeld (' + msg + ')');
// past_due
await stuur({ ...sub('customer.subscription.updated', T + 400, 'past_due'), data: { object: { ...sub('x', 0, 'past_due').data.object, customer: 'cus_B' } } });
assert(!premium() && db.profiles[0].abo_status === 'past_due', 'past_due: Premium uit, status bewaard');
// Een subscription.created die eerst 409 kreeg en ná de checkout opnieuw komt
db.profiles.length = 0; db.profiles.push({ id: 'u2' });
const subU2 = (type, created, status) => { const e = sub(type, created, status); e.data.object.customer = 'cus_Z'; return e; };
let [s1] = await stuur(subU2('customer.subscription.created', T + 1000, 'trialing'));
assert(s1 === 409, 'subscription.created vóór checkout: 409, Stripe probeert opnieuw');
await stuur({ type: 'checkout.session.completed', created: T + 1001, data: { object: { client_reference_id: 'u2', customer: 'cus_Z', payment_status: 'no_payment_required' } } });
await stuur(subU2('customer.subscription.created', T + 1000, 'trialing'));
assert(db.profiles[0].abo_status === 'trialing' && premium() && new Date(db.profiles[0].premium_until) > new Date(Date.now() + 20 * 864e5), 'herhaalde subscription.created na checkout: wél verwerkt');

// Review ronde 2: created en updated in dezelfde seconde, updated eerst binnen
db.profiles.length = 0; db.profiles.push({ id: 'u3' });
const subU3 = (type, created, status) => { const e = sub(type, created, status); e.data.object.customer = 'cus_Y'; return e; };
await stuur({ type: 'checkout.session.completed', created: T + 2000, data: { object: { client_reference_id: 'u3', customer: 'cus_Y', payment_status: 'paid' } } });
await stuur(subU3('customer.subscription.updated', T + 2001, 'active'));
[st, msg] = await stuur(subU3('customer.subscription.created', T + 2001, 'incomplete'));
assert(premium() && db.profiles[0].abo_status === 'active', 'created in dezelfde seconde ná updated: overgeslagen (' + msg + ')');
// dubbele checkout na subscription.created: status blijft staan
[st, msg] = await stuur({ type: 'checkout.session.completed', created: T + 2000, data: { object: { client_reference_id: 'u3', customer: 'cus_Y', payment_status: 'paid' } } });
assert(db.profiles[0].abo_status === 'active' && st === 200, 'herhaalde checkout voor dezelfde klant: niets veranderd (' + msg + ')');
// incomplete telt als lopend: geen tweede koppeling
await stuur(subU3('customer.subscription.updated', T + 2100, 'incomplete'));
[st, msg] = await stuur({ type: 'checkout.session.completed', created: T + 2200, data: { object: { client_reference_id: 'u3', customer: 'cus_X', payment_status: 'paid' } } });
assert(db.profiles[0].stripe_customer_id === 'cus_Y', 'incomplete: tweede klant niet gekoppeld (' + msg + ')');

