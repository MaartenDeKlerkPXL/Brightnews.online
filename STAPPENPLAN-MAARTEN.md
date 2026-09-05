# Stappenplan voor Maarten — Google Search Console & Stripe

---

## ✅ Spoor 0 — Anthropic-account: AFGEROND (2026-09-05, 23:46)

Key staat als secret, de nieuwe Claude-pipeline is gemerged en draait: de
eerste twee runs publiceerden 32 artikelen en de selectie is samen met Erik
geijkt (drempel nu 8). Je hoeft hier niets meer te doen.

**Wat je nu wél kunt doen (in deze volgorde):**
1. **Bekijk de site** via de teamlink op brightnews.online (knop
   "Teamtoegang" op de parkeerpagina) — de nieuwe artikelen staan erop, en
   vanaf de nachtrun verschijnen de eerste **dagoverzichten** per categorie
   (badge "Dagoverzicht", met bronnenlijst). Feedback welkom, zeker op de
   digest-toon: die stel je bij in `backend/digest-prompt.md`.
2. **Socials claimen** (stond al op je lijst): de handles
   facebook/instagram.com/brightnews.online en
   linkedin.com/company/brightnews-online — nodig vóór de marketing-agent
   gebouwd wordt. Zie `MARKETING-PLAN.md` voor het hele plan.
3. **Front-end-lijst**: `MAARTEN-FRONTEND-REVIEW.md` — alles daarin kan
   gewoon, de site is toch geparkeerd. Let op de werkafspraken in
   `CLAUDE.md` (o.a. de parkeer-gate in index.html laten staan).
4. **Claude-abonnement** voor jezelf: overleg met Erik welk plan past
   (telt mee in de break-even-som).
5. **Mistral** heb je niet meer nodig — account mag blijven of weg,
   niets van de site hangt er nog aan.

## (was) Spoor 0 — Anthropic-account (2026-09-05, ±15 min)

De site is tijdelijk geparkeerd (publiek ziet `binnenkort.html`; teamtoegang
via de link op die pagina). We zijn overgestapt van Mistral naar Claude
(besluit met Erik, 2026-09-05); de nieuwe pipeline staat klaar maar draait
pas als jouw key er is. **Mistral heb je niet meer nodig** — pay-as-you-go
hoeft níét meer aan; het account mag blijven bestaan of weg.

1. **Account**: ga naar https://console.anthropic.com en maak een account
   op jouw naam (zelfde principe als Stripe: de site is van jou).
2. **Betaalmiddel + tegoed**: Billing → betaalmiddel koppelen. Verwacht
   verbruik: ±$25–45/maand zodra alles draait (dagoverzichten en langere
   premium-samenvattingen inbegrepen).
3. **API-key**: API Keys → Create key, naam bijv. `brightnews-pipeline`.
4. **In GitHub zetten**: repo → Settings → Secrets and variables → Actions
   → New repository secret → naam exact `ANTHROPIC_API_KEY`, waarde = de
   key. (Zelfde plek als de bestaande secrets.)
