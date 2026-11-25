// node --test backend/stuur-nieuwsbrief.test.js
const test = require('node:test');
const assert = require('node:assert');
const { editieVan, kort } = require('./stuur-nieuwsbrief');

const dag = iso => editieVan(new Date(iso)).toISOString();

test('een editie hoort bij de laatste zaterdag die al begonnen is (07:00 UTC)', () => {
    assert.strictEqual(dag('2026-11-28T07:40:00Z'), '2026-11-28T07:00:00.000Z'); // zaterdag, na 07:00
    assert.strictEqual(dag('2026-11-28T06:59:00Z'), '2026-11-21T07:00:00.000Z'); // zaterdag, ervoor
    assert.strictEqual(dag('2026-11-30T07:40:00Z'), '2026-11-28T07:00:00.000Z'); // maandag
    assert.strictEqual(dag('2026-11-27T23:00:00Z'), '2026-11-21T07:00:00.000Z'); // vrijdagavond
    assert.strictEqual(dag('2027-01-01T12:00:00Z'), '2026-12-26T07:00:00.000Z'); // over de jaargrens
});

test('kort() kapt af op een woordgrens en haalt de puntjes van de feed weg', () => {
    assert.strictEqual(kort('Kort verhaal...'), 'Kort verhaal');
    const lang = kort('woord '.repeat(60));
    assert.ok(lang.length <= 171 && lang.endsWith('woord…'), lang);
    assert.ok(kort('Zin een. '.repeat(30)).endsWith('een…'), 'geen ".…"');
});
