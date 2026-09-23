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

- [ ] **2. Parkeer-gate verwijderen bij livegang.** Opnieuw nagelopen op
  2026-09-20, met regelnummers erbij. Het zijn zes ingrepen, niet drie.

  **In `index.html` — drie blokken weg:**
  1. regel 2: de klasse `geparkeerd` op `<html>`;
  2. regels 18–99: het commentaar, het gate-script en het style-blok in de
     `<head>`;
  3. regels 133–149: de `<div id="parkeerbericht">` bovenaan de `<body>`.

  **Op drie andere plekken:**
  4. `sw.js`: **`CACHE_NAME` bumpen.** `index.html` staat in de precache-lijst.
     HTML is network-first, dus online ziet iedereen direct de echte site, maar
     de offline-terugval blijft anders het parkeerbericht — een terugkerende
     bezoeker zonder verbinding krijgt dan "Binnenkort" te zien terwijl de site
     live is.
  5. `marketing.html` regel 125: een ingelogde gebruiker die géén teamlid is
     wordt naar `/binnenkort.html` gestuurd. Na de lancering is dat een
     doodlopende pagina; dat moet `/` worden.
  6. `binnenkort.html` zelf: **beslissen wat ermee gebeurt.** Hij staat op
     `noindex` en niet in de sitemap, dus Google heeft hem niet — maar wij
     hebben hem maandenlang rondgestuurd, dus er zijn bookmarks. Mijn voorstel:
     het bestand laten staan en er een doorverwijzing naar `/` van maken, zodat
     zo'n bookmark niet op een verouderd "Binnenkort" uitkomt. De teamlogin
     (naam + wachtwoord `happytester`) kan daarbij weg.

  **Daarna, niet vergeten:** de homepage wordt op dat moment een compleet
  andere pagina dan wat Google nu geïndexeerd heeft (nu staat het
  parkeerbericht in de index). In Search Console opnieuw laten indexeren
  aanvragen voor `/`.

  Vergeten = bezoekers blijven het binnenkort-bericht zien terwijl de site live
  is. Zet dit bovenaan de lanceerchecklist. Punt 1 tot en met 5 kan ik doen
  zodra jullie het sein geven; punt 6 is een keuze die jullie maken en de
  Search Console is voor Maarten. *(Maarten + Erik beslissen, ik voer uit)*

- [ ] **3. Misser-artikelen: gedocumenteerd, opruimen is uitgesteld.** De negen
  gepubliceerde missers van run 1 en 2 staan sinds 2026-09-10 uitgewerkt in
  `backend/selectie-prompt-analyse.md` (bijlage), met per artikel de reden.
  **Besluit Maarten:** het opruimen zelf heeft geen haast — de site staat
  geparkeerd achter `binnenkort.html`, dus ze doen nu weinig kwaad. Waar het om
  gaat is dat Erik en Fable de prompt zo bijstellen dat dit type er niet meer
  doorheen komt. **Aangevuld 2026-09-20:** er is een tiende bij gekomen, "15%
  korting op Athleta" — een winkelaanbieding met `promo-code` in de bron-URL,
  gevonden doordat Maarten hem toevallig tegenkwam bij het testen van de
  deel-previews. Staat uitgewerkt in dezelfde bijlage, met het voorstel om de
  categorie *koopjes en kortingen* expliciet in de afwijslijst te zetten. Het daadwerkelijk uit de feed en de sitemap halen kan later,
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

- [x] **28. De voorraad reservefoto's.** ✅ 2026-09-20 — zestien foto's
  toegevoegd van Pexels: zeven bij Science, vier bij Lifestyle, vijf bij
  Environment. `RESERVE_PER_CATEGORIE` in `index.js` mee opgehoogd naar 11, 8
  en 10.

  Nagemeten in de browser op alle 150 kaarten: **28 reservefoto's in gebruik,
  alle 28 uit de eigen categorie, geen enkele dubbel.** Daarvoor werden er acht
  uit een andere categorie geleend.

  Bij de keuze is op onderwerp gelet, niet alleen op aantal: Science bestond
  uit vier laboratoriumbeelden en heeft er nu sterrenkunde, ruimtevaart,
  veldwerk en onderwijs bij; Environment bestond uit symbolen en heeft er nu
  echte natuur bij; Lifestyle was vooral eten en fitness en heeft er nu mensen
  bij.

  De bewaking staat er sinds dezelfde dag: `backend/controleer-reservefotos.js`
  draait elke nacht mee (stap 7 van `backend/nachtelijke-beoordeling-prompt.md`)
  en meldt alleen iets als er iets verandert. Logboek:
  `backend/reservefotos-log.md`.

  Later die dag kwam `lifestyle-9.jpg` erbij: de gelicentieerde Adobe-foto
  (id `1986278256`) die Maarten zelf downloadde. Lifestyle staat daarmee op 9
  en het totaal op 43 reservefoto's bij 26 nodig.

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

