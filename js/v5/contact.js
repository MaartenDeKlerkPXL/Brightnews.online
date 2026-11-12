// Contact, redesign v5 (Figma: Contact · Desktop — Leeg, Fout: velden
// ontbreken, en Verstuurd).
//
// Kort formulier: naam (niet verplicht), e-mailadres, onderwerp en bericht
// met een teller tot 2000 tekens. De controle gebeurt pas bij versturen, niet
// tijdens het typen: een Field error onder elk fout veld, aria-invalid, en de
// focus naar het eerste foute veld. Is een veld eenmaal fout, dan verdwijnt
// de melding zodra het klopt.
//
// Versturen (TODO 66 punt 13): een insert in de Supabase-tabel
// contactberichten (alleen insert-rechten; lezen doet het team in het
// dashboard). De database controleert de velden nog een keer en houdt een
// limiet per IP bij (supabase/formulieren-2026-11-12.sql). Is het verborgen
// veld `website` ingevuld, dan is het een bot: de pagina doet alsof het
// gelukt is en verstuurt niets. Om de staten te bekijken (er gaat dan niets
// weg):
//   ?staat=fout        een onvolledig adres en een leeg bericht
//   ?staat=verstuurd   de bevestiging (met ?email= het adres in de tekst)

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const MAX = 2000;
    const MIN_BERICHT = 10;
    // Iets vóór en na de @, en een punt in het domein (zoals inloggen).
    const VOLLEDIG = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

    const $ = id => document.getElementById(id);
    const formulier = $('ct-formulier');
    const email = $('ct-email');
    const onderwerp = $('ct-onderwerp');
    const bericht = $('ct-bericht');

    // Elk veld met zijn foutmelding en zijn controle.
    const velden = [
        { veld: email, fout: $('ct-email-fout'), goed: () => VOLLEDIG.test(email.value.trim()) },
        { veld: onderwerp, fout: $('ct-onderwerp-fout'), goed: () => onderwerp.value !== '' },
        { veld: bericht, fout: $('ct-bericht-fout'), goed: () => [...bericht.value.trim()].length >= MIN_BERICHT, hulp: 'ct-teller' },
    ];

    function veldFout({ veld, fout, hulp }, aan) {
        fout.hidden = !aan;
        if (aan) veld.setAttribute('aria-invalid', 'true');
        else veld.removeAttribute('aria-invalid');
        const beschrijving = [hulp, aan && fout.id].filter(Boolean).join(' ');
        if (beschrijving) veld.setAttribute('aria-describedby', beschrijving);
        else veld.removeAttribute('aria-describedby');
    }

    function teller() {
        const n = bericht.value.length;
        const regel = $('ct-teller');
        regel.textContent = t('v5_teller', { x: n, n: MAX });
        regel.classList.toggle('invoer__teller--vol', n >= MAX);
    }

    let antwoordNaar = '';

    function verstuurd(adres) {
        antwoordNaar = adres;
        $('ct-antwoord-naar').textContent = t('v5_ct_bedankt_tekst', { email: adres });
        formulier.hidden = true;
        const kaart = $('ct-verstuurd');
        kaart.hidden = false;
        return kaart;
    }

    function teken() {
        document.title = `${t('schil_contact')} · BrightNews`;
        $('ct-naam').placeholder = t('v5_ct_naam_vb');
        email.placeholder = t('v5_in_email_voorbeeld');
        bericht.placeholder = t('v5_ct_bericht_vb');
        teller();

        $('ct-privacy').replaceChildren(B.zinMetDelen('v5_ct_privacy', { privacy: B.link(B.url.privacy(), null, t('v5_in_privacy')) }));
        const naar = { home: B.url.home(), feedback: B.url.feedback(), account: B.url.account(), inloggen: B.url.inloggen() };
        document.querySelectorAll('#inhoud [data-naar]').forEach(a => { a.href = B.metTestdag(naar[a.dataset.naar]); });
        if (antwoordNaar) $('ct-antwoord-naar').textContent = t('v5_ct_bedankt_tekst', { email: antwoordNaar });
    }

    // ── Gedrag ───────────────────────────────────────────────────────────

    const knop = formulier.querySelector('button[type="submit"]');

    // De database meldt te_vaak (deze lezer) of te_vaak_totaal (iedereen
    // samen); bij dat laatste noemt de melding het mailadres.
    function formulierFout(fout) {
        const tekst = fout?.message || '';
        if (tekst.includes('te_vaak_totaal')) return 'v5_form_te_druk';
        if (tekst.includes('te_vaak')) return 'v5_form_te_vaak';
        return 'v5_in_fout_algemeen';
    }

    formulier.addEventListener('submit', async e => {
        e.preventDefault();
        if (knop.getAttribute('aria-disabled') === 'true') return;
        const fout = velden.filter(v => !v.goed());
        velden.forEach(v => veldFout(v, fout.includes(v)));
        if (fout.length) { fout[0].veld.focus(); return; }

        const adres = email.value.trim();
        const client = window.supabaseClient;
        if ($('ct-website').value || B.param('staat')) { verstuurd(adres).focus(); return; }
        if (!client) { window.showNotification(t('v5_in_fout_algemeen'), 'error'); return; }

        // aria-disabled in plaats van disabled: zo houdt de knop de focus.
        knop.setAttribute('aria-disabled', 'true');
        knop.setAttribute('aria-busy', 'true');
        try {
            const { error } = await client.from('contactberichten').insert({
                naam: $('ct-naam').value.trim().slice(0, 100) || null,
                email: adres,
                onderwerp: onderwerp.value,
                bericht: bericht.value.trim(),
                taal: B.taal(),
            });
            if (error) throw error;
            verstuurd(adres).focus();
        } catch (fout) {
            console.warn('BrightNews v5: contactbericht', fout);
            window.showNotification(t(formulierFout(fout)), 'error');
        } finally {
            knop.removeAttribute('aria-disabled');
            knop.removeAttribute('aria-busy');
        }
    });

    velden.forEach(v => {
        const event = v.veld.tagName === 'SELECT' ? 'change' : 'input';
        v.veld.addEventListener(event, () => {
            if (v.veld.hasAttribute('aria-invalid') && v.goed()) veldFout(v, false);
        });
    });

    bericht.addEventListener('input', teller);

    $('ct-nog-een').addEventListener('click', () => {
        formulier.reset();
        velden.forEach(v => veldFout(v, false));
        teller();
        $('ct-verstuurd').hidden = true;
        formulier.hidden = false;
        $('ct-naam').focus();
    });

    // ── Staten om te bekijken ────────────────────────────────────────────

    // ?onderwerp= kiest het onderwerp vooraf (Account verwijderen in Mijn account).
    const voorkeur = B.param('onderwerp');
    if (voorkeur && [...onderwerp.options].some(o => o.value === voorkeur && !o.disabled)) onderwerp.value = voorkeur;

    const staat = B.param('staat');
    if (staat === 'fout') {
        $('ct-naam').value = 'Jan';
        email.value = 'jan@voorbeeld';
        onderwerp.value = 'idee';
        velden.forEach(v => veldFout(v, !v.goed()));
    } else if (staat === 'verstuurd') {
        verstuurd(B.param('email') || 'jan@voorbeeld.nl');
    }

    B.start(teken);
})();
