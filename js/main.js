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