- [ ] **30. De marketing-agent: nog twee onderdelen open.** *(Maarten)*

  **Bijgewerkt 2026-09-20.** Drie van de vier onderdelen uit
  `MARKETING-PLAN.md` draaiden al mee; sindsdien zijn ook de twee laatste
  stappen gezet die nu konden:

  | Onderdeel uit het plan | Staat er? |
  |---|---|
  | 1. Input: `data/marketing-feed.json` per taal | ✅ draait elke run mee |
  | 2. Generatie per taal en kanaal, itereerbare prompt | ✅ `backend/generate-posts.js` + `backend/marketing-prompt.md` |
  | 3. Draft-first met goedkeuring door een mens | ✅ de cockpit op `marketing.html` |
  | 4. Meetlus: bereik, kliks, registraties naast elkaar | ✅ gebouwd (`backend/meetlus.js`), ⏳ wacht op PR #7 |

  Maarten heeft `GOOGLE_SERVICE_ACCOUNT` en `GA4_PROPERTY_ID` als GitHub-secret
  gezet en het serviceaccount toegang gegeven in GA4 én Search Console. De
  cockpit is gevoed (punt 24). **De meetlus meet pas zodra Erik PR #7 mergt** —
  tot dan staat `backend/meetlus.js` niet op master en blijft het kopje
  "Bereik en zoekverkeer" in het weekrapport op "nog geen koppeling" staan.

  **Wat er nog open staat, allebei bewust later:**
  1. **Beslissen over directe koppelingen** (Meta, LinkedIn, Buffer). Het plan
     zegt: pas later, en ook dan met goedkeuring per post. Nu plaats je zelf.
  2. **Twee weken vóór de lancering vers ingeregeld**, zoals in het plan staat
     — op echte content, niet op de concepten van nu.

  Zolang de site geparkeerd staat heeft plaatsen weinig zin: een bezoeker
  komt dan op één artikel en kan verder nergens heen.

- [ ] **35. Feedbackvraag in de footer — gebouwd, wacht nog op één tabel.**
  *(Idee van Maarten, 2026-09-20. Gebouwd 2026-09-21.)*

  **Wat er staat.** Onderaan elke pagina staat één stil lijntje, "Wat vind je
  van BrightNews?", in hetzelfde grijs als de copyrightregel. Dat opent een
  `<dialog>` met drie schalen van 1 t/m 5 (hoe positief en leuk, werkt alles,
  hoe ziet het eruit), twee extra schalen achter "nog twee korte vragen"
  (vind je je weg, lezen de teksten prettig), de open droomvraag met een ruim
  veld, en een optioneel e-mailadres. Alles in vijf talen: 20 nieuwe sleutels,
  278 → 298 per taal.

  **Ontwerpkeuzes die openstonden, nu gemaakt:** drie vragen meteen zichtbaar
  en twee achter een klik, want vijf schalen ineens is te veel gevraagd van
  iemand die even iets invult. Anoniem, met een optioneel adres voor wie
  doorgevraagd wil worden. Geen user agent en geen IP; alleen het toestel als
  één woord (mobiel/tablet/desktop), genoeg voor "werkt het op mijn telefoon"
  en te grof om iemand aan te herkennen.

  Het lijntje én het venster worden door `index.js` in de DOM gezet in plaats
  van in de HTML. Dat scheelt: de footer staat op twaalf losse pagina's **en**
  in het artikelsjabloon, en dat sjabloon aanpassen zou betekenen dat alle
  2910 artikelpagina's opnieuw gegenereerd moeten worden. Nagemeten dat de
  link en het venster het ook op een artikelpagina doen.

  **Wat er nog moet gebeuren, en het is weinig:**
  1. **De tabel aanmaken.** `supabase/feedback-tabel-2026-09-21.sql` in de
     SQL-editor van Supabase draaien. Tot dan geeft het versturen netjes de
     foutmelding "het versturen lukte niet" — nagemeten: het verzoek komt aan
     bij Supabase, komt door de CSP, en struikelt alleen over de ontbrekende
     tabel (`PGRST205`). Na het draaien werkt het meteen.
  2. **Eén regel in het privacybeleid** dat we vrijwillige feedback bewaren,
     inclusief een e-mailadres als iemand dat zelf invult. *(Maarten)*

  Er is bewust alleen een insert-policy: bezoekers kunnen niet elkaars
  antwoorden lezen. Meelezen doe je in het Supabase-dashboard.