5. **Erik appen** — dan mergen we de klaarstaande code (PR #2 t/m #4),
   draaien een eerste run en beoordelen samen het selectie-log (de
   selectieprompt moet in 1–2 rondes op Claude worden geijkt).

Los hiervan gepland: een eigen **Claude-abonnement** voor jezelf (Claude
Code, om mee te bouwen en straks de marketing-agent te draaien) — overleg
met Erik welk plan past; dit telt mee in de break-even-som (zie
MARKETING-PLAN.md).

*Opgesteld 2026-09-02. Dit zijn de twee sporen die alleen jij kunt doen (beide
vereisen accounts op jouw naam). Alles wat daarna komt — code, activatie,
testen — doet Claude/Erik; dat staat onderaan. Reken op ±30 min voor Google en
±1 à 1,5 uur voor Stripe (plus wachttijd op Stripes review).*

---

## Spoor 1 — Google Search Console ✅ AFGEROND (2026-09-05)

Property (domein-type) actief, sitemap "Succesvol" met exact 2.072
ontdekte pagina's (klopt 1-op-1 met de live sitemap — geverifieerd).
Enige vervolgactie: **over ±1 week** Indexering → Pagina's checken
(aantal geïndexeerde pagina's hoort op te lopen) en onder Prestaties
zien op welke zoektermen BrightNews verschijnt. Origineel stappenplan
hieronder ter referentie.

## (was) Spoor 1 — Google Search Console (±30 min, kan vandaag)

Doel: Google actief vertellen dat brightnews.online bestaat, de sitemap met
1500+ artikelpagina's laten indexeren, en zien hoe de site in Google presteert.

1. **Inloggen**: ga naar https://search.google.com/search-console en log in
   met het Google-account dat je ook voor Google Analytics gebruikt
   (belangrijk — dan werkt stap 3 automatisch).
2. **Property toevoegen**: klik "Property toevoegen" en kies het rechter
   type: **URL-voorvoegsel** → vul exact `https://brightnews.online` in.
   (Het linker type "Domein" kan ook, maar vereist een DNS-record bij je
   domeinregistrar — omslachtiger, niet nodig.)
3. **Verificatie**: kies de methode **Google Analytics** — omdat de site al
   jouw Analytics-tag (G-ZNFX3R9BQV) bevat, is dit één klik. Lukt dat niet,
   kies dan "HTML-tag", kopieer de `<meta name="google-site-verification">`-
   regel en stuur die naar Erik/Claude — die zetten hem op de site, waarna
   jij op "Verifiëren" klikt.
4. **Sitemap indienen**: menu links → **Sitemaps** → vul in: `sitemap.xml`
   → **Verzenden**. Status moet "Gelukt" worden (kan een paar minuten duren);
   het aantal gevonden URL's hoort in de buurt van het aantal artikelpagina's
   + 7 vaste pagina's te liggen.
5. **Eén week later terugkijken** (5 min): menu → **Indexering → Pagina's**.
   Verwacht: het aantal geïndexeerde pagina's loopt gestaag op. Ook leuk:
   **Prestaties** toont vanaf dan op welke zoektermen BrightNews verschijnt.
   De twee oude "kritieke problemen" van vóór de canonical-fix mag je daar
   afsluiten met "Validatie starten" als ze nog open staan.

> Niet nodig: Google Maps/Bedrijfsprofiel (geen fysieke locatie), aparte
> aanmelding bij Google News (Search Console dekt dit; een News-vermelding
> kan later altijd nog via publishercenter.google.com).

### Extra taak: social-media-pagina's (±20 min)

De footer linkt sinds 2026-09-02 naar deze drie profielen — die moeten dus
bestaan (claim de handles, of geef de juiste URL's door zodat de links
aangepast worden):
- Facebook: `facebook.com/brightnews.online`
- Instagram: `instagram.com/brightnews.online`
- LinkedIn: `linkedin.com/company/brightnews-online`

---

## Spoor 2 — Stripe: alleen Managed Payments activeren nog (±15 min + reviewwachttijd)

**Stand 2026-09-04**: bijna alles is al gedaan. Jouw producten (Glow €2,95/mnd,
Shine €24,95/jr, beide met 30 dagen gratis proefperiode) en payment links
staan goed; Claude heeft daarna via jouw ingelogde dashboard het klantenportaal
geactiveerd, de `plan`-metadata op beide producten gezet en het
webhook-endpoint aangemaakt, en via de API de database en de webhook-function
klaargezet (secret staat er ook al in). **Er rest precies één ding dat alleen
jij kunt doen, want het is een juridische overeenkomst op jouw naam:
Managed Payments activeren.**

### Waarom dit moet

Managed Payments maakt Stripe de **Merchant of Record**: zij worden formeel
de verkoper, en regelen dus btw-afdracht in alle landen, facturen/bonnetjes,
chargebacks en klantsupport. De footer van de site zegt al "Payments are
securely processed by Stripe, our Merchant of Record" — dat klopt pas als
deze activatie rond is. Zonder MP verkoop je als gewone Stripe-verkoper en
ben je zélf verantwoordelijk voor buitenlandse btw. Kosten: 3,5% extra
per transactie bovenop de normale Stripe-fees (dat is de prijs van geen
btw-administratie hoeven doen).

### De stappen

1. **Log in** op https://dashboard.stripe.com (live mode, rechtsboven —
   niet "test mode"). In het linkermenu onder *Snelkoppelingen* staat
   **Managed Payments**; klik erop. (Staat hij daar niet: zoekbalk bovenin
   → "Managed Payments".)
2. Je ziet de introductiepagina ("Vereenvoudig wereldwijde verkoop…").
   Klik **"Aan de slag"**.
3. Doorloop de wizard. Verwacht in elk geval:
   - **de overeenkomst voor geregistreerde verkopers** (Stripe wordt
     wederverkoper van je product) — lees en accepteer;
   - vragen over **wat je verkoopt**: digitale content/abonnementen —
     BrightNews valt daar gewoon onder (beide producten staan in het
     dashboard al als "Komt in aanmerking");
   - mogelijk een **controle van je bedrijfsgegevens en je site**. Gebruik
     exact de gegevens uit de sitefooter (Vossenstraat 19 Nijswiller,
     KvK 42048341, BTW NL005455019B94). Alles waar Stripe naar kijkt staat
     al op de site: voorwaarden, privacy, refunds-pagina,
     herroepingsrecht-checkbox, MoR-zin in de footer.
4. **Wachttijd**: Stripe kan de aanvraag direct goedkeuren of er een review
   op zetten (uren tot dagen). Doe deze stap dus zo snel mogelijk; je hoeft
   er verder niet op te wachten.
5. **Controleer na goedkeuring** (Productcatalogus): de kolom *Managed
   Payments* bij Glow en Shine moet dan niet meer "Komt in aanmerking"
   zeggen maar actief/ingeschreven zijn. Kom je een knop of vinkje tegen om
   de producten onder Managed Payments te brengen: aanzetten voor allebei.
6. **Verander verder niets** aan producten, prijzen of payment links — die
   URL's zitten inmiddels in de sitecode. Wil je ooit iets wijzigen, geef
   het even door.
7. **Meld "MP is actief" aan Erik/pap.** Daarna volgen de laatste stappen
   (testbestelling in testmodus, omschakeling van Lemon naar Stripe) vanzelf
   in één Claude-sessie.

**Lemon Squeezy**: nog even niets aan doen; die blijft parallel bestaan tot
Stripe live is en wordt daarna afgebouwd (staat in STRIPE-MIGRATIE.md).

---

## Wat daarna automatisch volgt (Claude/Erik, ±1 sessie)

Zodra jij "MP is actief" meldt: een volledige proefbestelling in testmodus
(testkaart), en dan de livegang: provider-switch om, footer- en
privacyteksten van Lemon Squeezy naar Stripe, security-headers erbij, live
proefaankoop + refund, en de eindcheck "zou een Stripe-reviewer dit
goedkeuren". Als afronding trek jij in Supabase het toegangstoken van Erik
weer in (Account → Access Tokens → Revoke). Details: `STRIPE-MIGRATIE.md`.
(Databasekolom, webhook-function, secret, links en portaal: ✅ al gedaan
op 2026-09-04.)
