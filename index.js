// index.js - De brug tussen data en beeld
async function toonNieuws() {
    const container = document.getElementById('news-container');

    try {
        // 1. Haal de data op die je backend zojuist heeft gegenereerd
        const response = await fetch('./data/news_nl.json');
        const artikelen = await response.json();

        // Maak de container leeg (verwijder de laad-tekst)
        container.innerHTML = '';

        if (artikelen.length === 0) {
            container.innerHTML = '<p>Nog geen positief nieuws gevonden. Kom later terug!</p>';
            return;
        }

        // 2. Loop door elk artikel en maak een kaartje
        artikelen.forEach(artikel => {
            const card = document.createElement('div');
            card.className = 'news-card';

            card.innerHTML = `
                <div class="card-content">
                    <small>✨ Positief Nieuws</small>
                    <h3>${artikel.title}</h3>
                    <a href="${artikel.link}" target="_blank" class="read-more">Lees volledig bericht →</a>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (fout) {
        console.error("Kon het nieuws niet laden:", fout);
        container.innerHTML = '<p>Oeps! Er ging iets mis bij het laden van het vrolijke nieuws.</p>';
    }
}

// Start het laden als de pagina opstart
toonNieuws();
async function wisselTaal(lang, label) {
    // Voorkom dat de pagina verspringt
    if (event) event.preventDefault();

    // Update de knop
    document.getElementById('current-lang').innerText = label;

    const container = document.getElementById('news-container');
    container.innerHTML = '<div class="loader">Positieve vibes worden vertaald...</div>';

    try {
        const response = await fetch(`./data/news_${lang}.json`);
        // Check of het bestand wel bestaat
        if (!response.ok) throw new Error("Bestand niet gevonden");

        const artikelen = await response.json();
        container.innerHTML = '';

        if (artikelen.length === 0) {
            container.innerHTML = `<p>De AI is nog bezig met het vertalen van het nieuws naar het ${label.split(' ')[1]}.</p>`;
            return;
        }

        artikelen.forEach(item => {
            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <h3>${item.title}</h3>
                <a href="${item.link}" target="_blank" class="read-more">Lees bericht →</a>
            `;
            container.appendChild(card);
        });
    } catch (fout) {
        console.error(fout);
        container.innerHTML = `<p>Oeps! De data voor ${label} is nog niet klaar. Draai je AI-script op je Mac.</p>`;
    }
}
