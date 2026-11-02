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
//
// Daarnaast de cookiebalk (onderaan partials/v5/footer.html). Zelfde sleutel
// als de live site, zodat een keuze op beide geldt:
//   brightNews_cookies        'accepted' (statistieken aan) | 'essential'
//   brightNews_cookies_datum  dag van de keuze; na 12 maanden vragen we opnieuw

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
        document.querySelectorAll('.navbar__links .nav-link[href], .mobiel-menu .menu-link[href]').forEach(link => {
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

    // Twee knoppen openen hetzelfde paneel: Instellingen op desktop en Menu
    // onder 1024 px (dan staan navigatie en account bovenin het paneel).
    // Er is er altijd maar één zichtbaar.
    function koppelPaneel() {
        const knoppen = Array.from(document.querySelectorAll('.settings-trigger, .menu-knop'));
        const paneel = knoppen[0] && document.getElementById(knoppen[0].getAttribute('aria-controls'));
        if (!paneel) return;
        const zichtbareKnop = () => knoppen.find(k => k.offsetParent !== null) || knoppen[0];
        const isOpen = () => paneel.classList.contains('is-open');

        function open(knop) {
            paneel.inert = false;
            paneel.classList.add('is-open');
            knoppen.forEach(k => k.setAttribute('aria-expanded', 'true'));
            // Menu: naar de eerste link. Instellingen: naar de gekozen weergave.
            const eerste = knop.classList.contains('menu-knop')
                ? paneel.querySelector('.menu-link[href]')
                : paneel.querySelector('[role="radio"][aria-checked="true"]');
            if (eerste) eerste.focus({ preventScroll: true });
        }

        function sluit(focusTerug) {
            paneel.classList.remove('is-open');
            paneel.inert = true;
            knoppen.forEach(k => k.setAttribute('aria-expanded', 'false'));
            if (focusTerug) zichtbareKnop().focus();
        }

        knoppen.forEach(knop => knop.addEventListener('click', () => {
            if (isOpen()) sluit(false);
            else open(knop);
        }));

        paneel.querySelector('[data-sluit-instellingen]')?.addEventListener('click', () => sluit(true));

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || !isOpen()) return;
            const binnen = paneel.contains(document.activeElement) || knoppen.includes(document.activeElement);
            sluit(binnen);
        });
    }

    // ── Cookiebalk ───────────────────────────────────────────────────────

    const COOKIE_SLEUTEL = 'brightNews_cookies';
    const COOKIE_DATUM = 'brightNews_cookies_datum';
    const COOKIE_GELDIG_DAGEN = 365;

    function cookieKeuze() {
        const keuze = lees(COOKIE_SLEUTEL);
        if (keuze !== 'accepted' && keuze !== 'essential') return null;
        // Een keuze van de live site heeft (nog) geen datum: die geldt.
        const datum = Date.parse(lees(COOKIE_DATUM) || '');
        if (datum && Date.now() - datum > COOKIE_GELDIG_DAGEN * 864e5) return null;
        return keuze;
    }

    // Statistieken (Google Analytics) laden kan pas als de CSP van de
    // v5-pagina's Google toestaat; dat gebeurt bij de lancering (TODO punt
    // 66). Tot dan meldt de balk de keuze alleen als gebeurtenis.
    function bewaarCookies(keuze) {
        schrijf(COOKIE_SLEUTEL, keuze);
        schrijf(COOKIE_DATUM, new Date().toISOString().slice(0, 10));
        document.dispatchEvent(new CustomEvent('bn:cookies', { detail: { statistieken: keuze === 'accepted' } }));
    }

    function koppelCookiebalk() {
        const balk = document.getElementById('cookiebalk');
        if (!balk) return;
        const statistieken = document.getElementById('cookie-statistieken');
        const knoppen = [...balk.querySelectorAll('[data-cookie="instellingen"]')];

        // De balk ligt over de onderkant van de pagina; zoveel ruimte houdt
        // de pagina eronder vrij, zodat de footer leesbaar blijft.
        const ruimte = new ResizeObserver(() => {
            document.body.style.paddingBottom = balk.hidden ? '' : `${balk.offsetHeight}px`;
        });
        ruimte.observe(balk);

        function weergave(welke) {
            balk.dataset.weergave = welke;
            knoppen.forEach(k => k.setAttribute('aria-expanded', String(welke === 'instellingen')));
        }

        function open(welke) {
            statistieken.checked = cookieKeuze() === 'accepted';
            weergave(welke);
            balk.hidden = false;
            document.body.style.paddingBottom = `${balk.offsetHeight}px`;
        }

        function sluit(keuze) {
            bewaarCookies(keuze);
            const hadFocus = balk.contains(document.activeElement);
            balk.hidden = true;
            document.body.style.paddingBottom = '';
            // De focus niet laten verdwijnen met de balk.
            if (hadFocus) {
                const main = document.getElementById('inhoud');
                if (main) {
                    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
                    main.focus({ preventScroll: true });
                }
            }
        }

        balk.addEventListener('click', e => {
            const knop = e.target.closest('[data-cookie]');
            if (!knop) return;
            const actie = knop.dataset.cookie;
            if (actie === 'instellingen') {
                weergave('instellingen');
                statistieken.focus();
            } else if (actie === 'noodzakelijk') {
                sluit('essential');
            } else if (actie === 'opslaan') {
                sluit(statistieken.checked ? 'accepted' : 'essential');
            } else if (actie === 'alles') {
                sluit('accepted');
            }
        });

        // Opnieuw openen: "Cookie-instellingen" in de footer en "Cookie-
        // instellingen aanpassen" in de privacyverklaring (ook als die later
        // in de pagina komt).
        document.addEventListener('click', e => {
            if (!e.target.closest('[data-cookie-instellingen]')) return;
            open('instellingen');
            statistieken.focus();
        });

        if (!cookieKeuze()) open('balk');
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
        koppelCookiebalk();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
