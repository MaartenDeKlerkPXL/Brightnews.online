# Bright News — Overdrachtsdocument voor vervolgwerk

**Doel van dit document:** je (Fable 5.0 / Claude Code) hoeft niets van het onderstaande opnieuw uit te zoeken. Alle architectuurkeuzes, testresultaten en beslissingen staan hier vast. Lees dit vóór je iets doet, samen met `README.md` en `BRIGHTNEWS-PROJECTPLAN-V2.md` in de repo-root.

---

## Niet-onderhandelbare werkwijze (deze regels hebben tot nu toe herhaaldelijk echte bugs blootgelegd — wijk er niet van af)

1. **Werk uitsluitend in `~/Desktop/brightnews-website`** (of het equivalente pad op deze machine na `git clone`). Er zijn in het verleden meerdere verouderde, losse kopieën van deze repo blijven rondslingeren op andere paden — controleer bij twijfel met `git remote -v` dat je in de juiste, aan GitHub gekoppelde map zit.
2. **Eén branch per fase**, genaamd `fase-N-onderwerp`. Nooit direct op `master` werken.
3. **Voor je iets wijzigt: check drift tussen git en de daadwerkelijk live/gedeployde staat.** Dit is geen formaliteit — de Lemon Squeezy-webhook bleek ooit rechtstreeks naar Supabase gedeployed zonder ooit gecommit te zijn; de repo bevatte dus een oudere, onveilige versie terwijl de live functie al goed was. Dit soort verschil is al meerdere keren de kern van een probleem gebleken.
4. **Bouw, test, rapporteer, wacht op expliciete bevestiging voordat je commit.** Wacht daarna nogmaals op aparte, expliciete toestemming voordat je merget naar `master` en pusht — een merge naar `master` zet dingen **direct live** op brightnews.online.
5. **Verwijder nooit een bestand zonder eerst grep-bewijs te tonen** dat er nergens meer naar verwezen wordt. Bij twijfel: niet verwijderen, rapporteren en vragen.
6. **Kom je iets onverwachts tegen dat niet in de huidige opdracht staat** (dit is al vaak gebeurd: een hardcoded wachtwoord in `launch.html`, een dode Stripe-testlink, een publiek aanroepbare `delete_user_immediately()`-functie, een `thanks.html` die `index.js` niet laadde) — **stem dat eerst af voordat je het aanpakt.** Los het niet stilzwijgend op en meld het ook niet pas achteraf.
7. **Wantrouw "het bronbestand zegt dat dit klopt."** Bij de CSS-opschoning bleken 2 echte, actief renderende WCAG-contrastfouten verstopt te zitten achter een latere, ogenschijnlijk overruled CSS-generatie. Verifieer met computed styles / een echte, live test, niet alleen door de code te lezen.
8. **Geen nieuwe frameworks/bundlers.** Het project is bewust vanilla JS/HTML/CSS zonder build-stap (zie README). Nieuwe functionaliteit volgt het patroon van bestaande Node-scripts in de GitHub Action (zoals `processor.js`, `generate-sitemap.js`), niet een nieuwe tool-chain.
9. **Premium-content mag nooit in een publiek toegankelijk bestand of publieke JSON terechtkomen.** Dit is de kern van de Fase 1-beveiliging — elke nieuwe feature die artikeltekst aanraakt moet expliciet checken dat volledige tekst alleen via de premium-checkende `get_full_article()`-RPC beschikbaar komt.

---

## Architectuur in het kort

- Statische HTML/CSS/vanilla JS, gehost op GitHub Pages, domein brightnews.online.
- Content-pipeline: GitHub Action (`.github/workflows/update-news.yml`), draait 2x/dag, cron `0 0,12 * * *`. Voert `backend/processor.js` uit: haalt RSS-feeds op, laat Mistral AI filteren/herschrijven/vertalen naar 5 talen, schrijft naar `data/news_{taal}.json`.
- Auth + database: Supabase (project `rquuqypgaannrakdrabj`). Premiumstatus staat in een `profiles`-tabel met RLS (niet meer in `user_metadata`, dat was een opgelost lek).
- Betalingen: Lemon Squeezy, via een Supabase Edge Function (`supabase/functions/lemon-webhook/index.ts`) met HMAC-signature-verificatie.
- Vertalingen: `data/translations.js` is het enige actieve systeem (5 talen, `data-i18n`-attributen).
- Volledige details, conventies en lokale testinstructies: zie `README.md` in de repo-root (toegevoegd in Fase 4).

