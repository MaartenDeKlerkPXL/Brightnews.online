// js/auth.js

// 1. UI Toggle Logica: Wisselen tussen Login en Registratie formulieren
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    if (showRegister && loginForm && registerForm) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLogin && loginForm && registerForm) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    console.log('Auth module veilig geladen ✨');
});

// 2. Centrale Auth Functie
async function handleAuth(event, type) {
    event.preventDefault();

    // Altijd de globale client gebruiken die in profiel.html is aangemaakt
    const client = window.supabaseClient;

    if (!client) {
        console.error("❌ FOUT: Supabase client niet gevonden op 'window'.");
        alert("Systeemfout: Verbinding met database mislukt.");
        return;
    }

    const email = type === 'login' ?
        document.getElementById('login-email').value :
        document.getElementById('reg-email').value;
    const password = type === 'login' ?
        document.getElementById('login-password').value :
        document.getElementById('reg-password').value;

    console.log(`📡 Poging tot ${type} voor:`, email);

    try {
        if (type === 'register') {
            const name = document.getElementById('reg-name').value;
            const { data, error } = await client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { full_name: name }
                }
            });

            if (error) throw error;

            console.log("✅ Registratie gelukt!", data);
            alert("Check je email voor de bevestigingslink! Pas daarna kun je inloggen.");
        } else {
            // INLOGGEN
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            console.log("✅ Login succesvol!", data);
            // Supabase regelt de sessie nu zelf, we hoeven geen handmatige localStorage meer te doen
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error(`❌ ${type} fout:`, error.message);
        alert(error.message === "Invalid login credentials"
            ? "E-mailadres of wachtwoord is onjuist."
            : error.message);
    }
}

// 3. UI Helper: Update profiel-icoon kleur
async function updateAuthUI() {
    const profileIcon = document.querySelector('.profile-icon');
    if (!profileIcon || !window.supabaseClient) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session) {
        profileIcon.style.color = '#4CAF50'; // Groen bij inlog
    } else {
        profileIcon.style.color = ''; // Standaard kleur
    }
}