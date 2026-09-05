// 1. Globale variabelen initialiseren (voorkomt 'undefined' errors)
window.huidigeTaal = localStorage.getItem('selectedLanguage') || 'nl';

// Labels voor de taalkiezer. De vlag zit in een eigen span zodat hij op
// smalle schermen via CSS (.taal-vlag) verborgen kan worden.
const TAAL_LABELS = {
    'nl': '<span class="taal-vlag">🇳🇱</span> Nederlands',
    'en': '<span class="taal-vlag">🇺🇸</span> English',
    'de': '<span class="taal-vlag">🇩🇪</span> Deutsch',
    'fr': '<span class="taal-vlag">🇫🇷</span> Français',
    'es': '<span class="taal-vlag">🇪🇸</span> Español',
};
window.alleArtikelen = [];
window.actieveFilters = [];

function getT(key, fallback = "...") {
    const lang = window.huidigeTaal || localStorage.getItem('selectedLanguage') || 'nl';

    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
        return window.translations[lang][key];
    }

    if (window.appIsGeladen) {
        console.warn(`BrightNews: Key '${key}' niet gevonden in taal '${lang}'`);
    }
    return fallback;
}

// HOUD IN SYNC met maakSlug() in backend/generate-articles.js: beide moeten
// voor dezelfde titel exact dezelfde slug opleveren (deelknoppen berekenen
// hiermee de URL van de statische artikelpagina).
function maakArtikelSlug(titel) {
    return String(titel).toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'artikel';
}

// Deel-URL voor een artikel: de statische pagina zodra die bestaat (beter
// voor previews/SEO), anders de oude ?id=-vorm (racecondition vlak na
// publicatie: de statische pagina wordt pas bij de volgende Action-run
// gegenereerd). Bestaande ?id=-links blijven sowieso gewoon werken.
async function bepaalDeelUrl(artikel, refCode) {
    const fallback = `${window.location.origin}${window.location.pathname}?ref=${refCode}&id=${artikel.id}`;
    try {
        const slug = maakArtikelSlug(artikel.title);
        const staticPad = `/articles/${window.huidigeTaal}/${slug}-${artikel.id}.html`;
        const res = await fetch(staticPad, { method: 'HEAD' });
        if (res.ok) return `${window.location.origin}${staticPad}?ref=${refCode}`;
    } catch {
        // netwerk/404 — val terug op de ?id=-vorm
    }
    return fallback;
}

// Vervangt het jaartal in de footer door het huidige jaar, ongeacht welke taal
// er net vertaald is. Idempotent (mag vaker draaien zonder schade).
function updateFooterYear() {
    const jaar = new Date().getFullYear();
    document.querySelectorAll('[data-i18n="footer_created_by"]').forEach(el => {
        el.innerHTML = el.innerHTML.replace(/\b(19|20)\d{2}\b/, jaar);
    });
}

function vertaalStatischeTeksten(lang) {
    const uitvoeren = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            let key = el.getAttribute('data-i18n');
            const vertaling = getT(key);
            if (vertaling !== "...") {
                el.innerHTML = vertaling;
            }
        });
        // Attribuut-varianten: vertaal placeholder- en aria-label-attributen
        // (innerHTML zou hier de verkeerde plek raken).
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const vertaling = getT(el.getAttribute('data-i18n-placeholder'));
            if (vertaling !== "...") el.setAttribute('placeholder', vertaling);
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const vertaling = getT(el.getAttribute('data-i18n-aria-label'));
            if (vertaling !== "...") el.setAttribute('aria-label', vertaling);
        });
        updateFooterYear();
    };

    uitvoeren();
    // Voer het na 200ms nog een keer uit voor elementen die door Supabase (auth.js) later zijn toegevoegd
    setTimeout(uitvoeren, 200);
}

