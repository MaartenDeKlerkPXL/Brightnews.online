// Dagoverzicht van redesign v5 (Figma: v5 · Dagoverzicht, bronnenlijst als
// tekstlinks). Eén pagina per dag: ?datum=2026-10-01.
//
// De pijplijn maakt één overzicht per categorie, soms twee of drie per dag.
// Deze pagina zet ze onder elkaar (elk met een eigen kop) en maakt één
// bronnenlijst van alle verhalen samen. De verwijzingen [1], [2] in de tekst
// worden links naar die lijst.

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;

    // Tekst met [n] erin: de verwijzing wordt een link naar het nummer in de
    // gezamenlijke bronnenlijst. Alles via tekstknopen, geen innerHTML.
    function tekstMetVerwijzingen(tekst, nummerVan) {
        const p = el('p');
        const delen = String(tekst || '').split(/\[(\d+)\]/);
        delen.forEach((deel, i) => {
            if (i % 2 === 0) { p.appendChild(document.createTextNode(deel)); return; }
            const nummer = nummerVan(Number(deel));
            if (!nummer) return;
            const a = el('a', 'bronverwijzing', String(nummer));
            a.href = `#bron-${nummer}`;
            p.appendChild(a);
        });
        return p;
    }

    function bronItem(ref, nummer, artikel, manifest) {
        const li = el('li', 'source-item');
        li.id = `bron-${nummer}`;
        li.appendChild(el('span', 'source-item__nummer', String(nummer)));
        const tekst = el('div', 'source-item__tekst');
        if (artikel && artikel.category) tekst.appendChild(el('span', 'categorie-label', B.categorieLabel(artikel.category)));
        const titel = el('h3', 'source-item__titel');
        // Staat het verhaal nog in de feed, dan de v5-artikelpagina; anders
        // de bestaande statische pagina.
        titel.appendChild(B.link(artikel ? B.url.artikel(ref.id) : B.url.statisch(ref.id, manifest), null, artikel ? artikel.title : ref.title));
        tekst.appendChild(titel);
        if (artikel) {
            const samenvatting = B.eersteZinnen(artikel.summary, 160);
            if (samenvatting) tekst.appendChild(el('p', 'source-item__samenvatting', samenvatting));
            if (artikel.link) tekst.appendChild(B.origineelLink(artikel.link, t('v5_lees_origineel_bij', { bron: artikel.source }), 'original-link'));
        }
        li.appendChild(tekst);
        return li;
    }

    function nietGevonden(main) {
        document.title = `${t('digest_badge')} · BrightNews`;
        const blok = el('div', 'container niet-gevonden');
        blok.appendChild(el('h1', 'type-heading-lg', t('v5_niet_gevonden_dagoverzicht')));
        blok.appendChild(el('p', 'type-body-lg', t('v5_niet_gevonden_tekst')));
        blok.appendChild(B.knop(B.url.archief(), t('v5_naar_archief'), { links: 'calendar_month' }));
        main.replaceChildren(blok);
    }

    async function teken() {
        const main = document.getElementById('inhoud');
        const [feed, manifest] = await Promise.all([B.laadFeed(), B.laadManifest()]);

        // ?datum=, of ?id= van één overzicht (dan de dag van dat overzicht).
        let dag = B.param('datum');
        const id = B.param('id');
        if (!B.isDagSleutel(dag) && id) dag = feed.find(a => String(a.id) === id)?.digest_date;
        const digests = B.isDagSleutel(dag) ? B.digestsVan(feed, dag) : [];
        if (!digests.length) { nietGevonden(main); return; }

        const titelTekst = t('v5_goede_nieuws_van', { dag: B.weekdag(dag) });
        document.title = `${titelTekst} · BrightNews`;
        const perId = new Map(feed.map(a => [String(a.id), a]));
        const refs = B.verhalenVanDigests(digests);
        const nummerVanId = new Map(refs.map((r, i) => [String(r.id), i + 1]));

        const artikel = el('article', 'container artikel');

        // 1 Foto: die van een van de verhalen; het merkbeeld als die ontbreekt.
        artikel.appendChild(B.beeld(digests.map(d => d.image).find(Boolean), 'artikel__beeld', digests[0].image_alt));

        // 2 Kop
        const kop = el('header', 'artikel__kop');
        const meta = el('p', 'artikel__meta');
        meta.appendChild(el('span', 'badge', t('digest_badge')));
        meta.appendChild(el('span', null, B.hoofdletter(B.dagLang(dag, true))));
        kop.appendChild(meta);
        kop.appendChild(el('h1', 'artikel__titel', titelTekst));
        artikel.appendChild(kop);

        // 3 Tekst: per overzicht een kop en de samenvatting.
        const tekst = el('div', 'artikel__tekst');
        for (const digest of digests) {
            if (digests.length > 1 || digest.title !== titelTekst) tekst.appendChild(el('h2', null, digest.title));
            const eigenRefs = digest.refs || [];
            tekst.appendChild(tekstMetVerwijzingen(digest.summary, n => {
                const ref = eigenRefs[n - 1];
                return ref ? nummerVanId.get(String(ref.id)) : null;
            }));
        }
        artikel.appendChild(tekst);

        // 3b Bronnenlijst
        const bronnen = el('section', 'artikel__bronnen');
        bronnen.setAttribute('aria-labelledby', 'kop-bronnen');
        const bronKop = el('h2', 'sectie__titel', t('v5_verhalen_van_dag'));
        bronKop.id = 'kop-bronnen';
        bronnen.appendChild(bronKop);
        const lijst = el('ol', 'source-list');
        lijst.setAttribute('role', 'list');
        refs.forEach((ref, i) => lijst.appendChild(bronItem(ref, i + 1, perId.get(String(ref.id)), manifest)));
        bronnen.appendChild(lijst);
        artikel.appendChild(bronnen);

        // 5 Delen en 6 bronvermelding
        artikel.appendChild(B.deelBalk(window.location.href, titelTekst));
        const bronVermelding = el('div', 'source-attribution');
        const aantalBronnen = new Set(refs.map(r => perId.get(String(r.id))?.source).filter(Boolean)).size || refs.length;
        bronVermelding.appendChild(el('p', null, t('v5_bron_digest', { n: aantalBronnen })));
        artikel.appendChild(bronVermelding);

        main.replaceChildren(artikel);
    }

    B.start(teken);
})();
