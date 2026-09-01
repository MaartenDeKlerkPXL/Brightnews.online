# BrightNews

Statische, meertalige (NL/EN/DE/FR/ES) nieuwssite met uitsluitend positief
nieuws. Draait op GitHub Pages via `CNAME` → brightnews.online. Geen server,
geen frameworks; wél één lichte buildstap in de GitHub Action die statische
artikelpagina's genereert. Accounts en premiumstatus via Supabase. Betalingen
lopen via Lemon Squeezy (Merchant of Record); de migratie naar **Stripe
Managed Payments** is voorbereid — zie `STRIPE-MIGRATIE.md`.

## Hoe de pipeline werkt

Twee keer per dag (`.github/workflows/update-news.yml`, cron `0 0,12 * * *`,
Node 22 — supabase-js vereist 22+):

1. `backend/processor.js` haalt ~33 RSS-feeds op (`rss-parser`, mét
   `customFields` zodat `media:content`/`media:thumbnail`/`content:encoded`
   echt gelezen worden — de bron van echte artikelnfoto's).
2. **Kostenbeheersing vóór de AI**: `data/seen_links.json` (max 8000 links)
   onthoudt alles wat al beoordeeld is — geaccepteerd ('ok'), afgewezen
   ('nee') of door de sentiment-voorfilter ('sent', AFINN-score ≤ −3, alleen
   betrouwbaar voor Engels; niet-Engels gaat gewoon door). Alleen echt nieuwe
   items kosten een Mistral-call.
3. Per nieuw item gaat titel + snippet naar Mistral (`mistral-small-latest`,
   `responseFormat: json_object`, retry met backoff + 500 ms pacing). Het
   model bepaalt `isBright`, categoriseert en schrijft per taal een
   **bron-getrouwe samenvatting** (max ±150 woorden, expliciet verbod op
   toegevoegde feiten — bewust géén opgeblazen artikel uit twee zinnen bron).
4. **Cross-taal-validatie**: publiceren gebeurt alleen als alle 5 talen
   compleet zijn — de taalbestanden kunnen niet meer uit de pas lopen.
5. **Echte paywall (atomair)**: eerst gaat de volledige tekst voor álle 5
   talen naar de Supabase-tabel `articles_full` (service_role); mislukt dat,
   dan wordt het artikel helemaal niet gepubliceerd. Pas daarna komt de
   teaser (~60 woorden, `maakTeaser`) in de publieke `data/news_{taal}.json`.
   Zonder `SUPABASE_SERVICE_ROLE_KEY` breekt de run bewust hard af.
6. Geen feed-afbeelding? Dan probeert de pipeline `og:image` van de
   artikelpagina zelf (alleen voor geaccepteerde artikelen); daarna pas de
   Unsplash-fallback per categorie.
7. `backend/generate-articles.js` genereert per artikel × taal een statische
   pagina `articles/{taal}/{slug}-{id}.html` (canonical, hreflang, OG,
   JSON-LD NewsArticle). Incrementeel via `articles/manifest.json`;
   **eenmaal gegenereerde pagina's worden nooit verwijderd** (geïndexeerde
   URL's blijven bestaan).
8. `backend/generate-sitemap.js` bouwt `sitemap.xml` (vaste pagina's + alle
   artikel-URL's uit het manifest) en `robots.txt`.
9. De Action committet `data/news_*.json`, `data/seen_links.json`,
   `data/last_run.json` (kostenstatistieken per run), `articles/`,
   `sitemap.xml` en `robots.txt` terug naar `master` (`[skip ci]`;
   `git pull --rebase` vóór de push zodat een lange run niet strandt).

## Frontend in het kort

- Alle scripts laden met `defer`; de Supabase-client komt uit
  `js/supabase-init.js` (ná de self-hosted bundle `js/vendor/supabase-js-*.js`
  — bewust geen CDN met zwevende versie voor het script dat auth-tokens
  hanteert).
- Premiumcheck: `checkUser()` leest de `profiles`-tabel (RLS; nooit
  `user_metadata`). Volledige tekst via de Postgres-functie
  `get_full_article()` die zelf server-side de premium-status checkt.
  Op statische artikelpagina's doet `upgradeStaticArticle()` (index.js)
  hetzelfde client-side.
- Deelknoppen wijzen naar de statische artikel-URL zodra die bestaat
  (HEAD-check), anders `?id=`; oude `?id=`-links blijven altijd werken.
- Cookiebanner wordt op élke pagina dynamisch geïnjecteerd door
  `checkCookies()` (index.js); Google Analytics laadt pas na acceptatie
  (Consent Mode default denied).
- Service worker (`sw.js`): network-first voor HTML (deploys direct
  zichtbaar), cache-first voor statische assets; geen JSON/premium in cache.
- Iconen zijn inline SVG (geen Font Awesome/CDN meer).
- Betaal-abstractie: `startCheckout(plan)` in `js/auth.js` leest
  `js/betaal-config.js` (provider-switch Lemon/Stripe).
- Verwijderde pagina's/bestanden: `launch.html`, `data/subscribers.json`,
  `backend/generate-pdf.js` (was een per ongeluk gecommit shell-fragment).

## Lokaal draaien en testen

```bash
npm ci
cp .env.example .env         # MISTRAL_API_KEY + SUPABASE_SERVICE_ROLE_KEY
npm start                    # = node backend/processor.js (Node 22 aanbevolen)
node backend/generate-articles.js
node backend/generate-sitemap.js
python3 -m http.server 8000  # frontend: open http://localhost:8000/index.html
```

Er zijn geen geautomatiseerde tests (behalve ESLint: `npm run lint`).
Verifiëren gebeurt in de browser (console + Network-tab) — de statische
artikelpagina's vereisen een http-server (absolute paden), geen `file://`.

### Benodigde env-vars / secrets

| Variabele | Waar | Zonder deze key |
|---|---|---|
| `MISTRAL_API_KEY` | GitHub Secret + lokaal `.env` | Pipeline crasht direct |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secret + lokaal `.env` | Run breekt bewust hard af (voorkomt permanent verlies van volledige teksten — dat is vóór 2026-09-01 daadwerkelijk gebeurd) |
| `LEMON_WEBHOOK_SECRET` | Supabase Edge Function env (lemon-webhook) | Webhook weigert alles met een 500 |
| `STRIPE_WEBHOOK_SECRET` | Supabase Edge Function env (stripe-webhook) — pas bij activatie | idem |
| `EMAIL_USER` / `EMAIL_PASS` | alleen lokaal, legacy `npm run mail-test` | Alleen relevant voor de oude mailer; Stripe (MoR) verstuurt straks zelf de aankoopbevestigingen |

`.env` staat in `.gitignore` en mag nooit gecommit worden.

## Mappenstructuur

- `*.html` (root) — de vaste pagina's; `index.html` is de nieuwsfeed + SPA-
  artikeldetail (`?id=`).
- `articles/{taal}/…` — gegenereerde statische artikelpagina's +
  `manifest.json` (id → slugs/datum; bron voor de sitemap; nooit snoeien).
- `index.js` — frontend-kern: taal/i18n, nieuws laden, detailweergave,
  paywall, statische-pagina-upgrade, delen, cookieconsent, filters,
  `openCustomerPortal`.
- `js/auth.js` — Supabase-auth, profiel-UI, promocodes (RPC), `startCheckout`.
- `js/betaal-config.js` — provider-switch + checkout-/portal-links.
- `js/supabase-init.js`, `js/vendor/` — clientinit + self-hosted supabase-js.
- `data/` — `news_{taal}.json` (publieke teasers), `translations.js` (alle
  UI-teksten, 5 talen), `seen_links.json`, `last_run.json`.
- `backend/` — `processor.js` (pipeline), `generate-articles.js`,
  `generate-sitemap.js`, `mailer.js` (legacy), `generate-pdf-en.js`
  (eenmalig gebruikt voor de voorwaarden-PDF).
- `supabase/` — `config.toml`, `functions/lemon-webhook/` (live),
  `functions/stripe-webhook/` (klaar, wacht op activatie),
  `schema-snapshot.sql` (de beveiligings-SQL zoals live vastgelegd —
  bijhouden bij elke schemawijziging!).
- `assets/` — logo's, PWA-iconen (`icon-192/512.png`), T&C-PDF.

## Git-workflow

Per verbeterfase een eigen branch; `master` = direct live (GitHub Pages):

```bash
git checkout -b fase-X-naam
# bouwen, testen, committen (pas na groene tests)
git checkout master && git pull --rebase && git merge fase-X-naam
git push origin master   # = deploy
```

Wijzigingen aan een Supabase-function zijn pas live ná een aparte deploy
(Management-API of `supabase functions deploy <naam> --no-verify-jwt`) —
git en live kunnen anders uit sync raken; check dat bij twijfel eerst.

## Openstaande punten

Zie `BRIGHTNEWS-OVERDRACHT-FABLE.md` voor het actuele, volledige overzicht
(o.a. Stripe-activatie via `STRIPE-MIGRATIE.md`, sitemap indienen bij Google
Search Console, promocode-hardening, grants-verharding, feed-gezondheid).
