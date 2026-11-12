# Planning lancering BrightNews v5: zondag 22 november 2026

Gemaakt op maandag 2 november 2026, **herzien op woensdag 11 november**.
Alle taken staan op naam van Maarten, ook wat eerst bij Erik lag.

**Stand op 11 november:** de planning liep 8 dagen achter. Van 4 tot en met
10 november is er niets gebouwd, dus het zware werk met Supabase en Stripe
staat nog open. **Besluit Maarten (11 november): 22 november blijft staan,
en de buffer van 16 tot en met 21 november wordt bouwtijd.** Er is dus geen
reserve meer. Daarom staat er op maandag 16 november een beslismoment: ligt
het werk dan niet op schema, dan gaat er iets uit de lancering (zie "Waar het
kan misgaan").

Eén afspraak verandert nu Erik niet meer meekijkt: werk dat betalingen,
Supabase, `backend/`, `sw.js` of `js/betaal-config.js` raakt, gaat nog steeds
via een PR. Laat die PR eerst nakijken door een review-agent
(`/code-review`), en merge daarna zelf.

---

## Wat er in totaal nog moet gebeuren

### Moet vóór de lancering

1. **Het nieuws weer laten draaien** (TODO 26). Sinds 2 oktober komen er geen
   artikelen bij, want het Anthropic-tegoed is op. Zonder nieuws is er niets
   te lanceren.
2. **Beveiligingscontrole** (TODO 67, zeer hoge prioriteit), plus wat de
   eerste ronde op 3 november opleverde:
   - **Inlogmails:** de eigen SMTP via Strato staat al aan. Alleen de
     limiet nakijken en één keer testen (TODO 68).
   - **Een alarm als het nieuws stilvalt**, en uitgavenalarmen bij
     Anthropic, Supabase en Resend (TODO 69).
   - **Back-ups:** Supabase Pro vlak voor de lancering (TODO 70).
   - **Packages:** ongebruikte packages weg en `npm audit fix` (TODO 71).
   - **Supabase-advisor:** twee triggerfuncties dichtzetten en één
     `search_path` vastzetten (TODO 72).
   - **Voorbeeldstaten (`?staat=`)** live uitzetten (TODO 73).
3. **De twee open PR's afmaken:** #15 (vijf gratis artikelen per maand, de
   functie `lees_artikel()`) en #16 (de scraper).
4. **Inloggen, account en wachtwoord koppelen aan Supabase** (TODO 66, punten
   9 t/m 11).
5. **Betalen koppelen:** Stripe op Abonnementen, Bedankt die Premium ziet
   aangaan, en de echte paywallstaat per lezer (TODO 66, punten 6, 7 en 12).
6. **Contact en Feedback laten versturen** (TODO 66, punt 13).
7. **De nieuwsdata rechtzetten:** één dagoverzicht per dag, de volledige tekst
   van het dagoverzicht, de categorie in het manifest, en storing tegenover
   lege dag (TODO 66, punten 2 t/m 5).
8. **De nog ontbrekende staten bouwen:** Mijn account (Premium actief,
   opgezegd, betaling mislukt, account verwijderen), Wachtwoord vergeten
   (link verlopen, wachtwoord te kort) en Abonnementen (terug van Stripe).
9. **Het artikelsjabloon naar v5** en alle artikelpagina's opnieuw maken, ook
   het archief. Niets verwijderen: geïndexeerde adressen moeten blijven werken.
10. **De v5-pagina's op hun echte adressen zetten.** De oude adressen die
    Google kent (`Privacy.html`, `algemeene-voorwaarden.html`, `refunds.html`,
    `over-ons.html`, `contact.html` en de rest) blijven werken. `v5-404.html`
    wordt `404.html` (TODO 66, punt 8).
11. **CSP, service worker en Google Analytics:** Supabase, Stripe en Google in
    de CSP; de cookiebalk laat GA4 pas laden na toestemming (TODO 66, punt
    15); `CACHE_NAME` bumpen.
12. **Juridische teksten laten nakijken** en alles tussen [haken] invullen
    (TODO 66, punt 16; TODO 43). Dit hangt van iemand anders af, dus begin
    er vroeg mee.
13. **De hele keten één keer echt doorlopen** met een echte kaart: account
    maken, inloggen, betalen, Premium lezen, opzeggen (TODO 31).
14. **De parkeerpagina weghalen** op de dag zelf, in zes stappen (TODO 2).

### Mag ná de lancering

- Afmelden voor mails koppelen (TODO 66, punt 14). Dat is pas nodig zodra we
  zelf mails sturen; nu stuurt alleen Supabase de inlogmails.
