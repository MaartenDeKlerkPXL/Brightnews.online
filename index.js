let huidigeTaal = 'en'; // 1. Start nu standaard in het Engels
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

        // Check of we een artikel moeten tonen op basis van de URL
        const urlParams = new URLSearchParams(window.location.search);
        const artikelId = urlParams.get('id');

        if (artikelId) {
            toonDetail(artikelId);
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

    container.style.display = 'grid';
    detailView.style.display = 'none';
    if (updateTime) updateTime.style.display = 'block';
    container.innerHTML = '';

    artikelen.forEach((artikel, index) => {
        const veiligId = artikel.id || `old-${index}`;
        const card = document.createElement('div');
        card.className = 'news-card';

        const imgSrc = artikel.image || `https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&sig=${index}`;

        // Tekst op de knop afhankelijk van taal
        const knopTekst = huidigeTaal === 'nl' ? 'Lees meer' : 'Read more';

        card.innerHTML = `
    <img src="${imgSrc}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1546422904-90eabf3cab3a?w=800'">
    <div class="card-content">
        <div class="source-tag">${artikel.source}</div>
        <h3>${artikel.title}</h3>
        <p>${artikel.summary ? artikel.summary : (huidigeTaal === 'nl' ? 'Lees het volledige verhaal.' : 'Read the full story.')}</p>
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
    const artikel = alleArtikelen.find(a => a.id == id);
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');

    // Check of de gebruiker echt is ingelogd via Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const isIngelogd = session !== null;

    if (!artikel) return;

    container.style.display = 'none';
    detailView.style.display = 'block';
    window.scrollTo(0, 0);

    let displayContent = artikel.summary;
    let paywallHTML = "";

    // Paywall: Als je niet bent ingelogd, zie je maar 15% van de tekst
    if (!isIngelogd) {
        const woorden = artikel.summary.split(' ');
        if (woorden.length > 60) {
            displayContent = woorden.slice(0, 60).join(' ') + "...";
            paywallHTML = `
                <div class="paywall-overlay">
                    <h3>✨ Unlock the full story</h3>
                    <p>Become a Bright Member to read the full 500+ word article.</p>
                    <button onclick="window.location.href='profiel.html'" class="btn-primary-editorial">Join for Free</button>
                </div>
            `;
        }
    }

    detailView.innerHTML = `
        <article class="detail-container">
            <button onclick="terugNaarOverzicht()" class="back-btn-float">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back
            </button>
            <div class="detail-hero">
                <img src="${artikel.image}" class="detail-img">
            </div>
            <div class="detail-header">
                <h1>${artikel.title}</h1>
            </div>
            <div class="article-body">
                <p>${displayContent}</p>
                ${paywallHTML}
            </div>
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

    // We roepen alleen de lader aan; die kijkt zelf of we op een ID zitten of niet
    laadNieuws(taal);
}

window.laadNieuws = laadNieuws;
window.toonDetail = toonDetail;
window.wisselTaal = wisselTaal;
window.terugNaarOverzicht = terugNaarOverzicht;

// Start de app in het ENGELS
laadNieuws('en');