# Planning lancering BrightNews v5: zondag 22 november 2026

Gemaakt op maandag 2 november 2026. Alle taken staan op naam van Maarten,
ook wat eerst bij Erik lag. Het werk is af op **zondag 15 november**; van 16
tot en met 21 november is buffer voor problemen en fouten. Op 22 november
gaat de site live.

- **Week 1 (2 t/m 8 november):** vakantie, dus hele dagen. Hier zit het
  zware werk: nieuws, beveiliging en alles met Supabase en Stripe.
- **Week 2 (9 t/m 15 november):** minder tijd (ongeveer 2 à 3 uur per dag).
  Lanceringswerk dat in kleine stukken kan.
- **Week 3 (16 t/m 21 november):** buffer. Geen nieuwe dingen bouwen, alleen
  repareren en testen.

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
   - **Inlogmails via Resend** in plaats van de mailserver van Supabase, die
     er maar 2 per uur verstuurt (TODO 68). Zonder dit kan na de lancering
     bijna niemand inloggen.
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

### Week 1: vakantie, hele dagen

**Maandag 2 november**
- ✅ Bedankt, Over ons, Zo kiezen we, Contact en Feedback gebouwd.
- ✅ Juridische pagina's, 404, Afmelden, cookiebalk en de foutstaat van de
  homepage gebouwd.
- Het nieuws weer aanzetten (TODO 26): een eigen organisatie in
  `console.anthropic.com`, betaalmethode met auto-reload, nieuwe sleutel als
  GitHub-secret `ANTHROPIC_API_KEY`, en de nieuws-Action handmatig draaien.
  Haal ook het secret `MISTRAL_API_KEY` weg.

**Dinsdag 3 november**
- Controleren of de nachtruns van het nieuws goed gingen (artikelen,
  dagoverzicht, nachtelijke beoordeling).
- Beveiligingscontrole (TODO 67): de skill maken met de pdf en de foto, de
  volledige controle draaien en wat eruit komt meteen oplossen. Neem de twee
  Instagram-lijstjes mee in de skill; de eerste ronde staat al bij TODO 67.
- ✅ Eerste ronde gedaan; wat eruit kwam staat in TODO 68 t/m 73.
- **Meteen vandaag, het is klein werk met veel effect:**
  - de SMTP van Supabase naar Resend zetten, de mail-limiet ophogen, en
    inloglink en wachtwoord vergeten testen (TODO 68);
  - kijken welk plan er bij Resend staat (TODO 68);
  - een melding bij laag tegoed in console.anthropic.com (TODO 69.2).
- Een PR met de opruiming: `axios`, `nodemailer` en `pdfkit` weg,
  `npm audit fix`, en het SQL-bestand voor de Supabase-advisor (TODO 71 en 72).
  Laat hem nakijken door een review-agent en draai de nieuws-Action
  daarna één keer handmatig.
- De juridische teksten (privacy, voorwaarden, refund) naar een jurist sturen,
  zodat het antwoord binnen is vóór 13 november.

**Woensdag 4 november**
- PR #15 (vijf gratis artikelen per maand) en PR #16 (scraper) nakijken met
  een review-agent, testen en mergen.
- Supabase in de v5-pagina's laden: inloggen met inloglink en met wachtwoord,
  account maken, wachtwoord vergeten, uitloggen, en `data-ingelogd` op elke
  pagina (TODO 66, punten 9 en 11).

**Donderdag 5 november**
- Mijn account koppelen: status, plan, tegoed, de mails-toggle en Abonnement
  beheren via het Stripe-klantportaal (TODO 66, punt 10).
- De echte paywallstaat op de artikelpagina via `lees_artikel()` (TODO 66,
  punt 6).
- De ontbrekende staten van Mijn account en Wachtwoord vergeten bouwen.

**Vrijdag 6 november**
- Stripe Checkout op Abonnementen, met het gekozen plan en `?next=` (TODO
  66, punt 7).
- Bedankt koppelen: Premium ziet aangaan via de webhook (TODO 66, punt 12).
- De staat "terug van Stripe" op Abonnementen bouwen.
- Alles testen in de testmodus van Stripe.

**Zaterdag 7 november**
- Contact en Feedback laten versturen: Supabase-tabellen met alleen
  insert-rechten, honeypot en een limiet per IP (TODO 66, punt 13). Leg
  ook een maximale lengte vast in de database (2000 en 1000 tekens), niet
  alleen in het formulier.