- Google Publisher Center aanmelden (TODO 54). Dat kan pas als Google de echte
  site ziet, dus op of kort na 22 november.
- Nieuwsbrief (TODO 49), verwijzingen (TODO 48), sociale kanalen koppelen
  (TODO 45), Thema's-pagina's, en de rest van de marketingpunten.

---

## Per dag

### Wat er van 2 tot en met 10 november gebeurd is

- ✅ Bedankt, Over ons, Zo kiezen we, Contact, Feedback, de juridische
  pagina's, 404, Afmelden, de cookiebalk en de foutstaat van de homepage
  gebouwd (2 november).
- ✅ Het nieuws draait weer sinds 2 november, met nieuw Anthropic-tegoed (TODO 26).
- ✅ Eerste beveiligingsronde (3 november); de uitkomst staat in TODO 68 t/m 73.

### Woensdag 11 november (vandaag, avond)

- ✅ Opruim-PR #17 gemaakt en goedgekeurd door een review-agent: packages
  weg, `npm audit fix` en het SQL-bestand voor de Supabase-advisor (TODO 71
  en 72).
- ✅ Inlogmails nagekeken: de eigen SMTP via Strato werkt, de mail komt in
  de inbox. De mail-limiet staat op 30 per uur (TODO 68).
- ✅ **Juridische teksten:** er komt geen jurist. De teksten zeggen wat de
  site echt doet en alle [haken] zijn ingevuld. Jouw besluiten staan in
  TODO 75: het jaarabonnement, de btw-instelling in Stripe, het vinkje en
  één zin bij Account maken.
- ✅ PR #17 gemerged, beide SQL-bestanden gedraaid (`pg_cron` met twee
  opruimtaken), nieuws-Action handmatig gedraaid.
- ✅ `MISTRAL_API_KEY` weg, plan bij Resend nagekeken (gratis is genoeg).
- Nog open: Erik stelt auto-reload en een maandlimiet in bij Anthropic
  (TODO 69.2), en de Resend-sleutel naar alleen versturen (TODO 76).

### Donderdag 12 november

- ✅ Nakijken of de nachtelijke controle weer draait: **nee**, hij faalde
  van 7 t/m 11 november met een leeg antwoord. Sonnet 5 denkt standaard na
  en dat denken at het hele budget van 8000 tokens op. Gerepareerd in de
  back-end-PR (16000 tokens, effort medium, een duidelijke fout bij
  afkappen). Na het mergen de eerstvolgende nacht nakijken.
