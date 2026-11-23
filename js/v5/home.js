// Homepage van redesign v5 (Figma: v5 · Home — Normaal, Donker, Vroege
// ochtend, Dun). Volgorde (besluit v5 · 01): dagoverzicht, Vandaag,
// Gisteren, Eerder deze week (sinds 2026-11-23), Per onderwerp, einde.
//
// Welk blok compact is (alleen koppen) volgt uit het dagoverzicht bovenaan
// (besluit v5 · 02 en 03): het blok van de dag die dat overzicht samenvat,
// toont alleen koppen; de foto's en samenvattingen staan dan al bovenaan.
// Overdag is dat Gisteren, na het overzicht van vandaag is dat Vandaag. Is
// het nieuwste overzicht ouder dan gisteren, dan tonen beide dagen foto's.
//
// Laadt het nieuws niet (fout, of na 10 seconden nog niets), dan de
// foutstaat: "Het nieuws laadt even niet", één knop Opnieuw proberen, en de
// onderwerpen als uitweg. Offline zegt de tekst dat we laden zodra er weer
// verbinding is. Bekijken met ?staat=fout.

(function () {
    'use strict';

    const B = window.BN5;

    // Oude deellinks (/?id=…, de site van vóór v5): naar het artikel.
    const oudId = B.param('id');
    if (oudId) { window.location.replace(B.url.artikel(oudId)); return; }
    const { t, el } = B;

    // ── Dagoverzicht, als kop van het blok Gisteren ───────────────────────
    // (besluit Maarten, 2026-11-16: Vandaag bovenaan; het overzicht gaat over
    // gisteren en staat dus daar.)

    function digestHero(digests, dag, feed) {
        const hoofd = digests[0];
        const hero = el('section', 'digest-hero');
        hero.setAttribute('aria-labelledby', 'kop-dagoverzicht');

        const inhoud = el('div', 'digest-hero__inhoud');
        const label = el('p', 'digest-hero__label');
        label.appendChild(B.icoon('summarize'));
        label.appendChild(el('strong', null, t('digest_badge')));
        label.appendChild(el('span', null, t('v5_dagoverzicht_van', { datum: B.dagLang(dag) })));
        inhoud.appendChild(label);

        // De titel is de link (besluit v5 · 04), met de echte dag. Een h3:
        // het staat onder de h2 Gisteren.
        const titel = el('h3', 'digest-hero__titel');
        titel.id = 'kop-dagoverzicht';
        titel.appendChild(B.link(B.url.dagoverzicht(dag), 'digest-hero__link', t('v5_goede_nieuws_van', { dag: B.weekdag(dag) })));
        inhoud.appendChild(titel);

        inhoud.appendChild(el('p', 'digest-hero__samenvatting', B.eersteZinnen(hoofd.summary, 260)));
        const bronnen = B.bronnenRegel(B.verhalenVanDigests(digests), feed);
        if (bronnen) inhoud.appendChild(el('p', 'digest-hero__bronnen', bronnen));
        inhoud.appendChild(B.aanwijzing(t('v5_lees_dagoverzicht')));
        hero.appendChild(inhoud);

        // Altijd het merkbeeld: de foto van een van de verhalen stond er sinds
        // fase 2 dubbel, want die verhalen staan in hetzelfde blok (fase 5).
        hero.appendChild(B.merkbeeld('digest-hero__beeld', { label: t('digest_badge'), datum: B.hoofdletter(B.dagLang(dag)) }));
        return hero;
    }

    // ── Dagkop ───────────────────────────────────────────────────────────

    function dagKop(id, titelTekst, dag, artikelen, metVoortgang) {
        const kop = el('div', 'day-header');
        const links = el('div');
        const titel = el('h2', 'day-header__titel', titelTekst);
        titel.id = id;
        links.appendChild(titel);

        const delen = [B.hoofdletter(B.dagLang(dag))];
        if (artikelen.length) delen.push(B.aantalVerhalen(artikelen.length));
        if (artikelen.length && metVoortgang) delen.push(t('v5_bijgewerkt_om', { tijd: B.tijd(B.laatsteMoment(artikelen)) }));
        links.appendChild(el('p', 'day-header__meta', delen.join(', ')));
        kop.appendChild(links);

        // Eén voortgang, zonder percentage (besluit v5 · 07).
        if (metVoortgang && artikelen.length) {
            const gelezen = B.gelezen();
            const aantal = artikelen.filter(a => gelezen.has(String(a.id))).length;
            const voortgang = el('div', 'voortgang');
            const label = el('label', null, t('v5_gelezen', { x: aantal, n: artikelen.length }));
            label.htmlFor = `${id}-voortgang`;
            const balk = el('progress', null, `${aantal} / ${artikelen.length}`);
            balk.id = `${id}-voortgang`;
            balk.max = artikelen.length;
            balk.value = aantal;
            voortgang.append(label, balk);
            kop.appendChild(voortgang);
        }
        return kop;
    }

    // ── Een dag: met foto's, of leeg ─────────────────────────────────────

    // Gisteren: rijen van vier kaarten met foto, zonder grote kaart (die
    // plek heeft het dagoverzicht).
    function rijen(artikelen) {
        const lijst = el('ul', 'editie-raster__rij');
        lijst.setAttribute('role', 'list');
        for (const a of artikelen) {
            const li = el('li');
            li.appendChild(B.storyCard(a, { vorm: 'stacked' }));
            lijst.appendChild(li);
        }
        return lijst;
    }

    function tekenDag(sectie, { id, titel, dag, artikelen, metVoortgang, leegTitel, leegTekst, digest, groot }) {
        sectie.replaceChildren(dagKop(id, titel, dag, artikelen, metVoortgang));
        if (digest) sectie.appendChild(digest);
        if (artikelen.length === 0) {
            if (!digest) sectie.appendChild(B.leeg(leegTitel, leegTekst));
        } else {
            sectie.appendChild(groot ? B.editieRaster(artikelen, 4) : rijen(artikelen));
        }
    }

    // ── Eerder deze week ─────────────────────────────────────────────────
    // De dagen vóór gisteren die nog in de feed staan, nieuwste eerst, elk met
    // een kop die naar de editie van die dag linkt. Zelfde kaarten als Gisteren.

    function tekenEerder(dagen, dag0) {
        const sectie = document.getElementById('eerder');
        const blokken = [];
        let totaal = 0;
        for (let terug = 2; terug <= 6; terug++) {
            const dag = B.verschuif(dag0, -terug);
            const artikelen = dagen.get(dag) || [];
            if (!artikelen.length) continue;
            totaal += artikelen.length;
            const kop = el('div', 'day-header');
            const links = el('div');
            const titel = el('h3', 'sectie__titel');
            titel.appendChild(B.link(B.url.editie(dag), 'dag-link', B.hoofdletter(B.dagLang(dag))));
            links.append(titel, el('p', 'day-header__meta', B.aantalVerhalen(artikelen.length)));
            kop.appendChild(links);
            blokken.push(kop, rijen(artikelen));
        }
        sectie.hidden = totaal === 0;
        if (!totaal) return sectie.replaceChildren();
        const kop = el('div', 'sectie__kop');
        const titel = el('h2', 'day-header__titel', t('v5_eerder_deze_week'));
        titel.id = 'kop-eerder';
        kop.append(titel, el('p', 'sectie__uitleg', t('v5_eerder_deze_week_uitleg')));
        sectie.replaceChildren(kop, ...blokken);
    }

    // ── Per onderwerp en einde ───────────────────────────────────────────

    function onderwerpen() {
        B.onderwerpLinks(document.getElementById('onderwerpen'));
    }

    // Het zonnetje uit het logo (besluit Maarten, 2026-11-16), in plaats van
    // een vinkje in een gele cirkel. Vaste, eigen opmaak: geen invoer.
    const ZON = '<svg class="edition-end__zon" viewBox="0 0 39.6151 40" aria-hidden="true">'
        + '<path d="M9 28a11 11 0 0 1 22 0H9Z" fill="#FFC933"/>'
        + '<path d="M35.25 29.5H4.75a1.75 1.75 0 0 0 0 3.5h30.5a1.75 1.75 0 0 0 0-3.5Z" fill="currentColor"/>'
        + '<path d="M20 12.5V8M30.3 17.7l3.2-3.2M9.7 17.7l-3.2-3.2" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/>'
        + '</svg>';

    function einde(ochtend) {
        const blok = el('div', 'edition-end');
        blok.insertAdjacentHTML('beforeend', ZON);
        blok.appendChild(el('h2', 'edition-end__titel', t('v5_bij_titel')));
        blok.appendChild(el('p', null, t(ochtend ? 'v5_bij_tekst_ochtend' : 'v5_bij_tekst')));
        blok.appendChild(B.knop(B.url.archief(), t('v5_eerdere_edities')));
        document.getElementById('einde').replaceChildren(blok);
    }

    // ── Pagina ───────────────────────────────────────────────────────────

    const GEDULD = 10000;
    const NIEUWSBLOKKEN = ['vandaag', 'gisteren', 'einde'];

    function metGeduld(belofte) {
        return Promise.race([
            belofte,
            new Promise((_, nee) => setTimeout(() => nee(new Error('time-out')), GEDULD)),
        ]);
    }

    // Fout: de nieuwsblokken weg, de foutstaat met de onderwerpen eronder.
    // Bij null alles terug zoals het hoort.
    function foutstaat(aan) {
        const blok = document.getElementById('home-fout');
        blok.hidden = !aan;
        document.getElementById('home-kop').hidden = aan;
        NIEUWSBLOKKEN.forEach(id => { if (aan) document.getElementById(id).hidden = true; });
        if (aan) document.getElementById('eerder').hidden = true;
        ['vandaag', 'gisteren', 'einde'].forEach(id => { if (!aan) document.getElementById(id).hidden = false; });
        if (aan) document.body.dataset.pagina = 'fout';
        else delete document.body.dataset.pagina;
        document.getElementById('home-fout-lead').textContent = t(navigator.onLine === false ? 'v5_fout_offline' : 'v5_fout_lead');
    }

    async function teken() {
        document.title = `${t('v5_titel_nieuws')} · BrightNews`;
        let feed;
        try {
            if (B.param('staat') === 'fout') throw new Error('voorbeeld');
            feed = await metGeduld(B.laadFeed());
        } catch (fout) {
            console.warn('BrightNews v5: nieuws laadt niet', fout);
            foutstaat(true);
            onderwerpen();
            return;
        }
        foutstaat(false);
        const dag0 = B.vandaag();
        const dag1 = B.verschuif(dag0, -1);
        const dagen = B.perDag(feed);
        const vandaag = dagen.get(dag0) || [];
        const gisteren = dagen.get(dag1) || [];

        // Het dagoverzicht van gisteren, als kop van dat blok. Is het er
        // (nog) niet, dan staan daar alleen de verhalen.
        const digests = B.digestsVan(feed, dag1);
        const digest = digests.length ? digestHero(digests, dag1, feed) : null;

        tekenDag(document.getElementById('vandaag'), {
            id: 'kop-vandaag', titel: t('v5_vandaag'), dag: dag0, artikelen: vandaag,
            metVoortgang: true, groot: true,
            leegTitel: t('v5_leeg_vandaag_titel'), leegTekst: t('v5_leeg_vandaag_tekst'),
        });
        tekenDag(document.getElementById('gisteren'), {
            id: 'kop-gisteren', titel: t('v5_gisteren'), dag: dag1, artikelen: gisteren,
            metVoortgang: false, digest,
            leegTitel: t('v5_geen_verhalen'), leegTekst: t('v5_geen_verhalen_tekst'),
        });
        tekenEerder(dagen, dag0);
        onderwerpen();
        einde(vandaag.length === 0);
    }

    B.start(teken);

    document.getElementById('home-fout-opnieuw').addEventListener('click', () => {
        if (window.wisselTaal) window.wisselTaal(B.taal());
    });
    // Weer online: vanzelf opnieuw proberen.
    window.addEventListener('online', () => {
        if (!document.getElementById('home-fout').hidden && window.wisselTaal) window.wisselTaal(B.taal());
    });

    // Terug van een artikel (ook uit de cache van de browser): de voortgang
    // opnieuw tellen.
    window.addEventListener('pageshow', e => {
        if (e.persisted && window.wisselTaal) window.wisselTaal(B.taal());
    });
})();
