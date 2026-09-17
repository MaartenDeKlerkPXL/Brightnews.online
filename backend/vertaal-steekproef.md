# Steekproef op de vertalingen — 2026-09-10

Vijf artikelen, alle vier de vertaalde talen ernaast gelegd tegen het
Nederlandse origineel: Engels, Duits, Frans en Spaans. Twintig vergelijkingen
in totaal. Daarnaast zijn een paar patronen over alle 150 artikelen in de feed
gemeten, zodat duidelijk is wat incidenteel is en wat structureel.

De vijf zijn met opzet verschillend van tekstsoort: een medisch bericht, een
reddingsverhaal, een dagoverzicht, een menselijk verhaal en een wetenschappelijk
stuk met eigennamen en getallen.

## Kort: wat goed gaat

- **Geen inkorting.** De vertaalde samenvattingen zijn gemiddeld 0,91× (en) tot
  1,02× (de) de lengte van het Nederlands. Er wordt niets weggelaten.
- **Geen Nederlandse resten.** Over 150 artikelen × 4 talen geen enkele
  achtergebleven Nederlandse formulering aangetroffen.
- **De bronnenlijst blijft heel.** Alle negen dagoverzichten hebben in alle vijf
  talen evenveel bronnen in het `refs`-veld.
- **Feiten, namen, plaatsen en getallen** klopten in alle twintig vergelijkingen.
  Geen verzonnen cijfers, geen omgedraaide betekenissen.

Het gaat dus niet mis in de grote lijn. Wat er misgaat, zit in de details — en
juist die maken het verschil tussen "vertaald" en "geschreven door iemand die
de taal spreekt".

## Wat er misgaat

### 1. Verkeerd geslacht (Duits en Spaans) — ernstigst

Dagoverzicht *"Gezondheidsnieuws deze week"*. Het Nederlands zegt: "iemand die
**haar** droom waarmaakte in de sportschool". Het gaat om een vrouw.

- **Duits** spreekt zichzelf tegen binnen één artikel: de kop zegt
  "neuen Fitness**trainerin**" (vrouwelijk), de tekst zegt "jemanden, der
  **seinen** Traum … verwirklicht hat" (zijn droom).
- **Spaans** maakt er in de kop "nuevo instructor de fitness" van — mannelijk.

Dit is het type fout dat een lezer meteen opvalt en dat slordig oogt.

### 2. Nederlands woord letterlijk vertaald (Spaans)

Kop *"Prikvaccin beschermt mogelijk hart"*, over het gordelroosvaccin Shingrix.

- Engels: "Shingles vaccine may protect heart" — benoemt het vaccin.
- Frans: "Le vaccin antizona protège peut-être le cœur" — idem.
- **Spaans: "Vacuna inyectable protege posiblemente el corazón"** — "injecteerbaar
  vaccin". Dat zegt niets; zo goed als elk vaccin is injecteerbaar.

Let op waar dit vandaan komt: de **Nederlandse kop is zelf al vaag**. Engels en
Frans hebben dat stilzwijgend gerepareerd, Spaans heeft de vaagheid letterlijk
vertaald. De oorzaak zit dus deels bij de schrijfstap, niet alleen bij de
vertaalstap.

### 3. Eigennamen worden vertaald (Spaans)

*"Nebraska Humane Society Animal Control"* werd in het Spaans "el Control de
Animales de la Sociedad Humanitaria de Nebraska". Duits en Frans lieten de naam
staan. Namen van organisaties horen onvertaald te blijven; bovendien is
"Sociedad Humanitaria" een valse vriend voor "Humane Society".

### 4. Feit toegevoegd dat er niet stond (Spaans)

*"voormalige loodgieter"* werd "un fontanero **jubilado**" — een gepensioneerde
loodgieter. Voormalig betekent niet gepensioneerd. Klein, maar het is een detail
dat in het origineel niet staat.

### 5. Titels met een hoofdletter op elk woord (Frans en Spaans)

