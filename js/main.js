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
    const currentPath = window.location.pathname.split("/").pop() || "Home.html";
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // 2. Vertalingen toepassen (Met veiligheidscheck voor keys)
    function applyTranslations(lang) {
        // We halen de data direct uit het globale window object
        const translations = window.translations;

        if (!translations || !translations[lang]) {
            console.warn(`⚠️ Vertalingen voor ${lang} niet gevonden.`);
            return;
        }

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang][key]) {
                // Check of het een input-veld is (voor placeholders) of gewone tekst
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[lang][key];
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });
        console.log(`Taal succesvol toegepast: ${lang} ✨`);
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

// index.js of main.js
function applyPremiumFeatures() {
    const isPremium = localStorage.getItem('brightNews_Premium') === 'true';

    if (isPremium) {
        document.body.classList.add('is-premium-user');
        console.log("Bright News Shine Actief! ✨");
        // Hier kun je advertenties verbergen of extra content tonen
    }
}

document.addEventListener('DOMContentLoaded', applyPremiumFeatures);