- [ ] **36. Artikelen linken niet naar elkaar — het archief is daardoor
  slecht vindbaar.** *(Gevonden 2026-09-21 bij het teruglezen van Search
  Console, zie punt 23.)*

  Nagemeten op een artikelpagina: **nul links naar andere artikelen.** De
  enige interne links zijn het menu, de footer en de `hreflang`-varianten van
  hetzelfde artikel in de andere vier talen. Elk van de 2.910 artikelpagina's
  is dus een eiland dat alleen via de sitemap bereikbaar is — en Google laat
  2.341 van die URL's ongemoeid met de melding "Gevonden – momenteel niet
  geïndexeerd".

  **Let op, er is sinds 2026-09-21 wél een begin.** De run van die ochtend
  zette `themas/`-pagina's neer: drie per taal, met echte `<a>`-links naar
  artikelen, en ze staan in de sitemap. Dat is precies het goede idee. Alleen
  is de schaal nog klein: alle drie de Nederlandse themapagina's samen wijzen
  naar **23 van de 586** artikelen. De rest blijft onbereikbaar. Dit punt gaat
  dus niet meer over "er is geen route", maar over "de route dekt 4% af".

  **Voorstel:** onderaan het artikelsjabloon een blok "meer uit deze
  categorie" met drie tot vijf artikelen uit dezelfde categorie, als gewone
  `<a>`-links in de HTML (dus niet door JavaScript ingeladen, want dan leest
  Google ze niet). `backend/generate-articles.js` heeft de volledige lijst
  al in handen op het moment dat het de pagina schrijft.

  Dit raakt het artikelsjabloon, en dat betekent alle artikelpagina's opnieuw
  genereren. Daarom loont het om dit samen te doen met punt 16 (het archief
  loopt achter op het sjabloon) en met de reservefoto-terugval uit punt 25 —
  drie ingrepen op dezelfde plek, één keer regenereren. *(Erik, via een PR —
  het raakt het artikelsjabloon)*


- [ ] **40. Geen ontwerpsysteem: tokens ontbreken en worden omzeild.**
  *(Uit de UI-doorlichting van 2026-09-23.)* **Geen enkele bezoeker merkt
  hier iets van** — dit is onderhoud, geen ervaring. Maar zonder dit blijft
  elke volgende visuele fix een pleister.

  Nagemeten over de hele CSS:

  | Wat | Wat het hoort te zijn | Wat er staat |
  |---|---|---|
  | Spatiëring | een 8-punts schaal, ~7 stappen | **24 losse px-waarden**, geen token |
  | Tekstgroottes | ~4 in een schaal | **25 verschillende**, 11 gerenderd |
  | Kleur | tokens, semantiek apart | **230 losse hex-waarden, 58 uniek** tegenover 150 token-aanroepen |
  | Animatieduur | 200/300/400ms, drie easings | **één** `--transition: all 0.3s`, 28× gebruikt |

  De tokens *bestaan* grotendeels al — ze worden alleen omzeild. `#1a1a1a`
  staat 23× letterlijk in de CSS terwijl `--dark-text` precies die waarde is;
  `#ffffff` 25× plus `#fff` nog eens 9×. Daarnaast zwerven er grijzen rond die
  nergens in de tokens staan (`#eee`, `#333`, `#888`, `#f0f0f0`) en `#000`
  negen keer, terwijl puur zwart juist vermeden hoort te worden.

  **Het scherpste voorbeeld zijn zeven verschillende roden** — `#ff4757`,
  `#d93025`, `#a32219`, `#d63031`, `#e74c3c`, `#ff2e44`, `#ff4444`. Rood is
  een semantische kleur: die hoort één waarde te hebben die overal hetzelfde
  betekent.

  Dat dit geen theorie is bleek meteen bij punt 38: de contrastfout in de
  footer kwam van een generieke `footer p { color: #99A199 }` die het won van
  de regel eronder. Eén los grijs, op de verkeerde plek, jarenlang onzichtbaar.

  **Werk:** `--space-*`, `--text-*` en `--color-error` toevoegen, en daarna de
  losse waarden vervangen. Kan stap voor stap per bestand. *(Maarten)*

