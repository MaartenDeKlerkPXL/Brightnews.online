// Stripe-webhook voor BrightNews (Fase D: migratie naar Stripe Managed
// Payments). Zelfde beveiligingsprincipes als de lemon-webhook:
// - handtekening-verificatie over de rauwe body (Stripe-Signature: t=..,v1=..,
//   HMAC-SHA256 over `${t}.${body}` met de signing-secret, timing-safe
//   vergeleken, met een tolerantie van 5 minuten tegen replay);
// - premiumstatus uitsluitend server-side in de profiles-tabel (service_role);
// - gebruikerskoppeling via client_reference_id (het Supabase-user-id dat
//   startCheckout() aan de Payment Link meegeeft) — niet via e-mail.
//
// Vereist (zie STRIPE-MIGRATIE.md):
// - env STRIPE_WEBHOOK_SECRET (whsec_..., uit het Stripe-dashboard);
// - kolom stripe_customer_id (text) op public.profiles;
// - deploy met --no-verify-jwt (Stripe stuurt geen Supabase-JWT mee).
//
// premium_until wordt bij elk subscription-event op current_period_end gezet;
// de client checkt die datum al, dus een verlopen (niet-verlengd) abonnement
// dooft vanzelf — er is geen apart "expired"-event nodig zoals bij Lemon.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOLERANTIE_SECONDEN = 300