19% van de Nederlandse koppen gebruikt Hoofdletters Op Elk Woord. Die stijl
wordt meevertaald: Frans 17%, Spaans 19%. In beide talen is dat geen correcte
typografie — die gebruiken gewone zinsstijl. *"Ex-Plombier Construit un Musée
Rempli de Trésors Échoués"* hoort *"Ex-plombier construit un musée rempli de
trésors échoués"* te zijn.

(Duits is hier niet te meten: daar krijgt elk zelfstandig naamwoord sowieso een
hoofdletter. Wel viel in het Duits op: *"165 Millionen Jahre **Alte**
Insektenlaut"* — "Alte" hoort klein, en "Insektenlaut" hoort meervoud te zijn:
"Insektenlaute".)

### 6. Soortnamen inconsistent (Duits)

De *cave myotis* uit het vleermuisverhaal werd in het Duits de algemene
"Höhlenfledermaus", waarmee de soort verdwijnt. Engels, Frans en Spaans hielden
de soortnaam wel aan ("myotis des cavernes", "myotis de cueva").

### 7. Bronverwijzingen vallen soms weg (Frans en Spaans)

In de dagoverzichten staan verwijzingen als `[1]` die naar de bronnenlijst
wijzen. Twee dagoverzichten verloren die in het Frans, één in het Spaans.

Nuance: het Nederlands gebruikt zelf maar één verwijzing per dagoverzicht,
terwijl er drie tot vijf bronnen onder staan. Het grootste probleem zit dus bij
de schrijfstap; de vertaalstap maakt het alleen erger.

## Het patroon

**Spaans is duidelijk de zwakste van de vier.** Vier van de zeven bevindingen
zijn Spaans-only: het letterlijk vertaalde vaccin, de vertaalde organisatienaam,
het toegevoegde "gepensioneerd" en het verkeerde geslacht. Duits heeft één
interne tegenspraak en één grammaticafout. Frans en Engels waren in deze
steekproef schoon, op de titelstijl na.

Het tweede patroon is belangrijker: **een vaag of slordig Nederlands origineel
wordt in vier talen vermenigvuldigd.** De vage kop "Prikvaccin" leverde één
onbruikbare Spaanse kop op; de spaarzame bronverwijzingen worden in de vertaling
nog spaarzamer. Verbeteren aan de schrijfkant werkt dus vier keer door.

## Voorstellen voor de vertaalprompt

Alle zes klein, en geen ervan is doorgevoerd — dit is materiaal voor Erik:

1. **Neem het geslacht over uit het origineel.** Staat er "haar", dan is het een
   vrouw; laat de kop en de tekst elkaar niet tegenspreken.
2. **Vertaal eigennamen niet.** Organisaties, instellingen, merken en
   museumnamen blijven staan zoals ze zijn.
3. **Voeg niets toe.** Geen "gepensioneerd" waar "voormalig" staat.
4. **Gebruik de titelconventie van de doeltaal.** Frans en Spaans: gewone
   zinsstijl, geen hoofdletter op elk woord.
5. **Houd soort-, merk- en productnamen aan** zoals in het origineel; maak er
   geen algemene aanduiding van.
6. **Neem verwijzingen als `[1]` altijd mee**; ze horen bij de bronnenlijst.

En één voor de schrijfstap: **maak de Nederlandse kop specifiek.** "Prikvaccin"
had "Gordelroosvaccin" moeten zijn. Wat daar vaag is, wordt vier keer vaag.

## Aanbevolen vervolg

De nachtelijke controle draait toch al langs de verse artikelen. Die kan er per
nacht één vertaald artikel bij nemen en in hetzelfde document loggen. Dan bouw
je in een maand een beeld op over alle vier de talen, zonder er zelf tijd in te
steken — en zie je meteen of een aangepaste vertaalprompt echt helpt.

## Voorbehoud

Vijf artikelen is een steekproef, geen bewijs. De metingen over alle 150
artikelen (lengte, Nederlandse resten, bronnenlijsten, titelstijl) gelden wel
voor de hele feed. De taalkundige oordelen over Duits, Frans en Spaans zijn van
één lezer; laat ze bevestigen door iemand die de taal als moedertaal spreekt
voordat er conclusies aan worden verbonden die geld of tijd kosten.