// Footer-link "Abonnement beheren": werkt op elke pagina onafhankelijk van
// profiel.html, want die haalt de portal-URL zelf op i.p.v. te leunen op
// een pagina-specifieke variabele.
window.openCustomerPortal = async function (event) {
    if (event) event.preventDefault();
    if (!window.supabaseClient) {
        window.location.href = '/profiel.html';
        return;
    }
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = '/profiel.html';
            return;
        }
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('customer_portal_url')
            .eq('id', session.user.id)
            .maybeSingle();

        if (profile?.customer_portal_url) {
            window.open(profile.customer_portal_url, '_blank');
        } else if (window.BETAAL_CONFIG?.provider === 'stripe' && window.BETAAL_CONFIG.stripe.klantportaal) {
            // Stripe: no-code Customer Portal-loginpagina (vraagt om het
            // e-mailadres en mailt een beveiligde inloglink).
            window.open(window.BETAAL_CONFIG.stripe.klantportaal, '_blank');
        } else {
            window.location.href = '/profiel.html';
        }
    } catch (e) {
        console.error('Kon klantportaal niet openen:', e.message);
        window.location.href = '/profiel.html';
    }
};
// 4. De enige echte Initialisatie functie
async function initApp() {
    const savedLang = localStorage.getItem('selectedLanguage') || 'nl';

    // Wacht op het woordenboek
    if (!window.translations || !window.translations[savedLang]) {
        setTimeout(initApp, 100);
        return;
    }

    if (window.appIsGeladen) return;
    window.appIsGeladen = true;

    console.log("BrightNews initialiseren... 🛠️");

    window.huidigeTaal = savedLang;
    document.documentElement.lang = savedLang;

    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref && ref !== 'gast') {
        localStorage.setItem('bright_referrer', ref);
        console.log("Referrer opgeslagen:", ref);
    }

    // Update taalkiezer label
    const btn = document.getElementById('current-lang');
    if (btn) btn.innerHTML = `${TAAL_LABELS[savedLang] || TAAL_LABELS['nl']} <span class="arrow">▼</span>`;

    vertaalStatischeTeksten(savedLang);
    if (typeof checkCookies === 'function') checkCookies();

    await laadNieuws(savedLang);
    upgradeStaticArticle();
}

// Statische artikelpagina's (articles/{taal}/…): waardeer de servertekst
// client-side op. Premium-lezers krijgen de volledige tekst via
// get_full_article(); voor pre-Fase-1.4-artikelen (geen rij in articles_full)
// valt dit terug op de volledige summary uit de nieuws-JSON. Zet ook de
// deelknoppen en de juiste paywall-CTA.
async function upgradeStaticArticle() {
    const host = document.querySelector('[data-static-article]');
    if (!host) return;
    const id = host.getAttribute('data-article-id');
    const lang = host.getAttribute('data-article-lang');

    // Deelknoppen werken voor iedereen, ook zonder login.
    const currentUser = (await window.supabaseClient?.auth.getUser())?.data?.user;
    const refCode = currentUser ? currentUser.id : 'gast';
    window.currentArticleUrl = `${window.location.origin}${window.location.pathname}?ref=${refCode}`;
    updateShareLinks(document.title, window.currentArticleUrl);

    const userStatus = await checkUser();

    if (userStatus.ingelogd && !userStatus.premium) {
        // Ingelogd maar geen premium: CTA "upgrade" i.p.v. "log in".
        const cta = host.querySelector('.paywall-overlay button');
        if (cta) {
            cta.setAttribute('data-i18n', 'btn_upgrade_now');
            cta.textContent = getT('btn_upgrade_now');
        }
    }
    if (!userStatus.premium) return;

    let volledigeTekst = null;
    try {
        const { data, error } = await window.supabaseClient
            .rpc('get_full_article', { p_id: String(id), p_lang: lang });
        if (!error && data) volledigeTekst = data;
    } catch (e) {
        console.error('Kon volledig artikel niet ophalen:', e.message);
    }
    if (!volledigeTekst && window.huidigeTaal === lang) {
        // Pre-Fase-1.4-artikel: de volledige tekst staat (zolang het artikel
        // in de actuele lijst zit) nog als summary in de nieuws-JSON.
        const artikel = (window.alleArtikelen || []).find(a => String(a.id) === String(id));
        if (artikel?.summary && !artikel.summary.trim().endsWith('...') && artikel.summary.split(' ').length > 60) {
            volledigeTekst = artikel.summary;
        }
    }
    if (!volledigeTekst) return;

    const bodyEl = host.querySelector('[data-role="body"]');
    if (!bodyEl) return;
    // Dagoverzicht-pagina's hebben een bronnenlijst in de body; die moet de
    // premium-upgrade overleven (de [n]-verwijzingen slaan erop terug).
    const refsEl = bodyEl.querySelector('.digest-refs');
    bodyEl.innerHTML = '';
    String(volledigeTekst).split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(alinea => {
        const p = document.createElement('p');
        p.textContent = alinea;
        bodyEl.appendChild(p);
    });
    if (refsEl) bodyEl.appendChild(refsEl);
    host.querySelector('.paywall-overlay')?.remove();
}

async function checkUser() {
    try {
        if (!window.supabaseClient) return { ingelogd: false, premium: false };
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return { ingelogd: false, premium: false };

        // Premiumstatus komt uit de profiles-tabel, niet uit user_metadata:
        // user_metadata is met de anon-key door de gebruiker zelf te overschrijven,
        // profiles heeft RLS die schrijven voorbehoudt aan de service_role (webhook).
        const { data: profile, error } = await window.supabaseClient
            .from('profiles')
            .select('is_premium, premium_until')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error) {
            console.error("Kon premiumstatus niet ophalen:", error.message);
            return { ingelogd: true, premium: false };
        }

        const isPremium = profile?.is_premium === true;
        const verloopDatum = profile?.premium_until;

        // Check: Is de datum nog in de toekomst?
        const isGeldig = isPremium && (!verloopDatum || new Date(verloopDatum) > new Date());

        console.log("Premium status:", isGeldig ? "Actief" : "Verstreken");
        return { ingelogd: true, premium: isGeldig };
    } catch (e) {
        return { ingelogd: false, premium: false };
    }
}

