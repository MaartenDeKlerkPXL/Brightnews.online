// Editie van een eerdere dag, redesign v5 (Figma: v5 · Editie van een
// eerdere dag — recent, en — ouder). Eén pagina per dag: ?datum=2026-09-28.
//
// Recent (de dag staat nog helemaal in de feed, ±17 dagen): zoals de
// homepage, met het dagoverzicht en foto's, in rijen van drie. Ouder: het
// archief kent alleen kop, datum en adres, dus datum, aantal, een korte
// uitleg en de koppen. Elke kop opent het bestaande artikel.
// Beide met navigatie naar de vorige en volgende dag (component Edition nav).

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;

    function paginaKop(dag, meta) {
        const kop = el('div', 'page-head');
        kop.appendChild(B.knop(B.url.archief(dag.slice(0, 7)), t('schil_archief'), { klasse: 'btn btn--secondary btn--sm', links: 'arrow_back' }));
        kop.appendChild(el('p', 'page-head__label', t('v5_editie')));
        kop.appendChild(el('h1', 'type-display-sm', B.hoofdletter(B.dagLang(dag))));
        kop.appendChild(el('p', 'page-head__meta', meta));
        return kop;
    }

    // Vorige dag, archief, volgende dag. Op de nieuwste dag gaat "volgende"
    // naar het nieuws van vandaag.
    function editieNav(dag, eersteDag) {
        const nav = el('nav', 'edition-nav');
        nav.setAttribute('aria-label', t('v5_andere_edities'));
        const vorige = B.verschuif(dag, -1);
        if (vorige >= eersteDag) {
            nav.appendChild(B.knop(B.url.editie(vorige), B.hoofdletter(B.dagLang(vorige)), { links: 'arrow_back' }));
        } else {
            nav.appendChild(el('span'));
        }
        nav.appendChild(B.knop(B.url.archief(dag.slice(0, 7)), t('v5_alle_edities'), { links: 'calendar_month' }));
        const volgende = B.verschuif(dag, 1);
        if (volgende >= B.vandaag()) {
            nav.appendChild(B.knop(B.url.home(), t('v5_nieuws_van_vandaag'), { rechts: 'arrow_forward' }));
        } else {
            nav.appendChild(B.knop(B.url.editie(volgende), B.hoofdletter(B.dagLang(volgende)), { rechts: 'arrow_forward' }));
        }
        const wrap = el('div', 'container editie-nav-wrap');
        wrap.appendChild(nav);
        return wrap;
    }

    function recent(dag, artikelen, feed) {
        const fragment = document.createDocumentFragment();
        const boven = el('div', 'container');
        const meta = `${B.aantalVerhalen(artikelen.length)}, ${t('v5_bijgewerkt_om', { tijd: B.tijd(B.laatsteMoment(artikelen)) })}`;
        const kop = paginaKop(dag, meta);
        kop.classList.add('sectie--kop');
        boven.appendChild(kop);

        const digests = B.digestsVan(feed, dag);
        if (digests.length) {
            const blok = el('div', 'editie-digests');
            digests.forEach(d => blok.appendChild(B.digestCard(d, feed)));
            boven.appendChild(blok);
        }
        fragment.appendChild(boven);

        const verhalen = el('section', 'container sectie');
        verhalen.setAttribute('aria-labelledby', 'kop-verhalen');
        const verhalenKop = el('h2', 'visueel-verborgen', t('v5_verhalen_van_dag'));
        verhalenKop.id = 'kop-verhalen';
        verhalen.appendChild(verhalenKop);
        verhalen.appendChild(B.editieRaster(artikelen, 3));
        fragment.appendChild(verhalen);
        return fragment;
    }

    function ouder(dag, verhalen, manifest) {
        const blok = el('div', 'container editie-oud');
        const kop = paginaKop(dag, verhalen.length ? B.aantalVerhalen(verhalen.length) : t('v5_geen_verhalen'));
        if (verhalen.length) {
            const noot = el('p', 'note');
            noot.appendChild(B.icoon('history'));
            noot.appendChild(el('span', null, t('v5_oudere_editie_noot')));
            kop.appendChild(noot);
        }
        blok.appendChild(kop);

        if (verhalen.length) {
            const lijst = el('ul', 'koppen-lijst');
            lijst.setAttribute('role', 'list');
            for (const v of verhalen) {
                const li = el('li');
                // Zonder categorie: die kent het archief (nog) niet.
                li.appendChild(B.headlineItem(v.titel, B.url.statisch(v.id, manifest), { kop: 'h2' }));
                lijst.appendChild(li);
            }
            blok.appendChild(lijst);
        } else {
            blok.appendChild(B.leeg(t('v5_geen_verhalen'), t('v5_geen_verhalen_tekst'), 'h2', 'calendar_month'));
        }
        return blok;
    }

    async function teken() {
        const main = document.getElementById('inhoud');
        const [feed, manifest] = await Promise.all([B.laadFeed(), B.laadManifest()]);
        const dag = B.param('datum');
        const archief = B.archiefPerDag(manifest);
        const archiefDagen = [...archief.keys()].sort();
        const eersteDag = archiefDagen[0];

        if (!B.isDagSleutel(dag) || dag < eersteDag || dag > B.vandaag()) {
            document.title = `${t('v5_editie')} · BrightNews`;
            const blok = el('div', 'container niet-gevonden');
            blok.appendChild(el('h1', 'type-heading-lg', t('v5_editie')));
            blok.appendChild(el('p', 'type-body-lg', t('v5_niet_gevonden_tekst')));
            blok.appendChild(B.knop(B.url.archief(), t('v5_naar_archief'), { links: 'calendar_month' }));
            main.replaceChildren(blok);
            return;
        }

        document.title = `${t('v5_editie')} ${B.dagLang(dag)} · BrightNews`;
        const feedDagen = B.perDag(feed);
        const oudsteFeedDag = [...feedDagen.keys()].sort()[0];
        const inFeed = feedDagen.get(dag) || [];
        const inArchief = archief.get(dag) || [];
        // Recent als de dag helemaal in de feed staat. De oudste feeddag is
        // vaak half afgesneden; die telt alleen als hij compleet is.
        const isRecent = inFeed.length > 0 && (dag > oudsteFeedDag || inFeed.length >= inArchief.length);

        main.replaceChildren(isRecent ? recent(dag, inFeed, feed) : ouder(dag, inArchief, manifest));
        main.appendChild(editieNav(dag, eersteDag));
    }

    B.start(teken);
})();