---

## Status per fase

### ✅ Fase 0 — Vangnet
Git-tag `baseline-10aug` gezet vóór alle wijzigingen begonnen.

### ✅ Fase 1 — Kritiek: security & geld — **live**
- Webhook-signature-verificatie hersteld en teruggezet in git (was alleen live gedeployed, niet gecommit).
- Premiumstatus verplaatst naar server-side `profiles`-tabel met RLS — het oude lek (gebruiker kon zelf `is_premium` zetten via de browserconsole) is dichtgezet en getest.
- **Bonusvondst, opgelost:** een publiek `EXECUTE`-baar `SECURITY DEFINER`-functie `delete_user_immediately()` had onterecht standaardrechten voor `anon`/`authenticated`. Ingetrokken.
- Echte paywall: **nieuwe** artikelen krijgen een teaser in de publieke JSON, volledige tekst alleen via `get_full_article()`. **Bestaande 750 artikelen (vóór Fase 1.4) zijn bewust NIET geretro-fit** — te dure migratie voor beperkte paywall-relevantie bij ouder nieuws. Let op: dit is een bewuste, andere afweging dan bij Fase 6 (zie daar).
- Opzegknop gebruikt nu de Lemon Squeezy Customer Portal-link i.p.v. een dode Ko-fi-link.
- Verplichte herroepingsrecht-checkbox vóór checkout, in alle 5 talen.
- Vereist GitHub Secret `SUPABASE_SERVICE_ROLE_KEY` — controleer dat die aanwezig is.

### ✅ Fase 2 — Kapotte functionaliteit — **live**
- `startUpgrade()`, `applyDiscountCode()` (nu via een echte `promo_codes`-tabel + `redeem_promo_code()`-RPC), `handleForgotPassword()` geïmplementeerd.
- `backend/mailer.js`: valt terug op de Engelse PDF als de Nederlandse ontbreekt, met duidelijke logging.
- `artikel.html` verwijderd (nergens meer gelinkt na eerdere wijzigingen).
- `launch.html`/`backend/subscribe.js` (Node-code die niet in de browser kan draaien) opgeruimd.
- XSS-fix: alle AI-gegenereerde velden (titel, samenvatting, alt-tekst) gebruiken nu `textContent`/`createElement` i.p.v. `innerHTML`. Live getest tegen 3 injectiepogingen — geen enkele voerde uit.
- Service worker: `activate`-handler + cache-versionering toegevoegd (`CACHE_NAME` v2).
- **Bonusvondst, opgelost:** `profiel.html` had een eigen inline `window.translations`-object dat het echte vertaalbestand overschreef — bijna alle tekst op die pagina viel terug op fallbacks. Verwijderd, ontbrekende sleutels overgezet naar `data/translations.js`.

### ✅ Fase 3 — Juridisch/compliance — **live**
- Privacy.html: Ko-fi vervangen door Lemon Squeezy + Supabase + Formspree als correcte verwerkers.
- Cookiebanner functioneel: Google Consent Mode, `gtag.js` laadt pas na `acceptCookies()`. Live getest in incognito: 0 requests vóór keuze.
- AI-transparantie per artikel ("Dit artikel is AI-samengevat uit [bron]").
- Nieuwe pagina `refunds.html`, 14 dagen niet-goed-geld-terug, in alle 5 talen.
- Editorial Independence Statement toegevoegd op `over-ons.html`.
- Gestandaardiseerde footer op 11 pagina's: bedrijfsgegevens, juridische links, verplichte MoR-zin ("Payments are securely processed by Lemon Squeezy, our Merchant of Record."), dynamisch jaartal, "Abonnement beheren"-link (`openCustomerPortal()`).
- **Bonusvondsten, opgelost:** dode Stripe-testlink bij registratie-met-promocode, dode `server.js` (oude Ko-fi-webhookserver, ook verwijderd) en een hardcoded wachtwoord (`"Maarten"`/`"B2026"`) in `launch.html`.

### ✅ Fase 4 — Opschonen — **live**
- Dode bestanden verwijderd: `js/render.js`, `js/purchase.js`, `js/translations.js` (de dode variant — `data/translations.js` blijft), `backend/gemini-service.js`, `check.js`, `get-models.js`, `test-key.js`, `test-models.js`, plus wees-dependencies (`@google/generative-ai`, `express`, `body-parser`) uit `package.json`.
- Alle `._*`-resourceforkbestanden uit git-tracking gehaald.
- `README.md` en een basis ESLint/Prettier-config toegevoegd.

