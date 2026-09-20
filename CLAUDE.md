# CLAUDE.md — BrightNews werkafspraken (voor élke Claude-sessie, bij Maarten én Erik)

## ⚡ Sessiestart-checklist (élke BrightNews-sessie, bij Maarten én Erik)
Begin elke sessie ("verder met BrightNews" of vergelijkbaar) met deze
drie checks, vóór al het andere werk — dit is de vaste route waarmee
verbeteringen van de één binnen een dag bij de ander landen:
1. **`gh pr list`** — staat er een open PR met een review-verzoek aan de
   huidige gebruiker? Behandel die éérst: reviewen en mergen, of een
   concreet antwoord op de PR zetten. Niemand hoort dagen te wachten
   (PR #1 en #5 stonden in september zes dagen te verstoffen omdat de
   GitHub-mailtjes verdronken in Eriks inbox).
2. **`TODO.md`** — scan de open punten met de eigen naam erachter en meld
   kort wat je oppakt.
3. **Nieuw werk voor de ánder ontdekt?** Zet het als genummerd punt in
   `TODO.md` mét naam, en bij code: open een PR met review-verzoek. De
   repo is het kanaal — geen losse mails; die worden gemist.

## Setup: twee developers, één codebase
- **Maarten** = design/front-end (HTML, CSS, teksten, UX). **Erik** = back-end
  (Supabase, Stripe, pipeline, security). Eén repo, `master` = **direct live**
  op brightnews.online (GitHub Pages).
- **Werk nooit rechtstreeks op master.** Maak per klus een branch
  (`maarten/<klus>` of `erik/<klus>`), merge pas na lokale verificatie.
- Raakt een wijziging betalingen, Supabase, `backend/`, `sw.js` of
  `js/betaal-config.js` → **PR aanmaken en de ander laten meekijken** in
  plaats van zelf mergen. Puur visueel werk mag na eigen check gemerged.
- **Vóór alles, altijd**: `git pull --rebase origin master` — de nieuws-Action
  pusht 2×/dag (0:00/12:00 UTC) datacommits naar master.

## Vaste conventies (duur betaald — echt doen)
- `npx eslint .` → 0 errors is de norm (bekende warnings mogen blijven).
- Wijzig je `css/global.css`, `css/components.css`, `js/main.js`,
  `index.html` of `assets/brightnews-logo.png` → **bump `CACHE_NAME` in
  sw.js** (anders zien bezoekers je wijziging niet).
- Wijzig je het artikeltemplate in `backend/generate-articles.js` →
  `node backend/generate-articles.js` draaien (regenereert de actuele
  pagina's; archief blijft bewust staan) + `node backend/generate-sitemap.js`.
- Vertaalteksten: elke key bestaat in **5 talen** (nl/en/de/fr/es) in
  `data/translations.js`. Nieuwe key = 5 regels.
- `data-i18n` op een element wist de children — tekst altijd in een eigen
  `<span data-i18n>` naast icoontjes/SVG's.
- Statische artikelpagina's en `articles/manifest.json` **nooit verwijderen**
  (geïndexeerde URL's mogen niet sterven).
- Meldingen aan de gebruiker: altijd `showNotification()` — geen `alert()`.
- Elke pagina heeft een meta-CSP; nieuwe externe scripts/hosts werken pas als
  je ze daar (op álle pagina's + het template) toevoegt. Voeg liever niets
  extern toe.
- Secrets staan in GitHub Secrets / Supabase — nooit in de repo, nooit in
  chat plakken.

## Lokaal previewen
Elke simpele static server werkt, bijv.:
```bash
python3 -m http.server 8945
```
Let op: de service worker en browser cachen agressief — test met een
hard-refresh of privévenster; CSS/JS-wijzigingen zie je anders niet.

## Sinds 2026-09-06: Claude-pipeline en geparkeerde site
- **De site is tijdelijk geparkeerd**: publiek ziet `binnenkort.html`;
  teamtoegang via de link op die pagina (`/?team=1`). De gate is een klein
  scriptblok bovenin `index.html` — niet per ongeluk weghalen; hij gaat er
  bewust uit bij de lancering.
- **AI draait op Claude** via `backend/ai-adapter.js` (Haiku selecteert
  gebundeld per 10, Sonnet schrijft, Haiku vertaalt; besluit valt in code:
  som ≥ 8, minima 2/2/2). Secret: `ANTHROPIC_API_KEY`.
- **Let op, de fallback-sleuf is NÍET leeg** (gecorrigeerd 2026-09-16; hier
  stond eerder dat Mistral was afgebouwd en de sleuf bewust leeg was).
  `MISTRAL_API_KEY` staat nog in GitHub Secrets, en de adapter zet Mistral in de
  keten zodra die sleutel er is. Bij elke run wordt Mistral dus alsnog
  aangeroepen, faalt hij drie keer op een rate limit (geen betaalde tier meer)
  en kost dat ±30 seconden plus veel ruis in het log. Tijdens de storing van
  10–13 september maakte dat de diagnose onnodig troebel. Weghalen van die
  secret staat als punt op `TODO.md`.
- **Itereerbare prompts**: `backend/selectie-prompt.md` (bewerken → Action →
  `data/selectie-log.json` lezen; hash-wijziging geeft afgewezen items
  automatisch een herkansing) en `backend/digest-prompt.md` (dagoverzichten;
  log in `data/digest-log.json`). `data/selectie-archief.jsonl` is
  append-only trainingsdata — nooit opschonen.
- **Dagoverzichten** (type `digest`) zijn gewone artikelen met badge en
  bronnenlijst; `data/marketing-feed.json` is de input voor de latere
  marketing-agent (`MARKETING-PLAN.md`).

## Waar staat wat
- `TODO.md` — actuele werklijst (wat er nog moet gebeuren, op urgentie).
- `BRIGHTNEWS-OVERDRACHT-FABLE.md` — volledige projectstatus en historie.
- `README.md` — hoe alles werkt. `STRIPE-MIGRATIE.md` — betaaltraject.
- `MARKETING-PLAN.md` — route naar lancering, break-even, agent-ontwerp.
- `STAPPENPLAN-MAARTEN.md` — Maartens eigen acties.
- `MAARTEN-FRONTEND-REVIEW.md` — actuele front-end-verbeterlijst.
- `backend/selectie-prompt.md` — dé AI-selectieprompt (itereren: bewerken →
  Action draaien → `data/selectie-log.json` lezen).
- `backend/selectie-prompt-analyse.md` — diagnose van die prompt op basis van
  300 beoordelingen (2026-09-10). **Openstaand: Erik leest, test en geeft zijn
  eigen bevindingen — er is bewust nog niets gewijzigd.**
  Onderaan datzelfde bestand schrijft de nachtelijke controle zijn dagelijkse
  bevindingen weg.
- `backend/nachtelijke-beoordeling-prompt.md` — opdracht voor de agent die elke
  nacht om 04:00 Amsterdamse tijd de verse artikelen nakijkt op bright-waardigheid.
- `backend/controleer-reservefotos.js` — telt of er nog genoeg reservefoto's
  zijn voor de homepage; draait mee in de nachtelijke controle (stap 7). Het
  logboek staat in `backend/reservefotos-log.md` en blijft stil zolang er
  niets verandert.
- `backend/vertaal-steekproef.md` — steekproef op de vertalingen (2026-09-10),
  met voorstellen voor de vertaalprompt. **Openstaand: Erik.**
