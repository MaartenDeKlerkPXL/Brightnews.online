// Zo kiezen we, redesign v5 (Figma: Zo kiezen we · Desktop). De tekst staat
// in de pagina zelf (data-i18n); hier alleen de zin met de link naar
// Feedback, waarvan de woordvolgorde per taal verschilt.

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;

    function teken() {
        document.title = `${t('schil_zo_kiezen_we')} · BrightNews`;
        const link = B.link(B.url.feedback(), 'tekstlink', t('v5_zk_meld'));
        document.getElementById('zk-fout').replaceChildren(B.zinMetDelen('v5_zk_fout', { link }));
    }

    B.start(teken);
})();
