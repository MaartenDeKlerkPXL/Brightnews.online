# TODO BrightNews

Werklijst, opgesteld 2026-09-10 na een ronde langs de projectdocumenten, de
open pull requests en een paar eigen metingen op de site. Gesorteerd op
urgentie, niet op moeite.

Afspraken over hóé we werken staan in `CLAUDE.md` (branch per klus, eslint op
0 errors, `CACHE_NAME` bumpen, vertaalkeys in 5 talen). Vink af door `[ ]` te
vervangen door `[x]` en zet er kort bij wat er gebeurd is.

---

## Blokkeert de lancering

- [ ] **1. De twee open pull requests vlottrekken.** Allebei hebben ze
  merge-conflicten (`mergeable=CONFLICTING`) en lopen achter op master:
  [#1](https://github.com/MaartenDeKlerkPXL/Brightnews.online/pull/1)
  (cookiebanner, herroepingsvinkje, nav-bug, Stripe Climate) staat 42 commits
  achter en raakt 770 bestanden;
  [#5](https://github.com/MaartenDeKlerkPXL/Brightnews.online/pull/5)
  (reservefoto's per categorie) staat 15 commits achter en raakt er 30.
  Keuze per PR: opnieuw opbouwen op de huidige master, of de conflicten
  uitvechten. Begin bij #5 — die is klein, en hoe langer hij blijft staan hoe
  erger het conflict wordt. *(Maarten)*

- [ ] **2. Parkeer-gate verwijderen bij livegang.** Sinds 2026-09-10 zit dit op
  **drie plekken in `index.html`**, want het parkeerbericht staat nu op de
  homepage zelf in plaats van achter een doorverwijzing:
  1. de klasse `geparkeerd` op het `<html>`-element,
  2. het gate-script en het style-blok eronder in de `<head>`,
  3. de div `#parkeerbericht` bovenaan de `<body>`.

  Daarnaast: de teamlogin op `binnenkort.html` en de `noindex` op die pagina.
  Bij alle drie de plekken in `index.html` staat een commentaarregel die dit
  herhaalt. Vergeten = bezoekers blijven het binnenkort-bericht zien terwijl de
  site live is. Zet dit bovenaan de lanceerchecklist. *(Maarten + Erik)*

- [ ] **3. Misser-artikelen: gedocumenteerd, opruimen is uitgesteld.** De negen
  gepubliceerde missers van run 1 en 2 staan sinds 2026-09-10 uitgewerkt in
  `backend/selectie-prompt-analyse.md` (bijlage), met per artikel de reden.
  **Besluit Maarten:** het opruimen zelf heeft geen haast — de site staat
  geparkeerd achter `binnenkort.html`, dus ze doen nu weinig kwaad. Waar het om
  gaat is dat Erik en Fable de prompt zo bijstellen dat dit type er niet meer
  doorheen komt. Het daadwerkelijk uit de feed en de sitemap halen kan later,
  vóór de lancering; de werkwijze staat in die bijlage beschreven. *(Erik, na
  het bijstellen van de prompt)*

- [ ] **4. Lemon Squeezy afbouwen** en daarna het Supabase-toegangstoken van
  Erik intrekken (Account → Access Tokens → Revoke). Stripe draait live sinds
  2026-09-05; Lemon hangt er nog parallel bij. Zie `STRIPE-MIGRATIE.md`.
  *(Erik, daarna Maarten voor het token)*

## Conversie en eerste indruk

- [ ] **5. Homepage laadt alle 150 kaarten in één keer.** De pagina wordt
  daardoor 24.141 pixels lang (gemeten 2026-09-10). De foto's zijn wel
  `loading="lazy"`, dus het is minder erg dan het klinkt, maar een "Laad
  meer"-knop bij 24 kaarten scheelt laadtijd en scrollmoeheid. *(Maarten)*

- [ ] **6. Cookiebanner compacter maken** — op mobiel bedekt hij bijna het
  halve scherm en hij zweeft over de content, ook over de abonnementskaarten.
  Doel: één regel plus twee knoppen als onderbalk. Zit in PR #1. *(Maarten)*

- [ ] **7. Herroepingsvinkje in de plankaart** in plaats van als losse
  checkbox erboven. Functioneel werkt het al; het is puur de plek die
  onlogisch is. Zit ook in PR #1. *(Maarten)*

- [ ] **8. "€0 vandaag" als hoofdargument** bij de proefperiode, in plaats van
  de huidige regel "Eerste 30 dagen gratis". Badge op de kaart plus microcopy
  onder de knop: "Vandaag €0 — opzegbaar tijdens de proefperiode". *(Maarten)*

- [ ] **9. Sparkle-kaart (gratis plan) heeft geen knop.** Een "Blijf gratis
  lezen"-knop naar de homepage maakt de keuze compleet. *(Maarten)*

## Techniek en onderhoud

- [ ] **10. Meldingen in `js/auth.js` zijn hardcoded Nederlands.** Regels
  70–79 sturen `Welkom ${name}!` en de foutteksten letterlijk mee, dus een
  Engelse of Duitse bezoeker krijgt Nederlands te zien. Omzetten naar
  vertaalkeys in `data/translations.js` — elke key in 5 talen. *(Maarten)*

- [ ] **11. Referral-systeem is nooit afgemaakt.** Staat als TODO in
  `js/main.js:22`; `add_premium_reward` bestaat wel. Afmaken of de resten
  opruimen — half werk in de code is erger dan geen werk. *(Erik)*

- [ ] **12. Footer-socials linken naar profielen die niet bestaan.** Elke klik
  leidt nu naar een 404. Claim de handles (zie punt 21) of haal de iconen
  tijdelijk weg. *(Maarten)*

- [ ] **13. Witte tekst op #32CD32 haalt geen WCAG AA** (ongeveer 2:1). Was
  een bewuste keuze, maar geldt sinds 2026-09-09 ook voor de footer-iconen die
  bij hover wit werden. Een tint donkerder groen voor knoppen en hover-states
  lost het in één klap op. Meenemen in de volgende designronde. *(Maarten)*

- [ ] **14. Taalkiezer op mobiel** is groot ten opzichte van de navigatiebalk.
  Overweeg alleen de vlag of de ISO-code op smalle schermen. *(Maarten)*

- [ ] **15. Laadskeletten voor de nieuwskaarten** (grijze placeholder-blokken)
  in plaats van een lege pagina tijdens het ophalen van de JSON. *(Maarten)*

- [ ] **16. 263 archiefpagina's draaien nog op het oude template.** Eén keer
  bewust regenereren maakt alles uniform; de brondata is er. Let op de regel
  uit `CLAUDE.md`: statische artikelpagina's nooit verwijderen. Overleggen met
  Erik. *(Erik)*

- [ ] **17. Bronnen saneren.** LET OP, nuance uit
  `backend/selectie-prompt-analyse.md`: bij Sciencenews (12 van 15) en
  BBC/culture (4 van 19) is de afwijzing "tekst onleesbaar" — daar wordt de
  brontekst verkeerd uitgelezen, dus schrappen lost het verkeerde probleem op.
  Newatlas is wél een echte kandidaat: 70 items voor 5 treffers, tekst prima
  leesbaar. Oorspronkelijke notitie: Het weekrapport (W37) laat zien: Newatlas 11%
  acceptatie, ScienceNews 0%, BBC-culture 6%. Dat is veel API-verbruik voor
  weinig. Adventure-Journal levert nieuwsbrief-fragmenten als items — idem
  bespreken. *(Erik)*

- [ ] **18. `npx eslint .` geeft sinds 2026-09-09 twee errors**, allebei in
  `backend/generate-rapport.js` (commit `f666f14`, marketing fase M1):
  `TALEN` wordt toegekend maar nooit gebruikt (regel 15) en de waarde van
  `advies` wordt nergens meer gelezen (regel 106). De norm uit `CLAUDE.md` is
  0 errors, dus dit hoort opgeruimd voor het meesluipt in volgende commits.
  *(Erik)*

- [ ] **19. Selectieprompt: Erik leest de analyse, test en geeft zijn
  bevindingen.** In `backend/selectie-prompt-analyse.md` staat een diagnose op
  basis van 300 beoordelingen uit `data/selectie-log.json`. Belangrijkste
  vondst: de afwijslijst wordt overgeslagen — alle vier de weekoverzichten en
  podcast-transcripten in het log zijn goedgekeurd met 8 of 9 punten, terwijl
  hun titels woordelijk in de afwijslijst staan. Vermoedelijke oorzaak is de
  instructie "score eerst, besluit daarna", waardoor de afwijzing via de scores
  moet lopen. Er is bewust **niets** gewijzigd: Erik leest dit uit met Fable,
  ziet de artikelen dagelijks langskomen en beoordeelt zelf of het patroon
  klopt voordat er iets aan de prompt verandert. *(Erik)*

- [ ] **20. Vertaalprompt bijstellen na de steekproef.** In
  `backend/vertaal-steekproef.md` staan zeven bevindingen uit twintig
  vergelijkingen (vijf artikelen × vier talen), met zes concrete voorstellen
  voor de vertaalprompt. De grote lijn is in orde: er wordt niets ingekort, er
  blijft nergens Nederlands staan en de bronnenlijsten zijn compleet. Het gaat
  mis in de details: verkeerd geslacht (het Duits spreekt zichzelf tegen binnen
  één artikel), vertaalde organisatienamen, een toegevoegd feit, en titels met
  een hoofdletter op elk woord in Frans en Spaans. Spaans is duidelijk het
  zwakst. Belangrijker nog: een vage Nederlandse kop wordt in vier talen
  vermenigvuldigd, dus verbeteren aan de schrijfkant werkt vier keer door. Er is
  bewust **niets** gewijzigd. *(Erik)*

## Buiten de code — alleen Maarten kan dit

- [ ] **21. Socials claimen**: `facebook.com/brightnews.online`,
  `instagram.com/brightnews.online`, `linkedin.com/company/brightnews-online`.
  Nodig vóór de marketing-agent er is, en lost punt 12 meteen op.

- [ ] **22. Search Console terugkijken.** De sitemap is ingediend op
  2026-09-05 met 2.072 pagina's; onder Indexering → Pagina's zou het aantal
  geïndexeerde pagina's moeten oplopen. Onder Prestaties zie je op welke
  zoektermen BrightNews verschijnt.

  **Extra check, rond 24 september** (een week of twee na de wijziging van
  2026-09-10): kijk onder Indexering → Pagina's specifiek naar de status van
  `/` zelf. Die stond op "uitgesloten" of "pagina met omleiding", omdat de
  homepage doorverwees naar een pagina met `noindex`. Sinds het parkeerbericht
  op de homepage zelf staat hoort hij naar **"geïndexeerd"** te gaan. Blijft
  hij uitgesloten, geef dat dan door — dan kijk ik verder.

- [ ] **23. Marketing-cockpit gebruiken** op `brightnews.online/marketing.html`
  (inloggen met je account). Daar staan dagelijks conceptposts in 5 talen
  klaar. Goedkeuren of afwijzen mét reden — de fabriek leert van je
  afwijzingen, maar alleen als je hem voedt.

- [ ] **24. Deel-previews in het echt testen** op WhatsApp en LinkedIn. De
  `og:image` in het artikeltemplate wijst naar de echte artikelfoto
  (gecontroleerd 2026-09-10), dus technisch zit het goed — maar zien is
  geloven.

---

## Afgerond

- [x] **Test-endpoint van de Stripe-webhook verwijderd** (2026-09-10). Stripe
  meldde mislukte bezorgingen; het bleek uitsluitend de testomgeving. Na de
  test-E2E van 4 september waren de testvlaggen weggehaald terwijl het
  endpoint bleef staan, dus weigerde de functie elk testbericht met
  **401 "Ongeldige signature"** — bevestigd in het dashboard (17 leveringen,
  12 mislukt). Endpoint verwijderd in de sandbox; het echte endpoint blijft
  staan en is gezond (de enige 409 daar was de bekende race van 5 september,
  14 seconden later vanzelf goedgegaan via Stripes herhaalpoging). Voor een
  volgende testronde moet het endpoint opnieuw worden aangemaakt.
- [x] **Navigatiebalk bleef niet plakken** (2026-09-09, commit `d043fa7`). De
  nav schoot na ongeveer een schermhoogte los. Oorzaak: `html, body { height:
  100% }` maakte de body-box precies één scherm hoog, en een sticky element
  kan niet verder plakken dan zijn ouder.
- [x] **Artikeltitel schoof over de navigatiebalk** (2026-09-09, commit
  `0739b47`). De nav-stijlen stonden op de kale selector `header`, en het
  artikeltemplate gebruikt ook een `<header class="detail-header">`. Nu
  afgebakend tot `body > header`.
- [x] **Dagoverzichten bovenaan**, ook met een categoriefilter (2026-09-09).
- [x] **Nav-logo 60px → 50px** en **footer-iconen wit bij hover**
  (2026-09-09).
- [x] **Teamlogin op de parkeerpagina** in plaats van een open `?team=1`-link
  (2026-09-09, commits `cab7952`, `9c66844`, `c54da95`). Let op: bewust
  client-side, dus geen echte beveiliging.