### ✅ Fase 5 — Toegankelijkheid — **live**
- Kleurcontrast: `--bright-green-text` (#157615) toegevoegd, alle tekst/kleine-elementen omgezet. Onderweg bleken 2 kleuren verstopt te zitten achter een dode CSS-generatie en toonden ze in werkelijkheid nog de oude, falende kleur — gefixt.
- Taaldropdown: `<details>/<summary>`, volledig toetsenbordbedienbaar, op alle 10 pagina's.
- `components.css`: **36 → 5** `!important`-declaraties. Drie gestapelde, tegenstrijdige CSS-generaties voor de nav/dropdown samengevoegd; negen overlappende mobiele media-query-blokken (hamburgermenu, profiel-toggle) samengevoegd tot één. De resterende 5 zijn 4x op een pagina-breed ongebruikte `.logo`-selector (bewust ongemoeid gelaten, buiten scope) en 1x bewust/gedocumenteerd op `.profile-link-text` (nodig om specificiteit te winnen).
- Skip-link op alle 11 pagina's, met `tabindex="-1"` op het doel.
- `:focus-visible` globaal, geverifieerd op de nieuwe dropdown, hamburgermenu, herroepingsrecht-checkbox en footer-links.
- `role="status" aria-live="polite"` op het notificatiesysteem.
- `prefers-reduced-motion` globaal toegevoegd.
- **Bonusvondst, opgelost:** `thanks.html` (de bedankpagina ná een echte betaling) laadde `index.js` niet — gaf een `ReferenceError` bij elke lading. Gefixt.
- **Bewust opengelaten, geen actie:** `.bright-toast`-CSS in `global.css` is dode code (nergens aangeroepen) — laten staan, geen risico.
- `refunds 2.html` (macOS-dubbelklik-artefact, spatie in bestandsnaam) verwijderd.

### ✅ Fase 5.5 — SEO snelle winst — **live**
- Onderzocht (niet aangenomen) waarom Search Console 2 kritieke problemen toonde: root-oorzaak was het volledig ontbreken van `<link rel="canonical">` op de hele site (niet, zoals verondersteld, hoofdlettergevoelige bestandsnamen — die hypothese bleek bij toetsing onjuist). Canonical + hreflang toegevoegd op alle 11 pagina's, dat lost beide problemen structureel op.
- `sitemap.xml`/`robots.txt` gegenereerd via nieuw script `backend/generate-sitemap.js`, ingehaakt in de GitHub Action. **Bevat bewust 8 URL's, niet 11** — `profiel.html`, `wachtwoord-vergeten.html`, `thanks.html` zijn eruit gehaald (account-/transactiepagina's zonder indexeerbare meerwaarde).
- Meta-description/keywords opgeschoond: bleken 5+5 (niet 3, zoals verondersteld) — 8 verwijderd, 1 NL-description + 1 NL-keywords resteren.
- OG-tags + Twitter Card op alle 11 pagina's.
- **Openstaand, nog te doen zodra dit gepusht is:** sociale-media-debugger-test op minstens 2 pagina's (kon niet eerder, want de wijzigingen stonden nog niet live). Sitemap handmatig indienen bij Google Search Console.
- **Bekende observatie, geen actie:** `launch.html` toont een countdown naar een datum die inmiddels in het verleden ligt. Puur genoteerd, geen prioriteit.

### 🔶 Fase 6 — SEO grote migratie (statische artikelpagina's) — **Stap A (analyse) afgerond, Stap B (bouw) nog niet gestart**

**Stap A-conclusies, al vastgesteld — voer deze uit, analyseer niet opnieuw:**