- ✅ PR #15 (vijf gratis artikelen per maand) en PR #16 (scraper) nakijken met
  een review-agent, testen en mergen. Neem in #15 de vaste `search_path` van
  `gratis_artikelen_per_maand` over (zie PR #17).

### Vrijdag 13 november

- ✅ (vervroegd naar 12 november) Supabase in de v5-pagina's laden: inloggen met inloglink en met
  wachtwoord, account maken (de taal van de lezer in `user_metadata`, nodig
  voor TODO 74), wachtwoord vergeten, uitloggen, en `data-ingelogd` op elke
  pagina (TODO 66, punten 9 en 11).
- ✅ De ontbrekende staten van Wachtwoord vergeten (link verlopen, wachtwoord
  te kort, en "zelfde als nu").
- Nog door Maarten: één echte test met een wegwerpadres (account maken met
  inloglink, wachtwoord vergeten).

### Zaterdag 14 november

- ✅ (vervroegd naar 12 november) Mijn account koppelen: status, plan, tegoed, de mails-toggle en Abonnement
  beheren via het Stripe-klantportaal (TODO 66, punt 10), plus de ontbrekende
  staten (Premium actief, opgezegd, betaling mislukt, account verwijderen).
- ✅ (vervroegd naar 12 november) De echte paywallstaat op de artikelpagina
  via `lees_artikel()` (TODO 66, punt 6).
- ✅ PR #19 gemerged (12 november, met Maartens akkoord): beide SQL-bestanden
  gedraaid, de webhook (versie 8) gedeployed, Contact en Feedback één keer
  echt getest (testberichten daarna verwijderd).

### Zondag 15 november

- ✅ (vervroegd naar 12 november) Stripe Checkout op Abonnementen, met het gekozen plan en `?next=` (TODO
  66, punt 7), plus de staat "terug van Stripe".
- ✅ (vervroegd naar 12 november) Bedankt koppelen: Premium ziet aangaan via de webhook (TODO 66, punt 12).
- Getest met een nepversie van Supabase (alle staten) en de echte
  Supabase zonder account. **Nog door Maarten:** in Stripe de doorstuurlink
  van beide betaallinks naar Bedankt zetten, en één testrun in de testmodus
  (testbetaallinks plus tijdelijk `STRIPE_ALLOW_TEST=true` op de webhook),
  of anders de echte kaarttest van 20 november.

### Maandag 16 november: beslismoment

- **Eerst kijken:** werken inloggen, Mijn account, de paywall en betalen in de
  testmodus? Zo niet, dan beslis je vandaag wat er uit de lancering gaat (zie
  "Waar het kan misgaan").
- ✅ (vervroegd naar 12 november) Contact en Feedback laten versturen: Supabase-tabellen met alleen
  insert-rechten, honeypot, een limiet per IP en een maximale lengte in de
  database (2000 en 1000 tekens) (TODO 66, punt 13).
- ✅ (vervroegd naar 12 november; de mailroute zet Maarten zelf) De gezondheidscontrole in de nieuws-Action: een run faalt als er 24 uur geen
  nieuw artikel is bijgekomen (TODO 69.1).

### Dinsdag 17 november

- ✅ (vervroegd naar 12 november) Het artikelsjabloon (`backend/generate-articles.js`) naar v5 omzetten en de
  actuele artikelen opnieuw maken.
- ✅ (vervroegd naar 12 november) Het archief opnieuw maken in het v5-sjabloon, steekproef nakijken, sitemap
  opnieuw maken. Niets verwijderen. Nieuw script `backend/migreer-archief-v5.js`
  leest elke pagina en schrijft haar op hetzelfde adres in v5. Getest op alle
  3.470 pagina's: alles leesbaar, voor de 745 artikelen uit de feed precies
  dezelfde gegevens, 19.625 interne links heel, tweede run verandert niets.
  De sitemap verandert niet (de adressen blijven gelijk). **De omgezette
  pagina's staan bewust nog niet in de branch:** master schrijft er twee keer
  per dag nieuwe bij, dus committen nu geeft bij de merge honderden
  conflicten. De nieuws-Action zet het archief om (nieuwe stap); de eerste run
  na de merge op 20 november doet het hele archief.
- Nog in het oude ontwerp: de 30 categoriepagina's (`generate-categorieen.js`)
  en de themapagina's (`generate-evergreen.js`). De v5-artikelen linken naar de
  categoriepagina's. Zie TODO 79.

### Woensdag 18 november

- ✅ (vervroegd naar 12 november) De v5-pagina's naar hun echte adressen zetten, de oude adressen laten
  werken, `v5-404.html` wordt `404.html`, en de adressen in `partials/v5/` en
  `js/v5/gedeeld.js` aanpassen (TODO 66, punt 8). Bekende adressen houden hun
  naam (ook `Privacy.html`, `algemeene-voorwaarden.html`, `refunds.html`);
  `v5-*.html` en `thanks.html` sturen door. `index.html` is de v5-home mét de
  parkeerstand. Afmelden is meteen gekoppeld (de welkomstmails linken ernaar).
- ✅ `?staat=` werkt alleen nog op `localhost` (TODO 73), net als `?vandaag=`.
- ✅ Alle mails naar de v5-huisstijl, één taal per lezer (TODO 74):
  `backend/mailopmaak.js` voor alle mails, de welkomstreeks omgezet (met een
  List-Unsubscribe-header), en de vijf Supabase-sjablonen in
  `supabase/templates/` (gemaakt door `backend/maak-mailsjablonen.js`).
  ✅ *2026-11-12 15:19:* de sjablonen staan in Supabase (backup in
  `vorige.json`). Nog: elke mail testen in nl en en.
  **Maarten:** de sjablonen in Supabase zetten: `SUPABASE_ACCESS_TOKEN=…
  node backend/maak-mailsjablonen.js --zet` (token van
  supabase.com/dashboard/account/tokens, alleen in je eigen terminal), of met
  de hand plakken uit `supabase/templates/` (onderwerpen in
  `onderwerpen.json`). `--zet` bewaart eerst de oude sjablonen in
  `supabase/templates/vorige.json`. Daarna meteen elke mail (inloglink,
  bevestiging, wachtwoord, nieuw adres) in nl en en naar jezelf; gaat er één
  mis, dan `--terug` met hetzelfde token. En in Stripe →
  Settings → Branding het logo en de kleur `#186F49`.
- ✅ Elke pagina een eigen `<link rel="canonical">` naar haar echte adres, en de
  sitemap alleen met die adressen (TODO 78: de Search Console-melding
  "Dubbele pagina zonder door de gebruiker geselecteerde canonieke versie").
- **Maarten, zodra de echte adressen er zijn:** in Stripe bij beide
  betaallinks "na betaling doorsturen" op `https://brightnews.online/bedankt.html`
  (het echte adres, niet meer `v5-bedankt.html`).

### Donderdag 19 november

- CSP op alle pagina's en in het artikelsjabloon (Supabase, Stripe, Google).
- De cookiebalk laat GA4 laden na toestemming (TODO 66, punt 15).
- Service worker: precache naar de v5-bestanden, `CACHE_NAME` bumpen.
- ✅ De besluiten uit TODO 75 staan al in de teksten (11 november). Nog wel:
  de privacyregel over feedback nalezen (TODO 43).
- Steekproef op de vertalingen in alle vijf talen.

### Vrijdag 20 november

- Supabase naar Pro (dagelijkse back-ups) en de bescherming tegen gelekte
  wachtwoorden aanzetten (TODO 70 en 72.4).
- Alles naar master mergen, met de parkeerpagina nog aan. Daarna de
  nieuws-Action één keer handmatig draaien: die zet het hele archief om naar
  v5 (stap "Archief in het actuele sjabloon"). Steekproef van vijf pagina's. Testen op de echte
  site via `/?team=1`, op telefoon en computer, licht en donker.
- De hele keten echt doorlopen met een echte kaart en een wegwerp-e-mailadres
  (TODO 31): account maken met een inloglink, wachtwoord vergeten, inloggen,
  betalen, Bedankt, Premium lezen, Mijn account, opzeggen. Dit vervangt de
  losse tests met een wegwerpadres en in de testmodus van Stripe: die doen we
  pas op de echte adressen.
- Search Console: de sitemap opnieuw indienen en de melding over de dubbele
  pagina laten valideren (TODO 78).
- Snelheid meten (Lighthouse: LCP en CLS) op home, artikel en archief.

### Zaterdag 21 november

- Repareren wat vrijdag misging. **Niets nieuws meer bouwen.**
- Het draaiboek voor 22 november klaarzetten (de zes stappen van TODO 2), met
  daarbij hoe je terugdraait: `git revert` van de merge, `CACHE_NAME` bumpen
  en de parkeerpagina terugzetten.

### Zondag 22 november: lancering

- De parkeerpagina weghalen (TODO 2, zes stappen) en `CACHE_NAME` bumpen.
- Live nakijken: home, artikel, inloggen, een betaling, op telefoon en
  computer.
- De sitemap opnieuw indienen in Search Console en aanmelden bij Google
  Publisher Center (TODO 54).
- De lancering aankondigen op de eigen kanalen.

---

## Waar het kan misgaan

- **Er is geen buffer meer.** Van 12 tot en met 16 november staat er meer werk
  per dag dan de 2 à 3 uur die je in week 2 per dag hebt. Lukt dat niet, dan valt
  op maandag 16 november een besluit over wat eruit gaat. In volgorde van
  "kan het makkelijkst wachten":
  1. **De nieuwsdata** (TODO 66, punten 2 t/m 5): de site werkt ook met de
     huidige data.
  2. **Het archief in v5:** de oude artikelpagina's blijven dan in de oude
     opmaak, en alleen de actuele artikelen gaan mee.
  3. **Contact en Feedback versturen:** tijdelijk een mailadres op die
     pagina's in plaats van een formulier.
  4. **De mails in de v5-huisstijl** (TODO 74): kan een week na de lancering.
  Wat **niet** kan wachten: inloggen, de paywall, betalen, de CSP en de
  juridische teksten.
- **De juridische teksten:** er komt geen jurist. Jij en Erik beslissen;
  de open punten staan in TODO 75. Het jaarabonnement is het belangrijkste.
- **Het Anthropic-tegoed:** zonder auto-reload stopt het nieuws opnieuw
  zonder dat iemand het merkt. Zet het meteen aan.
- **De inlogmails** (TODO 68): getest op 11 november en ze komen in de
  inbox. Vergeet niet de mail-limiet van 2 naar 30 per uur te zetten.

### Mag ná de lancering (beveiliging)

- Security headers via Cloudflare voor GitHub Pages (dat laat zelf geen
  headers toe). Zie TODO 67, eerste ronde.
- Een eigen klein foutlogje vanuit de browser naar Supabase (TODO 69.3).
- Alle accounts die nog aan het studentenadres hangen naar een blijvend
  adres zetten (TODO 77).
