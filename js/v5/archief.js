// Archief van redesign v5 (Figma: v5 · Archief). Elke dag één editie, van
// nieuw naar oud, per maand. Per dag het aantal verhalen, de eerste drie
// koppen en "Lees de editie". Een dag zonder verhalen staat er ook, eerlijk
// (component Archive day, staat Empty).
//
// Bron: articles/manifest.json (alleen titels, slugs en datums). De lijst
// begint bij gisteren: vandaag staat op de homepage.
// ?maand=2026-09 opent een andere maand (via "Kies een maand").

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;
    const PER_KEER = 7;

    function archiefDag(dag, verhalen) {
        const leeg = verhalen.length === 0;
        const item = el('article', leeg ? 'archive-day archive-day--leeg' : 'archive-day');

        const datum = el('div', 'archive-day__datum');
        datum.appendChild(el('p', 'archive-day__weekdag', B.hoofdletter(B.weekdag(dag))));
        const kop = el('h3', 'archive-day__dag', B.dagMaand(dag));
        kop.tabIndex = -1;
        datum.appendChild(kop);
        item.appendChild(datum);

        const blok = el('div', 'archive-day__verhalen');
        if (leeg) {
            blok.appendChild(el('p', 'archive-day__aantal', t('v5_geen_verhalen')));
            blok.appendChild(el('p', null, t('v5_geen_verhalen_tekst')));
        } else {
            blok.appendChild(el('p', 'archive-day__aantal', B.aantalVerhalen(verhalen.length)));
            const koppen = el('ul', 'archive-day__koppen');
            koppen.setAttribute('role', 'list');
            verhalen.slice(0, 3).forEach(v => koppen.appendChild(el('li', null, v.titel)));
            blok.appendChild(koppen);
        }
        item.appendChild(blok);

        if (!leeg) {
            const knop = B.knop(B.url.editie(dag), t('v5_lees_editie'), { klasse: 'btn btn--secondary btn--sm', rechts: 'arrow_forward' });
            knop.setAttribute('aria-label', t('v5_lees_editie_van', { datum: B.dagLang(dag) }));
            item.appendChild(knop);
        }
        return item;
    }

    // "Kies een maand": een knop die een lijst met maanden uitklapt. Geen
    // pop-up; de lijst duwt de pagina omlaag. Esc klapt hem weer in.
    function maandKiezer(maanden, huidig) {
        const fragment = document.createDocumentFragment();
        const knop = el('button', 'btn btn--secondary btn--sm');
        knop.type = 'button';
        knop.setAttribute('aria-expanded', 'false');
        knop.setAttribute('aria-controls', 'maandlijst');
        knop.appendChild(B.icoon('calendar_month'));
        knop.appendChild(el('span', null, t('v5_kies_maand')));
        knop.appendChild(B.icoon('keyboard_arrow_down'));

        const lijst = el('ul', 'maandkiezer__lijst');
        lijst.id = 'maandlijst';
        lijst.setAttribute('role', 'list');
        lijst.hidden = true;
        for (const maand of maanden) {
            const li = el('li');
            const a = B.link(B.url.archief(maand), 'btn btn--secondary btn--sm', B.hoofdletter(B.maandNaam(maand)));
            if (maand === huidig) a.setAttribute('aria-current', 'page');
            li.appendChild(a);
            lijst.appendChild(li);
        }

        function zet(open) {
            lijst.hidden = !open;
            knop.setAttribute('aria-expanded', String(open));
        }
        knop.addEventListener('click', () => zet(lijst.hidden));
        lijst.addEventListener('keydown', e => {
            if (e.key === 'Escape') { zet(false); knop.focus(); }
        });
        knop.addEventListener('keydown', e => {
            if (e.key === 'Escape') zet(false);
        });
        fragment.append(knop, lijst);
        return fragment;
    }

    async function teken() {
        document.title = `${t('schil_archief')} · BrightNews`;
        const manifest = await B.laadManifest();
        const perDag = B.archiefPerDag(manifest);
        const alleDagen = [...perDag.keys()].sort();
        const lijstHouder = document.getElementById('archief-maanden');
        const meer = document.getElementById('archief-meer');
        lijstHouder.replaceChildren();
        meer.replaceChildren();
        if (!alleDagen.length) return;

        // Alle dagen van gisteren terug tot de eerste dag in het archief,
        // ook de lege.
        const eerste = alleDagen[0];
        const dagen = [];
        for (let dag = B.verschuif(B.vandaag(), -1); dag >= eerste; dag = B.verschuif(dag, -1)) dagen.push(dag);
        const maanden = [...new Set(dagen.map(d => d.slice(0, 7)))];
        const gevraagd = B.param('maand');
        let maandIndex = Math.max(0, maanden.indexOf(gevraagd));

        let sectie = null;
        let dagenVanMaand = [];
        let getoond = 0;

        function nieuweMaand(metKiezer) {
            const maand = maanden[maandIndex];
            dagenVanMaand = dagen.filter(d => d.startsWith(maand));
            getoond = 0;
            sectie = el('section', 'archief-maand');
            sectie.setAttribute('aria-labelledby', `maand-${maand}`);
            const kop = el('div', 'month-heading');
            const titel = el('h2', 'month-heading__titel', B.hoofdletter(B.maandNaam(maand)));
            titel.id = `maand-${maand}`;
            kop.appendChild(titel);
            if (metKiezer) kop.appendChild(maandKiezer(maanden, maand));
            sectie.appendChild(kop);
            lijstHouder.appendChild(sectie);
        }

        function toonMeer() {
            const eersteNieuw = [];
            if (getoond >= dagenVanMaand.length && maandIndex < maanden.length - 1) {
                maandIndex++;
                nieuweMaand(false);
                eersteNieuw.push(sectie.querySelector('h2'));
            }
            const stuk = dagenVanMaand.slice(getoond, getoond + PER_KEER);
            stuk.forEach(dag => {
                const item = archiefDag(dag, perDag.get(dag) || []);
                eersteNieuw.push(item.querySelector('h3'));
                sectie.appendChild(item);
            });
            getoond += stuk.length;
            werkMeerBij();
            return eersteNieuw[0];
        }

        function werkMeerBij() {
            meer.replaceChildren();
            const nogDezeMaand = getoond < dagenVanMaand.length;
            if (nogDezeMaand || maandIndex < maanden.length - 1) {
                const knop = el('button', 'btn btn--secondary');
                knop.type = 'button';
                knop.appendChild(el('span', null, t('v5_oudere_edities')));
                knop.appendChild(B.icoon('keyboard_arrow_down'));
                knop.addEventListener('click', () => {
                    const doel = toonMeer();
                    if (doel) {
                        doel.tabIndex = -1;
                        doel.focus();
                    }
                });
                meer.appendChild(knop);
            }
            const maand = maanden[maandIndex];
            meer.appendChild(el('p', null, t('v5_je_ziet', { x: getoond, n: dagenVanMaand.length, maand: B.maandNaam(maand) })));
        }

        nieuweMaand(true);
        toonMeer();
    }

    B.start(teken);
})();
