/* global supabase */

    // let huidigeTaal = 'en';
// let alleArtikelen = [];

// 1. Check user status
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

// 2. Nieuws laden
async function laadNieuws(taal) {
    try {
        huidigeTaal = taal;
        const res = await fetch(`data/news_${taal}.json?v=${Date.now()}`);
        alleArtikelen = await res.json();

        const urlParams = new URLSearchParams(window.location.search);
        const artikelId = urlParams.get('id');

        if (artikelId) {
            await toonDetail(artikelId);
        } else {
            renderLijst(alleArtikelen);
        }
    } catch (err) {
        console.error("Fout bij laden:", err);
    }
}

// 3. De lijst met kaartjes opbouwen
function renderLijst(artikelen) {
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const detailNav = document.getElementById('detail-navigation');

    if (!container || !detailView) return;

    // Reset weergave naar lijst-modus
    container.style.display = 'grid';
    detailView.style.display = 'none';
    if (detailNav) detailNav.style.display = 'none';

    container.innerHTML = '';

    artikelen.forEach((artikel, index) => {
        const veiligId = artikel.id || `old-${index}`;
        const card = document.createElement('div');
        card.className = 'news-card';
        // Zorg dat de muis verandert in een handje
        card.style.cursor = 'pointer';

        const imgSrc = artikel.image || `https://images.unsplash.com/photo-1546422904-90eabf3cab3a?w=800`;

        card.innerHTML = `
            <img src="${imgSrc}" class="card-img" alt="${artikel.title}">
            <div class="card-content">
                    <!-- <div class="source-tag">${artikel.source}</div> -->
                <h3>${artikel.title}</h3>
                <p>${artikel.summary ? artikel.summary.substring(0, 85) + '...' : ''}</p>
            </div>
        `;

        // DE KLIK-LOGICA:
        card.addEventListener('click', (e) => {
            console.log("Klik op artikel:", veiligId); // Voor controle in je console
            window.history.pushState({}, '', `?id=${veiligId}`);
            // Roep de functie aan die op window staat
            if (typeof window.toonDetail === 'function') {
                window.toonDetail(veiligId);
            } else {
                console.error("Fout: toonDetail is niet gevonden op window!");
            }
        });

        container.appendChild(card);
    });
}

async function toonDetail(id) {
    const detailView = document.getElementById('detail-view');
    const container = document.getElementById('news-container');
    const detailNav = document.getElementById('detail-navigation');
    const updateTime = document.getElementById('update-time');

    if (!detailView || !container) return;

    const artikel = alleArtikelen.find(a => String(a.id) === String(id));
    if (!artikel) return;

    const userStatus = await checkUser();

    // Haal de huidige taal op voor de dynamische teksten
    const lang = localStorage.getItem('selectedLanguage') || 'en';
    const t = translations[lang];

    // UI klaarmaken
    if (detailNav) detailNav.style.display = 'block';
    container.style.display = 'none';
    if (updateTime) updateTime.style.display = 'none';
    detailView.style.display = 'block';
    window.scrollTo(0, 0);
    window.history.pushState({}, '', `?id=${id}`);

    let displayContent = artikel.summary;
    let paywallHTML = "";

    if (userStatus.premium !== true) {
        const woorden = artikel.summary.split(' ');
        if (woorden.length > 60) {
            displayContent = woorden.slice(0, 60).join(' ') + "...";

            // 1. Bepaal de juiste KEY voor de vertaling
            const i18nKey = userStatus.ingelogd ? 'btn_upgrade_now' : 'btn_login_to_read';
            const knopTekst = t[i18nKey];

            paywallHTML = `
            <div class="paywall-overlay">
                <div class="paywall-content">
                    <h3 data-i18n="premium_title">${t.premium_title}</h3>
                    <p data-i18n="premium_text">${t.premium_text}</p>
                    
                    <button onclick="window.location.href='profiel.html'" 
                            class="btn-primary-editorial" 
                            data-i18n="${i18nKey}">
                        ${knopTekst}
                    </button>
                </div>
            </div>`;
        }
    }

    // --- SHARE BUTTON HTML (Nu met vertaling) ---
    const shareHtml = `
    <div class="share-section">
        <p class="share-title" data-i18n="share_article">${t.share_article}</p>
        <div class="share-wrapper">
            <button onclick="toggleShareMenu(event)" class="share-main-btn" id="mainShareBtn">
                <i class="fas fa-share-alt"></i> <span id="share-btn-text" data-i18n="share_label">${t.share_label}</span>
            </button>
            <div id="shareMenu" class="share-dropdown">
                <a href="#" id="share-wa" target="_blank"><i class="fab fa-whatsapp"></i></a>
                <a href="#" id="share-fb" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="#" id="share-x" target="_blank" title="X">
                    <svg class="x-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/>
                    </svg>
                </a>
                <a href="#" id="share-li" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                <a href="#" id="share-mail"><i class="fas fa-envelope"></i></a>
                <button onclick="copyLink(event)"><i class="fas fa-link"></i></button>
            </div>
        </div>
    </div>
    <footer class="detail-footer" style="margin-top: 40px;padding-top: 20px;">
        <a href="${artikel.link}" target="_blank" class="source-link">
            <span data-i18n="read_original">${t.read_original}</span> ${artikel.source}
        </a>
    </footer>`;

    // Alles in de detailView plaatsen
    detailView.innerHTML = `
        <div class="detail-hero">
            <img src="${artikel.image}" class="detail-img">
        </div>
        <div class="article-container" style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <header class="detail-header">
                <h1 style="margin-bottom: 20px;">${artikel.title}</h1>
            </header>
            <section class="article-body" style="line-height: 1.6; font-size: 1.1rem;">
                <p>${displayContent}</p>
                ${paywallHTML}
                ${shareHtml}
            </section>
        </div>
    `;

    setTimeout(() => {
        updateShareLinks(artikel.title, window.location.href);
    }, 150);
}

