// Mijn account, redesign v5 (Figma: Mijn account · Desktop, met Gratis,
// Premium (proefperiode) en Promocode onbekend).
//
// Gekoppeld aan Supabase en Stripe (TODO 66 punt 10):
//   - niet ingelogd: door naar Inloggen, en daarna terug hierheen;
//   - de status komt uit profiles (window.bnAccount, js/v5/schil.js): gratis,
//     proefperiode, Premium, opgezegd, betaling mislukt, of Premium via een
//     promocode. abo_status, opgezegd en proef_tot vult de stripe-webhook
//     (supabase/account-koppeling-2026-11-12.sql);
//   - het leestegoed uit leestegoed(), de mails uit mails_aan()/zet_mails(),
//     een promocode via redeem_promo_code();
//   - Abonnement beheren opent het klantportaal van Stripe met het
//     e-mailadres al ingevuld (js/betaal-config.js);
//   - Wachtwoord instellen of wijzigen gaat via een herstelmail, Account
//     verwijderen via Contact (zo staat het in de privacyverklaring).
// Het tegoed begint opnieuw op de 1e van de volgende maand (Nederlandse tijd).
//
// Om de staten te bekijken zonder account (dan wordt er niets opgehaald):
//   ?staat=gratis|proef|actief|opgezegd|mislukt|code|promofout
//   (premium = proef, de oude naam), met ?gelezen=0..5 en ?email=.

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const PROEF_DAGEN = 30;
    const VOORBEELDCODE = 'WELKOM2O';
    const SOORTEN = ['gratis', 'proef', 'actief', 'opgezegd', 'mislukt', 'code'];

    const $ = id => document.getElementById(id);
    const client = window.supabaseClient;
    const gevraagd = B.param('staat') === 'premium' ? 'proef' : B.param('staat');
    const voorbeeld = SOORTEN.includes(gevraagd) || gevraagd === 'promofout';
    const code = $('pr-code');
    const codeFout = $('pr-code-fout');
    const mails = $('pr-mails');

    // Wat er op de pagina komt. In het voorbeeld uit het adres, anders uit
    // Supabase (laad()).
    let acc = null;

    // ?gelezen= begrensd op 0 t/m 5; zonder (geldige) waarde 3, zoals in Figma.
    function voorbeeldGelezen() {
        const n = Number.parseInt(B.param('gelezen'), 10);
        return Number.isInteger(n) ? Math.min(Math.max(n, 0), 5) : 3;
    }

    function voorbeeldAccount() {
        const soort = SOORTEN.includes(gevraagd) ? gevraagd : 'gratis';
        const over = B.verschuif(B.vandaag(), soort === 'proef' ? PROEF_DAGEN : 200);
        return {
            email: B.param('email') || t('v5_in_email_voorbeeld'),
            soort,
            plan: 'jaarlijks',
            tot: over,
            gelezen: voorbeeldGelezen(),
            limiet: 5,
            wachtwoord: false,
            portaal: soort !== 'code',
        };
    }

    // Uit één profielrij de staat van Mijn account. De volgorde telt: een
    // mislukte betaling wint (Premium staat dan uit), dan gratis, opgezegd,
    // proef, actief; Premium zonder Stripe komt van een promocode.
    function soortVan(profiel, premium) {
        const p = profiel || {};
        if (p.abo_status === 'past_due' || p.abo_status === 'unpaid') return 'mislukt';
        if (!premium) return 'gratis';
        if (p.opgezegd) return 'opgezegd';
        if (p.abo_status === 'trialing') return 'proef';
        // Zonder abo_status: een abonnement van vóór die kolom (tot het
        // volgende Stripe-event). canceled met Premium = een promocode erna.
        if (p.abo_status === 'active' || (!p.abo_status && p.stripe_customer_id)) return 'actief';
        return 'code';
    }

    function planVan(waarde) {
        if (/^(jaarlijks|shine)$/i.test(waarde || '')) return 'jaarlijks';
        if (/^(maandelijks|glow)$/i.test(waarde || '')) return 'maandelijks';
        return null;
    }

    async function laad() {
        const { gebruiker, premium, profiel } = await window.bnAccount;
        if (!gebruiker) {
            window.location.replace('/v5-inloggen.html?next=profiel');
            return false;
        }
        const soort = soortVan(profiel, premium);
        const tot = soort === 'proef' ? (profiel?.proef_tot || profiel?.premium_until) : profiel?.premium_until;
        acc = {
            email: gebruiker.email || '',
            soort,
            plan: planVan(profiel?.plan_type),
            tot: tot ? B.dagVan(tot) : null,
            gelezen: 0,
            limiet: 5,
            wachtwoord: gebruiker.user_metadata?.heeft_wachtwoord === true,
            // Ook bij een promocode als er nog een abonnement loopt (bijvoorbeeld
            // met een mislukte betaling): dan moet opzeggen of de betaalmethode
            // aanpassen kunnen.
            portaal: Boolean(profiel?.stripe_customer_id)
                && (soort !== 'code' || ['trialing', 'active', 'past_due', 'unpaid', 'incomplete'].includes(profiel?.abo_status)),
        };

        // Tegoed en mails tegelijk; valt er één weg, dan blijft de rest staan.
        const [tegoed, aan] = await Promise.all([
            soort === 'gratis' ? client.rpc('leestegoed') : Promise.resolve({ data: null }),
            client.rpc('mails_aan'),
        ]);
        if (tegoed.data) {
            acc.gelezen = Number(tegoed.data.gebruikt) || 0;
            acc.limiet = Number(tegoed.data.limiet) || 5;
        }
        if (aan.error || typeof aan.data !== 'boolean') {
            console.warn('BrightNews v5: mails_aan', aan.error);
            mails.disabled = true;
        } else {
            mails.checked = aan.data;
            mails.disabled = false;
        }
        return true;
    }

    // "28 november 2026"
    function datumMetJaar(dag) {
        return new Intl.DateTimeFormat(B.locale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(`${dag}T12:00:00Z`));
    }

    // De 1e van de volgende maand, als dagsleutel.
    function volgendeMaand() {
        const [jaar, maand] = B.vandaag().split('-').map(Number);
        return new Date(Date.UTC(jaar, maand, 1, 12)).toISOString().slice(0, 10);
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
        const x = Math.min(acc.gelezen, acc.limiet);
        const nog = acc.limiet - x;
        const datum = B.dagMaand(volgendeMaand());
        $('pr-gelezen').textContent = t('v5_pr_gelezen', { x, n: acc.limiet });
        $('pr-meter').replaceChildren(...Array.from({ length: acc.limiet }, (_, i) => el('span', i < x ? 'is-gelezen' : null)));
        let zin = t('v5_pr_nog', { n: nog, datum });
        if (nog === 1) zin = t('v5_pr_nog_een', { datum });
        if (nog === 0) zin = t('v5_pr_op', { datum });
        $('pr-nog').textContent = zin;
    }

    const BADGE = {
        gratis: 'v5_pr_gratis_account',
        proef: 'v5_pr_premium_proef',
        actief: 'v5_pr_premium_actief',
        opgezegd: 'v5_pr_premium_opgezegd',
        mislukt: 'v5_pr_betaling_mislukt',
        code: 'v5_pr_premium_actief',
    };

    function tekenPremium() {
        const { soort, plan } = acc;
        const datum = acc.tot ? datumMetJaar(acc.tot) : '';
        $('pr-mislukt').hidden = soort !== 'mislukt';
        // Bij een mislukte betaling staat Premium uit: dan niet "onbeperkt".
        $('pr-lezen-rij').hidden = soort === 'mislukt';

        let planTekst = t('v5_pr_plan_premium');
        if (soort === 'code') planTekst = t('v5_pr_via_code');
        else if (plan) planTekst = t(plan === 'jaarlijks' ? 'v5_abo_shine' : 'v5_abo_glow');
        $('pr-plan').textContent = planTekst;

        const labels = { proef: 'v5_pr_proef_tot', actief: 'v5_pr_volgende_betaling', mislukt: 'v5_pr_volgende_betaling' };
        $('pr-datum-label').textContent = t(labels[soort] || 'v5_pr_premium_tot');
        $('pr-proef-tot').textContent = datum;
        $('pr-datum-label').parentElement.hidden = !datum || soort === 'mislukt';

        // Daarna: de prijs zolang het abonnement doorloopt, anders gratis.
        const doorlopend = soort === 'proef' || soort === 'actief';
        const daarna = doorlopend
            ? (plan && t(plan === 'jaarlijks' ? 'v5_pr_daarna_jaar' : 'v5_pr_daarna_maand'))
            : soort === 'mislukt' ? null : t('v5_pr_daarna_gratis');
        $('pr-daarna').textContent = daarna || '';
        $('pr-daarna-rij').hidden = !daarna;

        const zinnen = {
            proef: acc.tot && t('v5_pr_opzeggen', { datum: B.dagMaand(acc.tot) }),
            opgezegd: acc.tot && t('v5_pr_opgezegd_tekst', { datum }),
            code: acc.tot && t('v5_pr_code_tekst', { datum }),
        };
        $('pr-opzeggen').textContent = zinnen[soort] || '';
        $('pr-opzeggen').hidden = !zinnen[soort];
        $('pr-beheren-blok').hidden = !acc.portaal;
    }

    function teken() {
        document.title = `${t('schil_mijn_account')} · BrightNews`;
        code.placeholder = t('v5_pr_code_voorbeeld');
        $('pr-kolommen').hidden = !acc;
        if (!acc) return;

        $('pr-ingelogd').textContent = t('v5_pr_ingelogd_als', { email: acc.email });
        $('pr-email').textContent = acc.email;

        const status = $('pr-status');
        status.textContent = t(BADGE[acc.soort]);
        status.classList.toggle('badge--success', acc.soort !== 'gratis' && acc.soort !== 'mislukt');
        status.classList.toggle('badge--neutral', acc.soort === 'gratis');
        status.classList.toggle('badge--waarschuwing', acc.soort === 'mislukt');

        const gratis = acc.soort === 'gratis';
        $('pr-gratis').hidden = !gratis;
        $('pr-premium').hidden = gratis;
        if (gratis) {
            tekenTegoed();
            $('pr-probeer').href = B.metTestdag(B.url.abonnementen());
        } else {
            tekenPremium();
        }

        $('pr-inlogmanier').textContent = t(acc.wachtwoord ? 'v5_pr_wachtwoord_of_link' : 'v5_pr_inloglink');
        $('pr-wachtwoord-tekst').textContent = t(acc.wachtwoord ? 'v5_pr_wachtwoord_wijzigen' : 'v5_pr_wachtwoord_instellen');
        // Zonder ?email=: het adres hoort niet in de geschiedenis; de pagina
        // haalt het zelf uit de sessie.
        $('pr-wachtwoord').href = '/v5-wachtwoord-vergeten.html';

        // Een getoonde foutmelding volgt de taal.
        if (!codeFout.hidden && voorbeeld) {
            $('pr-code-fouttekst').textContent = t(code.value.trim() ? 'v5_pr_code_onbekend' : 'v5_pr_code_leeg');
        }
    }

    // ── Gedrag ───────────────────────────────────────────────────────────

    const nietGekoppeld = () => window.showNotification(t('v5_pr_niet_gekoppeld'));
    const melding = fout => {
        console.warn('BrightNews v5: Mijn account', fout);
        window.showNotification(t('v5_in_fout_algemeen'), 'error');
    };

    const CODE_REDEN = {
        invalid_code: 'v5_pr_code_onbekend',
        expired: 'v5_pr_code_verlopen',
        limit_reached: 'v5_pr_code_op',
        already_redeemed: 'v5_pr_code_al',
        rate_limited: 'v5_pr_code_te_vaak',
    };

    $('pr-promo').addEventListener('submit', async e => {
        e.preventDefault();
        const knop = e.currentTarget.querySelector('button[type="submit"]');
        if (knop.getAttribute('aria-disabled') === 'true') return;
        if (!code.value.trim()) {
            codeFoutTonen(t('v5_pr_code_leeg'));
            code.focus();
            return;
        }
        codeFoutTonen(null);
        if (voorbeeld || !client) { nietGekoppeld(); return; }

        // aria-disabled in plaats van disabled: zo houdt de knop de focus.
        knop.setAttribute('aria-disabled', 'true');
        knop.setAttribute('aria-busy', 'true');
        try {
            const { data, error } = await client.rpc('redeem_promo_code', { p_code: code.value.trim() });
            if (error) throw error;
            if (!data?.success) {
                codeFoutTonen(t(CODE_REDEN[data?.reason] || 'v5_pr_code_onbekend'));
                code.focus();
                return;
            }
            code.value = '';
            window.showNotification(t('v5_pr_code_gelukt', { n: data.duration_days }));
            window.bnVerversAccount();
            if (await laad()) teken();
        } catch (fout) {
            melding(fout);
        } finally {
            knop.removeAttribute('aria-disabled');
            knop.removeAttribute('aria-busy');
        }
    });

    code.addEventListener('input', () => {
        if (code.hasAttribute('aria-invalid')) codeFoutTonen(null);
    });

    // Tijdens het opslaan geen tweede klik, maar ook geen disabled: dan
    // verliest een toetsenbordgebruiker de focus.
    let mailsBezig = false;
    mails.addEventListener('click', e => { if (mailsBezig) e.preventDefault(); });
    mails.addEventListener('change', async () => {
        if (voorbeeld || !client) { nietGekoppeld(); return; }
        const aan = mails.checked;
        mailsBezig = true;
        mails.setAttribute('aria-disabled', 'true');
        try {
            const { error } = await client.rpc('zet_mails', { p_aan: aan });
            if (error) throw error;
            window.showNotification(t(aan ? 'v5_pr_mails_aan' : 'v5_pr_mails_uit'));
        } catch (fout) {
            mails.checked = !aan;
            melding(fout);
        } finally {
            mailsBezig = false;
            mails.removeAttribute('aria-disabled');
        }
    });

    $('pr-uitloggen').addEventListener('click', async () => {
        if (!client) { nietGekoppeld(); return; }
        // scope 'local': alleen dit apparaat. Lukt het niet (geen verbinding),
        // dan wist signOut de sessie in deze browser toch.
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) console.warn('BrightNews v5: uitloggen', error);
        window.location.href = '/v5-home.html';
    });

    // Het no-code klantportaal van Stripe: de lezer krijgt daar een
    // inlogcode per mail. Met prefilled_email hoeft hij zijn adres niet te typen.
    $('pr-beheren').addEventListener('click', () => {
        const portaal = window.BETAAL_CONFIG?.stripe?.klantportaal;
        if (voorbeeld || !portaal) { window.showNotification(t('v5_pr_portaal_niet_gekoppeld')); return; }
        window.location.href = `${portaal}?prefilled_email=${encodeURIComponent(acc.email)}`;
    });

    // ── Starten ──────────────────────────────────────────────────────────

    if (voorbeeld || !client) {
        acc = voorbeeldAccount();
        if (gevraagd === 'promofout') code.value = VOORBEELDCODE;
        B.start(teken);
        if (gevraagd === 'promofout') codeFoutTonen(t('v5_pr_code_onbekend'));
    } else {
        // Eén keer laden; een taalwissel tekent daarna alleen opnieuw. Gaat
        // het laden mis, dan toont B.start de laadfout.
        $('pr-kolommen').hidden = true;
        let geladen = null;
        B.start(async () => {
            geladen = geladen || laad();
            if (await geladen) teken();
        });
    }
})();
