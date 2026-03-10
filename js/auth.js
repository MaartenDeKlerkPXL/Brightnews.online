// --- 1. UI HELPERS & NOTIFICATIES ---

// Wisselen tussen Login en Registratie formulier
function toggleAuth(event) {
    if (event) event.preventDefault();
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
    }
}

// Update de tekst in de taal-dropdown tijdens registratie
function updateLangLabel(langName) {
    const label = document.getElementById('selected-lang-label');
    const details = document.getElementById('register-lang-details');
    if (label) label.innerText = langName;
    if (details) details.removeAttribute('open'); // Klap menu dicht na keuze
}

// Toon meldingen op het scherm
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type} show`;
    notification.innerText = (type === 'success' ? '✅ ' : '❌ ') + message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

// --- 2. AUTHENTICATIE LOGICA ---

async function handleAuth(event, type) {
    event.preventDefault();
    const client = window.supabaseClient;
    if (!client) return showNotification("Database niet bereikbaar.", "error");

    const email = type === 'login' ? document.getElementById('login-email').value : document.getElementById('reg-email').value;
    const password = type === 'login' ? document.getElementById('login-password').value : document.getElementById('reg-password').value;

    try {
        if (type === 'register') {
            const name = document.getElementById('reg-name').value;
            const promoCode = document.getElementById('register-promo').value.trim().toUpperCase();
            // Pak de geselecteerde taal uit de radio-buttons
            const selectedLang = document.querySelector('input[name="reg-lang"]:checked')?.value || 'en';

            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        preferred_lang: selectedLang, // Slaat de taal op in de database
                        is_premium: false,
                        pending_promo: promoCode || null
                    }
                }
            });
            if (error) throw error;

            if (promoCode !== "") {
                showNotification("Account aangemaakt! Doorsturen naar betaling... 💳", "success");
                setTimeout(() => window.location.href = "https://buy.stripe.com/test_00w9AV2wRfsyefs7Lv5c402", 1500);
            } else {
                showNotification(`Welkom ${name}! Je bent geregistreerd. ✨`, "success");
                setTimeout(() => window.location.href = 'profiel.html', 1500);
            }
        } else {
            // INLOGGEN
            const { error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showNotification("Welkom terug! 😊", "success");
            setTimeout(() => window.location.href = 'Home.html', 1000);
        }
    } catch (error) {
        showNotification(error.message, "error");
    }
}

async function handleLogout() {
    try {
        await window.supabaseClient.auth.signOut();
        showNotification("Succesvol uitgelogd! 👋", "success");
        setTimeout(() => window.location.href = 'Home.html', 1500);
    } catch (err) {
        showNotification("Uitloggen mislukt.", "error");
    }
}

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

    console.log('BrightNews Architecture geladen 🚀');
});

// index.js of main.js
function applyPremiumFeatures() {
    const isPremium = localStorage.getItem('brightNews_Premium') === 'true';

    if (isPremium) {
        document.body.classList.add('is-premium-user');
        console.log("BrightNews Shine Actief! ✨");
        // Hier kun je advertenties verbergen of extra content tonen
    }
}

document.addEventListener('DOMContentLoaded', applyPremiumFeatures);

// Kleur van profiel-icoon in nav aanpassen
async function updateAuthUI() {
    const profileIcons = document.querySelectorAll('.profile-icon, .profile-link-text');
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    profileIcons.forEach(icon => {
        icon.style.color = session ? '#4CAF50' : '';
    });
}

// --- 4. PAGINA INITIALISATIE ---

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) return;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();

        if (user) {
            // Gebruiker is ingelogd: toon profiel, verberg formulieren
            document.getElementById('login-form')?.classList.add('hidden');
            document.getElementById('register-form')?.classList.add('hidden');
            document.getElementById('profile-view')?.classList.remove('hidden');
            updateProfileUI(user);
        } else {
            // Niet ingelogd: toon login (tenzij we niet op de profielpagina zijn)
            if (document.getElementById('login-form')) {
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('profile-view')?.classList.add('hidden');
            }
        }
        updateAuthUI();
    } catch (err) {
        console.error("Initialisatie fout:", err.message);
    }
});
async function updateProfileUI(user) {
    const meta = user.user_metadata;
    // Check op alle mogelijke manieren hoe Supabase 'true' kan teruggeven
    const isPremium = meta?.is_premium === true || meta?.is_premium === 'true';
    const userLang = meta?.preferred_lang;

    console.log("Inlog check - Is Premium:", isPremium); // Voor jou om te debuggen in de console

    // A. Badge & Email
    const emailDisplay = document.getElementById('user-email-display');
    const badge = document.getElementById('premium-status-badge');

    if (emailDisplay) emailDisplay.innerText = user.email;

    if (badge) {
        const statusKey = isPremium ? 'badge_premium' : 'badge_free';
        badge.setAttribute('data-i18n', statusKey);
        badge.innerText = getT(statusKey);
        badge.className = `badge ${isPremium ? 'badge-premium' : 'badge-free'}`;
    }

    // B. Secties tonen/verbergen
    const upgradeSection = document.getElementById('upgrade-section');
    const promoSection = document.getElementById('discount-section-container');
    if (upgradeSection) upgradeSection.style.display = isPremium ? 'none' : 'block';
    if (promoSection) promoSection.style.display = isPremium ? 'none' : 'block';

    // C. Lokale status opslaan voor andere pagina's
    if (isPremium) {
        localStorage.setItem('brightNews_Premium', 'true');
    } else {
        localStorage.removeItem('brightNews_Premium');
    }

    const expiryDate = meta?.premium_until || null; // Dit haalt de datum uit Supabase

    if (typeof renderSubscriptionUI === 'function') {
        renderSubscriptionUI(isPremium, expiryDate);
    }}

// Kortingscode logica
async function applyDiscountCode() {
    const code = document.getElementById('promo-code')?.value.trim().toUpperCase();
    if (code === "BRIGHT3") {
        showNotification("Code geaccepte帯! Doorsturen naar Stripe... 💳", "success");
        setTimeout(() => window.location.href = "https://buy.stripe.com/test_00w9AV2wRfsyefs7Lv5c402", 1500);
    } else {
        showNotification("Ongeldige code.", "error");
    }
}
// --- 5. CUSTOM ACCOUNT VERWIJDEREN LOGICA ---

// 1. Open het venster
function handleDeleteAccount() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Zorg dat de tekst in de modal ook vertaald is
        if (typeof vertaalStatischeTeksten === 'function') {
            vertaalStatischeTeksten(window.huidigeTaal);
        }
    }
}

// 2. Sluit het venster
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'none';
}

async function executeDelete() {
    try {
        const client = window.supabaseClient;
        const { data: { user } } = await client.auth.getUser();

        if (user) {
            // STAP 1: Markeer het account in de database als "te verwijderen"
            // Dit is de veiligste manier in de frontend.
            // In auth.js:
            await client.auth.updateUser({
                data: {
                    delete_requested: 'true' // Dit moet een string zijn ('')
                }
            });
            // STAP 2: Toon de vertaalde melding
            closeDeleteModal();
            const successMsg = getT('delete_request_sent', "Account marked for deletion.");
            showNotification(successMsg, "success");

            // STAP 3: Log de gebruiker uit na een korte pauze
            setTimeout(async () => {
                await client.auth.signOut();
                window.location.href = 'index.html';
            }, 2500);
        }
    } catch (err) {
        console.error("Fout:", err);
        showNotification("Error", "error");
        closeDeleteModal();
    }
}

// Maak alles beschikbaar voor de HTML
window.handleDeleteAccount = handleDeleteAccount;
window.closeDeleteModal = closeDeleteModal;
window.executeDelete = executeDelete;