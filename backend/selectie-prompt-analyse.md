# Analyse van de selectieprompt — voor Erik

Opgesteld 2026-09-10 (Maarten + Claude Opus 5), naar aanleiding van de
schoonmaaklijst van gepubliceerde missers.

## Erik: lees dit eerst, test het zelf, en geef je eigen bevindingen

**Er is bewust niets gewijzigd.** Niet aan `selectie-prompt.md`, niet aan de
code, niet aan de bronnenlijst. Dit document is een diagnose, geen patch.

Jij leest de artikelen dagelijks uit met Fable en beoordeelt of ze werkelijk
"bright" zijn. Jij ziet dus de uitkomst van deze prompt elke dag van dichtbij,
en dat is precies de kennis die hier ontbreekt. Wat hieronder staat komt uit
de logs — het zegt wat het model dóét, niet of jij het ermee eens bent.

Concreet verzoek:

1. **Lees de vier bevindingen hieronder** en leg ze naast wat je dagelijks
   ziet. Herken je het patroon, of wijkt jouw beeld af?
2. **Reproduceer de cijfers zelf** met de commando's die erbij staan. Ze
   draaien alleen tegen `data/selectie-log.json` en veranderen niets.
3. **Test een wijziging voordat hij vast staat**: prompt aanpassen → Action
   draaien → `data/selectie-log.json` teruglezen. Zoals in `CLAUDE.md`
   beschreven geeft een gewijzigde prompt-hash afgewezen items automatisch een
   herkansing, dus je ziet direct het verschil op vergelijkbare items.
4. **Geef je eigen oordeel terug** voordat er iets wordt doorgevoerd. De
   voorgestelde oplossingen hieronder zijn suggesties van iemand die de logs
   heeft gelezen, niet van iemand die de artikelen dagelijks beoordeelt.

Bevinding 1 is de belangrijkste: die verklaart waarschijnlijk een deel van wat
je bij het uitlezen tegenkomt.

## Waar deze analyse op rust

`backend/selectie-prompt.md` plus de laatste 300 beoordelingen in
`data/selectie-log.json`. Overal waar hieronder een getal staat, staat het
commando erbij waarmee je het narekent.

