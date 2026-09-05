# BrightNews

Statische, meertalige (NL/EN/DE/FR/ES) nieuwssite met uitsluitend positief
nieuws. Draait op GitHub Pages via `CNAME` → brightnews.online. Geen server,
geen frameworks; wél één lichte buildstap in de GitHub Action die statische
artikelpagina's genereert. Accounts en premiumstatus via Supabase; betalingen
via **Stripe Managed Payments** (Merchant of Record, live sinds 2026-09-05).

**Tijdelijk geparkeerd** (sinds 2026-09-05, tot de lancering): publiek ziet
`binnenkort.html`; teamleden komen via de link op die pagina (`/?team=1`,
zet een localStorage-vlag) op de volledige site. De gate is een klein
scriptblok bovenin `index.html` — verwijderen bij livegang. Alleen de
homepage is dicht; artikelpagina's blijven bereikbaar (SEO).

## Hoe de pipeline werkt

Twee keer per dag (`.github/workflows/update-news.yml`, cron `0 0,12 * * *`,
Node 22 — supabase-js vereist 22+). Alle AI-verkeer loopt via
`backend/ai-adapter.js`: rollen i.p.v. modellen (**selectie** = Claude
Haiku 4.5 temp 0 · **schrijven** = Claude Sonnet 5 · **vertalen** = Haiku),
met een provider-fallback-keten (Anthropic primair; de Mistral-sleuf is
leeg tot er ooit een tweede key wordt aangesloten) en een robuuste
drietrapse JSON-parser (`verwerkAIResponse`).

