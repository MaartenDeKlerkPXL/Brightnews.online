// Artikel van redesign v5 (Figma: v5 · Artikel — staat 1 t/m 4).
// artikel.html?id=<artikel-id>, uit data/news_<taal>.json.
//
//   1  Premium: volledige tekst, geen paywall.
//   2  Gratis account, tegoed over: volledige tekst en een rustige regel
//      (Paywall type Credit).
//   3  Gratis account, tegoed op: Premium, 30 dagen gratis (Subscribe).
//   4  Niet ingelogd: gratis account maken (Account).
// De paywall staat altijd inline, nooit als pop-up. Welke staat een lezer
// heeft, zegt lees_artikel() (TODO 66 punt 6): die geeft ook de volledige
// tekst uit articles_full, en telt het artikel van het tegoed af. Een
// artikel zonder volledige tekst (ouder dan de paywall) toont de
// samenvatting zonder paywall.
// Om de staten te bekijken zonder account: ?staat=1..4 (dan wordt er niets
// opgehaald en staat de samenvatting op de plek van de tekst).
//
// Statische modus: op de gegenereerde artikelpagina's
// (articles/{taal}/{slug}-{id}.html, backend/generate-articles.js) staan
// foto, kop, samenvatting, bron en "Meer goed nieuws" al in de HTML. Dan
// bouwt dit script de pagina niet op uit de feed, maar zet het alleen de
// volledige tekst, de paywall en de deelknoppen erbij. Een andere taal kiezen
// gaat daar naar dezelfde pagina in die taal (data-alt-{taal}).
// Met een paywall op de pagina wordt "Probeer Premium" in de header
// secundair (besluit v5 · 18); dat regelt componenten.css.

