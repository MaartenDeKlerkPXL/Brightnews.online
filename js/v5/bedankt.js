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
// Gekoppeld (TODO 66 punt 12): Stripe stuurt hierheen na de aanmelding (in
// de betaallinks ingesteld als "na betaling doorsturen"). De pagina vraagt
// profiles via window.bnVerversAccount(); plan, eerste betaling en
// e-mailadres komen uit het profiel en de sessie, het artikel om verder te
// lezen uit ?next= of uit wat Abonnementen in sessionStorage zette
// ('bn-afrekenen'). Niet ingelogd in deze browser: eerst inloggen, dan terug.
//
// Om de staten te bekijken zonder account (dan wordt er niets opgehaald):
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
    const PROEF_DAGEN = 30;
    const SLEUTEL = 'bn-afrekenen';

    const $ = id => document.getElementById(id);
    const staat = ['bezig', 'gelukt', 'traag'].includes(B.param('staat')) ? B.param('staat') : null;
    const client = window.supabaseClient;
    const voorbeeld = Boolean(staat) || !client;

    function bewaard() {
        try { return JSON.parse(sessionStorage.getItem(SLEUTEL) || 'null'); } catch { return null; }
    }

    // Wat er in de teksten komt. In het voorbeeld uit het adres; echt uit
    // het profiel (gegevensVan()).
    const vertrek = bewaard();
    let perMaand = B.param('plan') === 'maandelijks' || vertrek?.plan === 'maandelijks';
    let email = B.param('email') || 'jan@voorbeeld.nl';
    let eersteDag = null;

    // Alleen een adres op deze site: ?next= mag de lezer niet wegsturen.
    function volgende() {
        return B.eigenPad(B.param('next')) || B.eigenPad(vertrek?.next);
    }

    function gegevensVan({ gebruiker, profiel }) {
        if (gebruiker?.email) email = gebruiker.email;
        if (/^(maandelijks|glow)$/i.test(profiel?.plan_type || '')) perMaand = true;
        if (/^(jaarlijks|shine)$/i.test(profiel?.plan_type || '')) perMaand = false;
        if (profiel?.proef_tot) eersteDag = B.dagVan(profiel.proef_tot);
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
        const eersteBetaling = datumLang(eersteDag || B.verschuif(B.vandaag(), PROEF_DAGEN));
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

    // Staat Premium aan voor deze lezer? In het voorbeeld (?staat=bezig) nooit.
    async function premiumStaatAan() {
        if (voorbeeld) return false;
        const account = await window.bnVerversAccount();
        gegevensVan(account);
        return account.premium;
    }

    function klaar() {
        try { sessionStorage.removeItem(SLEUTEL); } catch { /* niets te wissen */ }
        document.body.dataset.premium = '';
        teken();
        toon('gelukt');
    }

    function wacht() {
        const begin = Date.now();
        const vraag = async () => {
            if (await premiumStaatAan()) { klaar(); return; }
            if (Date.now() - begin >= GEDULD) { toon('traag'); return; }
            setTimeout(vraag, ELKE);
        };
        setTimeout(vraag, ELKE);
    }

    $('bd-verversen').addEventListener('click', () => window.location.reload());

    // Teksten opnieuw bij een andere taal; de staat en het vragen één keer.
    if (voorbeeld) {
        B.start(teken);
        // De lezer is ingelogd (Mijn account in de header); Premium pas als
        // het aanstaat, dan verdwijnt Probeer Premium.
        document.body.dataset.ingelogd = '';
        if (staat === 'gelukt') {
            document.body.dataset.premium = '';
            toon('gelukt');
        } else if (staat === 'traag') {
            toon('traag');
        } else {
            toon('bezig');
            wacht();
        }
    } else {
        toon('bezig');
        window.bnAccount.then(account => {
            if (!account.gebruiker) {
                const hier = window.location.pathname + window.location.search;
                window.location.replace(`/v5-inloggen.html?next=${encodeURIComponent(hier)}`);
                return;
            }
            // Pas tekenen als het e-mailadres en het plan bekend zijn.
            gegevensVan(account);
            B.start(teken);
            if (account.premium) klaar();
            else wacht();
        });
    }
})();