- [ ] **41. Lagere prioriteit uit de UI-doorlichting — bewust niet gedaan.**
  *(2026-09-23.)* Deze kwamen uit dezelfde doorlichting maar wegen minder
  zwaar; ze staan hier zodat ze niet verdwijnen, niet omdat ze nu moeten.

  1. **De CSS is desktop-first gebouwd.** 12 media-queries, allemaal
     `max-width`, nul `min-width`. De theorie wil het omgekeerd: klein scherm
     eerst, dan naar boven verrijken. **Eerlijk oordeel: dit is netheid, geen
     winst** — nagemeten loopt de site nergens over, ook niet op 320px (dat
     is 400% zoom). Alleen aanpakken als de CSS toch op de schop gaat.
  2. **Aanraakvlakken.** 13 elementen zijn op een telefoon lager dan 32px,
     vooral de footerlinks (18px hoog). De richtlijn noemt 44px comfortabel.
     Dit is wél echte winst, en het is weinig werk.
  3. **Eén lettertype, de systeemstack.** Draagt geen merk: op elk toestel
     ziet het er anders uit en het is per definitie neutraal. Twee families
     (kop + tekst) uit Google Fonts zouden het verschil maken tussen "een
     nieuwssite" en "déze nieuwssite". De duurste ingreep op de lijst.
  4. **Koppenstructuur.** De homepage sprong van `h1` naar `h3` (nu opgelost
     door punt 39), maar op artikelpagina's is de enige `h2` de **datum** —
     dat is geen sectiekop. En de artikeltekst zelf is één alinea van 600–750
     tekens zonder tussenkoppen. Raakt het artikelsjabloon, dus hoort bij de
     bundel van punt 36.
  5. **Dode CSS.** `.source-tag` combineert vier overtredingen in één
     component (11,2px, ALL CAPS, uitgerekte tracking, `#888` op 3,5:1) maar
     wordt nergens meer gerenderd. Weggooien.

- [ ] **42. Het feedbackvenster is een modal, en dat botst met je eigen
  huisregel.** *(2026-09-23.)* In de uiux-design-skill staat jouw staande
  regel: geen pop-ups of modals behalve een cookiebalk, en als een modal
  tóch de juiste oplossing lijkt eerst overleggen. Bij het bouwen van punt 35
  heb ik dat niet gevraagd.

  Hij onderbreekt niemand — hij opent alleen na een klik — maar het blijft
  een modal. Twee alternatieven die wél binnen de regel vallen: een
  uitklapbaar blok ín de footer, of een eigen pagina `/feedback.html` waar de
  footerlink naartoe wijst. Omzetten is ongeveer een half uur.
  **Beslissing aan Maarten.**


## Buiten de code — alleen Maarten kan dit


