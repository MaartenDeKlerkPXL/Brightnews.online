# Logboek reservefoto's

De nachtelijke controle draait elke nacht `node backend/controleer-reservefotos.js`
en schrijft hier **alleen** iets op als er iets verandert. Blijft het stil, dan
is er niets aan de hand — dit is een rookmelder, geen dagboek.

Waar het over gaat: een artikel zonder eigen foto, of met een foto die al bij
een ander artikel op de pagina staat, krijgt een reservefoto uit
`assets/fallback/`, bij voorkeur uit zijn eigen categorie. Zijn er in een
categorie meer artikelen die er een nodig hebben dan er foto's zijn, dan leent
de site er een uit een andere categorie — een wetenschapsartikel met een
gezondheidsfoto erboven. Is werkelijk alles op, dan komt dezelfde foto twee
keer op de pagina, en dán ziet een bezoeker het.

Het loopt langzaam op, en dat is precies waarom het gemeten wordt: op
2026-09-10 waren er 14 reservefoto's nodig, tien dagen later 26. Bronnen
sturen steeds vaker dezelfde foto mee voor meerdere artikelen.

**Aanvullen doe je zo:** foto's neerzetten in `assets/fallback/` als
`<categorie>-<nummer>.jpg`, doorgenummerd vanaf het laatste bestaande nummer
en zonder gaten in de reeks, en daarna het getal voor die categorie in
`RESERVE_PER_CATEGORIE` in `index.js` mee ophogen. Zonder dat tweede stapje
blijven de nieuwe foto's ongebruikt liggen — het script waarschuwt daarvoor.

---

## 2026-09-20 — nulmeting

Eerste meting, vastgelegd als vertrekpunt. Staat ook als punt 28 op `TODO.md`.

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 5 | 7 | 2 |
| Finance | 4 | 0 | — |
| Health | 5 | 3 | — |
| Lifestyle | 4 | 6 | 2 |
| Science | 4 | 8 | 4 |
| Tech | 4 | 2 | — |

Totaal: 26 nodig, 26 beschikbaar. Er komt dus nog geen foto dubbel op de
pagina, maar acht artikelen krijgen er een uit een andere categorie. Het
knelt bij Science, Lifestyle en Environment — steeds dezelfde drie, bij elke
meting van de afgelopen tien dagen.

Gevraagd aan Maarten: vier à vijf foto's extra per knelcategorie, dus
ongeveer vijftien stuks. Liggend, ongeveer 1400px breed, rechtenvrij.

---

## 2026-09-20 — aangevuld, tekort weg

Zestien foto's toegevoegd van Pexels (gratis voor commercieel gebruik, geen
naamsvermelding nodig): zeven bij Science, vier bij Lifestyle, vijf bij
Environment. `RESERVE_PER_CATEGORIE` in `index.js` mee opgehoogd naar 11, 8
en 10.

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 7 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 3 | — |
| Lifestyle | 8 | 6 | — |
| Science | 11 | 8 | — |
| Tech | 4 | 2 | — |

Totaal: 26 nodig, 42 beschikbaar.

Nagemeten in de browser op de volledige lijst van 150 kaarten: **28
reservefoto's in gebruik, alle 28 uit de eigen categorie van het artikel, en
geen enkele dubbel.** Vóór het aanvullen werden er acht uit een andere
categorie geleend.

Bij de keuze is gelet op onderwerp, niet alleen op aantal. Science bestond
uit vier laboratoriumbeelden en heeft er nu sterrenkunde, ruimtevaart,
veldwerk en onderwijs bij. Environment bestond uit symbolen (kamerplanten,
masten, afvalbakken) en heeft er nu bos, een bij, een hert, een zeeschildpad
en windmolens bij. Lifestyle was vooral eten en fitness en heeft er nu
mensen bij.

Later diezelfde dag kwam `lifestyle-9.jpg` erbij: de gelicentieerde
Adobe-foto (id `1986278256`, hond en kat op de bank) die Maarten zelf heeft
gedownload. Van 4992px teruggeschaald naar 1400px, Lifestyle in
`RESERVE_PER_CATEGORIE` van 8 naar 9. Daarmee staat de teller op **43
reservefoto's** bij 26 nodig.

