-- UX-review fase 3 (TODO 83, 2026-11-16): twee dingen in de database.
--
-- 1. Een dagoverzicht kost geen gratis artikel meer (besluit Maarten). Wie
--    ingelogd is, leest het helemaal, ook als het tegoed op is; er komt niets
--    bij in gelezen_artikelen. Niet ingelogd blijft het zoals het was: de
--    samenvatting en een gratis account.
--    Nieuwe status 'dagoverzicht'. Een oude artikel.js kent die niet en toont
--    dan gewoon de samenvatting, dus de volgorde van uitrollen maakt niet uit.
--
-- 2. Meldingen naar info@brightnews.online.
--    - Een contactbericht gaat direct als mail, met de afzender als
--      antwoordadres. Een trigger stuurt hem via pg_net naar Resend. Hooguit
--      20 per uur; de rest (en alles zolang er geen sleutel is) komt in de
--      verzamelmail van de ochtend.
--    - De feedback op artikelen komt alleen in die verzamelmail
--      (backend/meld-formulieren.js, .github/workflows/meld-formulieren.yml).
--    gemeld_op houdt bij wat al gemaild is, zodat niets twee keer komt. Lezers
--    kunnen die kolom niet zetten (de insert-rechten zijn per kolom).
--
-- De sleutel van Resend staat in de Vault van Supabase, onder de naam
-- resend_api_key (Project Settings → Vault → Add new secret). Dat doet Maarten
-- zelf; zonder die sleutel doet de trigger niets en gaat alles via de
-- verzamelmail. Een fout bij het mailen breekt nooit het opslaan van het bericht.

-- ── 1. Dagoverzicht gratis ─────────────────────────────────────────────

create or replace function public.lees_artikel(p_id text, p_lang text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
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

    -- Een dagoverzicht (id dg-…) kost geen tegoed (TODO 83, fase 3).
    if p_id like 'dg-%' and v_tekst is not null then
        return jsonb_build_object('status', 'dagoverzicht', 'tekst', v_tekst);
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
$function$;

-- ── 2. Meldingen ───────────────────────────────────────────────────────

-- In het schema extensions, niet public (advies van de Supabase-linter).
create extension if not exists pg_net with schema extensions;

alter table public.contactberichten add column if not exists gemeld_op timestamptz;
alter table public.artikel_feedback add column if not exists gemeld_op timestamptz;

create or replace function public.meld_contactbericht()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_sleutel   text;
    v_onderwerp text;
    v_afzender  text;
begin
    begin
        select decrypted_secret into v_sleutel
          from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
        if v_sleutel is null then return null; end if;
        if (select count(*) from public.contactberichten
             where gemeld_op > now() - interval '1 hour') >= 20 then
            return null;
        end if;

        v_onderwerp := case new.onderwerp
            when 'abonnement' then 'Vraag over abonnement'
            when 'account'    then 'Account of gegevens verwijderen'
            when 'fout'       then 'Fout in een artikel'
            when 'idee'       then 'Idee of suggestie'
            when 'pers'       then 'Pers of samenwerking'
            else 'Iets anders' end;
        v_afzender := regexp_replace(coalesce(nullif(btrim(new.naam), ''), new.email), '[[:cntrl:]]+', ' ', 'g');

        perform net.http_post(
            url := 'https://api.resend.com/emails',
            headers := jsonb_build_object('Content-Type', 'application/json',
                                          'Authorization', 'Bearer ' || v_sleutel),
            body := jsonb_build_object(
                'from', 'BrightNews <info@brightnews.online>',
                'to', jsonb_build_array('info@brightnews.online'),
                'reply_to', new.email,
                'subject', left('Contact: ' || v_onderwerp || ' (' || v_afzender || ')', 200),
                'text', 'Nieuw bericht via brightnews.online/contact.html' || E'\n\n'
                    || 'Van: ' || coalesce(nullif(btrim(new.naam), '') || ' ', '') || '<' || new.email || '>' || E'\n'
                    || 'Onderwerp: ' || v_onderwerp || E'\n'
                    || 'Taal: ' || coalesce(new.taal, '?') || E'\n'
                    || 'Ontvangen: ' || to_char(new.aangemaakt_op at time zone 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || E'\n\n'
                    || new.bericht || E'\n\n'
                    || '-- ' || E'\n' || 'Met Beantwoorden antwoord je de afzender rechtstreeks.'
            )
        );
        -- shortcut: gemeld_op zegt "verstuurd naar Resend", niet "afgeleverd";
        -- pg_net is async. Controle: net._http_response (een paar uur bewaard).
        update public.contactberichten set gemeld_op = now() where id = new.id;
    exception when others then
        raise warning 'meld_contactbericht: %', sqlerrm;
    end;
    return null;
end;
$$;

revoke all on function public.meld_contactbericht() from public, anon, authenticated;

drop trigger if exists meld_contactbericht on public.contactberichten;
create trigger meld_contactbericht after insert on public.contactberichten
    for each row execute function public.meld_contactbericht();
