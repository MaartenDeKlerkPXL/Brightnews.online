// 404, redesign v5 (Figma: 404 · Desktop). Geen groot cijfer: "Foutcode
// 404" staat klein als overline en de titel zegt in gewone taal wat er aan
// de hand is. Daaronder de uitwegen: het nieuws van vandaag, het archief en
// de zes onderwerpen. De taal volgt de opgeslagen voorkeur.

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;

    function teken() {
        document.title = `${t('v5_404_h1')} · BrightNews`;
        B.onderwerpLinks(document.getElementById('onderwerpen'));
    }

    B.start(teken);
})();
