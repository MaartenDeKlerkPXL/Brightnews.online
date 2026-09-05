# Bright News — Overdrachtsdocument / Handoff

**Bijgewerkt: 2026-09-04, sessie 4 met Claude Fable 5** (sessie 1:
review + fases A–E op 2026-09-01; sessie 2: reviewer-rondes F+G en de
selectieprompt-iteratie; sessie 3: fases H+I — selectiepipeline werkend
gekregen, feedsanering, promocode-hardening live). Dit document +
`README.md` (hoe alles werkt) + `STRIPE-MIGRATIE.md` (betaaltraject) +
`STAPPENPLAN-MAARTEN.md` (Maartens acties) vervangen samen de volledige
sessiecontext.

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

**Laatste stand pipeline-iteratie (fase H, 2026-09-02/03)** — drie bugs
gevonden via het selectie-log en gefixt, alles gemerged en live:
1. **WordPress-trailer** "The post … appeared first on <bron>." in
   `contentSnippet` (o.a. héél GoodNewsNetwork) las het model als
   "commerciële zelfpromotie" → kernmateriaal 0/10. Fix: `schoonSnippet()`
   strips de trailer vóór sentiment, selectie én samenvatting. Bewijs dat
   het werkte: zeeschildpad-redding ging van 6/10 naar 9/10 en is
   **gepubliceerd** (eerste artikel onder het nieuwe regime).
2. **Snippetloze items** (Nature-feed: 22 van 39 calls) verspilden AI-calls
   op "geen inhoud". Fix: <25 tekens ná schoning → skip zonder call, status
   `leeg`, teller `tekstTeKort` in last_run.json.
3. **Modelveto op eigen goedkeuring**: item met 3/3/2=8 (Pokémon-fans helpen
   opgelicht kind) kreeg `besluit: nee` met rekenfout "relevantie te laag
   (2)". Fix: `besluit`-veld uit de prompt-JSON; drempel+minima in code zijn
   als enige beslissend. Model scoort en motiveert alleen nog.
**Vervolg (fase H2–H4)**: de besluit-in-code-wijziging veroorzaakte een
nul-collaps bij mistral-small (62–66 van alle items op totaal 0, incl.
items die als ijkvoorbeeld ín de prompt stonden — het model volgde de
voorbeelden niet). Structurele oplossing (fase H4, live): **selectie op
`mistral-medium-latest` met `temperature: 0`** (const `SELECTIE_MODEL`),
prompt v5 met besluit-veld als afgedwongen dénkvolgorde (code beslist
onverminderd zelf), kernregel kern-vs-aanleiding prominent vóór de
afwijslijst, ijkvoorbeelden vóór de outputinstructie. **Resultaat run
09:10 UTC: gezonde scorespreiding (0 t/m 9), 21 artikelen gepubliceerd**;
kat-stationschef, Picasso en Pokémon kwamen alle drie terecht door.

**Fase I (2026-09-03, alles live)**:
1. **Feedsanering**: 34 → 17 feeds. Structurele nul-bronnen weg (BI,
   Fortune, Nature-ToC, Mindbodygreen c.s.); nieuw en live getest:
   Reasons to be Cheerful, Optimist Daily, Squirrel News, Good Good Good,
   YES! Magazine. Aanleiding: ~80% van de calls ging naar afwijslijst-
   content, en de v5-missers (Tado, kleurplaten, 4× MBG) kwamen allemaal
   uit geschrapte bronnen.
2. **Dunne-snippetverrijking** (<200 tekens): eerst `content:encoded` uit
   de feed (gratis; YES levert 6k tekens), anders eerste alinea's van de
   artikelpagina via `haalArtikelTekst()` (browser-UA, 403 = niet fataal).
   Teller `tekstOpgehaald` in last_run.json.
3. **Promocode-hardening UITGEVOERD op live** (hardening-2026-09-03.sql,
   geverifieerd): promo_redemptions (1× per code per gebruiker, reason
   already_redeemed), promo_attempts (max 10/uur, reason rate_limited),
   redeem_promo_code v2, wees-profielen-trigger + eenmalige schoonmaak
   (0 wezen over). Frontend-keys + vertalingen ×5 gemerged;
   schema-snapshot.sql bijgewerkt naar de live stand.
4. **8 misplaatste v5-artikelen verwijderd** (eenmalige uitzondering op
   "nooit verwijderen", expliciete go van Erik; ze waren minuten oud):
   uit 5 taal-JSON's, manifest, 40 statische pagina's, sitemap én
   articles_full (40 rijen via Management-API). seen-status blijft 'ok'
   zodat ze niet terugkeren.

**Drempelbesluit**: op 7 laten. De v5-missers scoorden precies 7 maar
kwamen allemaal uit inmiddels geschrapte bronnen; de parels zaten op 8–9.
Optie 7→8 pas heroverwegen met een paar dagen data onder het nieuwe
feedregime (zie §9.1).