(function () {
    'use strict';

    const B = window.BN5;
    const { t, el } = B;

    const { maakSlug } = B;

    // Naar Abonnementen, en na Bedankt terug naar dit artikel.
    function naarPremium(plan) {
        const hier = encodeURIComponent(window.location.pathname + window.location.search);
        const adres = B.url.abonnementen(plan);
        return `${adres}${adres.includes('?') ? '&' : '?'}next=${hier}`;
    }

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

        // Naar de abonnementenpagina, met het gekozen plan voorgeselecteerd.
        const start = B.knop(naarPremium('jaarlijks'), t('v5_start_proef'), { klasse: 'btn btn--primary btn--vol' });
        blok.appendChild(start);

        const proef = el('p', 'paywall__proef');
        proef.appendChild(el('span', 'paywall__nul', t('v5_nul_vandaag')));
        const daarna = el('span', null, t('v5_daarna_jaar'));
        proef.appendChild(daarna);
        blok.appendChild(proef);
        plannen.addEventListener('change', e => {
            daarna.textContent = t(e.target.value === 'maandelijks' ? 'v5_daarna_maand' : 'v5_daarna_jaar');
            start.href = B.metTestdag(naarPremium(e.target.value));
        });

        blok.appendChild(B.link(naarPremium(), 'paywall__meer', t('v5_wat_premium')));
        return blok;
    }

    // Paywall, type Credit: rustige regel onder de volledige tekst.
    function tegoedRegel(over, totaal) {
        const regel = el('div', 'paywall-credit');
        const tekst = el('p', 'paywall-credit__tekst');
        tekst.appendChild(B.icoon('info'));
        tekst.appendChild(el('span', null, t('v5_paywall_tegoed', { x: over, n: totaal })));
        regel.appendChild(tekst);
        regel.appendChild(B.knop(naarPremium(), t('v5_onbeperkt_lezen'), { klasse: 'btn btn--secondary btn--sm', rechts: 'arrow_forward' }));
        return regel;
    }

    // Paywall, type Account: niet ingelogd, gratis account zonder
    // betaalgegevens. Het formulier gaat naar het tabblad Account maken.
    function accountPaywall() {
        const blok = el('section', 'paywall');
        blok.setAttribute('aria-labelledby', 'paywall-titel');
        const tekst = el('div', 'paywall__tekst');
        const titel = el('h2', 'paywall__titel', t('v5_paywall_account_titel'));
        titel.id = 'paywall-titel';
        tekst.appendChild(titel);
        tekst.appendChild(el('p', null, t('v5_paywall_account_tekst')));
        blok.appendChild(tekst);

        const form = el('form', 'paywall__formulier');
        form.action = '/inloggen.html';
        form.method = 'get';
        const tab = el('input');
        tab.type = 'hidden';
        tab.name = 'tab';
        tab.value = 'account';
        form.appendChild(tab);
        // Na het inloggen terug naar dit artikel.
        const terug = el('input');
        terug.type = 'hidden';
        terug.name = 'next';
        terug.value = window.location.pathname + window.location.search;
        form.appendChild(terug);
        const veld = el('div', 'invoer');
        const label = el('label', 'invoer__label', t('v5_in_email'));
        label.htmlFor = 'paywall-email';
        const invoer = el('input', 'invoer__veld');
        invoer.type = 'email';
        invoer.id = 'paywall-email';
        invoer.name = 'email';
        invoer.autocomplete = 'email';
        invoer.placeholder = t('v5_in_email_voorbeeld');
        veld.append(label, invoer);
        form.appendChild(veld);
        const knop = el('button', 'btn btn--primary btn--vol', t('v5_maak_gratis_account'));
        knop.type = 'submit';
        form.appendChild(knop);
        blok.appendChild(form);

        blok.appendChild(B.link(`/inloggen.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, 'paywall__meer', t('v5_al_account')));
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

    // Welke staat, en welke tekst. In het voorbeeld (?staat=) uit het adres;
    // de header volgt dan ook: ingelogd (1–3) toont Mijn account, Premium (1)
    // geen Probeer Premium. Echt: de header zet js/v5/schil.js zelf.
    async function leesStaat(id, taal = B.taal()) {
        const gevraagd = B.param('staat');
        if (['1', '2', '3', '4'].includes(gevraagd)) {
            if (gevraagd !== '4') document.body.dataset.ingelogd = '';
            if (gevraagd === '1') document.body.dataset.premium = '';
            return { staat: gevraagd, over: 2, limiet: 5 };
        }
        const client = window.supabaseClient;
        if (!client) return { staat: '4' };
        await window.bnAccount;
        const { data, error } = await client.rpc('lees_artikel', { p_id: String(id), p_lang: taal });
        if (error || !data) {
            // Geen verbinding of een storing: de samenvatting, zonder paywall
            // die de lezer onterecht zou zeggen dat zijn tegoed op is.
            console.warn('BrightNews v5: lees_artikel', error);
            window.showNotification(t('v5_in_fout_algemeen'), 'error');
            return { staat: null };
        }
        const limiet = Number(data.limiet) || 5;
        switch (data.status) {
            case 'anoniem': return { staat: '4' };
            case 'premium': return { staat: '1', tekst: data.tekst };
            case 'op': return { staat: '3' };
            case 'gratis':
                return { staat: '2', tekst: data.tekst, over: Math.max(limiet - (Number(data.gebruikt) || 0), 0), limiet };
            default: return { staat: null };    // geen_tekst: alleen de samenvatting
        }
    }

    // Een taalwissel tekent opnieuw; komt een oudere lees_artikel-aanroep
    // als laatste terug, dan mag die niet meer tekenen.
    let ronde = 0;

    async function teken() {
        const mijnRonde = ++ronde;
        const main = document.getElementById('inhoud');
        const feed = await B.laadFeed();
        const id = B.param('id');
        const artikel = feed.find(a => String(a.id) === id);
        // Een dagoverzicht heeft zijn eigen pagina.
        if (B.isDigest(artikel)) { window.location.replace(B.metTestdag(B.url.dagoverzicht(artikel.digest_date))); return; }
        // Bestaat de statische pagina (backend/generate-articles.js), dan daarheen:
        // die heeft de canonical, de deel-preview en "Meer goed nieuws".
        // Eerst het manifest: dat kent ook artikelen die niet meer in de feed
        // staan, en de opgeslagen slug (die kan afwijken van de titel).
        if (!B.param('staat')) {
            const manifest = await B.laadManifest().catch(() => null);
            const slug = manifest?.articles?.[id]?.slugs?.[B.taal()];
            if (slug && /^[a-z0-9-]+$/.test(slug)) {
                window.location.replace(`/articles/${B.taal()}/${slug}-${encodeURIComponent(id)}.html`);
                return;
            }
        }
        if (!artikel) { nietGevonden(main); return; }
        if (!B.param('staat')) {
            const statisch = `/articles/${B.taal()}/${maakSlug(artikel.title)}-${artikel.id}.html`;
            try {
                if ((await fetch(statisch, { method: 'HEAD' })).ok) { window.location.replace(statisch); return; }
            } catch { /* geen verbinding: dan hier tonen */ }
        }

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

        // 3 Tekst: de volledige tekst als lees_artikel() die geeft, anders de
        // openbare samenvatting. De volledige tekst staat nooit in de
        // publieke data.
        const lezen = await leesStaat(artikel.id);
        if (mijnRonde !== ronde) return;
        const tekst = el('div', 'artikel__tekst');
        const alineas = String(lezen.tekst || '').split(/\n+/).map(a => a.trim()).filter(Boolean);
        (alineas.length ? alineas : [artikel.summary]).forEach(a => tekst.appendChild(el('p', null, a)));
        blok.appendChild(tekst);

        // 4 Paywall per staat, 5 Delen, 6 Bronvermelding.
        if (lezen.staat === '2') blok.appendChild(tegoedRegel(lezen.over, lezen.limiet));
        if (lezen.staat === '3') blok.appendChild(paywall());
        if (lezen.staat === '4') blok.appendChild(accountPaywall());
        blok.appendChild(B.deelBalk(window.location.href, artikel.title));
        blok.appendChild(bronVermelding(artikel));

        main.replaceChildren(blok);
        const meer = meerUitEditie(artikel, feed);
        if (meer) main.appendChild(meer);
    }

    function startStatisch(blok) {
        const id = blok.dataset.artikelId;
        const taal = blok.dataset.artikelTaal;
        const titel = blok.querySelector('.artikel__titel').textContent;
        const canoniek = document.querySelector('link[rel="canonical"]')?.href || window.location.href;

        // Foto die niet laadt (of al niet laadde vóór dit script): merkbeeld.
        const img = blok.querySelector('img.artikel__beeld');
        if (img) {
            const vervang = () => img.replaceWith(B.merkbeeld('artikel__beeld'));
            if (img.complete && !img.naturalWidth) vervang();
            else img.addEventListener('error', vervang, { once: true });
        }
        B.markeerGelezen(id);
        // Nog geen taal gekozen (nieuwe bezoeker, Google): die van de pagina,
        // anders krijgt een Engelse pagina een Nederlandse schil.
        try { if (!localStorage.getItem('selectedLanguage')) localStorage.setItem('selectedLanguage', taal); } catch { /* geen opslag */ }

        let ronde = 0;
        B.start(async () => {
            const mijnRonde = ++ronde;
            const plek = blok.querySelector('[data-deelbalk]');
            // Is er niets meer dan deze samenvatting, dan geen paywall en geen
            // aanroep: alleen de deelknoppen.
            if (!blok.hasAttribute('data-ingekort')) {
                plek.replaceChildren(B.deelBalk(canoniek, titel));
                return;
            }
            let lezen;
            try {
                lezen = await leesStaat(id, taal);
            } catch (fout) {
                // Nooit de statische tekst weghalen (dat zou B.start doen).
                console.warn('BrightNews v5: artikel', fout);
                lezen = { staat: null };
            }
            if (mijnRonde !== ronde) return;
            const alineas = String(lezen.tekst || '').split(/\n+/).map(a => a.trim()).filter(Boolean);
            if (alineas.length) blok.querySelector('.artikel__tekst').replaceChildren(...alineas.map(a => el('p', null, a)));
            blok.querySelectorAll(':scope > .paywall, :scope > .paywall-credit').forEach(n => n.remove());
            if (lezen.staat === '2') plek.before(tegoedRegel(lezen.over, lezen.limiet));
            if (lezen.staat === '3') plek.before(paywall());
            if (lezen.staat === '4') plek.before(accountPaywall());
            plek.replaceChildren(B.deelBalk(canoniek, titel));
        });

        // Een andere taal: dezelfde pagina in die taal, als die bestaat.
        const gewoon = window.wisselTaal;
        window.wisselTaal = nieuweTaal => {
            const ander = blok.dataset[`alt${nieuweTaal.charAt(0).toUpperCase()}${nieuweTaal.slice(1)}`];
            if (ander && nieuweTaal !== taal) {
                try { localStorage.setItem('selectedLanguage', nieuweTaal); } catch { /* alleen deze pagina */ }
                window.location.href = ander;
                return;
            }
            gewoon(nieuweTaal);
        };
    }

    const statisch = document.querySelector('[data-statisch-artikel]');
    if (statisch) startStatisch(statisch);
    else B.start(teken);
})();
