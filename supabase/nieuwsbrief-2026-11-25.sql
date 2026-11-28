-- De wekelijkse nieuwsbrief (TODO 49, besluit Maarten 2026-11-25: wekelijks).
-- Draaien in de SQL-editor van het BrightNews-project. Idempotent (if not
-- exists / or replace), dus opnieuw draaien kan.
--
-- Wat het maakt:
--   1. nieuwsbrief_abonnees  e-mailadres, taal, token en de data van
--                            inschrijven, bevestigen en afmelden
--   2. nieuwsbrief_log       welke editie naar wie ging (nooit dubbel)
--   3. drie RPC's voor de site, zonder inloggen:
--        nieuwsbrief_inschrijven(email, taal)  schrijft in en stuurt de
--                                              bevestigingsmail
--        nieuwsbrief_bevestig(token)           de link in die mail
--        nieuwsbrief_afmelden(token)           de link onder elke nieuwsbrief
--   4. de limiet per IP (formulier_rem) ook op inschrijven
--   5. opruimen: onbevestigd of afgemeld na 30 dagen weg
--
-- Dubbele opt-in (AVG): pas na de klik op de bevestigingslink krijgt iemand
-- de nieuwsbrief. De bevestigingsmail gaat direct vanuit de database via
-- pg_net naar Resend, met de sleutel uit de Vault (resend_api_key), net als
-- de contactmails (fase3-meldingen-2026-11-16.sql). pg_net verstuurt pas na
-- de commit; een fout bij het mailen breekt het inschrijven nooit.
--
-- Tegen misbruik (iemand schrijft andermans adres in):
--   - per adres hooguit 3 bevestigingsmails, minstens 10 minuten uit elkaar;
--     pas afmelden (met het token uit de mail) zet die teller terug
--   - in totaal hooguit 40 bevestigingsmails per uur (Resend: 100 per dag)
--   - de limiet per IP van formulier_rem: 5 per uur
-- De site zegt altijd hetzelfde ("kijk in je mail"), ook als het adres al
-- ingeschreven is: zo kun je er niet mee aftasten wie er abonnee is.
--
-- De nieuwsbrief zelf verstuurt backend/stuur-nieuwsbrief.js (Action
-- nieuwsbrief.yml) met de service_role.

-- 1. Abonnees ----------------------------------------------------------------
create table if not exists public.nieuwsbrief_abonnees (
    email               text primary key check (email = lower(email) and length(email) <= 254),
    taal                text not null check (taal in ('nl', 'en', 'de', 'fr', 'es')),
    token               uuid not null default gen_random_uuid() unique,
    aangemeld_op        timestamptz not null default now(),
    bevestigd_op        timestamptz,
    afgemeld_op         timestamptz,
    bevestigmails       integer not null default 0,
    bevestigmail_op     timestamptz,
    bevestigmail_verzoek bigint
);

-- 2. Verzendlog --------------------------------------------------------------
-- (email, editie) is de sleutel: dubbel versturen weigert de database zelf.
create table if not exists public.nieuwsbrief_log (
    email       text not null references public.nieuwsbrief_abonnees(email) on delete cascade,
    editie      date not null,
    verzonden   timestamptz not null default now(),
    provider_id text,
    primary key (email, editie)
);

alter table public.nieuwsbrief_abonnees enable row level security;
alter table public.nieuwsbrief_log      enable row level security;
revoke all on public.nieuwsbrief_abonnees from anon, authenticated;
revoke all on public.nieuwsbrief_log      from anon, authenticated;

