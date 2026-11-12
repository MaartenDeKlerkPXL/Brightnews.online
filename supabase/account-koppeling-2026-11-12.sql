-- Mijn account en Bedankt koppelen (TODO 66, punten 10 en 12).
--
-- 1. Drie kolommen op profiles, gevuld door de stripe-webhook:
--      abo_status  de status bij Stripe: trialing, active, past_due, unpaid,
--                  canceled … (null = nooit een Stripe-abonnement gehad,
--                  bijvoorbeeld Premium via een promocode)
--      opgezegd    opgezegd maar nog niet afgelopen; Premium loopt door tot
--                  premium_until
--      proef_tot   einde van de proefperiode
--      stripe_event_op  moment van het laatst verwerkte Stripe-event; oudere
--                  (herhaalde of te late) events veranderen niets meer
--    Lezers kunnen ze alleen lezen (profiles_select_own); schrijven blijft
--    voorbehouden aan de service_role.
--
-- 2. De mails-schakelaar in Mijn account. mail_voorkeuren heeft bewust geen
--    RLS-regels voor lezers: het token in die tabel is de afmeldsleutel uit
--    de mails. Daarom twee functies die alleen de eigen rij raken.
--
-- Volgorde bij uitrollen: eerst dit bestand, dan de webhook deployen. Andersom
-- faalt de webhook op de onbekende kolommen (Stripe probeert het dan wel
-- opnieuw, maar het hoeft niet).

alter table public.profiles
    add column if not exists abo_status text,
    add column if not exists opgezegd boolean not null default false,
    add column if not exists proef_tot timestamptz,
    add column if not exists stripe_event_op timestamptz;

-- Staan de mails aan voor deze lezer? Zonder rij (stuur-mails maakt die pas
-- bij de eerste run) geldt het vinkje "Stuur me geen welkomstmails" uit de
-- aanmelding, net als in backend/stuur-mails.js.
create or replace function public.mails_aan()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_afgemeld boolean;
begin
    if v_uid is null then
        return null;
    end if;
    select afgemeld into v_afgemeld from public.mail_voorkeuren where uid = v_uid;
    if found then
        return not v_afgemeld;
    end if;
    -- = 'true' en geen ::boolean: user_metadata schrijft de lezer zelf, en
    -- een rare waarde mag de functie niet laten falen. Gelijk aan de
    -- `=== true` in stuur-mails.
    return not coalesce(
        (select raw_user_meta_data->>'geen_welkomstmails' = 'true' from auth.users where id = v_uid),
        false);
end;
$$;

create or replace function public.zet_mails(p_aan boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_aan boolean := coalesce(p_aan, true);
begin
    if v_uid is null then
        raise exception 'niet ingelogd' using errcode = '42501';
    end if;
    insert into public.mail_voorkeuren (uid, afgemeld, afgemeld_op)
    values (v_uid, not v_aan, case when v_aan then null else now() end)
    on conflict (uid) do update
        set afgemeld = excluded.afgemeld,
            afgemeld_op = excluded.afgemeld_op;
end;
$$;

revoke all on function public.mails_aan() from public, anon;
revoke all on function public.zet_mails(boolean) from public, anon;
grant execute on function public.mails_aan() to authenticated;
grant execute on function public.zet_mails(boolean) to authenticated;

-- 3. lees_artikel(): een artikel zonder volledige tekst (ouder dan de paywall)
--    gaf bij een leeg tegoed toch "op", en de v5-artikelpagina toonde dan de
--    Premium-paywall bij een artikel waar niets te ontgrendelen valt
--    (TODO 59, bewust opengelaten voor v5). Nu komt "geen_tekst" vóór het
--    tellen. Verder ongewijzigd ten opzichte van metered-paywall-2026-09-28.sql.
create or replace function public.lees_artikel(p_id text, p_lang text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid        uuid := auth.uid();
    v_premium    boolean;
    v_maand      date := date_trunc('month', now() at time zone 'Europe/Amsterdam')::date; -- de 1e om 00:00 Nederlandse tijd, zoals de teksten beloven
    v_limiet     integer := public.gratis_artikelen_per_maand();
    v_al_gelezen boolean;
    v_gebruikt   integer;
    v_tekst      text;
begin
    -- Niet ingelogd: geen tegoed, geen tekst. De front-end toont dan de
    -- samenvatting met een oproep om een account te maken.
    if v_uid is null then
        return jsonb_build_object('status', 'anoniem', 'gebruikt', 0, 'limiet', v_limiet);
    end if;

    select (is_premium and (premium_until is null or premium_until > now()))
      into v_premium
      from public.profiles
     where id = v_uid;

    select full_text into v_tekst
      from public.articles_full
     where id = p_id and lang = p_lang;

    if coalesce(v_premium, false) then
        return jsonb_build_object('status', 'premium', 'tekst', v_tekst);
    end if;

    -- Eén aanroep tegelijk per lezer, tot het einde van de transactie. Anders
    -- lezen twee tabbladen die tegelijk een ander artikel openen allebei
    -- "4 van 5 gebruikt" en krijgen ze allebei de tekst (2026-11-12).
    perform pg_advisory_xact_lock(hashtext(v_uid::text));

    select count(distinct artikel_id) into v_gebruikt
      from public.gelezen_artikelen
     where uid = v_uid and maand = v_maand;

    -- Een artikel zonder tekst in articles_full kost geen tegoed en is nooit
    -- "op": daar valt niets te ontgrendelen.
    if v_tekst is null then
        return jsonb_build_object('status', 'geen_tekst',
                                  'gebruikt', v_gebruikt, 'limiet', v_limiet);
    end if;

    -- Dit artikel deze maand al geopend? Dan gewoon opnieuw geven.
    select exists (
        select 1 from public.gelezen_artikelen
         where uid = v_uid and artikel_id = p_id and maand = v_maand
    ) into v_al_gelezen;

    if v_al_gelezen then
        return jsonb_build_object('status', 'gratis', 'tekst', v_tekst,
                                  'gebruikt', v_gebruikt, 'limiet', v_limiet);
    end if;

    -- Tegoed op: geen tekst, wel de cijfers zodat de melding kan kloppen.
    if v_gebruikt >= v_limiet then
        return jsonb_build_object('status', 'op',
                                  'gebruikt', v_gebruikt, 'limiet', v_limiet);
    end if;

    insert into public.gelezen_artikelen (uid, artikel_id, maand)
    values (v_uid, p_id, v_maand)
    on conflict do nothing;

    return jsonb_build_object('status', 'gratis', 'tekst', v_tekst,
                              'gebruikt', v_gebruikt + 1, 'limiet', v_limiet);
end;
$$;
