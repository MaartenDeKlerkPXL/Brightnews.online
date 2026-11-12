// Wachtwoord vergeten, redesign v5 (Figma: Wachtwoord vergeten · Desktop, met
// Formulier, Fout: e-mailadres onvolledig, Mail verstuurd en Nieuw
// wachtwoord kiezen).
//
// Zelfde opbouw als inloggen. De controle op het e-mailadres gebeurt in de
// browser, vóór er iets wordt verstuurd: alleen een onvolledig adres geeft
// een fout. "Kijk in je mail" verschijnt altijd, ook bij een onbekend adres,
// zodat de pagina niet verklapt of er een account bestaat.
//
// Gekoppeld aan Supabase (TODO 66 punt 11):
//   Stuur link       resetPasswordForEmail, terug naar deze pagina met
//                    ?type=recovery. "Stuur opnieuw" pas na 60 seconden.
//   ?type=recovery   de link uit de mail. Supabase logt de lezer daarmee in;
//                    updateUser zet het nieuwe wachtwoord, daarna door naar
//                    Mijn account. Is de link verlopen of al gebruikt, dan
//                    het formulier met de melding "Deze link is verlopen".
//
// Om de staten te bekijken (zonder Supabase):
//   ?staat=fout       het onvolledige adres met de foutmelding
//   ?staat=verstuurd  kijk in je mail (met ?email= het adres in de tekst)
//   ?staat=nieuw      nieuw wachtwoord kiezen (met ?email=)
//   ?staat=verlopen   het formulier met de melding over de verlopen link

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const MIN_WACHTWOORD = 8;
    const VOORBEELD_ONVOLLEDIG = 'jan@voorbeeld';
    // Iets vóór en na de @, en een punt in het domein. type="email" alleen
    // laat jan@voorbeeld door, en dat is precies het onvolledige adres.
    const VOLLEDIG = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

    const $ = id => document.getElementById(id);
    const client = window.supabaseClient;
    const email = $('wv-email');
    const wachtwoord = $('wv-wachtwoord');
    const foutTekst = $('wv-wachtwoord-fout').querySelector('span');
    const staat = B.param('staat');
    const isHerstel = B.param('type') === 'recovery';
    // Supabase zet een mislukte link als fout in het adres (#error_code=otp_expired).
    const linkFout = /(^|[#&])error(_code)?=/.test(window.location.hash);
    let mailAdres = B.param('email') || '';

    // Field error aan of uit. Het wachtwoordveld houdt zijn hulptekst erbij.
    function veldFout(veld, melding, aan, hulp) {
        melding.hidden = !aan;
        if (aan) veld.setAttribute('aria-invalid', 'true');
        else veld.removeAttribute('aria-invalid');
        const beschrijving = [hulp, aan && melding.id].filter(Boolean).join(' ');
        if (beschrijving) veld.setAttribute('aria-describedby', beschrijving);
        else veld.removeAttribute('aria-describedby');
    }

    function teken() {
        document.title = `${t($('wv-nieuwstaat').hidden ? 'v5_in_vergeten' : 'v5_wv_nieuw_titel')} · BrightNews`;
        email.placeholder = t('v5_in_email_voorbeeld');
        document.querySelectorAll('[data-naar="inloggen"]').forEach(a => {
            a.href = B.metTestdag('/v5-inloggen.html');
        });

        $('wv-mail-naar').textContent = mailAdres
            ? t('v5_wv_mail_naar', { email: mailAdres })
            : t('v5_wv_mail_naar_zonder');
        $('wv-nieuw-voor').textContent = t('v5_wv_nieuw_tekst', { email: mailAdres || t('v5_in_email_voorbeeld') });
    }

    function toon(welke) {
        $('wv-formulierstaat').hidden = welke !== 'formulier';
        $('wv-verstuurdstaat').hidden = welke !== 'verstuurd';
        $('wv-nieuwstaat').hidden = welke !== 'nieuw';
    }

    function toonVerlopen() {
        toon('formulier');
        teken();
        $('wv-verlopen').hidden = false;
        $('wv-verlopen').focus();
    }

    function meldFout(fout) {
        console.warn('BrightNews v5: wachtwoord herstellen', fout);
        window.showNotification(t(fout?.status === 429 ? 'v5_in_fout_te_vaak' : 'v5_in_fout_algemeen'), 'error');
    }

    // Alleen geen verbinding of een storing mag de lezer weten. Ook "te vaak"
    // niet: Supabase remt alleen adressen mét een account, dus die melding
    // zou verklappen wie er een account heeft.
    async function stuurHerstel() {
        const { error } = await client.auth.resetPasswordForEmail(mailAdres, {
            redirectTo: `${window.location.origin}/v5-wachtwoord-vergeten.html?type=recovery`,
        });
        if (error && (!error.status || error.status >= 500)) throw error;
        if (error) console.warn('BrightNews v5: herstelmail niet verstuurd', error.message);
    }

    // ── Staten ───────────────────────────────────────────────────────────

    // Vanuit Mijn account (Wachtwoord instellen of wijzigen): het adres uit
    // de sessie, niet uit het adres van de pagina.
    if (!staat && !isHerstel && window.bnAccount) {
        window.bnAccount.then(({ gebruiker }) => {
            if (gebruiker?.email && !email.value) email.value = gebruiker.email;
        });
    }

    if (staat === 'nieuw') {
        toon('nieuw');
    } else if (staat === 'verstuurd') {
        toon('verstuurd');
    } else if (staat === 'verlopen') {
        $('wv-verlopen').hidden = false;
    } else if (staat === 'fout') {
        email.value = VOORBEELD_ONVOLLEDIG;
        veldFout(email, $('wv-email-fout'), true);
    } else if (isHerstel && linkFout) {
        toonVerlopen();
    } else if (isHerstel) {
        // Wachten tot Supabase de link uit het adres heeft verwerkt; tot dan
        // staat de knop uit (aria-busy: hij houdt zijn kleur).
        toon('nieuw');
        const opslaan = $('wv-nieuw').querySelector('button[type="submit"]');
        opslaan.disabled = true;
        opslaan.setAttribute('aria-busy', 'true');
        (window.bnAccount || Promise.resolve({ gebruiker: null })).then(({ gebruiker }) => {
            opslaan.disabled = false;
            opslaan.removeAttribute('aria-busy');
            if (!gebruiker) { toonVerlopen(); return; }
            mailAdres = gebruiker.email || '';
            teken();
            wachtwoord.focus();
        });
    }

    // ── Gedrag ───────────────────────────────────────────────────────────

    $('wv-formulier').addEventListener('submit', async e => {
        e.preventDefault();
        const knop = e.currentTarget.querySelector('button[type="submit"]');
        if (knop.disabled) return;
        const goed = VOLLEDIG.test(email.value.trim());
        veldFout(email, $('wv-email-fout'), !goed);
        if (!goed) { email.focus(); return; }
        if (!client || staat) { window.showNotification(t('v5_wv_niet_gekoppeld')); return; }

        mailAdres = email.value.trim();
        knop.disabled = true;
        knop.setAttribute('aria-busy', 'true');
        try {
            await stuurHerstel();
            $('wv-verlopen').hidden = true;
            teken();
            toon('verstuurd');
            const kop = $('wv-verstuurdstaat').querySelector('h1');
            kop.tabIndex = -1;
            kop.focus();
            B.wachtKnop($('wv-opnieuw'));
        } catch (fout) {
            meldFout(fout);
        } finally {
            knop.disabled = false;
            knop.removeAttribute('aria-busy');
        }
    });

    email.addEventListener('input', () => {
        if (email.hasAttribute('aria-invalid') && VOLLEDIG.test(email.value.trim())) veldFout(email, $('wv-email-fout'), false);
    });

    $('wv-opnieuw').addEventListener('click', async e => {
        const opnieuwKnop = e.currentTarget;
        if (!client || !mailAdres || staat) { window.showNotification(t('v5_in_opnieuw_gestuurd')); return; }
        opnieuwKnop.disabled = true;
        try {
            await stuurHerstel();
            window.showNotification(t('v5_in_opnieuw_gestuurd'));
            B.wachtKnop(opnieuwKnop);
        } catch (fout) {
            opnieuwKnop.disabled = false;
            meldFout(fout);
        }
    });

    $('wv-tonen').addEventListener('change', e => {
        wachtwoord.type = e.target.checked ? 'text' : 'password';
    });

    $('wv-nieuw').addEventListener('submit', async e => {
        e.preventDefault();
        const knop = e.currentTarget.querySelector('button[type="submit"]');
        if (knop.disabled) return;
        const goed = wachtwoord.value.length >= MIN_WACHTWOORD;
        foutTekst.textContent = t('v5_in_fout_nieuw');
        veldFout(wachtwoord, $('wv-wachtwoord-fout'), !goed, 'wv-wachtwoord-hulp');
        if (!goed) { wachtwoord.focus(); return; }
        if (!client || !isHerstel) { window.showNotification(t('v5_wv_niet_gekoppeld')); return; }

        knop.disabled = true;
        knop.setAttribute('aria-busy', 'true');
        try {
            const { error } = await client.auth.updateUser({ password: wachtwoord.value, data: { heeft_wachtwoord: true } });
            if (error?.code === 'weak_password' || error?.code === 'same_password') {
                foutTekst.textContent = t(error.code === 'same_password' ? 'v5_wv_fout_zelfde' : 'v5_in_fout_nieuw');
                veldFout(wachtwoord, $('wv-wachtwoord-fout'), true, 'wv-wachtwoord-hulp');
                wachtwoord.focus();
                return;
            }
            // Sessie weg of verlopen: opnieuw een link aanvragen.
            if (error?.status === 401 || error?.code === 'session_not_found' || error?.name === 'AuthSessionMissingError') { toonVerlopen(); return; }
            if (error) throw error;
            window.showNotification(t('v5_wv_opgeslagen'));
            setTimeout(() => { window.location.href = '/v5-profiel.html'; }, 1200);
        } catch (fout) {
            meldFout(fout);
        } finally {
            knop.disabled = false;
            knop.removeAttribute('aria-busy');
        }
    });

    wachtwoord.addEventListener('input', () => {
        if (wachtwoord.hasAttribute('aria-invalid') && wachtwoord.value.length >= MIN_WACHTWOORD) {
            veldFout(wachtwoord, $('wv-wachtwoord-fout'), false, 'wv-wachtwoord-hulp');
        }
    });

    B.start(teken);
})();
