# Bright News — Overdrachtsdocument

**Bijgewerkt: 2026-09-01** (grote afrondingsronde met Claude Fable 5 vanaf
Eriks computer; de vorige versie van dit document beschreef de stand t/m
Fase 5.5 + het plan voor Fase 6). Lees dit samen met `README.md` (hoe alles
werkt) en `STRIPE-MIGRATIE.md` (het openstaande betaaltraject).

---

## Werkwijze (ongewijzigd waardevol — deze regels vingen echte bugs)

1. **Werk in een gekloonde repo met `git remote -v`-check**; ~/Brightnews.online
   op Eriks machine, ~/Desktop/brightnews-website bij Maarten.
2. **Eén branch per fase**, nooit direct op `master` — een merge naar
   `master` staat **direct live** op brightnews.online.
3. **Check drift tussen git en live** vóór je iets wijzigt. Geldt vooral voor
   de Supabase-functions (aparte deploy!) en het databaseschema
   (`supabase/schema-snapshot.sql` is daarvoor de vastgelegde referentie).
4. Bouwen → testen → rapporteren. Afspraak sinds 2026-09-01: Claude commit
   zelf op de fasebranch zodra alles getest is; de **merge naar master (=
   deploy) gebeurt alleen op expliciete go van Erik**.
5. **Verwijder nooit een bestand zonder grep-bewijs** dat er niets meer naar
   verwijst.
6. **Onverwachte vondsten eerst melden**, niet stilzwijgend fixen.
7. Vertrouw geen "de code zegt dat het klopt" — verifieer live/met computed
   styles/met echte requests. (Recentste voorbeeld: de service-role-secret
   "bestond" volgens iedereen, maar was leeg — 120 artikelen verloren hun
   volledige tekst voordat de fail-fast-guard dit ving.)
8. **Geen frameworks/bundlers**; nieuwe functionaliteit volgt het patroon van
   de bestaande Node-scripts in de Action.
9. **Premium-content nooit in publieke bestanden**; volledige tekst bestaat
   uitsluitend achter `get_full_article()` (server-side premium-check —
   geverifieerd in `schema-snapshot.sql`).

---

## Status: wat af is (alles live op master, tenzij anders vermeld)

**Oorspronkelijke fases 0–5.5** (aug 2026, met Sonnet): vangnet, security &
geld, kapotte functionaliteit, juridisch, opschonen, toegankelijkheid,
SEO-basis. Zie de git-historie voor details.

**Afrondingsronde 2026-09-01** (projectreview-artifact "BrightNews
Projectreview" + fases A–E, met Fable):

- **Fase A — zichtbare reparaties**: navigatie op alle pagina's identiek mét
  Abonnementen-link + login-icoon; dubbele footer uit de artikelweergave;
  90rem-footerhack op mobiel abonnementen structureel opgelost; nette melding
  bij verlopen gedeelde links; premium-artikelen per alinea; 11+ ontbrekende
  vertaalsleutels (o.a. FR-filters stonden in het Duits); WCAG-contrastfixes;
  launch.html verwijderd.
- **Fase B — betrouwbaarheid**: webhook-statusbug gedicht (late
  `subscription_updated` kon verlopen abonnees weer premium maken),
  secret-guard, test-mode-check — **live als lemon-webhook v9**; pipeline
  breekt hard af zonder service-key en publiceert atomair; Action-hardening
  (pull --rebase, concurrency, npm ci); supabase-js self-hosted;
  `schema-snapshot.sql` legt de beveiligings-SQL vast (paywall-check bleek
  correct server-side ✓).
- **Fase C — contentkwaliteit**: echte foto's (customFields + og:image;
  fallback-aandeel van 88% → 26%), persistente seen-lijst + sentiment-
  voorfilter (structurele kostendaling), cross-taal-validatie, retry/backoff,
  kostenlogging (`data/last_run.json`), bron-getrouwe samenvattingen i.p.v.
  300-woorden-verzinsels, Foxsports/Etonline-feeds weg.
- **Fase 6 — statische artikelpagina's**: 750 pagina's × 5 talen met
  canonical/hreflang/JSON-LD, incrementeel manifest (nooit verwijderen —
  live bewezen), dynamische sitemap, deelknoppen naar statische URL's,
  taalwissel navigeert tussen taalvarianten.
