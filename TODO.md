# TODO BrightNews

Werklijst, opgesteld 2026-09-10 na een ronde langs de projectdocumenten, de
open pull requests en een paar eigen metingen op de site. Gesorteerd op
urgentie, niet op moeite.

**Nummers blijven staan waar ze staan.** Is een punt af, dan verhuist het naar
het blok onderaan en blijft zijn nummer ongebruikt. Er zitten dus gaten in de
reeks, en dat is de bedoeling: in commitberichten en op de pull requests wordt
naar puntnummers verwezen, en die verwijzingen moeten blijven kloppen.

Afspraken over hóé we werken staan in `CLAUDE.md` (branch per klus, eslint op
0 errors, `CACHE_NAME` bumpen, vertaalkeys in 5 talen). Vink af door `[ ]` te
vervangen door `[x]` en zet er kort bij wat er gebeurd is.

---

## Blokkeert de lancering

- [x] **1. De twee open pull requests vlottrekken.** ✅ 2026-09-16 (Fable-review): #5 gemerged + og:image-absoluutfix erachteraan; #1 lokaal gemerged (bronwerk integraal overgenomen, sw-conflict → v23) en pagina's geregenereerd. Oorspronkelijke tekst: Allebei hebben ze
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

- [ ] **4. Lemon Squeezy: alleen nog buiten de repo.** Betalingen lopen sinds
  2026-09-05 volledig via **Stripe Managed Payments**; Lemon Squeezy wordt
  nergens meer gebruikt. In de code staat alleen nog dood materiaal: een paar
  toelichtende regels, de ongebruikte klassenaam `btn-lemon-checkout` op twee
  knoppen (zonder opmaak) en `LemonSqueezy` als globale variabele in
  `eslint.config.js` (nergens aangeroepen). Opruimen mag, maar heeft geen haast.

  Wat wél nog moet, en allebei buiten de repo:
  1. **De Lemon Squeezy-winkel sluiten** in dat account. *(Maarten)*
  2. **Daarna het Supabase-toegangstoken van Erik intrekken** — Account →
     Access Tokens → Revoke. Dat stond altijd al als sluitstuk van het
     betaaltraject. *(Maarten)*

## Techniek en onderhoud

- [ ] **11. Referral-systeem is nooit afgemaakt.** Staat als TODO in
  `js/main.js:22`; `add_premium_reward` bestaat wel. Afmaken of de resten
  opruimen — half werk in de code is erger dan geen werk. *(Erik)*

- [ ] **13. Witte tekst op #32CD32 haalt geen WCAG AA** (ongeveer 2:1). Was
  een bewuste keuze, maar geldt sinds 2026-09-09 ook voor de footer-iconen die
  bij hover wit werden. Een tint donkerder groen voor knoppen en hover-states
  lost het in één klap op. Meenemen in de volgende designronde. *(Maarten)*

- [ ] **14. Taalkiezer op mobiel** is groot ten opzichte van de navigatiebalk.
  Overweeg alleen de vlag of de ISO-code op smalle schermen. *(Maarten)*

- [ ] **16. 385 artikelpagina's draaien nog op een oud sjabloon.** Van de 2.905
  artikelpagina's dragen er **385** nog de doodlopende LinkedIn-link
  (`/company/brightnews-online`); de rest is na PR #1 opnieuw gegenereerd. Het
  zijn archiefpagina's, die bewust blijven staan omdat hun URL's geïndexeerd
  zijn. Eén keer bewust regenereren maakt alles uniform — brondata is er.
  Overleggen met Erik. *(Erik)*

- [ ] **26. Anthropic: auto-reload aanzetten en key-eigendom beslissen.**
  De storing van 10–13 september was een lege kredietbalans; de key blijkt op
  Eriks account te staan (Maartens console heeft geen organisatie). Erik:
  (a) zet auto-reload aan in console.anthropic.com → Billing, en (b) beslis
  samen: key migreren naar een account van Maarten (zoals bij Stripe) of
  bewust bij Erik laten en de break-even-som aanpassen. *(Erik + Maarten)*