## 2. Projectkaart

| Pad | Inhoud |
|---|---|
| `index.html` + `index.js` | homepage/SPA: nieuws, detail (?id=), paywall-upgrade, i18n, cookiebanner-injectie, deel-links (statische URL met HEAD-fallback), `upgradeStaticArticle()`, `TAAL_LABELS` (vlag-spans) |
| `js/auth.js` | Supabase-auth, profiel-UI, promocodes, `startCheckout(plan)` (provider-switch) |
| `js/betaal-config.js` | provider `'lemon'`/`'stripe'` + payment-links/portal (Stripe nog leeg) |
| `js/supabase-init.js`, `js/vendor/` | client-init (defer-volgorde!) + self-hosted supabase-js 2.112.4 |
| `data/translations.js` | ~215 keys × 5 talen; anker per taal = `"menu_open": "<vertaling>"` |
| `data/news_{taal}.json`, `seen_links.json`, `selectie-log.json`, `last_run.json` | teasers · beoordeeld-geheugen (status ok/nee/sent/leeg/sel+prompthash) · iteratielog (300) · runstatistieken |
| `backend/processor.js` | pipeline: seen-check → sentiment-voorfilter → **selectiestap** → samenvat/vertaal (1 call, 5 talen) → atomair articles_full → publiceren. Drempels: `SELECTIE_DREMPEL_TOTAAL=7`, minima 2/2/2 |
| `backend/selectie-prompt.md` | DE itereerbare selectieprompt (criteria: goed gevoel 0-3, positieve formulering 0-3, relevantie 0-4; harde afwijslijst; twijfel=lagere score; besluit valt in code, niet in de prompt) |
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
  → `CACHE_NAME` bumpen in sw.js (nu **v8**). Sinds v8 haalt de install de assets met `cache: 'reload'` vers van het netwerk — dat lek (v7 bakte bij recente bezoekers het oude logo-PNG in via de HTTP-cache, max-age 600) is gedicht.

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
   zichtbaar na CACHE_NAME-bump (nu v8) én dubbele reload. HTML is
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

1. **Runs blijven volgen** (beoordeeld t/m 2026-09-04 ochtend): het
   backlog van de nieuwe feeds is binnen — run 2026-09-03T16:15 accepteerde
   72/91, kwaliteit steekproefsgewijs goed (Squirrel 23/23, GGG 21/24,
   R2bC 9/9). Nachtcron 04:10 verloor 14 kandidaten aan Mistral-429's
   (mistral-medium = krapper limiet); fase J fixte de pacing (1500ms,
   retry 4x basis 5s) — check of de eerstvolgende cron weer normaal
   beoordeelt. Monitoringpunten: Squirrel News publiceert digest-edities
   (meerdere verhalen per item, komt als één artikel door) en het
   drempelbesluit 7 vs 8 na een paar dagen regulier regime.