- [x] **23. Search Console teruggekeken (2026-09-21).** Maarten stuurde de
  schermen; hieronder wat eruit te halen valt.

  **De homepage is geïndexeerd.** Dat was de openstaande vraag van punt 23 en
  het antwoord is ja: `https://brightnews.online/` staat in Prestaties bij
  "jouw content" mét een klik. De ingreep van 2026-09-10 (parkeerbericht op de
  homepage zelf in plaats van een doorverwijzing naar een noindex-pagina)
  heeft dus gewerkt.

  **De cijfers, 28 dagen:** 6 klikken, 97 vertoningen. De enige zoekterm met
  een klik is "bright news" — dat is iemand die ons al zocht, geen vondst. Van
  de vijf best bekeken pagina's zijn er vier Engelstalig en één Spaans; de
  Verenigde Staten leveren de helft van de klikken. De Nederlandse kant doet
  nog niets.

  **Het echte getal staat bij Indexering: 444 geïndexeerd, 2.442 niet.** En
  van die 2.442 valt **2.341 onder "Gevonden – momenteel niet geïndexeerd"**.
  Dat is geen fout en geen straf: Google kent die URL's uit de sitemap, maar
  heeft besloten ze voorlopig niet op te halen. Dat doet hij wanneer een site
  hem méér URL's aanbiedt dan hij de moeite waard vindt om te crawlen.

  De techniek is niet de oorzaak — dat is nagelopen en het ligt er goed bij:
  `robots.txt` staat open, de sitemap heeft 2.927 URL's, elke artikelpagina
  heeft een `canonical` en volledige `hreflang` naar alle vijf de talen plus
  `x-default`. Daar valt niets te repareren.

  **Wat er wél aan de hand is, zijn twee dingen, en ze versterken elkaar:**

  1. **De homepage zegt letterlijk één woord tegen Google: "Binnenkort".** Dat
     is de hele leesbare inhoud van de belangrijkste URL van de site. De
     nieuwslijst wordt door JavaScript uit JSON opgebouwd en staat niet in de
     HTML.
  2. **Geen enkele artikelpagina linkt naar een andere artikelpagina.**
     Nagemeten: nul `<a>`-links tussen artikelen onderling (de zes links die
     erop lijken zijn de `hreflang`-varianten van hetzelfde artikel). Elke
     artikelpagina is dus een eiland dat alleen via de sitemap te vinden is.

  Samen betekent dat: een sitemap met 2.927 URL's, en geen enkele crawlbare
  route die naar ook maar één daarvan wijst. Een sitemap is een suggestie, een
  link is een aanbeveling. Op een domein zonder geschiedenis en zonder
  verwijzingen van buitenaf weegt die suggestie licht — vandaar 2.341 keer
  "wel gezien, nog niet opgehaald".

  **Wat dit betekent voor de volgorde van het werk:** dit lost zichzelf voor
  een deel op bij de lancering, want dan verdwijnt het parkeerbericht (punt 2)
  en krijgt de homepage echte inhoud. Het tweede deel niet: zolang artikelen
  niet naar elkaar linken blijft het archief slecht bereikbaar. Een blok
  "meer uit deze categorie" onderaan het artikelsjabloon zou dat in één keer
  oplossen — dat is dezelfde plek als punt 16 en de reservefoto-terugval, dus
  het loont om die drie samen te doen. **Nieuw punt daarvoor: 36.**

  Verder uit de schermen, klein grut: 2 pagina's met een omleiding, 1
  alternatieve pagina met een correcte canonical, 98 "gecrawld – niet
  geïndexeerd" (dat is Google die wél keek en niet overtuigd raakte) en 1
  niet-HTTPS-pagina tegenover 2 met HTTPS. Site-vitaliteit staat op "geen
  gegevens": daar is simpelweg te weinig bezoek voor. Geen van deze vieren is
  nu de moeite waard om achteraan te gaan.


