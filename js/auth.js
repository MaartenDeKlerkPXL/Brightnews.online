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

    // Haal de basisvelden op
    const email = type === 'login' ?
        document.getElementById('login-email').value :
        document.getElementById('reg-email').value;
    const password = type === 'login' ?
        document.getElementById('login-password').value :
        document.getElementById('reg-password').value;

    try {
        if (type === 'register') {
            // REGISTREREN
            const name = document.getElementById('reg-name').value;
            const promoCode = document.getElementById('register-promo').value.trim().toUpperCase();

            const { data, error } = await client.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        is_premium: false,
                        pending_promo: promoCode !== "" ? promoCode : null
                    }
                }
            });

            if (error) throw error;

            // FLOW LOGICA NA REGISTRATIE
            // Let op: Dit werkt alleen als 'Confirm Email' UIT staat in je Supabase Dashboard!
            if (promoCode !== "") {
                // Gebruiker heeft een code ingevuld -> Naar Stripe voor €1
                showNotification("Account aangemaakt! We sturen je door naar de €1 betaling... 💳", "success");

                setTimeout(() => {
                    // VERVANG DIT DOOR JE ECHTE STRIPE LINK
                    window.location.href = "https://buy.stripe.com/test_00w9AV2wRfsyefs7Lv5c402";
                }, 1500);
            } else {
                // Geen code -> Direct naar profiel (Gratis account)
                showNotification(`Welkom, ${name}! Je account is klaar. ✨`, "success");

                setTimeout(() => {
                    window.location.href = 'profiel.html';
                }, 1500);
            }

        } else {
            // INLOGGEN
            const { data, error } = await client.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            showNotification("Welkom terug! 😊", "success");

            // Redirect naar de homepagina na inloggen
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        console.error(`❌ ${type} fout:`, error.message);
        let errorMsg = error.message;

        // Gebruiksvriendelijke foutmeldingen
        if (error.message === "Invalid login credentials") {
            errorMsg = "E-mailadres of wachtwoord is onjuist.";
        } else if (error.message === "User already registered") {
            errorMsg = "Dit e-mailadres is al in gebruik.";
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
async function applyDiscountCode() {
    const code = document.getElementById('promo-code').value.toUpperCase();
    const btn = document.getElementById('apply-promo-btn');

    if (code === "BRIGHT3") {
        btn.innerText = "Momentje...";
        btn.disabled = true;

        // Laat de gebruiker weten dat we naar de kassa gaan
        showNotification("Code geaccepteerd! Je wordt nu naar de betaling geleid. 💳", "success");

        // STAP: Stuur de gebruiker naar je specifieke Stripe €1 link
        setTimeout(() => {
            window.location.href = "https://buy.stripe.com/test_00w9AV2wRfsyefs7Lv5c402";
        }, 1500);

    } else {
        showNotification("Ongeldige kortingscode.", "error");
    }
}

// Roep de UI update aan bij het laden
document.addEventListener('DOMContentLoaded', updateAuthUI);