// --- 1. UI HELPERS & NOTIFICATIES ---

function toggleAuth(event) {
    if (event) event.preventDefault();
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
    }
}

function updateLangLabel(langName) {
    const label = document.getElementById('selected-lang-label');
    const details = document.getElementById('register-lang-details');
    if (label) label.innerText = langName;
    if (details) details.removeAttribute('open');
}

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
            const selectedLang = document.querySelector('input[name="reg-lang"]:checked')?.value || 'en';

            const { error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        preferred_lang: selectedLang,
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

// --- 3. GLOW & PREMIUM LOGICA ---

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

function applyPremiumFeatures() {
    const isPremium = localStorage.getItem('brightNews_Premium') === 'true';
    if (isPremium) {
        document.body.classList.add('is-premium-user');
        console.log("BrightNews Shine Actief! ✨");
    }
}

// --- 4. INITIALISATIE & EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Synchroniseer taal
    const currentLang = localStorage.getItem('selectedLanguage') || 'nl';
    window.huidigeTaal = currentLang;

    // 2. Navigatie markeren
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // 3. Check Supabase & Update UI (DIT IS DE CRUCIALE STAP)
    if (window.supabaseClient) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (user) {
                // Toon profiel-weergave als er een gebruiker is
                document.getElementById('login-form')?.classList.add('hidden');
                document.getElementById('register-form')?.classList.add('hidden');
                document.getElementById('profile-view')?.classList.remove('hidden');

                // HIER WORDT HIJ AANGEROEPEN:
                await updateProfileUI(user);
            }
            updateAuthUI();
        } catch (err) {
            console.error("Auth init fout:", err.message);
        }
    }

    // 4. Vertalingen uitvoeren
    if (typeof vertaalStatischeTeksten === 'function') {
        vertaalStatischeTeksten(currentLang);
    }
});

async function updateAuthUI() {
    const profileIcons = document.querySelectorAll('.profile-icon, .profile-link-text');
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    profileIcons.forEach(icon => {
        icon.style.color = session ? '#4CAF50' : '';
    });
}

async function updateProfileUI(user) {
    const meta = user.user_metadata;
    const isPremium = meta?.is_premium === true || meta?.is_premium === 'true';

    const emailDisplay = document.getElementById('user-email-display');
    const badge = document.getElementById('premium-status-badge');

    if (emailDisplay) emailDisplay.innerText = user.email;

    if (badge) {
        const statusKey = isPremium ? 'badge_premium' : 'badge_free';
        badge.setAttribute('data-i18n', statusKey);
        // getT komt uit index.js
        if (typeof getT === 'function') badge.innerText = getT(statusKey);
        badge.className = `badge ${isPremium ? 'badge-premium' : 'badge-free'}`;
    }

    const upgradeSection = document.getElementById('upgrade-section');
    const promoSection = document.getElementById('discount-section-container');
    if (upgradeSection) upgradeSection.style.display = isPremium ? 'none' : 'block';
    if (promoSection) promoSection.style.display = isPremium ? 'none' : 'block';

    if (isPremium) {
        localStorage.setItem('brightNews_Premium', 'true');
    } else {
        localStorage.removeItem('brightNews_Premium');
    }

    if (typeof renderSubscriptionUI === 'function') {
        renderSubscriptionUI(isPremium, meta?.premium_until);
    }
    if (typeof vertaalStatischeTeksten === 'function') {
        vertaalStatischeTeksten(window.huidigeTaal);
    }
}

// --- 6. ACCOUNT VERWIJDEREN & ACTIES ---

function handleDeleteAccount() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.style.display = 'flex';
        if (typeof vertaalStatischeTeksten === 'function') {
            vertaalStatischeTeksten(window.huidigeTaal);
        }
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'none';
}

async function executeDelete() {
    try {
        const client = window.supabaseClient;
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            await client.auth.updateUser({ data: { delete_requested: 'true' } });
            closeDeleteModal();
            const successMsg = typeof getT === 'function' ? getT('delete_request_sent') : "Account marked for deletion.";
            showNotification(successMsg, "success");
            setTimeout(async () => {
                await client.auth.signOut();
                window.location.href = 'launch.html';
            }, 2500);
        }
    } catch (err) {
        showNotification("Error", "error");
    }
}

window.handleDeleteAccount = handleDeleteAccount;
window.closeDeleteModal = closeDeleteModal;
window.executeDelete = executeDelete;
window.handleLogout = handleLogout;
window.handleAuth = handleAuth;