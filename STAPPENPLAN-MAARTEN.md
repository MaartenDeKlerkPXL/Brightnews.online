# Stappenplan voor Maarten — Google Search Console & Stripe

*Opgesteld 2026-09-02. Dit zijn de twee sporen die alleen jij kunt doen (beide
vereisen accounts op jouw naam). Alles wat daarna komt — code, activatie,
testen — doet Claude/Erik; dat staat onderaan. Reken op ±30 min voor Google en
±1 à 1,5 uur voor Stripe (plus wachttijd op Stripes review).*

---

## Spoor 1 — Google Search Console (±30 min, kan vandaag)

Doel: Google actief vertellen dat brightnews.online bestaat, de sitemap met
1500+ artikelpagina's laten indexeren, en zien hoe de site in Google presteert.

1. **Inloggen**: ga naar https://search.google.com/search-console en log in
   met het Google-account dat je ook voor Google Analytics gebruikt
   (belangrijk — dan werkt stap 3 automatisch).
2. **Property toevoegen**: klik "Property toevoegen" en kies het rechter
   type: **URL-voorvoegsel** → vul exact `https://brightnews.online` in.
   (Het linker type "Domein" kan ook, maar vereist een DNS-record bij je
   domeinregistrar — omslachtiger, niet nodig.)
3. **Verificatie**: kies de methode **Google Analytics** — omdat de site al
   jouw Analytics-tag (G-ZNFX3R9BQV) bevat, is dit één klik. Lukt dat niet,
   kies dan "HTML-tag", kopieer de `<meta name="google-site-verification">`-
   regel en stuur die naar Erik/Claude — die zetten hem op de site, waarna
   jij op "Verifiëren" klikt.
4. **Sitemap indienen**: menu links → **Sitemaps** → vul in: `sitemap.xml`
   → **Verzenden**. Status moet "Gelukt" worden (kan een paar minuten duren);
   het aantal gevonden URL's hoort in de buurt van het aantal artikelpagina's
   + 7 vaste pagina's te liggen.
5. **Eén week later terugkijken** (5 min): menu → **Indexering → Pagina's**.
   Verwacht: het aantal geïndexeerde pagina's loopt gestaag op. Ook leuk:
   **Prestaties** toont vanaf dan op welke zoektermen BrightNews verschijnt.
   De twee oude "kritieke problemen" van vóór de canonical-fix mag je daar
   afsluiten met "Validatie starten" als ze nog open staan.

> Niet nodig: Google Maps/Bedrijfsprofiel (geen fysieke locatie), aparte
> aanmelding bij Google News (Search Console dekt dit; een News-vermelding
> kan later altijd nog via publishercenter.google.com).

### Extra taak: social-media-pagina's (±20 min)

De footer linkt sinds 2026-09-02 naar deze drie profielen — die moeten dus
bestaan (claim de handles, of geef de juiste URL's door zodat de links
aangepast worden):
- Facebook: `facebook.com/brightnews.online`
- Instagram: `instagram.com/brightnews.online`
- LinkedIn: `linkedin.com/company/brightnews-online`

---

## Spoor 2 — Stripe Managed Payments (±1–1,5 uur + reviewwachttijd)

Doel: BrightNews laten verkopen via Stripe als Merchant of Record (zij doen
btw, facturen, bonnetjes en geschillen). De site is er al klaar voor; na jouw
stappen is de omschakeling één regel code.

**Gebruik overal exact dezelfde bedrijfsgegevens als in de sitefooter**
(naam, Vossenstraat 19 Nijswiller, KvK 42048341, BTW NL005455019B94) — Stripe
en de site moeten hetzelfde vertellen, daar kijkt hun review naar.

1. **Account aanmaken** op https://stripe.com → "Start now". Doorloop de
   volledige activatie: bedrijfsgegevens, jouw identiteit (ID-verificatie)
   en je IBAN voor uitbetalingen. Maak het account helemaal af — een half
   geactiveerd account kan geen Managed Payments aanvragen.
2. **Managed Payments aanvragen**: zoek in het dashboard (zoekbalk bovenin)
   naar **"Managed Payments"** en vraag toegang aan voor brightnews.online.
   Stripe beoordeelt dan je site. Alles waar ze op letten is al geregeld
   (voorwaarden, privacy, refunds-pagina, herroepingsrecht-checkbox,
   "Merchant of Record"-vermelding in de footer) — maar er zit wachttijd op
   hun antwoord, dus **doe deze stap zo vroeg mogelijk**.
3. **Twee producten aanmaken** (pas nadat Managed Payments actief is, zodat
   ze onder dat regime vallen): dashboard → Product catalog → Add product.
   - **Glow** — terugkerend, €2,95 per maand.
   - **Shine** — terugkerend, €24,95 per jaar.
   Voeg bij elk product onder *Metadata* een sleutel `plan` toe met waarde
   `Glow` resp. `Shine` (zo komt de juiste plannaam in het klantprofiel).
   Let op dat je rechtsboven in **live mode** staat, niet in test mode.
4. **Per product een Payment Link**: open het product → "Create payment
   link". Type: Subscription. Stel bij *After payment* de doorverwijzing in
   naar `https://brightnews.online/thanks.html?status=success`. Kopieer de
   twee links (beginnen met `https://buy.stripe.com/…`).
5. **Customer Portal aanzetten**: dashboard → Settings → Billing →
   **Customer portal**. Zet aan: abonnement opzeggen + betaalmethode
   wijzigen. Activeer de "no-code" loginpagina en kopieer die link
   (begint met `https://billing.stripe.com/p/login/…`).
6. **Webhook aanmaken**: dashboard → Developers → **Webhooks** → Add
   endpoint.
   - Endpoint-URL: `https://rquuqypgaannrakdrabj.supabase.co/functions/v1/stripe-webhook`
   - Selecteer precies deze 4 events: `checkout.session.completed`,
     `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Na het aanmaken: klik "Reveal" bij **Signing secret** en kopieer de
     code die met `whsec_` begint.
7. **Stuur vier dingen naar Erik** (via een veilig kanaal zoals Signal of
   WhatsApp, in elk geval de secret niet los in de mail):
   1. Payment Link **Glow** · 2. Payment Link **Shine** ·
   3. Customer Portal-link · 4. de **whsec_…** signing secret.
8. **Lemon Squeezy**: nog even niets aan doen; die blijft parallel bestaan
   tot Stripe live is en wordt daarna afgebouwd (staat in STRIPE-MIGRATIE.md).

---

## Wat daarna automatisch volgt (Claude/Erik, ±1 sessie)

Databasekolom + webhook-secret zetten en deployen, de vier links invullen in
`js/betaal-config.js`, een volledige proefbestelling in testmodus (testkaart),
en dan de livegang: provider-switch om, footer- en privacyteksten van Lemon
Squeezy naar Stripe, security-headers erbij, live proefaankoop + refund, en
de eindcheck "zou een Stripe-reviewer dit goedkeuren". Als afronding trek jij
in Supabase het toegangstoken van Erik weer in (Account → Access Tokens →
Revoke). Details: `STRIPE-MIGRATIE.md`.
