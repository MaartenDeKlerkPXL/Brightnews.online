-- ============================================================================
-- Promocode-hardening + wees-profielrijen — VOORBEREID, NOG NIET UITGEVOERD
-- ============================================================================
-- Lost de twee "BEKENDE BEPERKINGEN" uit schema-snapshot.sql op (stapelen +
-- brute-force) en ruimt wees-profielrijen op (gotcha: accountverwijdering
-- laat de profiles-rij achter).
--
-- UITVOEREN: via de Management-API (query-endpoint, JSON in bestand,
-- -d @bestand — zie handoff §6/§7), in één keer; het script is idempotent.
-- DAARNA: deze definities overnemen in schema-snapshot.sql (die moet de
-- live stand blijven weerspiegelen) en de frontend-kant is al gemerged
-- (auth.js reason-keys + vertalingen promo_already_used/promo_rate_limited).
-- ============================================================================

-- 1. Verzilveringen per gebruiker (anti-stapelen) --------------------------
create table if not exists public.promo_redemptions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  redeemed_at timestamptz not null default now(),
  primary key (user_id, code)
);
alter table public.promo_redemptions enable row level security;
-- Geen policies: alléén de security-definer-functie leest/schrijft hier.
revoke all on public.promo_redemptions from anon, authenticated;

-- 2. Pogingenlog (brute-force-rem) -----------------------------------------
create table if not exists public.promo_attempts (
  user_id      uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists promo_attempts_user_time
  on public.promo_attempts (user_id, attempted_at);
alter table public.promo_attempts enable row level security;
revoke all on public.promo_attempts from anon, authenticated;

-- 3. redeem_promo_code v2 ---------------------------------------------------
-- Nieuw t.o.v. v1: rate limit (max 10 pogingen/uur/gebruiker, reason
-- 'rate_limited') en één verzilvering per code per gebruiker (reason
-- 'already_redeemed'). Verder identiek aan de live versie.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.promo_codes%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'not_logged_in');
  end if;

  -- opportunistische schoonmaak + pogingslimiet
  delete from public.promo_attempts
   where user_id = v_uid and attempted_at < now() - interval '1 day';
  if (select count(*) from public.promo_attempts
       where user_id = v_uid and attempted_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('success', false, 'reason', 'rate_limited');
  end if;
  insert into public.promo_attempts (user_id) values (v_uid);

  select * into v_row from public.promo_codes
   where code = upper(trim(p_code)) for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'invalid_code');
  end if;

  if v_row.geldig_tot is not null and v_row.geldig_tot < now() then
    return jsonb_build_object('success', false, 'reason', 'expired');
  end if;

  if v_row.max_gebruik is not null and v_row.keer_gebruikt >= v_row.max_gebruik then
    return jsonb_build_object('success', false, 'reason', 'limit_reached');
  end if;

  if exists (select 1 from public.promo_redemptions
              where user_id = v_uid and code = v_row.code) then
    return jsonb_build_object('success', false, 'reason', 'already_redeemed');
  end if;
  insert into public.promo_redemptions (user_id, code) values (v_uid, v_row.code);

  update public.promo_codes set keer_gebruikt = keer_gebruikt + 1
   where code = v_row.code;

  insert into public.profiles (id, is_premium, premium_until, plan_type, updated_at)
  values (v_uid, true, now() + (v_row.duration_days || ' days')::interval, v_row.plan, now())
  on conflict (id) do update set
    is_premium = true,
    premium_until = greatest(coalesce(public.profiles.premium_until, now()), now()) + (v_row.duration_days || ' days')::interval,
    plan_type = v_row.plan,
    updated_at = now();

  return jsonb_build_object('success', true, 'plan', v_row.plan, 'duration_days', v_row.duration_days);
end;
$function$;

-- 4. Wees-profielrijen ------------------------------------------------------
-- Opruimtrigger: profiel weg zodra de auth-gebruiker wordt verwijderd.
CREATE OR REPLACE FUNCTION public.cleanup_profile_after_user_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.profiles where id = OLD.id;
  return OLD;
end;
$function$;
drop trigger if exists trigger_cleanup_profile_on_user_delete on auth.users;
create trigger trigger_cleanup_profile_on_user_delete
  after delete on auth.users
  for each row execute function public.cleanup_profile_after_user_delete();

-- Eenmalige schoonmaak van bestaande wezen:
delete from public.profiles p
 where not exists (select 1 from auth.users u where u.id = p.id);

-- ============================================================================
-- 5. APART BESLUIT (eerst met Maarten afstemmen, zie schema-snapshot.sql):
-- grants-verharding op de bestaande tabellen. Door RLS momenteel inert,
-- maar verdediging-in-de-diepte:
--   revoke all on public.articles_full, public.promo_codes from anon, authenticated;
--   revoke insert, update, delete on public.profiles from anon, authenticated;
-- ============================================================================
