let huidigeTaal = 'nl';
let alleArtikelen = [];

async function laadNieuws(taal) {
    try {
        huidigeTaal = taal;
        // De ?v=... zorgt dat we altijd de allernieuwste data van GitHub trekken
        const res = await fetch(`data/news_${taal}.json?v=${Date.now()}`);
        alleArtikelen = await res.json();

        console.log("Artikelen ingeladen:", alleArtikelen.length);

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

    container.style.display = 'grid';
    detailView.style.display = 'none';
    container.innerHTML = '';

    artikelen.forEach((artikel, index) => {
        const card = document.createElement('div');
        card.className = 'news-card';

        // Foto logica: RSS foto > Unsplash reserve > grijze placeholder
        const imgSrc = artikel.image || `https://images.unsplash.com/photo-${1500000000000 + index}?w=800&auto=format&fit=crop&q=60&sig=${index}`;

        card.innerHTML = `
            <img src="${imgSrc}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'">
            <div class="card-content">
                <div class="source-tag">${artikel.source}</div>
                <h3>${artikel.title}</h3>
                <p>${artikel.summary ? artikel.summary.substring(0, 85) + '...' : 'Klik voor het hele verhaal.'}</p>
            </div>
        `;
        // Klikken gaat naar de detailpagina, NIET direct naar de externe link
        card.onclick = () => {
            window.history.pushState({}, '', `?id=${artikel.id}`);
            toonDetail(artikel.id);
        };
        container.appendChild(card);
    });
}

function toonDetail(id) {
    const artikel = alleArtikelen.find(a => a.id == id);
    const container = document.getElementById('news-container');
    const detailView = document.getElementById('detail-view');

    if (!artikel) return renderLijst(alleArtikelen);

    container.style.display = 'none';
    detailView.style.display = 'block';

    detailView.innerHTML = `
        <button onclick="window.location.search=''" class="back-btn">← Terug naar overzicht</button>
        <article class="full-article">
            <img src="${artikel.image || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800'}" class="detail-img">
            <div class="source-tag">${artikel.source}</div>
            <h1>${artikel.title}</h1>
            <div class="article-body">
                <p>${artikel.summary}</p>
            </div>
            <hr>
            <p>Wil je het volledige verhaal lezen?</p>
            <a href="${artikel.link}" target="_blank" class="source-link">Lees origineel op ${artikel.source} →</a>
        </article>
    `;
}

// Deze functie koppelt jouw knoppen aan de lader
function wisselTaal(taal, vlagTekst, event) {
    if (event) event.preventDefault();

    // Update de knop tekst
    document.getElementById('current-lang').innerHTML = `${vlagTekst} <span class="arrow">▼</span>`;

    // Laad het nieuws in de juiste taal
    laadNieuws(taal);
}

// Zorg dat de tijdstempel ook wordt getoond
function updateTijdstempel(artikelen) {
    if (artikelen.length > 0) {
        const datum = new Date(artikelen[0].date);
        const opties = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
        document.getElementById('update-time').innerText = `✨ Laatste scan: ${datum.toLocaleDateString('nl-NL', opties)}`;
    }
}

// Start de boel
laadNieuws('nl');