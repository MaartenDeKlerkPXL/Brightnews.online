// Wachtwoord vergeten, redesign v5 (Figma: Wachtwoord vergeten · Desktop, met
// Formulier, Fout: e-mailadres onvolledig, Mail verstuurd en Nieuw
// wachtwoord kiezen).
//
// Zelfde opbouw als inloggen. De controle op het e-mailadres gebeurt in de
// browser, vóór er iets wordt verstuurd: alleen een onvolledig adres geeft
// een fout. "Kijk in je mail" verschijnt straks altijd, ook bij een onbekend
// adres, zodat de pagina niet verklapt of er een account bestaat.
//
// Herstellen zelf is bewust nog niet gekoppeld (Supabase, TODO punt 66). De
// knoppen controleren de velden en melden dan via showNotification() dat het
// voorbeeld niet gekoppeld is. Om de staten te bekijken:
//   ?staat=fout       het onvolledige adres met de foutmelding
//   ?staat=verstuurd  kijk in je mail (met ?email= het adres in de tekst)
//   ?type=recovery    nieuw wachtwoord kiezen, waar de link uit de mail heen
//                     gaat (met ?email= het adres van het account)

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
    const email = $('wv-email');
    const wachtwoord = $('wv-wachtwoord');
    const staat = B.param('staat');
    const isHerstel = B.param('type') === 'recovery';

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
        document.title = `${t(isHerstel ? 'v5_wv_nieuw_titel' : 'v5_in_vergeten')} · BrightNews`;
        email.placeholder = t('v5_in_email_voorbeeld');
        document.querySelectorAll('[data-naar="inloggen"]').forEach(a => {
            a.href = B.metTestdag('/v5-inloggen.html');
        });

        const adres = B.param('email');
        $('wv-mail-naar').textContent = adres
            ? t('v5_wv_mail_naar', { email: adres })
            : t('v5_wv_mail_naar_zonder');
        $('wv-nieuw-voor').textContent = t('v5_wv_nieuw_tekst', { email: adres || t('v5_in_email_voorbeeld') });
    }

    // ── Staten om te bekijken ────────────────────────────────────────────

    if (isHerstel) {
        $('wv-formulierstaat').hidden = true;
        $('wv-nieuwstaat').hidden = false;
    } else if (staat === 'verstuurd') {
        $('wv-formulierstaat').hidden = true;
        $('wv-verstuurdstaat').hidden = false;
    } else if (staat === 'fout') {
        email.value = VOORBEELD_ONVOLLEDIG;
        veldFout(email, $('wv-email-fout'), true);
    }

    // ── Gedrag ───────────────────────────────────────────────────────────

    const nietGekoppeld = () => window.showNotification(t('v5_wv_niet_gekoppeld'));

    $('wv-formulier').addEventListener('submit', e => {
        e.preventDefault();
        const goed = VOLLEDIG.test(email.value.trim());
        veldFout(email, $('wv-email-fout'), !goed);
        if (!goed) { email.focus(); return; }
        nietGekoppeld();
    });

    email.addEventListener('input', () => {
        if (email.hasAttribute('aria-invalid') && VOLLEDIG.test(email.value.trim())) veldFout(email, $('wv-email-fout'), false);
    });

    $('wv-opnieuw').addEventListener('click', nietGekoppeld);

    $('wv-tonen').addEventListener('change', e => {
        wachtwoord.type = e.target.checked ? 'text' : 'password';
    });

    $('wv-nieuw').addEventListener('submit', e => {
        e.preventDefault();
        const goed = wachtwoord.value.length >= MIN_WACHTWOORD;
        veldFout(wachtwoord, $('wv-wachtwoord-fout'), !goed, 'wv-wachtwoord-hulp');
        if (!goed) { wachtwoord.focus(); return; }
        nietGekoppeld();
    });

    wachtwoord.addEventListener('input', () => {
        if (wachtwoord.hasAttribute('aria-invalid') && wachtwoord.value.length >= MIN_WACHTWOORD) {
            veldFout(wachtwoord, $('wv-wachtwoord-fout'), false, 'wv-wachtwoord-hulp');
        }
    });

    B.start(teken);
})();
