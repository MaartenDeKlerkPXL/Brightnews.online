// Homepage van redesign v5 (Figma: v5 · Home — Normaal, Donker, Vroege
// ochtend, Dun). Volgorde (besluit v5 · 01): dagoverzicht, Vandaag,
// Gisteren, Per onderwerp, einde.
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

    // ── Dagoverzicht bovenaan ────────────────────────────────────────────

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

        // De titel is de h1 en de link (besluit v5 · 04), met de echte dag.
        const titel = el('h1', 'digest-hero__titel');
        titel.id = 'kop-dagoverzicht';
        titel.appendChild(B.link(B.url.dagoverzicht(dag), 'digest-hero__link', t('v5_goede_nieuws_van', { dag: B.weekdag(dag) })));
        inhoud.appendChild(titel);

        inhoud.appendChild(el('p', 'digest-hero__samenvatting', B.eersteZinnen(hoofd.summary, 260)));
        const bronnen = B.bronnenRegel(B.verhalenVanDigests(digests), feed);
        if (bronnen) inhoud.appendChild(el('p', 'digest-hero__bronnen', bronnen));
        inhoud.appendChild(B.aanwijzing(t('v5_lees_dagoverzicht')));
        hero.appendChild(inhoud);

        // De foto van een van de verhalen; het merkbeeld als die ontbreekt.
        const foto = digests.map(d => d.image).find(Boolean);
        hero.appendChild(B.beeld(foto, 'digest-hero__beeld'));
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

    // ── Een dag: met foto's, alleen koppen, of leeg ──────────────────────

    function koppen(artikelen, notitieSleutel) {
        const fragment = document.createDocumentFragment();
        const lijst = el('ul', 'koppen-raster');
        lijst.setAttribute('role', 'list');
        for (const a of artikelen) {
            const li = el('li');
            li.appendChild(B.headlineItem(a.title, B.url.artikel(a.id), { categorie: a.category, id: a.id }));
            lijst.appendChild(li);
        }
        fragment.appendChild(lijst);
        const noot = el('p', 'verwijzing');
        noot.appendChild(B.icoon('summarize'));
        noot.appendChild(el('span', null, t(notitieSleutel)));
        fragment.appendChild(noot);
        return fragment;
    }

    function tekenDag(sectie, { id, titel, dag, artikelen, compact, notitie, metVoortgang, leegTitel, leegTekst }) {
        sectie.replaceChildren(dagKop(id, titel, dag, artikelen, metVoortgang));
        sectie.classList.toggle('sectie--compact', compact || artikelen.length === 0);
        if (artikelen.length === 0) {
            sectie.appendChild(B.leeg(leegTitel, leegTekst));
        } else if (compact) {
            sectie.appendChild(koppen(artikelen, notitie));
        } else {
            sectie.appendChild(B.editieRaster(artikelen, 4));
        }
    }

    // ── Per onderwerp en einde ───────────────────────────────────────────

    function onderwerpen() {
        B.onderwerpLinks(document.getElementById('onderwerpen'));
    }

    function einde(ochtend) {
        const blok = el('div', 'edition-end');
        const cirkel = el('span', 'icoon-cirkel icoon-cirkel--groot');
        cirkel.appendChild(B.icoon('check_circle'));
        blok.appendChild(cirkel);
        blok.appendChild(el('h2', 'edition-end__titel', t('v5_bij_titel')));
        blok.appendChild(el('p', null, t(ochtend ? 'v5_bij_tekst_ochtend' : 'v5_bij_tekst')));
        blok.appendChild(B.knop(B.url.archief(), t('v5_eerdere_edities')));
        document.getElementById('einde').replaceChildren(blok);
    }

    // ── Pagina ───────────────────────────────────────────────────────────

    const GEDULD = 10000;
    const NIEUWSBLOKKEN = ['dagoverzicht', 'vandaag', 'gisteren', 'einde'];

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

        // Het nieuwste dagoverzicht tot en met vandaag. Meestal dat van
        // gisteren; het label noemt altijd zijn eigen dag.
        const kandidaten = feed.filter(a => B.isDigest(a) && a.digest_date <= dag0);
        const digestDag = B.nieuwsteDigestDag(kandidaten);
        const digests = digestDag ? B.digestsVan(feed, digestDag) : [];

        const houder = document.getElementById('dagoverzicht');
        const verborgenKop = document.getElementById('home-kop');
        if (digests.length) {
            houder.replaceChildren(digestHero(digests, digestDag, feed));
            houder.hidden = false;
            verborgenKop.hidden = true;
        } else {
            houder.hidden = true;
            verborgenKop.hidden = false;
        }

        tekenDag(document.getElementById('vandaag'), {
            id: 'kop-vandaag', titel: t('v5_vandaag'), dag: dag0, artikelen: vandaag,
            compact: digestDag === dag0, notitie: 'v5_vandaag_noot', metVoortgang: true,
            leegTitel: t('v5_leeg_vandaag_titel'), leegTekst: t('v5_leeg_vandaag_tekst'),
        });
        tekenDag(document.getElementById('gisteren'), {
            id: 'kop-gisteren', titel: t('v5_gisteren'), dag: dag1, artikelen: gisteren,
            compact: digestDag === dag1, notitie: 'v5_gisteren_noot', metVoortgang: false,
            leegTitel: t('v5_geen_verhalen'), leegTekst: t('v5_geen_verhalen_tekst'),
        });
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
