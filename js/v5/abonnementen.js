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
// De afrekening zelf is in dit voorbeeld bewust niet gekoppeld; dat is
// back-endwerk (TODO punt 66). Met vinkje meldt de knop dat via
// showNotification().

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
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
    // de plaatshouders. Zonder adres: die pagina's bestaan in v5 nog niet.
    function akkoordZin() {
        const p = document.getElementById('abo-akkoord');
        p.replaceChildren();
        t('v5_abo_akkoord').split(/(\{voorwaarden\}|\{refund\})/).forEach(deel => {
            if (deel === '{voorwaarden}') p.appendChild(el('a', null, t('v5_abo_voorwaarden')));
            else if (deel === '{refund}') p.appendChild(el('a', null, t('v5_abo_refund')));
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

    formulier.addEventListener('submit', e => {
        e.preventDefault();
        if (!vinkje.checked) {
            toonFout(true);
            vinkje.focus();
            return;
        }
        window.showNotification(t('v5_abo_niet_gekoppeld'));
    });

    B.start(teken);
})();