1. **Aanpak: optie (a) — eigen lichte build-stap**, geen Astro/Eleventy. Reden: het project is bewust framework-/bundler-loos (README), Node draait al als batch-tool in de Action, en er is al een werkend patroon (`generate-sitemap.js`) om op voort te bouwen.
2. **Backfill: alle 150 bestaande artikelen × 5 talen = 750 statische pagina's**, niet alleen NL. Dit is lokale, gratis Node-verwerking van data die al op schijf staat — anders dan de bewust overgeslagen backfill in Fase 1.4 (die externe Supabase-schrijfacties per rij kostte).
3. **URL-structuur: `articles/{taal}/{slug}-{id}.html`**, met een deterministische, ASCII-veilige slug (lowercase, spaties→streepjes, diakritische tekens genormaliseerd — moet bij elke run identiek uitkomen voor hetzelfde artikel).
4. **Incrementeel, nooit verwijderen:** `processor.js` popt oude artikelen uit de actuele 150-lijst zodra die te lang wordt. De generator moet bijhouden welke pagina's al bestaan en ze nooit weggooien, ook niet als het artikel uit de actuele JSON valt — een eenmaal geïndexeerde URL mag niet verdwijnen. `sitemap.xml` moet dynamisch meegroeien i.p.v. een vaste lijst.
5. **Teaser-truncatie voor oude artikelen:** voor artikelen van vóór Fase 1.4 (geen rij in `articles_full`) mag de generator NOOIT de volledige oude `summary`-tekst publiceren — pas dezelfde `maakTeaser()`-truncatie (~60 woorden) toe als `processor.js` voor nieuwe artikelen al doet.
6. **hreflang-alternates** tussen de 5 taalversies van hetzelfde artikel, JSON-LD `NewsArticle`-schema, canonical, OG-tags — consistent met wat er al op de overige 11 pagina's staat sinds Fase 5.5.
7. **Bestaande `?id=`-gedeelde links blijven werken**, geen redirect nodig — `index.html?id=X` blijft functioneren zoals nu.
8. **Deel-knoppen (WhatsApp/Facebook/copyLink) omzetten** naar de nieuwe statische URL zodra die bestaat, met terugval op de oude `?id=`-vorm als er nog geen statische pagina is (racecondition net na publicatie).
9. Hergebruik `css/pages/artikel.css` (bestaat al, is functioneel identiek aan wat een statische artikelpagina nodig heeft) en laad `index.js`/`data/translations.js` normaal, zodat premium-detectie via `get_full_article()` gewoon client-side blijft werken zodra de pagina in de browser leeft.

**Directe vervolgprompt (voer dit nu uit, dit is Stap B):**

```
Bouw Fase 6 volgens de 9 vastgestelde punten hierboven — dit is geen open
vraag meer, dit zijn genomen beslissingen. Bouw in deze volgorde:

1. generate-articles.js (zelfde patroon als generate-sitemap.js): leest
   data/news_{taal}.json voor alle 5 talen, genereert per artikel per taal
   articles/{taal}/{slug}-{id}.html met titel, teaser (met verplichte
   maakTeaser()-truncatie voor pre-Fase-1.4 artikelen), canonical,
   hreflang naar de 4 andere talen, OG-tags, JSON-LD NewsArticle. Laadt
   css/pages/artikel.css + index.js/data/translations.js normaal.

2. Incrementeel bijhouden welke pagina's al bestaan (bijv. via bestaan-
   check of een klein manifest-bestand). Nooit een eenmaal gegenereerde
   pagina verwijderen.

3. Draai het script eenmalig over de huidige 750 artikelen (backfill).
   Rapporteer aantal bestanden + duur VOORDAT je verder gaat naar stap 4.

4. Haak het script in .github/workflows/update-news.yml, na
   generate-sitemap.js. Werk generate-sitemap.js bij zodat sitemap.xml
   dynamisch meegroeit met alle gegenereerde artikel-URL's.

5. Pas de deel-knoppen (WhatsApp/Facebook/copyLink) aan zodat ze naar de
   nieuwe statische URL wijzen zodra die bestaat, met terugval op de oude
   ?id=-vorm.

Test: één artikelpagina in de browser (identiek aan de huidige SPA-
detailweergave qua opmaak), JSON-LD valideren met een validator/Google's
Rich Results Test, hreflang onderling controleren, volledige sitemap.xml
valideren.

Zelfde discipline als alle voorgaande fases: bouw, test, rapporteer,
wacht op bevestiging voordat je commit, wacht op aparte toestemming
voordat je merget naar master en pusht. Rapporteer verplicht na stap 3
(de backfill-run) voordat je doorgaat naar stap 4 — ik wil de
output-kwaliteit op een paar losse artikelen zien voordat dit 750 keer
gebeurt.
```

### ⬜ Fase 7 — Performance — nog niet gestart

