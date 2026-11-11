// Inloggen en account maken, redesign v5 (Figma: Inloggen · Desktop, met
// Inloglink, Wachtwoord, Fout en Inloglink verstuurd, en Account maken ·
// Desktop).
//
// Eén pagina, twee tabbladen, elk met een eigen adres: zonder parameter
// Inloggen, met ?tab=account Account maken. ?next= blijft bij het wisselen
// bewaard; daar gaat de lezer na het inloggen naartoe (een pad op deze site,
// of een korte naam als "abonnementen"). Zonder ?next=: Mijn account.
// ?email= vult het e-mailadres in (de paywall stuurt het mee).
//
// De inloglink is de standaard. Kies je je wachtwoord, dan verschijnt het
// wachtwoordveld in de kaart (geen pop-up) en volgt de knoptekst de keuze.
//
// Gekoppeld aan Supabase (TODO 66 punt 9):
//   inloglink   signInWithOtp; bij Inloggen alleen voor bestaande accounts
//   wachtwoord  signInWithPassword, of signUp bij Account maken
// De pagina verklapt nooit of een e-mailadres een account heeft: een
// inloglink "gaat altijd weg", ook als Supabase het adres niet kent. Bij een
// nieuw account gaan de taal (preferred_lang) en het vinkje "geen
// welkomstmails" (geen_welkomstmails) mee in user_metadata; backend/
// stuur-mails.js leest die. "Stuur opnieuw" kan pas na 60 seconden.
//
// Om de staten te bekijken: ?staat=fout (de melding bovenaan de kaart) en
// ?staat=verstuurd (kijk in je mail).

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const MIN_WACHTWOORD = 8;
    const WACHTTIJD = 60;

    const $ = id => document.getElementById(id);
    const client = window.supabaseClient;
    const formulier = $('in-formulier');
    const email = $('in-email');
    const wachtwoord = $('in-wachtwoord');
    const knop = formulier.querySelector('button[type="submit"]');
    const isAccount = B.param('tab') === 'account';
    const staat = B.param('staat');
    const next = B.param('next');
    let opnieuw = null;

    // Adres van deze pagina, met tab en next.
    function adres(tab) {
        const p = new URLSearchParams();
        if (tab === 'account') p.set('tab', 'account');
        if (next) p.set('next', next);
        const q = p.toString();
        return `/v5-inloggen.html${q ? `?${q}` : ''}`;
    }

    // Alleen een adres op deze site: ?next= mag de lezer niet wegsturen.
    function doel() {
        if (next && /^\/(?![/\\])/.test(next)) return next;
        if (next && /^[a-z-]+$/.test(next)) return `/v5-${next}.html`;
        return '/v5-profiel.html';
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
        let tekst = 'v5_in_stuur_link';
        if (isAccount) tekst = 'v5_in_account_tab';
        else if (metWachtwoord) tekst = 'schil_inloggen';
        $('in-knop').textContent = t(tekst);
    }

    // "Met deze knop ga je akkoord met de {voorwaarden} en de {privacy}." De
    // links staan op de plek van de plaatshouders. Daarna de zin over de
    // welkomstmails: die gaan zonder vinkje naar elk nieuw account, dus de
    // lezer moet bij het aanmaken horen dat ze komen en dat afmelden kan.
    function akkoordZin() {
        const p = $('in-akkoord');
        p.replaceChildren();
        t('v5_in_akkoord').split(/(\{voorwaarden\}|\{privacy\})/).forEach(deel => {
            if (deel === '{voorwaarden}') p.appendChild(B.link(B.url.voorwaarden(), null, t('v5_abo_voorwaarden')));
            else if (deel === '{privacy}') p.appendChild(B.link(B.url.privacy(), null, t('v5_in_privacy')));
            else if (deel) p.appendChild(document.createTextNode(deel));
        });
        p.appendChild(document.createTextNode(` ${t('v5_in_welkomstmails')}`));
    }

    function teken() {
        $('tab-inloggen').href = B.metTestdag(adres('inloggen'));
        $('tab-account').href = B.metTestdag(adres('account'));
        $('in-vergeten').href = B.metTestdag('/v5-wachtwoord-vergeten.html');
        $(isAccount ? 'tab-account' : 'tab-inloggen').setAttribute('aria-current', 'page');
        $(isAccount ? 'tab-inloggen' : 'tab-account').removeAttribute('aria-current');

        $('in-titel').textContent = t(isAccount ? 'v5_in_account_titel' : 'v5_in_welkom');
        $('in-tekst').textContent = t(isAccount ? 'v5_in_account_tekst' : 'v5_in_welkom_tekst');
        document.title = `${t(isAccount ? 'v5_in_account_tab' : 'schil_inloggen')} · BrightNews`;
        email.placeholder = t('v5_in_email_voorbeeld');
        $('in-akkoord').hidden = !isAccount;
        $('in-mails-keuze').hidden = !isAccount;
        $('in-premium').hidden = !isAccount;
        akkoordZin();
        werkKaartBij();

        const verstuurdNaar = email.value.trim() || B.param('email');
        $('in-mail-naar').textContent = verstuurdNaar
            ? t('v5_in_mail_naar', { email: verstuurdNaar })
            : t('v5_in_mail_naar_zonder');
        $('in-ander').href = B.metTestdag(adres(isAccount ? 'account' : 'inloggen'));
    }

    // ── Na het versturen ─────────────────────────────────────────────────

    function toonVerstuurd(adresVerstuurd) {
        $('in-formulierstaat').hidden = true;
        $('in-verstuurdstaat').hidden = false;
        $('in-mail-naar').textContent = t('v5_in_mail_naar', { email: adresVerstuurd });
        const kop = $('in-verstuurdstaat').querySelector('h1');
        kop.tabIndex = -1;
        kop.focus();
        B.wachtKnop($('in-opnieuw'), WACHTTIJD);
    }

    // ── Supabase ─────────────────────────────────────────────────────────

    function metadata() {
        return { preferred_lang: B.taal(), geen_welkomstmails: $('in-geen-mails').checked };
    }

    // Te vaak, geen verbinding of een storing: dat mag de lezer weten. Elke
    // andere weigering (zoals "dit adres kent geen account") niet.
    function moetMelden(fout) {
        return !fout.status || fout.status === 429 || fout.status >= 500;
    }

    function meldFout(fout) {
        console.warn('BrightNews v5: inloggen', fout);
        window.showNotification(t(fout?.status === 429 ? 'v5_in_fout_te_vaak' : 'v5_in_fout_algemeen'), 'error');
    }

    async function stuurLink(adresLezer) {
        const { error } = await client.auth.signInWithOtp({
            email: adresLezer,
            options: {
                shouldCreateUser: isAccount,
                emailRedirectTo: `${window.location.origin}${doel()}`,
                ...(isAccount ? { data: metadata() } : {}),
            },
        });
        if (error && moetMelden(error)) throw error;
        if (error) console.warn('BrightNews v5: inloglink niet verstuurd', error.message);
    }

    async function logInMetWachtwoord(adresLezer) {
        const { error } = await client.auth.signInWithPassword({ email: adresLezer, password: wachtwoord.value });
        if (!error) { window.location.href = doel(); return; }
        if (moetMelden(error)) throw error;
        // Onbekend adres, verkeerd wachtwoord of nog niet bevestigd: één
        // melding, met de inloglink als uitweg.
        $('in-fout').hidden = false;
        $('in-fout').focus();
    }

    async function maakAccountMetWachtwoord(adresLezer) {
        const { data, error } = await client.auth.signUp({
            email: adresLezer,
            password: wachtwoord.value,
            options: { emailRedirectTo: `${window.location.origin}${doel()}`, data: metadata() },
        });
        if (error?.code === 'weak_password') {
            $('in-wachtwoord-fouttekst').textContent = t('v5_in_fout_nieuw');
            veldFout(wachtwoord, $('in-wachtwoord-fout'), true);
            wachtwoord.focus();
            return;
        }
        if (error && moetMelden(error)) throw error;
        if (data?.session) { window.location.href = doel(); return; }
        // Bevestigen per mail. Bestond het adres al, dan zegt Supabase dat
        // niet, en wij dus ook niet.
        opnieuw = () => client.auth.resend({ type: 'signup', email: adresLezer, options: { emailRedirectTo: `${window.location.origin}${doel()}` } });
        toonVerstuurd(adresLezer);
    }

    // ── Staten om te bekijken ────────────────────────────────────────────

    if (staat === 'verstuurd') {
        // Tabbladen en formulier verdwijnen; het e-mailadres wordt herhaald.
        $('in-formulierstaat').hidden = true;
        $('in-verstuurdstaat').hidden = false;
    } else if (staat === 'fout' && !isAccount) {
        formulier.querySelector('input[value="wachtwoord"]').checked = true;
        $('in-fout').hidden = false;
    } else {
        if (B.param('email')) email.value = B.param('email');
        // Al ingelogd? Dan heeft deze pagina niets te doen.
        window.bnAccount?.then(({ gebruiker }) => { if (gebruiker) window.location.replace(doel()); });
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
        knop.focus();
    });

    formulier.addEventListener('submit', async e => {
        e.preventDefault();
        if (knop.disabled) return;
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
        if (!client) { meldFout(null); return; }

        const adresLezer = email.value.trim();
        $('in-fout').hidden = true;
        knop.disabled = true;
        knop.setAttribute('aria-busy', 'true');
        try {
            if (manier() === 'link') {
                await stuurLink(adresLezer);
                opnieuw = () => stuurLink(adresLezer);
                toonVerstuurd(adresLezer);
            } else if (isAccount) {
                await maakAccountMetWachtwoord(adresLezer);
            } else {
                await logInMetWachtwoord(adresLezer);
            }
        } catch (fout) {
            meldFout(fout);
        } finally {
            knop.disabled = false;
            knop.removeAttribute('aria-busy');
        }
    });

    $('in-opnieuw').addEventListener('click', async () => {
        // In het voorbeeld (?staat=verstuurd) is er niets om opnieuw te sturen.
        if (!opnieuw) { window.showNotification(t('v5_in_opnieuw_gestuurd')); return; }
        try {
            const resultaat = await opnieuw();
            if (resultaat?.error && moetMelden(resultaat.error)) throw resultaat.error;
            window.showNotification(t('v5_in_opnieuw_gestuurd'));
            B.wachtKnop($('in-opnieuw'), WACHTTIJD);
        } catch (fout) {
            meldFout(fout);
        }
    });

    B.start(teken);

    // Bij ?staat=fout gaat de focus naar de melding, zoals bij een echte fout.
    if (staat === 'fout' && !isAccount) $('in-fout').focus();
})();
