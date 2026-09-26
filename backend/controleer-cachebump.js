// CI-bewaking van de CACHE_NAME-bump (review-ronde 2026-09-26).
//
// De precache-bestanden in sw.js (css/js) worden cache-first geserveerd en
// verversen bij bezoekers alléén na een CACHE_NAME-bump. Die bump is
// handwerk en is aantoonbaar al eens gemist (commit 35f0864a, 2026-09-23:
// components.css gewijzigd, CACHE_NAME bleef op v28) — terugkerende
// bezoekers draaiden toen nieuwe HTML op oude CSS. Dit script faalt de
// workflow als een precache-bestand wijzigt zonder dat de CACHE_NAME-regel
// in sw.js meebeweegt.
//
// Aanroep (zie .github/workflows/bewaak-cache-bump.yml):
//   DIFF_VAN=<sha> DIFF_TOT=<sha> node backend/controleer-cachebump.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const van = process.env.DIFF_VAN;
const tot = process.env.DIFF_TOT;
if (!van || !tot) {
    console.error('DIFF_VAN en DIFF_TOT zijn verplicht.');
    process.exit(2);
}

function git(cmd) {
    return execSync(`git ${cmd}`, { encoding: 'utf8', cwd: path.join(__dirname, '..') });
}

// De precache-lijst uit sw.js zelf lezen: als er ooit een bestand bijkomt,
// bewaakt deze check dat vanzelf mee.
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const assetsBlok = sw.match(/const ASSETS = \[([\s\S]*?)\]/);
if (!assetsBlok) {
    console.error('Kon de ASSETS-lijst niet uit sw.js lezen — is de vorm veranderd?');
    process.exit(2);
}
const assets = [...assetsBlok[1].matchAll(/'([^']+)'/g)]
    .map(m => m[1])
    .map(p => (p === '/' ? 'index.html' : p.replace(/^\//, '')));

const gewijzigd = git(`diff --name-only ${van} ${tot}`).split('\n').filter(Boolean);
const geraakteAssets = gewijzigd.filter(f => assets.includes(f));

if (geraakteAssets.length === 0) {
    console.log('✅ Geen precache-bestanden gewijzigd — geen bump nodig.');
    process.exit(0);
}

const swDiff = gewijzigd.includes('sw.js')
    ? git(`diff ${van} ${tot} -- sw.js`)
    : '';
const bumpGezien = /^\+const CACHE_NAME/m.test(swDiff);

if (bumpGezien) {
    console.log(`✅ ${geraakteAssets.join(', ')} gewijzigd én CACHE_NAME gebumpt.`);
    process.exit(0);
}

console.error(`❌ ${geraakteAssets.join(', ')} gewijzigd zonder CACHE_NAME-bump in sw.js.`);
console.error('Terugkerende bezoekers krijgen deze wijziging dan nooit te zien:');
console.error('de precache is cache-first en ververst alleen bij een nieuwe CACHE_NAME.');
console.error('Fix: verhoog het versienummer in de CACHE_NAME-regel bovenin sw.js.');
process.exit(1);
