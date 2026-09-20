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

- [ ] **30. De marketing-agent afbouwen en in gebruik nemen.** *(Maarten)*

  **Let op voor je begint: het grootste deel staat er al.** Van de vier
  onderdelen uit `MARKETING-PLAN.md` draaien er drie mee in de pipeline, dus
  dit is geen bouwen vanaf nul maar afmaken en gaan gebruiken:

  | Onderdeel uit het plan | Staat er? |
  |---|---|
  | 1. Input: `data/marketing-feed.json` per taal | ✅ draait elke run mee |
  | 2. Generatie per taal en kanaal, itereerbare prompt | ✅ `backend/generate-posts.js` + `backend/marketing-prompt.md` |
  | 3. Draft-first met goedkeuring door een mens | ✅ de cockpit op `marketing.html`, 160 concepten klaar |
  | 4. Meetlus: bereik, kliks, registraties naast elkaar | ❌ **dit ontbreekt** |

  De leerlus is ook al rond: de cockpit schrijft je oordeel naar
  `marketing_feedback` in Supabase, en `generate-posts.js` leest dat terug in
  de prompt (`Vermijd wat eerder is afgewezen: {FEEDBACK}`). UTM-tags staan op
  alle links. Hij leert dus al van je — alleen voed je hem nog niet (punt 24).

  **Wat er werkelijk nog moet gebeuren:**
  1. **De meetlus bouwen.** Wekelijks bereik, kliks, registraties en
     promocodes naast elkaar. De bronnen zijn er: GA4 staat op de site (met
     consent mode), Search Console draait, Stripe heeft de abonnees. Wat
     ontbreekt is één plek waar die drie samenkomen, zodat je kunt zien wélke
     post werkte in plaats van dat je het gevoel hebt.
  2. **De cockpit echt gebruiken** — zie punt 24. Zonder jouw oordeel blijft
     `{FEEDBACK}` leeg en leert hij niets.
  3. **Beslissen over directe koppelingen** (Meta, LinkedIn, Buffer). Het plan
     zegt: pas later, en ook dan met goedkeuring per post. Nu plaats je zelf.
  4. **Twee weken vóór de lancering vers ingeregeld**, zoals in het plan staat
     — op echte content, niet op de concepten van nu.

  Zolang de site geparkeerd staat heeft plaatsen weinig zin: een bezoeker
  komt dan op één artikel en kan verder nergens heen. Het voorwerk (meetlus,
  cockpit voeden) kan wél nu al.

