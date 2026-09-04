// Centrale betaalconfiguratie (Fase D — migratie Lemon Squeezy → Stripe
// Managed Payments). De site leest hier welke provider actief is; de
// omschakeling is één regel wijzigen zodra de Stripe-onboarding klaar is
// (zie STRIPE-MIGRATIE.md voor het volledige stappenplan).
window.BETAAL_CONFIG = {
    // 'lemon' zolang de Lemon Squeezy-flow actief is; 'stripe' zodra de
    // payment links hieronder zijn ingevuld én de stripe-webhook live staat.
    provider: 'lemon',

    lemon: {
        // Lemon Squeezy variant-id's (bestaande situatie).
        maandelijks: '78215cb2-d818-497b-a4ea-f29424aacf6c',
        jaarlijks: '993c7ac0-abeb-415c-a40c-ce00ef820235',
    },

    stripe: {
        // Stripe Payment Links (https://buy.stripe.com/...), aan te maken in
        // het Stripe-dashboard. client_reference_id en e-mail worden er bij
        // het openen als parameters aan toegevoegd (zie startCheckout).
        // Geverifieerd 2026-09-04: Glow €2,95/maand, Shine €24,95/jaar,
        // beide met 30 dagen gratis proefperiode (live-modus).
        maandelijks: 'https://buy.stripe.com/9B614n2M2eqi3nR8Ri3ks00',
        jaarlijks: 'https://buy.stripe.com/4gM3cv9aqaa24rV6Ja3ks01',
        // No-code Customer Portal-loginlink, geactiveerd 2026-09-04
        // (opzeggen aan einde periode + betaalmethoden bijwerken staan aan).
        klantportaal: 'https://billing.stripe.com/p/login/9B614n2M2eqi3nR8Ri3ks00',
    },
};
