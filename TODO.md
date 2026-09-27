# TODO BrightNews

> **Stand 2026-09-27, avond.** Maarten heeft alles afgewerkt wat alleen hij
> kon doen. De GA4-API staat aan, de verhuizing naar Supabase is nagemeten en
> compleet, en de drie social-kanalen bestaan nu écht. Eriks
> `SESSIEVERSLAG-VOOR-MAARTEN.md` is gelezen en verwijderd. Wat er nog op
> Maartens naam staat is één ding: wachten op de bedrijfsverificatie van
> LinkedIn. **De bal ligt bij Erik** — zie zijn instap hieronder.

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

## Voor Erik — je instap (bijgewerkt 2026-09-27, avond)

**Begin bij [PR #10](https://github.com/MaartenDeKlerkPXL/Brightnews.online/pull/10).**
Klein en schoon te mergen: X gaat uit de postfabriek. Sinds 06-02-2026 rekent
X per post af en een post mét link kost $0,20 — onze posts bevatten er altijd
een, dus ~$73 per jaar voor een kanaal dat niet eens als hoofdkanaal in
`MARKETING-PLAN.md` staat. `KANALEN` gaat van vier naar drie en
`marketing-prompt.md` is v2. De cockpit leest de kanalen uit de data en past
zich vanzelf aan.

Daarna, op jouw naam:

| | Wat | Sinds |
|---|---|---|
| **45** | **Meta-app bouwen — dit kan nu** | 26 sept |
| **3** | De selectieprompt bijstellen op tien missers | 10 sept |
| **43** | De privacyregel over feedback nalezen | 24 sept |
| **26** | Anthropic auto-reload + wie de key houdt *(samen met Maarten)* | 19 sept |
| **46** | **Nieuw:** van wie is de nachtelijke beoordeling? *(samen)* | 27 sept |

### Punt 45: de Meta-kant is vrij

De Facebook-Pagina bestaat (`facebook.com/people/BrightNews/61594888799297/`)
en Instagram is omgezet naar Business en eraan gekoppeld. Daarmee kun je
bouwen: één app dekt allebei, en **omdat we alleen naar onze eigen accounts
posten is er géén App Review nodig** — een app in development-mode met het
eigen account als Tester mag publiceren. Die review van 2–4 weken geldt pas
als dérden hun account koppelen.

**Vraag Maarten om het Pagina-token via GitHub Secrets, niet om
Paginatoegang.** Dat is bewust: zo blijft Meta op zijn naam staan, en
herhalen we punt 26 niet — daar bleek de Anthropic-sleutel achteraf op jouw
account te staan en moet dat nu rechtgezet worden.

Wat er gebouwd moet worden staat verderop bij punt 45 uitgeschreven. Eén ding
daaruit is niet optioneel: **een publicatielog**, anders plaatst de Action bij
elke run dezelfde post opnieuw.

### Punt 45: LinkedIn loopt, niets te doen

De bedrijfspagina staat er (`linkedin.com/company/brightnewsonline`) en de
Community Management API is aangevraagd als Direct Advertiser. Nu wacht het op
een bedrijfsverificatie van Microsoft Vetting Services bij Maarten. Pas als
`w_organization_social` in de scopes verschijnt, valt er iets te bouwen.

Twee dingen die tijd kostten en die je moet weten als je zelf aan die app
komt: het product moet het **enige** product op een app zijn, en de
paginakoppeling moet **per app** geverifieerd worden.

### Wat er op 27 september nog meer op master is geland

Drie kapotte footerlinks, gevonden bij het omzetten naar de nieuwe kanalen:
935 archiefpagina's wezen naar het Facebook-profiel van een onbekende, 385
naar een LinkedIn-bedrijfspagina die 404 gaf, en de rest naar persoonlijke
profielen. Alle 2.248 bestanden zijn omgezet, het artikelsjabloon mee,
`CACHE_NAME` op v36. **Je cachebump-bewaker draaide daarbij groen mee** — hij
is dus in het echt getest en doet wat hij moet doen.

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

  **De GA4-klik is gedaan (Maarten, 2026-09-27).** De Google Analytics Data
  API stond niet aan in het Google Cloud-project (`brightnews-meetlus`) —
  vandaar de 403, terwijl de Search Console-kant wél meteen cijfers gaf.
  Status staat nu op Enabled.

  **Bewijs volgt pas bij W40.** `backend/generate-rapport.js` is idempotent per
  ISO-week: bestaat het rapport van die week al, dan slaat de run hem over.
  W39 wordt dus niet alsnog bijgewerkt. De eerste run van maandag 28 september
  schrijft W40, en daar horen de GA4-regels in te staan. **Blijven ze leeg, dan
  is dit punt niet af** — kijk dan of het projectnummer uit de oude tekst
  (`498462657230`) wel bij `brightnews-meetlus` hoort en niet bij een tweede
  project.

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

  **Stand 2026-09-27: twee van de drie staan er. Meta is daarmee vrij; Erik
  kan aan stap 4 beginnen zonder op LinkedIn te wachten.**

  - [x] Facebook-**Pagina** aanmaken voor BrightNews, en het Instagram-account
        eraan koppelen. ✅ 2026-09-27. Onderweg bleek "professionele modus" op
        een persoonlijk profiel géén Pagina te zijn — het geeft makersfuncties,
        maar Meta's publicatie-API kan er niet naartoe posten en Instagram
        Business laat zich er niet aan koppelen. Er is daarna een echte Pagina
        gemaakt.
  - [x] Instagram omzetten naar een **Business**-account. ✅ 2026-09-27,
        gekoppeld aan de Pagina.
  - [x] **LinkedIn-bedrijfspagina aangemaakt** ✅ 2026-09-27 —
        `linkedin.com/company/brightnewsonline`, met beschrijving, locatie en
        omslagfoto. Lukte niet vanaf het BrightNews-account (LinkedIn weigert
        dat bij te weinig connecties), wél vanaf Maartens eigen profiel — en
        dat mag: LinkedIn koppelt een pagina aan zijn beheerders, niet aan wie
        hem aanmaakte. Erik hoefde er dus niet aan te pas te komen.
  - [x] **Community Management API aangevraagd** ✅ 2026-09-27, in de app
        `BrightNews Publiceren` (id `266539195`).

        **Twee dingen zaten onderweg in de weg, voor wie dit ooit overdoet.**
        Ten eerste: dit product moet het **enige** product op een app zijn, om
        juridische redenen. Op de eerste app stond per ongeluk de Events
        Management API, en daardoor bleef de knop grijs — vandaar een tweede
        app. Ten tweede moet de koppeling met de bedrijfspagina **per app**
        geverifieerd zijn (Settings → Verify, link openen als paginabeheerder);
        een verificatie op de ene app telt niet voor de andere.

        **Het formulier is ingediend**, als *Direct Advertiser* (alleen eigen
        kanalen) met Page management en Page analytics. Die keuze is bewust:
        het stond eerst op *Platform*, en dat betekent LinkedIn inbouwen in een
        product waar dérden hun account aan koppelen — een veel zwaardere
        toets, voor iets wat we niet doen.

        - [ ] **⏳ Wachten op de mail van "Microsoft Vetting Services"** op
              `info@brightnews.online`. LinkedIn verifieert daarmee het
              bedrijf; zonder bevestiging loopt de beoordeling niet door. **Kijk
              ook in spam** — die afzendernaam is precies wat een filter
              tegenhoudt. Ze kunnen om extra documentatie vragen.
              **Niets gehoord op 2026-10-18? Dan navragen bij developer
              support.** *(Maarten)*

        Toegekend is het pas als bij Auth → OAuth 2.0 scopes
        `w_organization_social` staat. Tot die tijd staat daar
        `No permissions added`.
  - [x] **Besluit over X: eruit** (Maarten, 2026-09-27). De postfabriek
        genereerde er elke nacht voor terwijl X niet eens als hoofdkanaal in
        `MARKETING-PLAN.md` staat, en een post mét link kost sinds 06-02-2026
        $0,20 — ~$73 per jaar voor een kanaal zonder plan. `KANALEN` in
        `backend/generate-posts.js` staat nu op drie en `marketing-prompt.md`
        is v2. Vanaf de eerstvolgende nieuwe dag krijgt de cockpit dus drie
        kaarten per dag in plaats van vier; bestaande dagen houden hun
        X-kaart tot ze na 30 dagen vervallen. Terugdraaien is `'x'` op twee
        plekken terugzetten.
  - [x] **Footerlinks omgezet** ✅ 2026-09-27, alle drie, in 2.248 bestanden.
        Bij Facebook én LinkedIn stonden er twee verschillende adressen in de
        repo, en in beide gevallen was dat in het archief kapot: 935 pagina's
        wezen naar het profiel van een onbekende die "Bright New" heet, en 385
        naar een LinkedIn-bedrijfspagina die 404 gaf.
  - [ ] **Het Pagina-token aanleveren** zodra Erik de Meta-app heeft staan —
        via GitHub Secrets, net als `ANTHROPIC_API_KEY`. **Bewust géén
        Paginatoegang voor Erik**: dan blijft Meta op Maartens naam staan en
        herhalen we punt 26 niet, waar de Anthropic-sleutel op Eriks account
        bleek te staan. *(Maarten)*

  ### Stap 4 — Erik. **Meta is vrij sinds 2026-09-27**, LinkedIn nog niet

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

- [ ] **46. De nachtelijke beoordeling draait niet meer sinds 18 september.**
  *(Vastgesteld 2026-09-27. Eigenaar onbekend — dat is juist het punt.)*

  `CLAUDE.md` beschrijft een agent die elke nacht om 04:00 Amsterdamse tijd de
  verse artikelen nakijkt op bright-waardigheid, met zijn opdracht in
  `backend/nachtelijke-beoordeling-prompt.md` en zijn bevindingen onderaan
  `backend/selectie-prompt-analyse.md`. Dat is negen nachten netjes gebeurd:
  10, 11, 12, 13, 14, 15, 16, 17 en 18 september, elke keer rond 04:00.
  **Daarna niets meer.**

  Nagekeken waar hij vandaan kwam, en het antwoord is: nergens uit de repo.
  Er is **geen GitHub Action** (`.github/workflows/` bevat alleen
  `update-news.yml` en `bewaak-cache-bump.yml`) en **geen geplande taak op
  Maartens machine** (geen crontab-regel, geen LaunchAgent). Iemand heeft hem
  dus met de hand of via een eigen planning gedraaid, en die is gestopt.

  **Waarom dit ertoe doet.** Het is de enige controle die achteraf kijkt of de
  selectie klopt — de tien missers uit punt 3 zijn er zo uitgekomen. Zolang
  hij stilstaat draait de pipeline zonder terugkoppeling, en dat is precies de
  periode waarin we naar de lancering toewerken. Negen dagen aan bevindingen
  liet zien dat hij zijn werk deed.

  **Eigenaar bekend sinds 2026-09-27: hij is van Maarten.** Daarmee is ook
  verklaard waarom hij stilviel — hij hing aan een handmatige of lokale
  planning, en die is gestopt. Wat er nu moet gebeuren:

  1. **Beslissen of hij hervat wordt.** Negen nachten bevindingen laten zien
     dat hij zijn werk deed; de tien missers van punt 3 komen eruit.
  2. **Zo ja: als GitHub Action in de repo**, niet op een laptop. Dan valt hij
     niet geruisloos stil, ziet Erik het ook, en draait hij door als Maartens
     machine uitstaat. De opdracht staat al in
     `backend/nachtelijke-beoordeling-prompt.md`; er is een cron-regel en een
     schrijfstap nodig. Let op: hij roept Claude aan, dus dit kost tokens per
     nacht — dat is dezelfde sleutel als de nieuwsrun.
  3. **Zo nee: haal hem uit `CLAUDE.md`**, want daar staat nu dat hij elke
     nacht om 04:00 draait. Documentatie die iets beschrijft wat niet bestaat
     is erger dan geen documentatie.

  *(Maarten beslist; als het een Action wordt is het bouwwerk voor Erik of mij.)*

- [x] **47. RSS-feeds gebouwd.** ✅ **2026-09-27** — vijf feeds,
  `/feed-nl.xml` t/m `/feed-es.xml`, via `backend/generate-rss.js` in de
  Action. Elke feed de laatste 30 artikelen met titel, samenvatting, link,
  datum en de afbeelding als enclosure; kanaaltitel en -omschrijving zijn
  dezelfde als op de homepage.

  **Autodiscovery staat erbij**, anders vindt een lezer-app de feed niet: alle
  vijf de feeds staan als `<link rel="alternate">` in de elf indexeerbare
  losse pagina's, in het artikelsjabloon en op de categoriepagina's. Op een
  pagina die zelf een taal heeft, staat die taal bovenaan — een lezer-app
  pakt standaard de eerste.

  Nagemeten: alle vijf geldige XML, 30 items elk. De XML-escaping dekt ook `'`
  en `"` en haalt stuurtekens weg; één zo'n teken uit een bron maakt een hele
  feed ongeldig en dan laat een lezer-app niet dat ene item maar de héle feed
  vallen. *(Die `eslint-disable` bij de regex staat er bewust, met reden.)*

  *Oorspronkelijke tekst hieronder.*

  Nagekeken op 2026-09-27: geen feedbestand, geen `application/rss+xml` in
  enige `<head>`, nergens een verwijzing. Voor een nieuwssite is dat
  ongebruikelijk — RSS is hoe aggregators, lezers-apps en andere sites nieuwe
  artikelen automatisch oppikken. Het is bereik dat vanzelf doorloopt zodra
  het er staat, zonder verdere moeite en zonder kosten.

  **Wat het wordt:** een `backend/generate-rss.js` naast de bestaande
  `generate-sitemap.js`, die vijf feeds schrijft — één per taal —
  bijvoorbeeld `/feed-nl.xml` t/m `/feed-es.xml`. Elke feed de laatste 20 tot
  50 artikelen van die taal, met titel, samenvatting, link, datum en de
  afbeelding. Meedraaien in de nieuws-Action, direct na de sitemap.

  **Niet vergeten:** een `<link rel="alternate" type="application/rss+xml">`
  in de `<head>` van elke pagina én in het artikelsjabloon, anders vinden
  lezers-apps de feed niet automatisch. Dat raakt het sjabloon, dus 740
  pagina's opnieuw genereren. En `CACHE_NAME` bumpen.

  **Volgorde:** dit mag vóór de lancering gebouwd worden, maar het levert pas
  iets op als de site open is — een aggregator die nu langskomt vindt het
  parkeerbericht. *(Ik bouw het; het raakt `backend/`, dus via een PR met Erik
  als reviewer.)*

- [ ] **48. Het referral-systeem alsnog afmaken.** *(Besluit Maarten
  2026-09-27: doen. Vervolg op punt 11.)*

  Punt 11 stelde in september vast wat er níét is: de database-functie
  `add_premium_reward` bestaat niet en `processReferralReward` in `js/main.js`
  logt alleen. Er is dus geen kapotte aanroep, maar ook geen werkend systeem.
  Dit punt is het bouwen zelf.

  **Wat het is:** de enige echte groeilus in het plan — een bestaande lezer
  brengt een nieuwe aan en krijgt daar iets voor terug. Anders dan elk ander
  idee op deze lijst schaalt dit met het aantal lezers in plaats van met de
  moeite die wij erin steken.

  **Wat het vraagt:** een RPC met `security definer` die de beloning toekent,
  een audit-trail zodat niet dezelfde verwijzing twee keer telt, en een
  besluit over wát de beloning is (gratis maanden? een langere proefperiode?).
  Dat laatste is een keuze van Maarten en Erik samen, geen code.

  **Mijn kanttekening, en die staat hier zodat niemand hem later hoeft te
  herontdekken: een verwijslus met één abonnee levert nul op.** De waarde
  ontstaat ergens rond de 50 lezers. Bouwen mag, maar zet het achter punt 2
  (de lancering), punt 3 (de selectieprompt) en de nieuwsbrief — anders staat
  het maanden te wachten op mensen die er nog niet zijn. *(Erik: het raakt
  Supabase en de betaallogica.)*

- [ ] **49. Een nieuwsbrief.** *(Besluit Maarten 2026-09-27: bouwen.)*

  Nagekeken: er is geen enkele nieuwsbriefcode in de repo, alleen een
  vertaalsleutel in het privacybeleid. Voor een nieuwssite is dit hét kanaal
  dat ontbreekt.

  **Waarom het het sterkste idee van de lijst is.** Iemand die je via Google
  vindt, komt niet terug. Een nieuwsbriefabonnee komt elke dag terug, en
  terugkerende lezers zijn de mensen die betalen. De nieuwsbrief is daarmee
  geen apart product maar de opstap naar het abonnement: wie dertig dagen
  achter elkaar de mail opent, is een kandidaat.

  **Wat er al ligt:** Supabase-accounts, en `data/marketing-feed.json` wordt
  elke nacht gevuld met precies de inhoud die in zo'n mail hoort — per taal,
  met dagoverzichten en de best scorende artikelen.

  **Wat erbij moet:**
  - een tabel `nieuwsbrief_inschrijvingen` in Supabase, met een
    bevestigingsstap (double opt-in) en een uitschrijflink met token; zonder
    die twee is het in strijd met de AVG
  - een verzenddienst — Resend of Postmark, gratis tot een paar duizend mails
    per maand. Server-side in de Action, dus de CSP hoeft niet open
  - een sjabloon per taal, gevoed uit de feed
  - inschrijfvelden: onder elk artikel, in de footer, op de homepage, en een
    vinkje bij registratie. **Geen pop-up** — huisregel
  - een regel in `Privacy.html`, in vijf talen

  **Verwachting eerlijk houden:** bij 97 vertoningen per 28 dagen levert dit
  nu één of twee inschrijvingen op. Het wordt pas iets ná de lancering
  (punt 2). Bouwen mag eerder, rekenen erop niet.
  *(Erik: het raakt Supabase en een externe dienst. Ik doe de front-end.)*

- [x] **50. IndexNow aangezet.** ✅ **2026-09-27** — `backend/indexnow.js`
  draait mee in de Action, ná de sitemap. Hij leest `news-sitemap.xml` uit
  (dat is precies "alles van de afgelopen 48 uur") en meldt die URL's plus de
  homepage. **Eerste melding is geaccepteerd: 36 URL's, status 202.**

  De sleutel `b022d2ba1243089fbcdd85248b11145c` staat als tekstbestand in de
  root. **Dat is geen vergissing en geen secret:** IndexNow eist dat de
  sleutel publiek te downloaden is, anders weigert de dienst de melding met
  een 403. Het script controleert zelf of dat bestand er staat en klopt.

  De stap heeft `continue-on-error: true`. Dit is een extraatje, geen
  publicatiestap — valt de dienst uit, dan mag de nieuwsrun daar niet op
  stuklopen.

  **Verwachting eerlijk houden**, zoals hieronder al stond: dit maakt je
  sneller ópgehaald, niet beter gevonden. En Google doet niet mee.

  *Oorspronkelijke tekst hieronder.*

  Van de 2.927 URL's in de sitemap staan er 2.341 op "gevonden – momenteel
  niet geïndexeerd" (punt 23). Een zoekmachine komt langs wanneer het hem
  uitkomt, en bij een domein zonder geschiedenis is dat zelden. Met IndexNow
  stuur je bij elke run zelf een seintje met de nieuwe URL's.

  **Wat het wél en níét doet.** Het maakt je sneller ópgehaald, niet beter
  gevonden. Of je hoog eindigt hangt af van je inhoud en van links van
  buitenaf; daar verandert dit niets aan.

  **En Google doet niet mee** — die heeft zijn eigen sitemap-ping in 2023
  afgeschaft en ondersteunt IndexNow niet. Dit werkt voor Bing, Yandex en een
  paar kleinere. Bing is klein in Nederland, maar het verkeer dat er nu is
  komt vooral uit de Verenigde Staten, waar Bing groter is.

  **Wat het kost:** een sleutelbestand in de root (`<sleutel>.txt`) en één
  HTTP-aanroep per run met de nieuwe URL's, na `generate-sitemap.js`. Twintig
  regels, geen kosten, geen account. *(Ik bouw het; het raakt `backend/`, dus
  via een PR met Erik als reviewer.)*

- [x] **51. `max-image-preview:large` toegevoegd — nodig voor Google Discover.**
  ✅ **2026-09-27.** De regel staat nu in het artikelsjabloon en op de elf
  indexeerbare losse pagina's. **Niet** op `404.html`, `binnenkort.html` en
  `marketing.html`: die staan op `noindex`, daar heeft het geen betekenis.
  Het archief is zoals afgesproken niet opnieuw gegenereerd — nieuwe artikelen
  hebben de regel vanaf de eerstvolgende run. `CACHE_NAME` naar v37, want
  `index.html` zit in de precache.

  *Oorspronkelijke tekst hieronder.*

  Nagekeken op 2026-09-27: die robots-instructie staat **nergens** — niet in
  `backend/generate-articles.js`, niet op één van de losse pagina's. Zonder
  hem mag Google alleen een postzegelformaat tonen, en een Discover-kaart is
  juist een beeldkaart die de hele telefoonbreedte vult. Een kaart met een
  minifoto komt daar praktisch niet voorbij.

  ```html
  <meta name="robots" content="max-image-preview:large">
  ```

  **Besluit over de aanpak (Maarten):** de regel gaat in het artikelsjabloon
  en in de twaalf losse pagina's, en de 2.900 bestaande artikelen worden
  **niet** opnieuw gegenereerd. Nieuwe artikelen hebben hem vanaf dag één, en
  binnen twee dagen is de voorraad verse artikelen vervangen.

  **Dat klopt voor Discover**, want die toont vrijwel uitsluitend recent
  nieuws — het archief zou er toch niet in komen. De prijs is wel dat het
  archief die regel nooit krijgt; wil je dat later alsnog, dan is het één
  zoek-en-vervang zoals bij de footerlinks.

  Het sjabloon wijzigen betekent `node backend/generate-articles.js` draaien,
  en de twaalf pagina's raken `index.html`, dus **`CACHE_NAME` bumpen.**

  Zonder dit heeft aanmelden bij Publisher Center weinig zin, dus dit hoort
  vóór die aanmelding. *(Ik bouw het; het raakt `backend/`, dus via een PR.)*

- [ ] **52. Links van buitenaf: het enige dat geen script oplost.**
  *(Besluit Maarten 2026-09-27: aanpakken.)*

  Uit punt 23: 444 pagina's geïndexeerd, **2.341 op "gevonden – momenteel niet
  geïndexeerd"**. De techniek is nagelopen en ligt goed: robots open, sitemap
  compleet, canonical en hreflang overal, structuurdata correct. De oorzaak
  is dat **niemand van buitenaf naar brightnews.online linkt.** Een domein
  zonder één verwijzing krijgt van Google het voordeel van de twijfel niet, en
  dan blijft een sitemap een suggestie die licht weegt.

  Alle andere punten op deze lijst maken je vindbaarder voor wie al weet dat
  je bestaat. Dit is het enige dat dat plafond doorbreekt, en er is **geen
  automatisering voor** — het is handwerk.

  **Wat er concreet kan, na de lancering:**
  - **De bronnen zelf.** GoodGoodGood.co en GoodNewsNetwork.org leveren 72%
    van wat we publiceren en zijn inhoudelijk verwant. Een nette mail dat we
    hun werk in vijf talen ontsluiten is geen spam maar een reëel aanbod.
  - **Nederlandse nieuwsbrieven en blogs** over duurzaamheid, wetenschap en
    welzijn — de niche waar positief nieuws thuishoort.
  - **PXL.** Een studentenondernemersproject dat draait is iets waar een
    hogeschool graag over schrijft, en een `.be`-onderwijsdomein weegt zwaar.
  - **Vermelding in overzichten** van positief-nieuwsinitiatieven; die
    lijstjes bestaan en nemen nieuwe bronnen op.

  **Reserveer hier bewust tijd voor na punt 2**, anders gebeurt het nooit —
  het is het soort werk dat altijd wijkt voor code. Eén verwijzing van een
  site met gezag doet meer dan alle punten 47 tot en met 50 samen.
  *(Maarten — dit is contact leggen, geen bouwen.)*

- [ ] **53. De publicatielus slimmer maken — vier verbeteringen.**
  *(Besluit Maarten 2026-09-27. **Wacht op stap 4 van punt 45**: zolang er
  niets geplaatst wordt valt er niets te verbeteren.)*

  De postfabriek schrijft teksten; deze vier gaan over wat er daarná mee
  gebeurt. Geordend op wat ze opleveren.

  **1. Beeldkaarten voor Instagram.** Instagram staat geen links toe in
  bijschriften — de prompt weet dat en schrijft "link in bio". Het gevolg is
  dat de post volledig van het beeld afhangt, en dat is nu de persfoto bij het
  artikel: vaak generieke stock die niets zegt. Wat bij nieuwsaccounts werkt is
  een **kaart met de kop erop**: grote tekst, het merkgroen, het logo klein in
  de hoek. Te maken met een HTML-sjabloon dat naar PNG wordt gerenderd; het
  merklettertype en de tokens liggen er al, dus het ziet er meteen uit als
  BrightNews. **Dit is van de vier de grootste winst.**

  **2. De link in de eerste reactie op LinkedIn.** LinkedIn drukt berichten
  met een externe link naar beneden — het platform wil bezoekers niet zien
  vertrekken. Post daarom de tekst zonder link en plaats de link direct erna
  als eerste reactie. Twee API-aanroepen in plaats van één; verder verandert
  er niets.

  **3. Spreiden in plaats van alles tegelijk.** De Action draait om 0:00 en
  12:00 UTC. Dat zijn niet de momenten waarop mensen kijken, en drie posts
  tegelijk vanuit één account ziet er bovendien geautomatiseerd uit. Geef elk
  kanaal een tijdvenster en plaats de wachtrij daarop. Wélk venster hoef je
  niet te gokken: dat staat na een paar weken in Page analytics, die we voor
  het weekrapport toch al ophalen.

  **4. De meetlus doortrekken naar de prompt.** Dit is het slimste en het is
  half af. De cockpit schrijft je oordelen weg en afwijzingen voeden de
  volgende generatie via `{FEEDBACK}`. Wat er niet in zit is **welke posts het
  in het echt goed deden.** Voeg bereik en kliks per post terug in de prompt
  en de fabriek leert van het publiek in plaats van alleen van Maartens
  oordeel. Dat is het verschil tussen een generator en iets dat beter wordt.

  *(Erik bouwt 2, 3 en 4 mee met de publicatielus; onderdeel 1 is beeldwerk en
  kan ik doen.)*

- [ ] **54. Aanmelden bij Google Publisher Center.** *(De nieuwssitemap is
  af; de aanmelding is voor Maarten, ná de lancering.)*

  ✅ **De nieuwssitemap staat er sinds 2026-09-27**: `/news-sitemap.xml`,
  gegenereerd in `backend/generate-sitemap.js` en opgenomen in `robots.txt`
  naast de gewone sitemap. Alleen artikelen van de **afgelopen 48 uur**, in
  het `news:`-formaat met publicatiedatum, taal en titel — precies zoals
  Google News het wil, inclusief de grens van maximaal 1.000 URL's. Bij de
  eerste draai: 35 verse URL's, geldige XML. Artikelen zonder titel worden
  overgeslagen; één ongeldig item laat Google de hele sitemap afwijzen.

  ⏳ **Wat nog moet: de aanmelding zelf.** Die is voor Maarten en hoort **ná
  de lancering** — Google beoordeelt wat het ziet, en dat is nu nog het
  parkeerbericht. Punt 51 (grote beeldvoorbeelden) is inmiddels ook af, dus
  technisch is alles klaar.

  *Oorspronkelijke tekst hieronder.*

  `STAPPENPLAN-MAARTEN.md` zette Publisher Center weg als "niet nodig — Search
  Console dekt dit". Voor een gewone site klopt dat; voor een nieuwssite niet.
  Google News en Discover zijn waar nieuwsverkeer vandaan komt, en die lopen
  via Publisher Center. Aanmelden is geen bouwwerk, maar er hoort één stuk
  techniek bij dat ontbreekt.

  **De nieuwssitemap.** De huidige sitemap is één lijst van 3.193 URL's.
  Google News wil daarnaast een **aparte sitemap met alleen de artikelen van
  de afgelopen 48 uur**, in het `news:`-formaat met publicatiedatum en taal.
  Dat is het verschil tussen "komt ooit langs" en "binnen een uur opgehaald",
  en bij nieuws is een dag te laat hetzelfde als niet gepubliceerd.
  `generate-sitemap.js` weet al welke artikelen vers zijn; er hoeft alleen een
  tweede bestand uit te rollen, plus een regel in `robots.txt`.

  **Volgorde:** eerst punt 51 (grote beeldvoorbeelden), dan deze sitemap, dan
  pas aanmelden — Google beoordeelt wat het ziet, en wat het nu ziet is het
  parkeerbericht. Dus ook: na punt 2. *(Ik bouw de sitemap via een PR;
  Maarten doet de aanmelding.)*

- [x] **55. Categoriepagina's gebouwd.** ✅ **2026-09-27** — 30 pagina's,
  `backend/generate-categorieen.js`, draait mee in de Action.

  **Wat er staat:** `/categories/{taal}/{categorie}.html`, met een vertaalde
  slug (`/categories/nl/milieu.html`, niet `environment`). Per pagina de
  laatste 60 artikelen van die categorie **in de HTML**, niet via JavaScript —
  dat was het hele punt. Canonical, hreflang naar de vier andere talen plus
  x-default, en onderaan links naar de vijf andere categorieën.

  **De route naar binnen.** Alleen in de sitemap zetten zou niets oplossen:
  daar staan al 2.341 URL's die Google wel kent en niet ophaalt. Daarom linkt
  nu **elke artikelpagina** naar de categoriepagina van zijn eigen categorie,
  onderaan bij "meer nieuws". Nagemeten in een proefdraai buiten de repo: 745
  van de 750 artikelen kregen die link, en de vijf zonder zijn één artikel in
  de categorie *General* — dat heeft geen pagina, en dat klopt.

  **Nagemeten:** 720 artikellinks vanaf de categoriepagina's gecontroleerd,
  nul kapot. Alle 30 doelen bestaan. Sitemap van 3.193 naar 3.223 URL's,
  geldige XML. Op 375px geen horizontale overloop.

  **Twee dingen om te weten.** De navigatiebalk en de footer worden bij het
  genereren **uit `index.html` gelicht** in plaats van overgeschreven, zodat
  ze niet achterlopen zodra iemand de footer wijzigt; de relatieve paden
  worden daarbij absoluut gemaakt. En een bronfoto die niet meer laadt geeft
  hier een leeg vak — de homepage valt via JavaScript terug op een
  reservefoto, deze statische pagina's doen dat niet. Bij 8 van de 581
  artikelen (punt 25) is dat nu te verwaarlozen; groeit dat getal, dan hoort
  de terugval in de generator.

  *Oorspronkelijke tekst hieronder.*

  Nagekeken op 2026-09-27: de site heeft vijf categorieën, maar het filteren
  gebeurt met JavaScript op de homepage. **Er bestaat dus geen enkele URL voor
  "milieunieuws" of "wetenschapsnieuws"** die Google kan indexeren.

  Dat zijn **25 ontbrekende pagina's** — vijf categorieën maal vijf talen.
  Elk zou een eigen ingang zijn met een eigen zoekwoord, en een plek waar
  artikelen naartoe kunnen linken in plaats van alleen naar elkaar. Bij 2.341
  URL's die op "gevonden – niet opgehaald" staan is dat precies wat ontbreekt:
  routes naar binnen.

  Te genereren uit dezelfde data als de artikelpagina's, dus het draait daarna
  vanzelf mee. Denk aan: canonical, hreflang naar de vier andere talen,
  opname in de sitemap, en een link vanuit de navigatie of de footer — een
  pagina waar niets naartoe wijst helpt niet.
  *(Ik bouw het; het raakt `backend/`, dus via een PR.)*

- [ ] **56. Laat Search Console de selectie sturen.** *(Besluit Maarten
  2026-09-27: doen. Wacht op echte cijfers.)*

  De meetlus haalt sinds 2026-09-26 zoektermen uit Search Console, en die
  belanden nu alleen in het weekrapport. Daar staat letterlijk in **waar
  mensen op zoeken en waar we net niet op gevonden worden** — in W39
  bijvoorbeeld "eu horizon 2030" op positie 64 met 7 vertoningen.

  Voer die termen terug in `backend/selectie-prompt.md` en de selectie weet
  welke onderwerpen publiek hebben. **Niet om achter trends aan te rennen** —
  dat zou tegen het hele idee van de site ingaan — maar om bij twee
  gelijkwaardige artikelen het onderwerp te kiezen waar iemand naar zoekt.

  Dezelfde lus als punt 53.4, maar voor de site in plaats van de socials. De
  data ligt er al; wat ontbreekt is de terugkoppeling.

  **Wachten heeft zin:** met 25 vertoningen per week is er nog niets te
  sturen. Dit wordt pas zinvol als er na de lancering echt verkeer is.
  *(Erik — het raakt de selectieprompt, net als punt 3.)*

- [x] **57. "Laad meer artikelen" bleef staan op de artikeldetailpagina.**
  ✅ **2026-09-27** — één regel in `toonDetail()`, op dezelfde plek waar de
  lijst en de filterbalk verdwijnen. Terugverbergen hoefde niet:
  `renderLijst()` gooit de wikkel weg en `werkLaadMeerKnopBij()` bouwt hem
  opnieuw op zodra je terug bent. Nagemeten op drie routes: homepage knop
  zichtbaar (54px), artikel geopend knop weg, terug naar de lijst knop terug
  en werkend (24 → 48 kaarten). Bij een directe link naar een artikel wordt
  hij niet eens aangemaakt.

  **Géén `CACHE_NAME`-bump**, en dat is een correctie op de gewoonte. Ik had
  er eerst een gezet; Eriks cachebump-bewaker wees uit dat `index.js`
  **helemaal niet in de precachelijst staat** — daar staat `js/main.js`. De
  service worker cachet niet-HTML-bestanden ook nergens zelf, hij leest er
  alleen uit, dus `index.js` komt altijd vers van het netwerk. Handig om te
  onthouden: een wijziging aan `index.js` vraagt géén bump.

  *Oorspronkelijke melding hieronder.*

  Open je een artikel vanaf de homepage, dan staat de knop "Laad meer
  artikelen" onder het artikel — terwijl er niets te laden valt. Op de
  homepage hoort hij te blijven.

  **Oorzaak gevonden in `index.js`:** bij het openen van het detailvenster
  worden `#news-container` en `.filter-wrapper` op `display: none` gezet, maar
  `#laad-meer-wikkel` niet. Die knop staat bewust bùiten de container (het
  raster zou hem als kaartvak behandelen) en wordt daardoor vergeten.

  **Fix:** verbergen op dezelfde plek waar de container verborgen wordt, en
  weer tonen bij terugkeer naar de lijst — let op, dat gebeurt op twee
  plekken in het bestand. `CACHE_NAME` bumpen, want `index.js` staat in de
  precache. *(Ik doe het.)*

- [ ] **58. Stripe wijzigt vanaf 29-09-2026 de standaard voor nieuwe
  Payment Links.** *(Mail van Stripe, 21-09-2026.)*

  Managed Payments staat vanaf die datum **niet meer automatisch aan** bij een
  nieuwe Payment Link die je in het dashboard maakt; je moet het dan zelf
  aanvinken.

  **Voor nu is er niets aan de hand.** Onze twee links zijn op 2026-09-04
  gemaakt en Stripe schrijft expliciet dat bestaande links met Managed
  Payments ongemoeid blijven. Nagekeken in `js/betaal-config.js`: het gaat om
  `maandelijks` en `jaarlijks`, allebei met 30 dagen proefperiode.

  **Waar het wél gaat bijten:** zodra iemand een níéuwe Payment Link maakt —
  een ander tarief, een actie, een jaarplan erbij — en vergeet Managed
  Payments aan te zetten. Dan loopt die ene link buiten de opzet om, en dat
  merk je pas bij de eerste betaling. Dit punt staat hier zodat dat niet
  gebeurt; het is een waarschuwing, geen taak. *(Maarten, bij de eerstvolgende
  nieuwe link.)*

- [ ] **59. De paywall is hard — overweeg een metered model.**
  *(Besluit Maarten 2026-09-27: doen, aantal later bepalen — 5 of 10.)*

  Nagekeken in `index.js`: een premium-artikel is volledig dicht tenzij je
  betaalt. Geen gratis artikelen, geen teller.

  **Vrijwel geen nieuwssite doet dat, en met reden: niemand betaalt voor iets
  wat hij nooit gelezen heeft.** Het standaardmodel is metered — een aantal
  artikelen per maand gratis, daarna de vraag. Dan heeft iemand het product al
  gebruikt op het moment dat je om geld vraagt, en weet hij wat hij misloopt.

  Bij een onbekend merk met één abonnee is dit waarschijnlijk **de enige
  ingreep op deze lijst die de conversie echt verandert.**

  **Openstaand besluit (Maarten): 5 of 10 artikelen per maand.** Te bepalen
  als er verkeer is; met de huidige cijfers is het gokken. Vuistregel: te laag
  en niemand raakt gehecht, te hoog en niemand hoeft ooit te betalen.

  **Let op bij het bouwen:** een teller in `localStorage` is met één
  privévenster omzeild. Dat is bewust acceptabel bij dit model — het doel is
  een drempel, geen slot. Wie hem echt wil omzeilen kan dat, en die had toch
  niet betaald. *(Erik: het raakt de premium-logica.)*

- [ ] **60. Een welkomstreeks na registratie.** *(Besluit Maarten 2026-09-27:
  doen.)*

  Na aanmelding volgt alleen de bevestigingsmail. Daarna niets. In
  abonnementsbedrijven is juist die eerste week waarin de meeste conversie
  valt.

  Drie mails, automatisch: bij aanmelding wat BrightNews doet en hoe de
  selectie werkt, na drie dagen het best gelezen artikel van die week, na een
  week wat premium extra biedt — met de proefperiode van 30 dagen als haak.

  Draait op dezelfde verzenddienst als punt 49; bouw die twee samen, dan is
  dit weinig extra werk. *(Erik: Supabase-trigger of Action; ik schrijf de
  teksten in vijf talen.)*

- [ ] **61. Levenscyclusmails via Stripe-webhooks.** *(Besluit Maarten
  2026-09-27: doen.)*

  Stripe en de webhooks staan er al. Daarmee kun je reageren op momenten die
  nu stil voorbijgaan:

  - **een mislukte betaling** — dit is de belangrijkste. Een verlopen of
    geweigerde kaart is een abonnee die je verliest zonder dat hij dat wilde,
    en één mail lost dat meestal op;
  - **de proefperiode loopt af** — 30 dagen is lang genoeg om te vergeten dat
    je je hebt aangemeld;
  - **iemand zegt op** — vragen waarom, en dat antwoord bewaren.

  *(Erik: het raakt Stripe en Supabase.)*

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

- [ ] **62. Bedrijven benaderen voor gratis toegang voor hun mensen.**
  *(Idee van Maarten, 2026-09-27. Goed idee — met drie aanpassingen.)*

  Het idee: bedrijven met een positieve inslag aanschrijven en hun medewerkers
  een tijd gratis BrightNews geven, in de hoop dat ze blijven.

  **Waarom het kan werken.** Het brengt in één klap echte lezers binnen in
  plaats van één voor één, en positief nieuws sluit aan bij waar bedrijven al
  geld aan uitgeven: het welzijn van hun mensen. En het mechanisme ligt er al
  — `redeem_promo_code` bestaat in Supabase (bevestigd bij punt 11).

  **Drie dingen zou ik anders doen dan het idee zoals het er nu ligt:**

  1. **Geen jaar, maar drie maanden.** Bij een jaar weet niemand aan het eind
     nog dat hij zich ooit heeft aangemeld, en je leert een jaar lang niets.
     Drie maanden is lang genoeg om een gewoonte te vormen en kort genoeg om
     te meten.
  2. **Niet iedereen automatisch, maar een code die je zelf activeert.** Wat
     je cadeau krijgt zonder erom te vragen, waardeer je niet — en dan is de
     conversie aan het eind bijna nul. Met een opt-in link activeren alleen de
     mensen die het wíllen, en dat zijn precies de mensen die daarna kunnen
     blijven. Bijkomend voordeel: je leert hoevéél procent het wilde, en dat
     getal is op zichzelf waardevol.
  3. **Vraag iets terug dat het bedrijf niets kost:** een vermelding in hun
     interne nieuwsbrief, en een link op hun site. Dat tweede is het echte
     rendement — zie punt 52, waar links van buitenaf het plafond onder alles
     vormen.

  **Wie:** B Corps, duurzaamheidsbedrijven, HR- en welzijnsplatforms, en
  organisaties die jullie zelf kennen. Begin klein, met vijf tot tien, en kijk
  wat de reacties zeggen voordat je honderd mails stuurt.

  **Eén waarschuwing.** Dit werkt pas als de site open is (punt 2) en als je
  weet dat mensen terugkomen. Weggeven wat nog niet bewezen is, kost je je
  beste kans op een eerste indruk bij precies het publiek dat je wilt. Zet dit
  dus ná de lancering en ná de nieuwsbrief. *(Maarten — dit is contact leggen;
  Erik hoeft alleen de codes te regelen.)*

- [ ] **63. Gratis aandacht offline: PXL, startersprijzen en regionale pers.**
  *(Besluit Maarten 2026-09-27: alle drie proberen.)*

  **Flyers, stickers en posters staan hier bewust niet tussen.** Je vraagt
  iemand een adres over te typen voor iets waar hij nog niets van wil; dat
  levert vrijwel niets op. Wat hieronder staat kost ook niets en heeft een
  tweede opbrengst: **elk stuk aandacht komt met een link**, en dat is exact
  wat punt 52 mist.

  1. **PXL.** Een draaiende, geautomatiseerde nieuwssite in vijf talen,
     gebouwd door twee studenten, is precies waar een hogeschool over
     publiceert. Het levert een artikel op een `.be`-onderwijsdomein op — een
     van de zwaarstwegende links die bestaan. Benader de communicatiedienst en
     je docenten. **Hier zou ik beginnen.**
  2. **Startersprijzen.** Bryo, StartUp Limburg, studentondernemer-
     verkiezingen. Meedoen is gratis, en ook zonder winnen levert het
     persaandacht, een netwerk, een scherpere pitch en meestal een vermelding
     op hun site op.
  3. **Regionale pers.** Het Belang van Limburg, een lokaal weekblad, een
     streekradio. Het verhaal schrijft zichzelf: twee Limburgers bouwen een
     nieuwssite die alleen goed nieuws brengt. Hoogste opbrengst per bestede
     minuut van de hele lijst.

  Podcasts als gast is het vierde idee uit dat gesprek; Maarten wil dat
  bewaren voor later. *(Maarten — alle drie zijn gesprekken, geen bouwwerk.)*

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