-- 3a. De bevestigingsmail ----------------------------------------------------
-- Alleen aan te roepen vanuit nieuwsbrief_inschrijven (geen execute voor anon).
create or replace function public.nieuwsbrief_stuur_bevestiging(p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_rij       public.nieuwsbrief_abonnees;
    v_sleutel   text;
    v_link      text;
    v_onderwerp text;
    v_tekst     text;
    v_verzoek   bigint;
begin
    select * into v_rij from public.nieuwsbrief_abonnees where email = p_email for update;
    if not found or v_rij.bevestigd_op is not null or v_rij.afgemeld_op is not null then return; end if;
    if v_rij.bevestigmails >= 3 then return; end if;
    if v_rij.bevestigmail_op > now() - interval '10 minutes' then return; end if;
    if (select count(*) from public.nieuwsbrief_abonnees
         where bevestigmail_op > now() - interval '1 hour') >= 40 then return; end if;

    begin
        select decrypted_secret into v_sleutel
          from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
        if v_sleutel is null then return; end if;

        v_link := 'https://brightnews.online/nieuwsbrief.html?bevestig=' || v_rij.token;
        case v_rij.taal
        when 'nl' then
            v_onderwerp := 'Bevestig je inschrijving voor de nieuwsbrief van BrightNews';
            v_tekst := 'Hoi,' || E'\n\n'
                || 'Je hebt je ingeschreven voor de nieuwsbrief van BrightNews: elke zaterdag de mooiste verhalen van de week.' || E'\n\n'
                || 'Klik op deze link om je inschrijving te bevestigen:' || E'\n' || v_link || E'\n\n'
                || 'Heb je je niet zelf ingeschreven? Dan hoef je niets te doen. Zonder bevestiging krijg je niets van ons.' || E'\n\n'
                || 'Groet,' || E'\n' || 'BrightNews';
        when 'de' then
            v_onderwerp := 'Bestätige deine Anmeldung zum BrightNews-Newsletter';
            v_tekst := 'Hallo,' || E'\n\n'
                || 'du hast dich für den Newsletter von BrightNews angemeldet: jeden Samstag die schönsten Geschichten der Woche.' || E'\n\n'
                || 'Klicke auf diesen Link, um deine Anmeldung zu bestätigen:' || E'\n' || v_link || E'\n\n'
                || 'Du hast dich nicht selbst angemeldet? Dann musst du nichts tun. Ohne Bestätigung bekommst du nichts von uns.' || E'\n\n'
                || 'Viele Grüße' || E'\n' || 'BrightNews';
        when 'fr' then
            v_onderwerp := 'Confirmez votre inscription à la newsletter de BrightNews';
            v_tekst := 'Bonjour,' || E'\n\n'
                || 'Vous vous êtes inscrit à la newsletter de BrightNews : chaque samedi, les plus belles histoires de la semaine.' || E'\n\n'
                || 'Cliquez sur ce lien pour confirmer votre inscription :' || E'\n' || v_link || E'\n\n'
                || 'Ce n’est pas vous ? Vous n’avez rien à faire. Sans confirmation, vous ne recevrez rien de notre part.' || E'\n\n'
                || 'À bientôt,' || E'\n' || 'BrightNews';
        when 'es' then
            v_onderwerp := 'Confirma tu suscripción al boletín de BrightNews';
            v_tekst := 'Hola:' || E'\n\n'
                || 'Te has suscrito al boletín de BrightNews: cada sábado, las historias más bonitas de la semana.' || E'\n\n'
                || 'Haz clic en este enlace para confirmar tu suscripción:' || E'\n' || v_link || E'\n\n'
                || '¿No te has suscrito tú? No tienes que hacer nada. Sin confirmación, no recibirás nada de nosotros.' || E'\n\n'
                || 'Un saludo,' || E'\n' || 'BrightNews';
        else
            v_onderwerp := 'Confirm your subscription to the BrightNews newsletter';
            v_tekst := 'Hi,' || E'\n\n'
                || 'You signed up for the BrightNews newsletter: every Saturday, the best stories of the week.' || E'\n\n'
                || 'Click this link to confirm your subscription:' || E'\n' || v_link || E'\n\n'
                || 'Didn''t sign up yourself? Then there''s nothing to do. Without confirmation, you won''t hear from us.' || E'\n\n'
                || 'Best,' || E'\n' || 'BrightNews';
        end case;

        v_verzoek := net.http_post(
            url := 'https://api.resend.com/emails',
            headers := jsonb_build_object('Content-Type', 'application/json',
                                          'Authorization', 'Bearer ' || v_sleutel),
            body := jsonb_build_object(
                'from', 'BrightNews <info@brightnews.online>',
                'to', jsonb_build_array(v_rij.email),
                'subject', v_onderwerp,
                'text', v_tekst)
        );

        update public.nieuwsbrief_abonnees
           set bevestigmails = bevestigmails + 1,
               bevestigmail_op = now(),
               bevestigmail_verzoek = v_verzoek
         where email = v_rij.email;
    exception when others then
        -- Geen mail is jammer, een mislukte inschrijving erger: doorgaan.
        raise warning 'nieuwsbrief: bevestigingsmail mislukt (%)', sqlerrm;
    end;
end;
$$;

revoke all on function public.nieuwsbrief_stuur_bevestiging(text) from public, anon, authenticated;

-- 3b. Inschrijven ------------------------------------------------------------
-- Opnieuw inschrijven na afmelden: nieuw token, opnieuw bevestigen, teller
-- weer op nul. Een bevestigde abonnee die zich nog eens inschrijft: er
-- verandert niets (ook de taal niet, zodat een ander die niet kan omzetten).
create or replace function public.nieuwsbrief_inschrijven(p_email text, p_taal text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_email text := lower(btrim(coalesce(p_email, '')));
    v_taal  text := case when p_taal in ('nl', 'en', 'de', 'fr', 'es') then p_taal else 'en' end;
begin
    if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$' then
        raise exception 'ongeldig_adres' using errcode = 'P0001';
    end if;

    insert into public.nieuwsbrief_abonnees as a (email, taal)
    values (v_email, v_taal)
    on conflict (email) do update set
        taal          = case when a.bevestigd_op is null or a.afgemeld_op is not null then excluded.taal else a.taal end,
        token         = case when a.afgemeld_op is not null then gen_random_uuid() else a.token end,
        bevestigd_op  = case when a.afgemeld_op is not null then null else a.bevestigd_op end,
        bevestigmails = case when a.afgemeld_op is not null then 0 else a.bevestigmails end,
        bevestigmail_op = case when a.afgemeld_op is not null then null else a.bevestigmail_op end,
        aangemeld_op  = case when a.afgemeld_op is not null then now() else a.aangemeld_op end,
        afgemeld_op   = null;

    perform public.nieuwsbrief_stuur_bevestiging(v_email);
end;
$$;

-- 3c. Bevestigen: true als het token klopt (ook bij een tweede klik).
create or replace function public.nieuwsbrief_bevestig(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    update public.nieuwsbrief_abonnees
       set bevestigd_op = coalesce(bevestigd_op, now())
     where token = p_token and afgemeld_op is null;
    return found;
end;
$$;

-- 3d. Afmelden: zegt niets terug, net als meld_af().
create or replace function public.nieuwsbrief_afmelden(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    update public.nieuwsbrief_abonnees
       set afgemeld_op = now()
     where token = p_token and afgemeld_op is null;
end;
$$;

revoke all on function public.nieuwsbrief_inschrijven(text, text) from public;
revoke all on function public.nieuwsbrief_bevestig(uuid) from public;
revoke all on function public.nieuwsbrief_afmelden(uuid) from public;
grant execute on function public.nieuwsbrief_inschrijven(text, text) to anon, authenticated;
grant execute on function public.nieuwsbrief_bevestig(uuid) to anon, authenticated;
grant execute on function public.nieuwsbrief_afmelden(uuid) to anon, authenticated;

-- 4. De limiet per IP --------------------------------------------------------
-- formulier_rem uit formulieren-2026-11-12.sql, met één wijziging: ook de
-- nieuwsbrief krijgt 5 per uur per IP. De trigger draait ook bij een insert
-- die op een bestaand adres botst (on conflict), dus elke poging telt.
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
    v_per_ip  integer := case tg_table_name when 'contactberichten' then 5 when 'nieuwsbrief_abonnees' then 5 else 20 end;
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

drop trigger if exists formulier_rem on public.nieuwsbrief_abonnees;
create trigger formulier_rem before insert on public.nieuwsbrief_abonnees
    for each row execute function public.formulier_rem();

-- 5. Opruimen ----------------------------------------------------------------
-- Wie niet bevestigt of zich afmeldt, staat er na 30 dagen niet meer in
-- (de log gaat mee via on delete cascade). Belooft Privacy.html ook.
select cron.schedule('opruimen-nieuwsbrief', '55 3 * * *',
    $$delete from public.nieuwsbrief_abonnees
       where (bevestigd_op is null and aangemeld_op < now() - interval '30 days')
          or afgemeld_op < now() - interval '30 days'$$);
