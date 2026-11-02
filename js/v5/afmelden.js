// Afmelden voor mails, redesign v5 (Figma: Afmelden · Desktop — Bezig,
// Gelukt en Mislukt).
//
// De link uit de mail meldt je meteen af: geen formulier, niets te
// bevestigen. Bezig, dan gelukt of mislukt; het statusbericht staat in een
// aria-live-regio. Gelukt herhaalt het e-mailadres en zegt dat mails over je
// abonnement blijven komen. Mislukt is rustig: drie andere routes, geen
// primaire knop.
//
// Afmelden zelf is nog niet gekoppeld (TODO punt 66: een token in de link,
// zonder inloggen, en de List-Unsubscribe-header voor één klik in het
// mailprogramma). Tot dan:
//   geen ?staat=      even bezig, dan gelukt (de gewone route)
//   ?staat=bezig      blijft bezig
//   ?staat=gelukt     meteen gelukt
//   ?staat=mislukt    meteen mislukt
//   ?email=           het adres in de tekst

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const VOORBEELD_DUUR = 1500;

    const $ = id => document.getElementById(id);
    const staat = B.param('staat');
    const email = B.param('email');
    let huidig = 'bezig';

    function toon(welke) {
        huidig = welke;
        ['bezig', 'gelukt', 'mislukt'].forEach(s => { $(`af-${s}`).hidden = s !== welke; });
        if (welke === 'gelukt') $('af-status').textContent = t('v5_af_status_gelukt');
        if (welke === 'mislukt') $('af-status').textContent = t('v5_af_status_mislukt');
        titel();
    }

    function titel() {
        const sleutel = { bezig: 'v5_af_bezig_h1', gelukt: 'v5_af_gelukt_h1', mislukt: 'v5_af_mislukt_h1' }[huidig];
        document.title = `${t(sleutel)} · BrightNews`;
    }

    function teken() {
        titel();
        $('af-gelukt-lead').textContent = email
            ? t('v5_af_gelukt_lead', { email })
            : t('v5_af_gelukt_lead_zonder');
        const link = B.link(B.url.feedback(), null, t('v5_af_geef_feedback'));
        $('af-waarom').replaceChildren(B.zinMetDelen('v5_af_waarom', { link }));
    }

    // Straks: de back-end meldt het adres uit het token af.
    function meldAf() {
        return new Promise(klaar => setTimeout(() => klaar(true), VOORBEELD_DUUR));
    }

    $('af-weer-aan').addEventListener('click', () => window.showNotification(t('v5_af_niet_gekoppeld')));
    $('af-opnieuw').addEventListener('click', () => window.location.reload());

    B.start(teken);
    if (staat === 'gelukt' || staat === 'mislukt') {
        toon(staat);
    } else {
        toon('bezig');
        if (staat !== 'bezig') meldAf().then(gelukt => toon(gelukt ? 'gelukt' : 'mislukt'));
    }
})();
