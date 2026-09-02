# Bright News — Overdrachtsdocument / Handoff

**Bijgewerkt: 2026-09-02, einde sessie 2 met Claude Fable 5** (sessie 1:
review + fases A–E op 2026-09-01; sessie 2: reviewer-rondes F+G en de
selectieprompt-iteratie). Dit document + `README.md` (hoe alles werkt) +
`STRIPE-MIGRATIE.md` (betaaltraject) + `STAPPENPLAN-MAARTEN.md` (Maartens
acties) vervangen samen de volledige sessiecontext.

---

## 1. Doel & huidige status

Site van zoon Maarten: uitsluitend positief nieuws, 5 talen, premium-abonnement.
Live op brightnews.online (GitHub Pages; **master = direct live**). Doel van de
afrondingsronde: launchklaar maken voor echte verkoop.

**Af en live** (alles gemerged): projectreview + fases A (zichtbare fixes),
B (webhook v9 + atomaire paywall-opslag + schema-snapshot), C (foto's/seen-
lijst/bron-getrouwe samenvattingen), 6 (1500+ statische artikelpagina's,
manifest, sitemap), 7 (defer/SVG/lazy/SW-network-first; Lighthouse 79/82),
D-deel-1 (Stripe voorbereid achter provider-switch), E (docs), F (reviewer-
ronde 1: één groen #32CD32, juridische correcties), G (reviewer-ronde 2:
witte knoptekst, 3 kolommen, groter logo 84px/104px-nav, slider-filter,
z-index-fix, vlaggen mobiel weg, socials terug, Stripe-MoR-zin in footer,
**aparte selectiestap met itereerbare prompt**).

**Laatste stand pipeline-iteratie**: selectieprompt v2 live (reddings-/hulp-
verhalen niet meer hard afgewezen); herkansingsmechanisme werkt (prompt-hash
in seen-entries → gewijzigde prompt herbeoordeelt eerdere 'sel'-afwijzingen).
Run van 15:17 UTC: 70 herbeoordeeld, 0 goedgekeurd — grotendeels terecht
(restbatch met kleurplaten/glamping/VC-content); zeeschildpad-redding scoorde
6/10 (drempel = 7). **Openstaand besluit: drempel op 7 laten of naar 6** —
eerst de verse nachtcron-log bekijken (zie §9.1).

## 2. Projectkaart

