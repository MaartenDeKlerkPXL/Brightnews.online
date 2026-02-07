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