- [x] **25. Deel-previews.** ✅ 2026-09-20 — getest in WhatsApp én LinkedIn,
  met vier artikelen die ik vooraf had doorgemeten. Van alle 581 artikelen is
  het `og:image` opgehaald zoals een sociale crawler dat doet (371 unieke
  foto's, want artikelen delen ze onderling).

  **Mijn aanname over webp was fout.** Ik had gelezen dat LinkedIn alleen jpg,
  png en gif toont; hun eigen documentatie zegt dat. In het echt toont LinkedIn
  webp gewoon. Dat scheelt: die **100 artikelen zijn in orde**, niet stuk.

  Wat de test wél bevestigde, precies zoals voorspeld:

  | Geval | Voorspeld | LinkedIn in het echt |
  |---|---|---|
  | gewone jpeg (470 artikelen) | plaatje | ✅ plaatje |
  | webp (100 artikelen) | géén plaatje | ✅ **wél** plaatje — aanname fout |
  | bron geeft 403 (3 artikelen) | géén plaatje | ✅ geen plaatje |
  | foto van 7,4MB (4 artikelen) | géén plaatje | ✅ geen plaatje |

  **De echte omvang is dus klein:** 8 van de 581 artikelen (1,4%) laten geen
  deelplaatje zien — 3 waarvan de bronfoto niet laadt, 4 die te groot zijn en
  1 svg. Zonder plaatje toont LinkedIn wel netjes titel, domein en
  omschrijving, dus het is lelijk maar niet kapot.

  **Wat dit op termijn wél wordt.** 578 van de 581 artikelen halen hun
  deelplaatje bij de bron vandaan. Dat werkt zolang die bron blijft bestaan.
  Linkrot komt eraan: hoe ouder het archief, hoe meer bronfoto's verdwijnen, en
  dan wordt die 1,4% vanzelf groter. De oplossing ligt klaar en is dezelfde als
  destijds: in `backend/generate-articles.js` terugvallen op onze eigen
  reservefoto uit dezelfde categorie zodra de bronfoto niet laadt of te groot
  is. Onze foto's zijn rechtenvrij; de bronfoto kopiëren naar onze server mag
  niet. Geen haast bij 8 artikelen — oppakken zodra dat getal loopt, of
  meenemen als het artikelsjabloon toch open ligt (punt 16). *(Erik, via een PR
  — het raakt het artikelsjabloon)*

---

- [ ] **31. De keten aanmelden → betalen → premium lezen is nooit in het echt
  doorlopen.** *(Maarten + Erik samen)* Bij de doorlichting van 2026-09-20 kon
  ik alles testen wat zonder inloggegevens kan: elke pagina laadt zonder
  console-fouten, alle interne links en afbeeldingen bestaan, de 404 geeft een
  echte 404, de sitemap staat op 2.927 URL's en de service worker draait. Wat
  ik **niet** kan testen is de keten waar geld en accounts in zitten:

  1. registreren met een echt e-mailadres en de bevestigingsmail ontvangen;
  2. inloggen, uitloggen, wachtwoord vergeten (komt die mail aan?);
  3. een abonnement afsluiten via Stripe met een echte kaart;
  4. daarna controleren of `is_premium` echt aan gaat en of een premium-artikel
     volledig zichtbaar wordt;
  5. opzeggen, en of de toegang dan op de juiste dag stopt;
  6. een promocode inwisselen.

  Dat is de kern van het verdienmodel en hij is nog nooit van begin tot eind
  gelopen. Doe dit samen vóór de lancering, met één echte kaart en één
  wegwerp-e-mailadres, en schrijf op wat er misgaat. Dit is het soort ding dat
  je niet wilt ontdekken wanneer de eerste betalende bezoeker het ontdekt.

## Afgerond

- [x] **37. De foutstaat van de nieuwslijst bestond niet (2026-09-23).** In
  `laadNieuws` stonden beide meldingen uitgecommentarieerd:

  ```js
  if (typeof window.showNotification === 'function') {
      // window.showNotification("Fout bij laden van nieuws.", "error");
  }
  ```

  Gevolg: laadde het nieuws niet — geen verbinding, JSON stuk, server traag —
  dan werd `renderLijst` nooit bereikt en bleven de zes laadskeletten staan.
  De bezoeker keek eindeloos naar grijze blokken en kreeg geen enkele uitleg;
  de fout ging alleen naar de console. Van de vijf UI-staten was dit de enige
  die volledig ontbrak.

  Er staat nu een `toonLaadfout()` die de skeletten vervangt door een kop,
  een uitleg en een knop "opnieuw proberen", met `role="alert"` zodat een
  schermlezer het meekrijgt. Vier nieuwe vertaalsleutels in vijf talen.

  Nagemeten in een iframe met een mislukkende fetch: 0 skeletten, 0 kaarten,
  foutblok in beeld; na een taalwissel staat er "Die Nachrichten laden gerade
  nicht"; na een klik op de knop staan de 24 kaarten er weer en is het
  foutblok weg.

- [x] **38. Twee contrastfouten in de footer (2026-09-23).** Gemeten met de
  WCAG-formule op de live site:

  | Element | Grootte | Was | Norm | Nu |
  |---|---|---|---|---|
  | Footer-onderregel | 14,4px | 2,52:1 | 4,5:1 | **6,45:1** |
  | Feedbacklink | 13,6px | 2,21:1 | 4,5:1 | **6,45:1** |

  De feedbacklink was mijn eigen werk van 2026-09-21: ik had hem bewust
  hetzelfde grijs gegeven als de copyrightregel ernaast om hem stil te houden,
  en daarmee ook diens contrastgebrek overgenomen zonder het na te meten.

  De echte oorzaak zat een laag dieper dan het leek. `.footer-bottom` op
  `#aaa` aanpassen hielp niet: een generieke `footer p { color: #99A199 }`
  won het, omdat die de `p` rechtstreeks raakt. Beide gebruiken nu de
  bestaande token `--medium-text` in plaats van weer een los grijs — zie ook
  punt 40.

- [x] **39. De homepage had geen visueel anker (2026-09-23).** Twee dingen
  tegelijk opgelost, allebei hetzelfde probleem.

  **De enige `h1` stond op `.visueel-verborgen`.** Ik had hem daar zelf
  neergezet voor Google, maar daardoor was het eerste zichtbare element in
  `<main>` een filterknop: geen kop, geen belofte, geen antwoord op "wat is
  dit". Er staat nu een zichtbare paginakop met één regel eronder
  (`index_sub`, nieuw in vijf talen).

  **Alle 24 kaarten droegen exact hetzelfde gewicht** — nagemeten: één
  gedeelde stijl over alle kaarten. Perfecte consistentie, maar daarmee ook
  nul nadruk: niets stuurt het oog. De eerste kaart is nu het anker en loopt
  over twee kolommen met een hogere foto en een grotere titel.

  Dat laatste zit in één `@media (min-width: 901px)`. Onder die breedte staat
  de lijst in één of twee kolommen, en dan zou "twee kolommen breed" juist
  géén nadruk meer geven. Onderweg ging dat twee keer mis en is het
  nagemeten: eerst kreeg de uitgelichte kaart tussen 768 en 900px een
  *kleinere* foto dan zijn buren, daarna op elke breedte een te grote.
  Eindstand, gemeten op 1280/1000/900/800/360/320px: boven 900px 758 tegen
  364px breed en 340 tegen 220px hoog, daaronder overal exact gelijk aan de
  buurkaarten, en nergens horizontale overflow.

- [x] **32. Te veel dagoverzichten, en ze bleven staan als hun bronnen weg
  waren (2026-09-20).** Twee ingrepen, op Maartens keuzes:

  *Opruimen.* Een dagoverzicht verdwijnt nu uit de homepage-lijst zodra er
  **minder dan de helft** van zijn bronartikelen nog in de lijst van 150 staat
  — vóórdat de bronnenlijst gatenkaas wordt, in plaats van erna. De regel
  staat in `backend/digest-opruiming.js` en wordt aangeroepen vlak voor het
  wegschrijven in zowel `backend/processor.js` als `backend/digest.js`, want
  die schrijven allebei dezelfde bestanden. Direct toegepast op de actuele
  data: de overzichten van Environment en Health van 5 september (2 van 6 en
  1 van 4 bronnen over) zijn weg, in alle vijf de talen. De drie andere
  gehavende overzichten zitten nog boven de helft en blijven staan.

  *Sortering.* `renderLijst` zette álle 26 overzichten vooraan, dus je keek
  tegen een muur samenvattingen aan. Nu gaan alleen de overzichten van
  **vandaag en gisteren** naar boven (`isVersDagoverzicht` in `index.js`); de
  oudere schuiven gewoon op datum tussen het nieuws. Nagemeten in de browser:
  van 26 kaarten bovenaan naar 2, de rest staat verspreid op plek 11, 20, 21
  en 23. Er is bewust géén maximum per dag gekomen — vijf overzichten op één
  dag mag, ze staan alleen niet meer allemaal vooraan.

  De statische artikelpagina's van verwijderde overzichten blijven bestaan
  (afspraak uit `CLAUDE.md`: geïndexeerde URL's mogen niet sterven).

- [x] **33. Terug uit een artikel brengt je weer waar je was (2026-09-20).**
  Er zaten twee fouten in, en de eerste was een andere dan gedacht.

  **De verkeerde positie werd bewaard.** `toonDetail` verbergt eerst
  `#news-container` en las daarná pas `window.scrollY` uit. Door dat verbergen
  zakt de pagina in elkaar en kapt de browser de scrollpositie af op wat er
  nog past — vandaar de 361 die bij de meting werd opgeslagen terwijl de
  pagina op 3000 stond. De positie wordt nu als allereerste regel van
  `toonDetail` gelezen, vóór er iets aan de DOM verandert.

  **Het herstel kwam te vroeg.** Eén `requestAnimationFrame` na het tekenen
  zijn de nieuwe kaarten nog niet opgemeten. `herstelScrollPositie` probeert
  het nu per frame opnieuw tot de pagina hoog genoeg is, met een harde grens
  van een halve seconde.

  Onderweg viel nog een derde ding op: `requestAnimationFrame` vuurt niet in
  een tabblad dat op de achtergrond staat. De lijst bleef in dat geval op
  `opacity: 0` hangen — onzichtbaar, ook in de oude code. Er staat nu een
  timer naast die hem hoe dan ook aanzet.

  Nagemeten met `history.scrollRestoration = 'manual'`, zodat het herstel van
  de browser zelf niet meetelt: gescrold naar 8200, kaart 89 geopend,
  terugknop → **8200, alle 120 kaarten terug**. Vóór de fix was dat 0.

- [x] **34. Lucht tussen het herroepingsvinkje en de knop (2026-09-20).**
  `.withdrawal-consent-label` kreeg `margin-bottom: 18px` in
  `css/pages/abonnementen.css`. Nagemeten op beide betaalde kaarten: van 0px
  naar 18px. Een blokje met juridische strekking hoort niet tegen de knop aan
  te plakken.

- [x] **24. Marketing-cockpit gevoed (2026-09-20).** Maarten heeft de
  conceptposts beoordeeld in de cockpit. Let op hoe dat werkt: een oordeel
  hangt aan `dag|kanaal` en geldt dus voor alle vijf de talen van die kaart
  tegelijk — een fout in één taal wijs je af op de hele kaart, met de taal in
  de reden. Die redenen komen in `marketing_feedback` en leest
  `generate-posts.js` terug in de prompt.

  Het voorwerk stond in de analyse van alle 160 conceptposts: technisch was er
  niets mis, maar in de vertalingen zat steeds dezelfde hand —
  `#gutesnachrichten` (fout Duits, 4 van de 8 dagen), `zorrillo` (dat is
  stinkdier, geen vosje, alle 4 de kanalen van 20 september),
  `#bienêtredesdanimaux` en `Link en bio`. **Dat is structureel en komt terug:**
  het zit in de vertaalprompt, niet in deze posts. Staat als bevinding 2 in
  `backend/vertaal-steekproef.md`. *(Erik pakt de vertaalprompt op)*

- [x] **De vaste teksten in de HTML stonden in het Engels (2026-09-20).**
  Gevonden bij de volledige doorlichting: van de 413 elementen met een
  vertaalsleutel stond de vaste tekst in de HTML er bij **189** in het Engels,
  terwijl de pagina `lang="nl"` aangeeft en de Nederlandse vertaling gewoon
  bestond. Voorbeelden: "Welcome back! 😊", "Join the Community! ✨",
  "Explore", "Who are we? (Colofon)". JavaScript verving dat wel bij het laden,
  dus een bezoeker zag het hooguit even flikkeren — maar **Google draait geen
  JavaScript** en las dus een Nederlandse pagina vol Engelse tekst. Alle 189
  staan nu in het Nederlands; de vertalingen zelf waren al compleet in vijf
  talen. Structuur gecontroleerd: het aantal HTML-tags per pagina is voor en na
  gelijk.

- [x] **De homepage had geen `h1` (2026-09-20).** De enige `h1` zat in het
  parkeerbericht, en dat verdwijnt bij de lancering — daarna had de
  belangrijkste pagina van de site helemaal geen kop gehad. Er staat nu een
  visueel verborgen `h1` bovenaan `<main>`, in vijf talen, zodat het ontwerp
  hetzelfde blijft maar schermlezers en zoekmachines wel een kop vinden.
  Wil je hem zichtbaar maken, dan is het een kwestie van de klasse weghalen.

- [x] **Twee pagina's hadden geen `h1` (2026-09-20).** `profiel.html` en
  `wachtwoord-vergeten.html` begonnen bij `h2`. De zichtbare hoofdkop van elk
  paneel is nu `h1`; verborgen panelen staan op `display: none`, dus er is er
  altijd precies één. De opmaakregel pakt nu `h1` én `h2`, zodat er niets
  verschiet.

- [x] **Het logo in de navigatiebalk had geen alt-tekst (2026-09-20).** Het zit
  in een link naar de homepage, dus een schermlezer kondigde een link zonder
  naam aan — op elke pagina en op alle artikelpagina's. Nu `alt="BrightNews"`,
  ook in het artikelsjabloon.

- [x] **Paginatitels vertalen mee (2026-09-20).** Negen van de tien pagina's
  hadden een vaste titel in de `<title>`; wisselde je van taal, dan bleef er
  "Abonnementen ✨ BrightNews" in het tabblad staan, ook in het Spaans. Nu
  hangt er een `data-i18n` aan met negen nieuwe sleutels in vijf talen.
  Twee titels stonden bovendien in het Engels op een Nederlandse site:
  "Refunds" en "Thank you!" — dat is de tekst die Google leest, want crawlers
  draaien geen JavaScript. Die staan nu standaard in het Nederlands.

- [x] **De betaalregel in de footer stond in vijf talen in het Engels
  (2026-09-20).** "Payments are securely processed by Stripe, our Merchant of
  Record." stond letterlijk zo in het Nederlands, Duits, Frans én Spaans, op
  elke pagina. Nu in alle vijf de talen vertaald. *Merchant of Record* blijft
  bewust onvertaald: dat is een juridische rol, geen omschrijving.


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