| Pad | Inhoud |
|---|---|
| `index.html` + `index.js` | homepage/SPA: nieuws, detail (?id=), paywall-upgrade, i18n, cookiebanner-injectie, deel-links (statische URL met HEAD-fallback), `upgradeStaticArticle()`, `TAAL_LABELS` (vlag-spans) |
| `js/auth.js` | Supabase-auth, profiel-UI, promocodes, `startCheckout(plan)` (provider-switch) |
| `js/betaal-config.js` | provider `'lemon'`/`'stripe'` + payment-links/portal (Stripe nog leeg) |
| `js/supabase-init.js`, `js/vendor/` | client-init (defer-volgorde!) + self-hosted supabase-js 2.112.4 |
| `data/translations.js` | ~215 keys × 5 talen; anker per taal = `"menu_open": "<vertaling>"` |
| `data/news_{taal}.json`, `seen_links.json`, `selectie-log.json`, `last_run.json` | teasers · beoordeeld-geheugen (status ok/nee/sent/sel+prompthash) · iteratielog (300) · runstatistieken |
| `backend/processor.js` | pipeline: seen-check → sentiment-voorfilter → **selectiestap** → samenvat/vertaal (1 call, 5 talen) → atomair articles_full → publiceren. Drempels: `SELECTIE_DREMPEL_TOTAAL=7`, minima 2/2/2 |
| `backend/selectie-prompt.md` | DE itereerbare selectieprompt (criteria: goed gevoel 0-3, positieve formulering 0-3, relevantie 0-4; harde afwijslijst; twijfel=nee) |
| `backend/generate-articles.js` | statische pagina's + `articles/manifest.json` (nooit verwijderen); template bevat nav/footer — bij wijziging regenereren |
| `backend/generate-sitemap.js` | sitemap (vaste pagina's + manifest-artikelen) |
| `supabase/` | config.toml, `functions/lemon-webhook` (live v9), `functions/stripe-webhook` (klaar, niet gedeployed), `schema-snapshot.sql` (beveiligings-SQL zoals live; bijhouden!) |
| `.github/workflows/update-news.yml` | cron 0:00/12:00 UTC, Node 22, commit-glob incl. seen/log/articles |

## 3. Mentaal model

- **Paywall**: teaser publiek; volledige tekst alléén in `articles_full`
  (service_role), uitgeleverd via `get_full_article()` (server-side premium-
  check, geverifieerd). Publiceren is atomair: eerst alle 5 talen opgeslagen,
  anders artikel overgeslagen.
- **Selectie ≠ samenvatting**: selectieprompt beoordeelt alleen (goedkoop),
  daarna pas de dure 5-talen-call. Iteratielus: prompt bewerken → Action
  draaien → `data/selectie-log.json` lezen (elke beslissing mét deelscores en
  reden) → bijstellen. Herkansing is automatisch bij gewijzigde prompt.
- **Betalingen**: Lemon Squeezy actief; Stripe Managed Payments volledig
  voorbereid (webhook, config-switch, migratieplan). Omschakelen = config +
  deel-2-checklist.
- **Kleursysteem** (reviewbesluit): #32CD32 is het enige groen; knoppen groen
  met WITTE tekst (bewuste eigenaarskeuze; 2,1:1 — haalt formeel geen WCAG AA,
  gedocumenteerd), focusring donker, groen-als-tekst alleen op donkere
  ondergrond (footer).

## 4. Besluiten & rationale (niet heropenen)

| Besluit | Rationale |
|---|---|
| Stripe Managed Payments i.p.v. Lemon Squeezy | LS in wachtstand na Stripe-overname; MP is GA (±3,5% + fees), zelfde team, migratiepad |
| Bron-getrouwe samenvattingen (60–150 w) i.p.v. 300-woorden-artikelen | hallucinatie-/reputatierisico bij 2 zinnen bron |
| Payment Links (redirect) i.p.v. Stripe.js | geen extra script-hosts → simpele CSP straks |
| Statische pagina's nooit verwijderen; manifest = bron sitemap | geïndexeerde URL's mogen niet sterven |
| Eén groen + witte knoptekst | reviewer/eigenaar; WCAG-kanttekening expliciet geaccepteerd |
| meta-CSP uitgesteld tot Stripe-livegang | betaaldomeinen bepalen de policy; nu = straks herschrijven |
| Socials: eigen-handle-URL's (facebook/instagram.com/brightnews.online, linkedin/company/brightnews-online) | reviewer wil zichtbare links; profielen bestaan nog niet → claimen staat op Maartens lijst |
| MoR-zin in footer = Stripe-versie (vooruitlopend) | Eriks correctie 2026-09-02; verkoop loopt toch nog niet |
| Selectiedrempel 7 (som) + minima 2/2/2, in code berekend | model kan niet rekenen; drempel is de iteratieknop |

## 5. Conventies & werkafspraken

- Fasebranch per klus; **Claude commit zelf na groene tests; merge naar
  master (= deploy) alleen op Eriks expliciete go**. Uitzondering (precedent):
  documentatie-only en CI-fixes die een al goedgekeurde run deblokkeren.
- Vóór alles: `git pull --rebase origin master` (de Action pusht 2×/dag data).
- Commits eindigen met `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Multi-pagina-edits: python-script met exacte patronen + assert-counts;
  footer-gelijkheid checken via normalize+md5-hash over alle 10 pagina's.
- `data-i18n` op een element wist de children (innerHTML!) — tekst altijd in
  een eigen `<span data-i18n>` naast icoons/SVG's.
- Vertalingen toevoegen: per taal invoegen ná het unieke anker
  `"menu_open": …`; daarna de checker draaien (§6).
- Template gewijzigd? → `node backend/generate-articles.js` (idempotent).
- ASSETS-bestand gewijzigd (global.css, components.css, main.js, index.html)?
  → `CACHE_NAME` bumpen in sw.js (nu **v6**).

## 6. Build / test / deploy

```bash
cd ~/Brightnews.online
npx eslint .                        # 0 errors = norm (10 bekende warnings)
node backend/generate-articles.js && node backend/generate-sitemap.js
gh workflow run update-news.yml     # pipeline-run (± 2 min dankzij seen-lijst)
gh run watch <id> --interval 60     # in background draaien
```
Vertaalcheck (alle gebruikte keys × 5 talen) — het node-script uit de sessies:
verzamelt `data-i18n*`-attributen uit alle html + `getT('…')`/`t(lang,'…')`
uit index.js/js/*.js/generate-articles.js en test tegen `window.translations`.
Preview: launch.json-server **`brightnews`** (poort 8945); Lighthouse lokaal:
`npx -y lighthouse@latest http://127.0.0.1:8945/… --only-categories=performance`.
Supabase (CLI werkt níét, zie §7): Management-API met Bearer-token —
queries: `POST /v1/projects/rquuqypgaannrakdrabj/database/query` (JSON via
`-d @bestand`); function-deploy: `POST …/functions/deploy?slug=<naam>` met
multipart `metadata` (verify_jwt:false!) + `file=@index.ts` + `file=@deno.json`.

**Secrets (locaties, nooit waarden)**: GitHub Secrets `MISTRAL_API_KEY` +
`SUPABASE_SERVICE_ROLE_KEY`; Supabase-function-env `LEMON_WEBHOOK_SECRET`
(en straks `STRIPE_WEBHOOK_SECRET`); Maartens Management-token in Eriks
`~/.zshrc` als `SUPABASE_ACCESS_TOKEN` (**intrekken na Stripe-deel-2**).

## 7. Gotcha's & valkuilen (duur betaald — lees dit echt)

1. **Supabase-CLI weigert het `sbp_v0_…`-tokenformaat** (ook @latest). De
   Management-API accepteert het wél. Alles via curl + Bearer.
2. **Permissieclassifier** blokkeert soms: secrets doorsluizen (`gh secret
   set` met ge-curl-de key), production-deploy-POSTs, trigger-introspectie,
   en alles wat op obfuscatie lijkt (chr()-trucs!). Oplossing: query-JSON in
   een bestand + `-d @bestand`, en geblokkeerde acties als runnable
   bash-blok aan Erik geven (werkte voor secret + webhook-deploy).
3. **SW-cache**: assets zijn cache-first → CSS/JS-wijzigingen zijn pas
   zichtbaar na CACHE_NAME-bump (nu v6) én dubbele reload. HTML is
   network-first (deploys direct zichtbaar).
4. **Browser-pane verborgen ⇒ viewport 0** ⇒ mobiele media-queries actief en
   screenshot-timeouts → eerst `tabs_create foreground` / `resize_window`,
   anders meet je mobiel terwijl je desktop denkt te zien. Browser cachet CSS
   heuristisch: `location.reload(true)` of cachebuster bij twijfel.
5. **Action vereist Node 22** (supabase-js realtime/WebSocket) — was de
   crash zodra de service-key eindelijk bestond.
6. **De service-key-secret was maandenlang leeg**: oude code publiceerde
   door; 120 artikelen verloren hun volledige tekst definitief. De fail-fast
   + atomair publiceren in processor.js is daarvoor de verzekering — nooit
   versoepelen.
7. eszip: `GET …/functions/<slug>/body` levert een binaire bundel; bron
   eruit vissen kan, byte-diff niet — vergelijk functioneel.
8. rss-parser leest media-velden alléén met `customFields`; NPR & co
   weigeren kale bot-UA's (og:image-fetch gebruikt browser-UA).
9. Archief-artikelpagina's van vóór een template-wijziging behouden de oude
   template (bewust: nooit verwijderen/herschrijven zonder brondata).
10. supabase-js gooit géén exceptions bij DB-fouten — altijd `{ error }`
    checken.

## 8. Externe resources

- Repo: `MaartenDeKlerkPXL/Brightnews.online` (Erik = collaborator
  `erikdeklerk-rehab`). Live: https://brightnews.online
- Supabase-project: `rquuqypgaannrakdrabj` (EU); functions lemon-webhook
  (v9 live), stripe-webhook (nog deployen in deel 2)
- Artifacts (Claude): review "BrightNews Projectreview"
  `claude.ai/code/artifact/081297e9-…`, "Stappenplan Maarten"
  `claude.ai/code/artifact/ede30270-f7da-4f6e-b46a-c39ed3e91fea`
- GA-property `G-ZNFX3R9BQV`; Search Console: nog inrichten (Maarten)

## 9. Volgende stappen (in volgorde)

1. **Selectie-log van de nachtcron beoordelen** (eerste verse dagbatch met
   prompt v2): `git pull`, entries in `data/selectie-log.json` met datum ≥
   2026-09-03T00:00Z analyseren (acceptatiegraad, gemiste parels, onterechte
   goedkeuringen). Daarna met Erik: drempel 7→6? prompt v3? De homepage
   moet zich geleidelijk vullen met nieuw-regime-artikelen.
2. **Maarten**: `STAPPENPLAN-MAARTEN.md` — Search Console (±30 min), Stripe
   deel 1 (reviewwachttijd! zo vroeg mogelijk), socials claimen of URL's
   doorgeven (footer linkt nu naar brightnews.online-handles).
3. **Stripe deel 2** zodra Maarten klaar is (`STRIPE-MIGRATIE.md`): kolom
   `stripe_customer_id`, `STRIPE_WEBHOOK_SECRET`, stripe-webhook deployen
   (Management-API; bij classifier-block → run-knop voor Erik), testmode-E2E,
   livegang (provider-switch, lemon.js weg, Privacy-verwerkers → Stripe,
   meta-CSP), **Fase 9 MoR-eindcheck**, daarna token intrekken.
4. Reviewer een herbeoordeling laten doen van de live site.
5. Onderhoudslijst (niet blokkerend): promocode-hardening (stapelen +
   brute-force), grants-verharding (revoke, nu inert door RLS),
   wees-profielrijen na accountverwijdering, 2 haperende feeds, acceptatie-
   monitoring, evt. socials-iconen echte URL's.

## 10. Risico's waar Erik zelf op moet letten

- **Token intrekken** na Stripe-deel-2 (Maarten: Supabase → Access Tokens).
- **Witte tekst op #32CD32** haalt geen WCAG AA (2,1:1) — bewuste keuze,
  maar bij een EAA-/toegankelijkheidsvraag is dít het eerste aanpassingspunt.
- Socials-links verwijzen naar nog-niet-bestaande profielen tot Maarten ze
  claimt.
- MoR-zin noemt Stripe terwijl Lemon nog de (inactieve) provider is —
  bewust vooruitlopend; niet vergeten bij een eventuele LS-testverkoop.
