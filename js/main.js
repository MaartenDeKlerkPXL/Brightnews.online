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

function applyPremiumFeatures() {
    const isPremium = localStorage.getItem('brightNews_Premium') === 'true';
    if (isPremium) {
        document.body.classList.add('is-premium-user');
        console.log("BrightNews Shine Actief! ✨");
    }
}

// --- TOEGEVOEGD AAN main.js ---

/**
 * Deze functie moet aangeroepen worden nadat een gebruiker succesvol
 * een abonnement heeft gekocht.
 * @param {string} newPremiumUserId - De ID van de nieuwe betalende gebruiker
 */
async function processReferralReward(newPremiumUserId) {
    const referrerId = localStorage.getItem('bright_referrer');

    if (referrerId && referrerId !== newPremiumUserId) {
        console.log("Referral gevonden! Beloning toekennen aan:", referrerId);

        // In een echte productie-omgeving moet dit via een Supabase Edge Function:
        // Dit script roept de backend aan om 182 dagen (half jaar) toe te voegen.
        try {
            const { data, error } = await window.supabaseClient.rpc('add_premium_reward', {
                referrer_uid: referrerId,
                days_to_add: 182
            });

            if (!error) {
                console.log("6 maanden extra toegevoegd aan referrer!");
                localStorage.removeItem('bright_referrer'); // Beloning is verwerkt
            }
        } catch (err) {
            console.error("Fout bij verwerken referral:", err);
        }
    }
}