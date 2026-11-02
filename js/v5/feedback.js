// Feedback, redesign v5 (Figma: Feedback · Desktop — Leeg vanuit een
// artikel, Fout: geen keuze, en Verstuurd).
//
// Snel en mag anoniem: een keuze, een korte toelichting, en een e-mailadres
// alleen als je antwoord wilt. Contact is voor vragen met een antwoord.
//   ?artikel=<id>  de kaart toont onderwerp en titel, bovenaan "Terug naar
//                  het artikel", en de keuzes passen bij een artikel.
//   zonder         (vanuit de footer) geen artikelvak en geen terugknop;
//                  de keuzes zijn fout in een artikel, idee, iets anders.
// Alleen de keuze is verplicht; "Iets anders" maakt de toelichting verplicht.
// Een ingevuld e-mailadres moet wel volledig zijn. De controle gebeurt bij
// versturen, met de focus naar het eerste foute veld (bij de keuze: de
// eerste radio).
//
// Versturen is nog niet gekoppeld (TODO punt 66: Supabase-tabel met
// artikel-id, keuze, tekst en taal; honeypot en limiet per IP). Tot dan toont
// de pagina na de controle de bevestiging. Om de staten te bekijken:
//   ?staat=fout        geen keuze gemaakt
//   ?staat=verstuurd   de bevestiging (zonder e-mailadres)

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const MAX = 1000;
    const MIN_TOELICHTING = 10;
    const VOLLEDIG = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
    const KEUZES_ARTIKEL = ['v5_fb_k_samenvatting', 'v5_fb_k_bron', 'v5_fb_k_geen_goed', 'v5_fb_k_anders'];
    const KEUZES_ALGEMEEN = ['v5_fb_k_fout_artikel', 'v5_fb_k_idee', 'v5_fb_k_anders'];
    const ANDERS = 'v5_fb_k_anders';

    const $ = id => document.getElementById(id);
    const formulier = $('fb-formulier');
    const toelichting = $('fb-toelichting');
    const email = $('fb-email');
    const artikelId = B.param('artikel');
    let artikel = null;
    let verstuurdMet = null;

    function veldFout(veld, melding, aan, hulp) {
        melding.hidden = !aan;
        if (aan) veld.setAttribute('aria-invalid', 'true');
        else veld.removeAttribute('aria-invalid');
        const beschrijving = [hulp, aan && melding.id].filter(Boolean).join(' ');
        if (beschrijving) veld.setAttribute('aria-describedby', beschrijving);
        else veld.removeAttribute('aria-describedby');
    }

    const gekozen = () => formulier.querySelector('input[name="keuze"]:checked');
    const andersGekozen = () => gekozen() && gekozen().value === ANDERS;

    // De radio's, één keer gebouwd; bij een andere taal alleen de labels.
    function bouwKeuzes() {
        const veld = $('fb-keuzes');
        const fout = $('fb-keuze-fout');
        (artikel ? KEUZES_ARTIKEL : KEUZES_ALGEMEEN).forEach((sleutel, i) => {
            const label = el('label', 'radio');
            const radio = el('input');
            radio.type = 'radio';
            radio.name = 'keuze';
            radio.value = sleutel;
            radio.id = `fb-keuze-${i}`;
            label.append(radio, el('span', null, t(sleutel)));
            veld.insertBefore(label, fout);
        });
    }

    function teller() {
        const n = toelichting.value.length;
        $('fb-teller').textContent = t('v5_teller', { x: n, n: MAX });
        $('fb-teller').classList.toggle('invoer__teller--vol', n >= MAX);
    }

    // "Iets anders" maakt de toelichting verplicht: het label verliest dan
    // "(niet verplicht)".
    function verplichting() {
        const verplicht = andersGekozen();
        $('fb-optioneel').hidden = verplicht;
        toelichting.required = verplicht;
        if (!verplicht) veldFout(toelichting, $('fb-toelichting-fout'), false, 'fb-teller');
    }

    function samenvatting() {
        if (!verstuurdMet) return;
        const regels = [t('v5_fb_je_melding', { keuze: t(verstuurdMet.keuze) })];
        regels.push(verstuurdMet.email ? t('v5_fb_wel_antwoord', { email: verstuurdMet.email }) : t('v5_fb_geen_antwoord'));
        $('fb-samenvatting').textContent = regels.join(' ');
    }

    function verstuurd(keuze, adres) {
        verstuurdMet = { keuze, email: adres };
        samenvatting();
        $('fb-formulierstaat').hidden = true;
        $('fb-verstuurdstaat').hidden = false;
        document.title = `${t('v5_fb_bedankt_h1')} · BrightNews`;
    }

    function teken() {
        if (!verstuurdMet) document.title = `${t('v5_fb_h1')} · BrightNews`;
        email.placeholder = t('v5_in_email_voorbeeld');
        toelichting.placeholder = t(artikel ? 'v5_fb_toelichting_vb' : 'v5_fb_toelichting_vb_algemeen');
        formulier.querySelectorAll('input[name="keuze"]').forEach(r => { r.nextElementSibling.textContent = t(r.value); });
        teller();
        samenvatting();
        $('fb-bedankt-lead').textContent = t(artikel ? 'v5_fb_bedankt_lead' : 'v5_fb_bedankt_lead_algemeen');
        $('fb-naar-vandaag').href = B.metTestdag(B.url.home());

        if (artikel) {
            const terug = B.metTestdag(B.url.artikel(artikel.id));
            [$('fb-terug'), $('fb-terug-artikel')].forEach(a => { a.href = terug; a.hidden = false; });
            const cat = B.categorieLabel(artikel.category);
            document.querySelectorAll('[data-artikel]').forEach(vak => {
                vak.hidden = false;
                vak.querySelector('.over-artikel__label').textContent = cat ? t('v5_fb_over', { cat }) : t('v5_fb_over_kaal');
                vak.querySelector('.over-artikel__titel').textContent = artikel.title;
            });
        }
    }

    // ── Gedrag ───────────────────────────────────────────────────────────

    function koppel() {
        formulier.addEventListener('submit', e => {
            e.preventDefault();
            const keuzeFout = !gekozen();
            const toelichtingFout = andersGekozen() && toelichting.value.trim().length < MIN_TOELICHTING;
            const emailFout = email.value.trim() !== '' && !VOLLEDIG.test(email.value.trim());

            const eersteRadio = formulier.querySelector('input[name="keuze"]');
            $('fb-keuze-fout').hidden = !keuzeFout;
            if (keuzeFout) $('fb-keuzes').setAttribute('aria-describedby', 'fb-keuze-fout');
            else $('fb-keuzes').removeAttribute('aria-describedby');
            veldFout(toelichting, $('fb-toelichting-fout'), toelichtingFout, 'fb-teller');
            veldFout(email, $('fb-email-fout'), emailFout, 'fb-email-hulp');

            if (keuzeFout) { eersteRadio.focus(); return; }
            if (toelichtingFout) { toelichting.focus(); return; }
            if (emailFout) { email.focus(); return; }
            verstuurd(gekozen().value, email.value.trim());
            $('fb-bedankt-kop').focus();
        });

        $('fb-keuzes').addEventListener('change', () => {
            $('fb-keuze-fout').hidden = true;
            $('fb-keuzes').removeAttribute('aria-describedby');
            verplichting();
        });

        toelichting.addEventListener('input', () => {
            teller();
            if (toelichting.hasAttribute('aria-invalid') && toelichting.value.trim().length >= MIN_TOELICHTING) {
                veldFout(toelichting, $('fb-toelichting-fout'), false, 'fb-teller');
            }
        });

        email.addEventListener('input', () => {
            if (email.hasAttribute('aria-invalid') && (email.value.trim() === '' || VOLLEDIG.test(email.value.trim()))) {
                veldFout(email, $('fb-email-fout'), false, 'fb-email-hulp');
            }
        });
    }

    // Het artikel komt uit de feed. Staat het er niet (meer) in, dan gaat de
    // pagina verder zonder artikel.
    async function laadArtikel() {
        if (!artikelId) return;
        try {
            const feed = await B.laadFeed();
            artikel = feed.find(a => String(a.id) === artikelId) || null;
        } catch {
            artikel = null;
        }
    }

    // Eén keer: artikel laden, keuzes bouwen, gedrag koppelen en de staat
    // kiezen. Daarna tekent teken() bij elke taal de teksten opnieuw.
    const klaar = laadArtikel().then(() => {
        bouwKeuzes();
        koppel();
        const staat = B.param('staat');
        if (staat === 'fout') {
            $('fb-keuze-fout').hidden = false;
            $('fb-keuzes').setAttribute('aria-describedby', 'fb-keuze-fout');
        } else if (staat === 'verstuurd') {
            verstuurd(artikel ? KEUZES_ARTIKEL[0] : KEUZES_ALGEMEEN[1], '');
        }
    });

    B.start(async () => {
        await klaar;
        teken();
    });
})();
