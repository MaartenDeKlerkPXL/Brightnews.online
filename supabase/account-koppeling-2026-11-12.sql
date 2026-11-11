-- Mijn account en Bedankt koppelen (TODO 66, punten 10 en 12).
--
-- 1. Drie kolommen op profiles, gevuld door de stripe-webhook:
--      abo_status  de status bij Stripe: trialing, active, past_due, unpaid,
--                  canceled … (null = nooit een Stripe-abonnement gehad,
--                  bijvoorbeeld Premium via een promocode)
--      opgezegd    opgezegd maar nog niet afgelopen; Premium loopt door tot
--                  premium_until
--      proef_tot   einde van de proefperiode
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
    add column if not exists proef_tot timestamptz;

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
    return not coalesce(
        (select (raw_user_meta_data->>'geen_welkomstmails')::boolean from auth.users where id = v_uid),
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
