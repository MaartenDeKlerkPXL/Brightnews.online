// Thema's, redesign v5: de zes onderwerpen (naar de categoriepagina's) en
// alle weekthema's in de gekozen taal, uit themas/overzicht.json (gemaakt door
// backend/generate-evergreen.js en backend/migreer-themas-v5.js).

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const PAD = /^\/themas\/[a-z]{2}\/[a-z0-9-]+\.html$/;

    async function teken() {
        document.title = `${t('schil_themas')} · BrightNews`;
        B.onderwerpLinks(document.getElementById('onderwerpen'));

        const lijst = document.getElementById('themalijst');
        let overzicht = null;
        try {
            const antwoord = await fetch('/themas/overzicht.json');
            if (antwoord.ok) overzicht = await antwoord.json();
        } catch { /* geen verbinding: dan de lege staat */ }
        const themas = (overzicht?.[B.taal()] || []).filter(th => th && th.titel && PAD.test(th.pad));
        if (!themas.length) {
            lijst.replaceChildren(el('li', null, t('v5_th_leeg')));
            return;
        }
        lijst.replaceChildren(...themas.map(th => {
            const li = el('li');
            const item = B.headlineItem(th.titel, th.pad, { categorie: th.categorie });
            if (th.datum) item.appendChild(el('p', 'headline-item__tekst', B.dagLang(th.datum, true)));
            li.appendChild(item);
            return li;
        }));
    }

    B.start(teken);
})();
