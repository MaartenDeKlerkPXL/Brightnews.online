// Juridische pagina's, redesign v5 (Figma: Juridisch · Desktop · Sjabloon).
// Eén sjabloon voor drie documenten: <main data-document="privacy">,
// "voorwaarden" of "refund". De tekst staat in data/translations.js; hier
// staat alleen de opbouw per document.
//
// Opbouw: kop met datum en versie, het blok "In het kort" (gewone taal; de
// volledige tekst blijft leidend) en genummerde secties. Links een
// inhoudsopgave die meeschuift en aangeeft waar je bent; op de telefoon staat
// die ingeklapt boven de tekst ("Op deze pagina") en staan de andere
// documenten onderaan. Minder dan vier secties: geen inhoudsopgave.
//
// Er komt geen jurist: Maarten en Erik beslissen over de teksten (TODO 75).
// Verandert een tekst inhoudelijk, zet dan de datum van dat document bij.

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const SMAL = window.matchMedia('(max-width: 1023px)');

    // Blokken in een sectie: { p }, { h3 }, { ul: [...] } en { link, naar }
    // of { link, actie: 'cookies' } (opent de cookiebalk opnieuw).
    const contact = [{ p: 'v5_jr_vragen_p' }, { link: 'v5_jr_naar_contact', naar: () => B.url.contact() }];
    const DOCUMENTEN = {
        privacy: {
            titel: 'v5_jr_privacy', datum: '2026-11-11', versie: '1.0',
            kort: ['v5_pv_kort1', 'v5_pv_kort2', 'v5_pv_kort3', 'v5_pv_kort4'],
            secties: [
                { id: 'wie-we-zijn', titel: 'v5_pv_s1', blokken: [{ p: 'v5_pv_s1_p' }] },
                { id: 'welke-gegevens', titel: 'v5_pv_s2', blokken: [
                    { h3: 'v5_pv_s2_h0' }, { p: 'v5_pv_s2_p0' },
                    { h3: 'v5_pv_s2_h1' }, { p: 'v5_pv_s2_p1' },
                    { h3: 'v5_pv_s2_h2' }, { p: 'v5_pv_s2_p2' },
                    { h3: 'v5_pv_s2_h3' }, { p: 'v5_pv_s2_p3' },
                    { h3: 'v5_pv_s2_h4' }, { p: 'v5_pv_s2_p4' },
                ] },
                { id: 'waarom', titel: 'v5_pv_s3', blokken: [
                    { p: 'v5_pv_s3_p' }, { p: 'v5_pv_s3_p2' },
                    { ul: ['v5_pv_s3_l1', 'v5_pv_s3_l2', 'v5_pv_s3_l3', 'v5_pv_s3_l4', 'v5_pv_s3_l5'] },
                ] },
                { id: 'met-wie', titel: 'v5_pv_s4', blokken: [{ ul: ['v5_pv_s4_l1', 'v5_pv_s4_l2', 'v5_pv_s4_l3', 'v5_pv_s4_l4', 'v5_pv_s4_l5', 'v5_pv_s4_l6'] }, { p: 'v5_pv_s4_p' }, { p: 'v5_pv_s4_p2' }] },
                { id: 'bewaren', titel: 'v5_pv_s5', blokken: [{ p: 'v5_pv_s5_p' }] },
                { id: 'cookies', titel: 'v5_pv_s6', blokken: [{ p: 'v5_pv_s6_p' }, { link: 'v5_pv_s6_link', actie: 'cookies' }] },
                { id: 'rechten', titel: 'v5_pv_s7', blokken: [{ p: 'v5_pv_s7_p' }] },
                { id: 'vragen', titel: 'v5_jr_vragen', blokken: contact },
            ],
        },
        voorwaarden: {
            titel: 'v5_jr_voorwaarden', datum: '2026-11-11', versie: '1.0',
            kort: ['v5_av_kort1', 'v5_av_kort2', 'v5_av_kort3', 'v5_av_kort4'],
            secties: [
                { id: 'over', titel: 'v5_av_s1', blokken: [{ p: 'v5_av_s1_p' }] },
                { id: 'wat-brightnews-doet', titel: 'v5_av_s2', blokken: [{ p: 'v5_av_s2_p' }] },
                { id: 'account', titel: 'v5_av_s3', blokken: [{ p: 'v5_av_s3_p' }] },
                { id: 'premium', titel: 'v5_av_s4', blokken: [
                    { ul: ['v5_av_s4_l1', 'v5_av_s4_l2', 'v5_av_s4_l3', 'v5_av_s4_l4', 'v5_av_s4_l5'] },
                    { p: 'v5_av_s4_p' }, { link: 'v5_jr_refund', naar: () => B.url.refund() },
                ] },
                { id: 'inhoud', titel: 'v5_av_s5', blokken: [{ p: 'v5_av_s5_p' }] },
                { id: 'wijzigingen', titel: 'v5_av_s6', blokken: [{ p: 'v5_av_s6_p' }] },
                { id: 'overig', titel: 'v5_av_s7', blokken: [{ ul: ['v5_av_s7_l1', 'v5_av_s7_l2', 'v5_av_s7_l3', 'v5_av_s7_l4', 'v5_av_s7_l5'] }] },
                { id: 'vragen', titel: 'v5_jr_vragen', blokken: contact },
            ],
        },
        refund: {
            titel: 'v5_jr_refund', datum: '2026-11-11', versie: '1.0',
            kort: ['v5_rf_kort1', 'v5_rf_kort2', 'v5_rf_kort3'],
            secties: [
                { id: 'proefperiode', titel: 'v5_rf_s1', blokken: [{ p: 'v5_rf_s1_p' }] },
                { id: 'geld-terug', titel: 'v5_rf_s2', blokken: [{ p: 'v5_rf_s2_p' }] },
                { id: 'herroepingsrecht', titel: 'v5_rf_s3', blokken: [{ p: 'v5_rf_s3_p' }] },
                { id: 'aanvragen', titel: 'v5_rf_s4', blokken: [{ p: 'v5_rf_s4_p' }, { link: 'v5_jr_naar_contact', naar: () => B.url.contact() }] },
                { id: 'daarna', titel: 'v5_rf_s5', blokken: [{ p: 'v5_rf_s5_p' }] },
                { id: 'vragen', titel: 'v5_jr_vragen', blokken: contact },
            ],
        },
    };
    const ADRES = { privacy: () => B.url.privacy(), voorwaarden: () => B.url.voorwaarden(), refund: () => B.url.refund() };

    const main = document.getElementById('inhoud');
    const welk = DOCUMENTEN[main.dataset.document] ? main.dataset.document : 'privacy';
    const doc = DOCUMENTEN[welk];
    let volger = null;

    function datumLang(dag) {
        return new Intl.DateTimeFormat(B.locale(), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(`${dag}T12:00:00Z`));
    }

    function blok(b) {
        if (b.p) return el('p', null, t(b.p));
        if (b.h3) return el('h3', 'juridisch__h3', t(b.h3));
        if (b.ul) {
            const lijst = el('ul', 'juridisch__lijst');
            b.ul.forEach(k => lijst.appendChild(el('li', null, t(k))));
            return lijst;
        }
        if (b.actie === 'cookies') {
            const knop = el('button', 'juridisch__link', t(b.link));
            knop.type = 'button';
            knop.dataset.cookieInstellingen = '';
            return knop;
        }
        return B.link(b.naar(), 'juridisch__link', t(b.link));
    }

    function andereDocumenten(klasse) {
        const blokAnder = el('div', `juridisch__andere ${klasse}`);
        blokAnder.appendChild(el('p', 'juridisch__toc-kop', t('v5_jr_andere')));
        const lijst = el('ul');
        lijst.setAttribute('role', 'list');
        Object.keys(DOCUMENTEN).filter(k => k !== welk).forEach(k => {
            const li = el('li');
            li.appendChild(B.link(ADRES[k](), null, t(DOCUMENTEN[k].titel)));
            lijst.appendChild(li);
        });
        blokAnder.appendChild(lijst);
        return blokAnder;
    }

    // Inhoudsopgave: op desktop altijd open (de summary is daar verborgen),
    // op de telefoon een ingeklapt Accordion item.
    function inhoudsopgave(secties) {
        const nav = el('nav', 'juridisch__toc');
        nav.setAttribute('aria-labelledby', 'toc-kop');
        // Breed staat de kop los boven de lijst; smal is hij de summary.
        nav.appendChild(el('p', 'juridisch__toc-kop juridisch__toc-kop--breed', t('v5_jr_op_pagina')));
        const details = el('details', 'accordion-item juridisch__toc-details');
        const summary = el('summary');
        const kop = el('span', 'juridisch__toc-kop', t('v5_jr_op_pagina'));
        kop.id = 'toc-kop';
        summary.append(kop, B.icoon('keyboard_arrow_down'));
        details.appendChild(summary);
        const lijst = el('ol', 'juridisch__toc-lijst');
        lijst.setAttribute('role', 'list');
        secties.forEach((s, i) => {
            const li = el('li');
            const a = el('a', null, t(s.titel));
            a.href = `#${s.id}`;
            a.dataset.sectie = s.id;
            a.prepend(el('span', 'visueel-verborgen', `${i + 1}. `));
            li.appendChild(a);
            lijst.appendChild(li);
        });
        details.appendChild(lijst);
        nav.appendChild(details);
        nav.appendChild(andereDocumenten('juridisch__andere--breed'));
        return nav;
    }

    // Markeert in de inhoudsopgave de sectie waar je bent: de laatste
    // sectie waarvan de kop boven 40% van het scherm staat (bovenaan de
    // pagina dus de eerste).
    function volgPositie(secties) {
        if (volger) window.removeEventListener('scroll', volger);
        const links = new Map([...main.querySelectorAll('.juridisch__toc-lijst a')].map(a => [a.dataset.sectie, a]));
        let gepland = false;
        const markeer = () => {
            gepland = false;
            const grens = window.innerHeight * 0.4;
            let huidig = secties[0].id;
            secties.forEach(s => {
                if (document.getElementById(s.id).getBoundingClientRect().top <= grens) huidig = s.id;
            });
            links.forEach((a, id) => {
                if (id === huidig) a.setAttribute('aria-current', 'location');
                else a.removeAttribute('aria-current');
            });
        };
        volger = () => {
            if (!gepland) { gepland = true; requestAnimationFrame(markeer); }
        };
        window.addEventListener('scroll', volger, { passive: true });
        markeer();
    }

    function teken() {
        document.title = `${t(doc.titel)} · BrightNews`;
        const binnen = el('div', 'container juridisch__binnen');
        const metToc = doc.secties.length >= 4;
        if (metToc) binnen.appendChild(inhoudsopgave(doc.secties));

        const artikel = el('article', 'juridisch__tekst');
        artikel.setAttribute('aria-labelledby', 'juridisch-titel');
        const kop = el('header', 'juridisch__kop');
        kop.appendChild(el('p', 'type-overline', t('v5_jr_overline')));
        const h1 = el('h1', 'type-display-sm', t(doc.titel));
        h1.id = 'juridisch-titel';
        kop.appendChild(h1);
        kop.appendChild(el('p', 'juridisch__meta', t('v5_jr_meta', { datum: datumLang(doc.datum), versie: doc.versie })));
        artikel.appendChild(kop);

        const kort = el('section', 'juridisch__kort');
        kort.setAttribute('aria-labelledby', 'juridisch-kort');
        const kortKop = el('h2', null, t('v5_jr_kort'));
        kortKop.id = 'juridisch-kort';
        kort.appendChild(kortKop);
        const punten = el('ul', 'vinklijst');
        punten.setAttribute('role', 'list');
        doc.kort.forEach(k => {
            const li = el('li');
            li.append(B.icoon('check'), el('span', null, t(k)));
            punten.appendChild(li);
        });
        kort.appendChild(punten);
        artikel.appendChild(kort);

        doc.secties.forEach((s, i) => {
            const sectie = el('section', 'juridisch__sectie');
            sectie.id = s.id;
            sectie.setAttribute('aria-labelledby', `${s.id}-kop`);
            const h2 = el('h2', 'type-heading-md', `${i + 1}. ${t(s.titel)}`);
            h2.id = `${s.id}-kop`;
            sectie.appendChild(h2);
            s.blokken.forEach(b => sectie.appendChild(blok(b)));
            artikel.appendChild(sectie);
        });
        artikel.appendChild(andereDocumenten('juridisch__andere--smal'));
        binnen.appendChild(artikel);
        main.replaceChildren(binnen);
        if (metToc) {
            plaatsInhoudsopgave();
            volgPositie(doc.secties);
        }

        // Kwam de lezer met #cookies binnen, dan staat die sectie pas nu in
        // de pagina.
        if (location.hash) {
            const doel = document.getElementById(location.hash.slice(1));
            if (doel) doel.scrollIntoView();
        }
    }

    // Breed: de inhoudsopgave links naast de tekst, open. Smal: ingeklapt
    // tussen de kop en "In het kort".
    function plaatsInhoudsopgave() {
        const nav = main.querySelector('.juridisch__toc');
        if (!nav) return;
        nav.querySelector('details').open = !SMAL.matches;
        if (SMAL.matches) main.querySelector('.juridisch__kop').after(nav);
        else main.querySelector('.juridisch__binnen').prepend(nav);
    }

    SMAL.addEventListener('change', plaatsInhoudsopgave);

    B.start(teken);
})();
