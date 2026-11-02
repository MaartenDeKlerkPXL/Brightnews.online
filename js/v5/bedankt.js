// Bedankt, redesign v5 (Figma: Bedankt · Desktop — Gelukt, Premium wordt
// aangezet en Duurt langer dan normaal).
//
// Stripe stuurt de lezer hierheen zodra de aanmelding rond is, maar de
// webhook die Premium aanzet kan een paar seconden later komen. Daarom
// vraagt de pagina elke 2 seconden of Premium aanstaat ("bezig"), en wisselt
// dan naar "gelukt". Na 30 seconden zonder Premium: "traag", met de
// geruststelling dat je niets dubbel betaalt. Het statusbericht staat in een
// aria-live-regio, zodat een schermlezer meldt wanneer het klaar is.
//
// Een proefperiode kost vandaag €0: de teksten zeggen "aanmelding" en
// "proefperiode", nooit "betaling gelukt", en noemen de eerste betaling met
// bedrag en datum (30 dagen na vandaag).
//
// De status komt straks van de back-end (TODO punt 66). Tot dan:
//   geen ?staat=        een paar seconden bezig, dan gelukt (de gewone route)
//   ?staat=bezig        blijft vragen; na 30 seconden traag
//   ?staat=gelukt       meteen gelukt
//   ?staat=traag        meteen traag
//   ?plan=maandelijks   Glow per maand (standaard Shine per jaar)
//   ?email=             het adres in de teksten
//   ?next=              kwam de lezer van een artikel, dan "Verder lezen"

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const ELKE = 2000;
    const GEDULD = 30000;
    const VOORBEELD_KLAAR_NA = 3;     // keer vragen in het voorbeeld zonder ?staat=
    const PROEF_DAGEN = 30;

    const $ = id => document.getElementById(id);
    const staat = B.param('staat');
    const perMaand = B.param('plan') === 'maandelijks';
    const email = B.param('email') || 'jan@voorbeeld.nl';

    // Alleen een adres op deze site: ?next= mag de lezer niet wegsturen.
    function volgende() {
        const next = B.param('next');
        return next && /^\/(?![/\\])/.test(next) ? next : null;
    }

    function datumLang(dag) {
        return new Intl.DateTimeFormat(B.locale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(`${dag}T12:00:00Z`));
    }

    function toon(welke) {
        ['gelukt', 'bezig', 'traag'].forEach(s => { $(`bd-${s}`).hidden = s !== welke; });
        document.title = `${t(welke === 'gelukt' ? 'v5_bd_titel_gelukt' : 'v5_bd_titel_bezig')} · BrightNews`;
        if (welke === 'gelukt') $('bd-status').textContent = t('v5_bd_status_klaar');
        if (welke === 'traag') $('bd-status').textContent = t('v5_bd_status_traag');
    }

    function teken() {
        const eersteBetaling = datumLang(B.verschuif(B.vandaag(), PROEF_DAGEN));
        const bedrag = t(perMaand ? 'v5_bd_bedrag_maand' : 'v5_bd_bedrag_jaar');
        const plan = `${t(perMaand ? 'plan_glow_name' : 'plan_shine_name')} · ${t(perMaand ? 'v5_bd_per_maand' : 'v5_bd_per_jaar')}`;

        $('bd-lead-gelukt').textContent = t('v5_bd_lead_gelukt', { datum: eersteBetaling });
        $('bd-lead-bezig').textContent = t('v5_bd_lead_bezig', { bedrag, datum: eersteBetaling, email });
        $('bd-plan').textContent = plan;
        $('bd-betaling').textContent = t('v5_bd_bedrag_op', { bedrag, datum: eersteBetaling });
        $('bd-bevestiging').textContent = t('v5_bd_gestuurd_naar', { email });

        const verder = $('bd-verder');
        const next = volgende();
        verder.href = B.metTestdag(next || B.url.home());
        verder.firstElementChild.textContent = t(next ? 'v5_bd_verder_lezen' : 'v5_bd_lees_vandaag');

        const account = B.link(B.url.account(), null, t('schil_mijn_account'));
        $('bd-account-regel').replaceChildren(B.zinMetDelen('v5_bd_account_regel', { account }));
    }

    // Straks: de back-end vragen of Premium aanstaat voor deze sessie.
    let gevraagd = 0;
    function premiumStaatAan() {
        gevraagd += 1;
        return Promise.resolve(!staat && gevraagd >= VOORBEELD_KLAAR_NA);
    }

    function wacht() {
        const begin = Date.now();
        const vraag = async () => {
            if (await premiumStaatAan()) {
                document.body.dataset.premium = '';
                toon('gelukt');
                return;
            }
            if (Date.now() - begin >= GEDULD) { toon('traag'); return; }
            setTimeout(vraag, ELKE);
        };
        setTimeout(vraag, ELKE);
    }

    // De lezer is ingelogd (Mijn account in de header); Premium pas als het
    // aanstaat, dan verdwijnt Probeer Premium.
    document.body.dataset.ingelogd = '';
    $('bd-verversen').addEventListener('click', () => window.location.reload());

    // Teksten opnieuw bij een andere taal; de staat en het vragen één keer.
    B.start(teken);
    if (staat === 'gelukt') {
        document.body.dataset.premium = '';
        toon('gelukt');
    } else if (staat === 'traag') {
        toon('traag');
    } else {
        toon('bezig');
        wacht();
    }
})();