- [ ] **27. Stripe Climate verifiëren vóór lancering.** De over-ons-sectie
  (PR #1) claimt dat een vast deel van elk abonnement via Stripe Climate naar
  CO₂-verwijdering gaat. Check in het Stripe-dashboard dat Climate echt
  aanstaat met een ingesteld percentage — de claim moet waar zijn vóór de
  site publiek gaat. *(Maarten)*

- [ ] **28. De voorraad reservefoto's is te klein geworden.** Gemeten op
  2026-09-20 bij de volledige lijst van 150 kaarten: **27 reservefoto's nodig,
  26 beschikbaar**. Gevolg: één dubbele foto op de pagina en tien foto's uit een
  andere categorie dan het artikel.

  Dit is geen fout in de code — die doet precies wat PR #5 belooft: eerst een
  foto uit de eigen categorie, dan lenen uit een andere, en pas als werkelijk
  alles op is een herhaling. Alleen is "alles op" nu werkelijkheid.

  De oorzaak zit in de feed: **25 artikelen delen hun foto met een ander
  artikel**. De ontdubbeling grijpt dan in en vraagt een reservefoto. Op
  2026-09-10 waren er nog 14 reservefoto's nodig, nu 27 — in tien dagen bijna
  verdubbeld, en het groeit mee met de feed.

  | Categorie | Beschikbaar | Nodig | Tekort |
  |---|---|---|---|
  | Science | 4 | 8 | **4** |
  | Lifestyle | 4 | 7 | **3** |
  | Environment | 5 | 7 | **2** |
  | Health | 5 | 3 | — |
  | Tech | 4 | 2 | — |
  | Finance | 4 | 0 | — |

  Vier à vijf foto's extra bij Science, Lifestyle en Environment lost het op.
  Aanleveren in `assets/fallback/` als `<categorie>-<n>.jpg`, max 1400px breed —
  de code leidt de categorie rechtstreeks uit de bestandsnaam af.

  Overweeg daarnaast de nachtelijke controle hierop te laten meten. Dan zie je
  aankomen wanneer de voorraad weer krap wordt, in plaats van dat je het bij
  toeval ontdekt zoals nu. *(Maarten levert foto's, of Erik automatiseert de
  meting)*

## Buiten de code — alleen Maarten kan dit


- [ ] **23. Search Console terugkijken.** De sitemap is ingediend op
  2026-09-05 met 2.072 pagina's; onder Indexering → Pagina's zou het aantal
  geïndexeerde pagina's moeten oplopen. Onder Prestaties zie je op welke
  zoektermen BrightNews verschijnt.

  **Extra check, rond 24 september** (een week of twee na de wijziging van
  2026-09-10): kijk onder Indexering → Pagina's specifiek naar de status van
  `/` zelf. Die stond op "uitgesloten" of "pagina met omleiding", omdat de
  homepage doorverwees naar een pagina met `noindex`. Sinds het parkeerbericht
  op de homepage zelf staat hoort hij naar **"geïndexeerd"** te gaan. Blijft
  hij uitgesloten, geef dat dan door — dan kijk ik verder.

- [ ] **24. Marketing-cockpit gebruiken** op `brightnews.online/marketing.html`
  (inloggen met je account). Daar staan dagelijks conceptposts in 5 talen
  klaar. Goedkeuren of afwijzen mét reden — de fabriek leert van je
  afwijzingen, maar alleen als je hem voedt.

- [ ] **25. Deel-previews in het echt testen** op WhatsApp en LinkedIn. De
  `og:image` in het artikeltemplate wijst naar de echte artikelfoto
  (gecontroleerd 2026-09-10), dus technisch zit het goed — maar zien is
  geloven.

---

## Afgerond

- [x] **Socials bestaan en staan in de footer** (2026-09-16). Facebook draait op
  Maartens eigen naam omdat Facebook destijds geen bedrijfsnaam toestond en dat
  achteraf niet meer te wijzigen is; het is wel degelijk de BrightNews-pagina.
  Instagram is `instagram.com/brightnews.online`, LinkedIn
  `/in/brightnews-online-5206a53b3/`. Daarmee is ook de voorwaarde voor de
  marketing-agent vervuld.
- [x] **Cookiebanner is een compacte onderbalk** (PR #1, gemerged door Erik op
  2026-09-16). Was een zwevend kaartje dat op mobiel bijna het halve scherm
  bedekte; nu `position: fixed; bottom: 0` met één regel tekst en twee knoppen.
- [x] **Herroepingsvinkje zit in de plankaart** (PR #1, 2026-09-16). Eén vinkje
  per betaald plan in de kaart zelf; klikken zonder vinkje markeert dát vakje
  rood en zet de aandacht erop, zonder door te gaan naar de afrekenpagina.
- [x] **Footer-socials kloppen** (2026-09-16). Facebook wijst naar Maartens
  BrightNews-pagina, Instagram klopte al, en LinkedIn staat sinds PR #1 op
  `/in/brightnews-online-5206a53b3/` in plaats van het niet-bestaande
  `/company/`-adres.
- [x] **500-woorden-premium gestopt** (2026-09-16, besluit Erik na Maartens
  juridische analyse van 5 sep — het "J3-punt"). De lange hervertellingen per
  artikel zijn uit de pipeline (full_text = korte bron-getrouwe samenvatting)
  én uit de database geveegd (475 rijen van 95 fase-2-artikelen terug naar
  samenvattingslengte; dagoverzichten ongemoeid — die zijn juist het sterke,
  eigen premium-materiaal). Premium = dagoverzichten + straks vroege
  toegang/nieuwsbrief, zie MARKETING-PLAN.md.

- [x] **Homepage laadt 24 kaarten per keer** (2026-09-10). Stond op alle 150
  ineens, waardoor de pagina 24.141 pixels lang werd; nu krap 5.000 bij
  binnenkomst, met een knop voor de rest. De fotolijst blijft bestaan tussen
  porties door, dus geen dubbele foto's, en terugkomen uit een artikel herstelt
  het aantal getoonde porties.
- [x] **"€0 vandaag" als hoofdargument** (2026-09-16). Gele markering naast de
  prijs van beide betaalde plannen, plus een korte regel onder de knop.
- [x] **Knop op de gratis kaart** (2026-09-16). "Blijf gratis lezen", als link
  naar de voorpagina — geen afrekenknop, want er valt niets af te rekenen.
- [x] **Meldingen in `js/auth.js` vertaald** (2026-09-10 en 2026-09-16). Eerst de
  vier welkomstteksten na registreren, daarna de foutmeldingen van de
  inlogdienst, die eerder rauw en in het Engels werden doorgegeven. De
  technische tekst blijft in de console staan.
- [x] **Laadskeletten voor de nieuwskaarten** (2026-09-16). Zes grijze
  kaartvormen in plaats van een regel tekst; verborgen voor schermlezers, en
  zonder glans als het systeem op minder beweging staat.
- [x] **Mistral-sleutel weggehaald uit GitHub Secrets** (2026-09-16, door
  Maarten). De adapter zette Mistral automatisch in de fallback-keten zolang die
  sleutel bestond, en strandde dan elke run drie keer op een rate limit. Scheelt
  ±30 seconden per run en veel ruis in het log. Te controleren bij de
  eerstvolgende run: er hoort geen enkele regel met `mistral/` meer in te staan.
- [x] **Anthropic-account uitgezocht** (2026-09-16). `console.anthropic.com`
  stuurt Maarten door naar `/create`, wat betekent dat zijn account geen
  organisatie heeft. De API-sleutel staat dus vrijwel zeker op Eriks account —
  zie het nieuwe punt hieronder over auto-reload en eigendom.
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
