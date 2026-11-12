// Afmelden voor mails, redesign v5 (Figma: Afmelden · Desktop — Bezig,
// Gelukt en Mislukt).
//
// De link uit de mail meldt je meteen af: geen formulier, niets te
// bevestigen. Bezig, dan gelukt of mislukt; het statusbericht staat in een
// aria-live-regio. Gelukt herhaalt het e-mailadres en zegt dat mails over je
// abonnement blijven komen. Mislukt is rustig: drie andere routes, geen
// primaire knop.
//
// Gekoppeld (2026-11-18, TODO 66 punt 14): het token uit de link (?t=, zie
// backend/stuur-mails.js) gaat naar meld_af(), dezelfde functie als de oude
// afmeldpagina. Geen inloggen: een afmeldlink die eerst een wachtwoord vraagt
// is geen afmeldlink. Zonder token of bij een fout: mislukt. "Toch weer
// aanmelden" gaat naar Mijn account, waar de mails-schakelaar staat.
// De mails sturen dit adres ook mee als List-Unsubscribe-header (de
// afmeldknop van het mailprogramma); een programma dat het adres zonder JS
// ophaalt, meldt dus niets af. Dat is bewust: er is geen server voor een POST.
//
// Om de staten te bekijken (alleen lokaal):
//   ?staat=bezig      blijft bezig
//   ?staat=gelukt     meteen gelukt
//   ?staat=mislukt    meteen mislukt
//   ?email=           het adres in de tekst

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;

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

    // meld_af() meldt alleen de rij met dit token af en zegt niets terug
    // (ook niet of het token bestond): zo verklapt de pagina niets.
    async function meldAf() {
        const token = new URLSearchParams(window.location.search).get('t');
        const client = window.supabaseClient;
        if (!token || !/^[0-9a-f-]{36}$/i.test(token) || !client) return false;
        try {
            const { error } = await client.rpc('meld_af', { p_token: token });
            if (error) console.warn('BrightNews v5: afmelden', error);
            return !error;
        } catch (fout) {
            console.warn('BrightNews v5: afmelden', fout);
            return false;
        }
    }

    $('af-weer-aan').addEventListener('click', () => { window.location.href = B.url.account(); });
    $('af-opnieuw').addEventListener('click', () => window.location.reload());

    B.start(teken);
    if (staat === 'gelukt' || staat === 'mislukt') {
        toon(staat);
    } else {
        toon('bezig');
        if (staat !== 'bezig') meldAf().then(gelukt => toon(gelukt ? 'gelukt' : 'mislukt'));
    }
})();
