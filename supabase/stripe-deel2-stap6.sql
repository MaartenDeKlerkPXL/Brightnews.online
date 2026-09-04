-- Stripe-migratie deel 2, stap 6 (STRIPE-MIGRATIE.md): kolom voor de
-- koppeling webhook-events -> profiel. Idempotent; uitvoeren via de
-- Management-API zodra Erik go geeft, daarna overnemen in schema-snapshot.
alter table public.profiles add column if not exists stripe_customer_id text;
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
