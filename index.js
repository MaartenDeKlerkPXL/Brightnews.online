let huidigeTaal = 'nl';
let alleArtikelen = [];

async function laadNieuws(taal) {
    huidigeTaal = taal;
    const res = await fetch(`data/news_${taal}.json?t=${Date.now()}`);
    alleArtikelen = await res.json();

    // Check of we naar een detailpagina moeten kijken
    const urlParams = new URLSearchParams(window.location.search);
    const artikelId = urlParams.get('id');

    if (artikelId) {
        toonDetail(artikelId);
    } else {
        renderLijst(alleArtikelen);
    }
}

function getAfbeelding(artikel, index) {
    if (artikel.image) return artikel.image;
    // Gebruik een unieke vrolijke foto van Unsplash op basis van index
    return `https://images.unsplash.com/photo-${1500000000000 + index}?auto=format&fit=crop&w=800&q=80&sig=${index}`;
}

function renderLijst(artikelen) {
    document.getElementById('detail-view').style.display = 'none';
    const container = document.getElementById('news-container');
    container.style.display = 'grid';
    container.innerHTML = '';

    artikelen.forEach((artikel, index) => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.onclick = () => { window.location.search = `?id=${artikel.id}`; };

        card.innerHTML = `
            <img src="${getAfbeelding(artikel, index)}" class="card-img" alt="news">
            <div class="card-content">
                <span class="source-tag">${artikel.source}</span>
                <h3>${artikel.title}</h3>
                <p>${artikel.summary.substring(0, 80)}...</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function toonDetail(id) {
    const artikel = alleArtikelen.find(a => a.id === id);
    if (!artikel) return;

    document.getElementById('news-container').style.display = 'none';
    const detail = document.getElementById('detail-view');
    detail.style.display = 'block';

    detail.innerHTML = `
        <button onclick="window.location.search=''" class="back-btn">← Terug</button>
        <img src="${getAfbeelding(artikel, 99)}" class="detail-img">
        <h1>${artikel.title}</h1>
        <p class="detail-source">Bron: <strong>${artikel.source}</strong></p>
        <div class="detail-text">
            <p>${artikel.summary}</p>
        </div>
        <a href="${artikel.link}" target="_blank" class="read-original">Lees het originele artikel op ${artikel.source} →</a>
    `;
}