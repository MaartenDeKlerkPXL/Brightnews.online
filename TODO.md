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

- [x] **4. Lemon Squeezy: alleen nog buiten de repo.** ✅ 2026-09-20 — winkel
  gesloten en Eriks Supabase-token ingetrokken, in die volgorde. Betalingen lopen sinds
  2026-09-05 volledig via **Stripe Managed Payments**; Lemon Squeezy wordt
  nergens meer gebruikt. In de code staat alleen nog dood materiaal: een paar
  toelichtende regels, de ongebruikte klassenaam `btn-lemon-checkout` op twee
  knoppen (zonder opmaak) en `LemonSqueezy` als globale variabele in
  `eslint.config.js` (nergens aangeroepen). Opruimen mag, maar heeft geen haast.

  Het dode materiaal in de code (`btn-lemon-checkout` op twee knoppen,
  `LemonSqueezy` in `eslint.config.js`) staat er nog en mag bij gelegenheid
  weg — dat is opruimwerk zonder haast.

## Techniek en onderhoud

- [ ] **11. Referral-systeem is nooit afgemaakt.** Staat als TODO in
  `js/main.js:22`. **Correctie 2026-09-20:** hier stond dat
  `add_premium_reward` wél bestaat; het commentaar in de code zegt het
  tegenovergestelde en is stelliger onderbouwd ("bevestigd: het public-schema
  was leeg vóór de profiles/articles_full-tabellen uit Fase 1"). Erik kan dat
  in één blik in Supabase nakijken. Bestaat de functie niet, dan roept de code
  iets aan wat er niet is. Afmaken of de resten opruimen — half werk in de code
  is erger dan geen werk. *(Erik)*

- [x] **14. Taalkiezer op mobiel.** ✅ 2026-09-20 — de knop toont onder 768px
  de ISO-code ("NL") in plaats van de volle taalnaam: 116px → 57px. De naam
  blijft als weggeclipte tekst staan voor schermlezers. Onderweg bleek dit
  onderdeel van een groter probleem: de hamburgerknop begon op een scherm van
  360px pas op 376px en stond dus volledig buiten beeld — op alle tien de
  pagina's én de artikelpagina's was het menu op een telefoon niet te openen.
  Ook de `margin-right: 3rem` van de hamburger en het niet-krimpende logo zijn
  aangepakt, en de homepagina bleek op mobiel 825px breed in plaats van 360px
  (flex-kolom + `width: auto` = max-content). Alles nagemeten op 320/375/414/
  768px. *(Maarten)*

- [ ] **16. Het archief loopt achter op het sjabloon — inmiddels in twee
  generaties.** Opnieuw geteld op 2026-09-20 over alle 2.905 artikelpagina's:

  | | pagina's |
  |---|---|
  | op het actuele sjabloon | 750 |
  | ouder sjabloon, nog met de doodlopende LinkedIn-link | 385 |
  | ouder sjabloon, link wel goed | 1.770 |

  De 750 zijn op 2026-09-20 opnieuw gegenereerd bij de mobiele navigatiefix.
  Bij de overige 2.155 staat nog de oude taalkiezer in de HTML. Dat is in de
  praktijk onzichtbaar, want `index.js` vervangt dat label bij het laden —
  maar het is wel scheefgroei, en zonder JavaScript zie je de oude balk.
  Het zijn archiefpagina's die bewust blijven staan omdat hun URL's
  geïndexeerd zijn; één keer bewust alles regenereren maakt het uniform en de
  brondata is er. Overleggen met Erik. *(Erik)*

- [ ] **26. Anthropic: auto-reload aanzetten en key-eigendom beslissen.**
  De storing van 10–13 september was een lege kredietbalans; de key blijkt op
  Eriks account te staan (Maartens console heeft geen organisatie). Erik:
  (a) zet auto-reload aan in console.anthropic.com → Billing, en (b) beslis
  samen: key migreren naar een account van Maarten (zoals bij Stripe) of
  bewust bij Erik laten en de break-even-som aanpassen. *(Erik + Maarten)*

- [x] **27. Stripe Climate verifiëren vóór lancering.** ✅ 2026-09-20 —
  Maarten heeft in het Stripe-dashboard bevestigd dat Climate aanstaat met een
  ingesteld percentage. De claim op de over-ons-pagina (PR #1), dat een vast
  deel van elk abonnement naar CO₂-verwijdering gaat, is dus waar en mag blijven
  staan bij de lancering.

- [ ] **28. De voorraad reservefoto's is te klein geworden.**

  **Waar dit over gaat, van voren af aan.** Elke nieuwskaart op de homepage
  heeft een foto nodig. Die komt normaal mee uit de feed van de bron. Twee
  dingen gaan daar geregeld mis: sommige bronnen sturen helemaal géén foto mee,
  en sommige sturen voor meerdere artikelen dezelfde foto — bijvoorbeeld hun
  eigen logo of een standaard sfeerplaatje bij alles van die dag.

  Zonder ingreep zou je die ene foto dus vier keer onder elkaar zien staan. Dat
  is precies wat PR #5 heeft opgelost: we hebben **26 eigen reservefoto's** in
  `assets/fallback/`, ingedeeld per categorie (`science-1.jpg`, `health-1.jpg`,
  enzovoort). Heeft een artikel geen bruikbare eigen foto, dan pakt de code een
  reservefoto **uit zijn eigen categorie**, en nooit een die al ergens anders op
  de pagina staat.

  **Wat er nu misgaat.** In sommige categorieën zijn er meer artikelen die een
  reservefoto nodig hebben dan er reservefoto's zijn. Science heeft er 7 nodig
  en wij hebben er 4. Die drie overgebleven Science-artikelen krijgen dan een
  foto uit een ándere categorie — een wetenschapsartikel met een
  gezondheidsfoto erboven. Niet kapot, wel slordig. En raakt werkelijk álles
  op, dan herhaalt een foto zich alsnog.

  **Het is dus geen bug.** De code doet exact wat is afgesproken: eerst eigen
  categorie, dan lenen, en pas als laatste redmiddel herhalen. Alleen is dat
  laatste redmiddel nu in beeld gekomen, omdat de feed steeds vaker foto's
  deelt. Op 2026-09-10 waren er 14 reservefoto's nodig, op 20 september 25 à
  27. In tien dagen bijna verdubbeld, en het beweegt met elke run mee.

  Het totaal is daarom minder interessant dan de vraag wélke categorieën
  structureel tekortkomen, en dat zijn steeds dezelfde drie:

  | Categorie | Beschikbaar | Nodig | Tekort |
  |---|---|---|---|
  | Science | 4 | 7 | **3** |
  | Lifestyle | 4 | 6 | **2** |
  | Environment | 5 | 7 | **2** |
  | Health | 5 | 3 | — |
  | Tech | 4 | 2 | — |
  | Finance | 4 | 0 | — |

  **Wat Maarten moet aanleveren.** Vier à vijf foto's extra per tekortcategorie,
  dus ongeveer 15 stuks, met wat marge voor de groei:

  - liggend formaat, ongeveer 1400px breed, `.jpg`;
  - herkenbaar voor de categorie, maar niet té specifiek — ze komen onder
    wisselende koppen te staan;
  - rechtenvrij (Unsplash of Pexels), want ze staan straks publiek op de site;
  - neerzetten in `assets/fallback/` met de naam `<categorie>-<nummer>.jpg`,
    doorgenummerd vanaf het laatste bestaande nummer. Voor Science dus
    `science-5.jpg`, `science-6.jpg`, enzovoort — zonder gaten in de reeks.

  **Wat ik daarna doe.** De code leidt de categorie uit de bestandsnaam af,
  maar het *aantal* staat hard in `index.js` in `RESERVE_PER_CATEGORIE`. Zet ik
  dat getal niet bij, dan blijven de nieuwe foto's ongebruikt liggen. Dat is één
  regel per categorie, plus het opnieuw meten of het tekort daarmee echt weg is.

  **En het voorstel dat nog openstaat:** de nachtelijke controle dit elke nacht
  laten meten. Dan zie je aankomen dat de voorraad krap wordt in plaats van dat
  het bij toeval opvalt, zoals nu. *(Maarten levert de foto's, ik doe de code)*

- [ ] **29. Pull request #6 wacht op Erik.** Het alarm dat een nieuwsrun laat
  falen als hij stilletjes niets oplevert
  ([#6](https://github.com/MaartenDeKlerkPXL/Brightnews.online/pull/6)) staat
  open sinds 2026-09-16 en is nog niet bekeken. Het is het enige werk van onze
  kant waar niets mee gebeurd is. Zonder dit alarm herhaalt de storing van
  10–13 september zich geruisloos: de Action meldde toen "success" terwijl er
  drie dagen niets gepubliceerd werd, dus er ging ook geen mail uit.
  `backend/controleer-run.js` slaat alleen aan bij nul kandidaten, bij tekst
  zonder AI-aanroepen, of als het nieuwste artikel ouder is dan drie dagen — op
  rustige dagen blijft hij stil. Getest op zes scenario's, inclusief de echte
  cijfers van 13 september. *(Erik: reviewen en mergen)*

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

- [ ] **25. Deel-previews.** WhatsApp is op 2026-09-20 door Maarten getest en
  werkt. Daarna heb ik alle **581 artikelen** doorgemeten: van elk artikel het
  `og:image` opgehaald zoals een sociale crawler dat doet (371 unieke foto's,
  want artikelen delen ze). Uitkomst:

  | | artikelen | |
  |---|---|---|
  | jpeg of png, laadt gewoon | **470** | goed |
  | **webp** | **100** | LinkedIn toont dit niet |
  | groter dan 5MB | 4 | LinkedIn slaat over, Facebook tot 8MB |
  | gif | 3 | meestal goed |
  | laadt helemaal niet (2× 403, 1× spatie in de URL) | 3 | geen plaatje |
  | svg | 1 | geen enkel platform toont dit |

  **De kern van de zaak:** 578 van de 581 artikelen halen hun deelplaatje bij
  de **bron** vandaan, niet bij ons. Wij hebben dus geen invloed op het formaat
  en geen garantie dat het blijft bestaan. Eén op de zes is webp — dat is puur
  omdat moderne nieuwssites daarop zijn overgestapt, en dat aandeel groeit.

  **Wat nog niet zeker is:** dat LinkedIn geen webp toont, staat in hun
  documentatie (zij noemen jpg, png en gif) — ik heb het niet zelf gezien. Dat
  is precies het "zien is geloven" van dit punt. Vier links om te plakken, in
  WhatsApp én LinkedIn:

  1. **webp** (het twijfelgeval):
     `/articles/nl/1000-eenden-vervangen-pesticiden-op-wijnlandgoed-1788645872913v6p9gh7ws.html`
  2. **gewone jpeg** (de controle, hoort goed te gaan):
     `/articles/nl/1000-dollar-bonus-per-dienstjaar-bij-casino-1789533075925kr6cz4g9o.html`
  3. **403 bij de bron** (hoort géén plaatje te geven):
     `/articles/nl/brief-van-hoop-uit-het-globale-zuiden-17884527811975v9r76stc.html`
  4. **7,4MB** (te groot voor LinkedIn):
     `/articles/nl/15-korting-op-athleta-in-september-2026-1788322035532buhquc0ri.html`

  Let op: LinkedIn onthoudt een preview lang. Gebruik de Post Inspector
  (`linkedin.com/post-inspector`) om opnieuw te laten ophalen.

  **De oplossing als het bevestigd wordt:** in
  `backend/generate-articles.js` de `og:image` vervangen door onze eigen
  reservefoto uit dezelfde categorie zodra de bronfoto onbruikbaar is (webp,
  svg, te groot, of hij laadt niet). Dat zijn onze eigen rechtenvrije foto's,
  dus dat mag; de bronfoto kopiëren naar onze server mag níét. Raakt het
  artikelsjabloon, dus dat gaat via een PR met Erik erbij.
  *(Maarten test, daarna ik)*

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
