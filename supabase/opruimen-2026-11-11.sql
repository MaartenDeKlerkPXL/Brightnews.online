-- Dagelijkse opruiming, zodat de privacyverklaring klopt (TODO 75, 2026-11-11).
-- Draaien in de SQL-editor van Supabase, na advisor-2026-11-11.sql.
-- Idempotent: twee keer draaien kan; cron.schedule met dezelfde naam
-- overschrijft de vorige.
--
-- De tekst belooft:
-- - mislukte promocodepogingen: "alleen het tijdstip, hooguit een dag";
-- - antwoorden via Feedback (en later berichten via Contact): "hooguit twee jaar".
-- redeem_promo_code() ruimde promo_attempts alleen op bij een volgende poging
-- van dezelfde lezer; de rest bleef staan, ook na het verwijderen van een account.

create extension if not exists pg_cron;

select cron.schedule(
    'opruimen-promo-attempts',
    '15 3 * * *', -- elke nacht 03:15 UTC
    $$delete from public.promo_attempts where attempted_at < now() - interval '1 day'$$
);

select cron.schedule(
    'opruimen-feedback',
    '30 3 * * *',
    $$delete from public.feedback where aangemaakt_op < now() - interval '2 years'$$
);

-- Controle: select jobname, schedule, active from cron.job;
-- Komt er een tabel voor Contact (TODO 66 punt 13), voeg dan hier een derde
-- regel toe met dezelfde twee jaar.