- De gezondheidscontrole in de nieuws-Action: een run faalt als er 24 uur
  geen nieuw artikel bij is gekomen, en die mislukte run mailt Maarten
  (TODO 69.1).
- De nieuwsdata: één dagoverzicht per dag, volledige tekst van het
  dagoverzicht, categorie in het manifest, en een runlog zodat een storing
  anders oogt dan een lege dag (TODO 66, punten 2 t/m 5).

**Zondag 8 november**
- Het artikelsjabloon (`backend/generate-articles.js`) naar v5 omzetten en de
  actuele artikelen opnieuw maken.
- Bepalen hoe het archief meegaat (de oude artikelpagina's), zodat dat maandag
  kan draaien.

### Week 2: minder tijd, 2 à 3 uur per dag

**Maandag 9 november**
- Het archief opnieuw maken in het v5-sjabloon, steekproef nakijken, sitemap
  opnieuw maken. Niets verwijderen.

**Dinsdag 10 november**
- De v5-pagina's naar hun echte adressen zetten, de oude adressen laten
  werken, en de adressen in `partials/v5/` en `js/v5/gedeeld.js` aanpassen.

**Woensdag 11 november**
- CSP op alle pagina's en in het artikelsjabloon (Supabase, Stripe, Google).
- De cookiebalk laat GA4 laden na toestemming.
- Service worker: precache naar de v5-bestanden, `CACHE_NAME` bumpen.
- Snelheid meten (Lighthouse: LCP en CLS) op home, artikel en archief.

**Donderdag 12 november**
- De hele keten echt doorlopen met een echte kaart en een wegwerp-
  e-mailadres (TODO 31). Opschrijven wat misgaat en dat oplossen.

**Vrijdag 13 november**
- De juridische teksten van de jurist verwerken, alle [haken] invullen, en de
  privacyregel over feedback nalezen (TODO 43).
- Steekproef op de vertalingen in alle vijf talen.

**Zaterdag 14 november**
- Controleren of `?staat=` live niets meer doet (TODO 73).
- Supabase naar Pro, zodat er dagelijkse back-ups zijn vóór de eerste
  betalende lezers. Zet daar ook de bescherming tegen gelekte wachtwoorden
  aan (TODO 70 en 72.4).
- Alles naar master mergen, met de parkeerpagina nog aan. Testen op de echte
  site via `/?team=1`, op telefoon en computer, licht en donker.

**Zondag 15 november**
- Eindcontrole. Vanaf nu bouw je niets nieuws meer.
- Het draaiboek voor 22 november klaarzetten (de zes stappen van TODO 2),
  met daarbij hoe je terugdraait als het misgaat: `git revert` van de
  merge, `CACHE_NAME` bumpen, en de parkeerpagina terugzetten.

### Week 3: buffer, 16 t/m 21 november

Elke dag hetzelfde rondje: staat het nieuws van vandaag erop, gingen de
nachtruns goed, en lukt een testbetaling nog. Wat misgaat, los je op. Is er
niets mis, dan zijn de punten van "mag ná de lancering" eventueel een optie,
maar alleen als ze niets aan de bestaande site veranderen.

### Zondag 22 november: lancering

- De parkeerpagina weghalen (TODO 2, zes stappen) en `CACHE_NAME` bumpen.
- Live nakijken: home, artikel, inloggen, een betaling, op telefoon en
  computer.
- De sitemap opnieuw indienen in Search Console en aanmelden bij Google
  Publisher Center (TODO 54).
- De lancering aankondigen op de eigen kanalen.

---

## Waar het kan misgaan

- **Week 1 is vol.** Supabase en Stripe koppelen is het grootste en minst
  voorspelbare werk. Loopt het uit, dan schuift het in week 2. De buffer
  van week 3 blijft er dan nog.
- **De jurist** hangt niet van jou af. Stuur de teksten dinsdag 3 november.
- **Het Anthropic-tegoed:** zonder auto-reload stopt het nieuws opnieuw
  zonder dat iemand het merkt. Zet het meteen aan.
- **De inlogmails** (TODO 68): als het SMTP-werk van 3 november blijft
  liggen, merk je het pas op de lanceringsdag, wanneer lezers vanaf de
  derde mail per uur geen inloglink meer krijgen.

### Mag ná de lancering (beveiliging)

- Security headers via Cloudflare voor GitHub Pages (dat laat zelf geen
  headers toe). Zie TODO 67, eerste ronde.
- Een eigen klein foutlogje vanuit de browser naar Supabase (TODO 69.3).
