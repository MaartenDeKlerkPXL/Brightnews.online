-- Beveiligingscontrole TODO 67 (2026-11-18): overbodige tabelrechten intrekken.
--
-- RLS staat op alle tabellen aan en houdt nu al alles tegen wat hieronder
-- wordt ingetrokken: articles_full en promo_codes hebben geen enkele policy,
-- profiles alleen "eigen rij lezen", feedback alleen "invoegen". Maar anon en
-- authenticated hadden er nog volledige GRANTs op (select, insert, update,
-- delete). Gaat RLS ooit per ongeluk uit (een migratie, een nieuwe tabel als
-- kopie), dan zou dat meteen de premiumteksten, de promocodes of andermans
-- profiel openzetten. Met deze REVOKE's is er een tweede slot.
--
-- Wat de site wél gebruikt, blijft werken:
--   - profiles: de browser leest alleen de eigen rij (js/v5/schil.js, js/auth.js);
--   - feedback: alleen invoegen (oud formulier);
--   - de premiumtekst en de promocodes gaan via security definer-functies
--     (lees_artikel, get_full_article, redeem_promo_code), die als eigenaar
--     draaien en dus niet van deze rechten afhangen;
--   - de Stripe-webhook en de Actions gebruiken service_role.

revoke all on table public.articles_full from anon, authenticated;
revoke all on table public.promo_codes   from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
    on table public.profiles from anon, authenticated;
revoke select on table public.profiles from anon;
revoke select, update, delete, truncate, references, trigger
    on table public.feedback from anon, authenticated;
