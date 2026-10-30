// Inloggen en account maken, redesign v5 (Figma: Inloggen · Desktop, met
// Inloglink, Wachtwoord, Fout en Inloglink verstuurd, en Account maken ·
// Desktop).
//
// Eén pagina, twee tabbladen, elk met een eigen adres: zonder parameter
// Inloggen, met ?tab=account Account maken. ?next= (bijvoorbeeld
// abonnementen) blijft bij het wisselen bewaard; daar gaat de lezer na het
// inloggen naartoe zodra de back-end gekoppeld is.
//
// De inloglink is de standaard. Kies je je wachtwoord, dan verschijnt het
// wachtwoordveld in de kaart (geen pop-up) en volgt de knoptekst de keuze.
//
// Inloggen zelf is bewust nog niet gekoppeld (Supabase, TODO punt 66). De
// knop controleert de velden en meldt dan via showNotification() dat het
// voorbeeld niet gekoppeld is. Om de staten te bekijken: ?staat=fout (de
// melding bovenaan de kaart) en ?staat=verstuurd (kijk in je mail).

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const MIN_WACHTWOORD = 8;

    const $ = id => document.getElementById(id);
    const formulier = $('in-formulier');
    const email = $('in-email');
    const wachtwoord = $('in-wachtwoord');
    const isAccount = B.param('tab') === 'account';
    const staat = B.param('staat');
    const next = B.param('next');

    // Adres van deze pagina, met tab en next.
    function adres(tab) {
        const p = new URLSearchParams();
        if (tab === 'account') p.set('tab', 'account');
        if (next) p.set('next', next);
        const q = p.toString();
        return `/v5-inloggen.html${q ? `?${q}` : ''}`;
    }

    function manier() {
        return formulier.querySelector('input[name="manier"]:checked').value;
    }

    // Field error aan of uit, met aria-invalid en aria-describedby.
    function veldFout(veld, melding, aan) {
        melding.hidden = !aan;
        if (aan) {
            veld.setAttribute('aria-invalid', 'true');
            veld.setAttribute('aria-describedby', melding.id);
        } else {
            veld.removeAttribute('aria-invalid');
            veld.removeAttribute('aria-describedby');
        }
    }

    // Knoptekst, wachtwoordveld en hulptekst volgen het tabblad en de keuze.
    function werkKaartBij() {
        const metWachtwoord = manier() === 'wachtwoord';
        $('in-wachtwoord-blok').hidden = !metWachtwoord;
        $('in-wachtwoord-label').textContent = t(isAccount ? 'v5_in_nieuw_wachtwoord' : 'v5_in_wachtwoord');
        wachtwoord.autocomplete = isAccount ? 'new-password' : 'current-password';
        $('in-wachtwoord-hulp').hidden = !isAccount;
        $('in-vergeten').hidden = isAccount;
        // Bij een nieuw wachtwoord verwijst het veld ook naar de regel.
        if (isAccount && !wachtwoord.hasAttribute('aria-invalid')) wachtwoord.setAttribute('aria-describedby', 'in-wachtwoord-hulp');
        let knop = 'v5_in_stuur_link';
        if (isAccount) knop = 'v5_in_account_tab';
        else if (metWachtwoord) knop = 'schil_inloggen';
        $('in-knop').textContent = t(knop);
    }

    // "Met deze knop ga je akkoord met de {voorwaarden} en de {privacy}." De
    // links staan op de plek van de plaatshouders; zonder adres, want die
    // pagina's bestaan in v5 nog niet.
    function akkoordZin() {
        const p = $('in-akkoord');
        p.replaceChildren();
        t('v5_in_akkoord').split(/(\{voorwaarden\}|\{privacy\})/).forEach(deel => {
            if (deel === '{voorwaarden}') p.appendChild(el('a', null, t('v5_abo_voorwaarden')));
            else if (deel === '{privacy}') p.appendChild(el('a', null, t('v5_in_privacy')));
            else if (deel) p.appendChild(document.createTextNode(deel));
        });
    }

    function teken() {
        $('tab-inloggen').href = B.metTestdag(adres('inloggen'));
        $('tab-account').href = B.metTestdag(adres('account'));
        $(isAccount ? 'tab-account' : 'tab-inloggen').setAttribute('aria-current', 'page');
        $(isAccount ? 'tab-inloggen' : 'tab-account').removeAttribute('aria-current');

        $('in-titel').textContent = t(isAccount ? 'v5_in_account_titel' : 'v5_in_welkom');
        $('in-tekst').textContent = t(isAccount ? 'v5_in_account_tekst' : 'v5_in_welkom_tekst');
        document.title = `${t(isAccount ? 'v5_in_account_tab' : 'schil_inloggen')} · BrightNews`;
        email.placeholder = t('v5_in_email_voorbeeld');
        $('in-akkoord').hidden = !isAccount;
        $('in-premium').hidden = !isAccount;
        akkoordZin();
        werkKaartBij();

        const verstuurdNaar = B.param('email');
        $('in-mail-naar').textContent = verstuurdNaar
            ? t('v5_in_mail_naar', { email: verstuurdNaar })
            : t('v5_in_mail_naar_zonder');
        $('in-ander').href = B.metTestdag(adres(isAccount ? 'account' : 'inloggen'));
    }

    // ── Staten om te bekijken ────────────────────────────────────────────

    if (staat === 'verstuurd') {
        // Tabbladen en formulier verdwijnen; het e-mailadres wordt herhaald.
        $('in-formulierstaat').hidden = true;
        $('in-verstuurdstaat').hidden = false;
    } else if (staat === 'fout' && !isAccount) {
        formulier.querySelector('input[value="wachtwoord"]').checked = true;
        $('in-fout').hidden = false;
    }

    // ── Gedrag ───────────────────────────────────────────────────────────

    formulier.addEventListener('change', e => {
        if (e.target.name === 'manier') werkKaartBij();
        if (e.target.id === 'in-tonen') wachtwoord.type = e.target.checked ? 'text' : 'password';
    });

    email.addEventListener('input', () => {
        if (email.hasAttribute('aria-invalid') && email.validity.valid) veldFout(email, $('in-email-fout'), false);
    });

    // Uitweg in de foutmelding: inloggen met een inloglink.
    $('in-fout-actie').addEventListener('click', () => {
        formulier.querySelector('input[value="link"]').checked = true;
        $('in-fout').hidden = true;
        werkKaartBij();
        formulier.querySelector('button[type="submit"]').focus();
    });

    formulier.addEventListener('submit', e => {
        e.preventDefault();
        const emailGoed = email.value.trim() !== '' && email.validity.valid;
        veldFout(email, $('in-email-fout'), !emailGoed);

        let wachtwoordGoed = true;
        if (manier() === 'wachtwoord') {
            wachtwoordGoed = isAccount ? wachtwoord.value.length >= MIN_WACHTWOORD : wachtwoord.value !== '';
            $('in-wachtwoord-fouttekst').textContent = t(isAccount ? 'v5_in_fout_nieuw' : 'v5_in_fout_wachtwoord');
            veldFout(wachtwoord, $('in-wachtwoord-fout'), !wachtwoordGoed);
            // Bij een nieuw wachtwoord blijft ook de regel eraan gekoppeld.
            if (isAccount) wachtwoord.setAttribute('aria-describedby', wachtwoordGoed ? 'in-wachtwoord-hulp' : 'in-wachtwoord-hulp in-wachtwoord-fout');
        }

        if (!emailGoed) { email.focus(); return; }
        if (!wachtwoordGoed) { wachtwoord.focus(); return; }
        window.showNotification(t('v5_in_niet_gekoppeld'));
    });

    $('in-opnieuw').addEventListener('click', () => window.showNotification(t('v5_in_niet_gekoppeld')));

    B.start(teken);

    // Bij ?staat=fout gaat de focus naar de melding, zoals bij een echte fout.
    if (staat === 'fout' && !isAccount) $('in-fout').focus();
})();
