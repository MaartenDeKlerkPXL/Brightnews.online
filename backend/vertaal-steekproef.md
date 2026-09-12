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
