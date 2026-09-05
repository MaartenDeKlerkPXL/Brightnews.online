-- 30 testgebruikers een maand gratis Glow (privé-uitnodigingen).
-- UITGEVOERD 2026-09-05 (geverifieerd: rij aanwezig, 0 verzilveringen).
-- Anti-misbruik zit al in redeem_promo_code v2: 1x per account,
-- max 10 pogingen/uur, en dit plafond + einddatum:
insert into public.promo_codes (code, duration_days, max_gebruik, keer_gebruikt, geldig_tot, plan)
values ('ZONNETJE30', 31, 35, 0, '2026-10-15T23:59:59Z', 'Glow')
on conflict do nothing
returning code, duration_days, max_gebruik, geldig_tot;
