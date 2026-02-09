// index.js - Gecorrigeerde versie

// Gebruik async om await mogelijk te maken
async function toonNieuws() {
    const container = document.getElementById('news-container');
    if (!container) return;

    try {
        const response = await fetch('./data/news_nl.json');
        const artikelen = await response.json();

        renderLijst(artikelen);
    } catch (fout) {
        console.error("Fout bij laden:", fout);
    }
}

// Nieuwe async functie voor het wisselen van taal
async function wisselTaal(lang, label, event) {
    // Voorkom 'Deprecated symbol' waarschuwing door het event netjes af te handelen
    if (event) event.preventDefault();

    const langBtn = document.getElementById('current-lang');
    if (langBtn) {
        langBtn.innerHTML = `${label} <span class="arrow">▼</span>`;
    }

    const container = document.getElementById('news-container');
    container.innerHTML = '<p>Laden...</p>';

    try {
        const response = await fetch(`./data/news_${lang}.json`);
        if (!response.ok) throw new Error("Taalbestand niet gevonden");

        const artikelen = await response.json();
        renderLijst(artikelen);
    } catch (fout) {
        console.error(fout);
        container.innerHTML = `<p>Nieuws voor ${label} is nog niet klaar.</p>`;
    }
}

function renderLijst(artikelen) {
    const container = document.getElementById('news-container');
    container.innerHTML = '';

    artikelen.forEach(artikel => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `<h3>${artikel.title}</h3><a href="${artikel.link}" target="_blank">Lees meer</a>`;
        container.appendChild(card);
    });
}

// Start de eerste laadbeurt en vang eventuele errors op
toonNieuws().catch(err => console.error(err));

function renderLijst(artikelen) {
    const container = document.getElementById('news-container');
    const timeDisplay = document.getElementById('update-time');

    container.innerHTML = '';

    if (artikelen.length > 0) {
        // Pak de datum van het nieuwste artikel
        const laatsteUpdate = new Date(artikelen[0].date);
        const tijdString = laatsteUpdate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        const datumString = laatsteUpdate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });

        timeDisplay.innerHTML = `✨ Laatste scan: ${datumString} om ${tijdString}`;

        artikelen.forEach(artikel => {
            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <div class="card-tag">Bright News</div>
                <h3>${artikel.title}</h3>
                <div class="card-footer">
                    <a href="${artikel.link}" target="_blank" class="read-more">Lees meer →</a>
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        timeDisplay.innerHTML = "❌ Geen nieuws gevonden voor deze taal.";
    }
}