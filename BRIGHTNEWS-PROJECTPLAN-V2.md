# Bright News — Projectplan naar een werkende, verkoopklare site

**Basis:** de Claude Code-audit van 10 augustus 2026, uitgevoerd op de actuele repo (`MaartenDeKlerkPXL/Brightnews.online`).
**Werkmap:** uitsluitend `~/Desktop/brightnews-website`.
**Regel voor elke fase:** eerst bouwen, dan zelf testen (browserconsole + de specifieke testroute die bij de fase staat), dan pas committen. Elke fase = één losse commit met een duidelijke boodschap, zodat je op elk moment kunt teruggaan naar een werkende staat.

**Belangrijke correctie op de vorige aanname:** de webhook die we samen "getest en werkend" noemden, mist alsnog de signature-verificatie in de huidige repo-versie — die fix is destijds blijkbaar niet definitief bewaard gebleven, of een latere wijziging heeft hem overschreven. Fase 1 lost dit als eerste, echt eerste punt op.

---

## Fase 0 — Vangnet (15 min, geen functionele wijziging)

Voordat er iets verandert: een terugvalpunt.

```bash
cd ~/Desktop/brightnews-website
git checkout -b pre-fase-1-baseline
git checkout master
git tag baseline-10aug
git push origin baseline-10aug
```

Werk vanaf nu per fase in een eigen branch, merge naar `master` pas als de fase getest is:
```bash
git checkout -b fase-1-kritiek
```

**Versiebeheer, doorlopend vanaf nu:** houd een `CHANGELOG.md` bij die je na elke fase-merge aanvult (niet pas aan het eind). Formaat: `## [1.x.0] - datum` + bullets van wat er in die fase is gewijzigd. Versienummer ophogen bij elke merge naar `master`: patch (x.x.1) voor bugfixes/opschonen, minor (x.1.0) voor nieuwe functionaliteit zoals de refund-pagina of structured data.

**Commit na fase 0:** geen — dit is alleen een tag, geen codewijziging.

---

## Fase 1 — Kritiek: geld en security (vandaag/morgen, hoogste prioriteit)

Dit blokkeert alles daarna. Zolang dit openstaat, kan iedereen zichzelf gratis Premium geven — ongeacht hoe mooi de rest van de site wordt.

### 1.1 Webhook-signature-verificatie terugzetten
`supabase/functions/lemon-webhook/index.ts` — voeg de HMAC-SHA256-check tegen `LEMON_WEBHOOK_SECRET` weer toe (we hadden deze code al eerder geschreven en getest — die versie hergebruiken, niet opnieuw uitvinden). Deploy met `supabase functions deploy lemon-webhook --no-verify-jwt` (die JWT-instelling stond al goed, blijft zo).

### 1.2 `subscription_expired` en `subscription_cancelled` correct afhandelen
Zelfde bestand: `subscription_expired` → `is_premium: false`. `subscription_cancelled` → bewust geen statuswijziging (klant behoudt toegang tot einddatum), wel loggen.

### 1.3 Client-side premium-vervalsing dichten — het echte, onderliggende lek
Dit is groter dan 1.1/1.2: zelfs met een perfecte webhook kan elke ingelogde gebruiker nu zichzelf Premium geven via de browserconsole, omdat `is_premium` in `user_metadata` staat (schrijfbaar door de gebruiker zelf).
- Maak een `profiles`-tabel in Supabase met kolom `is_premium boolean default false`, RLS: `select` voor eigenaar, `update`/`insert` alleen voor `service_role`.
- Verplaats de webhook-schrijfactie van `auth.admin.updateUserById(..., user_metadata)` naar een `insert`/`update` op deze tabel.
- Verplaats `checkUser()` in `index.js` van `session.user.user_metadata.is_premium` naar een query op `profiles`.
- Verwijder de hardcoded `secretCode = "BRIGHT-GLOW-2024"` uit `js/main.js` en de bijbehorende `activateGlow()`/`updateUIForGlow()`.

