import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SERVICE_ROLE_KEY') ?? '' // Nodig om metadata aan te passen
    )

    try {
        const payload = await req.json()
        const eventName = payload.meta.event_name
        const userId = payload.meta.custom_data.user_id // Hier komt je ID binnen!

        console.log(`Ontvangen event: ${eventName} voor user: ${userId}`)

        if (eventName === 'order_created' || eventName === 'subscription_created') {
            // 1. Update de user metadata in Supabase Auth
            const { data, error } = await supabaseClient.auth.admin.updateUserById(
                userId,
                { user_metadata: { is_premium: true } }
            )

            if (error) throw error

            return new Response(JSON.stringify({ message: "User is nu Premium! ✨" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            })
        }

        return new Response(JSON.stringify({ message: "Event genegeerd" }), { status: 200 })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})