## Nachtelijke meldingen

### 2026-09-29

Reservefoto's op 2026-09-29 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 11 | 1 |
| Finance | 4 | 0 | — |
| Health | 5 | 3 | — |
| Lifestyle | 9 | 7 | — |
| Science | 11 | 6 | — |
| Tech | 4 | 0 | — |

Totaal: 27 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 1 foto's. Dat valt nog niet op.

### 2026-09-30

Reservefoto's op 2026-09-30 — 149 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 11 | 1 |
| Finance | 4 | 0 | — |
| Health | 5 | 2 | — |
| Lifestyle | 9 | 6 | — |
| Science | 11 | 6 | — |
| Tech | 4 | 0 | — |

Totaal: 25 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 1 foto's. Dat valt nog niet op.

### 2026-10-01

Reservefoto's op 2026-10-01 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 12 | 2 |
| Finance | 4 | 0 | — |
| Health | 5 | 2 | — |
| Lifestyle | 9 | 7 | — |
| Science | 11 | 5 | — |
| Tech | 4 | 0 | — |

Totaal: 26 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 2 foto's. Knelt bij Environment (2).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-10-02

Reservefoto's op 2026-10-02 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 13 | 3 |
| Finance | 4 | 0 | — |
| Health | 5 | 2 | — |
| Lifestyle | 9 | 6 | — |
| Science | 11 | 6 | — |
| Tech | 4 | 0 | — |

Totaal: 27 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 3 foto's. Knelt bij Environment (3).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-17

Reservefoto's op 2026-11-17 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 7 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 2 | — |
| Lifestyle | 9 | 12 | 3 |
| Science | 11 | 7 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 1 | 1 |

Totaal: 29 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 4 foto's. Knelt bij Lifestyle (3).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-19

Reservefoto's op 2026-11-19 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 7 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 2 | — |
| Lifestyle | 9 | 11 | 2 |
| Science | 11 | 7 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 2 | 2 |

Totaal: 29 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 4 foto's. Knelt bij Lifestyle (2), onbekend (2).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-20

Reservefoto's op 2026-11-20 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 6 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 10 | 1 |
| Science | 11 | 3 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 3 | 3 |

Totaal: 23 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 4 foto's. Knelt bij onbekend (3).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-21

Reservefoto's op 2026-11-21 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 6 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 9 | — |
| Science | 11 | 1 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 4 | 4 |

Totaal: 21 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 4 foto's. Knelt bij onbekend (4).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-22

Reservefoto's op 2026-11-22 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 6 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 8 | — |
| Science | 11 | 1 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 4 | 4 |

Totaal: 20 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 4 foto's. Knelt bij onbekend (4).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-23

Reservefoto's op 2026-11-23 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 6 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 8 | — |
| Science | 11 | 1 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 6 | 6 |

Totaal: 22 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 6 foto's. Knelt bij onbekend (6).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-24

Reservefoto's op 2026-11-24 — 149 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 5 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 7 | — |
| Science | 11 | 0 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 7 | 7 |

Totaal: 20 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 7 foto's. Knelt bij onbekend (7).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-25

Reservefoto's op 2026-11-25 — 150 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 3 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 6 | — |
| Science | 11 | 0 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 8 | 8 |

Totaal: 18 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 8 foto's. Knelt bij onbekend (8).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.

### 2026-11-26

Reservefoto's op 2026-11-26 — 149 artikelen op de homepage

| Categorie | Beschikbaar | Nodig | Tekort |
|---|---|---|---|
| Environment | 10 | 2 | — |
| Finance | 4 | 0 | — |
| Health | 5 | 1 | — |
| Lifestyle | 9 | 4 | — |
| Science | 11 | 0 | — |
| Tech | 4 | 0 | — |
| onbekend | 0 | 9 | 9 |

Totaal: 16 nodig, 43 beschikbaar.
Geleend uit een andere categorie: 9 foto's. Knelt bij onbekend (9).
Aanvullen in `assets/fallback/` als `<categorie>-<nummer>.jpg`, en daarna het getal in `RESERVE_PER_CATEGORIE` in `index.js` mee ophogen.
