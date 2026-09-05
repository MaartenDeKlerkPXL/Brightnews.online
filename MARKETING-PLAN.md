# BrightNews Marketing-plan (v1, 2026-09-05)

Plan + fundament, vastgesteld met Erik. De **marketing-agent zelf wordt
gebouwd in de twee weken vóór de lancering** — vers ingeregeld op echte
content. Het datafundament draait al mee in de pipeline
(`data/marketing-feed.json`, zie onderaan).

## Doel en tijdlijn

| Mijlpaal | Wanneer | Wat |
|---|---|---|
| Parkeerperiode | nu → lancering | Site dicht voor publiek; pipeline draait door zodra `ANTHROPIC_API_KEY` er is; selectie-archief groeit |
| Punt-4-optie beschikbaar | ≥ 2026-10-17 (±6 weken data) | Embedding-voorfilter / fine-tune op het selectie-archief mogelijk |
| Lancering | te prikken (na key + prompt-herijking + agentbouw) | Gate weg, marketing start, **3-maandenklok start** |
| Evaluatie | lancering + 3 maanden | Bij maximale marketinginzet: genoeg reden om als betaalde site door te gaan? |

**Absoluut minimumdoel: uit de kosten.**

## Break-even-som

Kosten per maand (schatting):

| Post | Bedrag |
|---|---|
| API-calls (Claude: selectie, samenvattingen, digests) | €23–42 |
| Claude-abonnement Maarten | ±€21 |
| Hosting: GitHub Pages €0 + domein ±€1 + Strato-mailpakket | ±€5–10 |
| **Totaal** | **±€50–75** |

Opbrengst per abonnee (na Stripe-fee ±4%): Glow €2,95/mnd → ±€2,70 netto;
Shine €24,95/jr → ±€2,00/mnd netto.

**Break-even ≈ 20–28 betalende abonnees.** Richtdoel voor de evaluatie:
**≥ 25 betalende abonnees na 3 maanden** (en groeiende), plus de trechter
ervoor gezond (bezoekers → registraties → betaald).

## Doelgroepen × 5 talen

Eén verhaal, vijf markten — de pipeline levert alle content al vijftalig:

- **NL** (NL/BE): thuismarkt, persoonlijke afzender (Maarten als maker).
- **EN** (VK/VS/wereld): grootste vijver, meeste concurrentie (Good News
  Network c.s.) — invalshoek: vijf talen + dagoverzichten als verschil.
- **DE** (DE/AT/CH): grote markt, weinig positief-nieuws-aanbod in het Duits.
- **FR** (FR/BE): idem.
- **ES** (ES/LATAM): grootste taalgroep, geheel via socials te bereiken.

## Kanalen en cadans (realistisch voor één persoon + agent)

- **Hoofdkanalen**: Instagram + Facebook (handles staan al in de sitefooter)
  en LinkedIn (bedrijfspagina) — dagelijks 1 post in EN én NL.
- **DE/FR/ES**: 3×/week, hetzelfde materiaal in die taal (agent levert het
  toch al vijftalig).
- **Later optioneel**: TikTok/Shorts (digest als voorleesvideo), Pinterest,
  Reddit-communities (r/UpliftingNews-achtig, alleen waar zelfpromotie mag).
- Werklast Maarten: **±20 min/dag** — drafts beoordelen en plaatsen.

## De marketing-agent (bouw richting lancering)

Zelfde filosofie als de hele backend: itereerbare prompt, log, en een mens
die beslist.

1. **Input**: `data/marketing-feed.json` — per taal de beste artikelen
   (score ≥ 8) en dagoverzichten van de afgelopen 48 uur, met kant-en-klare
   links. Draait al elke run mee.
2. **Generatie**: per taal en kanaal originele posts — géén gekopieerde
   teasers maar een eigen invalshoek (vraag, verrassend feit, mini-verhaal),
   tone-of-voice in een itereerbaar `backend/marketing-prompt.md` (zelfde
   lus als selectie- en digest-prompt).
3. **Draft-first, altijd**: de agent publiceert nooit zelf. Output =
   conceptposts (per dag één bestand of issue); Maarten keurt, past aan en
   plaatst. Directe API-koppelingen (Meta/LinkedIn/Buffer) pas later, en ook
   dan met goedkeuring per post.
4. **Meetlus**: UTM-tags op alle links (`?utm_source=instagram&utm_campaign=…`),
   wekelijks bereik/kliks/registraties/promocodes naast elkaar (GA4 +
   Search Console + Stripe), en de prompt bijstellen op wat werkt — zelfde
   iteratielus als het selectie-log.

## KPI's voor de wekelijkse review

1. Bezoekers per taal (GA4) en organisch verkeer (Search Console).
2. Registraties (Supabase) en promocode-inwisselingen (ZONNETJE30-lijn).
3. Betalende abonnees + MRR (Stripe).
4. Per kanaal: bereik en doorkliks (UTM).

## Open punten

- Socials-handles claimen (stond al op Maartens lijst) vóór de agentbouw.
- Lanceerdatum prikken zodra de pipeline op Claude geijkt draait.
- Tester-mail (ZONNETJE30) versturen bij lancering, niet eerder.