- [ ] **32. Te veel dagoverzichten, en ze blijven staan als hun bronnen weg
  zijn.** *(Maarten signaleerde dit op 2026-09-20; ik heb het nagemeten.)*

  Van de 150 kaarten op de homepage zijn er **26 een dagoverzicht — 17%**. Ze
  staan bovendien allemaal bovenaan, want `renderLijst` sorteert digests naar
  voren. Op 17 september waren het er vijf op één dag (één per categorie), dus
  je opent de site en kijkt tegen een rij samenvattingen aan in plaats van
  tegen nieuws.

  Daar komt het tweede probleem bij. Een dagoverzicht verwijst in `refs` naar
  de artikelen die het bespreekt, en die artikelen vallen na verloop van tijd
  uit de lijst van 150 (`processor.js` gooit de oudste eruit). Het overzicht
  zelf blijft dan staan met verwijzingen naar artikelen die er niet meer zijn.
  Stand op 2026-09-20:

  | | dagoverzichten |
  |---|---|
  | alle bronartikelen nog aanwezig | 21 |
  | deels verdwenen | 5 |
  | volledig verdwenen | 0 (nog) |

  De vijf van 5 september zijn het verst heen — die van Health heeft nog
  **1 van de 4** bronnen. Volledig dood is er nog geen, maar dat is een kwestie
  van dagen.

  Twee dingen om te beslissen, allebei in `backend/processor.js`:
  1. **Wanneer verdwijnt een dagoverzicht?** Voorstel: zodra er minder dan de
     helft van zijn `refs` nog in de lijst staat. Dan valt hij weg vóórdat de
     bronnenlijst gatenkaas wordt, in plaats van erna.
  2. **Hoeveel mogen er tegelijk staan?** Nu is er geen grens. Voorstel: hoogstens
     de overzichten van de laatste twee dagen bovenaan, de rest ertussen op
     datum. Dat is een ontwerpkeuze, dus die is aan Maarten.

  Let op: de statische artikelpagina's van verwijderde overzichten blijven
  bestaan (afspraak uit `CLAUDE.md`: geïndexeerde URL's mogen niet sterven).
  Het gaat hier alleen om de homepage-lijst.

- [ ] **33. Terug uit een artikel brengt je niet terug waar je was.**
  *(Maarten)* Nagemeten op de live site: gescrold naar 3000px, kaart 31
  aangeklikt, en na de terugknop stond de pagina op **0**. Je moet dus elke
  keer opnieuw zoeken waar je gebleven was — en dat is precies waarom je
  stopt met scrollen.

  Er zit al code voor in `index.js`, maar er zijn twee dingen mis:

  1. **De verkeerde positie wordt bewaard.** `toonDetail` schrijft
     `window.scrollY` naar `brightScrollPos` (regel ~340). Bij de meting stond
     daar **361** terwijl de pagina op 3000 stond. Er wordt dus een waarde van
     een eerder moment vastgelegd.
  2. **Het herstel komt te vroeg.** `renderLijst` scrollt terug binnen één
     `requestAnimationFrame` na `tekenPortie` (regel ~790). Op dat moment
     hebben de kaarten hun foto's nog niet geladen en is de pagina dus nog
     nauwelijks hoog. De browser kapt de scrollpositie af op wat er op dat
     moment past — vrijwel nul — en daarna groeit de pagina eronder verder.

  Het goede nieuws: het aantal kaarten wordt wél correct hersteld (72 van 72 in
  de meting), dus alleen de positie zelf moet nog kloppen. Oplossingsrichting:
  de hoogte vastzetten vóór het scrollen (de kaarten hebben al `width`/`height`
  op de afbeelding) of pas scrollen als de eerste rijen geladen zijn.

- [ ] **34. Te weinig lucht tussen het herroepingsvinkje en de knop.**
  *(Maarten)* Gemeten op de live abonnementenpagina: de afstand tussen het
  vinkje-blok ("Ik ga akkoord dat de dienst direct start…") en de knop
  "Start nu" is **0 pixels** — `.withdrawal-consent-label` heeft
  `margin-bottom: 0`. De tekst plakt dus tegen de knop, en juist bij een blokje
  met juridische strekking wil je dat een bezoeker ziet dat het twee aparte
  dingen zijn. Geldt voor beide betaalde kaarten. Eén regel CSS in
  `css/pages/abonnementen.css`.

- [ ] **35. Vraag bezoekers subtiel om feedback, vanuit de footer.**
  *(Idee van Maarten, 2026-09-20.)* We weten straks wél hoeveel mensen er
  komen (de meetlus, punt 30), maar niet wat ze ervan vínden. Een klein,
  onopvallend lijntje in de footer — geen pop-up, geen banner — dat een kort
  formulier opent.

  Wat we willen weten, in deze volgorde van belangrijk naar aardig:

  1. **Hoe positief en leuk vind je BrightNews?** (één schaal — dit is het
     bestaansrecht van de site, dus dit is de kernvraag)
  2. **Werkt alles technisch?** (laadt het, doet alles het, op welk toestel)
  3. **Vind je de weg?** (UX: menu, taalkiezer, artikelen terugvinden)
  4. **Hoe ziet het eruit?** (UI en kleur — splits dit niet op in twee vragen,
     dat vraagt te veel van iemand die even iets invult)
  5. **Zijn de teksten prettig te lezen?**
  6. **Open vraag:** *"Als je mocht dromen: wat zou er beter kunnen?"* — dit
     levert doorgaans de bruikbaarste antwoorden op, dus laat dit veld ruim zijn.

  Ontwerpkeuzes om te maken:
  - Vijf gesloten vragen is al veel. Overweeg drie schalen plus de open vraag,
    en de rest alleen tonen als iemand doorklikt.
  - Anoniem of met e-mailadres? Anoniem geeft eerlijker antwoorden, met adres
    kun je doorvragen. Voorstel: anoniem, met een optioneel adres.
  - In vijf talen, dus vijf nieuwe vertaalsleutels per vraag.

  **Verdeling:** ik kan het hele formulier bouwen, vertalen en inpassen in de
  footer. Waar het opgeslagen wordt is Eriks deel — een tabel `feedback` in
  Supabase met een insert-policy voor anonieme bezoekers. Zonder die tabel kan
  het formulier nergens heen, dus dat moet eerst.

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
  (inloggen met je account). Goedkeuren of afwijzen mét reden — de fabriek
  leert van je afwijzingen, maar alleen als je hem voedt. Let op: goedkeuren
  plaatst niets. De cockpit is draft-first, plaatsen doet altijd een mens.

  **Voorwerk gedaan op 2026-09-20.** Ik heb alle **160 conceptposts**
  doorgelopen (8 dagen × 5 talen × 4 kanalen). Technisch is er niets mis: geen
  lege posts, niets over de tekenlimiet van zijn kanaal, Instagram bevat nooit
  een kale URL en heeft gemiddeld 4,8 hashtags. X komt uit op 126 tekens
  gemiddeld. Van de 110 posts met een link wijzen er 4 naar het Nederlandse
  artikel terwijl de post in een andere taal staat — alle vier van 2026-09-09,
  dus dat is sindsdien opgelost.

  Wat er wél mis is, zit in de taal, en het is steeds dezelfde hand:

  | Wat | Waar | Hoe vaak |
  |---|---|---|
  | `#gutesnachrichten` — fout Duits, moet `#gutenachrichten` | Duits, Instagram | 4 van de 8 dagen |
  | `zorrillo` betekent **stinkdier** in Latijns-Amerika, niet "vosje" | Spaans, 2026-09-20 | alle 4 kanalen |
  | `#bienêtredesdanimaux` — tikfout, dubbele d | Frans, 2026-09-20 | 2 posts |
  | `Link en bio` moet `Link en la bio` | Spaans | 2 posts |
  | accenten in hashtags splitsen het bereik | fr, de, es | ~10 hashtags |

  **Wat Maarten in de cockpit doet:** de Spaanse dag van 20 september afwijzen
  met reden "zorrillo betekent stinkdier, gebruik zorro pequeño", en de Duitse
  Instagram-posts met "#gutesnachrichten is geen Duits, moet #gutenachrichten".
  De rest kan goedgekeurd.

  **Wat dit structureel is:** de posts worden in het Nederlands geschreven en
  daarna vertaald, met dezelfde instructie-familie als de artikelen. Deze twee
  fouten staan al in `backend/vertaal-steekproef.md` als bevinding 2
  (Nederlands woord letterlijk vertaald) — ik heb er een aanvulling onder gezet
  met deze cijfers en drie voorstellen. Een grammaticaal foute hashtag hoort
  niet elke dag opnieuw afgewezen te hoeven worden; dat los je op in de
  vertaalprompt. *(Maarten voedt de cockpit, Erik pakt de vertaalprompt)*

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
