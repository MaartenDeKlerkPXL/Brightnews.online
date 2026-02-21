// --- GLOBALE FUNCTIES (beschikbaar voor onclick in HTML) ---

// Handmatige activatie van Glow
function activateGlow() {
    const inputField = document.getElementById('glowCode');
    if (!inputField) return;

    const inputCode = inputField.value.trim();
    const secretCode = "BRIGHT-GLOW-2024";

    if (inputCode === secretCode) {
        localStorage.setItem('member_status', 'glow');
        alert("Succes! Je bent nu een Glow member. ✨");
        updateUIForGlow();
    } else {
        alert("Ongeldige code. Probeer het opnieuw.");
    }
}

// Update de interface voor Glow members
function updateUIForGlow() {
    const status = localStorage.getItem('member_status');
    if (status === 'glow') {
        document.body.classList.add('user-is-glow');
        const glowCard = document.querySelector('.price-card.popular');
        if (glowCard) {
            glowCard.innerHTML = "<h3>Je bent een Glow Member! 🌟</h3><p>Bedankt voor je steun.</p>";
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('bright_lang') || 'nl';

    // 1. Navigatie markeren
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // 2. Vertalingen toepassen (Met veiligheidscheck voor keys)
    async function applyTranslations(lang) {
        try {
            const response = await fetch('./data/translations.json');
            const translations = await response.json();

            if (!translations[lang]) return;

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (translations[lang][key]) {
                    el.textContent = translations[lang][key];
                }
            });
            console.log(`Taal ingesteld op: ${lang} ✨`);
        } catch (error) {
            console.error("Vertaalfout:", error);
        }
    }

    // 3. Nieuws laden (Alleen als news-grid bestaat)
    async function loadNews(lang) {
        const newsGrid = document.getElementById('news-grid') || document.querySelector('.news-grid');
        if (!newsGrid) return;

        try {
            const response = await fetch(`./data/news_${lang}.json`);
            const data = await response.json();

            newsGrid.innerHTML = '';
            data.articles.forEach(article => {
                const card = document.createElement('div');
                card.className = 'news-card';
                card.innerHTML = `
                    <span class="card-tag">${article.category}</span>
                    <h3>${article.title}</h3>
                    <p>${article.summary}</p>
                    <div class="card-footer">Sentiment: ${(article.sentiment_score * 100).toFixed(0)}%</div>
                `;
                newsGrid.appendChild(card);
            });
        } catch (error) {
            newsGrid.innerHTML = '<p>Nieuws even niet beschikbaar. ✨</p>';
        }
    }

    // 4. Initialisatie
    applyTranslations(currentLang);
    loadNews(currentLang);
    updateUIForGlow();

    // 5. Taalwisselaar event listeners
    document.querySelectorAll('.dropdown-content a, #language-switcher button').forEach(el => {
        el.addEventListener('click', (e) => {
            const lang = el.getAttribute('data-lang');
            if (lang) {
                localStorage.setItem('bright_lang', lang);
                location.reload(); // Ververs om alles correct te laden
            }
        });
    });

    console.log('Bright News Architecture geladen 🚀');
});