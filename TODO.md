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

## Voor Erik — je instap (bijgewerkt 2026-09-26, avond)

**PR #6 en #7 zijn gereviewd en gemerged (2026-09-26)** — het alarm draait mee
in de Action en de meetlus schreef meteen echte Search Console-cijfers in het
weekrapport. Punt 11 is nagekeken en afgevinkt. Daarna is
**[PR #8](https://github.com/MaartenDeKlerkPXL/Brightnews.online/pull/8)
gemerged: een volledige review-ronde** (alarm dekt nu ook de
continue-on-error-stappen, evergreen/digest-validaties, cachebump-bewaking,
feedback-endpoint begrensd, en het weekrapport + de conceptposts zijn uit de
publieke repo verhuisd naar RLS-tabellen — zie het Afgerond-blok). Wat er op
jouw naam open blijft:

| | Wat | Sinds |
|---|---|---|
| **43** | De privacyregel over feedback nalezen | 24 sept |
| **3** | De selectieprompt bijstellen op tien missers | 10 sept |
| **26** | Anthropic auto-reload + wie de key houdt *(samen met Maarten)* | 19 sept |
| **45** | Socials koppelen aan de marketing-agent — **nog niet te doen**, zie hieronder | 26 sept |

Voor Maarten kwamen er twee kleine puntjes bij: de **Google Analytics Data
API aanzetten** in Google Cloud (zie punt 30) — tot die tijd toont het
rapport alleen de Search Console-kant — en **de cockpit even nalopen**: die
leest de concepten en het rapport sinds PR #8 uit Supabase in plaats van uit
publieke bestanden (je bestaande posts en rapporten zijn gemigreerd).

**Punt 45 staat er wél bij maar kun je nog niet oppakken.** Het koppelen van de
marketing-agent aan Instagram, Facebook en LinkedIn wacht op drie dingen die
alleen Maarten kan doen: er moet een Facebook-Pagina komen, Instagram moet op
Business, en er moet een LinkedIn-bedrijfspagina zijn. Zonder die accounts is
er niets om tegenaan te bouwen — een Meta-app hang je aan een Pagina, en de
LinkedIn-aanvraag vraagt om een pagina waar je beheerder van bent. Het punt
staat uitgewerkt zodat je weet wat eraan komt en wat de doorlooptijden zijn;
**begin er niet aan tot Maarten stap 1 t/m 3 heeft afgevinkt.**

**Wat er sinds 20 september op master is geland** (zodat je niet hoeft te
graven): de artikelpagina's linken nu naar elkaar en het archief staat weer op
één sjabloon, er is een ontwerpsysteem met tokens, een merklettertype
(Schibsted Grotesk, zelf gehost), een feedbackformulier op `/feedback.html` met
een eigen Supabase-tabel, en de 404 heeft navigatie en footer gekregen. Niets
daarvan raakt de backend, de pipeline of de betalingen — dat blijft jouw kant.

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

- [x] **11. Referral-systeem is nooit afgemaakt.** ✅ 2026-09-26 nagekeken in
  Supabase: `add_premium_reward` bestaat inderdaad níet (het public-schema
  kent alleen `cleanup_profile_after_user_delete`, `delete_user_immediately`,
  `get_full_article` en `redeem_promo_code`). De code roept hem ook nergens
  aan — `processReferralReward` logt alleen en verwijst naar dit punt. Er is
  dus geen kapotte aanroep; het TODO-commentaar in `js/main.js` klopt. Bouwen
  (RPC met security definer + audit-trail) pas als het referral-systeem
  prioriteit krijgt.

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

- [x] **29. Pull request #6 wacht op Erik.** ✅ 2026-09-26 — gereviewd en
  gemerged. Bij de review bleek de nieuwe stapnaam ("🚨 Controle: …") het
  complete workflow-YAML ongeldig te maken (dubbele punt in een ongequote
  scalar — GitHub weigerde zelfs de handmatige trigger); naam gequote in
  `16bcac9`. Alarm-scenario's lokaal nagespeeld (tegoed-op-signatuur,
  feeds-kapot, rustige dag) en de eerste echte run draaide de controle groen
  mee. Oorspronkelijke tekst hieronder.

  Het alarm dat een nieuwsrun laat
  falen als hij stilletjes niets oplevert
  ([#6](https://github.com/MaartenDeKlerkPXL/Brightnews.online/pull/6)) staat
  open sinds 2026-09-16 en is nog niet bekeken. Het is het enige werk van onze
  kant waar niets mee gebeurd is. Zonder dit alarm herhaalt de storing van
  10–13 september zich geruisloos: de Action meldde toen "success" terwijl er
  drie dagen niets gepubliceerd werd, dus er ging ook geen mail uit.
  `backend/controleer-run.js` slaat alleen aan bij nul kandidaten, bij tekst
  zonder AI-aanroepen, of als het nieuwste artikel ouder is dan drie dagen — op
  rustige dagen blijft hij stil. Getest op zes scenario's, inclusief de echte
  cijfers van 13 september.

  **Waarom het acht dagen stilstond, nagekeken op 2026-09-24: er was nooit een
  reviewer aangevraagd.** `CLAUDE.md` schrijft voor dat nieuw werk voor de
  ander een PR *met review-verzoek* krijgt, en dat is hier niet gebeurd — bij
  #7 evenmin. Zonder dat verzoek stuurt GitHub geen mail, dus Erik kón het niet
  weten. Dit was dus niet "Erik reageert niet", maar "Erik is nooit gevraagd".
  Beide PR's hebben nu een review-verzoek aan `erikdeklerk-rehab`, en de
  sessiestart-checklist in `CLAUDE.md` is aangescherpt zodat dit niet opnieuw
  gebeurt. *(Erik: reviewen en mergen)*

- [ ] **30. De marketing-agent: nog twee onderdelen open.** *(Maarten)*

  **Bijgewerkt 2026-09-20.** Drie van de vier onderdelen uit
  `MARKETING-PLAN.md` draaiden al mee; sindsdien zijn ook de twee laatste
  stappen gezet die nu konden:

  | Onderdeel uit het plan | Staat er? |
  |---|---|
  | 1. Input: `data/marketing-feed.json` per taal | ✅ draait elke run mee |
  | 2. Generatie per taal en kanaal, itereerbare prompt | ✅ `backend/generate-posts.js` + `backend/marketing-prompt.md` |
  | 3. Draft-first met goedkeuring door een mens | ✅ de cockpit op `marketing.html` |
  | 4. Meetlus: bereik, kliks, registraties naast elkaar | ✅ live sinds 2026-09-26 (PR #7 gemerged; Search Console levert al cijfers) |

  Maarten heeft `GOOGLE_SERVICE_ACCOUNT` en `GA4_PROPERTY_ID` als GitHub-secret
  gezet en het serviceaccount toegang gegeven in GA4 én Search Console. De
  cockpit is gevoed (punt 24). PR #7 is op 2026-09-26 gemerged; de bewijsrun
  schreef meteen echte Search Console-cijfers in het W39-rapport.

  **Eén klik blijft over (Maarten):** GA4 geeft nog een 403 omdat de **Google
  Analytics Data API niet is aangezet** in het Google Cloud-project
  (`498462657230`) — de Search Console API wél, vandaar dat die kant al werkt.
  Aanzetten: console.cloud.google.com → APIs & Services → Library → "Google
  Analytics Data API" → Enable. Daarna vullen de GA4-regels van het rapport
  zichzelf; er hoeft verder niets te veranderen.

  **Wat er nog open staat, allebei bewust later:**
  1. **Beslissen over directe koppelingen** (Meta, LinkedIn, Buffer). Het plan
     zegt: pas later, en ook dan met goedkeuring per post. Nu plaats je zelf.
     **Uitgezocht op 2026-09-26 en verhuisd naar punt 45**, inclusief wat elk
     kanaal precies vraagt, wat het kost en waarom het nu nog niet kan.
  2. **Twee weken vóór de lancering vers ingeregeld**, zoals in het plan staat
     — op echte content, niet op de concepten van nu.

  Zolang de site geparkeerd staat heeft plaatsen weinig zin: een bezoeker
  komt dan op één artikel en kan verder nergens heen.

- [ ] **43. De privacyregel over feedback nalezen.** *(Erik)* Op 2026-09-24
  is er een bullet bijgekomen onder "Jouw Privacy" op `Privacy.html`, in vijf
  talen (`privacy_list_feedback`). Hij beschrijft wat het feedbackformulier
  bewaart: de antwoorden, de toelichting, een zelf ingevuld e-mailadres, plus
  taal, herkomstpagina en soort toestel — en dat er géén IP-adres of
  browsergegevens bij ons worden bewaard.

  **Die tekst is door mij geschreven en door Maarten geaccordeerd, maar niet
  juridisch getoetst. Erik: lees na en corrigeer wat niet klopt.** Eén punt om
  scherp naar te kijken: "een IP-adres bewaren we niet" slaat op ónze tabel —
  Supabase ziet op infrastructuurniveau uiteraard wel verkeer. Als dat
  preciezer moet, is dat jouw terrein. De tabel zelf staat sinds 2026-09-24 in
  Supabase met alleen een insert-policy.

- [ ] **45. De marketing-agent koppelen aan Instagram, Facebook en LinkedIn.**
  *(Onderzocht 2026-09-25/26. **Geblokkeerd — Maarten eerst, dan Erik.**)*

  De agent zelf is af: de feed draait, de postfabriek schrijft elke nacht
  concepten in vijf talen over vier kanalen, de cockpit keurt goed en de
  afwijzingen voeden de volgende generatie. Wat ontbreekt is de laatste stap —
  een goedgekeurde post ook daadwerkelijk laten plaatsen.

  ### De rem zit niet in de code

  Twee van de drie hoofdkanalen wijzen nu naar **persoonlijke profielen**, en
  daar kan geen enkele API naartoe posten:

  | Kanaal | Wat er in de footer staat | Probleem |
  |---|---|---|
  | Facebook | `facebook.com/people/Maarten-De-Klerk/…` | persoonlijk profiel; Meta's API kan daar principieel niet naartoe posten |
  | LinkedIn | `linkedin.com/in/brightnews-online-…` | persoonlijk profiel, geen bedrijfspagina |
  | Instagram | `instagram.com/brightnews.online` | moet **Business** zijn; Creator werkt niet voor publiceren via de API |

  ### Stap 1 t/m 3 — Maarten, en dit moet éérst

  - [ ] Facebook-**Pagina** aanmaken voor BrightNews, en het Instagram-account
        eraan koppelen. *(kwartier)*
  - [ ] Instagram omzetten naar een **Business**-account. *(minuten)*
  - [ ] LinkedIn-**bedrijfspagina** aanmaken en meteen Community Management
        API aanvragen. **Dit als eerste de deur uit** — goedkeuring duurt weken
        tot maanden, dus het is de kritieke pad-stap.
  - [ ] Besluiten over X (zie hieronder) en de footerlinks bijwerken zodra de
        nieuwe accounts er zijn.

  ### Stap 4 — Erik, pas daarna

  **Meta (Instagram + Facebook) is de makkelijkste en de eerste die ik zou
  doen.** Eén app dekt allebei, want Instagram hangt onder de Pagina. En er
  is een meevaller die makkelijk over het hoofd wordt gezien: **omdat we
  alleen naar onze eigen accounts posten is er géén App Review nodig.** Een
  app in development-mode met het eigen account als Tester mag publiceren.
  Die review van 2–4 weken geldt pas als dérden hun account koppelen.
  Permissies: `instagram_business_basic` + `instagram_business_content_publish`
  (de oude `instagram_basic`/`instagram_content_publish` zijn per 27-01-2025
  vervallen), en voor de Pagina `pages_manage_posts` c.s.

  **LinkedIn is de langste.** Posten naar een bedrijfspagina vereist
  `w_organization_social` via de Community Management API, en die is alleen
  beschikbaar voor geregistreerde rechtspersonen via het partnerprogramma —
  KvK-naam, adres, website en privacybeleid worden gevraagd. Er is een
  Development- en een Standard-tier; je bouwt eerst tegen testpagina's.
  *Alternatief dat vandaag al kan:* posten naar een persoonlijk profiel via
  `w_member_social` is een dag werk, maar minder representatief.

  **X: technisch simpel, maar reken mee.** Sinds 06-02-2026 zijn de tiers weg
  en is het betalen per gebruik: $0,015 per post, maar **$0,20 zodra er een
  link in staat** — en onze posts bevatten altijd een link. Eén post per dag
  per taal is ~$73 per jaar. Let op: **X staat niet eens als hoofdkanaal in
  `MARKETING-PLAN.md`** (dat zijn Instagram, Facebook en LinkedIn), terwijl de
  postfabriek er wel elke nacht voor genereert. Uitzetten is een reële optie.

  ### Hoe het aanhaakt

  De helft staat er al: de cockpit schrijft bij elke beoordeling
  `besluit: 'goed' | 'afgewezen'` per `post_key` naar `marketing_feedback`.
  Dat is het haakje.

  Wat niet kan is publiceren vanuit de cockpit zelf — dat is een statische
  pagina in de browser, en daar kunnen geen API-sleutels in.

  ```
  cockpit (Maarten keurt goed)  ->  Supabase: besluit = 'goed'
                                            |
                        GitHub Action, los van de nieuwsrun
                                            |
                  backend/plaats-posts.js  ->  Meta / LinkedIn API
                                            |
                      Supabase: gepubliceerd, waar en wanneer
  ```

  Die laatste regel is niet optioneel: **zonder publicatielog plaatst hij bij
  elke run opnieuw.** Sleutels in GitHub Secrets, net als `ANTHROPIC_API_KEY`.
  Draft-first blijft intact — niets gaat de deur uit zonder een
  goedkeuringsregel van Maarten, en dat was zijn eigen voorwaarde in het plan.

  Eén stuk hiervan is kanaalonafhankelijk en zou dus vooruit kunnen: de
  wachtrijlezer plus die publicatielog, met een proefstand die alleen afdrukt
  wat hij zou plaatsen. **Toch niet doen zolang stap 1 t/m 3 openstaan** — er
  liggen vijf andere punten die wél af kunnen, en dit krijgt pas waarde als de
  kanalen bestaan.

  **Bronnen** (nagekeken 2026-09-25/26, deze API's wijzigen vaak — controleer
  ze opnieuw voordat je begint):
  [Instagram API 2026](https://www.getphyllo.com/post/instagram-api-integration-101-for-developers-of-the-creator-economy) ·
  [Instagram publiceren](https://postproxy.dev/blog/post-to-instagram-via-api/) ·
  [LinkedIn Community Management](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview?view=li-lms-2026-09) ·
  [Facebook Pages API](https://developers.facebook.com/docs/pages-api/getting-started/) ·
  [X API-tarieven 2026](https://postproxy.dev/blog/x-api-pricing-2026/)

- [ ] **41. Lagere prioriteit uit de UI-doorlichting — nog één over.**
  *(2026-09-23; vier van de vijf afgewerkt op 2026-09-24.)*

  1. **De CSS is desktop-first gebouwd.** 12 media-queries, allemaal
     `max-width`, nul `min-width`. De theorie wil het omgekeerd: klein scherm
     eerst, dan naar boven verrijken. **Eerlijk oordeel: dit is netheid, geen
     winst** — nagemeten loopt de site nergens over, ook niet op 320px (dat
     is 400% zoom). Alleen aanpakken als de CSS toch op de schop gaat.

  Onderdeel 2 (aanraakvlakken), 3 (lettertype), 4 (koppenstructuur) en 5
  (dode CSS) zijn gedaan; zie het afgeronde blok onderaan.

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

- [x] **44. Tekst op een groen vlak is wit (besluit Maarten, 2026-09-24).**
  De code deed allebei: elf plekken wit, zes donker. De kleurafspraak bovenin
  `global.css` zei sinds 2026-09-02 dat een groen vlak **donkere** tekst
  draagt, terwijl `.btn-primary` er elf regels verderop wit op zette — twee
  besluiten van dezelfde dag die elkaar tegenspraken.

  **Maarten heeft gekozen: wit.** Dat is nu overal doorgevoerd, zodat er één
  regel is in plaats van twee. Zeventien groene vlakken, allemaal wit, geen
  uitzonderingen meer. De afspraak in `global.css` is herschreven zodat hij
  de werkelijkheid beschrijft en dit niet over een half jaar "gerepareerd"
  wordt door iemand die de oude tekst leest.

  **Eerlijk over wat het kost, en dat staat ook in die notitie:** wit op
  `#32CD32` is 2,12:1, donker zou 8,22:1 geven, en de WCAG-ondergrens is
  4,5:1. Dit is dus een bewuste merkkeuze en geen vergissing. Wat nog open
  ligt als het ooit tóch moet kloppen: een donkerder groen speciaal voor
  knopvlakken, zodat witte tekst erop wél haalt. Dat is een aparte token en
  raakt het merkgroen zelf niet.

  Bij het teruggezetten kwam een echte fout boven water die niets met kleur te
  maken had. **Een `<button>` erft het lettertype niet** — de browser geeft
  hem zijn eigen systeemletter. Zolang de site op de systeemstack draaide viel
  dat niet op, want dat wás ongeveer dezelfde letter; sinds Schibsted Grotesk
  stond élke knop op de site in Arial terwijl de tekst eromheen klopte. Eén
  regel in de reset (`button, input, select, textarea, optgroup {
  font-family: inherit }`) en het is overal goed.

- [x] **41.3 + de laatste tokenlekken: Schibsted Grotesk, en vijf pagina's die
  hun eigen palet hadden (2026-09-24).**

  **De letter.** Maarten koos uit drie richtingen voor **Schibsted Grotesk**,
  één familie in twee rollen: kop op 800, tekst op 400. Gemaakt in opdracht
  van Schibsted, een Noors nieuwsconcern, en getekend voor koppen én lopende
  tekst tegelijk. Daarmee is de systeemstack weg, die op elk toestel iets
  anders liet zien en per definitie geen merk droeg.

  **Zelf gehost, bewust niet via Google.** De CSP van elke pagina staat op
  `font-src 'self'`; via Google zouden `fonts.googleapis.com` en
  `fonts.gstatic.com` op twaalf pagina's én in het artikelsjabloon bij moeten,
  en dat laatste zet 740 pagina's opnieuw op schijf. Zelf hosten scheelt dat
  werk, houdt het bezoekers-IP bij ons vandaan en scheelt een verbinding.
  Twee bestanden in `assets/fonts/`, **66 KB samen**, variabel over het hele
  bereik 400–800 — elke dikte daartussen kost niets extra. De licentie (SIL
  OFL, zelf hosten expliciet toegestaan) staat ernaast.

  Géén cursief meegenomen: die wordt op de hele site één keer gebruikt, de
  AI-melding onder een artikel. Daar maakt de browser zelf een schuine van.
  Dat is 66 KB bespaard voor één regel kleine grijze tekst.

  Nagemeten: de latin-subset laadt, latin-ext blijft ongeladen tot een pagina
  hem nodig heeft. Koppen 800 met een haartje negatieve letterafstand, tekst
  400.

  **De tokenlekken.** De systeemstack stond op acht plekken: één keer in
  `global.css` en zeven keer inline. Die zeven zijn nu `var(--font-tekst)`.
  Belangrijker: **vijf pagina's herdefinieerden in een eigen `:root` het
  merkgroen als `#32cc32`** — één punt naast het echte `#32CD32`, volstrekt
  onzichtbaar, maar die blokken stonden ná `global.css` en wonnen dus. Een
  toekomstige wijziging aan `--bright-green` zou daar stilletjes niets doen.
  Idem `--dark-text: #222`. Alle vijf weg; `binnenkort.html` houdt zijn eigen
  waarden, want die pagina staat bewust op zichzelf. `thanks.html` had eigen
  námen (`--bright-bg`, `--soft-gray`) voor kleuren die al een token hadden;
  die wijzen nu naar de echte. Het artikelsjabloon had nog twee losse hex-
  waarden, ook weg — 740 pagina's opnieuw gegenereerd.

  **En een contrastfout die hieronder verstopt zat.** Dezelfde vijf pagina's
  zetten op elf plekken hun koppen in groene tekst op een lichte grond,
  meerdere met `!important` — dáárom overleefden ze de contrastronde van fase
  5. Nagemeten: **2,03:1**, terwijl de ondergrens voor grote tekst 3,0:1 is.
  Het spreekt bovendien letterlijk tegen wat bovenin `global.css` staat
  ("groen als tekstkleur op een lichte ondergrond bestaat niet meer"). Nu
  `--dark-text`, 16,70:1. Groen blijft waar het hoort: het logo, de vlakken
  en de knoppen.

- [x] **De 404, de homepage-ondertitel en de Engelse Climate-link
  (2026-09-24).** Drie losse wensen van Maarten, in één ronde.

  **De 404-pagina.** Hij stond bewust op zichzelf: eigen stijlblok, geen
  externe CSS of JS, zodat hij ook zou werken als er iets mis was met de site
  zelf. Daar stond tegenover dat een bezoeker die erop belandde alleen "terug
  naar de voorpagina" kon, en dat er vijf vertalingen ónder elkaar stonden in
  plaats van de taal van de bezoeker. Nu dezelfde navigatiebalk, footer en
  vertaalopzet als elke andere pagina, en het getal 404 als decor van
  120–240px in `--neutral-200`, met `aria-hidden` omdat de kop eronder het
  werk al doet. **Die zelfstandigheid is dus ingeleverd** — valt
  `css/global.css` weg, dan valt de 404 mee. Alle paden zijn absoluut
  (`/assets/…`, `/index.html`): een 404 kan op elke diepte ontstaan,
  bijvoorbeeld op `/articles/nl/verlopen-slug.html`. Nagemeten dat er geen
  enkel relatief pad meer in staat.

  **De ondertitel op de homepage** gaat van "…in vijf talen." naar "…veel
  leesplezier!", in vijf talen. Maarten schreef "lees plezier"; dat is in het
  Nederlands één woord, dus het staat er als "leesplezier".

  **De Engelse Stripe Climate-link.** De link wées al naar
  `stripe.com/climate` — **Stripe stuurt zelf door op basis van locatie**, en
  vanuit Nederland kwam je dus op `stripe.com/nl/climate` in het Nederlands.
  Nagemeten: `/climate` en `/us/climate` gaan allebei naar `/nl/climate`,
  `/en/climate` bestaat niet (404). Alleen `/en-nl/climate` en `/gb/climate`
  blijven staan. Gekozen voor **`https://stripe.com/en-nl/climate`**: dat is
  de vorm die de táál vastzet, en de regio klopt met een Nederlands bedrijf.

- [x] **35. Feedbackvraag in de footer — af (2026-09-24).**
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

  **Bijgewerkt 2026-09-23 na Maartens doorloop.** Zeven wijzigingen: de
  uitklapper "nog twee korte vragen" is eruit (die verstopte juist de vragen
  die niemand invulde), er kwamen drie vragen bij (onderwerpen, snelheid,
  aanbeveling — acht in totaal), elke schaal heeft nu een **geen idee**-knop
  ernaast, het venster is breder op desktop (520 → 640px), er is nog maar één
  schuifbalk, "prima" lijnt nu uit onder de 5 in plaats van tegen de rand, en
  de knoppen staan gecentreerd.

  Twee dingen daarvan zaten dieper dan ze leken. De dubbele schuifbalk kwam
  doordat zowel het venster als het formulier een `max-height` had; het venster
  is nu een flex-kolom en het formulier het enige dat schuift. En "geen idee"
  is bewust **0** en niet `NULL` — dat is een antwoord, geen overslaan, en zo
  blijft die twee uit elkaar te houden. **Daardoor is het SQL-bestand
  gewijzigd**: drie kolommen erbij en de check van `1 and 5` naar `0 and 5`.
  De tabel bestond nog niet, dus dat kon zonder migratie.

  **Bijgewerkt 2026-09-24: het is geen venster meer maar een pagina.** Zie
  punt 42 hieronder in het afgeronde blok. Het lijntje in de footer wijst nu
  naar `/feedback.html`; de acht vragen, de droomvraag en het e-mailveld zijn
  ongewijzigd meeverhuisd.

  **Wat er nog moet gebeuren:**
  1. ~~De tabel aanmaken.~~ ✅ **2026-09-24 — Maarten heeft de SQL gedraaid en
     het formulier werkt.** Van buitenaf nagemeten: `PGRST205` is weg, en een
     verzoek met de anon-sleutel krijgt `[]` terug terwijl er wél een rij in
     staat. De insert-only policy doet dus wat hij moet doen — bezoekers
     kunnen antwoorden achterlaten maar niet elkaars antwoorden lezen.
     Meelezen gaat via **Table Editor → feedback** in het dashboard.
  2. ~~Eén regel in het privacybeleid.~~ ✅ **2026-09-24 — voorzet geschreven
     en geplaatst.** Staat als vierde bullet onder "Jouw Privacy", in vijf
     talen. Hij benoemt wat er bewaard wordt (antwoorden, toelichting, en
     alleen een zelf ingevuld e-mailadres), wat er dáárnaast bij komt (taal,
     herkomstpagina, soort toestel), wat er níét bewaard wordt (IP, browser),
     en waar het e-mailadres voor dient. **Maarten: dit is mijn tekst, niet
     die van een jurist — lees hem na en pas aan wat niet klopt.**

  Er is bewust alleen een insert-policy: bezoekers kunnen niet elkaars
  antwoorden lezen. Meelezen doe je in het Supabase-dashboard.

- [x] **42. Het feedbackvenster is een eigen pagina geworden (2026-09-24).**
  Het was een `<dialog>`, en dat botste met de huisregel in de uiux-design-skill:
  geen pop-ups of modals behalve een cookiebalk, en als een modal tóch de
  juiste oplossing lijkt eerst overleggen. Bij het bouwen van punt 35 heb ik
  dat niet gevraagd. Maarten koos voor de eigen pagina.

  **Wat er staat.** `/feedback.html` — een gewone pagina met dezelfde
  navigatiebalk en footer als de rest. De acht vragen staan nu **in de HTML**
  met `data-i18n` erop, precies zoals op elke andere pagina, in plaats van
  door JavaScript opgebouwd te worden. De verzendlogica is verhuisd naar
  `js/feedback.js`, dat alleen op die ene pagina geladen wordt; `index.js`
  ging daarmee van 1.489 naar 1.298 regels en zet nu alleen nog het lijntje
  in de footer. Dat lijntje wordt nog steeds door JavaScript geplaatst — de
  footer staat op twaalf losse pagina's én in het artikelsjabloon, en dat
  sjabloon aanpassen zou alle artikelpagina's opnieuw laten genereren.

  **Wat er onderweg veranderde.** "Sluiten" is "Terug naar het nieuws"
  geworden: op een pagina valt er niets te sluiten, dus je moet ergens heen
  kunnen. Na een geslaagde verzending blijven het bedankje én die link staan;
  alleen de verstuurknop verdwijnt. Het kruisje rechtsboven en de
  achtergrondlaag zijn weg, en het formulier heeft geen eigen schuifbalk meer
  — de pagina schuift. Twee nieuwe vertaalsleutels (`fb_page_title`,
  `fb_terug`) in vijf talen: 307 → 309. De pagina staat in de sitemap.

  **Een contrastfout die hierbij boven kwam.** De verstuurknop had witte tekst
  op `--bright-green`: **2,12:1**, en dat is precies wat de kleurafspraak
  bovenin `global.css` verbiedt ("groen vlak, altijd donkere tekst erop").
  Nu `--dark-text`, 8,22:1.

  Ook opgeruimd: 59 plekken waar na de tokenronde `var(--x, var(--x))` was
  blijven staan — de hexwaarde die daar als terugval stond, was door diezelfde
  ronde zelf ook vervangen.

  **Nagemeten:** acht vragen met elk een geen-idee-knop, vijf talen kloppen
  inclusief de placeholders, geen `<dialog>` meer in de DOM, het lijntje
  verdwijnt op de pagina zelf, op 375px geen horizontale overloop en alle
  aanraakvlakken 46px. Leeg versturen geeft "beantwoord eerst één vraag";
  ingevuld versturen komt aan bij Supabase en struikelt alleen nog over de
  ontbrekende tabel (`PGRST205`) — dat is punt 35.1 en wacht op Maarten.

- [x] **40 + 41 (deels). Ontwerptokens, aanraakvlakken, koppen en dode CSS
  (2026-09-24).** Vier dingen uit dezelfde doorlichting, samen gedaan omdat ze
  allemaal in dezelfde CSS-bestanden zitten.

  **Punt 40 — de tokens.** Er stonden 226 losse hex-waarden in echte CSS-regels
  (58 unieke) tegenover 168 token-aanroepen. Nu: **9 los, 385 via een token.**
  Wat er is bijgekomen in `:root` van `global.css`:
  - een **neutralenreeks** van twaalf stappen (`--neutral-900` t/m
    `--neutral-025`). De waarden zijn bewust de bestáánde grijzen, geen nette
    ronde reeks: alleen tinten die minder dan tien punten uit elkaar lagen
    zijn samengevoegd. Daarmee verdwijnen `#eee`, `#333`, `#888`, `#f0f0f0`
    én de handvol blauwgrijzen die ooit uit een bootstrap-voorbeeld zijn
    meegekomen (`#495057`, `#6c757d`, `#e9ecef`, `#f1f3f5`).
  - **`--color-error` en drie broertjes.** Rood stond op zeven waarden. Drie
    daarvan werden gebruikt als knopvlak met witte tekst erop, en **die
    haalden het contrast niet**: wit op `#ff4757` is 3,34:1, ruim onder de
    4,5:1. Dat raakte "Uitloggen" en "Abonnement opzeggen". Wit op
    `--color-error` is 4,77:1, op `--color-error-hover` 7,50:1. Eén waarde per
    rol, niet één voor alles — een vlak en een tekstkleur kunnen nu eenmaal
    niet dezelfde zijn.
  - **`--space-*` (11 stappen) en `--text-*` (8 stappen)**, plus
    `--duur-snel/-basis/-traag` en `--easing` naast de bestaande
    `--transition`.
  - `--green-tint` voor de twee bijna-witte groene vlakken. Géén tweede
    merkgroen: het is een achtergrond, geen accent.

  **Wat er bewust níét gebeurd is.** De spatiëring is nu voor 255 van de 376
  waarden een token, de tekstgrootte voor 64 van de 113. De staart (15, 25,
  14, 18, 22px; 0.9rem, 1.6rem, 1.1rem) staat er nog los bij. Die echt
  terugbrengen tot zeven stappen en vier maten betekent 20px naar 24px duwen
  en 0.9rem naar 0.95rem — dat verschuift het ritme van élke kaart, knop en
  kolom en breekt regelafbrekingen. **Dat is een herontwerp, geen opruiming,
  en het hoort met Maarten besproken te worden.** Ook blijven staan: de
  schaduwkleur van het laadskelet en het gouden verloop van de premiumbadge
  (twee op zichzelf staande componenten), en `#2bb62b` — de hoverkleur van
  "Meer laden", want een tweede groen als token wilde Maarten expliciet niet.

  **Nagemeten dat er niets verschoof.** Van alle berekende stijlen (kleur,
  achtergrond, tekstgrootte, padding, marge, randkleur, breedte, hoogte) op
  vijf pagina's is een voor-en-na-vergelijking gemaakt, element voor element.
  Op de homepage: 2 van de 316 elementen anders, allebei minder dan tien
  punten (een randje en een knopvlak). Op `profiel.html` 12 van de 249, op
  `abonnementen.html` 6 van de 195, op `Privacy.html` en `over-ons.html` 2 van
  de ~190, op een artikelpagina 5 van de 223. **Alle verschillen gaan de goede
  kant op:** puur zwart (`#000`) werd bijna-zwart, `#999` werd `#888`
  (donkerder), blauwgrijze tekst werd het groengrijs dat de site al voerde, en
  de rode knop kreeg zijn contrast terug. Nul verschillen in breedte, hoogte,
  padding of marge — de spatiëring is alleen op exacte treffers vervangen.

  Tijdens de eerste poging gingen `#444` en `#555` allebei naar `#666`, wat
  dertig elementen *lichter* maakte. De vergelijking ving dat op; daarna is de
  reeks herschreven met exacte waarden.

  **Punt 41.2 — aanraakvlakken.** 16 elementen waren op een telefoon van 375px
  lager dan 44px; nu nog één. De footerlinks waren 18px: de regelafstand zat
  als `margin` op de `<li>`, dus de ruimte tússen de links was niet klikbaar
  en je mikte op een lijntje tekst. Die marge is verhuisd naar het
  aanraakvlak zelf. **De footer wordt er op desktop niets hoger van** — de
  kolommen worden toch al uitgerekt naar de hoogste (333px gemeten, de lijst
  groeide van 189 naar 259px). Ook aangepakt: hamburgerknop (35×29 → 44×44),
  taalknop (38 → 44, met een randradius die bij die hoogte hoort), de vijf
  taalopties (42 → 44), de mobiele menulinks (31 → 44) en de twee
  cookieknoppen (35 → 44). De enige die overblijft is "Lees meer" middenin
  een zin in de cookiebalk — een link in lopende tekst hoort daar niet
  uitgerekt te worden, en de richtlijn zondert die ook expliciet uit.

  **Punt 41.4 — koppenstructuur.** De publicatiedatum stond in een `<h2>` met
  wat inline-stijl die de kopopmaak weer wegpoetste, puur om hem grijs en
  groot te krijgen. Het was bovendien de enige `h2` op een artikelpagina: een
  schermlezer kreeg "kop niveau 2: 16 september 2026" als enige structuur
  onder de titel. Nu een `<p class="artikel-datum">` met de opmaak in de CSS
  — en meteen `#888` eraf, dat haalde het contrast niet. Daarnaast zijn
  "Premium" en "Bronnen" van `h3` naar `h2` gegaan (ze waren subsecties van
  het artikel, maar stonden een niveau te diep) en de drie footerkoppen van
  `h4` naar `h3` op alle tien de pagina's plus het sjabloon. Een artikelpagina
  leest nu h1 → h2 → h2 → h3, zonder sprongen. **Het archief is bewust niet
  herschreven** (910 pagina's), dus de CSS-selectors dekken nu zowel het oude
  als het nieuwe niveau.

  Wat hier *niet* onder valt: de artikeltekst zelf is nog één alinea zonder
  tussenkoppen. Dat is een kwestie van de schrijfprompt, niet van het sjabloon.

  **Punt 41.5 — dode CSS.** `.source-tag` combineerde vier overtredingen in
  één component (11,2px, ALL CAPS, uitgerekte tracking, `#888` op 3,5:1) maar
  werd nergens meer gerenderd. Weg.

  Oorspronkelijke tekst van punt 40 stond hieronder en is verwijderd bij het
  afvinken; de meetwaarden erin staan hierboven samengevat.

- [x] **16 + 36. Artikelen linken nu naar elkaar, en het hele archief staat op
  één sjabloon (2026-09-23).** Samen gedaan, want ze raken allebei
  `generate-articles.js` en dat betekent alle 3.045 artikelpagina's aanraken.

  **Het probleem (punt 36).** Nagemeten: nul `<a>`-links tussen artikelen
  onderling. Elke pagina was een eiland dat alleen via de sitemap te vinden
  was, en Google liet 2.341 URL's ongemoeid met "Gevonden – momenteel niet
  geïndexeerd".

  **Waarom het op datum gaat en niet op categorie.** Dat was het plan, maar de
  categorie staat niet in het manifest en ook niet in de HTML van het archief
  — voor de ruim 450 gearchiveerde artikelen is die simpelweg niet meer te
  achterhalen. De datum staat er voor alle 609 wél. En datum heeft een
  eigenschap die categorie mist: het vormt één aaneengesloten ketting. Elke
  pagina linkt naar de drie artikelen ervóór en de drie erná, dus vanaf elke
  geïndexeerde pagina kan een crawler naar zijn buren lopen en vandaar verder.

  **Nagemeten dat die ketting echt sluit:** vanaf één willekeurige pagina zijn
  in elke taal alle 609 artikelen bereikbaar. Dat is het hele punt — het
  archief hing voorheen aan de sitemap alleen.

  Daarvoor moesten de titels in het manifest komen: de slug volstaat niet,
  daar maak je geen leesbare linktekst van. Voor het archief zijn ze uit de
  bestaande `<h1 itemprop="headline">` gehaald — 3.045 titels, nul mislukt.
  De generator schrijft ze voortaan zelf mee.

  **Het archief (punt 16).** `generate-articles.js` schrijft alleen de
  artikelen die nog in `data/news_*.json` staan, dus 750 pagina's; van de
  overige 2.295 is de brondata er niet meer. Daarvoor is
  `backend/migratie-meer-nieuws.js` geschreven, die het blok invoegt en de
  taalkiezer bijwerkt in de bestaande HTML. Hij gebruikt `burenHtml()` uit de
  generator zelf, zodat archief en sjabloon niet uit elkaar kunnen lopen, en
  hij is idempotent (tweede run: 0 wijzigingen).

  Het bleken inderdaad drie generaties, zoals dit punt vermoedde — maar
  anders verdeeld dan gedacht: 930 met een kale vlag-emoji zonder span, 1.225
  met de vlag in een span maar zonder `taal-naam`/`taal-code`, en 890 die al
  goed stonden. De doodlopende LinkedIn-link uit de oude telling bestond
  niet meer; die generatie was al overschreven.

  **Eindcontrole over alle 3.045 pagina's:** alle drie de generaties weg
  (3.045 op de huidige taalkiezer), blok op elke pagina, **18.270 links
  gecontroleerd en nul kapot**, tag-balans overal intact, en de diff per
  archiefpagina is precies één gewijzigde regel plus het toegevoegde blok.

  Onderweg nog één ding rechtgezet: de kop van het blok had `data-i18n`, en
  volgde daarmee de menutaal van de bezoeker in plaats van de taal van de
  pagina — een Duitse kop boven Nederlandse links. Die staat er nu uit; de
  kop komt uit de statische HTML en hoort bij zijn eigen links.

  **Aanvulling diezelfde dag: de categorie zit er nu ook in.** Het manifest
  kende hem niet, maar er bleek meer te herleiden dan gedacht, uit drie
  bronnen (`backend/backfill-categorie.js`): de actuele lijsten (150), het
  digest-id — dagoverzichten heten `dg-JJJJMMDD-categorie` (5) — en de
  reservefoto in de HTML, want `assets/fallback/<categorie>-N.jpg` verraadt
  hem (81). Samen **236 van de 609 artikelen, 39%**. De generator schrijft de
  categorie voortaan zelf mee, dus dat percentage loopt vanzelf op.

  Het blok toont nu eerst maximaal twee artikelen uit **dezelfde categorie** en
  daarna de datumburen. Dat laatste is bewust niet vervangen: de datumketting
  is wat het archief bereikbaar houdt, en de categorie is voor 61% van de
  artikelen onbekend. Na de wijziging opnieuw nagerekend: **609/609 bereikbaar
  in alle vijf de talen**, 14.485 links, nul kapot.

  Eén waarschuwing bij de derde bron: `reserveAfbeelding()` valt terug op
  Lifestyle als de categorie niet in `RESERVE_PER_CATEGORIE` staat. Een
  artikel met een categorie buiten die zes (`General` bestaat) leest daardoor
  als Lifestyle. Handvol gevallen, en het ergste gevolg is een iets minder
  passende suggestie.

  **Bijvangst, en het was een echte fout van ons.** `RESERVE_PER_CATEGORIE`
  in `generate-articles.js` stond nog op de aantallen van vóór 20 september
  (Science 4, Lifestyle 4, Environment 5) terwijl `index.js` en de map al op
  11, 9 en 10 stonden. Artikelpagina's gebruikten dus alleen de eerste vier
  Science-foto's, en **zestien van de foto's die Maarten had aangeleverd lagen
  er ongebruikt bij**. Gelijkgetrokken. Sitemap opnieuw gegenereerd.

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
