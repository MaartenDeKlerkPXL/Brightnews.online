// Centrale betaalconfiguratie. Stripe Managed Payments is sinds de
// livegang van 2026-09-05 de enige provider (Lemon Squeezy volledig
// afgebouwd; zie STRIPE-MIGRATIE.md voor de historie).
window.BETAAL_CONFIG = {
    provider: 'stripe',

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
