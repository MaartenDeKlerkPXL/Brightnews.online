/* global supabase */

let huidigeTaal = 'en';
let alleArtikelen = [];

// index.js

// index.js

async function checkUser() {
    try {
        if (!window.supabaseClient) return { ingelogd: false, premium: false };

        const { data: { session } } = await window.supabaseClient.auth.getSession();

        // Als er geen sessie is, ben je sowieso niet premium
        if (!session) return { ingelogd: false, premium: false };

        // De gouden check: Alleen als 'is_premium' EXACT gelijk is aan true
        const isPremium = session.user.user_metadata?.is_premium === true;

        console.log("Check resultaat:", { ingelogd: true, premium: isPremium });
        return { ingelogd: true, premium: isPremium };
    } catch (e) {
        console.error("CheckUser fout:", e);
        return { ingelogd: false, premium: false };
    }
}

async function laadNieuws(taal) {
    try {
        huidigeTaal = taal;
        const res = await fetch(`data/news_${taal}.json?v=${Date.now()}`);
        alleArtikelen = await res.json();

        console.log("Artikelen ingeladen:", alleArtikelen.length);

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

function renderLijst(artikelen) {
    const detailNav = document.getElementById('detail-navigation');
    if (detailNav) detailNav.style.display = 'none';
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const updateTime = document.getElementById('update-time');

    if (!container || !detailView) return;

    container.style.display = 'grid';
    detailView.style.display = 'none';
    if (updateTime) updateTime.style.display = 'block';
    container.innerHTML = '';

    artikelen.forEach((artikel, index) => {
        const veiligId = artikel.id || `old-${index}`;
        const card = document.createElement('div');
        card.className = 'news-card';

        const imgSrc = artikel.image || `https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&sig=${index}`;
        const knopTekst = huidigeTaal === 'nl' ? 'Lees het volledige verhaal.' : 'Read the full story.';

        card.innerHTML = `
            <img src="${imgSrc}" class="card-img" alt="${artikel.title}" onerror="this.src='https://images.unsplash.com/photo-1546422904-90eabf3cab3a?w=800'">
            <div class="card-content">
                <div class="source-tag">${artikel.source}</div>
                <h3>${artikel.title}</h3>
                <p>${artikel.summary ? artikel.summary.substring(0, 85) + '...' : knopTekst}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            window.history.pushState({}, '', `?id=${veiligId}`);
            toonDetail(veiligId);
        });

        container.appendChild(card);
    });
}



async function toonDetail(id) {
    const detailNav = document.getElementById('detail-navigation');
    if (detailNav) detailNav.style.display = 'block';

    // Zet de juiste tekst op de knop
    const backBtnText = document.getElementById('back-btn-text');
    if (backBtnText) {
        backBtnText.innerText = huidigeTaal === 'nl' ? 'Terug' : 'Back';
    }
    const artikel = alleArtikelen.find(a => String(a.id) === String(id));
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const updateTime = document.getElementById('update-time');

    if (!artikel || !detailView || !container) {
        renderLijst(alleArtikelen);
        return;
    }

    // 1. Haal de uitgebreide status op (bevat .ingelogd en .premium)
    const userStatus = await checkUser();
    console.log("Huidige User Status:", userStatus);

    // 2. Scherm klaarmaken
    container.style.display = 'none';
    if (updateTime) updateTime.style.display = 'none';
    detailView.style.display = 'block';
    window.scrollTo(0, 0);

    const datum = new Date(artikel.date).toLocaleDateString(huidigeTaal === 'nl' ? 'nl-NL' : 'en-US', {
        day: 'numeric',
        month: 'long'
    });

    // 3. Paywall Logica: Alleen Premium krijgt de volle hap
    let displayContent = artikel.summary;
    let paywallHTML = "";

    // Check: Als je NIET premium bent, dan krijg je de paywall bij lange artikelen
    if (userStatus.premium !== true) {
        const woorden = artikel.summary.split(' ');
        if (woorden.length > 60) {
            displayContent = woorden.slice(0, 60).join(' ') + "...";

            // Tekst afhankelijk van of iemand wel/niet is ingelogd maar geen premium heeft
            const paywallTitel = huidigeTaal === 'nl' ? '✨ Bright Premium Content' : '✨ Bright Premium Content';
            const paywallBericht = userStatus.ingelogd
                ? (huidigeTaal === 'nl' ? 'Upgrade je account naar Premium om dit artikel te lezen.' : 'Upgrade to Premium to read the full article.')
                : (huidigeTaal === 'nl' ? 'Log in of word Premium lid om verder te lezen.' : 'Log in or become a Premium member to read more.');
            const knopTekst = userStatus.ingelogd
                ? (huidigeTaal === 'nl' ? 'Word nu Premium' : 'Go Premium')
                : (huidigeTaal === 'nl' ? 'Gratis inloggen' : 'Login for Free');

            paywallHTML = `
                <div class="paywall-overlay">
                    <div class="paywall-content">
                        <h3>${paywallTitel}</h3>
                        <p>${paywallBericht}</p>
                        <button onclick="window.location.href='profiel.html'" class="btn-primary-editorial">
                            ${knopTekst}
                        </button>
                    </div>
                </div>`;
        }
    }

    function terugNaarOverzicht() {
        // Verberg de navigatie weer
        const detailNav = document.getElementById('detail-navigation');
        if (detailNav) detailNav.classList.add('hidden');

        window.history.pushState({}, '', window.location.pathname);
        renderLijst(alleArtikelen);
    }

    detailView.innerHTML = `

            <div class="detail-hero">
                <img src="${artikel.image || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200'}" class="detail-img" alt="${artikel.title}">
            </div>
            
            <header class="detail-header">
                <div class="detail-meta">
                    <span class="detail-date">${datum}</span>
                </div>
                <h1>${artikel.title}</h1>
            </header>
            
            <section class="article-body">
                <p>${displayContent}</p>
                ${paywallHTML}
            </section>
            
            ${userStatus.premium ? `
            <footer class="detail-footer">
                <a href="${artikel.link}" target="_blank" class="source-link">
                    ${huidigeTaal === 'nl' ? 'Lees origineel op' : 'Read full article on'} ${artikel.source}
                </a>
            </footer>` : ''}
    `;
}

function terugNaarOverzicht() {
    window.history.pushState({}, '', window.location.pathname);
    renderLijst(alleArtikelen);
}

function wisselTaal(taal, vlagTekst, event) {
    if (event) event.preventDefault();
    const langBtn = document.getElementById('current-lang');
    if (langBtn) langBtn.innerHTML = `${vlagTekst} <span class="arrow">▼</span>`;
    laadNieuws(taal);
}

// Global scope
window.laadNieuws = laadNieuws;
window.toonDetail = toonDetail;
window.wisselTaal = wisselTaal;
window.terugNaarOverzicht = terugNaarOverzicht;

laadNieuws('en');

function showToast() {
    const shouldShow = localStorage.getItem('showLoginToast');
    const message = localStorage.getItem('toastMessage');
    const type = localStorage.getItem('toastType'); // 'success' of 'error'

    if (shouldShow === 'true' && message) {
        const toast = document.createElement('div');
        toast.className = `bright-toast ${type}`;
        toast.innerHTML = `<div class="toast-content"><p>${message}</p></div>`;
        document.body.appendChild(toast);

        localStorage.removeItem('showLoginToast');
        localStorage.removeItem('toastMessage');
        localStorage.removeItem('toastType');

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
}

// Roep de functie aan bij het starten
showToast();