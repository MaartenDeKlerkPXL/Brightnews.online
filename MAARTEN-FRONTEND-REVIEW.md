# Front-end-review voor Maarten — 2026-09-05

Frisse review van de live site (desktop + mobiel), na de livegang van Stripe.
Gesorteerd op impact. Punten 1–4 raken conversie/eerste indruk; de rest is
polijstwerk. Technische randvoorwaarden staan in `CLAUDE.md`.

## Hoge prioriteit
3. **"€0 vandaag" bij de trial benadrukken** — de regel "Eerste 30 dagen
   gratis" staat er; maak van de proefperiode het hoofdargument (badge op de
   kaart + microcopy onder de knop: "Vandaag €0 — opzegbaar tijdens de
   proefperiode").
4. **Homepage rendert alle 150 kaarten in één keer.** Voeg paginering of een
   "Laad meer"-knop toe (bijv. 24 per keer). Scheelt laadtijd en scrollmoeheid;
   Lighthouse-performance (79) knapt hiervan op.

## Middenprioriteit
5. **Meldingen-consistentie**: alles hoort via de groene/rode
   `showNotification()`-toast te lopen. De welkom-/foutteksten in
   `js/auth.js` (`Welkom ${name}!` e.d.) zijn nu hardcoded Nederlands —
   omzetten naar vertaalkeys (5 talen) zodat ook Engelse gebruikers nette
   meldingen zien. Browservalidatie-bubbels (lege velden) zijn browsereigen;
   acceptabel, maar te vervangen door eigen inline-validatie.
6. **Deel-previews controleren**: check of artikelpagina's bij delen op
   WhatsApp/LinkedIn de artikelfoto tonen (og:image per artikel) en niet het
   logo. Zo niet: og:image in het artikeltemplate vullen met de artikelfoto.
7. **Taalkiezer mobiel**: de pill is groot t.o.v. de navigatiebalk; overweeg
   alleen de vlag/ISO-code op smalle schermen.
8. **Laadskeletten** voor de nieuwskaarten (grijze placeholder-blokken) in
   plaats van een lege pagina tijdens het laden van de JSON.

## Nieuw gevonden (2026-09-05, nog te beslissen)
13. **`showNotification()` doet niets op 8 van de 10 pagina's.** De functie
    schrijft in `#notification-container`, maar dat element staat alleen in
    `profiel.html` en `wachtwoord-vergeten.html`. Op o.a. `abonnementen.html`
    verdwijnen álle meldingen geruisloos — ook "Log eerst in om een
    abonnement af te sluiten" vlak vóór de redirect naar registreren. Raakt
    de betaalflow, dus overleggen met Erik voor het gefixt wordt.

## Laag / bewuste keuzes om te herbezien
9. **Witte tekst op #32CD32** haalt formeel geen WCAG AA (2,1:1). Bewust
   eigenaarsbesluit, maar bij een volgende designronde: donkere tekst op
   groen, of een donkerder groen voor knoppen.
10. **263 archief-artikelpagina's** hebben nog het oude template (bewust:
    nooit verwijderen). Eén keer bewust regenereren zou alles uniform maken —
    overleg met Erik (brondata is er).
11. **Footer-socials**: LinkedIn is geclaimd en de link staat er sinds
    2026-09-05 in. Facebook en Instagram wijzen nog naar niet-bestaande
    profielen — claimen of die twee iconen tijdelijk weghalen.
12. **Sparkle-kaart (gratis plan)** heeft geen knop; een "Blijf gratis
    lezen"-knop naar de homepage maakt de keuze compleet.

## Zojuist al gefixt (niet meer nodig)
- **Punt 1 — cookiebanner** (2026-09-05): zwevend kaartje vervangen door een
  compacte onderbalk. Mobiel 200px → 107px hoog (24% → 13% van het scherm),
  desktop 59px. Titel verdwijnt op mobiel, knoppen naast elkaar.
- **Punt 2 — herroepingsrecht-vinkje** (2026-09-05): staat nu ín de Glow- en
  Shine-kaart, direct boven de knop (één vinkje per plan, eigen id).
  Klikken zonder vinkje markeert het bijbehorende vakje rood en zet de focus
  erop. De gratis Sparkle-kaart heeft bewust geen vinkje.
- **Logo** (2026-09-05): nav-logo op 45px hoogte, desktop én mobiel. Meteen
  ook de foute `height="200" width="300"`-attributen op 9 pagina's naar de
  echte 463×94 gezet (die reserveerden de verkeerde ruimte).
- Titel die over de header schoof (sticky-bug door `overflow-x: hidden` op
  body) — opgelost; hard-refresh nodig om het te zien.
- Dubbele foto's op één pagina — render-deduplicatie actief.
- Logo-formaat, checkout-knoppen-UX, naamplaceholder, wachtwoord-suggestie
  van Chrome, registratie-eerst voor nieuwe kopers.
