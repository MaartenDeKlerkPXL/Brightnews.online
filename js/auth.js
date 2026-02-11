// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    // Alleen listener toevoegen als de 'show-register' knop bestaat
    if (showRegister && loginForm && registerForm) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    // Alleen listener toevoegen als de 'show-login' knop bestaat
    if (showLogin && loginForm && registerForm) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    console.log('Auth module veilig geladen ✨');
});
export const auth = {
    isIngelogd: () => localStorage.getItem('user_session') !== null,

    login: (email, password) => {
        // Hier komt later de echte check met de database
        if (email && password) {
            localStorage.setItem('user_session', JSON.stringify({ email, name: 'Bright User' }));
            return true;
        }
        return false;
    },

    logout: () => {
        localStorage.removeItem('user_session');
        window.location.href = 'index.html';
    }
};

// Update de profiel-icoon kleur als je bent ingelogd
export function updateAuthUI() {
    const profileIcon = document.querySelector('.profile-icon');
    if (profileIcon && auth.isIngelogd()) {
        profileIcon.style.color = '#4CAF50'; // Wordt groen als je bent ingelogd
    }
}
async function handleAuth(event, type) {
    event.preventDefault();

    const email = type === 'login' ? document.getElementById('login-email').value : document.getElementById('reg-email').value;
    const password = type === 'login' ? document.getElementById('login-password').value : document.getElementById('reg-password').value;
    const name = type === 'register' ? document.getElementById('reg-name').value : '';

    console.log(`📡 Poging tot ${type} voor:`, email);

    if (type === 'register') {
        // ACCOUNT AANMAKEN
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { full_name: name }
            }
        });

        if (error) {
            console.error("❌ Registratie fout:", error.message);
            alert("Fout bij registreren: " + error.message);
        } else {
            console.log("✅ Registratie gelukt!", data);
            alert("Check je email voor de bevestigingslink!");
        }
    } else {
        // INLOGGEN
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error("❌ Login fout:", error.message);
            alert("Inloggen mislukt: " + error.message);
        } else {
            console.log("✅ Login succesvol!", data);
            localStorage.setItem('user_session', JSON.stringify(data.session));
            window.location.href = 'index.html';
        }
    }
}