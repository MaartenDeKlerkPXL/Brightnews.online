import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function verifySignature(rawBody: string, signature: string | null, secret: string) {
    if (!signature) return false
    const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody))
    const digest = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
    if (digest.length !== signature.length) return false
    let diff = 0
    for (let i = 0; i < digest.length; i++) diff |= digest.charCodeAt(i) ^ signature.charCodeAt(i)
    return diff === 0
}

serve(async (req) => {
    const rawBody = await req.text()
    const signature = req.headers.get("X-Signature")
    const secret = Deno.env.get("LEMON_WEBHOOK_SECRET") ?? ""

    if (!(await verifySignature(rawBody, signature, secret))) {
        console.error("❌ Ongeldige signature ontvangen")
        return new Response(JSON.stringify({ error: "Ongeldige signature" }), { status: 401 })
    }

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload = JSON.parse(rawBody)
        const eventName = payload.meta?.event_name
        const userId = payload.meta?.custom_data?.user_id
        const attrs = payload.data?.attributes ?? {}

        console.log(`📩 Event ontvangen: ${eventName} | user_id: ${userId ?? "ONTBREEKT"}`)

        if (!userId) {
            console.warn("⚠️ Geen user_id in payload — waarschijnlijk een test-event zonder custom_data")
            return new Response(JSON.stringify({ error: "Geen user_id in payload" }), { status: 400 })
        }

        // Belangrijk: premiumstatus staat NIET meer in user_metadata (dat kan een
        // ingelogde gebruiker zelf overschrijven met de anon-key), maar in de
        // profiles-tabel. Alleen deze functie (service_role) mag daar in schrijven.
        if (eventName === 'order_created' || eventName === 'subscription_created' || eventName === 'subscription_updated' || eventName === 'subscription_resumed') {
            const { error } = await supabaseClient.from('profiles').upsert({
                id: userId,
                is_premium: true,
                premium_until: attrs.renews_at ?? attrs.ends_at ?? null,
                plan_type: attrs.variant_name ?? null,
                lemon_customer_id: attrs.customer_id ? String(attrs.customer_id) : null,
                lemon_subscription_id: payload.data?.type === 'subscriptions' ? String(payload.data.id) : null,
                customer_portal_url: attrs.urls?.customer_portal ?? null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' })

            if (error) throw error
            console.log(`✅ ${userId} is nu Premium (${eventName})`)
            return new Response(JSON.stringify({ message: "User is nu Premium! ✨" }), { status: 200 })

        } else if (eventName === 'subscription_expired') {
            const { error } = await supabaseClient.from('profiles').update({
                is_premium: false,
                updated_at: new Date().toISOString()
            }).eq('id', userId)

            if (error) throw error
            console.log(`⛔ ${userId} is niet langer Premium (subscription expired)`)
            return new Response(JSON.stringify({ message: "Premium beëindigd" }), { status: 200 })

        } else if (eventName === 'subscription_cancelled') {
            // Klant heeft opgezegd maar behoudt toegang tot het einde van de periode.
            // Bewust GEEN is_premium wijziging hier — dat gebeurt pas bij subscription_expired.
            console.log(`ℹ️ ${userId} heeft opgezegd, toegang blijft tot einde periode`)
            return new Response(JSON.stringify({ message: "Opzegging genoteerd, toegang blijft actief" }), { status: 200 })
        }

        console.log(`↪️ Event ${eventName} genegeerd (geen actie nodig)`)
        return new Response(JSON.stringify({ message: "Event genegeerd" }), { status: 200 })

    } catch (error) {
        console.error(`💥 Fout bij verwerken: ${error.message}`)
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