async function verifieerStripeSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
    if (!header) return false
    const delen = Object.fromEntries(
        header.split(',').map(p => p.split('=', 2) as [string, string])
    )
    const t = delen['t']
    const v1 = delen['v1']
    if (!t || !v1) return false

    const leeftijd = Math.abs(Date.now() / 1000 - Number(t))
    if (!Number.isFinite(leeftijd) || leeftijd > TOLERANTIE_SECONDEN) return false

    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`))
    const digest = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
    if (digest.length !== v1.length) return false
    let diff = 0
    for (let i = 0; i < digest.length; i++) diff |= digest.charCodeAt(i) ^ v1.charCodeAt(i)
    return diff === 0
}

// Stripe belooft geen volgorde, levert events soms tegelijk af, en herhaalt
// ze tot drie dagen lang. Een subscription-event dat ouder is dan het laatst
// verwerkte subscription-event van dit profiel (kolom stripe_event_op)
// verandert niets meer: anders zet een late subscription.updated Premium
// terug aan na subscription.deleted (review 2026-11-12). De controle zit in
// de update zelf (één stap), zodat twee events die tegelijk binnenkomen
// elkaar niet kunnen inhalen. Alleen subscription-events schrijven de kolom;
// een subscription.created die eerst 409 kreeg (checkout nog niet binnen) en
// later opnieuw komt, wordt zo niet onterecht overgeslagen. event.created
// telt in hele seconden: bij een gelijke seconde telt subscription.created
// als ouder (created en de eerste updated vallen vaak in dezelfde seconde).

serve(async (req) => {
    const rawBody = await req.text()
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""

    if (!secret) {
        console.error("💥 STRIPE_WEBHOOK_SECRET ontbreekt — webhook kan niet verifiëren")
        return new Response(JSON.stringify({ error: "Serverconfiguratie onvolledig" }), { status: 500 })
    }

    // Testmode-events komen van een apart test-endpoint met een eigen
    // signing-secret. Alleen tijdens de activatietest (STRIPE_ALLOW_TEST=true
    // én STRIPE_WEBHOOK_SECRET_TEST gezet) telt die als geldig alternatief;
    // buiten de test is dit pad inert. Live verificatie blijft ongewijzigd.
    const sigHeader = req.headers.get("Stripe-Signature")
    const testSecret = Deno.env.get("STRIPE_ALLOW_TEST") === "true"
        ? (Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") ?? "")
        : ""
    const geldig = (await verifieerStripeSignature(rawBody, sigHeader, secret))
        || (testSecret !== "" && await verifieerStripeSignature(rawBody, sigHeader, testSecret))
    if (!geldig) {
        console.error("❌ Ongeldige Stripe-signature ontvangen")
        return new Response(JSON.stringify({ error: "Ongeldige signature" }), { status: 401 })
    }

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const event = JSON.parse(rawBody)
        const type = event.type as string
        const obj = event.data?.object ?? {}

        console.log(`📩 Stripe-event: ${type} | livemode: ${event.livemode}`)

        // Testmode-events geven nooit echte premium, tenzij expliciet
        // toegestaan voor de activatietest (env STRIPE_ALLOW_TEST=true).
        if (!event.livemode && Deno.env.get("STRIPE_ALLOW_TEST") !== "true") {
            console.log("🧪 Testmode-event genegeerd")
            return new Response(JSON.stringify({ message: "Testmode-event genegeerd" }), { status: 200 })
        }

        if (type === 'checkout.session.completed') {
            const userId = obj.client_reference_id
            if (!userId) {
                console.warn("⚠️ checkout.session.completed zonder client_reference_id")
                return new Response(JSON.stringify({ error: "Geen client_reference_id" }), { status: 400 })
            }
            // 'no_payment_required' = checkout met gratis proefperiode (de
            // links hebben 30 dagen trial): er is dan nog niets afgerekend
            // maar het abonnement start wél — premium hoort direct actief.
            // Zonder deze tak bleef stripe_customer_id leeg en strandden de
            // subscription-events eeuwig op 409 (gevonden vóór livegang).
            if (obj.payment_status && !['paid', 'no_payment_required'].includes(obj.payment_status)) {
                console.log(`↪️ Sessie voltooid maar payment_status=${obj.payment_status} — geen actie`)
                return new Response(JSON.stringify({ message: "Nog niet betaald" }), { status: 200 })
            }
            const { data: bestaand, error: leesFout } = await supabaseClient.from('profiles')
                .select('stripe_customer_id, abo_status')
                .eq('id', userId).maybeSingle()
            if (leesFout) throw leesFout
            const nieuweKlant = obj.customer ? String(obj.customer) : null
            // Deze klant is al gekoppeld: alleen een checkout koppelt, dus deze
            // is al verwerkt (een herhaalde of te late aflevering). Niets meer
            // veranderen; de subscription-events bepalen de status.
            if (bestaand?.stripe_customer_id && bestaand.stripe_customer_id === nieuweKlant) {
                console.log(`↪️ ${userId}: checkout voor een al gekoppelde klant — status komt uit de subscription-events`)
                return new Response(JSON.stringify({ message: "Al verwerkt" }), { status: 200 })
            }
            // Een lopend abonnement van een ándere Stripe-klant niet
            // overschrijven: dat is een tweede afrekening, of iemand die het
            // user-id van een ander als client_reference_id meegaf. Dan
            // houdt het bestaande abonnement de koppeling; het nieuwe meldt
            // zich in de logs (en moet in Stripe terugbetaald worden).
            if (bestaand?.stripe_customer_id && nieuweKlant && bestaand.stripe_customer_id !== nieuweKlant
                && ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(String(bestaand.abo_status))) {
                console.error(`🚨 ${userId} heeft al een lopend abonnement (${bestaand.stripe_customer_id}); nieuwe klant ${nieuweKlant} niet gekoppeld`)
                return new Response(JSON.stringify({ message: "Tweede abonnement niet gekoppeld" }), { status: 200 })
            }
            // plan_type alleen als de sessie het meegeeft: anders zou dit event,
            // als het na customer.subscription.created binnenkomt, het plan
            // dat daar uit de prijs is gehaald weer op null zetten.
            const profiel: Record<string, unknown> = {
                id: userId,
                is_premium: true,
                // Voorlopig twee dagen; de exacte einddatum volgt direct hierna
                // via customer.subscription.*. Niet null: dat betekent "loopt
                // nooit af".
                premium_until: new Date(Date.now() + 2 * 86400000).toISOString(),
                stripe_customer_id: nieuweKlant,
                // Een nieuwe klant begint schoon; de oude status hoort bij het
                // vorige abonnement.
                abo_status: null,
                opgezegd: false,
                proef_tot: null,
                stripe_event_op: null,
                updated_at: new Date().toISOString()
            }
            if (obj.metadata?.plan) profiel.plan_type = obj.metadata.plan
            const { error } = await supabaseClient.from('profiles').upsert(profiel, { onConflict: 'id' })
            if (error) throw error
            console.log(`✅ ${userId} is nu Premium (checkout voltooid)`)
            return new Response(JSON.stringify({ message: "Premium geactiveerd ✨" }), { status: 200 })
        }

        if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
            const customerId = obj.customer ? String(obj.customer) : null
            if (!customerId) {
                return new Response(JSON.stringify({ message: "Geen customer op event" }), { status: 200 })
            }

            const status = String(obj.status ?? '')
            const geeftToegang = type !== 'customer.subscription.deleted'
                && ['active', 'trialing'].includes(status)
            // Sinds API-versie 2026-02-25.clover staat current_period_end op
            // de subscription-items, niet meer op het subscription-object
            // zelf (E2E-vangst 2026-09-04: premium_until bleef null).
            // trial_end als extra vangnet voor proefperiodes.
            const periodeEindeSec = obj.current_period_end
                ?? obj.items?.data?.[0]?.current_period_end
                ?? obj.trial_end
            const periodeEinde = periodeEindeSec
                ? new Date(periodeEindeSec * 1000).toISOString()
                : null

            // Voor Mijn account en Bedankt (TODO 66 punt 10 en 12): de status
            // zelf (trialing, active, past_due, canceled …), of de lezer heeft
            // opgezegd (loopt door tot premium_until), tot wanneer de
            // proefperiode loopt, en het plan uit de prijs (maand of jaar).
            const interval = obj.items?.data?.[0]?.price?.recurring?.interval
            const plan = interval === 'year' ? 'jaarlijks' : interval === 'month' ? 'maandelijks' : null
            const eventOp = typeof event.created === 'number' ? new Date(event.created * 1000).toISOString() : null

            // Geen toegang: premium_until op nu, niet op null. Null betekent in
            // de Premium-regel "loopt nooit af"; een is_premium dat later toch
            // op true komt, zou dan voor altijd gelden.
            const update: Record<string, unknown> = {
                is_premium: geeftToegang,
                premium_until: geeftToegang ? periodeEinde : new Date().toISOString(),
                stripe_event_op: eventOp,
                abo_status: type === 'customer.subscription.deleted' ? 'canceled' : (status || null),
                opgezegd: Boolean(obj.cancel_at_period_end || obj.cancel_at),
                proef_tot: obj.trial_end ? new Date(obj.trial_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString()
            }
            if (plan) update.plan_type = plan

            let query = supabaseClient.from('profiles')
                .update(update)
                .eq('stripe_customer_id', customerId)
            if (eventOp) {
                const vergelijk = type === 'customer.subscription.created' ? 'lt' : 'lte'
                query = query.or(`stripe_event_op.is.null,stripe_event_op.${vergelijk}."${eventOp}"`)
            }
            const { data, error } = await query.select('id')
            if (error) throw error
            if (!data || data.length === 0) {
                // Wel gekoppeld, maar er is al een nieuwer event verwerkt.
                const { data: gekoppeld, error: leesFout } = await supabaseClient.from('profiles')
                    .select('id').eq('stripe_customer_id', customerId).limit(1)
                if (leesFout) throw leesFout
                if (gekoppeld?.length) {
                    console.log(`↪️ ${type} voor ${customerId} ouder dan het laatst verwerkte — overgeslagen`)
                    return new Response(JSON.stringify({ message: "Ouder event genegeerd" }), { status: 200 })
                }
                // checkout.session.completed kan nog onderweg zijn; Stripe
                // herhaalt dit event bij een non-2xx-status vanzelf.
                console.warn(`⚠️ Geen profiel met stripe_customer_id=${customerId} — retry aangevraagd`)
                return new Response(JSON.stringify({ error: "Profiel (nog) niet gevonden" }), { status: 409 })
            }
            console.log(`${geeftToegang ? '✅' : '⛔'} ${data[0].id}: ${type} (status: ${status || 'n.v.t.'})`)
            return new Response(JSON.stringify({ message: "Abonnementsstatus bijgewerkt" }), { status: 200 })
        }

        console.log(`↪️ Event ${type} genegeerd (geen actie nodig)`)
        return new Response(JSON.stringify({ message: "Event genegeerd" }), { status: 200 })

    } catch (error) {
        console.error(`💥 Fout bij verwerken: ${error instanceof Error ? error.message : String(error)}`)
        return new Response(JSON.stringify({ error: "Verwerking mislukt" }), { status: 400 })
    }
})
