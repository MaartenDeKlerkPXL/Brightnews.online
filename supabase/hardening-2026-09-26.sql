-- Review-ronde 2026-09-26 (volledige codereview, besluit Erik):
-- 1. het feedback-endpoint begrenzen (het stond open voor anon zonder
--    lengte- of volumelimiet: één bot kon de database volpompen);
-- 2. twee nieuwe, met RLS afgeschermde tabellen voor het weekrapport en de
--    conceptposts — die stonden als statische bestanden op de site én in de
--    publieke repo, met bedrijfscijfers (abonnee-aantallen, acceptatiegraden)
--    voor iedereen leesbaar. Alleen team_leden lezen mee; schrijven doet
--    uitsluitend de pipeline (service role, buiten RLS om).

-- === 1a. Lengtelimieten op de vrije-tekstkolommen van feedback =============
-- droom (<=2000) en email (<=254) hadden ze al; deze drie nog niet.
alter table public.feedback
    add constraint feedback_taal_lengte    check (char_length(taal)    <= 10),
    add constraint feedback_pagina_lengte  check (char_length(pagina)  <= 300),
    add constraint feedback_toestel_lengte check (char_length(toestel) <= 20);

-- === 1b. Volumerem: max 100 inserts per uur ================================
-- Grof genoeg om nooit een echte bezoeker te raken (het formulier staat op
-- één pagina van een geparkeerde site), fijn genoeg om een script dat het
-- endpoint leegpompt binnen een uur te smoren. Security definer zodat de
-- count ook onder de anon-rol werkt; search_path gepind zoals overal.
create or replace function public.feedback_volumerem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if (select count(*) from public.feedback
        where aangemaakt_op > now() - interval '1 hour') >= 100 then
        raise exception 'feedback-limiet bereikt — probeer het over een uur opnieuw';
    end if;
    return new;
end;
$$;

drop trigger if exists feedback_volumerem on public.feedback;
create trigger feedback_volumerem
    before insert on public.feedback
    for each row execute function public.feedback_volumerem();

-- === 2a. Weekrapporten (team-only) =========================================
create table if not exists public.rapporten (
    week    text primary key,          -- ISO-week, bv. '2026-W39'
    inhoud  text not null,             -- het volledige rapport als markdown
    gemaakt timestamptz not null default now()
);
alter table public.rapporten enable row level security;
drop policy if exists rapporten_team_select on public.rapporten;
create policy rapporten_team_select on public.rapporten
    for select to authenticated
    using (exists (select 1 from public.team_leden t where t.uid = auth.uid()));
revoke all on public.rapporten from anon, authenticated;
grant select on public.rapporten to authenticated;

-- === 2b. Conceptposts van de postfabriek (team-only) =======================
create table if not exists public.marketing_posts (
    dag     text primary key,          -- 'YYYY-MM-DD'
    inhoud  jsonb not null,            -- { prompthash, onderwerp, tokens, perTaal }
    gemaakt timestamptz not null default now()
);
alter table public.marketing_posts enable row level security;
drop policy if exists mp_team_select on public.marketing_posts;
create policy mp_team_select on public.marketing_posts
    for select to authenticated
    using (exists (select 1 from public.team_leden t where t.uid = auth.uid()));
revoke all on public.marketing_posts from anon, authenticated;
grant select on public.marketing_posts to authenticated;