1b. **Fase J (2026-09-04, live)**: logo-mysterie opgelost — het PNG was
   voor 82% transparante marge (merk 70 van 400px), dus "84px" toonde
   ~15px woordmerk. PNG gecropt naar 463×94, attributen in homepage +
   template (750 pagina's geregenereerd), .nav-logo 60px, CACHE_NAME v8
   (v7 direct opgevolgd: install-fetches omzeilen nu de HTTP-cache).
   Live geverifieerd: SW-cache v8, logo 296×60 gerenderd.
   Erik moet lokaal evt. dubbel reloaden om v7 te zien.
2. **Maarten**: `STAPPENPLAN-MAARTEN.md` — Search Console (±30 min), Stripe
   deel 1 (reviewwachttijd! zo vroeg mogelijk), socials claimen of URL's
   doorgeven (footer linkt nu naar brightnews.online-handles).
3. **Stripe deel 2 — stand 2026-09-04 (fase K)**: payment links geverifieerd
   en in betaal-config.js (Glow €2,95/mnd …3ks00, Shine €24,95/jr …3ks01,
   beide 30 dagen trial — bewuste keuze, staat nu ook op abonnementen.html
   als feat_trial_30 ×5 talen). Via Chrome-dashboard gedaan: klantenportaal
   geactiveerd (link in config; opzeggen einde periode + betaalmethoden aan),
   producten metadata plan=Glow/Shine gezet, webhook-endpoint
   brightnews-stripe-webhook aangemaakt (4 events, Actief). Via
   Management-API: stripe_customer_id-kolom + index live (stap 6),
   stripe-webhook-function gedeployed (201). **Nog open**:
   (a) STRIPE_WEBHOOK_SECRET zetten — classifier blokkeerde het doorsluizen;
   run-knop-commando bij Erik neergelegd (secret op klembord / opnieuw te
   kopiëren uit dashboard → Webhooks → brightnews-stripe-webhook);
   (b) MP-activatie: ✅ voltooid 2026-09-04 (status "Klaar voor gebruik";
   MP zit per betaallink — beide live links "Ingeschakeld"; duplicaat-Glow
   gedeactiveerd; links kregen metadata plan=Glow/Shine én de
   thanks-redirect, die stond als tekstbericht);
   (c) testmode-E2E: ✅ GROEN 2026-09-04 (zie STRIPE-MIGRATIE.md stap 9 —
   drie productiebugs gevonden/gefixt: trial-payment_status, clover-API
   current_period_end op items, profiles-FK naar auth.users). Livegang: ✅
   UITGEVOERD 2026-09-05 (fase M, commit dee6599): provider='stripe',
   lemon.js weg, alle 15 klanttekst-vermeldingen + 2 fallbacks naar
   Stripe, meta-CSP op alle pagina's + template (0 schendingen), v9.
   **Live geverifieerd 2026-09-05**: echte aankoop (checkout 200,
   subscription-event via 409-retry naar 200, DB correct incl. trial-einde)
   en portaal-opzegging (updated-event verwerkt; toegang blijft tot
   periode-einde en dooft dan vanzelf). Eerste MP-transactie gedaan.
   **Nog open**: (refund n.v.t. want trial; was: live proefaankoop, echte kaart — trial
   maakt de aankoop €0), MoR-eindcheck, Lemon-store afbouwen, daarna
   Supabase-token intrekken (Maarten).
   **Fase N (2026-09-05, live)**: livetest-feedback verwerkt — Supabase
   auth-config wees nog naar het oude GitHub-Pages-adres (site_url +
   allow-list gefixt naar brightnews.online; recovery-mail nu in
   BrightNews-stijl, afzender blijft supabase.io tot er custom SMTP is);
   sticky-header-bug (body overflow-x hidden → clip); foto-deduplicatie op
   de homepage (24→0 op 150 kaarten); checkout-UX (knoppen klikbaar met
   melding, profiel#registreren, placeholder, autocomplete). Repo heeft nu
   CLAUDE.md (2-dev-werkwijze Maarten+Erik), MAARTEN-FRONTEND-REVIEW.md en
   supabase/testers-promocode.sql (ZONNETJE30 — live sinds 2026-09-05, 31 dagen Glow, max 35, geldig t/m 15 okt).
   **MoR-eindcheck: ✅ GESLAAGD 2026-09-05** — alle 8 pagina's dragen
   bedrijfsidentiteit (KvK/BTW/adres/mail) + MoR-zin, 0 Lemon-restanten,
   prijzen incl. btw consistent met checkout, herroeping/refunds/trial
   gedocumenteerd. Gefixt tijdens de check: automatische-verlengings-
   clausule in de voorwaarden (terms_sec3_list4 ×5), kaartteksten
   "verlengt automatisch" mét prijs-na-trial, Duitse renewal_notice
   stond in het Engels. Migratie-restlijst: Lemon-store sluiten,
   custom SMTP, token intrekken (Maarten, na overdracht).
   **Lemon-afbouw (2026-09-05)**: 0 Lemon-klanten ooit → lemon-code uit
   auth.js/betaal-config, lemon-webhook-function + LEMON_WEBHOOK_SECRET
   verwijderd uit Supabase (code in git-historie), map uit repo. Store
   zelf sluiten = Maarten (Lemon-dashboard → Store → deactiveren).
   **Mail-gotcha**: brightnews.online heeft DMARC p=reject maar GEEN
   SPF-record en geen zichtbare DKIM — vóór custom SMTP (Strato-postvak,
   MX bestaat al) moet in het Strato-DNS-panel een SPF-record bij
   ("v=spf1 include:_spf.strato.com ~all") en DKIM aangezet.
4. Reviewer een herbeoordeling laten doen van de live site.
5. Onderhoudslijst (niet blokkerend): grants-verharding op de bestaande
   tabellen (revoke, nu inert door RLS — eerst met Maarten afstemmen; de
   nieuwe promo-tabellen hébben al revokes), acceptatie-monitoring per
   feed, evt. socials-iconen echte URL's. (Promocode-hardening en
   wees-profielrijen: afgerond 2026-09-03.)

## 10. Risico's waar Erik zelf op moet letten

- **Token intrekken** na Stripe-deel-2 (Maarten: Supabase → Access Tokens).
- **Witte tekst op #32CD32** haalt geen WCAG AA (2,1:1) — bewuste keuze,
  maar bij een EAA-/toegankelijkheidsvraag is dít het eerste aanpassingspunt.
- Socials-links verwijzen naar nog-niet-bestaande profielen tot Maarten ze
  claimt.
- MoR-zin noemt Stripe terwijl Lemon nog de (inactieve) provider is —
  bewust vooruitlopend; niet vergeten bij een eventuele LS-testverkoop.
