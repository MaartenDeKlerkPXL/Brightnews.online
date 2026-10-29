// Artikel van redesign v5 (Figma: v5 · Artikel — staat 3, tegoed op).
// v5-artikel.html?id=<artikel-id>, uit data/news_<taal>.json.
//
// Ontworpen is alleen staat 3: de lezer heeft zijn gratis artikelen deze
// maand op. De paywall staat inline onder de samenvatting, nooit als pop-up.
// Welke staat een lezer echt heeft, weet alleen de back-end (lees_artikel(),
// zie PR #15); tot die koppeling er is toont deze voorbeeldpagina staat 3.
// Met een paywall op de pagina wordt "Probeer Premium" in de header
// secundair (besluit v5 · 18); dat regelt componenten.css.

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;

    function plan(waarde, naam, prijs, gekozen, badge) {
        const label = el('label', 'plan');
        const radio = el('input');
        radio.type = 'radio';
        radio.name = 'plan';
        radio.value = waarde;
        radio.checked = gekozen;
        label.appendChild(radio);
        const tekst = el('span', 'plan__naam');
        tekst.appendChild(el('strong', null, naam));
        tekst.appendChild(el('span', null, prijs));
        label.appendChild(tekst);
        if (badge) label.appendChild(el('span', 'badge', badge));
        return label;
    }

    // Paywall, type Subscribe: tegoed op, Premium met 30 dagen gratis.
    function paywall() {
        const blok = el('section', 'paywall');
        blok.setAttribute('aria-labelledby', 'paywall-titel');
        const tekst = el('div', 'paywall__tekst');
        const titel = el('h2', 'paywall__titel', t('v5_paywall_op_titel'));
        titel.id = 'paywall-titel';
        tekst.appendChild(titel);
        tekst.appendChild(el('p', null, t('v5_paywall_op_tekst')));
        blok.appendChild(tekst);

        const plannen = el('fieldset', 'paywall__plannen');
        plannen.appendChild(el('legend', 'visueel-verborgen', t('v5_kies_abonnement')));
        plannen.appendChild(plan('jaarlijks', t('plan_shine_name'), t('v5_prijs_jaar'), true, t('v5_bespaar')));
        plannen.appendChild(plan('maandelijks', t('plan_glow_name'), t('v5_prijs_maand'), false));
        blok.appendChild(plannen);

        // De afrekening zelf zit op de abonnementenpagina.
        blok.appendChild(B.knop('/abonnementen.html', t('v5_start_proef'), { klasse: 'btn btn--primary btn--vol' }));

        const proef = el('p', 'paywall__proef');
        proef.appendChild(el('span', 'paywall__nul', t('v5_nul_vandaag')));
        const daarna = el('span', null, t('v5_daarna_jaar'));
        proef.appendChild(daarna);
        blok.appendChild(proef);
        plannen.addEventListener('change', e => {
            daarna.textContent = t(e.target.value === 'maandelijks' ? 'v5_daarna_maand' : 'v5_daarna_jaar');
        });

        blok.appendChild(B.link('/abonnementen.html', 'paywall__meer', t('v5_wat_premium')));
        return blok;
    }

    function bronVermelding(artikel) {
        const blok = el('div', 'source-attribution');
        blok.appendChild(el('p', null, t('v5_bron_artikel', { bron: artikel.source })));
        if (artikel.link) blok.appendChild(B.origineelLink(artikel.link, t('v5_lees_origineel'), 'btn btn--secondary btn--sm'));
        return blok;
    }

    // Meer uit deze editie: andere verhalen van dezelfde dag, met bron en
    // tijd (op artikelpagina's staat "Show meta" aan).
    function meerUitEditie(artikel, feed) {
        const dag = B.dagVan(artikel.date);
        const anderen = (B.perDag(feed).get(dag) || []).filter(a => a.id !== artikel.id).slice(0, 3);
        if (!anderen.length) return null;
        const band = el('section', 'meer-band');
        band.setAttribute('aria-labelledby', 'kop-meer');
        const binnen = el('div', 'container meer-band__binnen');
        const kop = el('h2', 'meer-band__titel', t('v5_meer_editie'));
        kop.id = 'kop-meer';
        binnen.appendChild(kop);
        const rij = el('ul', 'editie-raster__rij editie-raster__rij--drie');
        rij.setAttribute('role', 'list');
        anderen.forEach(a => {
            const li = el('li');
            li.appendChild(B.storyCard(a, { vorm: 'stacked', meta: true }));
            rij.appendChild(li);
        });
        binnen.appendChild(rij);
        band.appendChild(binnen);
        return band;
    }

    function nietGevonden(main) {
        document.title = `${t('v5_niet_gevonden_artikel')} · BrightNews`;
        const blok = el('div', 'container niet-gevonden');
        blok.appendChild(el('h1', 'type-heading-lg', t('v5_niet_gevonden_artikel')));
        blok.appendChild(el('p', 'type-body-lg', t('v5_niet_gevonden_tekst')));
        blok.appendChild(B.knop(B.url.archief(), t('v5_naar_archief'), { links: 'calendar_month' }));
        main.replaceChildren(blok);
    }

    async function teken() {
        const main = document.getElementById('inhoud');
        const [feed, manifest] = await Promise.all([B.laadFeed(), B.laadManifest()]);
        const id = B.param('id');
        const artikel = feed.find(a => String(a.id) === id);
        if (!artikel) { nietGevonden(main); return; }
        // Een dagoverzicht heeft zijn eigen pagina.
        if (B.isDigest(artikel)) { window.location.replace(B.metTestdag(B.url.dagoverzicht(artikel.digest_date))); return; }

        document.title = `${artikel.title} · BrightNews`;
        B.markeerGelezen(artikel.id);

        const blok = el('article', 'container artikel');
        // 1 Foto, met alleen een alt-tekst (besluit v5 · 19: geen bijschrift).
        blok.appendChild(B.beeld(artikel.image, 'artikel__beeld', artikel.image_alt || ''));

        // 2 Kop
        const kop = el('header', 'artikel__kop');
        const meta = el('p', 'artikel__meta');
        const label = B.categorieLabel(artikel.category);
        if (label) meta.appendChild(el('span', 'badge', label));
        const tijd = el('time', null, B.datumTijd(artikel.date));
        tijd.dateTime = artikel.date;
        meta.appendChild(tijd);
        kop.appendChild(meta);
        kop.appendChild(el('h1', 'artikel__titel', artikel.title));
        blok.appendChild(kop);

        // 3 Tekst: de openbare samenvatting. De volledige tekst staat achter
        // de paywall (articles_full) en komt niet in de publieke data.
        const tekst = el('div', 'artikel__tekst');
        tekst.appendChild(el('p', null, artikel.summary));
        blok.appendChild(tekst);

        // 4 Paywall, 5 Delen, 6 Bronvermelding
        blok.appendChild(paywall());
        const deelAdres = new URL(B.url.statisch(artikel.id, manifest), window.location.origin).href;
        blok.appendChild(B.deelBalk(deelAdres, artikel.title));
        blok.appendChild(bronVermelding(artikel));

        main.replaceChildren(blok);
        const meer = meerUitEditie(artikel, feed);
        if (meer) main.appendChild(meer);
    }

    B.start(teken);
})();
