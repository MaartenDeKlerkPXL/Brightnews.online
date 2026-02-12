/* global supabase */

    // let huidigeTaal = 'en';
// let alleArtikelen = [];

// 1. Check user status
async function checkUser() {
    try {
        if (!window.supabaseClient) return { ingelogd: false, premium: false };
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return { ingelogd: false, premium: false };
        const isPremium = session.user.user_metadata?.is_premium === true;
        return { ingelogd: true, premium: isPremium };
    } catch (e) {
        console.error("CheckUser fout:", e);
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
                <div class="source-tag">${artikel.source}</div>
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
    // VOEG DEZE REGELS TOE: haal de elementen op uit de HTML
    const detailView = document.getElementById('detail-view');
    const container = document.getElementById('news-container');
    const detailNav = document.getElementById('detail-navigation');
    const updateTime = document.getElementById('update-time');

    // Controleer of de elementen wel bestaan in je HTML
    if (!detailView || !container) {
        console.error("Kritieke fout: detail-view of news-container niet gevonden!");
        return;
    }

    // De rest van je code...
    if (detailNav) detailNav.style.display = 'block';
    window.history.pushState({}, '', `?id=${id}`);

    const artikel = alleArtikelen.find(a => String(a.id) === String(id));
    if (!artikel) return;

    const userStatus = await checkUser();

    // Scherm wisselen
    container.style.display = 'none';
    if (updateTime) updateTime.style.display = 'none';
    detailView.style.display = 'block';
    window.scrollTo(0, 0);

    // Bouw de HTML op (inclusief share knop)...
    const shareHtml = `
    <div class="share-section">
        <p class="share-title">${huidigeTaal === 'nl' ? 'Deel dit artikel' : 'Share this article'}</p>
        <div class="share-wrapper">
            <button onclick="toggleShareMenu(event)" class="share-main-btn" id="mainShareBtn">
                <i class="fas fa-share-alt"></i>
                <span id="share-btn-text">Share</span>
            </button>
            <div id="shareMenu" class="share-dropdown">
                <a href="#" id="share-wa" target="_blank"><i class="fab fa-whatsapp"></i></a>
                <a href="#" id="share-fb" target="_blank"><i class="fab fa-facebook-f"></i></a>
                <a href="#" id="share-x" target="_blank"><i class="fab fa-x-twitter"></i></a>
                <a href="#" id="share-li" target="_blank"><i class="fab fa-linkedin-in"></i></a>
                <a href="#" id="share-mail"><i class="fas fa-envelope"></i></a>
                <button onclick="copyLink(event)" id="copyBtn"><i class="fas fa-link"></i></button>
            </div>
        </div>
    </div>`;

    detailView.innerHTML = `
        <div class="detail-hero">
            <img src="${artikel.image || ''}" class="detail-img">
        </div>
        <div class="article-container">
            <header class="detail-header">
                <h1>${artikel.title}</h1>
            </header>
            <section class="article-body">
                <p>${artikel.summary}</p>
                ${shareHtml}
            </section>
        </div>
    `;

    // Activeer de links
    setTimeout(updateShareLinks, 100);
}

// 5. DE SHARE FUNCTIES
function updateShareLinks() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);

    const elements = {
        'share-wa': `https://api.whatsapp.com/send?text=${title}%20${url}`,
        'share-fb': `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        'share-x': `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
        'share-li': `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        'share-pi': `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`,
        'share-mail': `mailto:?subject=${title}&body=${url}`
    };

    for (const [id, link] of Object.entries(elements)) {
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

    navigator.clipboard.writeText(url).then(() => {
        // Gebruik je Toast systeem
        if (typeof showNotification === "function") {
            showNotification("Link gekopieerd naar klembord! 📋", "success");
        }

        // Visuele verandering van de knop
        if (btn && btnText) {
            const oud = btnText.innerText;
            btn.style.backgroundColor = "#d4edda"; // Lichtgroen
            btnText.innerText = "Gekopieerd!";
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
// --- ZORG DAT DEZE FUNCTIES LOS STAAN (NIET IN EEN ANDERE FUNCTIE) ---

function wisselTaal(taal, vlagTekst, event) {
    if (event) event.preventDefault();
    const langBtn = document.getElementById('current-lang');
    if (langBtn) langBtn.innerHTML = `${vlagTekst} <span class="arrow">▼</span>`;
    laadNieuws(taal);
}

function terugNaarOverzicht() {
    window.history.pushState({}, '', window.location.pathname);
    // Gebruik de variabele 'huidigeTaal' die bovenaan je script staat
    laadNieuws(huidigeTaal);
}

// Maak functies beschikbaar voor de hele browser
window.toonDetail = toonDetail;
window.renderLijst = renderLijst;
window.laadNieuws = laadNieuws;
window.terugNaarOverzicht = terugNaarOverzicht;
window.wisselTaal = wisselTaal;
window.toggleShareMenu = toggleShareMenu;
window.copyLink = copyLink;

laadNieuws('en');