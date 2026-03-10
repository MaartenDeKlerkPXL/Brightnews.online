// 1. Globale variabelen initialiseren (voorkomt 'undefined' errors)
window.huidigeTaal = localStorage.getItem('selectedLanguage') || 'nl';
window.alleArtikelen = [];
window.actieveFilters = [];

// 2. De robuuste vertaal-helper
function getT(key, fallback = "...") {
    const lang = window.huidigeTaal;
    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
        return window.translations[lang][key];
    }
    // Alleen loggen als de app echt geladen is om ruis te voorkomen
    if (window.appIsGeladen) console.warn(`Missing: ${key} [${lang}]`);
    return fallback;
}

function vertaalStatischeTeksten(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        let rawKey = el.getAttribute('data-i18n');
        if (!rawKey) return;

        // Check of de key begint met [attribuut]
        if (rawKey.startsWith('[')) {
            const parts = rawKey.split(']'); // Split op het sluitende haakje
            const attributeName = parts[0].substring(1); // Haal bijv. 'aria-label' eruit
            const realKey = parts[1]; // Haal bijv. 'back_label' eruit

            const vertaling = getT(realKey);
            if (vertaling !== "...") {
                el.setAttribute(attributeName, vertaling);
            }
        } else {
            // Normale tekstvertaling
            const vertaling = getT(rawKey);
            if (vertaling !== "...") {
                el.innerHTML = vertaling;
            }
        }
    });
}
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

    // Update taalkiezer label
    const labels = { 'nl': '🇳🇱 Nederlands', 'en': '🇺🇸 English', 'de': '🇩🇪 Deutsch', 'fr': '🇫🇷 Français', 'es': '🇪🇸 Español' };
    const btn = document.getElementById('current-lang');
    if (btn) btn.innerHTML = `${labels[savedLang] || labels['nl']} <span class="arrow">▼</span>`;

    vertaalStatischeTeksten(savedLang);
    if (typeof checkCookies === 'function') checkCookies();

    await laadNieuws(savedLang);
    if (typeof checkGlowStatus === 'function') checkGlowStatus();
}

