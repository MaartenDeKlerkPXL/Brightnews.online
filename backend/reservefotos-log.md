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
