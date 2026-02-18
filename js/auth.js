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
            setTimeout(() => window.location.href = 'index.html', 1000);
        }
    } catch (error) {
        showNotification(error.message, "error");
    }
}

async function handleLogout() {
    try {
        await window.supabaseClient.auth.signOut();
        showNotification("Succesvol uitgelogd! 👋", "success");
        setTimeout(() => window.location.href = 'index.html', 1500);
    } catch (err) {
        showNotification("Uitloggen mislukt.", "error");
    }
}

// --- 3. PROFIEL & TAAL UPDATES ---

async function updateProfileUI(user) {
    const meta = user.user_metadata;
    const isPremium = meta?.is_premium === true || meta?.is_premium === 'true';
    const userLang = meta?.preferred_lang;

    // A. Email & Badge
    const emailDisplay = document.getElementById('user-email-display');
    const badge = document.getElementById('premium-status-badge');
    if (emailDisplay) emailDisplay.innerText = user.email;
    if (badge) {
        badge.innerText = isPremium ? "Bright Premium ✨" : "Gratis Account";
        badge.className = `badge ${isPremium ? 'badge-premium' : 'badge-free'}`;
    }

    // B. Verberg/Toon secties
    const upgradeSection = document.getElementById('upgrade-section');
    const promoSection = document.getElementById('discount-section-container');
    if (upgradeSection) upgradeSection.style.display = isPremium ? 'none' : 'block';
    if (promoSection) promoSection.style.display = isPremium ? 'none' : 'block';

    // C. Taal instellen op basis van metadata
    if (userLang && typeof wisselTaal === 'function') {
        const langNames = { en: '🇺🇸 English', nl: '🇳🇱 Nederlands', de: '🇩🇪 Deutsch', fr: '🇫🇷 Français', es: '🇪🇸 Español' };
        wisselTaal(userLang, langNames[userLang]);
        localStorage.setItem('selectedLanguage', userLang);
    }

    // D. Premium Countdown
    const countdownDisplay = document.getElementById('premium-countdown');
    if (isPremium && meta?.premium_until && countdownDisplay) {
        const nu = new Date();
        const verloop = new Date(meta.premium_until);
        const dagenOver = Math.ceil((verloop - nu) / (1000 * 60 * 60 * 24));

        if (verloop.getFullYear() > 2090) {
            countdownDisplay.innerHTML = "✨ <strong>Lifetime Premium</strong>";
        } else {
            countdownDisplay.innerHTML = dagenOver > 0 ? `Nog <strong>${dagenOver} dagen</strong> Premium over ☀️` : "";
        }
        countdownDisplay.style.display = 'block';
    }
}

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