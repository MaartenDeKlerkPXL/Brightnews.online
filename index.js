/* global supabase */ // Voorkomt "unresolved" waarschuwingen voor supabase

let huidigeTaal = 'en';
let alleArtikelen = [];

// Controleer of er een actieve sessie is in Supabase
async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
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

        // Gebruik de knopTekst variabele om de waarschuwing op te lossen
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
    const artikel = alleArtikelen.find(a => String(a.id) === String(id));
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const updateTime = document.getElementById('update-time');

    if (!artikel || !detailView || !container) {
        renderLijst(alleArtikelen);
        return;
    }

    // 1. Check de inlog-status
    const isIngelogd = await checkUser();
    console.log("Status check - Ingelogd:", isIngelogd);

    container.style.display = 'none';
    if (updateTime) updateTime.style.display = 'none';
    detailView.style.display = 'block';
    window.scrollTo(0, 0);

    const datum = new Date(artikel.date).toLocaleDateString(huidigeTaal === 'nl' ? 'nl-NL' : 'en-US', {
        day: 'numeric',
        month: 'long'
    });

    // 2. Logica voor de "Betaalmuur"
    let displayContent = artikel.summary;
    let paywallHTML = "";

    if (!isIngelogd) {
        const woorden = artikel.summary.split(' ');
        if (woorden.length > 60) {
            displayContent = woorden.slice(0, 60).join(' ') + "...";
            paywallHTML = `
            <div class="paywall-overlay">
                <div class="paywall-content">
                    <h3>✨ ${huidigeTaal === 'nl' ? 'Lees het volledige artikel' : 'Read the full 500+ word article'}</h3>
                    <p>${huidigeTaal === 'nl' ? 'Log in op je Bright account om verder te lezen.' : 'Log in to your Bright account to continue.'}</p>
                    <button onclick="window.location.href='profiel.html'" class="btn-primary-editorial">
                        ${huidigeTaal === 'nl' ? 'Gratis inloggen' : 'Login for Free'}
                    </button>
                </div>
            </div>`;
        }
    }

    // 3. Bouw de HTML op (één keer toewijzen!)
    detailView.innerHTML = `
        <article class="detail-container">
            <button onclick="terugNaarOverzicht()" class="back-btn-float">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                ${huidigeTaal === 'nl' ? 'Terug' : 'Back'}
            </button>

            <div class="detail-hero">
                <img src="${artikel.image || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200'}" 
                     class="detail-img" alt="${artikel.title}">
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
            
            ${isIngelogd ? `
            <footer class="detail-footer">
                <a href="${artikel.link}" target="_blank" class="source-link">
                    ${huidigeTaal === 'nl' ? 'Lees origineel op' : 'Read full article on'} ${artikel.source}
                </a>
            </footer>` : ''}
        </article>
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

// Global scope binding
window.laadNieuws = laadNieuws;
window.toonDetail = toonDetail;
window.wisselTaal = wisselTaal;
window.terugNaarOverzicht = terugNaarOverzicht;

// Start de app
laadNieuws('en');