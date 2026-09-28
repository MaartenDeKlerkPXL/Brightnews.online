-- Welkomstreeks na registratie (TODO punt 60) — Supabase-kant.
-- Draaien in de SQL-editor van het BrightNews-project. Eén keer; het script
-- is idempotent (if not exists / or replace), dus opnieuw draaien kan.
--
-- Wat het maakt:
--   1. mail_voorkeuren  — per gebruiker een afmeldtoken en een afmeldvlag
--   2. mail_log         — welke mail wanneer naar wie is gegaan (geen dubbele)
--   3. meld_af()        — de RPC achter de uitschrijflink, zonder inloggen
--
-- Beide tabellen zijn dicht voor anon en authenticated: alleen de
-- service_role (het verzendscript in de Action) leest en schrijft erin.
-- Afmelden gaat daarom via een security definer-functie met een token, niet
-- via een directe update.

-- 1. Voorkeuren ---------------------------------------------------------------
create table if not exists public.mail_voorkeuren (
    uid          uuid primary key references auth.users(id) on delete cascade,
    token        uuid not null default gen_random_uuid(),
    afgemeld     boolean not null default false,
    afgemeld_op  timestamptz,
    aangemaakt   timestamptz not null default now()
);

create unique index if not exists mail_voorkeuren_token_idx
    on public.mail_voorkeuren (token);

-- 2. Verzendlog ---------------------------------------------------------------
-- (uid, soort) is de sleutel: één keer 'welkom', één keer 'dagdrie', één keer
-- 'dagzeven' per gebruiker. Dat is meteen de garantie tegen dubbel verzenden
-- als de Action twee keer draait of halverwege struikelt.
create table if not exists public.mail_log (
    uid        uuid not null references auth.users(id) on delete cascade,
    soort      text not null check (soort in ('welkom', 'dagdrie', 'dagzeven')),
    verzonden  timestamptz not null default now(),
    provider_id text,
    primary key (uid, soort)
);

-- 3. Afmelden zonder inloggen -------------------------------------------------
-- De uitschrijflink in de mail bevat het token. Deze functie is het enige wat
-- een niet-ingelogde bezoeker met dat token kan doen: zijn eigen rij op
-- afgemeld zetten. Hij geeft niets terug waaruit je kunt afleiden of een token
-- bestaat, zodat je er geen accounts mee kunt aftasten.
create or replace function public.meld_af(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.mail_voorkeuren
       set afgemeld = true,
           afgemeld_op = now()
     where token = p_token
       and afgemeld = false;
end;
$$;

-- 4. Rechten ------------------------------------------------------------------
alter table public.mail_voorkeuren enable row level security;
alter table public.mail_log        enable row level security;

-- Geen policies = geen toegang voor anon/authenticated. De service_role gaat
-- per definitie langs RLS heen; dat is precies de bedoeling.
revoke all on public.mail_voorkeuren from anon, authenticated;
revoke all on public.mail_log        from anon, authenticated;

grant execute on function public.meld_af(uuid) to anon, authenticated;
