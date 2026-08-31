# BrightNews

Statische, meertalige (NL/EN/DE/FR/ES) nieuwssite met uitsluitend positief nieuws.
Draait op GitHub Pages via `CNAME` → brightnews.online. Geen server, geen
build-stap: de HTML in de root wordt direct geserveerd. Betalingen lopen via
Lemon Squeezy (Merchant of Record); accounts en premiumstatus via Supabase.

## Hoe de pipeline werkt

Twee keer per dag (`.github/workflows/update-news.yml`, cron `0 0,12 * * *`):

1. `backend/processor.js` haalt ~30 RSS-feeds op (`rss-parser`).
2. Per item gaat titel + snippet naar Mistral (`mistral-small-latest`,
   `responseFormat: json_object`). Het model bepaalt `isBright`, categoriseert
   het artikel, schrijft een tekst van ~300 woorden en vertaalt naar alle 5 talen.
3. **Teaser/volledige-tekst-splitsing (sinds Fase 1.4 — dit is de echte
   paywall):** alleen een teaser van ~60 woorden komt in de publieke
   `data/news_{taal}.json`. De volledige tekst gaat naar de Supabase-tabel
   `articles_full`, met de `SUPABASE_SERVICE_ROLE_KEY` (nodig als env-var/
   GitHub Secret — zie `.env.example`). Zonder die key slaat de pipeline
   alléén de teaser op (met een duidelijke waarschuwing in de logs), nooit de
   volledige tekst ergens publiek.
4. Frontend (`index.js`) haalt de teaser-JSON op voor de lijst-/kaartweergave.
   Bij het openen van een artikel checkt `checkUser()` de premiumstatus via de
   Supabase-tabel `profiles` (niet via `user_metadata` — dat is door de
   gebruiker zelf te overschrijven). Is de gebruiker Premium, dan haalt
   `get_full_article()` (een Postgres-functie die zelf de premium-check doet)
   de volledige tekst op. Artikelen van vóór Fase 1.4 hebben geen rij in
   `articles_full` — daarvoor valt de weergave terug op de (volledige) tekst
   die toen nog rechtstreeks in de JSON stond.
5. De GitHub Action committet alleen `data/*.json` terug naar `master`
   (`[skip ci]` in het commitbericht voorkomt een oneindige loop).

## Lokaal draaien en testen

```bash
npm install
cp .env.example .env   # vul MISTRAL_API_KEY in; de rest is optioneel lokaal
npm start                    # = node backend/processor.js
npm run mail-test            # test de bevestigingsmail (backend/mailer.js)
python3 -m http.server 8000  # frontend: open http://localhost:8000/index.html
```

Er zijn geen geautomatiseerde tests (behalve ESLint, zie hieronder).
Verifiëren gebeurt door de pagina's in de browser te openen en de console +
Network-tab te controleren op fouten en 404's.

### Benodigde env-vars

Zie `.env.example` voor de volledige, actuele lijst. Kort samengevat:

| Variabele | Verplicht voor | Zonder deze key |
|---|---|---|
| `MISTRAL_API_KEY` | `npm start` (processor.js) | Pipeline crasht direct |
| `SUPABASE_SERVICE_ROLE_KEY` | Echte paywall (processor.js schrijft volledige tekst) | Alleen teasers worden opgeslagen, met een waarschuwing in de logs — geen crash |
| `EMAIL_USER` / `EMAIL_PASS` | `npm run mail-test` (mailer.js) | Alleen relevant als je die mail lokaal wilt testen |

In productie leest de GitHub Action deze uit **GitHub Secrets**
(Settings → Secrets and variables → Actions), nooit uit een gecommit bestand.
`.env` staat in `.gitignore` en mag nooit gecommit worden.

## Mappenstructuur

- `*.html` (root) — alle pagina's. `index.html` is de echte app (nieuwsfeed +
  artikeldetail). `launch.html` is een oudere countdown-/landingspagina, nog
  bereikbaar (o.a. als redirect na accountverwijdering).
- `index.js` (root) — kern van de frontend: taal, `laadNieuws`, `renderLijst`,
  `toonDetail`, paywall (via `get_full_article`), cookieconsent
  (`checkCookies`/`acceptCookies`/`activateAnalytics`), delen,
  categoriefilter, `openCustomerPortal` (Lemon Squeezy-abonnementbeheer).
- `js/auth.js` — Supabase-auth: in-/uitloggen, registreren, profiel-UI,
  promocodes (via de `redeem_promo_code`-RPC, niet hardcoded), Lemon
  Squeezy-checkout.
- `js/main.js` — nav-highlight, taalwissel-listeners, referral-placeholder
  (`processReferralReward`, bewust nog niet afgemaakt — zie TODO in de code).
- `data/translations.js` — `window.translations`, alle UI-teksten per taal
  (`data-i18n`-keys). Dit is het enige actieve vertaalsysteem.
- `css/global.css` (variabelen/basis), `css/components.css` (nav, footer,
  kaarten), `css/layout.css` (legacy, overschrijft nog delen van de huisstijl),
  `css/pages/*.css` per pagina.
- `backend/processor.js` — de nieuwspijplijn (zie hierboven).
- `backend/mailer.js` — verstuurt de wettelijk verplichte bevestigingsmail na
  aankoop (Strato SMTP). Alleen handmatig via `npm run mail-test`; er is geen
  automatische trigger vanuit een betaalwebhook.
- `data/` — `news_{lang}.json` (publieke teasers), `subscribers.json`
  (ongebruikt, altijd leeg).
- `supabase/functions/lemon-webhook/` — de Lemon Squeezy-webhook (Deno Edge
  Function). **Belangrijk:** wijzigingen hier moeten na het testen ook
  daadwerkelijk gedeployed worden (`supabase functions deploy lemon-webhook`)
  — git en de live functie kunnen uit sync raken (dat gebeurde eerder, zie
  Fase 1 in de audit-geschiedenis).
- `assets/` — logo's, iDEAL-svg, T&C-PDF.

## Git-branch-workflow

Sinds de audit van augustus 2026 werken we per verbeterfase in een eigen
branch, gebaseerd op de vorige fase (niet los op `master`, zodat elke fase de
staat van de vorige al bevat):

```bash
git checkout -b fase-N-naam   # vanaf de branch van fase N-1, of master als N=1
# ... bouwen, per onderdeel testen ...
git commit -m "Fase N: ..."   # pas na expliciete bevestiging
git checkout master
git merge fase-N-naam         # pas na aparte, expliciete toestemming
git push origin master        # dit zet de wijzigingen direct live
```

Vóór elke fase: controleer of er verschil zit tussen wat in git staat en wat
er eventueel al rechtstreeks live/gedeployed is aangepast (relevant gebleken
bij zowel de Lemon Squeezy-webhook als een pagina-specifieke
vertaal-override) — niet blind van git-historie uitgaan.

## Bekende openstaande punten

- `backend/generate-pdf.js` bevat geen geldige JavaScript (een per ongeluk
  gecommit shell-heredoc) en `backend/generate-pdf-en.js` is leeg. Beide
  worden nergens aangeroepen; nog niet opgeschoond.
- `js/main.js` → `processReferralReward()` is een bewuste placeholder: het
  referralsysteem is nooit afgemaakt (zie de TODO-comment in de code).
- Zie de audit-geschiedenis (per-fase commits) voor het volledige overzicht
  van wat al wel is opgelost.