async function laadNieuws(taal) {
    try {
        // 1. Werk de globale taal-variabele bij zodat de rest van de site de juiste taal gebruikt
        huidigeTaal = taal;

        // 2. Haal de verse JSON-data op. We gebruiken Date.now() om caching-
        // problemen te voorkomen. Absoluut pad: dit script draait ook op
        // /articles/{taal}/-pagina's, waar een relatief pad stuk zou lopen.
        const res = await fetch(`/data/news_${taal}.json?v=${Date.now()}`);
        if (!res.ok) throw new Error(`Fetch fout: ${res.status}`);

        // 3. Sla de opgehaalde artikelen op in de globale lijst 'alleArtikelen'
        alleArtikelen = await res.json();

        // 4. Genereer de filterknoppen op basis van de categorieën in de nieuwe data
        // We controleren eerst of de functie bestaat om fouten te voorkomen
        if (typeof renderFilterBar === 'function') {
            renderFilterBar();
        }

        const urlParams = new URLSearchParams(window.location.search);
        const artikelId = urlParams.get('id');

        if (artikelId) {
            // Als er een ID is, blijven we in de detail-weergave (belangrijk bij taalwisselen)
            await toonDetail(artikelId);
        } else {
            // Anders tonen we gewoon de standaard lijst met alle artikelen op de homepagina
            renderLijst(alleArtikelen);
        }

        console.log(`BrightNews succesvol geladen in het ${taal.toUpperCase()} 🚀`);
    } catch (err) {
        console.error("Fout tijdens laden:", err);
        // Veilig aanroepen:
        if (typeof window.showNotification === 'function') {
            // window.showNotification("Fout bij laden van nieuws.", "error");
        } else {
            // alert("Fout bij laden van nieuws.");
        }
    }
}

