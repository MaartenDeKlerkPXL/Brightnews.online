// Over ons, redesign v5 (Figma: Over ons · Desktop). De tekst staat in de
// pagina zelf (data-i18n); hier alleen wat een vertaling niet kan: de zin
// met de link naar Feedback, waarvan de woordvolgorde per taal verschilt.

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;

    function teken() {
        document.title = `${t('schil_over_ons')} · BrightNews`;
        const link = B.link(B.url.feedback(), 'tekstlink', t('v5_oo_ai_link'));
        document.getElementById('oo-fout').replaceChildren(B.zinMetDelen('v5_oo_ai_fout', { link }));
    }

    B.start(teken);
})();
