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

### 2026-09-13, 02:15 Europe/Amsterdam

Sinds de vorige ronde (die liep tot en met 2026-09-10 04:22:12) zijn er
opnieuw geen nieuwe artikelen in `data/news_nl.json` bijgekomen: nog steeds
150 artikelen in de feed, waarvan 141 geen digest, en de laatste
publicatiedatum staat nog altijd op 2026-09-10 04:22:12. Er viel dus niets te
beoordelen vannacht. Vandaag is het zondag, geen maandag, dus ook geen
aanleiding voor een volledige controle van de hele feed.

#### Vervolg op de vorige twee meldingen: de AI-pijplijn staat er nu voor de derde nacht op rij zo voor

- De geplande Actions-run van 2026-09-12 15:24 UTC (run #257, "🚀 BrightNews:
  Automatische Update") is normaal afgerond, maar heeft opnieuw nul artikelen
  geaccepteerd: `data/last_run.json` toont `"aiCalls": 0`, `"geaccepteerd": 0`
  tegenover 293 kandidaten en 22 opgehaalde teksten. De workflowlogs van die
  run laten exact hetzelfde beeld zien als de twee vorige meldingen: elke
  Anthropic-aanroep krijgt `"Your credit balance is too low to access the
  Anthropic API"` (400), en de val-terug naar Mistral loopt vast op `"Rate
  limit exceeded"` (429). Dit keer gezien bij de digest-stap
  (`backend/digest.js`), maar het patroon in de eerdere meldingen laat zien
  dat het bij alle AI-aanroepen optreedt.
- Nieuw ten opzichte van de vorige twee meldingen: de geplande run van
  2026-09-13 00:00 UTC ontbreekt volledig in de workflowgeschiedenis. Het is
  nu 2026-09-13 02:15 Europe/Amsterdam (00:15 UTC), dus die run had al
  minstens een kwartier geleden moeten starten. Dit is dezelfde situatie als
  op 2026-09-11 04:08, toen de 00:00 UTC-run van die nacht ook helemaal niet
  gestart bleek te zijn — het lijkt er dus niet op dat de workflow zelf
  structureel stabiel op schema draait, ook los van de AI-storing.
- Samengevat: het is nu de derde nacht op rij zonder nieuwe artikelen, en de
  onderliggende oorzaak (lege Anthropic-kredietbalans, Mistral-terugval
  overbelast) is in drie opeenvolgende metingen ongewijzigd gebleven. Dit is
  geen tijdelijke hapering meer maar een aanhoudende storing die alleen met
  ingrijpen van buitenaf (kredietbalans aanvullen, of de Mistral-terugval
  anders inrichten) oplost — dat kan ik als controleur niet zelf doen.

Geen inhoudelijke bevinding over bright-waardigheid, opnieuw, maar wel een
update die voor Erik waarschijnlijk nog steeds de urgentste melding in dit
document is, en die met het uitblijven van de 00:00 UTC-run vannacht eerder
verergert dan verbetert.


### 2026-09-14, 04:16 Europe/Amsterdam

Vandaag is het maandag, dus is conform de opdracht de **volledige feed**
beoordeeld in plaats van alleen het nieuwe deel. Sinds de vorige ronde (die
liep tot en met 2026-09-10 04:22:12) zijn er nog steeds geen nieuwe artikelen
aan `data/news_nl.json` toegevoegd — zie de toelichting onderaan dit blok.

Beoordeeld: 141 artikelen (de volledige feed, exclusief de 9 dagoverzichten),
gepubliceerd tussen 2026-09-02 04:12 en 2026-09-10 04:22. Niet bright-waardig:
43. Twijfel: 12. Dit is de eerste volledige controle sinds deze nachtelijke
beoordeling op 2026-09-10 is gestart; er is dus nog geen eerdere volledige
ronde om tegen af te zetten.

#### HP start accelerator in Azië voor AI-tijdperk
- **Gepubliceerd:** 2026-09-02 04:12 · Tech · Fortune.com
- **Waar het over gaat:** HP lanceert Garage 2.0, een startup-accelerator in
  Singapore, om zijn bedrijfsactiviteiten nieuw leven in te blazen voor het
  AI-tijdperk, inclusief nieuwe AI-pc's en een geluidsinstallatie op een
  luchthaven.
- **Waarom dit niet goed genoeg is:** Bedrijfsnieuws van een techbedrijf over
  zijn eigen strategie en productlancering, zonder bredere maatschappelijke
  betekenis. Staat in de afwijslijst onder "bedrijfs- of beursnieuws".
- **Link:** https://fortune.com/2026/09/01/hp-asia-ai-pcs-wubble-ai-changi-airport-michael-boyle/

#### Miljardair koopt villa zonder bezichtiging
- **Gepubliceerd:** 2026-09-02 04:12 · Finance · Fortune.com
- **Waar het over gaat:** Mark Cuban kocht een villa van 25 miljoen dollar
  zonder ze ooit gezien te hebben, voor de helft van de vraagprijs, omdat het
  volgens hem "de beste gegarandeerde return on investment" biedt.
- **Waarom dit niet goed genoeg is:** Een miljardair die goedkoop onroerend
  goed scoort is geen bright-verhaal voor de gewone lezer — geen hulp, geen
  herstel, geen maatschappelijke kern, uitsluitend een demonstratie van
  vermogen.
- **Link:** https://fortune.com/article/mark-cuban-bought-25-million-mansion-sight-unseen-discount-guaranteed-return-on-investment-billionaire-real-estate-strategy/

#### Elektrisch vliegend schip maakt eerste vlucht
- **Gepubliceerd:** 2026-09-03 09:15 · Tech · Newatlas.com
- **Waar het over gaat:** De Regent Craft Viceroy, een elektrisch aangedreven
  "zeeglijder" die drijvend casco, wing-in-ground-effect en hydrofoils
  combineert, heeft zijn eerste bemande vlucht gemaakt.
- **Waarom dit niet goed genoeg is:** Een fabrikant die de eerste testvlucht
  van zijn nieuwe voertuig meldt — precies het type voertuignieuws dat de
  afwijslijst noemt, "hoe hip of vernuftig ook".
- **Link:** https://newatlas.com/aircraft/regent-craft-viceroy-wig-hydrofoil-aircraft-maiden-flight/

#### Groene camper met slimme technologie
- **Gepubliceerd:** 2026-09-03 09:16 · Environment · Newatlas.com
- **Waar het over gaat:** Dethleffs presenteert de C.Core, een camperconcept
  met biomimicry, zonnepanelen en gesloten materiaalkringloop.
- **Waarom dit niet goed genoeg is:** Vrijwel letterlijk het ijkvoorbeeld uit
  de selectieprompt zelf ("Kia werkt aan de volgende generatie coole
  campers"), nu van een ander merk: een camperconcept is productnieuws, geen
  maatschappelijk verhaal.
- **Link:** https://newatlas.com/rvs-motorhomes/dethleffs-c-core-eco-camper/

#### Niger herstelt 5 miljoen hectare zonder bomen te planten
- **Gepubliceerd:** 2026-09-03 16:17 · Environment · OptimistDaily.com
- **Waar het over gaat:** Niger herstelde vijf miljoen hectare land zonder
  bomen te planten. Het artikel voegt daarna nog tien andere, losstaande
  positieve ontwikkelingen toe: een vaccinatieprogramma voor pinguïns, een
  Frans telemarketingverbod en een opioïdenschikking in Baltimore.
- **Waarom dit niet goed genoeg is:** De URL zelf verraadt het:
  "podcast-transcript…plus-nine-other-things-going-right". Dit is een
  podcasttranscript met tien niet-verwante onderwerpen — een verzameleditie.
- **Link:** https://www.optimistdaily.com/2026/08/podcast-transcript-august-28th-2026-niger-restored-5-million-hectares-without-planting-a-single-tree-plus-nine-other-things-going-right/

#### Zonnestroom wint van kolen in China
- **Gepubliceerd:** 2026-09-03 16:17 · Science · Squirrel-News.net
- **Waar het over gaat:** Drie losse items achter elkaar: steun voor
  Amerikanen die van de MAGA-beweging afstappen, zonne-energie die
  steenkool voorbijstreeft in China, en een AI-tool die hartziekten
  herkent.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen, waarvan er één (Amerikaanse binnenlandse politiek) bovendien
  politiek gekleurd is.
- **Link:** https://squirrel-news.net/news/exit-ramp-from-trumpism-solar-overtakes-coal-in-china-ai-spots-heart-disease-in-seconds/

#### Libanon stopt met doodstraf, tijgers keren terug
- **Gepubliceerd:** 2026-09-03 16:18 · Science · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: Libanon schaft de doodstraf af,
  een tijger keert terug in Kazachstan na 70 jaar, en het eerste mRNA-vaccin
  tegen huidkanker wordt geïntroduceerd.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie volledig
  niet-verwante onderwerpen in één artikel.
- **Link:** https://squirrel-news.net/news/lebanon-abolishes-death-penalty-first-mrna-vaccine-against-skin-cancer-tigers-return-to-kazakhstan/

#### Zonne-energie en houten torens: duurzame oplossingen
- **Gepubliceerd:** 2026-09-03 16:18 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: zonneprojecten in Koerdische
  dorpen, houten "flat-pack" wolkenkrabbers, en een kaartspel in Kenia over
  mannelijkheidsnormen.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/iraqs-solar-villages-flat-pack-skyscrapers-the-card-game-challenging-masculinity/

#### Papa’s tijd, minder stress
- **Gepubliceerd:** 2026-09-03 16:18 · Health · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: langer vaderschapsverlof en
  minder depressie, snellere longgroei door Londens schone-luchtzone, en een
  vaccinatiecampagne voor 5.000 pinguïns.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/paternity-leave-improves-mental-health-clean-air-zones-see-faster-lung-growth-vaccinating-5000-tiny-penguins/

#### mRNA-kankervaccin bereikt doorbraak
- **Gepubliceerd:** 2026-09-03 16:18 · Health · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: een gepersonaliseerd
  mRNA-kankervaccin met veelbelovende resultaten, festivals die hun terrein
  herstellen, en een mobiele bibliotheek in Syrië.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/first-mrna-cancer-vaccine-succeeds-in-final-trials-festivals-restoring-land-mobile-library-in-rural-syria/

#### Mobiele klinieken en natuurbibliotheek brengen zorg en avontuur
- **Gepubliceerd:** 2026-09-03 16:18 · Health · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: mobiele klinieken voor
  baarmoederhalskankerscreening in Engeland, rondtrekkende artsen in
  Frankrijk, en een nieuwe "natuurbibliotheek" in Colorado.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen, al zijn de eerste twee wel verwant aan elkaar.
- **Link:** https://squirrel-news.net/news/cervical-screening-bus-tackling-frances-medical-deserts-us-opens-first-nature-library/

#### Amazone beschermd, steden koel, fietsen divers
- **Gepubliceerd:** 2026-09-03 16:19 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: minder ontbossing in de
  Amazone, regenwater opvangen om steden te koelen, en meer vrouwen op de
  fiets in Bogotá.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen — zelfs de titel zelf somt ze los op.
- **Link:** https://squirrel-news.net/news/amazon-deforestation-hits-13-year-low-cooling-cities-with-rooftop-rainwater-breaking-cycling-gender-barriers/

#### Juli-hoogtepunten: water, transport en wandelen
- **Gepubliceerd:** 2026-09-03 16:19 · Environment · Squirrel-News.net
- **Waar het over gaat:** Maandoverzicht van Squirrel-News met de "beste"
  ontwikkelingen van juli: drinkwater in India, gratis vervoer in Porto en
  een wandelbeloning van de NHS.
- **Waarom dit niet goed genoeg is:** Expliciet maandoverzicht van andermans
  hoogtepunten — dezelfde bevinding als in de analyse hierboven, nu opnieuw
  aangetroffen in dezelfde volledige feed.
- **Link:** https://squirrel-news.net/news/best-of-july-drinking-water-for-millions-of-households-free-public-transport-in-porto-rewards-for-30-minutes-walks/

#### Bevers, chemicaliën en klimaatdata in actie
- **Gepubliceerd:** 2026-09-03 16:19 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: bevers die natuurbranden
  vertragen, een Zweeds verbod op "forever chemicals", en een nieuw open
  klimaatdataplatform.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/beavers-tackling-wildfires-sweden-to-ban-forever-chemicals-researchers-secure-access-to-climate-knowledge/

#### Natuurbehoud wint in Centraal-Amerika en Kazachstan
- **Gepubliceerd:** 2026-09-03 16:20 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: biosfeerreservaten in
  Centraal-Amerika, een groeiende saigapopulatie in Kazachstan, en
  3D-geprinte gewrichtsimplantaten uit Tsjechië.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/green-islands-avoiding-deforestation-in-central-america-saiga-population-grows-by-18000-3d-printed-joint-implants/

#### Water en koelte voor miljoenen
- **Gepubliceerd:** 2026-09-03 16:20 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: drinkwatertoegang in India,
  een prijsplafond voor bussen in Engeland, en gratis toegang tot
  bioscopen met airco in Rome.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/drinking-water-for-more-than-100-million-households-england-caps-bus-fares-free-cinema-to-beat-the-heat/

#### Zonnewende in Europa en steun voor moeders
- **Gepubliceerd:** 2026-09-03 16:20 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: een record aandeel zonne-energie
  in de EU, onvoorwaardelijk geld voor zwarte alleenstaande moeders in
  Mississippi, en labels tegen AI-muziek in de muziekindustrie.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/solar-generates-25-of-eu-power-basic-income-for-black-single-mothers-how-the-music-industry-is-rejecting-ai/

#### Porto’s gratis vervoer en Cubaanse zonne-tricars
- **Gepubliceerd:** 2026-09-03 16:20 · Lifestyle · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: gratis openbaar vervoer in
  Porto, een Ebola-behandelproef in Congo, en zonne-aangedreven driewielers
  op Cuba.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/porto-introduces-free-public-transport-landmark-ebola-treatment-trial-in-drc-cubas-solar-powered-tricycles/

#### Speelse oplossingen voor kinderopvang en gezondheid
- **Gepubliceerd:** 2026-09-03 16:21 · Lifestyle · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: een verticale speelplek in
  München, onderzoek naar kankertherapie, en geld voor schone kooktechniek
  in Afrika.
- **Waarom dit niet goed genoeg is:** Verzameleditie van drie niet-verwante
  onderwerpen.
- **Link:** https://squirrel-news.net/news/vertical-playground-brain-and-prostate-cancer-breakthroughs-africas-clean-cooking-boost/

#### NHS looft dagelijkse wandelaars met kortingen
- **Gepubliceerd:** 2026-09-03 16:21 · Health · Squirrel-News.net
- **Waar het over gaat:** Twee losse items: een NHS-kortingsprogramma voor
  wandelaars, en dalende luchtvervuiling in Europa (plus een zijlijn over
  klimaatcontent op OnlyFans).
- **Waarom dit niet goed genoeg is:** Verzameleditie van niet-verwante
  onderwerpen, ook al is het er hier "maar" twee à drie.
- **Link:** https://squirrel-news.net/news/nhs-to-reward-people-who-walk-30-minutes-a-day-europes-air-quality-improves-onlyfans-climate-campaign/

#### Groene economie groeit naar $10 biljoen
- **Gepubliceerd:** 2026-09-03 16:21 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: de marktwaarde van de groene
  economie, energiezuinige nieuwbouw in Vermont, en elektrische tuk-tuks in
  Aziatische steden.
- **Waarom dit niet goed genoeg is:** De titel suggereert één samenhangend
  verhaal over "de groene economie", maar de tekst bundelt drie losse
  onderwerpen — verzameleditie.
- **Link:** https://squirrel-news.net/news/green-economy-tops-10-trillion-in-market-value-new-homes-cut-energy-use-in-half-indias-electric-tuk-tuks/

#### Juni-hoogtepunten: Arctisch ijs, mangroves en koele daken
- **Gepubliceerd:** 2026-09-03 16:21 · Environment · Squirrel-News.net
- **Waar het over gaat:** Maandoverzicht: "dit zijn de beste en meest
  constructieve verhalen van de afgelopen maand", met Arctisch ijs,
  mangroveherstel en koele daken in Afrika.
- **Waarom dit niet goed genoeg is:** Expliciet maandoverzicht van andermans
  hoogtepunten, net als het Juli-exemplaar hierboven.
- **Link:** https://squirrel-news.net/best-of-june-refreezing-the-arctic-worlds-mangrove-forests-are-healing-white-roofs-cool-african-homes/

#### Gemeenschappen zetten zich gezamenlijk in tegen Big Tech
- **Gepubliceerd:** 2026-09-03 16:25 · Environment · YesMagazine.org
- **Waar het over gaat:** Essay van YES! Media over gemeenschappen die zich
  collectief verzetten tegen de groei van datacenters, vanwege lucht-,
  water- en geluidsoverlast.
- **Waarom dit niet goed genoeg is:** Alleen goed nieuws als je datacenters
  en Big Tech al afwijst — dezelfde redenering als bij de Texaanse
  Flock-camera's en de Boulder City-rechter hieronder: de kern is verzet
  tegen iets, niet redding of herstel.
- **Link:** https://www.yesmagazine.org/issues/2026/08/13/theres-no-opting-out-of-these-crises-liberation-is-collective

#### Donaties helpen duurzame verandering
- **Gepubliceerd:** 2026-09-03 16:25 · Environment · YesMagazine.org
- **Waar het over gaat:** YES! Media meldt dat het tijdschrift 38 kleine
  maandelijkse donaties ontving om zijn nieuwsbrief voort te zetten, met
  algemene bespiegelingen over klimaatimpact.
- **Waarom dit niet goed genoeg is:** Dit is nieuws over het medium zelf
  (fondsenwerving), geen bright-verhaal voor de lezer — bedrijfs-/
  organisatienieuws zonder concreet verhaal.
- **Link:** https://www.yesmagazine.org/issues/2026/07/17/connecting-our-individual-actions-with-systemic-change

#### Strijd voor water en land
- **Gepubliceerd:** 2026-09-03 16:25 · Environment · YesMagazine.org
- **Waar het over gaat:** Terugblik, tien jaar na dato, op het verzet van
  inheemse activisten tegen de Dakota Access-oliepijpleiding bij Standing
  Rock.
- **Waarom dit niet goed genoeg is:** Politiek gekleurd onderwerp — een
  protestbeweging tegen een pijpleiding — en de kern is een confrontatie,
  geen redding of herstel.
- **Link:** https://www.yesmagazine.org/issues/2026/05/14/how-standing-rock-changed-us-all

#### YES! Magazine leeft voort via nieuw initiatief
- **Gepubliceerd:** 2026-09-03 16:26 · Lifestyle · YesMagazine.org
- **Waar het over gaat:** YES! Magazine, dat eerder dit jaar stopte met
  reguliere publicatie, meldt hoe het platform voortleeft via een nieuw
  initiatief.
- **Waarom dit niet goed genoeg is:** Nieuws over het medium zelf, niet over
  de wereld — dit hoort bij "bedrijfs- of beursnieuws zonder bredere
  maatschappelijke betekenis", nu voor een uitgever in plaats van een bedrijf.
- **Link:** https://www.yesmagazine.org/issues/2025/09/15/a-repository-of-hope-amid-an-authoritarian-moment

#### Superieure hartsoftware en meer goed nieuws
- **Gepubliceerd:** 2026-09-05 21:52 · Health · Positive.News
- **Waar het over gaat:** Weekoverzicht van Positive News met meerdere
  losse doorbraken in de gezondheidszorg, waaronder hartsoftware van
  Imperial College London.
- **Waarom dit niet goed genoeg is:** De URL is letterlijk
  "good-news-stories-from-week-36-of-2026" — een weekoverzicht van een
  andere site, exact de categorie die de selectieprompt afwijst.
- **Link:** https://www.positive.news/society/good-news-stories-from-week-36-of-2026/

#### AI-muziek geweerd uit Australische hitlijsten
- **Gepubliceerd:** 2026-09-05 21:58 · Science · OptimistDaily.com
- **Waar het over gaat:** Podcasttranscript van Optimist Daily van 4
  september met meerdere niet-verwante nieuwsitems: AI-muziek geweerd uit
  Australië, de lancering van de Roman-telescoop, en een afbreekbare
  ballon.
- **Waarom dit niet goed genoeg is:** Podcasttranscript met meerdere
  niet-verwante onderwerpen — verzameleditie.
- **Link:** https://www.optimistdaily.com/2026/09/podcast-transcript-september-4th-2026-ai-music-banned-from-australias-charts-roman-telescope-launches-a-biodegradable-balloon-and-much-more/

#### Goed Nieuws: Bakkers, Zon En Een Schoolredding
- **Gepubliceerd:** 2026-09-05 22:01 · Environment · GoodGoodGood.co
- **Waar het over gaat:** Weekoverzicht van GoodGoodGood met onder meer
  steun aan zwarte ondernemers door Ms. Rachel, cijfers over schone energie
  in India, en een zijlijn over "vrede in Palestina".
- **Waarom dit niet goed genoeg is:** De titel citeert vrijwel letterlijk
  het ijkvoorbeeld uit de afwijslijst ("good news this week"), en de tekst
  bundelt bovendien niet-verwante onderwerpen, waaronder een politiek
  onderwerp.
- **Link:** https://www.goodgoodgood.co/articles/good-news-this-week-september-5-2026

#### Mangroves als Symbool van Verzet in Puerto Rico
- **Gepubliceerd:** 2026-09-05 22:05 · Environment · YesMagazine.org
- **Waar het over gaat:** Essay dat mangrovebossen gebruikt als symbool
  voor sociale rechtvaardigheidsbewegingen in Puerto Rico, met kolonialisme
  als terugkerend thema.
- **Waarom dit niet goed genoeg is:** Politiek/opiniërend essay zonder
  concreet bright-verhaal — leunt op "politiek gekleurde onderwerpen".
- **Link:** https://www.yesmagazine.org/environmental-justice/2025/05/15/murmurations-puerto-rico-mangroves

#### Drijvend Platform Levert Stroom En Water
- **Gepubliceerd:** 2026-09-05 22:07 · Tech · Newatlas.com
- **Waar het over gaat:** Twee bedrijven onthullen een conceptontwerp voor
  een drijvend platform dat stroom en water moet leveren.
- **Waarom dit niet goed genoeg is:** Bedrijfsaankondiging van een nog
  ongebouwd concept — geen gerealiseerd effect, puur productpromotie.
- **Link:** https://newatlas.com/energy/kraaken-ship-data-center-water-electricity/

#### Kia teasert grotere camper-broer van PV5
- **Gepubliceerd:** 2026-09-05 22:08 · Tech · Newatlas.com
- **Waar het over gaat:** Kia onthult over minder dan twee weken de
  productieversie van de PV7 tijdens de IAA Transportation-show in
  Hannover.
- **Waarom dit niet goed genoeg is:** Al eerder gemeld door deze controle:
  het letterlijke ijkvoorbeeld uit de afwijslijst, en het staat nog steeds
  live op de site.
- **Link:** https://newatlas.com/campervans/kia-teases-pv7-debut/

#### Budgetscooter met luxe features van Ather
- **Gepubliceerd:** 2026-09-05 22:09 · Tech · Newatlas.com
- **Waar het over gaat:** Ather Energy brengt de Konarc uit, een
  budgetscooter met functies die normaal bij luxe voertuigen horen.
- **Waarom dit niet goed genoeg is:** Al eerder gemeld door deze controle:
  reclame voor een nieuw voertuig, geen maatschappelijke kern.
- **Link:** https://newatlas.com/motorcycles/ather-budget-konarc-scooter/

#### Managers en coaching: worstelen met de aanpak
- **Gepubliceerd:** 2026-09-05 22:21 · Lifestyle · OptimistDaily.com
- **Waar het over gaat:** Onderzoek naar waarom managers moeite hebben met
  het coachen van medewerkers.
- **Waarom dit niet goed genoeg is:** De bron die is opgehaald bevat
  nauwelijks inhoud ("verdere details… ontbreken in de bron"); te weinig
  om zeker te zijn wat het artikel werkelijk meldt. Dit is bovendien
  bedrijfs-/managementadvies, geen bright-verhaal.
- **Link:** https://www.optimistdaily.com/2026/09/why-managers-struggle-with-coaching-and-what-the-research-says-to-do-instead/

#### Kiezen Van Een Vruchtbaarheidskliniek
- **Gepubliceerd:** 2026-09-05 22:22 · Health · OptimistDaily.com
- **Waar het over gaat:** Zou moeten uitleggen hoe je een
  vruchtbaarheidskliniek kiest.
- **Waarom dit niet goed genoeg is:** De opgehaalde bron bevat vrijwel
  uitsluitend paginanavigatie in plaats van inhoud — precies het geval
  "titel + tekst geven te weinig inhoud om zeker te zijn" uit de
  afwijslijst.
- **Link:** https://www.optimistdaily.com/2026/09/how-to-choose-a-fertility-clinic-what-reproductive-endocrinologists-look-for/

#### Australië trekt grens bij muziek
- **Gepubliceerd:** 2026-09-05 22:22 · Tech · OptimistDaily.com
- **Waar het over gaat:** Zou moeten gaan over een Australische
  hitlijstregel die bepaalt wat als "echte muziek" telt.
- **Waarom dit niet goed genoeg is:** Ook hier vermeldt de bron zelf dat
  "verdere details… niet worden gegeven" — te weinig inhoud om te
  beoordelen.
- **Link:** https://www.optimistdaily.com/2026/08/what-counts-as-real-music-australias-charts-just-drew-a-line/

#### Rechter blokkeert datacenter op federale grond bij Boulder City
- **Gepubliceerd:** 2026-09-05 22:28 · Environment · GoodGoodGood.co
- **Waar het over gaat:** Een federale rechtbank trok de bouwvergunning
  voor een datacenter bij Boulder City tijdelijk in.
- **Waarom dit niet goed genoeg is:** Al eerder gemeld: alleen positief
  vanuit één standpunt, en de kern is een fout van een overheidsinstantie
  die een vergunning ten onrechte verleende.
- **Link:** https://www.goodgoodgood.co/articles/judge-stops-data-center-construction-on-public-land

#### Texas stopt geld voor Flock-camera's
- **Gepubliceerd:** 2026-09-05 22:32 · Tech · GoodGoodGood.co
- **Waar het over gaat:** Gouverneur Abbott laat Texaanse overheden stoppen
  met het financieren van AI-surveillancecamera's van Flock.
- **Waarom dit niet goed genoeg is:** Al eerder gemeld: alleen goed nieuws
  als je surveillancecamera's afwijst, en de kern is verkeerd bestede
  overheidsgelden.
- **Link:** https://www.goodgoodgood.co/articles/texas-governor-abbott-flock-state-agency-spending

#### Flessen redden dolfijnen en meer goed nieuws
- **Gepubliceerd:** 2026-09-06 04:14 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: plastic flessen die bijvangst
  van dolfijnen verminderen, de sluiting van een Vlaams dolfinarium, en een
  waterstoftrein in India.
- **Waarom dit niet goed genoeg is:** Verzameleditie; de titel eindigt
  letterlijk op "en meer goed nieuws".
- **Link:** https://squirrel-news.net/news/plastic-bottles-saving-dolphins-indias-first-hydrogen-powered-train-lithium-recycling-breakthrough/

#### Colombia beschermt Amazone, groen bouwmateriaal en zonnedak Londen
- **Gepubliceerd:** 2026-09-07 17:43 · Environment · Squirrel-News.net
- **Waar het over gaat:** Drie losse items: 42% van het Colombiaanse
  Amazonegebied beschermd, een nieuw koolstofopslaand bouwmateriaal, en
  Londens grootste zonnedak.
- **Waarom dit niet goed genoeg is:** Al eerder gemeld: drie niet-verwante
  onderwerpen in één artikel, terwijl het Colombia-verhaal een eigen sterk
  artikel had verdiend.
- **Link:** https://squirrel-news.net/news/colombia-creates-amazons-largest-reserve-new-carbon-storing-building-material-londons-largest-solar-roof/

#### Urinetest herkent blaaskanker thuis
- **Gepubliceerd:** 2026-09-08 16:32 · Health · OptimistDaily.com
- **Waar het over gaat:** Zou moeten gaan over een thuistest die
  blaaskanker herkent via urine.
- **Waarom dit niet goed genoeg is:** De bron vermeldt zelf dat "verdere
  details over de werking, ontwikkelaars of onderzoek… niet vermeld"
  worden — te weinig inhoud.
- **Link:** https://www.optimistdaily.com/2026/09/at-home-urine-test-spots-bladder-cancer-in-nine-of-ten-cases/

#### Oogdruppels tegen blindheid
- **Gepubliceerd:** 2026-09-09 16:28 · Health · OptimistDaily.com
- **Waar het over gaat:** Zou moeten gaan over foto-schakelbare oogdruppels
  tegen degeneratieve blindheid.
- **Waarom dit niet goed genoeg is:** Weer dezelfde melding: "verdere
  details… worden in de beschikbare bron niet vermeld" — te weinig inhoud
  om zeker te zijn.
- **Link:** https://www.optimistdaily.com/2026/09/a-simpler-path-to-treating-degenerative-blindness-photoswitchable-eye-drops/

#### Zes Boeken Die De Wereld Anders Laten Zien
- **Gepubliceerd:** 2026-09-09 16:35 · Lifestyle · Adventure-Journal.com
- **Waar het over gaat:** De vaste boekenrubriek "Recommended Reading"
  beveelt zes losstaande boeken aan over uiteenlopende onderwerpen.
- **Waarom dit niet goed genoeg is:** Al gemeld op 2026-09-10: een
  verzameleditie van zes losse titels, geen samenhangend bright-verhaal.
  Staat nog steeds live.
- **Link:** https://www.adventure-journal.com/recommended-reading-42/

#### Patroon

Drie afzonderlijke patronen springen eruit, en ze wijzen alle drie meer naar
de bronmix en de prompt dan naar losse missers:

1. **Squirrel-News.net publiceert vrijwel uitsluitend verzameledities.** Van
   de 19 artikelen die deze bron aanlevert in de onderzochte periode
   (2026-09-03 16:17 tot 2026-09-07 17:43), bundelen er 18 twee tot drie
   niet-verwante nieuwsitems onder één titel — vaak zelfs expliciet als
   "hoogtepunten" of "best of". Dat is zo goed als de hele output van deze
   bron. Het lijkt zinvoller om te overwegen deze bron structureel uit te
   sluiten dan te vertrouwen op beoordeling per item.
2. **OptimistDaily.com levert regelmatig artikelen met vrijwel lege
   brontekst.** Vijf keer in deze periode ("Managers en coaching", "Kiezen
   Van Een Vruchtbaarheidskliniek", "Australië trekt grens bij muziek",
   "Urinetest herkent blaaskanker thuis", "Oogdruppels tegen blindheid")
   bevat de opgehaalde bron zo weinig dat het artikel zelf meldt dat
   "verdere details… niet vermeld" worden. Dit lijkt geen
   beoordelingsprobleem maar een probleem bij het ophalen van de brontekst
   voor specifiek deze bron — de moeite waard voor Erik om los van de
   selectieprompt te bekijken. Dezelfde bron leverde daarnaast twee
   podcasttranscripten met niet-verwante items ("AI-muziek geweerd…",
   "Niger herstelt…").
3. **Weekoverzichten glippen er consistent doorheen, van verschillende
   bronnen.** Naast de bekende Squirrel-News-hoogtepunten troffen we ditmaal
   ook een weekoverzicht van Positive News ("…week-36-of-2026") en een van
   GoodGoodGood.co met een titel die vrijwel letterlijk het ijkvoorbeeld uit
   de afwijslijst citeert ("good news this week"). De afwijslijst dekt deze
   categorie dus wel, maar het model lijkt er in de praktijk niet naar te
   kijken zodra de inhoud zelf positief oogt — dezelfde conclusie als
   bevinding 1 hierboven, nu bevestigd op een volledige, actuele feed in
   plaats van het steekproefarchief van 2026-09-10.

Daarnaast: YesMagazine.org leverde in deze periode vijf artikelen, waarvan
er vier zijn afgekeurd — twee omdat ze over het medium zelf gaan in plaats
van over de wereld, en twee omdat de kern verzet of politiek is in plaats van
redding of herstel. Bij een bron met zo'n hoge afkeurratio is het de vraag of
het combineren van "oplossingsgerichte journalistiek" met "activistische
opiniestukken" bij deze bron BrightNews goed past.

#### Twijfelgevallen

#### Twijfelgeval: Braziliaanse geheimen voor een lang leven
- **Gepubliceerd:** 2026-09-03 09:11 · Lifestyle · Positive.News
- **Waar het over gaat:** Braziliaanse honderdplussers als voorbeeld van hoe
  een eenvoudige levensstijl kan bijdragen aan een lang leven.
- **Waarom ik twijfel:** Er zit een echt, menselijk verhaal in (de
  honderdplussers zelf), maar de laatste zin kantelt naar zelfhulp: "hun
  geheimen kunnen waardevolle lessen bieden voor een lang en gezond leven".
  Dat raakt de categorie "listicles en zelfhulp" zonder er een schoolvoorbeeld
  van te zijn — oordeel van Erik gewenst.
- **Link:** https://www.positive.news/society/what-brazils-supercentenarians-can-teach-us-about-living-to-120/

#### Twijfelgeval: Rivalen kiezen voor stemmachines in Libië
- **Gepubliceerd:** 2026-09-03 09:11 · Politics · GoodNewsNetwork.org
- **Waar het over gaat:** Strijdende Libische partijen tekenden een akkoord
  om verkiezingen te houden, na een zes jaar durende militaire patstelling.
- **Waarom ik twijfel:** De kern is verzoening na conflict, wat de kernregel
  juist als bright-materiaal aanmerkt. Maar het gaat wel over verkiezingen
  en een regering in een land in crisis — onmiskenbaar politiek onderwerp.
  Het systeem zelf plakte er als enige artikel in deze hele feed het label
  "Politics" op, wat aangeeft dat het ook door de pijplijn als grensgeval
  werd herkend. Ik zou het laten staan omdat de kern verzoening is, niet het
  conflict zelf — maar met twijfel.
- **Link:** https://www.goodnewsnetwork.org/belligerents-in-this-6-year-military-standoff-agree-to-swap-rifles-for-ballots/

#### Twijfelgeval: Zandstad groeit in Nevada
- **Gepubliceerd:** 2026-09-03 09:14 · Lifestyle · BusinessInsider.com
- **Waar het over gaat:** Satellietbeelden tonen hoe Black Rock City voor
  Burning Man 2026 in de woestijn van Nevada verrijst.
- **Waarom ik twijfel:** Een op zich neutraal, curieus feitenstuk (een
  tijdelijke stad die uit het niets verschijnt) zonder duidelijke
  maatschappelijke lading of een mens die geholpen wordt. Niet negatief,
  maar ook niet duidelijk "goed gevoel" — eerder een weetje dan een
  bright-verhaal.
- **Link:** https://www.businessinsider.com/satellite-images-show-burning-man-black-rock-city-taking-shape-2026-9

#### Twijfelgeval: Bankierskinderen leren van hun ouders over geld
- **Gepubliceerd:** 2026-09-03 09:14 · Finance · BusinessInsider.com
- **Waar het over gaat:** Een bankdirecteur en haar man vertellen hoe ze hun
  kinderen leerden sparen en omgaan met financiële risico's.
- **Waarom ik twijfel:** Er is een echt gezin in het verhaal, maar de
  strekking is vooral financieel advies voor ouders — grenst aan
  zelfhulp/lifestyle-tips zonder er een hard voorbeeld van te zijn.
- **Link:** https://www.businessinsider.com/teri-williams-oneunited-bank-kids-financial-literacy-2026-9

#### Twijfelgeval: Kleine A-frame woning met hutgevoel
- **Gepubliceerd:** 2026-09-03 09:15 · Lifestyle · Newatlas.com
- **Waar het over gaat:** Een compact A-frame tiny house zonder wielen,
  ontworpen voor een knus, huiselijk gevoel.
- **Waarom ik twijfel:** Dit is een woningontwerp-showcase, dicht bij
  productnieuws (vergelijkbaar met de campers die wel zijn afgekeurd), maar
  het is geen commercieel voertuig of gadget en mist een concrete koper of
  bewoner — geen hard ijkgeval, maar de gelijkenis met afgekeurde
  producten is groot genoeg voor twijfel.
- **Link:** https://newatlas.com/tiny-houses/brda-tiny-house-mini-domy/

#### Twijfelgeval: Stilte in het kantoor van de toekomst
- **Gepubliceerd:** 2026-09-03 09:15 · Tech · Newatlas.com
- **Waar het over gaat:** Speculatief stuk over kantoren waarin medewerkers
  straks fluisterend met hun computer communiceren via spraakherkenning.
- **Waarom ik twijfel:** Geen concreet product of bedrijf dat wordt
  gepromoot, maar ook geen mens die ergens mee geholpen wordt — een
  toekomstbespiegeling over kantoortechnologie zonder duidelijke
  maatschappelijke kern.
- **Link:** https://newatlas.com/ai-humanoids/ai-dictation/

#### Twijfelgeval: September 2026: hemelverschijnselen om naar uit te kijken
- **Gepubliceerd:** 2026-09-03 16:17 · Science · OptimistDaily.com
- **Waar het over gaat:** Overzicht van astronomische verschijnselen om in
  september 2026 naar uit te kijken: de Melkweg, Venus, de oogstmaan en het
  beginnende aurora-seizoen.
- **Waarom ik twijfel:** De URL noemt het zelf een "guide" — een gids/lijst
  van uiteenlopende hemelverschijnselen in één maand, wat dicht bij een
  listicle-formaat ligt. Tegelijk is het één samenhangend thema
  (astronomie) in plaats van news niet-verwante nieuwsverhalen, dus geen
  harde verzameleditie.
- **Link:** https://www.optimistdaily.com/2026/08/your-guide-to-septembers-best-night-sky-events-in-2026/

#### Twijfelgeval: Koel blijven bij hittegolven
- **Gepubliceerd:** 2026-09-03 16:19 · Environment · Squirrel-News.net
- **Waar het over gaat:** Algemeen stuk over manieren om steden en mensen
  koel te houden tijdens hittegolven, van groene gevels tot ondergrondse
  koelsystemen.
- **Waarom ik twijfel:** De URL noemt het zelf een "special edition" en het
  leest als een lijst van tips zonder één concreet verhaal of hoofdpersoon
  — dicht bij zelfhulp, maar anders dan de overige Squirrel-News-items in
  deze feed bundelt het geen los van elkaar staande nieuwsberichten.
- **Link:** https://squirrel-news.net/news/special-edition-keeping-cool-during-extreme-heat/

#### Twijfelgeval: Brief van hoop uit het Globale Zuiden
- **Gepubliceerd:** 2026-09-03 16:26 · Lifestyle · YesMagazine.org
- **Waar het over gaat:** Activisten en gemeenschapswerkers uit het Globale
  Zuiden sturen een boodschap van hoop naar de Verenigde Staten.
- **Waarom ik twijfel:** Warme, hoopvolle toon, maar geen concreet verhaal
  met feiten of gebeurtenissen — een opiniërende, activistische brief zonder
  duidelijke nieuwskern. Grenst aan "te weinig inhoud om zeker te zijn" én
  aan politiek gekleurd activisme, maar is geen hard geval van beide.
- **Link:** https://www.yesmagazine.org/political-power/2025/05/30/ferocious-hope-messages-global-south

#### Twijfelgeval: Recordaantal ERC-subsidies voor baanbrekend onderzoek
- **Gepubliceerd:** 2026-09-03 16:27 · Science · Openaccessgovernment.org
- **Waar het over gaat:** De Europese Onderzoeksraad ontving een
  recordaantal subsidieaanvragen voor 2026, met een uitsplitsing per
  vakgebied.
- **Waarom ik twijfel:** Droge beleids-/statistiekmelding van een
  EU-instelling zonder mensen of concreet verhaal — vergelijkbaar met het
  twijfelgeval "Nieuwe EU-wet" van 2026-09-10 (zie onder).
- **Link:** https://www.openaccessgovernment.org/erc-advanced-grants-2026-attract-3458-research-proposals/213846/

#### Twijfelgeval: EU trekt €105,5 miljoen uit voor onderzoekers
- **Gepubliceerd:** 2026-09-05 22:35 · Science · Openaccessgovernment.org
- **Waar het over gaat:** De Europese Commissie kent €105,5 miljoen toe aan
  29 onderzoeksprogramma's onder het Marie Skłodowska-Curie-programma.
- **Waarom ik twijfel:** Zelfde soort droge EU-financieringsmelding als de
  twee andere Openaccessgovernment-twijfelgevallen in dit blok — geen mens,
  geen verhaal, wel maatschappelijk relevant onderzoek.
- **Link:** https://www.openaccessgovernment.org/eu-announces-e105-5-million-boost-for-29-doctoral-and-postdoctoral-research-programmes/213893/

#### Twijfelgeval: Nieuwe EU-wet Steunt Europese Innovatie
- **Gepubliceerd:** 2026-09-09 16:32 · Tech · Openaccessgovernment.org
- **Waar het over gaat:** De Europese Commissie stelt een European
  Innovation Act voor om Europese start-ups te helpen groeien.
- **Waarom ik twijfel:** Al als twijfelgeval gelogd op 2026-09-10, hier
  opnieuw aangetroffen omdat de volledige feed is doorgelopen. Met dit blok
  erbij komt Openaccessgovernment.org op drie twijfelgevallen in dezelfde
  periode, telkens dezelfde soort droge beleidsaankondiging zonder
  menselijk verhaal — mogelijk een patroon voor deze bron specifiek, al is
  drie op zich nog geen hard bewijs.
- **Link:** https://www.openaccessgovernment.org/the-eu-has-a-new-european-innovation-act-to-help-european-ideas-compete-globally/214064/

#### Vervolg op de eerdere meldingen: de AI-pijplijn staat er nog steeds zo voor

Dit valt buiten de eigenlijke beoordelingsopdracht, maar sluit aan op de
meldingen van de afgelopen drie nachten. `data/last_run.json` toont dat de
meest recente geplande run (2026-09-13 16:02–16:04 UTC) opnieuw `"aiCalls":
0` en `"geaccepteerd": 0` gaf, tegenover 293 kandidaten en 22 opgehaalde
teksten — hetzelfde beeld als de drie voorgaande nachten. Ik heb de
workflowlogs zelf niet opnieuw nagelopen (dat viel al drie nachten op rij
buiten mijn opdracht en is al uitgebreid vastgelegd), maar het resultaat
bevestigt dat de storing op het moment van deze controle nog niet is
opgelost. Dat is meteen de verklaring waarom deze volledige controle geen
enkel artikel na 2026-09-10 04:22:12 aantrof: er is simpelweg niets nieuws
bijgekomen om te beoordelen, vol of niet.

### 2026-09-15, 04:12 Europe/Amsterdam

Beoordeeld: 18 artikelen, gepubliceerd tussen 2026-09-14 18:04 en 2026-09-14
18:22 — dit zijn de eerste nieuwe artikelen sinds de vorige ronde (de
volledige controle van 2026-09-14, die liep tot en met 2026-09-10 04:22:12).
Er stond nog één artikel tussen die twee ronden in gedateerd op 2026-09-10
04:22:12 zelf ("Prikvaccin beschermt mogelijk hart"); dat viel al binnen de
vorige, volledige controle en is dus niet opnieuw beoordeeld. Twee
dagoverzichten (`type: digest`) zijn overgeslagen. Niet bright-waardig: 2.
Twijfel: 2.

#### Colombia beschermt 42% Amazone
- **Gepubliceerd:** 2026-09-14 18:14 · Environment · OptimistDaily.com
- **Waar het over gaat:** Zou moeten gaan over de aftredende president van
  Colombia die 42% van het Colombiaanse Amazonegebied tegen mijnbouw heeft
  beschermd.
- **Waarom dit niet goed genoeg is:** De opgehaalde bron bevat vrijwel geen
  inhoud — de samenvatting meldt zelf letterlijk dat "verdere details over de
  aanpak, achtergronden of gevolgen... niet vermeld" worden. Dat is precies
  het geval "titel + tekst geven te weinig inhoud om zeker te zijn" uit de
  afwijslijst, en dezelfde OptimistDaily.com-tekortkoming die deze controle
  op 2026-09-14 al vijf keer eerder signaleerde.
- **Link:** https://www.optimistdaily.com/2026/09/how-colombias-outgoing-president-protected-42-of-the-countrys-amazon-from-mining/

#### Red De Planeet Met Engineering
- **Gepubliceerd:** 2026-09-14 18:20 · Environment · PBS.org
- **Waar het over gaat:** Zou moeten gaan over de rol die engineering kan
  spelen bij het redden van de planeet, naar aanleiding van een blogbericht
  van PBS Nature met als titel "Want to Save the Planet? Try Engineering."
- **Waarom dit niet goed genoeg is:** Ook hier is er vrijwel geen inhoud
  opgehaald — de samenvatting zegt zelf dat "verdere details... niet gegeven"
  worden. Daarnaast is de vraag-en-antwoordvorm van de titel zelf ("wil je de
  planeet redden? probeer engineering") een zelfhulp-achtige framing zonder
  concreet verhaal, mens of gebeurtenis. Dubbele reden voor afwijzing: te
  weinig inhoud én te dicht bij zelfhulp-clickbait.
- **Link:** https://www.pbs.org/wnet/nature/blog/save-the-planet-engineering/

#### Twijfelgeval: EU-missies liggen goed op koers voor 2030
- **Gepubliceerd:** 2026-09-14 18:19 · Environment · Openaccessgovernment.org
- **Waar het over gaat:** Een tussentijdse evaluatie van de Europese
  Commissie meldt dat de vijf grote Missions van de EU binnen Horizon Europe
  gestage vooruitgang boeken op maatschappelijke en milieu-uitdagingen.
- **Waarom ik twijfel:** Maatschappelijk relevant, maar een droge
  beleidsevaluatie zonder mens, gebeurtenis of concreet verhaal — dezelfde
  categorie als de drie eerdere Openaccessgovernment.org-twijfelgevallen die
  op 2026-09-14 al zijn gelogd. Met dit geval erbij komt die bron op vier
  twijfelgevallen van hetzelfde type in korte tijd.
- **Link:** https://www.openaccessgovernment.org/eu-missions-making-strong-progress-towards-2030-goals/214248/

#### Twijfelgeval: Geld Voor Opgraving Flag Fen
- **Gepubliceerd:** 2026-09-14 18:19 · Science · Openaccessgovernment.org
- **Waar het over gaat:** Het Britse ministerie DEFRA en Historic England
  kennen £700.000 subsidie toe voor een archeologische opgraving bij de
  bronstijdvindplaats Flag Fen, bij Peterborough.
- **Waarom ik twijfel:** Zelfde soort geval als hierboven: een droge
  financieringsmelding zonder mens of verhalend element, maar wel met een
  concreet maatschappelijk doel (archeologisch onderzoek). Vijfde
  twijfelgeval van dit type van deze bron.
- **Link:** https://www.openaccessgovernment.org/funding-secured-for-excavation-to-unlock-secrets-of-bronze-age-flag-fen-site/214226/

De overige 14 artikelen zijn ruim goedgekeurd, met een merkbaar bredere en
schonere bronmix dan in de vorige volledige controle: geen enkel artikel van
Squirrel-News.net of YesMagazine.org vannacht, de twee bronnen die op
2026-09-14 als grootste boosdoeners werden aangewezen. Zeven van de achttien
artikelen kwamen van GoodNewsNetwork.org, stuk voor stuk met een concreet
verhaal en een herkenbare hoofdpersoon (het meisje met haar knuffel Rosie, de
91-jarige die de Appalachian Trail voltooide, de Keniaanse ondernemer achter
de robothand voor dove kinderen) — geen van die verhalen gaf aanleiding tot
twijfel.

#### Vervolg op de eerdere meldingen: de AI-pipeline lijkt hersteld

Dit valt buiten de eigenlijke beoordelingsopdracht, maar sluit rechtstreeks
aan op de meldingen van de afgelopen vijf nachten over de stilgevallen
pipeline. `data/last_run.json` toont dat de geplande run van vannacht
(2026-09-14 18:00–18:20 UTC) voor het eerst sinds 2026-09-10 weer normale
cijfers laat zien: `"aiCalls": 119` en `"geaccepteerd": 18`, tegenover
`"aiCalls": 0` in alle vier de voorgaande metingen. Dat komt exact overeen
met de 18 nieuwe artikelen die deze controle vannacht aantrof. Voor zover ik
als controleur kan vaststellen, lijkt de storing dus opgelost — al kan ik de
onderliggende oorzaak (kredietbalans, Mistral-terugval-configuratie) niet
zelf verifiëren, dat blijft aan Erik.
