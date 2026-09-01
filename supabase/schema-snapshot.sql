-- ============================================================================
-- BrightNews — snapshot van het live Supabase-schema (project rquuqypgaannrakdrabj)
-- Vastgelegd: 2026-09-01, via de Management-API (read-only catalogusqueries).
--
-- DOEL: de beveiligingskritieke SQL (paywall, promocodes, RLS) versiebeheerd
-- en reviewbaar maken. Tot dit bestand bestond, leefde deze logica uitsluitend
-- live in Supabase — precies het drift-patroon dat eerder het webhook-incident
-- veroorzaakte (zie BRIGHTNEWS-OVERDRACHT-FABLE.md, regel 11).
--
-- LET OP:
-- 1. Dit is een SNAPSHOT, geen migratiebestand: niet blind opnieuw uitvoeren.
--    Wijzig je iets aan het schema, werk dan én de database én dit bestand bij
--    (of vervang dit door echte migrations via `supabase db pull` zodra de
--    CLI-login werkt).
-- 2. De functiedefinities hieronder zijn letterlijk (pg_get_functiondef);
--    de CREATE TABLE-blokken zijn gereconstrueerd uit information_schema
--    (kolommen/defaults kloppen; constraints als PK zijn aannames op basis
--    van gebruik en gemarkeerd met een comment).
-- 3. Nog niet uitgelezen (introspectie geblokkeerd in de tooling): of
--    delete_user_immediately() daadwerkelijk als trigger op auth.users hangt.
--    Handmatig te checken in het dashboard (SQL editor):
--      select tgname from pg_trigger where tgrelid = 'auth.users'::regclass;
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabellen (gereconstrueerd)
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
    id uuid not null,                            -- PK (aanname); = auth.users.id
    is_premium boolean not null default false,
    premium_until timestamptz,
    plan_type text,
    lemon_customer_id text,
    lemon_subscription_id text,
    customer_portal_url text,
    updated_at timestamptz not null default now()
);

create table if not exists public.articles_full (
    id text not null,                            -- artikel-id uit news_{taal}.json
    lang text not null,                          -- PK (id, lang) (aanname; upsert
    full_text text not null,                     --  gebruikt onConflict: 'id,lang')
    created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
    code text not null,                          -- PK (aanname); wordt server-side
    plan text not null,                          --  ge-upper/trimd bij verzilvering
    duration_days integer not null default 30,
    geldig_tot timestamptz,
    max_gebruik integer,
    keer_gebruikt integer not null default 0,
    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Alle drie de tabellen hebben RLS AAN. Er is precies één policy; alles wat
-- geen policy heeft is daarmee voor anon/authenticated dicht (service_role
-- passeert RLS). De brede default-grants (zie onderaan) zijn daardoor inert,
-- maar intrekken blijft aanbevolen als verdedigingslaag.
-- ----------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.articles_full enable row level security;
alter table public.promo_codes   enable row level security;

create policy profiles_select_own on public.profiles
    for select using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Functies (letterlijk uit de live database, pg_get_functiondef)
-- ----------------------------------------------------------------------------

-- Paywall: geeft de volledige tekst alleen aan een ingelogde gebruiker met een
-- geldige premium-status; anders null. SECURITY DEFINER met gepinde search_path.
CREATE OR REPLACE FUNCTION public.get_full_article(p_id text, p_lang text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_is_premium boolean;
  v_text text;
begin
  select (is_premium and (premium_until is null or premium_until > now()))
    into v_is_premium
  from public.profiles
  where id = auth.uid();

  if coalesce(v_is_premium, false) is not true then
    return null;
  end if;

  select full_text into v_text
  from public.articles_full
  where id = p_id and lang = p_lang;

  return v_text;
end;
$function$;

-- Promocode-verzilvering: server-side normalisatie (upper/trim), vervaldatum-
-- en max_gebruik-check, verlenging vanaf bestaande vervaldatum.
-- BEKENDE BEPERKINGEN (bewust hier gedocumenteerd, fix gepland):
--  * geen registratie per gebruiker: dezelfde gebruiker kan dezelfde code
--    meermaals verzilveren (tot max_gebruik) en zo premium stapelen;
--  * geen rate limiting: codes zijn met de anon-key gratis te brute-forcen —
--    houd codes lang/onvoorspelbaar tot er een pogingslimiet is.
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

  select * into v_row from public.promo_codes where code = upper(trim(p_code)) for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'invalid_code');
  end if;

  if v_row.geldig_tot is not null and v_row.geldig_tot < now() then
    return jsonb_build_object('success', false, 'reason', 'expired');
  end if;

  if v_row.max_gebruik is not null and v_row.keer_gebruikt >= v_row.max_gebruik then
    return jsonb_build_object('success', false, 'reason', 'limit_reached');
  end if;

  update public.promo_codes set keer_gebruikt = keer_gebruikt + 1 where code = v_row.code;

  insert into public.profiles (id, is_premium, premium_until, plan_type, updated_at)
  values (v_uid, true, now() + (v_row.duration_days || ' days')::interval, v_row.plan, now())
  on conflict (id) do update set
    is_premium = true,
    -- Verleng vanaf de bestaande vervaldatum als die nog in de toekomst ligt,
    -- anders vanaf nu (voorkomt dat een code een lopend abonnement verkort).
    premium_until = greatest(coalesce(public.profiles.premium_until, now()), now()) + (v_row.duration_days || ' days')::interval,
    plan_type = v_row.plan,
    updated_at = now();

  return jsonb_build_object('success', true, 'plan', v_row.plan, 'duration_days', v_row.duration_days);
end;
$function$;

-- Accountverwijdering: triggerfunctie (RETURNS trigger — niet via RPC aan te
-- roepen). Verwijdert de auth-gebruiker zodra user_metadata.delete_requested
-- op 'true' wordt gezet (dat doet js/auth.js bij "Account verwijderen").
-- Zie de LET OP in de kop: of deze daadwerkelijk als trigger hangt is nog
-- handmatig te verifiëren.
CREATE OR REPLACE FUNCTION public.delete_user_immediately()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
BEGIN
    -- We kijken in de metadata of 'delete_requested' de tekst 'true' is
    IF (NEW.raw_user_meta_data->>'delete_requested')::text = 'true' THEN
        -- Wis de gebruiker definitief uit de auth.users tabel
        DELETE FROM auth.users WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- Grants zoals aangetroffen (informatief)
-- anon en authenticated hebben de Supabase-default ALL-grants op alle drie de
-- tabellen. Door RLS is dat momenteel inert, maar aanbevolen verharding:
--   revoke all on public.articles_full, public.promo_codes from anon, authenticated;
--   revoke insert, update, delete on public.profiles from anon, authenticated;
-- (nog niet uitgevoerd — eerst met Maarten afstemmen)
-- ----------------------------------------------------------------------------
