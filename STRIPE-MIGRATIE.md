# Stripe Managed Payments — activatiestappenplan

**Status:** de code is klaar en gedeployed-op-repo (Fase D, 2026-09-01); de site
draait nog op Lemon Squeezy tot dit stappenplan is doorlopen. De omschakeling
zelf is daarna één regel in `js/betaal-config.js`.

**Waarom:** besluit uit de projectreview van 2026-09-01 — Stripe nam Lemon
Squeezy over; Stripe Managed Payments (gebouwd door het Lemon Squeezy-team) is
sinds april 2026 algemeen beschikbaar en is het platform waar de ontwikkeling
zit. Als Merchant of Record regelt Stripe btw-afdracht, facturen/bonnetjes,
geschillen en klantsupport — de aankoopbevestiging per e-mail (wettelijk
verplicht) wordt daarmee ook door Stripe verstuurd, wat het ontbrekende
mailer-koppelstuk oplost.

## Deel 1 — Maarten: Stripe-account & producten (eenmalig, ±1 uur + wachttijd op review)

1. **Account**: maak een Stripe-account op stripe.com (bedrijfsgegevens =
   dezelfde als in de sitefooter). Doorloop de activatie (identiteit, bank).
2. **Managed Payments aanvragen**: dashboard → zoek "Managed Payments" →
   aanvragen/aanzetten. Stripe reviewt de site; de eerdere compliance-fases
   (voorwaarden, refunds, herroepingsrecht, MoR-vermelding) zijn daar precies
   voor gedaan. Let op: activeer producten pas als Managed Payments actief is,
   zodat ze onder het MoR-regime vallen.
3. **Producten + Payment Links**: maak twee producten (Glow — maandelijks,
   Shine — jaarlijks; zelfde prijzen als nu) en per product een **Payment
   Link** (subscription). Voeg bij elk product `metadata`-sleutel `plan` toe
   met waarde `Glow` resp. `Shine` (komt in profiles.plan_type terecht).
4. **Customer Portal**: dashboard → Settings → Billing → Customer portal →
   activeer de no-code portal (opzeggen + betaalmethode wijzigen aan) en
   kopieer de login-link (`https://billing.stripe.com/p/login/...`).
5. **Webhook**: dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://rquuqypgaannrakdrabj.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Kopieer de **signing secret** (`whsec_...`).

## Deel 2 — Claude/Erik: activering (±1 sessie, zodra Deel 1 klaar is)

6. **Databasekolom** (eenmalig, via Supabase SQL-editor of query-API):
   ```sql
   alter table public.profiles add column if not exists stripe_customer_id text;
   create index if not exists profiles_stripe_customer_id_idx
     on public.profiles (stripe_customer_id);
   ```
7. **Function-secrets** zetten en deployen:
   - env `STRIPE_WEBHOOK_SECRET` = de whsec uit stap 5 (dashboard → Edge
     Functions → stripe-webhook → secrets, of via de Management-API);
   - deploy `stripe-webhook` (zelfde route als de lemon-webhook-deploy:
     Management-API, of `supabase functions deploy stripe-webhook
     --no-verify-jwt` zodra de CLI het tokenformaat accepteert).
8. **Config invullen** in `js/betaal-config.js`: de twee Payment Link-URL's en
   de portal-link; `provider` nog op `'lemon'` laten.
9. **Testmode-E2E**: zet tijdelijk env `STRIPE_ALLOW_TEST=true` op de function,
   zet `provider: 'stripe'` lokaal, doorloop een testcheckout (testkaart
   4242 4242 4242 4242) en controleer: profiel wordt premium, premium_until =
   periode-einde, volledige artikelen zichtbaar, opzeggen via portal zet
   cancel_at_period_end (toegang blijft tot einddatum), na afloop premium uit.
   Daarna `STRIPE_ALLOW_TEST` weer verwijderen.
10. **Livegang** (één commit):
    - `provider: 'stripe'` in js/betaal-config.js;
    - lemon.js-script verwijderen van abonnementen.html;
    - MoR-zin in de footer (alle pagina's + generator-template):
      "Payments are securely processed by Stripe, our Merchant of Record.";
    - Privacy.html: Lemon Squeezy → Stripe als verwerker;
    - meta-CSP toevoegen (bewust uitgesteld tot dit moment; met Payment Links
      is er géén extra script-host nodig — checkout is een redirect naar
      checkout.stripe.com);
    - live proefaankoop + refund via het dashboard.
11. **Naderhand**: Lemon Squeezy-store sluiten/leeg laten; het Supabase-token
    van Erik laten intrekken (afspraak uit Fase B); Fase 9 MoR-eindcheck
    draaien ("zou een Stripe-reviewer deze site goedkeuren?").

## Technische notities

- Gebruikerskoppeling: `startCheckout()` geeft `client_reference_id`
  (Supabase-user-id) mee aan de Payment Link; de webhook koppelt daarop —
  niet op e-mail (niet spoofbaar). Vervolg-events matchen op
  `stripe_customer_id`.
- `premium_until` = `current_period_end` bij elk subscription-event; de
  client checkt die datum al, dus verlopen abonnementen doven vanzelf.
  Statussen: `active`/`trialing` → toegang; `past_due`/`unpaid`/`paused`/
  `canceled` → geen toegang; opzeggen-met-resttijd blijft `active` met
  `cancel_at_period_end` en dooft op de einddatum.
- Testmode-events worden genegeerd tenzij `STRIPE_ALLOW_TEST=true`.
- De lemon-webhook blijft parallel bestaan tot de laatste Lemon-abonnee
  weg is (of migreert); beide kunnen veilig naast elkaar draaien.
