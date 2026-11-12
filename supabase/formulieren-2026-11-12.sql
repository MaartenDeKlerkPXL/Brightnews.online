-- Contact en Feedback van de v5-pagina's laten versturen (TODO 66 punt 13).
--
-- Twee tabellen waar iedereen in mag schrijven en niemand uit mag lezen
-- (lezen doet Maarten in het Supabase-dashboard, als service_role). Alles
-- wat de pagina's al controleren, controleert de database nog een keer: een
-- formulier is maar een voorstel, de anon-key kan rechtstreeks inserten.
--
-- Tegen spam:
--   - het honeypot-veld `website` (in de pagina: gevuld = niet versturen);
--   - per IP hooguit 5 contactberichten en 20 feedbackmeldingen per uur;
--   - in totaal hooguit 200 per uur per tabel, tegen een aanval vanaf veel IP's.
-- Het IP-adres zelf bewaren we niet: alleen md5(IP + datum + tabel), dat elke
-- dag verandert en na een dag weg is (pg_cron). Zo is het niet terug te
-- rekenen naar een adres en niet over dagen heen te volgen.
--
-- Bewaartermijn (privacyverklaring): berichten en feedback hooguit twee jaar.

create table if not exists public.contactberichten (
    id            bigint generated always as identity primary key,
    aangemaakt_op timestamptz not null default now(),
    naam          text check (char_length(naam) <= 100),
    email         text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$'),
    onderwerp     text not null check (onderwerp in ('abonnement', 'account', 'fout', 'idee', 'pers', 'anders')),
    bericht       text not null check (char_length(btrim(bericht)) >= 10 and char_length(bericht) <= 2000),
    taal          text check (taal in ('nl', 'en', 'de', 'fr', 'es'))
);

create table if not exists public.artikel_feedback (
    id            bigint generated always as identity primary key,
    aangemaakt_op timestamptz not null default now(),
    artikel_id    text check (char_length(artikel_id) <= 100),
    keuze         text not null check (keuze in ('samenvatting', 'bron', 'geen_goed', 'fout_artikel', 'idee', 'anders')),
    toelichting   text check (char_length(toelichting) <= 1000),
    email         text check (email is null or (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$')),
    taal          text check (taal in ('nl', 'en', 'de', 'fr', 'es')),
    -- "Iets anders" zonder uitleg zegt niets; de pagina vraagt minstens 10 tekens.
    check (keuze <> 'anders' or char_length(btrim(coalesce(toelichting, ''))) >= 10)
);

-- Alleen insert, voor iedereen. Geen select-, update- of delete-regels.
alter table public.contactberichten enable row level security;
alter table public.artikel_feedback enable row level security;
revoke all on public.contactberichten from anon, authenticated;
revoke all on public.artikel_feedback from anon, authenticated;
-- Per kolom: aangemaakt_op (en id) vult de database zelf. Anders kan iemand
-- met een datum in de toekomst de bewaartermijn van twee jaar omzeilen.
grant insert (naam, email, onderwerp, bericht, taal) on public.contactberichten to anon, authenticated;
grant insert (artikel_id, keuze, toelichting, email, taal) on public.artikel_feedback to anon, authenticated;

drop policy if exists "iedereen mag een bericht sturen" on public.contactberichten;
create policy "iedereen mag een bericht sturen" on public.contactberichten
    for insert to anon, authenticated with check (true);
drop policy if exists "iedereen mag feedback geven" on public.artikel_feedback;
create policy "iedereen mag feedback geven" on public.artikel_feedback
    for insert to anon, authenticated with check (true);

-- De limiet. Alleen de trigger (security definer) schrijft en leest hier.
create table if not exists public.formulier_pogingen (
    sleutel text not null,
    op      timestamptz not null default now()
);
create index if not exists formulier_pogingen_sleutel_op on public.formulier_pogingen (sleutel, op);
alter table public.formulier_pogingen enable row level security;
revoke all on public.formulier_pogingen from anon, authenticated;

create or replace function public.formulier_rem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_headers json := nullif(current_setting('request.headers', true), '')::json;
    v_ip      text;
    v_sleutel text;
    v_per_ip  integer := case tg_table_name when 'contactberichten' then 5 else 20 end;
begin
    -- Eén inzending tegelijk per tabel: anders zien tien gelijktijdige
    -- inserts allemaal nog nul pogingen en komen ze allemaal door.
    perform pg_advisory_xact_lock(hashtext('formulier_rem:' || tg_table_name));

    -- Eigen melding (te_vaak_totaal): de lezer heeft zelf niets fout gedaan,
    -- de pagina noemt dan het mailadres als andere weg.
    if (select count(*) from public.formulier_pogingen
         where sleutel like tg_table_name || ':%' and op > now() - interval '1 hour') >= 200 then
        raise exception 'te_vaak_totaal' using errcode = 'P0001', detail = 'totaal per uur bereikt';
    end if;

    -- Supabase zet het IP van de bezoeker in cf-connecting-ip of als eerste
    -- adres in x-forwarded-for. Dat laatste kan een bezoeker zelf meesturen;
    -- daarom eerst cf-connecting-ip, en de totaallimiet als vangnet. Zonder
    -- headers (SQL-editor, service_role) geldt alleen de totaallimiet.
    v_ip := coalesce(v_headers->>'cf-connecting-ip',
                     nullif(btrim(split_part(v_headers->>'x-forwarded-for', ',', 1)), ''));
    -- IPv6: per /64, want één aansluiting heeft er zo'n blok van.
    if v_ip like '%:%' then
        begin
            v_ip := host(set_masklen(v_ip::inet, 64)::cidr);
        exception when others then
            v_ip := null;   -- geen geldig adres: alleen de totaallimiet
        end;
    end if;
    if v_ip is not null then
        v_sleutel := tg_table_name || ':' || md5(v_ip || current_date::text || tg_table_name);
        if (select count(*) from public.formulier_pogingen
             where sleutel = v_sleutel and op > now() - interval '1 hour') >= v_per_ip then
            raise exception 'te_vaak' using errcode = 'P0001', detail = 'limiet per IP bereikt';
        end if;
    else
        v_sleutel := tg_table_name || ':zonder-ip';
    end if;

    insert into public.formulier_pogingen (sleutel) values (v_sleutel);
    return new;
end;
$$;

revoke all on function public.formulier_rem() from public, anon, authenticated;

drop trigger if exists formulier_rem on public.contactberichten;
create trigger formulier_rem before insert on public.contactberichten
    for each row execute function public.formulier_rem();
drop trigger if exists formulier_rem on public.artikel_feedback;
create trigger formulier_rem before insert on public.artikel_feedback
    for each row execute function public.formulier_rem();

-- Opruimen, naast de bestaande taken opruimen-promo-attempts (03:15) en
-- opruimen-feedback (03:30). cron.schedule met een bestaande naam werkt die bij.
select cron.schedule('opruimen-formulier-pogingen', '45 3 * * *',
    $$delete from public.formulier_pogingen where op < now() - interval '1 day'$$);
select cron.schedule('opruimen-contact-en-artikelfeedback', '50 3 * * *',
    $$delete from public.contactberichten where aangemaakt_op < now() - interval '2 years';
      delete from public.artikel_feedback where aangemaakt_op < now() - interval '2 years'$$);
