-- Meldingen van de Supabase security-advisor (TODO 72, 2026-11-11).
-- Draaien in de SQL-editor van Supabase. Idempotent: twee keer draaien kan.

-- === 1. Triggerfuncties niet als RPC aan te roepen ===========================
-- Beide zijn security definer en stonden open voor anon en authenticated via
-- /rest/v1/rpc/. Postgres controleert het execute-recht alleen bij het
-- aanmaken van een trigger, niet bij het afgaan: de triggers op auth.users en
-- public.feedback blijven dus gewoon werken.
revoke execute on function public.cleanup_profile_after_user_delete() from public, anon, authenticated;
revoke execute on function public.feedback_volumerem() from public, anon, authenticated;

-- === 2. search_path vastzetten ===============================================
-- Uit supabase/metered-paywall-2026-09-28.sql (PR #15). Zonder vaste
-- search_path kan een aanroeper een eigen schema vóór public zetten. Neem dit
-- bij het mergen van PR #15 ook over in dat bestand.
alter function public.gratis_artikelen_per_maand() set search_path = public, pg_temp;