---

# Nachtelijke steekproeven

Vanaf 2026-09-11 kijkt de nachtelijke controle elke nacht één vertaald artikel
na, in een taal die per dag van de week rouleert. Duits en Spaans komen twee
keer per week aan bod, omdat die in de steekproef hierboven de meeste problemen
gaven. De opdracht staat in `backend/nachtelijke-beoordeling-prompt.md`, stap 6.

Blokken worden alleen toegevoegd, nooit herschreven. Zo is over een paar weken
te zien of het aantal bevindingen daalt nadat de vertaalprompt is bijgesteld —
en of het per taal verschilt.

### 2026-09-11, Engels

Vandaag is het vrijdag, dus zou Engels aan de beurt zijn geweest. Er was
echter geen nieuw artikel om te controleren: sinds de vorige beoordeling (tot
en met 2026-09-10 04:22) zijn er geen artikelen aan `data/news_nl.json`
toegevoegd. Zie de toelichting van vannacht in
`backend/selectie-prompt-analyse.md` voor de vermoedelijke oorzaak — de
AI-pijplijn lijkt te haperen op een lege Anthropic-kredietbalans. Deze
steekproef is dus overgeslagen.

### 2026-09-12, Duits

Vandaag is het zaterdag, dus zou Duits aan de beurt zijn geweest. Ook nu was
er geen nieuw artikel om te controleren: sinds de vorige beoordeling (tot en
met 2026-09-10 04:22:12) zijn er nog steeds geen artikelen aan
`data/news_nl.json` toegevoegd. Zie de toelichting van vannacht in
`backend/selectie-prompt-analyse.md` — de storing in de AI-pijplijn loopt nu
over twee etmalen door. Deze steekproef is dus opnieuw overgeslagen.

### 2026-09-13, Spaans

Vandaag is het zondag, dus zou Spaans aan de beurt zijn geweest. Ook nu was
er geen nieuw artikel om te controleren: sinds de vorige beoordeling (tot en
met 2026-09-10 04:22:12) zijn er nog steeds geen artikelen aan
`data/news_nl.json` toegevoegd. Zie de toelichting van vannacht in
`backend/selectie-prompt-analyse.md` — de storing in de AI-pijplijn duurt nu
drie etmalen en de geplande run van vannacht 00:00 UTC is zelfs helemaal niet
gestart. Deze steekproef is dus voor de derde keer op rij overgeslagen.

### 2026-09-14, Engels

Vandaag is het maandag, dus is Engels aan de beurt. Er zijn nog steeds geen
nieuwe artikelen aan `data/news_nl.json` toegevoegd sinds 2026-09-10
04:22:12 — de AI-pijplijn ligt nog steeds stil, zie
`backend/selectie-prompt-analyse.md`. Omdat vannacht wel de volledige feed is
doorgelopen (vandaag is het maandag, dus stap 2 van de opdracht schrijft een
volledige controle voor in plaats van alleen het nieuwe deel), was er dit
keer wél een groep om uit te kiezen: het eerste artikel uit die volledige
controle dat zowel in `data/news_nl.json` als in `data/news_en.json`
voorkomt.

**Artikel:** HP start accelerator in Azië voor AI-tijdperk
**Oordeel:** niets aangetroffen.