### 1.4 Paywall echt maken
`data/news_{taal}.json` mag alleen nog titel, eerste ~85 tekens, categorie en afbeelding bevatten. Volledige tekst verhuist naar een aparte, door RLS/service-role beschermde bron (Supabase-tabel of losse per-artikel bestanden achter een functie die premium-status checkt).
*Dit raakt `processor.js` (schrijft de data), `index.js` (leest/toont 'm) en de nieuwe premium-check uit 1.3 — doe dit ná 1.3, niet ervoor.*

### 1.5 Werkende opzeg-knop
`profiel.html` → `cancelSubscription()`: vervang de Ko-fi-link door de Lemon Squeezy Customer Portal-URL (`customer_portal_update_subscription`, komt uit de subscription-data — dezelfde soort URL die we al in een eerdere webhook-payload zagen staan).

### 1.6 Herroepingsrecht rechtsgeldig maken
Voeg vóór de Lemon Squeezy-checkout-knop op `abonnementen.html` een verplichte checkbox toe: *"Ik ga akkoord dat de dienst direct start en doe daarmee afstand van mijn herroepingsrecht"* — checkout-knop pas actief/klikbaar als deze is aangevinkt.

**Testen vóór commit:** herhaal de test die we al eerder deden — Simulate event `order_created` → check 200 + `profiles`-tabel; Simulate event `subscription_expired` → check dat premium weer false wordt; probeer zelf via console `is_premium` te zetten en bevestig dat dit nu **niets** meer doet.

```bash
git add -A
git commit -m "Fase 1: webhook-verificatie, server-side premium-status, echte paywall, werkende opzegging, herroepingsrecht"
git checkout master
git merge fase-1-kritiek
git push origin master
```

---

## Fase 2 — Kapotte functionaliteit (halve dag)

Niets hiervan is gevaarlijk, maar het zijn zichtbare, geloofwaardigheid-kostende bugs.

- `profiel.html`: implementeer `startUpgrade()` (link naar `abonnementen.html`), `applyDiscountCode()` (echte promocode-check tegen een tabel, niet hardcoded), `handleForgotPassword()` (`supabaseClient.auth.resetPasswordForEmail`).
- Zoek uit of `add_premium_reward` als Postgres-functie in Supabase bestaat (dashboard → Database → Functions); zo niet, maak 'm aan óf verwijder de aanroep in `js/main.js` tot het referral-systeem echt gebouwd wordt.
- `backend/mailer.js`: vertaal `voorwaarden.pdf` (NL) en zet 'm naast de bestaande Engelse versie in `assets/documents/`, of val terug op de Engelse PDF voor alle talen tot de vertaling klaar is.
- `artikel.html`: fix `const supabase = supabase.createClient(...)` → `window.supabaseClient = ...`, of verwijder de pagina helemaal als hij nergens gelinkt wordt.
- `launch.html`: verwijder de `<script defer src="backend/subscribe.js">`-regel (Node-code die niet in de browser kan draaien).
- `index.js`: vervang `innerHTML` door `textContent`/`createElement` voor alle AI-gegenereerde velden (titel, samenvatting, alt-tekst) — dit is de XSS-fix die al twee keer is aangestipt en nog niet is doorgevoerd.
- `sw.js`: voeg een `activate`-handler toe die oude caches opruimt, en bump `CACHE_NAME` voortaan bij elke inhoudelijke wijziging.

```bash
git checkout -b fase-2-bugfixes
# ... wijzigingen ...
git add -A
git commit -m "Fase 2: kapotte knoppen gefixt, mailer-PDF, artikel.html-crash, XSS-sanitizing, service worker versionering"
git checkout master
git merge fase-2-bugfixes
git push origin master
```

---

## Fase 3 — Juridisch/compliance (halve dag, geen ontwikkelaarswerk maar wel verplicht)

- `Privacy.html`: vervang de Ko-fi-vermelding door Lemon Squeezy én voeg Supabase toe als verwerker. Dit is een **actieve onjuistheid** in een juridisch document, corrigeer als eerste van deze fase.
- Cookiebanner echt maken: laad Google Analytics (`gtag.js`) niet meer onvoorwaardelijk in de `<head>`. Laad 'm pas na `acceptCookies()`, of gebruik `gtag('consent', 'default', {...})` met `denied` als startwaarde en `update` pas na toestemming.
- Beslis het verdienmodel-risico uit J3: AI-herschreven content van 34 bronnen, commercieel achter een paywall. Optie A: houd het bij korte samenvattingen (2-3 zinnen) + duidelijke bronlink in plaats van volledige herschrijvingen. Optie B: accepteer het risico bewust en zorg voor waterdichte bronvermelding + een correctiebeleid. Dit is een keuze die *jij* maakt, niet iets wat Claude Code voor je beslist — bespreek dit voordat Fase 3 wordt afgesloten.
- Voeg per artikel een zichtbare "Dit artikel is AI-samengevat uit [bron]"-vermelding toe.

### 3.1 Ontbrekende juridische pagina
- **`refunds.html`** (of `Refunds.html`, consistent met de bestaande hoofdletter-conventie) — ontbreekt nog volledig. Inhoud hangt af van jouw beslissing over refundbeleid (zie hieronder); minimaal moet erin: hoeveel dagen restitutie, hoe aan te vragen, verhouding tot de 14-dagen-trial die Lemon Squeezy al hanteert.
- `Privacy.html`, `algemeene-voorwaarden.html`, `over-ons.html`, `contact.html` bestaan al — geen nieuwe paginas nodig daarvoor, alleen de Ko-fi→Lemon Squeezy/Supabase-correctie (zie boven).
- *Schone URL's (`/privacy` i.p.v. `Privacy.html`) zijn pas mogelijk ná de statische-pagina's-migratie in Fase 6 — tot die tijd blijft de `.html`-vorm, functioneel gelijkwaardig.*

### 3.2 Gestandaardiseerde footer
Eén footer-component (via het layout-mechanisme uit de Fase 6-migratie, of tot die tijd handmatig gesynchroniseerd over alle pagina's) met verplicht:
- Bedrijfsnaam, handelsnaam, KvK, BTW, vestigingsland (staat al correct in Privacy.html — hergebruik die tekst, niet opnieuw verzinnen)
- Support-e-mail + link naar contactpagina
- Links: Privacy, Voorwaarden, **Refunds** (nieuw), Cookies
- Abonnementen-link + "Manage subscription" (koppelt aan de Lemon Squeezy Customer Portal-link uit Fase 1.5)
- Verplichte MoR-vermelding: **"Payments are securely processed by Lemon Squeezy, our Merchant of Record."**
- © huidige jaar (dynamisch, niet hardcoded)

**Openstaande vragen voor jou, nodig vóór 3.1 afgerond kan worden:**
1. Refundbeleid — geef je restitutie, en zo ja binnen hoeveel dagen na aankoop? Hoe verhoudt dit zich tot de bestaande 14-dagen-trial?
2. Wil je een Editorial Independence Statement (een verklaring dat de AI-samenvattingen onafhankelijk van de bronmedia tot stand komen)? Zo ja, dat komt op `over-ons.html` of als eigen sectie op de artikel-transparantie uit Fase 3 hierboven.

```bash
git checkout -b fase-3-juridisch
git add -A
git commit -m "Fase 3: privacybeleid gecorrigeerd, cookiebanner functioneel, AI-transparantie per artikel"
git checkout master
git merge fase-3-juridisch
git push origin master
```

---

## Fase 4 — Opschonen (halve dag)

Puur onderhoud, geen functionele impact — maar wel nodig zodat Fase 5-8 niet in dezelfde rommel struikelen als wij deze week.

- Verwijder bevestigd dode bestanden: `js/render.js`, `js/purchase.js`, `js/translations.js` (de dode, niet-geladen versie — `data/translations.js` blijft), `backend/gemini-service.js`, `check.js`, `get-models.js`, `test-key.js`, `test-models.js`, `server.js` (na te checken dat de Ko-fi-webhook-functionaliteit echt nergens meer nodig is).
- `git rm --cached` voor alle 42 nog getrackte `._*`-resourceforkbestanden (de `.gitignore`-regel voorkomt nieuwe, maar ruimt bestaande niet automatisch op).
- Voeg een `README.md` toe: wat het project doet, hoe de pipeline werkt, hoe je lokaal test.
- Voeg ESLint + Prettier toe met een simpele config — had een aantal van de kapotte-functie-bugs uit Fase 2 vooraf kunnen opvangen.

```bash
git checkout -b fase-4-opschonen
git add -A
git commit -m "Fase 4: dode code verwijderd, resource forks uit git, README en linting toegevoegd"
git checkout master
git merge fase-4-opschonen
git push origin master
```

---

## Fase 5 — Toegankelijkheid (halve dag tot een dag)

- Introduceer `--bright-green-text: #157615` als tekst-/knopvariant naast de bestaande `#32CD32` (die blijft voor decoratieve vlakken). Vervang overal waar groen op tekst/kleine elementen valt.
- Taaldropdown: vervang de `:hover`-only-opening door `<details>/<summary>` (zoals al bij de taalkeuze in het registratieformulier gebeurt) of een `click`-handler met `aria-expanded`.
- `components.css`: consolideer de 36 `!important`-declaraties — per selector samenvoegen, dan pas de `!important` weghalen, visueel controleren per pagina.
- Skip-link, `:focus-visible`-stijlen, `role="status"`/`aria-live` op notificaties, `prefers-reduced-motion`.

```bash
git checkout -b fase-5-toegankelijkheid
git add -A
git commit -m "Fase 5: WCAG AA-contrast, toetsenbord-toegankelijke dropdown, CSS geconsolideerd"
git checkout master
git merge fase-5-toegankelijkheid
git push origin master
```

---

## Fase 6 — SEO (een dag, grootste losse impact)

- Verwijder de 4 overtollige `<meta name="description">`-tags op `index.html`, houd er één.
- Voeg `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card` toe — begin met de hoofdpagina's, dan de artikel-weergave.
- `robots.txt` en `sitemap.xml` — laat de GitHub Action deze genereren bij elke run.
- **Structured data (Schema.org JSON-LD):** `Organization`-schema op elke pagina (naam, logo, adres — hergebruik de footer-gegevens uit Fase 3.2), `WebSite`-schema met `SearchAction` indien er ooit zoekfunctionaliteit komt, en `NewsArticle`-schema per artikel (headline, datePublished, image, author — dit laatste kan pas volledig zodra de statische artikelpagina's hieronder bestaan, want dat schema hoort in de HTML van de artikelpagina zelf, niet in de SPA-detailweergave).
- Grootste stap, apart te plannen: statische artikelpagina's per taal genereren (Astro/Eleventy) zodat crawlers en social-share-previews niet meer op een lege "Laden..."-pagina stuiten. **Dit ontgrendelt ook: schone URL's voor de juridische pagina's (3.1), volledige `NewsArticle`-schema per artikel, en canonical/hreflang-tags.**

```bash
git checkout -b fase-6-seo
git add -A
git commit -m "Fase 6: meta-tags opgeschoond, Open Graph toegevoegd, robots.txt en sitemap.xml"
git checkout master
git merge fase-6-seo
git push origin master
```
*(De statische-pagina's-migratie krijgt een eigen sub-fase/branch, dat is te groot voor één commit.)*

---

## Fase 7 — Performance (halve dag)

- `defer` op alle scripts die dat nog missen (Font Awesome, Google-tag, Supabase-CDN).
- Vervang Font Awesome-iconen door inline SVG (zoals al bij het X-icoon gebeurd is).
- `loading="lazy"` + `width`/`height` op kaartafbeeldingen.

```bash
git checkout -b fase-7-performance
git add -A
git commit -m "Fase 7: scripts deferred, Font Awesome vervangen door inline SVG, lazy-loading afbeeldingen"
git checkout master
git merge fase-7-performance
git push origin master
```

---

## Fase 8 — Content-pipeline (een dag)

- Feedlijst terugbrengen tot bronnen die daadwerkelijk bij "positief nieuws" passen; verwijder `Foxsports.com`, `Etonline.com`, en vergelijkbare entertainment/sport-bronnen die vrijwel nooit `isBright: true` opleveren.
- Prefilter met de `sentiment`-library vóór de Mistral-call, om het aantal (nu tot ~1000 per run) calls te verlagen.
- Retry/backoff + rate limiting in `processor.js`.
- Fix de cross-taal-desync: als één taal in de AI-respons ontbreekt, sla het hele artikel over in plaats van het gedeeltelijk in sommige talen toe te voegen.
- Kostenlogging: log per run het aantal calls/tokens naar `data/last_run.json`.

```bash
git checkout -b fase-8-pipeline
git add -A
git commit -m "Fase 8: feedlijst opgeschoond, sentiment-prefilter, retry/backoff, cross-taal-desync gefixt"
git checkout master
git merge fase-8-pipeline
git push origin master
```

---

## Fase 9 — Merchant-of-Record-check (na alle vorige fases)

Geen code-fase, een beoordelingsmoment. Loop met Claude Code de vijf MoR-risicopunten uit de audit nog eens langs nu Fase 1-3 zijn afgerond, en vraag expliciet: *"Zou een Lemon Squeezy-reviewer deze site nu goedkeuren? Wat zou nog steeds een rode vlag zijn?"* Pas als dat antwoord schoon is, vraag je de Lemon Squeezy-verificatie aan.

---

## Volgorde-samenvatting

| Fase | Onderwerp | Blokkeert live-verkoop? |
|---|---|---|
| 1 | Security & geld | Ja — dit moet eerst |
| 2 | Kapotte functionaliteit | Nee, maar zichtbaar slordig |
| 3 | Juridisch | Ja voor EU-verkoop |
| 4 | Opschonen | Nee |
| 5 | Toegankelijkheid | Wettelijk relevant (EAA) |
| 6 | SEO | Nee, wel groeirem |
| 7 | Performance | Nee |
| 8 | Content-pipeline | Nee, wel kostenrisico |
| 9 | MoR-eindcheck | Beslismoment |

Begin met Fase 1. Geef Claude Code per fase een losse, aparte prompt (niet alles in één keer) — precies zoals we deze week met de webhook deden: klein, getest, gecommit, dan door.
