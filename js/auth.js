// 1. UI Toggle Logica: Wisselen tussen Login en Registratie
// We gebruiken de functie die we in de HTML hebben afgesproken voor consistentie
function toggleAuth(event) {
    if (event) event.preventDefault();

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm && registerForm) {
        loginForm.classList.toggle('hidden');
        registerForm.classList.toggle('hidden');
    }
}

// 2. Centrale Auth Functie
async function handleAuth(event, type) {
    event.preventDefault();

    const client = window.supabaseClient;

    if (!client) {
        console.error("❌ Supabase client niet gevonden.");
        showNotification("Systeemfout: Database niet bereikbaar.", "error");
        return;
    }

    const email = type === 'login' ?
        document.getElementById('login-email').value :
        document.getElementById('reg-email').value;
    const password = type === 'login' ?
        document.getElementById('login-password').value :
        document.getElementById('reg-password').value;

    try {
        if (type === 'register') {
            const name = document.getElementById('reg-name').value;
            const { data, error } = await client.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: name } }
            });

            if (error) throw error;
            showNotification("Check je inbox voor de bevestigingslink! ✨", "info");
            toggleAuth(); // Ga terug naar login scherm
        } else {
            // INLOGGEN
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            showNotification("Welkom terug! 😊", "success");

            // Wacht heel even zodat ze de melding kunnen zien voor de redirect
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        console.error(`❌ ${type} fout:`, error.message);
        let errorMsg = error.message;

        if (error.message === "Invalid login credentials") {
            errorMsg = "E-mailadres of wachtwoord is onjuist.";
        }

        showNotification(errorMsg, "error");
    }
}

// 3. UI Helper: Update profiel-icoon kleur
async function updateAuthUI() {
    const profileIcons = document.querySelectorAll('.profile-icon, .profile-link-text');
    if (!profileIcons.length || !window.supabaseClient) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    profileIcons.forEach(icon => {
        if (session) {
            icon.style.color = '#4CAF50'; // Bright Green bij inlog
        } else {
            icon.style.color = ''; // Standaard kleur
        }
    });
}

// Roep de UI update aan bij het laden
document.addEventListener('DOMContentLoaded', updateAuthUI);