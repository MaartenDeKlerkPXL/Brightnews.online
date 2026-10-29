// Gedeelde bouwstenen voor de v5-pagina's (home, dagoverzicht, archief,
// editie, artikel). Alles hangt aan window.BN5; de paginascripts in
// js/v5/<pagina>.js gebruiken alleen dit, geen index.js.
//
// Wat hier staat:
//   - taal en vertalen (dezelfde innerHTML-regel als index.js)
//   - de data inlezen: data/news_<taal>.json en articles/manifest.json
//   - datums: een dag begint om 00:00 Nederlandse tijd (besluit v5 · 09);
//     tijden staan in de tijdzone van de lezer
//   - kaarten en koppen bouwen met createElement en textContent, want titels
//     en samenvattingen komen via de AI uit RSS-bronnen (geen innerHTML)
//   - bijhouden wat je gelezen hebt (voor "2 van 7 gelezen"), delen en
//     meldingen
//
// Voor testen: ?vandaag=2026-10-02 laat een pagina doen alsof het die dag is.
// Handig zolang de nieuwsdata stilstaat; zonder parameter geldt de echte dag.

(function () {
    'use strict';

    const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
    const LOCALE = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };
    const TIJDZONE_DAG = 'Europe/Amsterdam';
    const GELEZEN_SLEUTEL = 'bn-gelezen';

    // De zes categorieën uit de pijplijn, met hun vertaalsleutel en icoon.
    const CATEGORIEEN = {
        Tech: { sleutel: 'filter_tech', icoon: 'lightbulb' },
        Health: { sleutel: 'filter_health', icoon: 'ecg_heart' },
        Science: { sleutel: 'filter_science', icoon: 'science' },
        Lifestyle: { sleutel: 'filter_lifestyle', icoon: 'spa' },
        Environment: { sleutel: 'filter_environment', icoon: 'eco' },
        Finance: { sleutel: 'filter_finance', icoon: 'euro' },
    };

    function lees(sleutel) {
        try { return localStorage.getItem(sleutel); } catch { return null; }
    }

    function schrijf(sleutel, waarde) {
        try { localStorage.setItem(sleutel, waarde); } catch { /* geen opslag */ }
    }

    function param(naam) {
        return new URLSearchParams(window.location.search).get(naam);
    }

    // ── Taal en vertalen ─────────────────────────────────────────────────

    function taal() {
        const bewaard = lees('selectedLanguage');
        return TALEN.includes(bewaard) ? bewaard : 'nl';
    }

    // Vertaling met invulwaarden: t('v5_gelezen', { x: 2, n: 7 }). Valt terug
    // op Engels en dan op de sleutel zelf, net als de generators.
    function t(sleutel, waarden) {
        const T = window.translations || {};
        let tekst = (T[taal()] && T[taal()][sleutel]) || (T.en && T.en[sleutel]) || sleutel;
        if (waarden) {
            for (const [naam, waarde] of Object.entries(waarden)) {
                tekst = tekst.split('{' + naam + '}').join(String(waarde));
            }
        }
        return tekst;
    }

    // De statische teksten van de hele pagina, met dezelfde innerHTML-regel
    // als index.js (een vertaling mag opmaak bevatten).
    function vertaalPagina() {
        document.documentElement.lang = taal();
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const tekst = t(el.dataset.i18n);
            if (tekst !== el.dataset.i18n) el.innerHTML = tekst;
        });
        document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const tekst = t(el.dataset.i18nAriaLabel);
            if (tekst !== el.dataset.i18nAriaLabel) el.setAttribute('aria-label', tekst);
        });
        const regel = document.querySelector('[data-i18n="schil_copyright"]');
        if (regel) regel.textContent = regel.textContent.replace(/\b20\d\d\b/, String(new Date().getFullYear()));
    }

    // ── Data ─────────────────────────────────────────────────────────────

    const cache = {};

    function haalJson(pad) {
        if (!cache[pad]) {
            cache[pad] = fetch(pad, { cache: 'no-cache' }).then(r => {
                if (!r.ok) throw new Error(`${pad}: ${r.status}`);
                return r.json();
            });
            cache[pad].catch(() => { delete cache[pad]; });
        }
        return cache[pad];
    }

    function laadFeed(lang) {
        return haalJson(`/data/news_${lang || taal()}.json`);
    }

    function laadManifest() {
        return haalJson('/articles/manifest.json');
    }

    function isDigest(artikel) {
        return artikel && artikel.type === 'digest';
    }

    // ── Datums ───────────────────────────────────────────────────────────

    const dagFormaat = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIJDZONE_DAG, year: 'numeric', month: '2-digit', day: '2-digit',
    });

    // 'YYYY-MM-DD' van het moment, in Nederlandse tijd.
    function dagVan(moment) {
        return dagFormaat.format(new Date(moment));
    }

    function isDagSleutel(waarde) {
        return /^\d{4}-\d{2}-\d{2}$/.test(waarde || '') && !Number.isNaN(Date.parse(waarde));
    }

    function vandaag() {
        const test = param('vandaag');
        return isDagSleutel(test) ? test : dagVan(Date.now());
    }

    // Een dagsleutel als Date op 12:00 UTC: veilig rekenen en opmaken zonder
    // dat een tijdzone de dag verschuift.
    function middag(dag) {
        return new Date(`${dag}T12:00:00Z`);
    }

    function verschuif(dag, dagen) {
        const d = middag(dag);
        d.setUTCDate(d.getUTCDate() + dagen);
        return d.toISOString().slice(0, 10);
    }

    function hoofdletter(tekst) {
        return tekst.charAt(0).toLocaleUpperCase(LOCALE[taal()]) + tekst.slice(1);
    }

    function formatteer(datum, opties) {
        return new Intl.DateTimeFormat(LOCALE[taal()], opties).format(datum);
    }

    // "woensdag 28 oktober" (met jaar: "woensdag 28 oktober 2026")
    function dagLang(dag, metJaar) {
        const opties = { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' };
        if (metJaar) opties.year = 'numeric';
        return formatteer(middag(dag), opties);
    }

    // "28 oktober"
    function dagMaand(dag) {
        return formatteer(middag(dag), { timeZone: 'UTC', day: 'numeric', month: 'long' });
    }

    function weekdag(dag) {
        return formatteer(middag(dag), { timeZone: 'UTC', weekday: 'long' });
    }

    function maandNaam(maand) {
        return formatteer(middag(`${maand}-15`), { timeZone: 'UTC', month: 'long', year: 'numeric' });
    }

    // Tijd en datum-met-tijd in de tijdzone van de lezer.
    function tijd(moment) {
        return formatteer(new Date(moment), { hour: '2-digit', minute: '2-digit' });
    }

    function datumTijd(moment) {
        const d = new Date(moment);
        const datum = formatteer(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return `${hoofdletter(datum)}, ${tijd(d)}`;
    }

    function aantalVerhalen(n) {
        return n === 1 ? t('v5_een_verhaal') : t('v5_n_verhalen', { n });
    }

    // ── Groeperen ────────────────────────────────────────────────────────

    // Artikelen (geen dagoverzichten) per dag, elke dag op score en daarna
    // op tijd: het sterkste verhaal komt groot bovenaan.
    function perDag(feed) {
        const dagen = new Map();
        for (const artikel of feed) {
            if (isDigest(artikel)) continue;
            const dag = dagVan(artikel.date);
            if (!dagen.has(dag)) dagen.set(dag, []);
            dagen.get(dag).push(artikel);
        }
        for (const lijst of dagen.values()) {
            lijst.sort((a, b) => (b.score || 0) - (a.score || 0) || new Date(b.date) - new Date(a.date));
        }
        return dagen;
    }

    // Het archief (articles/manifest.json) per dag: alleen id, titel en
    // moment, want meer kent het manifest niet. Dagoverzichten (id dg-...)
    // tellen niet als verhaal.
    function archiefPerDag(manifest) {
        const dagen = new Map();
        for (const [id, item] of Object.entries(manifest.articles || {})) {
            if (id.startsWith('dg-')) continue;
            const dag = dagVan(item.date);
            if (!dagen.has(dag)) dagen.set(dag, []);
            dagen.get(dag).push({ id, date: item.date, titel: item.titles[taal()] || item.titles.en || '' });
        }
        for (const lijst of dagen.values()) lijst.sort((a, b) => new Date(b.date) - new Date(a.date));
        return dagen;
    }

    // De dagoverzichten van één dag (er is er één per categorie), het rijkste
    // eerst.
    function digestsVan(feed, dag) {
        return feed.filter(a => isDigest(a) && a.digest_date === dag)
            .sort((a, b) => (b.refs || []).length - (a.refs || []).length);
    }

    function nieuwsteDigestDag(feed) {
        const dagen = feed.filter(isDigest).map(a => a.digest_date).filter(isDagSleutel).sort();
        return dagen[dagen.length - 1] || null;
    }

    // Alle verhalen uit de dagoverzichten van een dag, zonder dubbele.
    function verhalenVanDigests(digests) {
        const gezien = new Set();
        const refs = [];
        for (const digest of digests) {
            for (const ref of digest.refs || []) {
                if (gezien.has(ref.id)) continue;
                gezien.add(ref.id);
                refs.push(ref);
            }
        }
        return refs;
    }

    function laatsteMoment(artikelen) {
        return artikelen.reduce((laatst, a) => (new Date(a.date) > new Date(laatst) ? a.date : laatst), artikelen[0].date);
    }

    // [1], [2] uit de dagoverzicht-tekst halen; die verwijzen naar de
    // bronnenlijst, en die staat niet op elke plek waar de tekst staat.
    function zonderVerwijzingen(tekst) {
        return String(tekst || '').replace(/\s*\[\d+\]/g, '');
    }

    // De eerste zinnen tot ongeveer `max` tekens, afgekapt op een zin.
    function eersteZinnen(tekst, max) {
        const schoon = zonderVerwijzingen(tekst).replace(/\.\.\.$/, '').trim();
        const zinnen = schoon.match(/[^.!?]+[.!?]+(\s|$)/g) || [schoon];
        let uit = '';
        for (const zin of zinnen) {
            if (uit && (uit + zin).length > max) break;
            uit += zin;
        }
        return uit.trim();
    }

    // ── Adressen ─────────────────────────────────────────────────────────

    // De voorbeeldpagina's linken alleen naar elkaar. Bestaat een pagina in
    // v5 nog niet (categorie, thema, abonnementen, een artikel van vóór de
    // feed), dan krijgt de link geen adres: null.
    const url = {
        home: () => '/v5-home.html',
        artikel: id => `/v5-artikel.html?id=${encodeURIComponent(id)}`,
        dagoverzicht: dag => `/v5-dagoverzicht.html?datum=${dag}`,
        editie: dag => `/v5-editie.html?datum=${dag}`,
        archief: maand => (maand ? `/v5-archief.html?maand=${maand}` : '/v5-archief.html'),
    };

    // Houd ?vandaag= vast bij het doorklikken tussen de voorbeeldpagina's.
    function metTestdag(adres) {
        const test = param('vandaag');
        if (!isDagSleutel(test) || !adres.startsWith('/v5-')) return adres;
        return adres + (adres.includes('?') ? '&' : '?') + `vandaag=${test}`;
    }

    function categorieLabel(cat) {
        return CATEGORIEEN[cat] ? t(CATEGORIEEN[cat].sleutel) : String(cat || '');
    }

    // ── Elementen bouwen ─────────────────────────────────────────────────

    function el(tag, klasse, tekst) {
        const e = document.createElement(tag);
        if (klasse) e.className = klasse;
        if (tekst !== undefined && tekst !== null) e.textContent = tekst;
        return e;
    }

    function icoon(naam, klasse) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('class', klasse ? `icoon ${klasse}` : 'icoon');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(ns, 'use');
        use.setAttribute('href', `/assets/iconen.svg#${naam}`);
        svg.appendChild(use);
        return svg;
    }

    // Zonder adres een <a> zonder href: zichtbaar, maar niet klikbaar en
    // niet in de tabvolgorde (zie basis.css).
    function link(adres, klasse, tekst) {
        const a = el('a', klasse, tekst);
        if (adres) a.href = metTestdag(adres);
        return a;
    }

    // Knop-link met icoon links of rechts.
    function knop(adres, tekst, { klasse = 'btn btn--secondary', links, rechts } = {}) {
        const a = link(adres, klasse);
        if (links) a.appendChild(icoon(links));
        a.appendChild(el('span', null, tekst));
        if (rechts) a.appendChild(icoon(rechts));
        return a;
    }

    function merkbeeld(klasse) {
        const div = el('div', `${klasse} merkbeeld`);
        div.setAttribute('aria-hidden', 'true');
        return div;
    }

    // Foto, of het merkbeeld als er geen is of hij niet laadt. Alt-tekst
    // leeg op kaarten: de kop staat er direct naast.
    function beeld(bron, klasse, alt) {
        if (!bron) return merkbeeld(klasse);
        const img = el('img', klasse);
        img.src = bron;
        img.alt = alt || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => img.replaceWith(merkbeeld(klasse)), { once: true });
        return img;
    }

    // Story card: vorm 'overlay' of 'stacked', groot = size lg, meta = bron
    // en tijd tonen (uit op de homepage en de editiepagina's).
    function storyCard(artikel, { vorm = 'overlay', groot = false, meta = false, kop = 'h3' } = {}) {
        const kaart = el('article', `story-card story-card--${vorm}${groot ? ' story-card--groot' : ''}`);
        kaart.appendChild(beeld(artikel.image, 'story-card__beeld'));
        const tekst = el('div', 'story-card__tekst');
        const label = categorieLabel(artikel.category);
        if (label) tekst.appendChild(el('span', vorm === 'overlay' ? 'badge' : 'categorie-label', label));
        const titel = el(kop, 'story-card__titel');
        const a = link(url.artikel(artikel.id), 'story-card__link', artikel.title);
        a.addEventListener('click', () => markeerGelezen(artikel.id));
        titel.appendChild(a);
        tekst.appendChild(titel);
        if (meta) tekst.appendChild(el('p', 'story-card__meta', `${artikel.source}, ${tijd(artikel.date)}`));
        kaart.appendChild(tekst);
        return kaart;
    }

    // Headline item: kop met (als de data hem kent) de categorie.
    function headlineItem(titelTekst, adres, { categorie, kop = 'h3', id } = {}) {
        const item = el('article', 'headline-item');
        if (categorie) item.appendChild(el('span', 'categorie-label', categorieLabel(categorie)));
        const titel = el(kop, 'headline-item__titel');
        if (adres) {
            const a = link(adres, 'headline-item__link', titelTekst);
            if (id) a.addEventListener('click', () => markeerGelezen(id));
            titel.appendChild(a);
        } else {
            titel.textContent = titelTekst;
        }
        item.appendChild(titel);
        return item;
    }

    // Het editieraster (besluit v5 · 05). 1 verhaal: één grote kaart. 2: een
    // grote en een kleinere ernaast. 3 of meer: groot met twee ernaast, en de
    // rest in rijen van `kolommen` (4 op de homepage, 3 op een eerdere
    // editie).
    function editieRaster(artikelen, kolommen) {
        const raster = el('div', 'editie-raster');
        const [eerste, ...rest] = artikelen;
        const top = el('div', 'editie-raster__top');
        top.appendChild(storyCard(eerste, { groot: true }));
        if (rest.length === 0) {
            top.classList.add('editie-raster__top--enkel');
        } else if (rest.length === 1) {
            const zij = el('div', 'editie-raster__zij');
            zij.appendChild(storyCard(rest[0], { vorm: 'stacked' }));
            top.appendChild(zij);
        } else {
            const zij = el('div', 'editie-raster__zij');
            rest.slice(0, 2).forEach(a => zij.appendChild(storyCard(a)));
            top.appendChild(zij);
        }
        raster.appendChild(top);
        const overig = rest.length > 1 ? rest.slice(2) : [];
        for (let i = 0; i < overig.length; i += kolommen) {
            const rij = el('ul', `editie-raster__rij${kolommen === 3 ? ' editie-raster__rij--drie' : ''}`);
            rij.setAttribute('role', 'list');
            overig.slice(i, i + kolommen).forEach(a => {
                const li = el('li');
                li.appendChild(storyCard(a, { vorm: 'stacked' }));
                rij.appendChild(li);
            });
            raster.appendChild(rij);
        }
        return raster;
    }

    // Digest card: één dagoverzicht in een editie.
    function digestCard(digest, feed, kop = 'h2') {
        const kaart = el('article', 'digest-card');
        const label = el('p', 'digest-hero__label');
        label.appendChild(icoon('summarize'));
        label.appendChild(el('strong', null, t('digest_badge')));
        label.appendChild(el('span', null, dagLang(digest.digest_date)));
        kaart.appendChild(label);
        const titel = el(kop, 'digest-card__titel');
        titel.appendChild(link(url.dagoverzicht(digest.digest_date), 'digest-card__link', digest.title));
        kaart.appendChild(titel);
        kaart.appendChild(el('p', 'digest-card__samenvatting', eersteZinnen(digest.summary, 240)));
        const bronnen = bronnenRegel(verhalenVanDigests([digest]), feed);
        if (bronnen) kaart.appendChild(el('p', 'digest-hero__bronnen', bronnen));
        kaart.appendChild(aanwijzing(t('v5_lees_dagoverzicht')));
        return kaart;
    }

    // "Lees het dagoverzicht →": de zichtbare aanwijzing, geen tweede link.
    function aanwijzing(tekst) {
        const span = el('span', 'digest-hero__aanwijzing');
        span.setAttribute('aria-hidden', 'true');
        span.appendChild(el('span', null, tekst));
        span.appendChild(icoon('arrow_forward'));
        return span;
    }

    // "Uit 6 bronnen: Positive.News, Science News, NPR en 3 meer"
    function bronnenRegel(refs, feed) {
        const perId = new Map(feed.map(a => [String(a.id), a]));
        const namen = [];
        for (const ref of refs) {
            const bron = perId.get(String(ref.id))?.source;
            if (bron && !namen.includes(bron)) namen.push(bron);
        }
        if (namen.length === 0) return '';
        if (namen.length === 1) return t('v5_uit_een_bron', { namen: namen[0] });
        if (namen.length <= 3) return t('v5_uit_bronnen', { n: namen.length, namen: namen.join(', ') });
        return t('v5_uit_bronnen_meer', { n: namen.length, namen: namen.slice(0, 3).join(', '), rest: namen.length - 3 });
    }

    // Lege of foutstaat in een container: icoon, kop en tekst (Day empty).
    function leeg(titelTekst, tekst, kop = 'h3', icoonNaam = 'sunny') {
        const blok = el('div', 'day-empty');
        const cirkel = el('span', 'icoon-cirkel');
        cirkel.appendChild(icoon(icoonNaam));
        blok.appendChild(cirkel);
        const binnen = el('div', 'day-empty__tekst');
        binnen.appendChild(el(kop, 'day-empty__titel', titelTekst));
        binnen.appendChild(el('p', null, tekst));
        blok.appendChild(binnen);
        return blok;
    }

    // ── Gelezen ──────────────────────────────────────────────────────────

    // In de browser, dus ook zonder account (besluit v5 · 07). Alleen de
    // laatste 300 id's: genoeg voor vandaag en gisteren.
    function gelezen() {
        try { return new Set(JSON.parse(lees(GELEZEN_SLEUTEL) || '[]')); } catch { return new Set(); }
    }

    function markeerGelezen(id) {
        const set = gelezen();
        set.delete(String(id));
        set.add(String(id));
        schrijf(GELEZEN_SLEUTEL, JSON.stringify([...set].slice(-300)));
    }

    // ── Delen ────────────────────────────────────────────────────────────

    // Share bar met echte links (werkt ook zonder JavaScript-klik) en een
    // knop voor link kopiëren.
    function deelBalk(adres, titelTekst) {
        const balk = el('div', 'share-bar');
        balk.appendChild(el('span', 'share-bar__label', t('share_label')));
        const u = encodeURIComponent(adres);
        const tt = encodeURIComponent(titelTekst);
        const platforms = [
            ['WhatsApp', 'social_whatsapp', `https://wa.me/?text=${tt}%20${u}`],
            ['Facebook', 'social_facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
            ['X', 'social_x', `https://x.com/intent/post?text=${tt}&url=${u}`],
            ['LinkedIn', 'social_linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
        ];
        for (const [naam, icoonNaam, href] of platforms) {
            const a = el('a', 'btn btn--secondary');
            a.href = href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', `${t('v5_deel_via', { platform: naam })} ${t('v5_nieuw_venster')}`);
            a.appendChild(icoon(icoonNaam));
            balk.appendChild(a);
        }
        const mail = el('a', 'btn btn--secondary');
        mail.href = `mailto:?subject=${tt}&body=${u}`;
        mail.setAttribute('aria-label', t('v5_deel_mail'));
        mail.appendChild(icoon('mail'));
        balk.appendChild(mail);
        const kopieer = el('button', 'btn btn--secondary');
        kopieer.type = 'button';
        kopieer.appendChild(icoon('link'));
        kopieer.appendChild(el('span', null, t('v5_kopieer_link')));
        kopieer.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(adres);
                window.showNotification(t('copy_success'));
            } catch {
                window.showNotification(t('v5_kopieer_mislukt'), 'error');
            }
        });
        balk.appendChild(kopieer);
        return balk;
    }

    // Tekstlink naar het origineel, in een nieuw venster.
    function origineelLink(href, tekst, klasse) {
        const a = el('a', klasse);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.appendChild(el('span', null, tekst));
        a.appendChild(el('span', 'visueel-verborgen', ` ${t('v5_nieuw_venster')}`));
        a.appendChild(icoon('open_in_new'));
        return a;
    }

    // ── Meldingen ────────────────────────────────────────────────────────

    // Zelfde aanroep als in js/auth.js, maar in de v5-opmaak (component
    // "Melding" in componenten.css). Laadt een pagina auth.js, dan wint die.
    if (typeof window.showNotification !== 'function') {
        window.showNotification = function (bericht, soort = 'success') {
            let houder = document.querySelector('.melding-houder');
            if (!houder) {
                houder = el('div', 'melding-houder');
                houder.setAttribute('role', 'status');
                houder.setAttribute('aria-live', 'polite');
                document.body.appendChild(houder);
            }
            const melding = el('p', soort === 'error' ? 'melding melding--fout' : 'melding', bericht);
            houder.appendChild(melding);
            setTimeout(() => {
                melding.classList.add('is-weg');
                setTimeout(() => melding.remove(), 400);
            }, 4000);
        };
    }

    // ── Pagina starten ───────────────────────────────────────────────────

    // Elke pagina geeft één tekenfunctie. Die draait bij het laden en
    // opnieuw na een taalwissel in het instellingenpaneel: js/v5/schil.js
    // roept dan window.wisselTaal() aan.
    function start(teken) {
        async function draai() {
            vertaalPagina();
            try {
                await teken();
            } catch (fout) {
                console.error('BrightNews v5:', fout);
                const main = document.getElementById('inhoud');
                if (main) {
                    main.replaceChildren(el('div', 'niet-gevonden'));
                    main.firstChild.appendChild(leeg(t('v5_laadfout'), '', 'h1'));
                }
            }
        }
        window.wisselTaal = function (nieuweTaal) {
            if (!TALEN.includes(nieuweTaal)) return;
            schrijf('selectedLanguage', nieuweTaal);
            draai();
        };
        draai();
    }

    window.BN5 = {
        CATEGORIEEN, taal, t, vertaalPagina, param,
        laadFeed, laadManifest, isDigest,
        dagVan, vandaag, verschuif, isDagSleutel, dagLang, dagMaand, weekdag, maandNaam, tijd, datumTijd, hoofdletter,
        aantalVerhalen, perDag, archiefPerDag, digestsVan, nieuwsteDigestDag, verhalenVanDigests, laatsteMoment,
        zonderVerwijzingen, eersteZinnen, url, metTestdag, categorieLabel,
        el, icoon, link, knop, beeld, merkbeeld, storyCard, headlineItem, editieRaster, digestCard,
        aanwijzing, bronnenRegel, leeg, gelezen, markeerGelezen, deelBalk, origineelLink, start,
    };
})();