De rekenregel die de code toepast (en die in de commando's is nagebouwd):
gevoel ≥ 2 én formulering ≥ 2 én relevantie ≥ 2 én som ≥ 8.

---

## Bevinding 1 — de afwijslijst wordt overgeslagen

De prompt noemt letterlijk als afwijsreden: *"verzamel- en weekoverzichtitems
van andere media ('good news this week', 'what went right',
podcast-transcripten en andere linklijstjes)"*.

Alle vier zulke items in het log zijn **goedgekeurd**:

| Score | Bron | Titel |
|---|---|---|
| 9 (3/3/3) | Positive.News | What went right this week: the good news that matters |
| 9 (3/3/3) | GoodGoodGood.co | Good News This Week: September 5, 2026 – Bears, Bakeries… |
| 8 (2/3/3) | OptimistDaily.com | Podcast Transcript September 4th, 2026 — AI music banned… |
| 9 (3/3/3) | OptimistDaily.com | Podcast Transcript August 28th, 2026 — Niger restored 5 mil… |

De titels bevatten woordelijk de termen uit de afwijslijst.

**Vermoedelijke oorzaak, en die is mechanisch.** Onderaan de prompt staat:
*"Werk per item in deze volgorde: score eerst elk criterium afzonderlijk, en
leid dáárna het besluit af."* Dat instrueert het model om te beginnen bij de
inhoud. En de inhoud ván zo'n overzicht is oprecht positief — beren,
bakkerijen, Niger dat vijf miljoen hectare herstelt. Dus scoort het 3/3/3, en
tegen de tijd dat het besluit valt is de afwijslijst gepasseerd. De afwijzing
moet nu via de scores lopen, en dat is precies de route die faalt.

**Voorstel:** maak van de afwijslijst een poort vóór het scoren, met een eigen
veld in de JSON, bijvoorbeeld:

```json
{"nr": 1, "uitsluiting": "geen", "gevoel": 3, "formulering": 3, "relevantie": 3, "besluit": "ja", "reden": "..."}
```

met als toegestane waarden `geen`, `productnieuws`, `verzameleditie`,
`politiek`, `misdaad-of-ramp`, `listicle`, `te-weinig-inhoud`. De code wijst
dan af op dat veld, ongeacht de scores. Bijkomend voordeel: je kunt in het log
zien wélke categorie hoe vaak vangt, en dus of een afwijsregel werkt.

Narekenen:

```bash
node -e "const d=require('./data/selectie-log.json');const p=/good news|what went right|this week|roundup|podcast|highlights|and more/i;d.filter(x=>p.test(x.titel)).forEach(x=>console.log((x.gevoel>=2&&x.formulering>=2&&x.relevantie>=2&&x.totaal>=8?'DOOR ':'afgew'),x.totaal,x.titel.slice(0,60)))"
```

## Bevinding 2 — de schaal is in de praktijk één knop

Van de 68 items met totaalscore 9 hebben er **66 exact 3/3/3**. Bijna de helft
van alles wat wordt goedgekeurd krijgt dus dezelfde beoordeling.

Verdeling over de items die niet in de afwijslijst vielen:

| Criterium | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| gevoel | 5% | 23% | 29% | 43% | — |
| formulering | 3% | 13% | 37% | 46% | — |
| relevantie | 2% | 13% | 22% | 53% | 10% |

De 4 op relevantie wordt nauwelijks gebruikt. Er is dus geen middel om binnen
de goedgekeurde artikelen te onderscheiden wat écht sterk is — terwijl je dat
zou willen voor de volgorde op de homepage en voor de keuze welke artikelen in
een dagoverzicht komen.

**Voorstel:** maak de bovenste trede duurder. Het anker voor gevoel-3 is nu
*"hartverwarmend of echt hoopgevend"*, en dat past op vrijwel elk
goednieuwsartikel. Voeg een voorwaarde toe die de 3 schaars maakt — bijvoorbeeld
dat de reden een concreet mens, aantal of gevolg moet benoemen. Overweeg ook
een half zinnetje motivering per criterium in plaats van één reden voor het
geheel; modellen die per criterium moeten motiveren, differentiëren beter.

Narekenen:

```bash
node -e "const d=require('./data/selectie-log.json');const n=d.filter(x=>x.totaal===9);const c={};n.forEach(x=>{const k=x.gevoel+'/'+x.formulering+'/'+x.relevantie;c[k]=(c[k]||0)+1});console.log(c)"
```

## Bevinding 3 — het model leunt zelf de verkeerde kant op

In **21 van de 300 gevallen (7%)** wijkt het besluit van het model af van de
rekenregel in de code. Alle 21 in dezelfde richting: het model zegt "ja" bij
scores 2/2/3 = 7, terwijl de regel "nee" zegt.

Welke items dat zijn, is veelzeggend:

- *Amid scrutiny, Texas agencies are blocked from spending…* — staat op de
  schoonmaaklijst
- *Federal judge halts data center construction…* — staat ook op de
  schoonmaaklijst
- *Why managers struggle with coaching…*
- *How to choose a fertility clinic…*
- *Need an excuse to hike? Jane Goodall's nonprofit calls…*

Precies de politieke stukken en de zelfhulp-listicles. Het model wíl die
publiceren; alleen de rekensom houdt ze tegen.

Dat is tegelijk geruststellend en zorgelijk. Geruststellend: drempel 8 vangt
ze aantoonbaar — niet aan die drempel komen. Zorgelijk: het laat zien dat de
prompt die categorieën niet echt overbrengt. Productnieuws heeft twee
ijkvoorbeelden; politiek heeft één regel zonder uitleg of voorbeeld
(*"politiek gekleurde of polariserende onderwerpen"*), en zelfhulp-listicles
staan alleen tussen haakjes genoemd.

**Voorstel:** geef politiek en listicles hetzelfde gewicht als productnieuws —
een eigen ijkvoorbeeld met uitleg. Het Texas-camerastuk is een goede kandidaat,
met als redenering: dit is alleen goed nieuws als je er politiek zo over denkt,
en dát is de toets. Laat daarnaast de mismatch tussen model-besluit en
rekenregel als getal meelopen in het log; loopt dat percentage op na een
promptwijziging, dan drijft het model af.

Narekenen:

```bash
node -e "const d=require('./data/selectie-log.json');const r=x=>x.gevoel>=2&&x.formulering>=2&&x.relevantie>=2&&x.totaal>=8;const o=d.filter(x=>(x.besluit==='ja')!==r(x));console.log(o.length+'/'+d.length);o.forEach(x=>console.log(x.besluit,x.gevoel+'/'+x.formulering+'/'+x.relevantie,x.titel.slice(0,60)))"
```

## Bevinding 4 — geen promptprobleem, maar het vervuilt de cijfers

**8% van alle beoordelingen wordt afgewezen omdat de tekst onleesbaar is** —
website-navigatie of broncode in plaats van artikeltekst.

| Bron | Onleesbaar | Van totaal |
|---|---|---|
| Sciencenews.org | 12 | 15 (80%) |
| BBC.com/culture | 4 | 19 (21%) |
| ReasonsToBeCheerful.world | 2 | 14 (14%) |
| Newatlas.com | 4 | 70 (6%) |

Dit verandert het advies uit punt 17 van `TODO.md` (bronnen saneren). Sciencenews
en BBC/culture leveren geen slecht nieuws aan — hun tekst wordt **verkeerd
uitgelezen**. Ze schrappen is het verkeerde antwoord; de extractie repareren is
het juiste. Newatlas is een ander geval: 70 items voor 5 treffers, en daar is
de tekst wél leesbaar. Dat is simpelweg een bron die niet bij BrightNews past.

Narekenen:

```bash
node -e "const d=require('./data/selectie-log.json');const p=/onleesbaar|website-code|website-navigatie|onvoldoende inhoud|te weinig inhoud/i;const o=d.filter(x=>p.test(x.reden));const c={};o.forEach(x=>c[x.bron]=(c[x.bron]||0)+1);console.log(o.length+'/'+d.length,c)"
```

## Nog een observatie om samen te wegen

**57% van alles wat wordt goedgekeurd komt van een site die zelf al goed nieuws
verzamelt**: Good Good Good, Optimist Daily, Positive News, Squirrel News.

Dat is geen fout, maar het is wel de voedingsbodem onder bevinding 1: hoe meer
je uit curatiesites haalt, hoe vaker hun weekoverzichten in de invoer zitten.
Squirrel News zit op 93% acceptatie en is per definitie een dienst die
andermans nieuws bundelt. Waard om tegen het licht te houden.

Acceptatiegraad per bron, volgens de rekenregel:

| Bron | Door | Items | % |
|---|---|---|---|
| Squirrel-News.net | 27 | 29 | 93% |
| GoodNewsNetwork.org | 21 | 25 | 84% |
| Adventure-Journal.com | 8 | 11 | 73% |
| GoodGoodGood.co | 30 | 45 | 67% |
| Positive.News | 2 | 3 | 67% |
| ReasonsToBeCheerful.world | 8 | 14 | 57% |
| Openaccessgovernment.org | 2 | 7 | 29% |
| OptimistDaily.com | 6 | 27 | 22% |
| Ww2.kqed.org/mindshift | 2 | 9 | 22% |
| NPR.org | 2 | 11 | 18% |
| Newatlas.com | 5 | 70 | 7% |
| Sciencenews.org | 1 | 15 | 7% |
| BBC.com/culture | 0 | 19 | 0% |
| YesMagazine.org | 0 | 10 | 0% |
| Theecologist.org | 0 | 5 | 0% |

## Wat vooral níét veranderd moet worden

- **De kernregel.** Dat een gered dier of een geholpen gezin telt als goed
  nieuws, ook al was de aanleiding naar, is een subtiel onderscheid dat
  modellen normaal verprutsen. De twee ijkvoorbeelden erbij doen hun werk.
- **De drempel van 8.** Die vangt aantoonbaar de gevallen waar het model zelf
  te soepel is (bevinding 3).
- **De afwijslijst voor productnieuws.** Die wérkt: 59 items kregen alle scores
  0, met redenen als "zuivere productlancering zonder maatschappelijke
  betekenis". Het probleem zit bij de categorieën die géén ijkvoorbeeld hebben.

---

# Bijlage: de negen gepubliceerde missers van run 1 en 2

Vastgelegd op 2026-09-10 als bewijsmateriaal voor het bijstellen van de
selectieprompt. **Dit is geen opruimlijst.** De site staat geparkeerd achter
`binnenkort.html`, dus deze artikelen doen op dit moment weinig kwaad; het
belangrijkste is dat ze gedocumenteerd staan zodat de prompt zo bijgesteld kan
worden dat dit type er in de toekomst niet meer doorheen komt.

Alle negen staan in `articles/manifest.json` en dus in de sitemap: negen
artikelen × vijf talen is 45 geïndexeerde URL's. Wordt er ooit besloten ze
weg te halen, houd dan de regel uit `CLAUDE.md` aan: statische artikelpagina's
worden niet verwijderd, want geïndexeerde URL's mogen niet sterven. Uit de feed
en uit de sitemap halen met een `noindex` erop kan wel.

Ze komen niet vanzelf terug: de pipeline houdt in `seen_links.json` bij welke
bronlinks al gepubliceerd zijn (status `sent`), en alleen afgewezen items
krijgen een herkansing bij een gewijzigde prompt.

## Productnieuws

### Kia teasert grotere camper-broer van PV5
- **Gepubliceerd:** 2026-09-05 · Tech · id `178864608674649fh0dl49`
- **Waar het over gaat:** Kia gaat over minder dan twee weken de productieversie van de PV7 onthullen tijdens de IAA Transportation show in Hannover. De PV7 is het grotere familielid van de populaire PV5, o…
- **Waarom dit niet goed genoeg is:** Een aankondiging dat er binnenkort iets aangekondigd wordt. Niemand geholpen, niets opgelost. Staat als ijkvoorbeeld in de afwijslijst en kwam er tóch doorheen.

### Budgetscooter met luxe features van Ather
- **Gepubliceerd:** 2026-09-05 · Tech · id `1788646140552gfkjr3900`
- **Waar het over gaat:** Ather Energy brengt met de Konarc een budgetscooter uit die functies biedt die normaal bij luxe auto's horen. De basisversie start bij iets meer dan 1000 dollar. De scooter beschik…
- **Waarom dit niet goed genoeg is:** Reclamefolder in nieuwsvorm: prijs, dashboardformaat en app-functies. Geen maatschappelijke kern.

## Politiek en rechtszaken

### Texas stopt geld voor Flock-camera's
- **Gepubliceerd:** 2026-09-05 · Tech · id `1788647519997iqucy27jj`
- **Waar het over gaat:** Gouverneur Greg Abbott heeft alle Texaanse overheidsinstanties opgedragen te stoppen met het financieren van Flock-camera's, na toenemende zorgen over de AI-gestuurde surveillancet…
- **Waarom dit niet goed genoeg is:** Alleen goed nieuws als je surveillancecamera’s afwijst. De kern van het stuk is bovendien iets wat misging: dertig miljoen dollar verkeerd besteed.

### Rechter blokkeert datacenter op federale grond bij Boulder City
- **Gepubliceerd:** 2026-09-05 · Environment · id `1788647298148ob78z37jl`
- **Waar het over gaat:** Een federale administratieve rechtbank heeft de vergunning voor de bouw van een groot datacenter bij Boulder City tijdelijk ingetrokken. Het Interior Board of Land Appeals oordeeld…
- **Waarom dit niet goed genoeg is:** Een rechter die een vergunning intrekt omdat die ten onrechte was verleend. Positief alleen vanuit één standpunt, en de kern is een fout van een overheidsinstantie.

## Verzameledities

### Superieure hartsoftware en meer goed nieuws
- **Gepubliceerd:** 2026-09-05 · Health · id `1788645141480uux502u0y`
- **Waar het over gaat:** Deze week bracht meerdere doorbraken in de gezondheidszorg. Onderzoekers van Imperial College London ontwikkelden software die hartziekten binnen tien seconden kan opsporen via ECG…
- **Waarom dit niet goed genoeg is:** Meerdere losse doorbraken achter elkaar geplakt; de bron was zelf al een weekoverzicht.

### AI-muziek geweerd uit Australische hitlijsten
- **Gepubliceerd:** 2026-09-05 · Science · id `178864553146221lp57tcj`
- **Waar het over gaat:** In de Optimist Daily-podcast van 4 september 2026 komen meerdere positieve nieuwsitems aan bod: AI-gegenereerde muziek wordt geweerd uit de hitlijsten van Australië, de Roman-teles…
- **Waarom dit niet goed genoeg is:** Samenvatting van een podcast-transcript van Optimist Daily met meerdere niet-verwante items.

### Flessen redden dolfijnen en meer goed nieuws
- **Gepubliceerd:** 2026-09-06 · Environment · id `1788668077914dbmh5cikz`
- **Waar het over gaat:** Een simpele uitvinding met lege plastic flessen aan visnetten vermindert de bijvangst van dolfijnen met 88 procent, ontdekte een emeritus mariene bioloog. Vlaanderen sluit dolfinar…
- **Waarom dit niet goed genoeg is:** Dolfijnen, een Vlaams dolfinarium en India in één artikel. Titel eindigt letterlijk op "en meer goed nieuws".

### Colombia beschermt Amazone, groen bouwmateriaal en zonnedak Londen
- **Gepubliceerd:** 2026-09-07 · Environment · id `178880299686709ez84b3k`
- **Waar het over gaat:** President Gustavo Petro heeft vlak voor het einde van zijn ambtstermijn 42% van het Colombiaanse Amazonegebied permanent beschermd tegen nieuwe mijnbouw- en olieprojecten, wat het…
- **Waarom dit niet goed genoeg is:** Drie niet-verwante onderwerpen in de titel zelf. Bevat wel een sterk verhaal (42% van de Colombiaanse Amazone beschermd) dat een eigen artikel had moeten zijn.

### Juli-hoogtepunten: water, transport en wandelen
- **Gepubliceerd:** 2026-09-03 · Environment · id `1788452380111ptqqwf1nc`
- **Waar het over gaat:** In juli werden wereldwijd positieve initiatieven gelanceerd. In India kregen meer dan 100 miljoen plattelandshuishoudens toegang tot drinkwater. Porto bood gratis openbaar vervoer…
- **Waarom dit niet goed genoeg is:** Maandoverzicht van andermans hoogtepunten: India, Porto en de NHS in één stuk.

## Wat dit zegt over de prompt

De vijf verzameledities zijn samen de duidelijkste aanwijzing: dat is precies
de categorie uit bevinding 1 hierboven, waar de afwijslijst wordt overgeslagen
omdat het model eerst op inhoud scoort. De twee politieke stukken sluiten aan op
bevinding 3: het model gaf ze allebei zelf een "ja" bij 2/2/3, en alleen de
rekenregel hield ze tegen — onder de oude drempel kwamen ze er dus doorheen.
Alleen het productnieuws heeft inmiddels een ijkvoorbeeld in de prompt, en dat
is ook de categorie die in het log aántoonbaar het beste wordt gevangen.

---

# Dagelijkse beoordeling

Hieronder schrijft de nachtelijke controle elke nacht om 04:00 Europe/Amsterdam
zijn bevindingen weg: wat er is gepubliceerd, wat daarvan niet bright-waardig
was, en waarom niet. De opdracht waarmee die agent draait staat in
`backend/nachtelijke-beoordeling-prompt.md`.

Blokken worden alleen toegevoegd, nooit herschreven of verwijderd — samen vormen
ze het dossier waarmee de selectieprompt bijgesteld kan worden. Erik beslist wat
er met de bevindingen gebeurt; de agent signaleert alleen en raakt geen
artikelen aan.

### 2026-09-10, 12:26 Europe/Amsterdam

Dit is de eerste ronde: er stond nog geen vorige vermelding, dus zijn de
artikelen van de laatste 48 uur beoordeeld (niet maandag, dus geen volledige
controle van de hele feed).

Beoordeeld: 18 artikelen, gepubliceerd tussen 2026-09-08 16:29 en 2026-09-10
04:22. Niet bright-waardig: 1. Twijfel: 1.

#### Zes Boeken Die De Wereld Anders Laten Zien
- **Gepubliceerd:** 2026-09-09 16:35 · Lifestyle · Adventure-Journal.com
- **Waar het over gaat:** De vaste boekenrubriek "Recommended Reading" van
  Adventure-Journal beveelt zes nieuwe, onderling losstaande boeken aan over
  uiteenlopende onderwerpen — onder meer inheems natuurbeheer, moerasecologie
  en andere thema's — elk in een paar zinnen samengevat.
- **Waarom dit niet goed genoeg is:** Dit is een verzameleditie: meerdere
  niet-verwante onderwerpen gebundeld in één artikel, precies de categorie die
  de selectieprompt afwijst onder "verzamel- en weekoverzichtitems" ("alleen
  losse, échte verhalen tellen"). Dat het om boeken gaat in plaats van
  nieuwsfeiten maakt het niet anders: er is geen eigen, samenhangend
  bright-verhaal, maar een rubriek die zes losse titels naast elkaar zet.
- **Link:** /articles/nl/zes-boeken-die-de-wereld-anders-laten-zien-1788971711663lbi9wql8g.html

#### Twijfelgeval: Nieuwe EU-wet Steunt Europese Innovatie
- **Gepubliceerd:** 2026-09-09 16:32 · Tech · Openaccessgovernment.org
- **Waar het over gaat:** De Europese Commissie stelt een European Innovation
  Act voor, onderdeel van de Startup and Scaleup Strategy, om Europese
  startups te helpen aan financiering, grensoverschrijdende uitbreiding en een
  gemeenschappelijk IP-kader.
- **Waarom ik twijfel:** Dit leest als een droge beleidsaankondiging van een
  EU-instelling — geen mensen, geen concreet verhaal, geen "goed gevoel"-kern,
  vooral een samenvatting van een wetsvoorstel. Het raakt de categorieën
  "bedrijfs- of beursnieuws zonder bredere maatschappelijke betekenis" en
  "politiek gekleurde onderwerpen" (EU-beleid) zonder er helemaal in te
  passen, want het gaat om brede, niet-partijdige economische steun in plaats
  van een polariserend onderwerp. Ik zou het afkeuren omdat het dichter bij
  overheidscommunicatie dan bij een bright-verhaal staat, maar het is geen
  ijkvoorbeeld zoals de productlanceringen — oordeel van Erik gewenst.

Alle overige 16 artikelen voldeden aan de maatstaf: vooral reddings- en
herstelverhalen (zeeschildpad, grotvleermuis, elanden/tunnels), natuurherstel
(bevers, puingaarden), persoonlijke en gemeenschapsverhalen (armloze coureur,
loterij-echtpaar, beachcombing-museum) en hoopvolle wetenschap/gezondheid
(blaaskankertest, oogdruppels, hartvaccin, Vikingschat, fossiele
insectengeluiden, klipdas-pups, Fat Pika Week, boomplantactie voor 9/11). Het
boomplant-artikel voor 9/11 heeft een nare aanleiding, maar de kern —
gemeenschapszin en een herdenkingsdaad — is precies wat de kernregel als
bright-materiaal aanmerkt, dus dat is terecht doorgelaten.

#### Patroon

De twee opvallendste gevallen komen beide van een vaste rubriek in plaats van
een losstaand nieuwsbericht: Adventure-Journal's "Recommended Reading" is een
terugkerende boekenrubriek die blijkens `data/selectie-log.json` al minstens
drie keer is beoordeeld (9 en 10 september in deze feed, plus nog een eerdere
vermelding) en steeds is goedgekeurd met scores tussen 8 en 10 — telkens om
dezelfde reden ("hartverwarmend verhaal over natuurbeheer"), terwijl het
format een losse lijst van boeken blijft. Dit is dezelfde systematische fout
als de weekoverzichten uit bevinding 1 hierboven, maar dan voor boeken in
plaats van nieuws: de selectieprompt heeft voor verzameledities een regel,
maar geen ijkvoorbeeld, en een terugkerende rubriek lijkt daar consistent
doorheen te glippen.

### 2026-09-11, 04:08 Europe/Amsterdam

Sinds de vorige ronde (die liep tot en met 2026-09-10 04:22) zijn er geen
nieuwe artikelen in `data/news_nl.json` bijgekomen: het aantal
niet-digest-artikelen in de feed staat nog op 150 en de laatste
publicatiedatum is nog steeds 2026-09-10 04:22. Er viel dus niets te
beoordelen vannacht, en (niet maandag, dus geen volledige controle) ook geen
aanleiding om de hele feed na te lopen.

#### Wat ik daarnaast aantrof: de AI-pijplijn lijkt sinds die publicatiedatum niet meer met succes te draaien

Dit valt buiten mijn eigenlijke opdracht — ik controleer artikelen, geen
infrastructuur — maar het verklaart rechtstreeks waarom er niets nieuws was,
en leek me te belangrijk om niet te melden. Ik heb er niets aan veranderd.

- De geplande run van 2026-09-10 12:00 UTC (afgerond om 16:16 UTC, workflow-run
  #253 van "🚀 BrightNews: Automatische Update") heeft nul artikelen
  geaccepteerd: `data/last_run.json` toont `"aiCalls": 0` en
  `"selectieFouten": 2`, tegenover 293 kandidaten en 6 opgehaalde teksten.
- De workflowlogs van die run laten zien waarom: elke aanroep van Anthropic
  geeft `"Your credit balance is too low to access the Anthropic API"` (een
  harde 400-fout, geen tijdelijk probleem), en de daaropvolgende val-terug naar
  Mistral loopt vast op `"Rate limit exceeded"` (429,
  `x-ratelimit-remaining-req-minute: 0`). Dat gebeurt bij zowel de selectiestap
  als de dagoverzichten (`digest.js`) als de Postfabriek
  (`generate-posts.js`) — overal waar de AI-adapter wordt aangeroepen.
- Sinds die run is er, voor zover ik in de GitHub Actions-geschiedenis kan
  zien, helemaal geen run van "🚀 BrightNews: Automatische Update" meer
  geweest: de laatste is run #253 (het 2026-09-10 12:00 UTC-slot). Het is nu
  2026-09-11 04:08 Europe/Amsterdam (02:08 UTC); de geplande run van
  2026-09-11 00:00 UTC ontbreekt dus volledig in de lijst — niet gefaald, maar
  niet eens gestart.
- Ter info: `CLAUDE.md` meldt dat "de fallback-sleuf in de adapter bewust
  leeg" is omdat Mistral is afgebouwd. De logs laten zien dat de code bij een
  falende Anthropic-aanroep wél degelijk naar Mistral terugvalt — dat lijkt
  niet meer te kloppen met wat er nu in de code staat, of de documentatie is
  achterhaald.

Geen inhoudelijke bevinding over bright-waardigheid dus, maar wel iets wat
voor Erik waarschijnlijk urgenter is dan de gebruikelijke inhoudscontrole.

### 2026-09-12, 04:00 Europe/Amsterdam

Sinds de vorige ronde (die liep tot en met 2026-09-10 04:22:12) zijn er
opnieuw geen nieuwe artikelen in `data/news_nl.json` bijgekomen: nog steeds
150 artikelen in de feed, waarvan 141 geen digest, en de laatste
publicatiedatum staat nog op 2026-09-10 04:22:12. Er viel dus niets te
beoordelen vannacht. Vandaag is het zaterdag, geen maandag, dus ook geen
aanleiding voor een volledige controle van de hele feed.

#### Vervolg op de vorige melding: de AI-pijplijn staat er nog steeds zo voor

Ook dit valt buiten mijn eigenlijke opdracht, maar het is de rechtstreekse
verklaring voor het uitblijven van nieuwe artikelen en sluit aan op wat ik
de vorige ronde al meldde, dus noteer ik hier kort de huidige stand.

- De geplande Actions-run van 2026-09-11 16:18 UTC (run #255, "🚀 BrightNews:
  Automatische Update") is wél gestart en afgerond — de workflow draait dus
  weer op schema — maar heeft opnieuw nul artikelen geaccepteerd:
  `data/last_run.json` toont `"aiCalls": 0`, `"geaccepteerd": 0` tegenover 293
  kandidaten en 17 opgehaalde teksten.
  In de workflowlogs van die run eindigt de val-terug naar Mistral nog steeds
  op `429 Too Many Requests` met `x-ratelimit-remaining-req-minute: 0`, precies
  zoals in de vorige melding. Ik heb niet apart nagekeken of de
  Anthropic-aanroep zelf nog altijd op de lege kredietbalans stuit, maar het
  resultaat (nul geaccepteerde artikelen, beide providers falen) is identiek
  aan de vorige ronde.
- Er was, voor het eerst sinds de storing begon, wél weer een tussenliggende
  geplande run: 2026-09-11 04:14 UTC (run #254). Die viel samen met de
  nachtelijke beoordeling van toen en gaf hetzelfde beeld.
- Kortom: de workflow zelf is niet meer het probleem (hij start weer op elk
  geplande moment), maar de AI-aanroepen zelf lopen al twee etmalen op rij op
  niets uit. Dit is dus geen eenmalige hapering meer, maar een aanhoudende
  storing.

Geen inhoudelijke bevinding over bright-waardigheid, opnieuw, maar wel een
update die voor Erik waarschijnlijk nog steeds de urgentste melding in dit
document is.
