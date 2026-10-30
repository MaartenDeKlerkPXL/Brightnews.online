// Gedrag van de v5-schil: de huidige pagina in het menu, en het
// instellingenpaneel onder de header (weergave en taal).
//
// Het paneel duwt de pagina omlaag; het is geen overlay. Openen met de knop
// Instellingen, sluiten met Sluiten, Esc of de knop zelf. De keuzes zijn
// radiogroepen: klikken of de pijltjestoetsen kiezen meteen. Dezelfde
// radiogroepen kunnen ook in de pagina staan (Mijn account); alle groepen
// met hetzelfde data-instelling lopen gelijk.
//
// Opslag in localStorage, met dezelfde sleutels als de rest van de site:
//   bn-thema          'licht' | 'donker' (afwezig = systeem volgen)
//   selectedLanguage  'nl' | 'en' | 'de' | 'fr' | 'es'
// partials/thema-head.html leest bn-thema al vóór de eerste weergave.

(function () {
    'use strict';

    const THEMA_SLEUTEL = 'bn-thema';
    const TAAL_SLEUTEL = 'selectedLanguage';

    function lees(sleutel) {
        try { return localStorage.getItem(sleutel); } catch { return null; }
    }

    function schrijf(sleutel, waarde) {
        try {
            if (waarde === null) localStorage.removeItem(sleutel);
            else localStorage.setItem(sleutel, waarde);
        } catch { /* geen opslag: de keuze geldt alleen voor deze pagina */ }
    }

    // ── Huidige pagina ───────────────────────────────────────────────────

    // Een pagina die bij een menu-item hoort zonder zelf in het menu te
    // staan (een editie hoort bij Archief, een artikel bij Nieuws), zegt dat
    // met <body data-sectie="archief">. Links zonder href (pagina nog niet
    // gebouwd) slaan we over.
    function markeerHuidigePagina() {
        const pad = window.location.pathname.replace(/\/index\.html$/, '/');
        const sectie = document.body.dataset.sectie;
        document.querySelectorAll('.navbar__links .nav-link[href]').forEach(link => {
            const doel = new URL(link.href).pathname.replace(/\/index\.html$/, '/');
            if (doel === pad || (sectie && link.dataset.sectie === sectie)) link.setAttribute('aria-current', 'page');
        });
    }

    // ── Keuzes ───────────────────────────────────────────────────────────

    function pasThemaToe(waarde) {
        if (waarde === 'licht' || waarde === 'donker') {
            document.documentElement.setAttribute('data-theme', waarde);
            schrijf(THEMA_SLEUTEL, waarde);
        } else {
            document.documentElement.removeAttribute('data-theme');
            schrijf(THEMA_SLEUTEL, null);
        }
    }

    function pasTaalToe(taal) {
        schrijf(TAAL_SLEUTEL, taal);
        // Op de huidige pagina's vertaalt index.js; die kent ook de
        // taalvarianten van statische artikelen.
        if (typeof window.wisselTaal === 'function') {
            window.wisselTaal(taal);
            return;
        }
        // Zonder index.js (zoals op de stijlgids): alleen de schil vertalen,
        // met dezelfde innerHTML-regel als index.js, als data/translations.js
        // geladen is.
        document.documentElement.lang = taal;
        const T = window.translations && (window.translations[taal] || window.translations.en);
        if (T) {
            document.querySelectorAll('.site-header [data-i18n], .site-footer [data-i18n]').forEach(el => {
                if (T[el.dataset.i18n]) el.innerHTML = T[el.dataset.i18n];
            });
            document.querySelectorAll('.site-header [data-i18n-aria-label], .site-footer [data-i18n-aria-label]').forEach(el => {
                if (T[el.dataset.i18nAriaLabel]) el.setAttribute('aria-label', T[el.dataset.i18nAriaLabel]);
            });
        }
        zetJaartal();
    }

    // Het jaartal in de copyrightregel staat vast in de vertaling; zet het
    // op het huidige jaar.
    function zetJaartal() {
        const regel = document.querySelector('[data-i18n="schil_copyright"]');
        if (regel) regel.textContent = regel.textContent.replace(/\b20\d\d\b/, String(new Date().getFullYear()));
    }

    const TOEPASSEN = { thema: pasThemaToe, taal: pasTaalToe };

    function kies(groep, optie, metFocus) {
        groep.querySelectorAll('[role="radio"]').forEach(o => {
            const gekozen = o === optie;
            o.setAttribute('aria-checked', String(gekozen));
            o.tabIndex = gekozen ? 0 : -1;
        });
        if (metFocus) optie.focus();
    }

    // Na een keuze in de ene groep tonen de andere groepen van dezelfde
    // soort (paneel en pagina) dezelfde keuze.
    function volgAndere(groep, waarde) {
        document.querySelectorAll(`[role="radiogroup"][data-instelling="${groep.dataset.instelling}"]`).forEach(ander => {
            const optie = ander !== groep && ander.querySelector(`[data-waarde="${waarde}"]`);
            if (optie) kies(ander, optie, false);
        });
    }

    function zetBeginstand(groep) {
        const soort = groep.dataset.instelling;
        let waarde;
        if (soort === 'thema') waarde = lees(THEMA_SLEUTEL) || 'systeem';
        if (soort === 'taal') waarde = lees(TAAL_SLEUTEL) || document.documentElement.lang || 'nl';
        const optie = groep.querySelector(`[data-waarde="${waarde}"]`) || groep.querySelector('[role="radio"]');
        kies(groep, optie, false);
    }

    function koppelGroep(groep) {
        const toepassen = TOEPASSEN[groep.dataset.instelling];
        const opties = () => Array.from(groep.querySelectorAll('[role="radio"]'));

        zetBeginstand(groep);

        groep.addEventListener('click', e => {
            const optie = e.target.closest('[role="radio"]');
            if (!optie || optie.getAttribute('aria-checked') === 'true') return;
            kies(groep, optie, false);
            volgAndere(groep, optie.dataset.waarde);
            toepassen(optie.dataset.waarde);
        });

        // Pijltjes, Home en End. Bij weergave kiest dat meteen (zoals een
        // gewone radiogroep). Bij taal alleen de focus verplaatsen: een
        // taalwissel kan naar een andere pagina gaan (taalvariant van een
        // artikel), dus die kies je met Enter, spatie of een klik.
        const kiestMeteen = groep.dataset.instelling !== 'taal';

        groep.addEventListener('keydown', e => {
            const lijst = opties();
            const nu = lijst.indexOf(document.activeElement);
            const stap = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            let volgende;
            if (stap) volgende = lijst[(nu + stap + lijst.length) % lijst.length];
            else if (e.key === 'Home') volgende = lijst[0];
            else if (e.key === 'End') volgende = lijst[lijst.length - 1];
            else return;
            e.preventDefault();
            if (kiestMeteen) {
                kies(groep, volgende, true);
                volgAndere(groep, volgende.dataset.waarde);
                toepassen(volgende.dataset.waarde);
            } else {
                lijst.forEach(o => { o.tabIndex = o === volgende ? 0 : -1; });
                volgende.focus();
            }
        });
    }

    // ── Paneel ───────────────────────────────────────────────────────────

    function koppelPaneel() {
        const knop = document.querySelector('.settings-trigger');
        const paneel = knop && document.getElementById(knop.getAttribute('aria-controls'));
        if (!paneel) return;

        function open() {
            paneel.inert = false;
            paneel.classList.add('is-open');
            knop.setAttribute('aria-expanded', 'true');
            const eerste = paneel.querySelector('[role="radio"][aria-checked="true"]');
            if (eerste) eerste.focus({ preventScroll: true });
        }

        function sluit(focusTerug) {
            paneel.classList.remove('is-open');
            paneel.inert = true;
            knop.setAttribute('aria-expanded', 'false');
            if (focusTerug) knop.focus();
        }

        knop.addEventListener('click', () => {
            if (knop.getAttribute('aria-expanded') === 'true') sluit(false);
            else open();
        });

        paneel.querySelector('[data-sluit-instellingen]')?.addEventListener('click', () => sluit(true));

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || knop.getAttribute('aria-expanded') !== 'true') return;
            const binnen = paneel.contains(document.activeElement) || document.activeElement === knop;
            sluit(binnen);
        });
    }

    function start() {
        markeerHuidigePagina();
        zetJaartal();
        // Zonder index.js zet niemand anders de bewaarde taal bij het laden.
        const taal = lees(TAAL_SLEUTEL);
        if (taal && typeof window.wisselTaal !== 'function' && taal !== document.documentElement.lang) {
            pasTaalToe(taal);
        }
        koppelPaneel();
        document.querySelectorAll('[role="radiogroup"][data-instelling]').forEach(koppelGroep);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