```
Lees BRIGHTNEWS-PROJECTPLAN-V2.md, Fase 7 (Performance).

Zelfde discipline als de vorige fases: check git vs. live-staat, bouw
punt voor punt, test, commit pas na bevestiging, aparte toestemming voor
de merge naar master.

1. defer op alle scripts die dat nog missen (Font Awesome, Google-tag,
   Supabase-CDN) — check dat dit ook geldt voor de nieuwe statische
   artikelpagina's uit Fase 6.
2. Vervang Font Awesome-iconen door inline SVG (het X-icoon is al zo
   gedaan — zelfde patroon volgen).
3. loading="lazy" + width/height op kaartafbeeldingen, inclusief op de
   nieuwe statische artikelpagina's.

Test: Lighthouse-score vóór/na op minstens de homepage en één statische
artikelpagina. Rapporteer een tabel zoals de vorige fases.
```

### ⬜ Fase 8 — Content-pipeline — nog niet gestart

```
Lees BRIGHTNEWS-PROJECTPLAN-V2.md, Fase 8 (Content-pipeline).

Zelfde discipline als de vorige fases.

1. Feedlijst terugbrengen tot bronnen die daadwerkelijk bij "positief
   nieuws" passen — verwijder entertainment/sport-bronnen die vrijwel
   nooit isBright: true opleveren (check de audit-lijst in
   BRIGHTNEWS-PROJECTPLAN-V2.md voor de specifieke namen).
2. Sentiment-prefilter (de sentiment-library die al in dependencies
   staat) vóór elke Mistral-call, om het aantal calls te verlagen.
3. Retry/backoff + rate limiting in processor.js.
4. Fix de cross-taal-desync: als de AI-respons voor één taal ontbreekt/
   misvormd is, sla het hele artikel over i.p.v. het gedeeltelijk in
   sommige talen toe te voegen (voorkomt dat talen uit sync raken qua
   aantal/id's).
5. Kostenlogging: log per run aantal calls/tokens naar
   data/last_run.json.

Let op: dit raakt processor.js, hetzelfde bestand dat Fase 6 (backfill/
generate-articles.js) en Fase 1.4 (teaser-splitsing) al aanpasten —
controleer expliciet dat deze wijzigingen niet conflicteren met wat daar
al staat.

Test: draai de pipeline lokaal met een testkey tegen een kleine subset
feeds, bevestig dat teaser-splitsing en nieuwe-artikel-generatie (Fase 6)
nog correct samenwerken met de gewijzigde processor.js. Rapporteer een
tabel zoals de vorige fases.
```

### ⬜ Fase 9 — Merchant-of-Record-eindcheck — nog niet gestart

Geen code-fase. Ná Fase 1-8: vraag Fable expliciet "Zou een Lemon Squeezy-reviewer deze site nu goedkeuren? Wat zou nog steeds een rode vlag zijn?" en beoordeel het antwoord kritisch voordat je live-verificatie bij Lemon Squeezy aanvraagt.

---

## Bekende, bewust opengelaten punten (niet per ongeluk vergeten, gewoon nog niet aangepakt)

- `.logo`-selector in `components.css` heeft nog 4 `!important`-declaraties, raakt geen enkele huidige pagina (alleen in comments of op `launch.html`'s eigen template). Buiten scope gelaten.
- `.bright-toast`-CSS in `global.css`: dode code, nergens aangeroepen. Geen risico, geen actie nodig tenzij je het alsnog wilt opruimen.
- `launch.html` toont een verlopen countdown-datum. Puur cosmetisch, geen SEO/security-impact.
- De 750 pre-Fase-1.4-artikelen zijn NIET geretro-fit met de paywall-splitsing (bewuste, afgewogen keuze) — maar krijgen WEL een teaser-truncatie in de Fase 6-statische pagina's (andere context, andere afweging, zie Fase 6 punt 5 hierboven).

---

## Overdrachtsprocedure (git-based, geen zip)

Op de computer waar dit document vandaan komt:
```bash
cd ~/Desktop/brightnews-website
git push origin master
```

Op de nieuwe computer (waar Fable draait):
```bash
git clone https://github.com/MaartenDeKlerkPXL/Brightnews.online.git
cd Brightnews.online
git checkout master
npm install
```

Geef Fable: dit document + `README.md` + `BRIGHTNEWS-PROJECTPLAN-V2.md` uit de repo. Start met de Fase 6-Stap-B-prompt hierboven.

Na elke fase die daar wordt afgerond en naar `master` gepusht, haal je 'm terug op de oorspronkelijke computer met simpelweg:
```bash
git pull origin master
```
