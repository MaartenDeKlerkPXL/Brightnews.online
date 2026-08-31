// Eenvoudige ESLint-config, vooral bedoeld om precies dit soort bugs te vangen
// (Fase 4 van de audit): aanroepen naar functies die nergens gedefinieerd zijn
// (zoals startUpgrade()/applyDiscountCode() vóór Fase 2) en overduidelijke
// fouten. Bewust geen strenge stijlregels — dat is Prettier's taak, niet
// ESLint's, en een te streng lint-rapport verdrinkt de echte bugs.
'use strict';
const js = require('@eslint/js');
const globals = require('globals');

// Cross-file globals: functies die index.js op window zet en die js/auth.js
// (of een pagina-inline script) aanroept zonder ze zelf te definiëren, en
// vice versa. Een bestand krijgt hier NOOIT zijn eigen top-level functies in
// terug (dat geeft valse no-redeclare-fouten).
const definedInIndexJs = {
    getT: 'readonly',
    vertaalStatischeTeksten: 'readonly',
    updateFooterYear: 'readonly',
    initApp: 'readonly',
    checkUser: 'readonly',
    laadNieuws: 'readonly',
    toonDetail: 'readonly',
    renderLijst: 'readonly',
    renderFilterBar: 'readonly',
    filterByMetadata: 'readonly',
    updateShareLinks: 'readonly',
    toggleShareMenu: 'readonly',
    copyLink: 'readonly',
    terugNaarOverzicht: 'readonly',
    wisselTaal: 'readonly',
    activateAnalytics: 'readonly',
    checkCookies: 'readonly',
    updateMetaTags: 'readonly',
    openCustomerPortal: 'readonly',
    acceptCookies: 'readonly',
    declineCookies: 'readonly',
    huidigeTaal: 'writable',
    alleArtikelen: 'writable',
    actieveFilters: 'writable',
};

const definedInAuthJs = {
    showNotification: 'readonly',
    updateProfileUI: 'readonly',
    toggleAuth: 'readonly',
    updateLangLabel: 'readonly',
    handleAuth: 'readonly',
    handleLogout: 'readonly',
};

// Per pagina inline gedefinieerd (in de HTML zelf, niet in index.js/auth.js)
// maar wel vanuit die bestanden aangeroepen.
const definedInlineInHtml = {
    toggleMobileMenu: 'readonly',
    renderSubscriptionUI: 'readonly',
    cancelSubscription: 'readonly',
    togglePassword: 'readonly',
    updatePassword: 'readonly',
    // gtag/dataLayer komen uit het inline consent-script in elke <head>
    gtag: 'readonly',
    dataLayer: 'writable',
};

// index.js zet deze zelf via window.x = ... (bovenaan het bestand) en
// gebruikt ze verderop in hetzelfde bestand als kale variabele — dat is in de
// browser hetzelfde object (window IS de globale scope), maar ESLint's
// statische analyse ziet dat niet vanzelf.
const selfAssignedOnWindow = {
    huidigeTaal: 'writable',
    alleArtikelen: 'writable',
    actieveFilters: 'writable',
};

const thirdPartyGlobals = {
    supabase: 'readonly',
    LemonSqueezy: 'readonly',
};

module.exports = [
    js.configs.recommended,
    {
        files: ['index.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.browser, ...thirdPartyGlobals, ...definedInAuthJs, ...definedInlineInHtml, ...selfAssignedOnWindow },
        },
        rules: { 'no-unused-vars': 'warn' },
    },
    {
        files: ['js/**/*.js', 'data/translations.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.browser, ...thirdPartyGlobals, ...definedInIndexJs, ...definedInlineInHtml },
        },
        rules: { 'no-unused-vars': 'warn' },
    },
    {
        // Service worker draait in een eigen context, geen gewoon browservenster.
        files: ['sw.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.serviceworker },
        },
    },
    {
        // Backend-scripts: Node/CommonJS.
        files: ['backend/**/*.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },
    {
        ignores: [
            'node_modules/**',
            'data/*.json',
            'assets/**',
            'supabase/functions/**',
            '**/._*',
        ],
    },
];
