// Mijn account, redesign v5 (Figma: Mijn account · Desktop, met Gratis,
// Premium (proefperiode) en Promocode onbekend).
//
// Het account is bewust nog niet gekoppeld (Supabase en Stripe, TODO punt
// 66). Wat de back-end straks levert, komt in dit voorbeeld uit het adres:
//   ?staat=premium    Premium in de proefperiode (anders: gratis account)
//   ?staat=promofout  de foutmelding onder het veld Promocode
//   ?gelezen=0..5     het leestegoed van een gratis account (standaard 3)
//   ?email=           het e-mailadres (standaard het voorbeeldadres)
// Datums zijn wel echt: het tegoed begint opnieuw op de 1e van de volgende
// maand (Nederlandse tijd), de proefperiode loopt 30 dagen.
//
// Knoppen die iets bij de back-end zouden doen (Toepassen, Uitloggen,
// Abonnement beheren, de mails aan of uit) melden via showNotification() dat
// het voorbeeld niet gekoppeld is.

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const TEGOED = 5;
    const PROEF_DAGEN = 30;
    const VOORBEELDCODE = 'WELKOM2O';

    const $ = id => document.getElementById(id);
    const staat = B.param('staat');
    const isPremium = staat === 'premium';
    const code = $('pr-code');
    const codeFout = $('pr-code-fout');

    // ?gelezen= begrensd op 0 t/m 5; zonder (geldige) waarde 3, zoals in Figma.
    function gelezen() {
        const n = Number.parseInt(B.param('gelezen'), 10);
        return Number.isInteger(n) ? Math.min(Math.max(n, 0), TEGOED) : 3;
    }

    // "28 november 2026"
    function datumMetJaar(dag) {
        return new Intl.DateTimeFormat(B.locale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(`${dag}T12:00:00Z`));
    }

    // De 1e van de volgende maand, als dagsleutel.
    function volgendeMaand() {
        const [jaar, maand] = B.vandaag().split('-').map(Number);
        const d = new Date(Date.UTC(jaar, maand, 1, 12));
        return d.toISOString().slice(0, 10);
    }

    function codeFoutTonen(melding) {
        const aan = Boolean(melding);
        codeFout.hidden = !aan;
        if (aan) {
            $('pr-code-fouttekst').textContent = melding;
            code.setAttribute('aria-invalid', 'true');
            code.setAttribute('aria-describedby', codeFout.id);
        } else {
            code.removeAttribute('aria-invalid');
            code.removeAttribute('aria-describedby');
        }
    }

    function tekenTegoed() {
        const x = gelezen();
        const nog = TEGOED - x;
        const datum = B.dagMaand(volgendeMaand());
        $('pr-gelezen').textContent = t('v5_pr_gelezen', { x, n: TEGOED });
        $('pr-meter').replaceChildren(...Array.from({ length: TEGOED }, (_, i) => el('span', i < x ? 'is-gelezen' : null)));
        let zin = t('v5_pr_nog', { n: nog, datum });
        if (nog === 1) zin = t('v5_pr_nog_een', { datum });
        if (nog === 0) zin = t('v5_pr_op', { datum });
        $('pr-nog').textContent = zin;
    }

    function teken() {
        document.title = `${t('schil_mijn_account')} · BrightNews`;
        const email = B.param('email') || t('v5_in_email_voorbeeld');
        $('pr-ingelogd').textContent = t('v5_pr_ingelogd_als', { email });
        $('pr-email').textContent = email;

        const status = $('pr-status');
        status.textContent = t(isPremium ? 'v5_pr_premium_proef' : 'v5_pr_gratis_account');
        status.classList.toggle('badge--success', isPremium);
        status.classList.toggle('badge--neutral', !isPremium);
        $('pr-gratis').hidden = isPremium;
        $('pr-premium').hidden = !isPremium;

        if (isPremium) {
            const einde = B.verschuif(B.vandaag(), PROEF_DAGEN);
            $('pr-proef-tot').textContent = datumMetJaar(einde);
            $('pr-opzeggen').textContent = t('v5_pr_opzeggen', { datum: B.dagMaand(einde) });
        } else {
            tekenTegoed();
            $('pr-probeer').href = B.metTestdag(B.url.abonnementen());
        }

        code.placeholder = t('v5_pr_code_voorbeeld');
        // Een getoonde foutmelding volgt de taal.
        if (!codeFout.hidden) {
            $('pr-code-fouttekst').textContent = t(code.value.trim() ? 'v5_pr_code_onbekend' : 'v5_pr_code_leeg');
        }
    }

    // ── Staten om te bekijken ────────────────────────────────────────────

    if (staat === 'promofout') code.value = VOORBEELDCODE;

    // ── Gedrag ───────────────────────────────────────────────────────────

    const nietGekoppeld = () => window.showNotification(t('v5_pr_niet_gekoppeld'));

    $('pr-promo').addEventListener('submit', e => {
        e.preventDefault();
        if (!code.value.trim()) {
            codeFoutTonen(t('v5_pr_code_leeg'));
            code.focus();
            return;
        }
        codeFoutTonen(null);
        nietGekoppeld();
    });

    code.addEventListener('input', () => {
        if (code.hasAttribute('aria-invalid')) codeFoutTonen(null);
    });

    $('pr-mails').addEventListener('change', nietGekoppeld);
    $('pr-uitloggen').addEventListener('click', nietGekoppeld);
    $('pr-beheren').addEventListener('click', () => window.showNotification(t('v5_pr_portaal_niet_gekoppeld')));

    B.start(teken);

    if (staat === 'promofout') codeFoutTonen(t('v5_pr_code_onbekend'));
})();