async function checkUser() {
    try {
        if (!window.supabaseClient) return { ingelogd: false, premium: false };
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return { ingelogd: false, premium: false };

        const meta = session.user.user_metadata;
        const isPremium = meta?.is_premium === true;
        const verloopDatum = meta?.premium_until;

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

        // 2. Haal de verse JSON-data op. We gebruiken Date.now() om caching-problemen te voorkomen
        const res = await fetch(`data/news_${taal}.json?v=${Date.now()}`);
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
    // Zoek dit stukje in toonDetail:
    if (detailNav) detailNav.style.display = 'block';
    container.style.display = 'none';
    detailView.style.display = 'block';

// VOEG DIT TOE:
    const filterWrapper = document.querySelector('.filter-wrapper');
    if (filterWrapper) filterWrapper.style.display = 'none';

    if (!detailView || !container) return;

    const artikel = alleArtikelen.find(a => String(a.id) === String(id));
    if (!artikel) return;

    // Sla positie op
    sessionStorage.setItem('brightScrollPos', window.scrollY);

    // Forceer de browser om onmiddellijk naar boven te gaan ZONDER animatie
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const userStatus = await checkUser();

    if (detailNav) detailNav.style.display = 'block';
    container.style.display = 'none';
    detailView.style.display = 'block';

    let displayContent = artikel.summary;
    let paywallHTML = "";

    if (userStatus.premium !== true) {
        const woorden = artikel.summary.split(' ');
        if (woorden.length > 60) {
            displayContent = woorden.slice(0, 60).join(' ') + "...";
            const i18nKey = userStatus.ingelogd ? 'btn_upgrade_now' : 'btn_login_to_read';
            paywallHTML = `<div class="paywall-overlay"><div class="paywall-content"><h3 data-i18n="premium_title">${getT('premium_title')}</h3><p data-i18n="premium_text">${getT('premium_text')}</p><button onclick="window.location.href='profiel.html'" class="btn-primary-editorial" data-i18n="${i18nKey}">${getT(i18nKey)}</button></div></div>`;
        }
    }

    const shareHtml = `
    <div class="share-section">
        <p class="share-title" data-i18n="share_article">${getT('share_article')}</p>
        <div class="share-wrapper">
            <button onclick="toggleShareMenu(event)" class="share-main-btn" id="mainShareBtn">
                <i class="fas fa-share-alt"></i> <span id="share-btn-text" data-i18n="share_label">${getT('share_label')}</span>
            </button>
            <div id="shareMenu" class="share-dropdown">
                <a href="#" id="share-wa" target="_blank"><i class="fab fa-whatsapp"></i></a>
                <a href="#" id="share-fb" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="#" id="share-x" target="_blank"><i class="fab fa-x-twitter"></i></a>
                <a href="#" id="share-li" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                <a href="#" id="share-mail"><i class="fas fa-envelope"></i></a>
                <button onclick="copyLink(event)"><i class="fas fa-link"></i></button>
            </div>
        </div>
    </div>
    <footer class="detail-footer" style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        <a href="${artikel.link}" target="_blank" class="source-link"><span data-i18n="read_original">${getT('read_original')}</span> ${artikel.source}</a>
    </footer>`;

    const detailImgSrc = artikel.image || 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80';

    detailView.innerHTML = `
    <div class="detail-hero">
        <img src="${artikel.image || 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80'}" 
             class="detail-img" 
             alt="${artikel.title}" 
             onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80';">
    </div>
    <div class="article-container" style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <header class="detail-header"><h1>${artikel.title}</h1></header>
        <section class="article-body"><p>${displayContent}</p>${paywallHTML}${shareHtml}</section>
    </div>`;

    setTimeout(() => updateShareLinks(artikel.title, window.location.href), 150);
}

function renderLijst(artikelen) {
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const detailNav = document.getElementById('detail-navigation');

    // Zoek dit stukje in renderLijst:
    container.style.display = 'grid';
    detailView.style.display = 'none';
    if (detailNav) detailNav.style.display = 'none';

// VOEG DIT TOE:
    const filterWrapper = document.querySelector('.filter-wrapper');
    if (filterWrapper) filterWrapper.style.display = 'block'; // Of 'flex' als je dat gebruikt

    if (!container || !detailView) return;

    // Voorkom flikkeren door container even onzichtbaar te maken als we gaan scrollen
    const savedPos = sessionStorage.getItem('brightScrollPos');
    if (savedPos) container.style.opacity = '0';

    container.style.display = 'grid';
    detailView.style.display = 'none';
    if (detailNav) detailNav.style.display = 'none';

    container.innerHTML = '';

    artikelen.forEach((artikel, index) => {
        const veiligId = artikel.id || `old-${index}`;
        const card = document.createElement('div');
        card.className = 'news-card';
        card.style.cursor = 'pointer';

        // Zoek deze regel in renderLijst:
        const imgSrc = artikel.image || 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80';
        card.innerHTML = `
    <img src="${imgSrc}" 
         class="card-img" 
         alt="${artikel.title}" 
         onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80';">
    <div class="card-content">
        <h3>${artikel.title}</h3>
        <p>${artikel.summary ? artikel.summary.substring(0, 85) + '...' : ''}</p>
    </div>`;

        card.addEventListener('click', () => {
            window.history.pushState({}, '', `?id=${veiligId}`);
            window.toonDetail(veiligId);
        });

        container.appendChild(card);
    });

    if (savedPos && !window.location.search.includes('id=')) {
        // Gebruik requestAnimationFrame voor soepelere afhandeling dan setTimeout
        requestAnimationFrame(() => {
            window.scrollTo({ top: parseInt(savedPos), behavior: 'instant' });
            container.style.opacity = '1'; // Maak weer zichtbaar NA de scroll
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
    if (event) event.stopPropagation();
    const url = window.location.href;
    const btn = document.getElementById('mainShareBtn');
    const btnText = document.getElementById('share-btn-text');

    navigator.clipboard.writeText(url).then(() => {
        // Haal vertaling op voor "Gekopieerd!"
        const copiedText = getT('copied', 'Copied!');

        if (typeof showNotification === "function") {
            showNotification(copiedText, "success");
        }

        if (btn && btnText) {
            const oud = btnText.innerText;
            btn.style.backgroundColor = "#d4edda";
            btnText.innerText = copiedText;

            setTimeout(() => {
                btn.style.backgroundColor = "";
                btnText.innerText = oud;
            }, 2000);
        }
    });

    const menu = document.getElementById('shareMenu');
    if (menu) menu.classList.remove('active');
}

// Event listeners
document.addEventListener('click', () => {
    const menu = document.getElementById('shareMenu');
    if (menu) menu.classList.remove('active');
});

function terugNaarOverzicht() {
    window.history.pushState({}, '', window.location.pathname);
    laadNieuws(huidigeTaal);
}

function wisselTaal(lang, labelTekst, event) {
    renderFilterBar();
    if (event) event.preventDefault();

    // 1. Update dropdown
    const btn = document.getElementById('current-lang');
    if (btn && labelTekst) {
        btn.innerHTML = `${labelTekst} <span class="arrow">▼</span>`;
    }

    // 2. Sla taal op
    localStorage.setItem('selectedLanguage', lang);
    window.huidigeTaal = lang;
    vertaalStatischeTeksten(lang);
    // 3. Update SEO Meta Tags (Nieuw)
    // Update Description
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag && translations[lang]?.meta_desc) {
        descriptionTag.setAttribute("content", translations[lang].meta_desc);
    }

    // Update Keywords
    const keywordsTag = document.querySelector('meta[name="keywords"]');
    if (keywordsTag && translations[lang]?.meta_keys) {
        keywordsTag.setAttribute("content", translations[lang].meta_keys);
    }

    // Update HTML lang attribuut voor browsers/zoekmachines
    document.documentElement.lang = lang;

    // 4. Vertaal statische teksten direct (Interface)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = getT(key);
    });

    // 5. Update de content (Nieuws JSON ophalen)
    if (typeof laadNieuws === 'function') {
        laadNieuws(lang);
    }
    renderFilterBar();
    laadNieuws(lang);
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
// Functie om de banner te tonen als er nog geen keuze is gemaakt
function checkCookies() {
    const consent = localStorage.getItem('brightNews_cookies');
    const banner = document.getElementById('cookie-banner');

    if (!consent && banner) {
        banner.style.display = 'flex';
        // Zorg dat de banner direct vertaald is
        vertaalStatischeTeksten(window.huidigeTaal);
    }
}

window.acceptCookies = function() {
    localStorage.setItem('brightNews_cookies', 'accepted');
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
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

window.toonDetail = toonDetail;
window.renderLijst = renderLijst;
window.laadNieuws = laadNieuws;
window.terugNaarOverzicht = terugNaarOverzicht;
window.wisselTaal = wisselTaal;
window.toggleShareMenu = toggleShareMenu;
window.copyLink = copyLink;



