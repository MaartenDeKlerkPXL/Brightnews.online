-- UX-review fase 5 (TODO 83, 2026-11-16): een contactmail die Resend weigert,
-- mag niet verloren gaan (review fase 1–4, punt 1).
--
-- Eerst (fase3-meldingen-2026-11-16.sql) zette de trigger gemeld_op meteen na
-- het versturen. pg_net is asynchroon: weigerde Resend de mail (verkeerde
-- sleutel, 429, storing), dan stond het bericht toch als gemeld en sloeg ook de
-- verzamelmail van de ochtend het over. Een verzoek om je gegevens te laten
-- verwijderen kon zo ongemerkt blijven liggen.
--
-- Nu:
--   - de trigger bewaart alleen het verzoeknummer van pg_net (mail_verzoek);
--   - elke 5 minuten kijkt pg_cron in net._http_response: antwoordde Resend
--     met 2xx, dan pas krijgt het bericht gemeld_op;
--   - lukte het niet, dan blijft gemeld_op leeg en komt het bericht mee in de
--     verzamelmail van de ochtend (backend/meld-formulieren.js).
-- Het maximum van 20 per uur telt nu de directe mails (mail_verzoek), niet
-- gemeld_op; anders blokkeerde de verzamelmail een uur lang de directe mails.

alter table public.contactberichten add column if not exists mail_verzoek bigint;

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
    v_verzoek   bigint;
begin
    begin
        select decrypted_secret into v_sleutel
          from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
        if v_sleutel is null then return null; end if;
        if (select count(*) from public.contactberichten
             where mail_verzoek is not null and aangemaakt_op > now() - interval '1 hour') >= 20 then
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

        v_verzoek := net.http_post(
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
        update public.contactberichten set mail_verzoek = v_verzoek where id = new.id;
    exception when others then
        raise warning 'meld_contactbericht: %', sqlerrm;
    end;
    return null;
end;
$$;

revoke all on function public.meld_contactbericht() from public, anon, authenticated;

-- Afvinken wat Resend echt heeft aangenomen. net._http_response bewaart de
-- antwoorden een paar uur; elke 5 minuten kijken is dus ruim op tijd.
select cron.schedule('contactmail-bevestigen', '*/5 * * * *',
    $$update public.contactberichten c set gemeld_op = now()
        from net._http_response r
       where r.id = c.mail_verzoek and c.gemeld_op is null
         and r.status_code between 200 and 299$$);