De Nederlandse en Engelse tekst komen zin voor zin overeen: geen toegevoegde
feiten, geen weggelaten details. Eigennamen (HP, Garage 2.0, Singapore) staan
in beide talen ongewijzigd. Er komen geen geslachtsverwijzingen in voor, dus
dat punt is hier niet te toetsen. De Engelse titel ("HP launches startup
accelerator in Asia for AI era") gebruikt normale zinsstijl, geen
titelhoofdlettergebruik. Ook de `meta_description` en `image_alt` komen in
beide talen overeen, en de statische Engelse artikelpagina bevat dezelfde
tekst als de `summary` in `data/news_en.json` — geen afwijking tussen het
artikel zelf en de feeddata.

Dit is een kort, feitelijk artikel zonder mensen of verhalende elementen, dus
het is een beperkte test: fouten in geslacht, toon of verhaallijn komen hier
niet aan het licht. Het bevestigt vooral dat namen en cijfers correct
overkomen.

### 2026-09-15, Duits

Vandaag is het dinsdag, dus is Duits aan de beurt. De AI-pipeline is
vannacht voor het eerst sinds 2026-09-10 weer artikelen gaan aanleveren (zie
de bevinding van vanavond in `backend/selectie-prompt-analyse.md`), dus was
er nu wél een frisse groep om uit te kiezen. Gepakt: het eerste artikel uit
de groep van vannacht dat zowel in `data/news_nl.json` als in
`data/news_de.json` voorkomt.

**Artikel:** Heel Zuidoost-Azië Nu Vrij Van Trachoom
**Oordeel:** één kleine bevinding.

- **Onvertaald woord in de metadata:** het veld `meta_keywords` van de
  Duitse versie bevat het woord "Volksgezondheid" — dat is gewoon het
  Nederlandse woord, onvertaald overgenomen, terwijl de rest van diezelfde
  komma-lijst wél is vertaald ("Trachom, WHO, Timor-Leste, Südostasien,
  Blindheit, Volksgezondheid, Krankheitseliminierung"). Het juiste Duitse
  woord is "Volksgesundheit". Dit staat niet in de zichtbare paginatekst of
  in de `<meta name="keywords">`-tag zelf (die wordt niet gerenderd op de
  statische pagina), maar wel in de brondata, dus het kan ergens anders in
  de site nog opduiken.

Verder komen de Nederlandse en Duitse samenvatting zin voor zin overeen,
geen toegevoegde of weggelaten feiten. Eigennamen (WHO, Timor-Leste) blijven
in beide talen onvertaald staan. Er komen geen geslachtsverwijzingen in het
artikel voor, dus dat punt is hier niet te toetsen. De titel
("Ganz Südostasien Jetzt Trachomfrei") capitaliseert ieder woord, maar dat is
consistent met wat deze steekproef eerder al vaststelde: het Duits
capitaliseert sowieso alle zelfstandige naamwoorden, dus dat is hier geen
afwijking. `meta_description` komt tussen beide talen inhoudelijk overeen, en
de statische Duitse artikelpagina bevat dezelfde (afgekapte) tekst als de
`summary` in `data/news_de.json` — geen afwijking tussen het artikel zelf en
de feeddata, op de metadata-kwestie hierboven na.

### 2026-09-16, Frans

Vandaag is het woensdag, dus is Frans aan de beurt. Gepakt: het eerste
artikel uit de groep van vannacht (zie `backend/selectie-prompt-analyse.md`)
dat zowel in `data/news_nl.json` als in `data/news_fr.json` voorkomt.

**Artikel:** Eerst een Huis, Dan Herstel / D'abord un Logement, Puis la
Guérison
**Oordeel:** twee bevindingen, geen ervan ernstig.

- **Titelstijl:** "D'abord un Logement, Puis la Guérison" gebruikt een
  hoofdletter op elk woord ("Logement", "Puis", "Guérison"); het Frans hoort
  hier gewone zinsstijl te gebruiken: "D'abord un logement, puis la
  guérison." Dezelfde afwijking die deze steekproef al eerder vaststelde.
- **Preview valt eerder stil dan in het Nederlands.** Dit artikel zit achter
  de premium-paywall en toont bewust maar een deel van de tekst, afgesloten
  met "...". Dat is normaal gedrag, geen fout. Wat wél opvalt: de afkap lijkt
  op een vast aantal tekens te zitten, niet op een vast aantal zinnen. Het
  Nederlands rondt de zin over de zorgkosten nog af ("...terwijl de
  zorgkosten door de charity worden gedekt.") en begint aan een nieuwe zin
  ("Sinds hij een vaste woning heeft,...") voor de afkap. Het Frans kapt af
  ván diezelfde zin, vóór die klaar is: "...tandis que les frais de soutien
  sont..." Een Franse lezer krijgt in de gratis preview dus niet te lezen dát
  de zorgkosten door de liefdadigheidsinstelling worden gedekt, terwijl een
  Nederlandse (en Engelse) lezer dat feit wel al ziet voor de inlogmuur
  verschijnt. Het Duits kwam in deze vergelijking juist verder dan het
  Nederlands. Vermoedelijke oorzaak: de afkap gebeurt op een vast aantal
  tekens per taal, en Frans (en vermoedelijk Spaans, met een vergelijkbare
  woordlengte) verliest daardoor relatief meer inhoud dan Nederlands, Engels
  of Duits. Dit is geen vertaalfout in de gebruikelijke zin — de vertaalde
  tekst zelf klopt — maar wel een verschil in hoeveel feitelijke inhoud
  lezers per taal gratis te zien krijgen.

Verder klopt de vertaling inhoudelijk: geen toegevoegde of weggelaten feiten
binnen het vertaalde stuk zelf, eigennamen ("The Connection", "Solo Homes")
blijven onvertaald, "Londen" wordt correct "Londres" (de gangbare Franse
naam, geen fout). Er komen geen geslachtsverwijzingen voor in het zichtbare
fragment, dus dat punt is hier niet te toetsen. `meta_keywords` en
`meta_description` komen inhoudelijk overeen met het Nederlands, zonder
toegevoegde of vertaalde eigennamen. De lopende tekst zelf leest natuurlijk,
op de titelstijl na.

### 2026-09-17, Spaans

Vandaag is het donderdag, dus is Spaans aan de beurt. Gepakt: het eerste
artikel uit de groep van vannacht (zie `backend/selectie-prompt-analyse.md`)
dat zowel in `data/news_nl.json` als in `data/news_es.json` voorkomt.

**Artikel:** Christian Bale Opent Pleegzorgdorp Voor Gezinnen / Christian
Bale Abre Pueblo de Acogida Para Familias
**Oordeel:** twee bevindingen, geen ervan ernstig.

- **Titelstijl.** "Christian Bale Abre Pueblo de Acogida Para Familias"
  gebruikt een hoofdletter op elk woord ("Abre", "Pueblo", "Acogida",
  "Para", "Familias"); het Spaans hoort hier gewone zinsstijl te gebruiken,
  bijvoorbeeld "Christian Bale abre pueblo de acogida para familias".
  Dezelfde afwijking die deze steekproef al bij het Frans vaststelde
  (2026-09-16), nu ook bij het Spaans.
- **Preview valt eerder stil dan in het Nederlands.** Dit is een
  premium-artikel; zowel de Nederlandse als de Spaanse versie tonen alleen
  het samenvattingsfragment uit de betreffende `data/news_<taal>.json`,
  afgesloten met "...". Het Nederlands komt tot "De Austrian American
  Council West haalde ruim 9..." — bijna een hele zin. Het Spaans stopt na
  "El Austrian..." — nog voor de naam van de organisatie compleet is. Een
  Spaanse lezer ziet in de gratis preview dus aanzienlijk minder van het
  verhaal dan een Nederlandse lezer, ook al is de vertaalde tekst zelf
  correct voor zover zichtbaar. Dit is exact het patroon dat de steekproef
  van 2026-09-16 al vermoedde voor het Spaans ("vermoedelijk Spaans, met een
  vergelijkbare woordlengte, verliest daardoor relatief meer inhoud dan
  Nederlands") — hier bevestigd met een concreet voorbeeld.

Voor het overige klopt de vertaling: de cijfers (12 woningen, 4,67 hectare,
aangekocht in 2022) komen overeen met het Nederlands, geen toegevoegde of
weggelaten feiten binnen het zichtbare fragment, eigennamen ("Together
California", "Palmdale, California", "Austrian American Council West")
blijven onvertaald. Er komen geen geslachtsverwijzingen voor in het
zichtbare fragment. `meta_description` en `meta_keywords` komen inhoudelijk
overeen met het Nederlands, met "pleegzorg" correct vertaald naar "acogida"
zonder dat dit een eigennaam raakt.