async function toonDetail(id) {
    const detailView = document.getElementById('detail-view');
    const container = document.getElementById('news-container');
    const detailNav = document.getElementById('detail-navigation');

    // Guard vóórdat de elementen gebruikt worden: op pagina's zonder
    // nieuws-container valt hier verder niets te tonen.
    if (!detailView || !container) return;

    if (detailNav) detailNav.style.display = 'block';
    container.style.display = 'none';
    detailView.style.display = 'block';

    const filterWrapper = document.querySelector('.filter-wrapper');
    if (filterWrapper) filterWrapper.style.display = 'none';

    const artikel = alleArtikelen.find(a => String(a.id) === String(id));
    if (!artikel) {
        // Gedeelde link naar een artikel dat niet (meer) in de actuele lijst
        // staat (de JSON bevat max. 150 artikelen): nette melding i.p.v. een
        // blanco pagina.
        updateMetaTags(null);
        detailView.innerHTML = `
        <div class="article-container" style="max-width: 600px; margin: 0 auto; padding: 60px 20px; text-align: center;">
            <h1 data-i18n="article_gone_title" style="color: #1a1a1a;">${getT('article_gone_title', 'Dit artikel is niet meer beschikbaar')}</h1>
            <p data-i18n="article_gone_text">${getT('article_gone_text', 'Het nieuws op BrightNews wordt doorlopend ververst; dit artikel is inmiddels uit het actuele overzicht verdwenen.')}</p>
            <button onclick="terugNaarOverzicht()" class="btn-primary-editorial" data-i18n="article_gone_btn">${getT('article_gone_btn', 'Naar het overzicht')}</button>
        </div>`;
        return;
    }

    updateMetaTags(artikel);
    // Sla positie op
    sessionStorage.setItem('brightScrollPos', window.scrollY);

    // Forceer de browser om onmiddellijk naar boven te gaan ZONDER animatie
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});

    const userStatus = await checkUser();

    const currentUser = (await window.supabaseClient?.auth.getUser())?.data?.user;
    const refCode = currentUser ? currentUser.id : 'gast';
    const referralUrl = await bepaalDeelUrl(artikel, refCode);

    window.currentArticleUrl = referralUrl;

    let displayContent = artikel.summary;
    let paywallHTML = "";

    if (userStatus.premium === true) {
        // Nieuwe artikelen staan alleen als teaser in de publieke JSON; de
        // volledige tekst zit achter get_full_article() (checkt zelf premium-
        // status server-side). Oudere artikelen (van vóór deze wijziging)
        // hebben geen rij in articles_full — dan valt dit terug op de
        // teaser/summary die al in de JSON stond (ongewijzigd gedrag).
        try {
            const { data: volledigeTekst, error } = await window.supabaseClient
                .rpc('get_full_article', { p_id: String(id), p_lang: window.huidigeTaal });
            if (!error && volledigeTekst) {
                displayContent = volledigeTekst;
            }
        } catch (e) {
            console.error("Kon volledig artikel niet ophalen:", e.message);
        }
    } else {
        const woorden = artikel.summary.split(' ');
        // Ook een teaser die al server-side is ingekort (eindigt op "...")
        // verdient de premium-CTA; met alleen de >60-woordencheck kregen
        // nieuwe (bron-ingekorte) artikelen nooit een upgrade-knop te zien.
        const isIngekort = woorden.length > 60 || artikel.summary.trim().endsWith('...');
        // Dagoverzichten (type 'digest') hebben bewust een ruimere teaser
        // (~100 woorden, server-side ingekort): niet opnieuw afkappen.
        if (woorden.length > 60 && artikel.type !== 'digest') {
            displayContent = woorden.slice(0, 60).join(' ') + "...";
        }
        if (isIngekort) {
            const i18nKey = userStatus.ingelogd ? 'btn_upgrade_now' : 'btn_login_to_read';
            paywallHTML = `<div class="paywall-overlay"><div class="paywall-content"><h3 data-i18n="premium_title">${getT('premium_title')}</h3><p data-i18n="premium_text">${getT('premium_text')}</p><button onclick="window.location.href='/profiel.html'" class="btn-primary-editorial" data-i18n="${i18nKey}">${getT(i18nKey)}</button></div></div>`;
        }
    }
    const shareHtml = `
    <div class="share-section">
        <p class="share-title" data-i18n="share_article">${getT('share_article')}</p>
        <div class="share-wrapper">
            <button onclick="toggleShareMenu(event)" class="share-main-btn" id="mainShareBtn">
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> <span id="share-btn-text" data-i18n="share_label">${getT('share_label')}</span>
            </button>
            <div id="shareMenu" class="share-dropdown">
                <a href="#" id="share-wa" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></a>
                <a href="#" id="share-fb" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg></a>
                <a href="#" id="share-x" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg></a>
                <a href="#" id="share-li" target="_blank"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
                <a href="#" id="share-mail"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a>
                <button onclick="copyLink(event)"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
            </div>
        </div>
    </div>
<p class="ai-disclaimer" data-role="ai-disclaimer" style="text-align: center; font-style: italic; color: #666; margin-top: 30px; font-size: 0.85em;"></p>
`;
// --- DEFINITIES VOOR DATUM (Nodig voor weergave en Google) ---
    const formattedDate = artikel.date ? new Date(artikel.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';

    const isoDate = artikel.date ? new Date(artikel.date).toISOString() : '';

    // --- VOLLEDIGE UPDATE VAN DE DETAILVIEW (SEO geoptimaliseerd) ---
    // AI-gegenereerde velden (title, displayContent, image_alt) komen uit RSS-bronnen
    // via het LLM en worden NIET via innerHTML/template-strings ingevoegd, maar via
    // textContent/DOM-eigenschappen — dat voorkomt HTML-/attribuut-injectie (XSS).
    const fallbackImgUrl = 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80';

    detailView.innerHTML = `
    <div class="detail-hero">
        <img class="detail-img" data-role="hero-img">
    </div>
    <div class="article-container" style="max-width: 800px; margin: 0 auto; padding: 20px;" itemscope itemtype="https://schema.org/NewsArticle">
        <header class="detail-header">
            <h1 itemprop="headline" style="margin-bottom: 10px;" data-role="title"></h1>

            ${formattedDate ? `
                <h2 style="margin-bottom:30px; font-weight: normal; border:none; background:none; padding:0;">
                    <time itemprop="datePublished" datetime="${isoDate}" style="display:block; color:#888; font-size:1.2rem;">
                        ${formattedDate}
                    </time>
                </h2>` : ''}
        </header>

        <section class="article-body" itemprop="articleBody">
            <div data-role="body"></div>
            ${paywallHTML}
            ${shareHtml}
        </section>
    </div>`;

    const heroImg = detailView.querySelector('[data-role="hero-img"]');
    heroImg.src = artikel.image || fallbackImgUrl;
    heroImg.alt = artikel.image_alt || artikel.title;
    heroImg.onerror = function () {
        this.onerror = null;
        this.src = fallbackImgUrl;
    };

    detailView.querySelector('[data-role="title"]').textContent = artikel.title;

    // Alinea's behouden: de volledige tekst (uit get_full_article) bevat
    // newline-scheidingen die met één textContent-toewijzing als één blok
    // zouden renderen. Per alinea een <p>, nog steeds via textContent (XSS-veilig).
    const bodyEl = detailView.querySelector('[data-role="body"]');
    String(displayContent).split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(alinea => {
        const p = document.createElement('p');
        p.textContent = alinea;
        bodyEl.appendChild(p);
    });

    // Dagoverzicht: klikbare lijst van de besproken artikelen ([n]-verwijzingen
    // in de tekst slaan hierop terug). Voor iedereen zichtbaar — dit is de
    // doorklik naar de losse artikelen. Via createElement/textContent (XSS-veilig).
    if (Array.isArray(artikel.refs) && artikel.refs.length) {
        const refsWrap = document.createElement('div');
        refsWrap.className = 'digest-refs';
        const kop = document.createElement('h3');
        kop.textContent = getT('digest_refs_title');
        refsWrap.appendChild(kop);
        const lijst = document.createElement('ol');
        artikel.refs.forEach(ref => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `/?id=${encodeURIComponent(ref.id)}`;
            a.textContent = ref.title;
            li.appendChild(a);
            lijst.appendChild(li);
        });
        refsWrap.appendChild(lijst);
        bodyEl.appendChild(refsWrap);
    }

    // AI-transparantie: bron zichtbaar per artikel (werkt voor zowel de oude
    // volledige-tekst-artikelen als de nieuwe teaser/volledige-tekst-structuur,
    // want source/link staan in beide gevallen al op het artikel-object).
    const disclaimerEl = detailView.querySelector('[data-role="ai-disclaimer"]');
    if (disclaimerEl) {
        const bron = artikel.source || getT('unknown_source');
        // Dagoverzichten hebben geen externe bron; de bronvermelding zit in
        // de artikelenlijst hierboven.
        disclaimerEl.textContent = (artikel.type === 'digest'
            ? getT('digest_notice')
            : getT('ai_summary_notice').replace('{source}', bron)) + ' ';
        if (artikel.link && /^https?:\/\//i.test(artikel.link)) {
            const link = document.createElement('a');
            link.href = artikel.link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = `${getT('read_original')} ${bron}`.trim();
            disclaimerEl.appendChild(link);
        }
    }

    // Eén plek voor de deel-links: referralUrl wijst naar de statische
    // artikelpagina zodra die bestaat (zie bepaalDeelUrl), anders ?id=.
    setTimeout(() => updateShareLinks(artikel.title, referralUrl), 150);
}
// Reservefoto's per pagina-render: sommige bronnen sturen voor meerdere
// artikelen dezelfde feed-afbeelding mee (of vallen op dezelfde stockfoto
// terug). Duplicaat op de pagina? Dan de eerstvolgende nog-ongebruikte
// foto uit deze pool (mix van de vaste categorie-stockfoto's).
const RESERVE_AFBEELDINGEN = [
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
    "https://images.unsplash.com/photo-1576400883215-7083980b6193",
    "https://images.unsplash.com/photo-1580584126903-c17d41830450",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80",
    "https://images.unsplash.com/photo-1554475901-4538ddfbccc2?w=800&q=80",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    "https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&q=80",
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
    "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80",
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&q=80",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
    "https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?w=800&q=80",
    "https://images.unsplash.com/photo-1464998857633-50e59fbf2fe6?w=800&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80",
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80",
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
    "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
    "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?w=800&q=80",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80",
    "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
    "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=800&q=80",
    "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80"
];
// Dedupliceer op foto-identiteit, niet op exacte URL: dezelfde Unsplash-
// foto kan met én zonder ?w=800-querystring voorkomen.
function fotoSleutel(url) {
    const m = String(url).match(/photo-[0-9a-zA-Z-]+/);
    return m ? m[0] : String(url);
}
function kiesOngebruikteAfbeelding(gebruikt) {
    return RESERVE_AFBEELDINGEN.find(u => !gebruikt.has(fotoSleutel(u))) || RESERVE_AFBEELDINGEN[0];
}

