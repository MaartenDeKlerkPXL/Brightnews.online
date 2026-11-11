// Abonnementen van redesign v5 (Figma: Abonnementen · Desktop, en
// Abonnementen · Desktop · Fout: vinkje vergeten).
//
// Wat hier gebeurt:
//   - de samenvatting vóór de knop: vandaag €0,00, en vanaf welke dag het
//     gekozen plan betaald wordt (vandaag + 30 dagen, in de tijdzone van de
//     lezer). Bedrag en datum volgen het plan.
//   - het vinkje voor het herroepingsrecht is verplicht en staat nooit
//     vooraf aan. Zonder vinkje: de foutmelding onder het vakje,
//     aria-invalid, aria-describedby en de focus naar het vakje. Er gaat dan
//     niets naar Stripe.
//   - ?plan=maandelijks of ?plan=jaarlijks (vanuit de paywall) kiest het plan
//     vooraf.
//
// Afrekenen (TODO 66 punt 7): met vinkje gaat de lezer naar de
// Stripe-betaallink van het gekozen plan (js/betaal-config.js), met zijn
// Supabase-id als client_reference_id (daarop koppelt de stripe-webhook) en
// zijn e-mailadres al ingevuld. Niet ingelogd: eerst een gratis account, en
// daarna terug hierheen met het plan bewaard. Al Premium: naar Mijn account,
// zodat niemand twee abonnementen afsluit.
// Vóór het vertrek naar Stripe komt in sessionStorage ('bn-afrekenen') welk
// plan en welk artikel (?next=). Bedankt leest dat; komt de lezer met de
// terugknop van Stripe hierheen, dan toont de pagina "Je bent terug van
// Stripe" (?staat=terug om die te bekijken).

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const PROEF_DAGEN = 30;

    const formulier = document.getElementById('abo-formulier');
    const vinkje = document.getElementById('abo-toestemming');
    const fout = document.getElementById('abo-toestemming-fout');

    function gekozenPlan() {
        return formulier.querySelector('input[name="plan"]:checked')?.value || 'jaarlijks';
    }

    function werkSamenvattingBij() {
        const start = new Date();
        start.setDate(start.getDate() + PROEF_DAGEN);
        const metJaar = new Intl.DateTimeFormat(B.locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(start);
        const zonderJaar = new Intl.DateTimeFormat(B.locale(), { day: 'numeric', month: 'long' }).format(start);
        const jaarlijks = gekozenPlan() === 'jaarlijks';
        document.getElementById('abo-vandaag').textContent = t('v5_abo_nul');
        document.getElementById('abo-vanaf').textContent = t('v5_abo_vanaf', { datum: metJaar });
        document.getElementById('abo-daarna').textContent = t(jaarlijks ? 'v5_prijs_jaar' : 'v5_prijs_maand');
        document.getElementById('abo-uitleg').textContent = t('v5_abo_uitleg', { datum: zonderJaar });
    }

    // "Met deze knop ga je akkoord met de {voorwaarden} en het {refund}."
    // De woordvolgorde verschilt per taal, dus de links komen op de plek van
    // de plaatshouders.
    function akkoordZin() {
        const p = document.getElementById('abo-akkoord');
        p.replaceChildren();
        t('v5_abo_akkoord').split(/(\{voorwaarden\}|\{refund\})/).forEach(deel => {
            if (deel === '{voorwaarden}') p.appendChild(B.link(B.url.voorwaarden(), null, t('v5_abo_voorwaarden')));
            else if (deel === '{refund}') p.appendChild(B.link(B.url.refund(), null, t('v5_abo_refund')));
            else if (deel) p.appendChild(document.createTextNode(deel));
        });
    }

    function toonFout(aan) {
        fout.hidden = !aan;
        if (aan) {
            vinkje.setAttribute('aria-invalid', 'true');
            vinkje.setAttribute('aria-describedby', fout.id);
        } else {
            vinkje.removeAttribute('aria-invalid');
            vinkje.removeAttribute('aria-describedby');
        }
    }

    function teken() {
        document.title = `${t('schil_premium')} · BrightNews`;
        werkSamenvattingBij();
        akkoordZin();
    }

    const gevraagd = B.param('plan');
    const voorkeur = formulier.querySelector(`input[name="plan"][value="${gevraagd === 'maandelijks' ? 'maandelijks' : 'jaarlijks'}"]`);
    if (voorkeur) voorkeur.checked = true;

    formulier.addEventListener('change', e => {
        if (e.target.name === 'plan') werkSamenvattingBij();
        if (e.target === vinkje && vinkje.checked) toonFout(false);
    });

    const knop = formulier.querySelector('button[type="submit"]');
    const SLEUTEL = 'bn-afrekenen';

    function bewaar(waarde) {
        try {
            if (waarde) sessionStorage.setItem(SLEUTEL, JSON.stringify(waarde));
            else sessionStorage.removeItem(SLEUTEL);
        } catch { /* geen opslag: Bedankt valt terug op de homepage */ }
    }

    function bewaard() {
        try { return JSON.parse(sessionStorage.getItem(SLEUTEL) || 'null'); } catch { return null; }
    }

    async function naarStripe() {
        const plan = gekozenPlan();
        const link = window.BETAAL_CONFIG?.stripe?.[plan];
        const client = window.supabaseClient;
        if (!link || !client) { window.showNotification(t('v5_abo_niet_gekoppeld')); return; }

        const { gebruiker, premium } = await window.bnAccount;
        const next = B.eigenPad(B.param('next'));
        if (!gebruiker) {
            const terug = `/v5-abonnementen.html?plan=${plan}${next ? `&next=${encodeURIComponent(next)}` : ''}`;
            window.location.href = `/v5-inloggen.html?tab=account&next=${encodeURIComponent(terug)}`;
            return;
        }
        if (premium) {
            window.showNotification(t('v5_abo_al_premium_melding'));
            setTimeout(() => { window.location.href = B.url.account(); }, 1500);
            return;
        }

        bewaar({ plan, next, sinds: Date.now() });
        const adres = new URL(link);
        adres.searchParams.set('client_reference_id', gebruiker.id);
        if (gebruiker.email) adres.searchParams.set('prefilled_email', gebruiker.email);
        adres.searchParams.set('locale', B.taal());
        window.location.href = adres.toString();
    }

    formulier.addEventListener('submit', async e => {
        e.preventDefault();
        if (knop.disabled) return;
        if (!vinkje.checked) {
            toonFout(true);
            vinkje.focus();
            return;
        }
        knop.disabled = true;
        knop.setAttribute('aria-busy', 'true');
        try {
            await naarStripe();
        } catch (fout) {
            console.warn('BrightNews v5: afrekenen', fout);
            window.showNotification(t('v5_in_fout_algemeen'), 'error');
        } finally {
            knop.disabled = false;
            knop.removeAttribute('aria-busy');
        }
    });

    // Terug van Stripe zonder af te sluiten (terugknop, ook uit de
    // bfcache): de melding, het vinkje weer leeg, en het plan van toen.
    function terugVanStripe(geforceerd) {
        // Ouder dan een uur: een vergeten vertrek, geen terugkeer.
        const vorige = bewaard();
        const vers = vorige && Date.now() - Number(vorige.sinds) < 3600000;
        if (!geforceerd && !vers) return;
        bewaar(null);
        vinkje.checked = false;
        knop.disabled = false;
        knop.removeAttribute('aria-busy');
        const plan = formulier.querySelector(`input[name="plan"][value="${vorige?.plan === 'maandelijks' ? 'maandelijks' : 'jaarlijks'}"]`);
        if (plan && vers) plan.checked = true;
        werkSamenvattingBij();
        const melding = document.getElementById('abo-terug');
        melding.hidden = false;
        melding.focus();
    }

    window.addEventListener('pageshow', e => { if (e.persisted) terugVanStripe(false); });

    B.start(teken);
    terugVanStripe(B.param('staat') === 'terug');
})();
