async function handlePurchase(userEmail, selectedPlan) {
    const currentLanguage = document.documentElement.lang || 'nl';

    const response = await fetch('/api/purchase-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: userEmail,
            plan: selectedPlan,
            language: currentLanguage
        })
    });

    if (response.ok) {
        // alert('Bedankt! Check je mail voor de bevestiging en onze voorwaarden. ✨');
    }
}