1. **Fase A — verzamelen**: `backend/processor.js` haalt de RSS-feeds op
   (`rss-parser` mét `customFields` voor echte artikelfoto's).
   Kostenbeheersing vóór de AI: `data/seen_links.json` (max 8000) onthoudt
   alles wat al beoordeeld is; dunne snippets worden verrijkt via
   `content:encoded` of de artikelpagina; AFINN-sentiment filtert duidelijk
   negatieve Engelstalige items gratis weg.
2. **Fase B — gebundelde selectie**: kandidaten gaan per **10 tegelijk** in
   één call naar Haiku met de itereerbare rubric `backend/selectie-prompt.md`
   (goed gevoel 0-3, positieve formulering 0-3, relevantie 0-4). Het besluit
   valt **in code**: som ≥ 8 én alle minima ≥ 2. Elke beslissing (ook
   afwijzingen, mét reden) gaat naar `data/selectie-log.json` (roulerend,
   300) én append-only naar `data/selectie-archief.jsonl` (trainingsdata
   voor een toekomstige embedding-voorfilter/fine-tune). Wijzigt de
   prompthash, dan herkansen alle eerder afgewezen items automatisch.
   Circuit breaker: twee mislukte batches op rij stopt de selectie
   (items blijven herkansbaar).
3. **Fase C — moeder + vertaal**: per geselecteerd item schrijft Sonnet één
   Nederlandse moedertekst (titel, korte samenvatting 60-150 w, lange versie
   tot ±500 w — **bron-getrouw**, nooit meer dan de bron draagt — alt, meta,
   categorie); Haiku vertaalt die naar de andere vier talen. Alle talen
   vertellen zo hetzelfde verhaal. **Atomair**: eerst alle 5 talen naar de
   Supabase-tabel `articles_full` (de echte paywall; premium leest via
   `get_full_article()`), pas daarna de ~60-woorden-teaser in de publieke
   `data/news_{taal}.json`. Mislukt iets, dan wacht het hele artikel op de
   volgende run.
4. **Dagoverzichten**: `backend/digest.js` schrijft per categorie één
   artikel over de top-artikelen van gisteren (top 5 op selectiescore,
   aangevuld tot max 8; minimaal 3), met [n]-verwijzingen naar de besproken
   artikelen. Zelfde moeder+vertaal-aanpak; tone-of-voice itereerbaar in
   `backend/digest-prompt.md`; log in `data/digest-log.json`. Digests zijn
   gewone artikelen (type `digest`) met badge, ruimere gratis teaser
   (~100 w) en dezelfde paywall.
5. Geen feed-afbeelding? Dan `og:image` van de artikelpagina, daarna de
   Unsplash-fallback per categorie.
6. `backend/generate-articles.js` genereert per artikel × taal een statische
   pagina `articles/{taal}/{slug}-{id}.html` (canonical, hreflang, OG,
   JSON-LD). Incrementeel via `articles/manifest.json`; **eenmaal
   gegenereerde pagina's worden nooit verwijderd**.
7. `backend/generate-marketing-feed.js` schrijft `data/marketing-feed.json`
   (beste artikelen + digests per taal, met links) — input voor de
   marketing-agent (zie `MARKETING-PLAN.md`).
8. `backend/generate-sitemap.js` bouwt `sitemap.xml` + `robots.txt`.
9. De Action committet alle data/artefacten terug (`[skip ci]`; push naar
   `$GITHUB_REF_NAME`, dus een dispatch vanaf een testbranch raakt master
   nooit). `data/last_run.json` bevat de runstatistieken (aiCalls, tokens,
   perProvider, uitval).

## Frontend in het kort

- Alle scripts laden met `defer`; Supabase-client uit `js/supabase-init.js`
  (self-hosted bundle, bewust geen CDN).
- Premiumcheck: `checkUser()` leest `profiles` (RLS); volledige tekst via
  `get_full_article()` (server-side premium-check). Statische pagina's:
  `upgradeStaticArticle()`.
- Digest-weergave: badge "Dagoverzicht", klikbare bronnenlijst
  (`.digest-refs`, overleeft de premium-upgrade), eigen AI-disclaimer.
- Deelknoppen wijzen naar de statische artikel-URL zodra die bestaat.
- Cookiebanner via `checkCookies()`; GA pas na acceptatie (Consent Mode).
- Service worker (`sw.js`): network-first voor HTML, cache-first voor de
  precache-assets; **CACHE_NAME bumpen** bij wijziging aan die assets.
- Betalingen: `startCheckout(plan)` leest `js/betaal-config.js`
  (provider `stripe`; Lemon Squeezy is volledig afgebouwd).

## Lokaal draaien en testen

```bash
npm ci
cp .env.example .env         # ANTHROPIC_API_KEY + SUPABASE_SERVICE_ROLE_KEY
npm start                    # = node backend/processor.js (Node 22)
node backend/digest.js --dry-run   # digest-selectie zonder AI/DB
node backend/generate-articles.js
node backend/generate-marketing-feed.js
node backend/generate-sitemap.js
python3 -m http.server 8000  # frontend: open http://localhost:8000/
```

Er zijn geen geautomatiseerde tests (behalve ESLint: `npm run lint`).
Let op de parkeer-gate: zonder team-vlag stuurt de homepage je naar
`binnenkort.html` — klik de teamlink of open `/?team=1`.

### Benodigde env-vars / secrets

| Variabele | Waar | Zonder deze key |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub Secret + lokaal `.env` | Adapter meldt "geen AI-provider"; run faalt netjes |
| `MISTRAL_API_KEY` | optioneel (fallback-sleuf) | Keten heeft dan geen reserveprovider — bewust leeg sinds 2026-09-06 |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secret + lokaal `.env` | Run breekt bewust hard af (voorkomt permanent verlies van volledige teksten) |
| `STRIPE_WEBHOOK_SECRET` | Supabase Edge Function env (stripe-webhook) | Webhook weigert alles |

`.env` staat in `.gitignore` en mag nooit gecommit worden.

## Mappenstructuur

- `*.html` (root) — vaste pagina's; `index.html` = nieuwsfeed + SPA-detail
  (`?id=`) + parkeer-gate; `binnenkort.html` = parkeerpagina.
- `articles/{taal}/…` — statische artikelpagina's + `manifest.json`
  (nooit snoeien).
- `index.js` — frontend-kern; `js/auth.js` — auth/profiel/promocodes/
  checkout; `js/betaal-config.js` — provider-switch.
- `data/` — `news_{taal}.json`, `translations.js` (5 talen),
  `seen_links.json`, `last_run.json`, `selectie-log.json`,
  `selectie-archief.jsonl`, `digest-log.json`, `marketing-feed.json`.
- `backend/` — `processor.js` (pipeline), `ai-adapter.js` (AI + fallback),
  `selectie-batch.js`, `selectie-prompt.md`, `digest.js`,
  `digest-prompt.md`, `generate-articles.js`, `generate-marketing-feed.js`,
  `generate-sitemap.js`, `mailer.js` (legacy).
- `supabase/` — `config.toml`, `functions/stripe-webhook/` (live),
  `schema-snapshot.sql` (bijhouden bij elke schemawijziging!).
- `assets/` — logo's, PWA-iconen, T&C-PDF.

## Git-workflow

Zie `CLAUDE.md`: branch per klus (`maarten/<klus>` of `erik/<klus>`),
`master` = direct live; backend-/betaal-/Supabase-wijzigingen via PR met de
ander als meekijker. Supabase-functions zijn pas live ná een aparte deploy
(Management-API) — check bij twijfel of git en live in sync zijn.

## Openstaande punten

Zie `BRIGHTNEWS-OVERDRACHT-FABLE.md` (actueel en volledig) en
`MARKETING-PLAN.md` (route naar lancering, break-even ≈ 20-28 abonnees).