- **Fase 7 — performance**: alles defer, Font Awesome → inline SVG, lazy
  images, service worker network-first (deploys direct zichtbaar), echte
  PWA-iconen, cookiebanner op alle pagina's, mobiele filterbalk horizontaal.
  Lighthouse: home 64→79, artikel 59→82 (FCP 4,5s → 1,2s).
- **Fase D deel 1 — Stripe voorbereid**: provider-switch
  (`js/betaal-config.js`), `startCheckout()`, complete `stripe-webhook`
  (signature-verificatie getest), activatieplan in `STRIPE-MIGRATIE.md`.
  Lemon Squeezy blijft actief tot de omschakeling.
- **Fase E — dit document + README geactualiseerd.**

De eerste volledige pipeline-run met alles aan boord (2026-09-01, 54 min):
487 kandidaten → 415 AI-calls (540k tokens) → 306 artikelen geaccepteerd,
volledige teksten in alle 5 talen opgeslagen (0 fouten), talen synchroon.

---

## Openstaande acties (op volgorde)

1. **Stripe-onboarding — Maarten** (kritiek pad naar echte verkoop):
   `STRIPE-MIGRATIE.md` deel 1 — account, Managed Payments aanvragen (met
   reviewwachttijd), producten + Payment Links, portal, webhook-endpoint.
2. **Stripe-activatie — Claude/Erik**: `STRIPE-MIGRATIE.md` deel 2
   (databasekolom, secrets, testmode-E2E, livegang incl. MoR-teksten in
   footer/Privacy en de meta-CSP die bewust tot dat moment is uitgesteld).
3. **Fase 9 — MoR-eindcheck**: "Zou een Stripe-reviewer deze site
   goedkeuren?" — daarna live-verificatie aanvragen.
4. **Sitemap indienen bij Google Search Console** (handwerk, stond al open
   sinds Fase 5.5; nu extra zinvol met 1500+ artikel-URL's).
5. **Supabase-token van Erik intrekken** (Maarten: Account → Access Tokens)
   zodra stap 2 klaar is; duurzamer alternatief: Erik een eigen
   Supabase-account geven en als org-member uitnodigen.
6. Onderhoudskandidaten (niet blokkerend, vastgelegd in
   `schema-snapshot.sql`/review): promocode-hardening (zelfde gebruiker kan
   een code meermaals verzilveren; geen rate limiting), grants-verharding
   (revoke op tabellen, nu inert door RLS), wees-profielrijen na
   accountverwijdering, feed-gezondheid (2 feeds geven fouten), hoog
   acceptatiepercentage van de AI-filter (74% "bright") redactioneel volgen,
   archief-artikelpagina's van vóór Fase 7 gebruiken nog de oude template
   (functioneel prima).

---

## Toegang & secrets (wie heeft wat)

| Wat | Waar | Wie |
|---|---|---|
| GitHub-repo (collaborator) | MaartenDeKlerkPXL/Brightnews.online | Maarten (eigenaar), Erik (erikdeklerk-rehab, sinds 2026-09-01) |
| `MISTRAL_API_KEY` | GitHub Secrets | gezet door Maarten |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | gezet 2026-09-01 (was leeg — oorzaak van het tekstenverlies) |
| `LEMON_WEBHOOK_SECRET` | Supabase Edge Function env | Maarten |
| Supabase Management-token (sbp_v0_…) | Eriks `~/.zshrc` | tijdelijk; intrekken na Stripe-activatie |
| Strato-SMTP (`EMAIL_USER`/`EMAIL_PASS`) | alleen lokaal bij Maarten | legacy mailer |

**Let op de CLI-valkuil**: `supabase login` accepteert het nieuwe
`sbp_v0_…`-tokenformaat (nog) niet; de Management-API accepteert het wél
(`Authorization: Bearer …` naar `https://api.supabase.com/v1/…`). Function-
deploys en schema-queries lopen daarom via de API (voorbeeld in de
git-historie van 2026-09-01, o.a. de lemon-webhook v9-deploy).

## Vanaf een andere computer verdergaan

```bash
git clone https://github.com/MaartenDeKlerkPXL/Brightnews.online.git
cd Brightnews.online
npm ci
```

Meer is er niet: alle kennis staat in dit document, `README.md`,
`STRIPE-MIGRATIE.md` en `supabase/schema-snapshot.sql`; alle productie-
secrets staan in GitHub/Supabase (niet op een specifieke computer). Voor
pipeline-runs vanaf de eigen machine is een `.env` met de twee keys nodig —
of gebruik gewoon `workflow_dispatch` op GitHub (Actions-tab → Run workflow).
