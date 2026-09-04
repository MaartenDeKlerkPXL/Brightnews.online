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
            const { error } = await supabaseClient.from('profiles').upsert({
                id: userId,
                is_premium: true,
                // Exacte einddatum volgt direct hierna via customer.subscription.*
                stripe_customer_id: obj.customer ? String(obj.customer) : null,
                plan_type: obj.metadata?.plan ?? null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
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
            const periodeEinde = obj.current_period_end
                ? new Date(obj.current_period_end * 1000).toISOString()
                : null

            const { data, error } = await supabaseClient.from('profiles')
                .update({
                    is_premium: geeftToegang,
                    premium_until: geeftToegang ? periodeEinde : null,
                    updated_at: new Date().toISOString()
                })
                .eq('stripe_customer_id', customerId)
                .select('id')
            if (error) throw error
            if (!data || data.length === 0) {
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
