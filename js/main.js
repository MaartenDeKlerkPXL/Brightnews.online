// Bright News - Frontend Logic
document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('news-grid');
    let currentLang = 'nl';

    // Functie om nieuws te laden op basis van taal
    const loadNews = async (lang) => {
        try {
            // Verwijst naar de /data structuur uit het projectplan
            const response = await fetch(`./data/news_${lang}.json`);
            const data = await response.json();
            renderNews(data.articles);
        } catch (error) {
            newsGrid.innerHTML = `<p>Geen nieuws gevonden voor deze taal. De AI-engine verwerkt de data tussen 10:00 en 12:00.</p>`;
        }
    };

    const renderNews = (articles) => {
        newsGrid.innerHTML = '';
        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h2>${article.title}</h2>
                <p>${article.summary}</p>
                <small>Bron: ${article.source} | Score: ${article.sentiment_score}</small>
            `;
            newsGrid.appendChild(card);
        });
    };

    // Taalwisselaar logica
    document.querySelectorAll('#language-switcher button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentLang = e.target.getAttribute('data-lang');
            loadNews(currentLang);
        });
    });

    // Initiële load
    loadNews(currentLang);
    console.log('Happy developing ✨'); // Referentie naar index.js
});
//js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Markeer de actieve pagina in de navigatie
    const currentPath = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    console.log('Navigatie geïnitialiseerd 🚀');
});
document.addEventListener('DOMContentLoaded', () => {
    // Taal selectie afhandelen
    const langLinks = document.querySelectorAll('.dropdown-content a');
    langLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = link.getAttribute('data-lang');
            console.log('Geselecteerde taal:', lang);
            // Hier kun je de logica toevoegen om de juiste news.json te laden
        });
    });

    console.log('Navigatie succesvol aangepast: Taal links, Nav wit. 🚀');
});
// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.querySelector('.news-grid');

    // Functie om nieuws op te halen
    async function fetchNews(lang = 'nl') {
        try {
            // Toekomstige AI-data ophalen
            const response = await fetch(`./data/news_${lang}.json`);
            const data = await response.json();
            renderNews(data.articles);
        } catch (error) {
            console.error("Kon het positieve nieuws niet laden:", error);
            newsGrid.innerHTML = "<p>De AI bereidt het nieuws voor. Kom om 12:00 uur terug! ✨</p>";
        }
    }

    // Functie om kaarten te bouwen
    function renderNews(articles) {
        newsGrid.innerHTML = ''; // Maak grid leeg
        articles.forEach(article => {
            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <span class="card-tag">${article.category}</span>
                <h3>${article.title}</h3>
                <p>${article.summary}</p>
                <div class="card-footer" style="margin-top: auto; font-size: 0.8rem; color: var(--bright-green);">
                    Sentiment: ${(article.sentiment_score * 100).toFixed(0)}% Positief
                </div>
            `;
            newsGrid.appendChild(card);
        });
    }

    // Start met laden
    fetchNews('nl');
});
document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('news-grid');

    async function loadNews() {
        try {
            // Haal de JSON data op
            const response = await fetch('./data/news_nl.json');
            const data = await response.json();

            // Maak het grid leeg voor de zekerheid
            newsGrid.innerHTML = '';

            // Loop door elk artikel en maak een kaartje
            data.articles.forEach(article => {
                const card = document.createElement('a');
                card.href = article.url;
                card.className = 'news-card';

                card.innerHTML = `
                    <span class="card-tag">${article.category}</span>
                    <h3>${article.title}</h3>
                    <p>${article.summary}</p>
                    <div class="card-footer">
                        <span class="source">Bron: ${article.source}</span>
                        <span class="read-more">Lees verder →</span>
                    </div>
                `;

                newsGrid.appendChild(card);
            });

            console.log('Nieuws succesvol ingeladen ✨');
        } catch (error) {
            console.error('Fout bij het laden van het nieuws:', error);
            newsGrid.innerHTML = '<p>Oeps! De positieve energie kon niet worden geladen. Probeer het later opnieuw.</p>';
        }
    }

    // Start de functie
    loadNews();
});
document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('bright_lang') || 'nl';

    async function applyTranslations(lang) {
        try {
            const response = await fetch('./data/translations.json');
            const translations = await response.json();

            // Zoek alle elementen met data-i18n en vervang de tekst
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[lang][key]) {
                    el.textContent = translations[lang][key];
                }
            });

            console.log(`Website vertaald naar: ${lang} ✨`);
        } catch (error) {
            console.error("Fout bij laden vertalingen:", error);
        }
    }

    // Functie voor taalwissel
    window.changeLanguage = (lang) => {
        currentLang = lang;
        localStorage.setItem('bright_lang', lang);
        applyTranslations(lang);
        if (typeof loadNews === "function") loadNews(lang); // Laad ook de AI-artikelen
    };

    // Event listener voor de dropdown links
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = link.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });

    // Initiële load
    applyTranslations(currentLang);
    console.log('Happy developing ✨');
});