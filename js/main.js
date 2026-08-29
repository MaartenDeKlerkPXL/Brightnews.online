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
        // TODO: referral-systeem is nooit afgemaakt. `add_premium_reward` bestaat
        // niet in Supabase (bevestigd: het public-schema was leeg vóór de
        // profiles/articles_full-tabellen uit Fase 1). Bouw dit pas als het
        // referral-systeem prioriteit krijgt: een RPC-functie (security definer,
        // met een limiet/audit-trail tegen misbruik) die de referrer's
        // premium_until in de profiles-tabel verlengt. Tot die tijd bewust geen
        // aanroep — anders krijgt elke nieuwe Premium-koper hier een stille fout.
        console.log("Referral gevonden voor", referrerId, "— beloning nog niet geïmplementeerd.");
    }
}