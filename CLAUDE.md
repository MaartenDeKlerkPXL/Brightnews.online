# CLAUDE.md — BrightNews werkafspraken (voor élke Claude-sessie, bij Maarten én Erik)

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

## Waar staat wat
- `BRIGHTNEWS-OVERDRACHT-FABLE.md` — volledige projectstatus en historie.
- `README.md` — hoe alles werkt. `STRIPE-MIGRATIE.md` — betaaltraject.
- `MAARTEN-FRONTEND-REVIEW.md` — actuele front-end-verbeterlijst.
- `backend/selectie-prompt.md` — dé AI-selectieprompt (itereren: bewerken →
  Action draaien → `data/selectie-log.json` lezen).