function updateShareLinks(artikelTitel, artikelUrl) {
    const url = encodeURIComponent(artikelUrl || window.location.href);
    const title = encodeURIComponent(artikelTitel || document.title);

    const shareLinks = {
        'share-wa': `https://api.whatsapp.com/send?text=${title}%20${url}`,
        'share-fb': `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        'share-x': `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        'share-li': `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        'share-mail': `mailto:?subject=${title}&body=Check dit artikel op Bright News: ${url}`
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
    event.stopPropagation();
    const url = window.location.href;
    const btn = document.getElementById('mainShareBtn');
    const btnText = document.getElementById('share-btn-text');

    // Haal de vertaling op
    const lang = localStorage.getItem('selectedLanguage') || 'en';
    const t = translations[lang];

    navigator.clipboard.writeText(url).then(() => {
        // Gebruik de "Copied!" vertaling voor de notificatie
        if (typeof showNotification === "function") {
            showNotification(t.copied, "success");
        }

        if (btn && btnText) {
            const oud = btnText.innerText;
            btn.style.backgroundColor = "#d4edda";
            btnText.innerText = t.copied; // Update knop naar "Gekopieerd!"

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
    if (event) event.preventDefault();

    // 1. Update de knop weergave
    const btn = document.getElementById('current-lang');
    if (btn) btn.innerHTML = `${labelTekst} <span class="arrow">▼</span>`;

    localStorage.setItem('selectedLanguage', lang);

    // 2. Vertaal tekst elementen (innerHTML voor emoji's/opmaak)
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // 3. Vertaal placeholders
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    if (typeof laadArtikelen === 'function') {
        laadArtikelen(lang);
    }
}

// 3. DE AUTOMATISCHE CHECK BIJ LADEN
document.addEventListener('DOMContentLoaded', () => {
    const opgeslagenTaal = localStorage.getItem('selectedLanguage') || 'en';
    const labels = { 'en': '🇺🇸 English', 'nl': '🇳🇱 Nederlands', 'de': '🇩🇪 Deutsch', 'fr': '🇫🇷 Français', 'es': '🇪🇸 Español' };
    wisselTaal(opgeslagenTaal, labels[opgeslagenTaal]);
});

// Maak functies beschikbaar voor de hele browser
window.toonDetail = toonDetail;
window.renderLijst = renderLijst;
window.laadNieuws = laadNieuws;
window.terugNaarOverzicht = terugNaarOverzicht;
window.wisselTaal = wisselTaal;
window.toggleShareMenu = toggleShareMenu;
window.copyLink = copyLink;

// Laad altijd de laatst gekozen taal in plaats van standaard Engels
const startTaal = localStorage.getItem('selectedLanguage') || 'en';
laadNieuws(startTaal);