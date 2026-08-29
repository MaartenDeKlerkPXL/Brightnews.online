// --- GLOBALE FUNCTIES (beschikbaar voor onclick in HTML) ---

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