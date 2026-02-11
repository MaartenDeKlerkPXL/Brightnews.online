let huidigeTaal = 'en'; // 1. Start nu standaard in het Engels
let alleArtikelen = [];

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
                <p>${artikel.summary ? artikel.summary.substring(0, 85) + '...' : knopTekst + '...'}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            window.history.pushState({}, '', `?id=${veiligId}`);
            toonDetail(veiligId);
        });

        container.appendChild(card);
    });
}

function toonDetail(id) {
    const artikel = alleArtikelen.find(a => a.id == id);
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');
    const updateTime = document.getElementById('update-time');

    if (!artikel) {
        window.history.pushState({}, '', window.location.pathname);
        renderLijst(alleArtikelen);
        return;
    }

    container.style.display = 'none';
    if (updateTime) updateTime.style.display = 'none';

    detailView.style.display = 'block';
    window.scrollTo(0, 0);

    const datum = new Date(artikel.date).toLocaleDateString(huidigeTaal === 'nl' ? 'nl-NL' : 'en-US', { day: 'numeric', month: 'long' });
    const terugTekst = huidigeTaal === 'nl' ? 'Terug' : 'Back';
    const leesMeerTekst = huidigeTaal === 'nl' ? 'Lees het volledige artikel op' : 'Read the full article on';

    detailView.innerHTML = `
            <button onclick="terugNaarOverzicht()" class="back-btn-float">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                ${terugTekst}
            </button>

            <div class="detail-hero">
                <img src="${artikel.image || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200'}" class="detail-img">
            </div>
            
            <header class="detail-header">
                <div class="detail-meta">
                    <span class="detail-date">${datum}</span>
                </div>
                <h1>${artikel.title}</h1>
            </header>
            
            <section class="article-body">
                <p>${artikel.summary}</p>
            </section>
            
            <footer class="detail-footer">
                <a href="${artikel.link}" target="_blank" class="source-link">
                    ${leesMeerTekst} ${artikel.source}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>
            </footer>
       
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