function renderLijst(artikelen) {
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const detailNav = document.getElementById('detail-navigation');
    const filterWrapper = document.querySelector('.filter-wrapper');

    // 1. ARCHITECT CHECK: Als de container niet bestaat, stop direct.
    // Dit voorkomt de "appendChild of null" error op andere pagina's.
    if (!container) {
        console.log("Bright News: Geen nieuws-container gevonden. (Privacy/Prijzen pagina)");
        return;
    }

    // 2. Initialiseer weergave
    container.innerHTML = '';
    container.style.display = 'grid';
    if (detailView) detailView.style.display = 'none';
    if (detailNav) detailNav.style.display = 'none';
    if (filterWrapper) filterWrapper.style.display = 'block';

    // 3. Afhandeling van scroll-positie (voorkom flikkeren)
    const savedPos = sessionStorage.getItem('brightScrollPos');
    if (savedPos) container.style.opacity = '0';

    // 4. Bouw de kaarten. gezienOpPagina voorkomt dat dezelfde foto twee
    // keer op één pagina staat (ook bij gedeelde feed-/stockfoto's).
    const gezienOpPagina = new Set();
    artikelen.forEach((artikel, index) => {
        const veiligId = artikel.id || `old-${index}`;
        const card = document.createElement('div');
        card.className = 'news-card';

        let imgSrc = artikel.image || kiesOngebruikteAfbeelding(gezienOpPagina);
        if (gezienOpPagina.has(fotoSleutel(imgSrc))) {
            imgSrc = kiesOngebruikteAfbeelding(gezienOpPagina);
        }
        gezienOpPagina.add(fotoSleutel(imgSrc));

        // AANPASSING: Gebruik de specifieke fallback logica voor alt-teksten
        const imgAlt = artikel.image_alt || artikel.title;

        // AI-gegenereerde velden (title, summary, image_alt) komen uit RSS-bronnen
        // via het LLM. Via createElement + textContent/property-assignment i.p.v.
        // innerHTML kan hier geen HTML/attribuut-injectie (XSS) doorheen glippen.
        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = 'card-img';
        img.alt = imgAlt;
        // Lazy loading + vaste afmetingen: kaarten onder de vouw laden pas
        // bij scrollen en veroorzaken geen layout-verschuiving (CLS).
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 800;
        img.height = 450;
        img.onerror = function () {
            this.onerror = null;
            // Kies op moment van falen op basis van de LIVE DOM (niet de
            // render-set): onerror vuurt asynchroon en anders kan een al
            // uitgedeelde reservefoto nogmaals gekozen worden.
            const inGebruik = new Set(
                [...document.querySelectorAll('#news-container img')].map(x => fotoSleutel(x.src))
            );
            this.src = RESERVE_AFBEELDINGEN.find(u => !inGebruik.has(fotoSleutel(u)))
                || RESERVE_AFBEELDINGEN[RESERVE_AFBEELDINGEN.length - 1];
        };

        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        if (artikel.type === 'digest') {
            const badge = document.createElement('span');
            badge.className = 'card-badge';
            badge.textContent = getT('digest_badge');
            cardContent.appendChild(badge);
        }

        const titleEl = document.createElement('h3');
        titleEl.textContent = artikel.title;

        const summaryEl = document.createElement('p');
        summaryEl.textContent = artikel.summary ? artikel.summary.substring(0, 85) + '...' : '';

        cardContent.appendChild(titleEl);
        cardContent.appendChild(summaryEl);
        card.appendChild(img);
        card.appendChild(cardContent);

        card.addEventListener('click', () => {
            window.history.pushState({}, '', `?id=${veiligId}`);
            window.toonDetail(veiligId);
        });

        container.appendChild(card);
    });

    // 5. Herstel scroll-positie
    if (savedPos && !window.location.search.includes('id=')) {
        requestAnimationFrame(() => {
            window.scrollTo({ top: parseInt(savedPos), behavior: 'instant' });
            container.style.opacity = '1';
            sessionStorage.removeItem('brightScrollPos');
        });
    } else {
        container.style.opacity = '1';
    }
}

function updateShareLinks(artikelTitel, artikelUrl) {
    const url = encodeURIComponent(artikelUrl || window.location.href);
    const title = encodeURIComponent(artikelTitel || document.title);

    const shareLinks = {
        'share-wa': `https://api.whatsapp.com/send?text=${title}%20${url}`,
        'share-fb': `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        'share-x': `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        'share-li': `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        'share-mail': `mailto:?subject=${title}&body=Check dit artikel op BrightNews: ${url}`
    };

    // Loop door de links en vul ze in
    for (const [id, link] of Object.entries(shareLinks)) {
        const el = document.getElementById(id);
        if (el) el.href = link;
    }
}

function toggleShareMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('shareMenu');
    if (menu) menu.classList.toggle('active');
}

function copyLink(event) {
    // 1. Stop bubbling (slechts 1x nodig)
    if (event) event.stopPropagation();

    const btn = document.getElementById('mainShareBtn');
    const btnText = document.getElementById('share-btn-text');

    // 2. Bepaal de juiste URL (Referral of standaard)
    const urlToCopy = window.currentArticleUrl || window.location.href;

    // 3. Kopieer naar klembord
    navigator.clipboard.writeText(urlToCopy).then(() => {
        // Haal vertaling op voor "Gekopieerd!"
        const copiedText = getT('copied', 'Copied!');

        // Toon notificatie indien de functie bestaat
        if (typeof showNotification === "function") {
            showNotification(copiedText, "success");
        }

        // UI Feedback op de knop zelf
        if (btn && btnText) {
            const oud = btnText.innerText;
            btn.style.backgroundColor = "#d4edda"; // Lichtgroen succes-kleurtje
            btnText.innerText = copiedText;

            setTimeout(() => {
                btn.style.backgroundColor = "";
                btnText.innerText = oud;
            }, 2000);
        }
    }).catch(err => {
        console.error("Kopieerfout:", err);
    });

    // 4. Sluit het menu direct na het klikken
    const menu = document.getElementById('shareMenu');
    if (menu) menu.classList.remove('active');
}

function terugNaarOverzicht() {
    window.history.pushState({}, '', window.location.pathname);
    updateMetaTags(null);
    laadNieuws(huidigeTaal);
}

async function wisselTaal(lang, labelTekst, event) {
    if (event) event.preventDefault();

    // Op een statische artikelpagina navigeert taalwisselen naar de
    // taalvariant van hetzelfde artikel (de hreflang-alternates), zodat
    // artikeltekst en site-chrome dezelfde taal houden.
    const statischArtikel = document.querySelector('[data-static-article]');
    if (statischArtikel) {
        const alt = statischArtikel.getAttribute(`data-alt-${lang}`);
        if (alt) {
            localStorage.setItem('selectedLanguage', lang);
            window.location.href = alt;
            return;
        }
    }

    // 1. Update dropdown label (labelTekst-parameter blijft voor compatibiliteit
    // met de bestaande onclick-attributen, maar de centrale map is leidend —
    // die bevat de verbergbare vlag-span).
    const btn = document.getElementById('current-lang');
    if (btn) {
        btn.innerHTML = `${TAAL_LABELS[lang] || labelTekst || ''} <span class="arrow">▼</span>`;
    }

    // Sluit de <details>-dropdown na keuze (blijft anders open staan)
    if (event && event.target) {
        const openDetails = event.target.closest('details.dropdown');
        if (openDetails) openDetails.removeAttribute('open');
    }

    // 2. Synchroniseer de taal overal
    localStorage.setItem('selectedLanguage', lang);
    window.huidigeTaal = lang;
    document.documentElement.lang = lang;

    // 3. Vertaal de statische knoppen en teksten
    vertaalStatischeTeksten(lang);

    // 4. HIER GEBEURT DE MAGIE: Update de dynamische profiel-teksten
    if (window.supabaseClient) {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (user && typeof updateProfileUI === 'function') {
            await updateProfileUI(user); // Dit roept renderSubscriptionUI opnieuw aan met de nieuwe taal!
        }
    }

    // 5. Update het nieuws (indien op homepagina)
    if (typeof laadNieuws === 'function') {
        laadNieuws(lang);
    }
}
// 1. Initialiseer een globale lijst voor actieve filters
window.actieveFilters = [];

function renderFilterBar() {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;

    // Deze namen moeten exact overeenkomen met de 'category' in je news_taal.json
    const categories = ['All', 'Tech', 'Health', 'Science', 'Lifestyle', 'Environment', 'Finance'];

    filterContainer.innerHTML = categories.map(cat => {
        // 1. Maak de vertaal-key (bijv. filter_all, filter_tech, etc.)
        const i18nKey = `filter_${cat.toLowerCase()}`;

        // 2. Haal de vertaling op. We gebruiken 'cat' (de Engelse naam) als fallback
        // zodat er nooit een leeg knopje staat als de vertaling ontbreekt.
        const displayLabel = getT(i18nKey, cat);

        // 3. Check of de knop actief moet zijn
        const isActief = (cat === 'All' && window.actieveFilters.length === 0) || window.actieveFilters.includes(cat);

        return `
            <button class="filter-btn ${isActief ? 'active' : ''}" 
                    onclick="filterByMetadata('${cat}', this)"
                    data-i18n="${i18nKey}">
                ${displayLabel}
            </button>
        `;
    }).join('');
}
// Laadt Google Analytics pas NA toestemming. Zonder toestemming wordt gtag.js
// nooit aangevraagd (geen enkel netwerkverzoek naar Google), en het bestaande
// gtag('consent', 'default', {...denied}) in de <head> blijft dan van kracht.
function activateAnalytics() {
    if (window.__gaLoaded || typeof gtag !== 'function') return;
    window.__gaLoaded = true;

    gtag('consent', 'update', { 'analytics_storage': 'granted' });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-ZNFX3R9BQV';
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', 'G-ZNFX3R9BQV');
}

// Bouwt de cookiebanner dynamisch. Eén bron voor álle pagina's (inclusief
// de statische artikelpagina's) i.p.v. losse HTML-kopieën per pagina —
// voorheen had alleen de homepage een banner en kreeg wie elders binnenkwam
// nooit een consent-vraag. Inhoud komt uitsluitend uit de eigen
// (versiebeheerde) translation-keys.
function maakCookieBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-overlay';
    banner.style.display = 'none';
    banner.innerHTML = `
    <div class="cookie-content">
        <div class="cookie-icon">🍪</div>
        <div class="cookie-text">
            <h3 data-i18n="cookie_title">${getT('cookie_title')}</h3>
            <p>
                <span data-i18n="cookie_text">${getT('cookie_text')}</span>
                <a href="/Privacy.html" style="color: var(--bright-green); text-decoration: underline;" data-i18n="cookie_more">${getT('cookie_more')}</a>
            </p>
        </div>
        <div class="cookie-buttons">
            <button onclick="acceptCookies()" class="btn-cookie-accept" data-i18n="btn_accept">${getT('btn_accept')}</button>
            <button onclick="declineCookies()" class="btn-cookie-decline" data-i18n="btn_decline">${getT('btn_decline')}</button>
        </div>
    </div>`;
    document.body.appendChild(banner);
    return banner;
}

// Functie om de banner te tonen als er nog geen keuze is gemaakt
function checkCookies() {
    const consent = localStorage.getItem('brightNews_cookies');

    if (consent === 'accepted') {
        // Eerdere sessie had al geaccepteerd: analytics alsnog activeren.
        activateAnalytics();
    } else if (!consent) {
        const banner = document.getElementById('cookie-banner') || maakCookieBanner();
        banner.style.display = 'flex';
        // Zorg dat de banner direct vertaald is
        vertaalStatischeTeksten(window.huidigeTaal);
    }
}

window.acceptCookies = function() {
    localStorage.setItem('brightNews_cookies', 'accepted');
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
    activateAnalytics();
};

window.declineCookies = function() {
    localStorage.setItem('brightNews_cookies', 'essential');
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
};

// Zorg dat de browser weet dat deze bij de window horen voor de onclick
window.checkCookies = checkCookies;

// De enige event listener die je nodig hebt:
document.addEventListener('DOMContentLoaded', initApp);

// Sluit een open taal-dropdown (<details class="dropdown">) met Escape,
// zodat toetsenbordgebruikers het menu ook zonder muis kunnen sluiten.
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openDetails = document.querySelector('details.dropdown[open]');
    if (openDetails) {
        openDetails.removeAttribute('open');
        const summary = openDetails.querySelector('summary');
        if (summary) summary.focus();
    }
});

function filterByMetadata(category, btn) {
    const allBtn = document.querySelector('.filter-btn:first-child'); // De 'All' knop

    if (category === 'All') {
        // Reset alles
        window.actieveFilters = [];
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else {
        // Verwijder 'active' van de 'All' knop
        if (allBtn) allBtn.classList.remove('active');

        // Toggle de gekozen categorie in de lijst
        if (window.actieveFilters.includes(category)) {
            window.actieveFilters = window.actieveFilters.filter(f => f !== category);
            btn.classList.remove('active');
        } else {
            window.actieveFilters.push(category);
            btn.classList.add('active');
        }

        // Als er geen filters meer over zijn, zet 'All' weer aan
        if (window.actieveFilters.length === 0 && allBtn) {
            allBtn.classList.add('active');
        }
    }

    // Voer de filtering uit
    const gefilterd = window.actieveFilters.length === 0
        ? window.alleArtikelen
        : window.alleArtikelen.filter(a => window.actieveFilters.includes(a.category));

    renderLijst(gefilterd);
}
function updateMetaTags(artikel) {
    const title = artikel ? `${artikel.title} | BrightNews ✨` : 'BrightNews ✨ Jouw dagelijkse dosis positiviteit';
    const description = artikel ? (artikel.meta_description || artikel.summary.substring(0, 155)) : 'Alleen het beste, meest positieve nieuws van vandaag.';
    const image = artikel ? artikel.image : 'https://brightnews.online/assets/brightnews-logo.png';
    const url = window.location.href;

    // Browser titel
    document.title = title;

    // Helper om meta tags te updaten of aan te maken
    const setMeta = (name, value, isProperty = false) => {
        const attr = isProperty ? 'property' : 'name';
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', value);
    };

    // Standaard SEO
    setMeta('description', description);

    // Facebook / LinkedIn (Open Graph)
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:image', image, true);
    setMeta('og:url', url, true);
    setMeta('og:type', 'article', true);

    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
}
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        window.toonDetail(id);
    } else {
        // Forceer terug naar lijst zonder de pagina te herladen
        const container = document.getElementById('news-container');
        const detailView = document.getElementById('detail-view');
        if(container) container.style.display = 'grid';
        if(detailView) detailView.style.display = 'none';
        window.laadNieuws(window.huidigeTaal);
    }
});
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Absoluut pad met root-scope: werkt ook vanaf /articles/{taal}/-pagina's.
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('BrightNews PWA: Actief ✨'))
            .catch(err => console.log('PWA Fout:', err));
    });
}

window.toonDetail = toonDetail;
window.renderLijst = renderLijst;
window.laadNieuws = laadNieuws;
window.terugNaarOverzicht = terugNaarOverzicht;
window.wisselTaal = wisselTaal;
window.toggleShareMenu = toggleShareMenu;
window.copyLink = copyLink;