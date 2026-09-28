-- Metered paywall (TODO punt 59) — Supabase-kant.
-- Draaien in de SQL-editor van het BrightNews-project. Idempotent.
--
-- Wat er verandert: een gratis lezer met een account mag een aantal volledige
-- artikelen per kalendermaand lezen. Daarna komt de premium-vraag. Wie premium
-- is merkt hier niets van.
--
-- WAAROM DIT SERVER-SIDE MOET, EN NIET IN localStorage KAN
-- De volledige artikeltekst staat in articles_full en komt nooit in de
-- publieke JSON. Een teller in de browser heeft dus niets om te ontgrendelen:
-- de tekst ís er simpelweg niet. Het tegoed moet dus hier worden bijgehouden,
-- op dezelfde plek waar de tekst vandaan komt. Bijkomend voordeel: een
-- privévenster omzeilt hem niet, want het tegoed hangt aan het account en niet
-- aan de browser.
--
-- WAT DIT BETEKENT VOOR NIET-INGELOGDE BEZOEKERS
-- Die houden wat ze nu hebben: de samenvatting van ~60 woorden, met een
-- oproep om een gratis account te maken. Het tegoed hangt aan auth.uid(), en
-- zonder account is er niets om het aan te hangen. Dat is bewust: registreren
-- is een veel kleinere stap dan betalen, en daarmee blijft de trap heel —
-- lezer wordt account, account wordt abonnee.

-- Het aantal gratis artikelen per maand. ÉÉN GETAL, ÉÉN PLEK.
-- Bijstellen = deze functie opnieuw draaien met een ander cijfer.
-- Vuistregel: te laag en niemand raakt gehecht, te hoog en niemand hoeft ooit
-- te betalen. Begin laag — omhoog bijstellen voelt als een cadeau, omlaag
-- bijstellen voelt als iets afnemen.
create or replace function public.gratis_artikelen_per_maand()
returns integer
language sql
immutable
as $$ select 5 $$;

-- Welke artikelen iemand deze maand al opende. (uid, artikel_id, maand) is de
-- sleutel: hetzelfde artikel twee keer openen kost geen tweede tegoed. Dat is
-- geen coulance maar noodzaak — anders raakt iemand die terugscrollt naar een
-- artikel dat hij vanmorgen las zijn maand kwijt.
create table if not exists public.gelezen_artikelen (
    uid         uuid not null references auth.users(id) on delete cascade,
    artikel_id  text not null,
    maand       date not null,          -- altijd de 1e van de maand
    gelezen_op  timestamptz not null default now(),
    primary key (uid, artikel_id, maand)
);

create index if not exists gelezen_artikelen_maand_idx
    on public.gelezen_artikelen (uid, maand);

alter table public.gelezen_artikelen enable row level security;
revoke all on public.gelezen_artikelen from anon, authenticated;

-- De vervanger van get_full_article. Die blijft bestaan (oudere pagina's en
-- eventuele andere aanroepers gebruiken hem nog) en verandert niet van gedrag.
create or replace function public.lees_artikel(p_id text, p_lang text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
    v_uid        uuid := auth.uid();
    v_premium    boolean;
    v_maand      date := date_trunc('month', now())::date;
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

    -- Dit artikel deze maand al geopend? Dan gewoon opnieuw geven.
    select exists (
        select 1 from public.gelezen_artikelen
         where uid = v_uid and artikel_id = p_id and maand = v_maand
    ) into v_al_gelezen;

    select count(distinct artikel_id) into v_gebruikt
      from public.gelezen_artikelen
     where uid = v_uid and maand = v_maand;

    if v_al_gelezen then
        return jsonb_build_object('status', 'gratis', 'tekst', v_tekst,
                                  'gebruikt', v_gebruikt, 'limiet', v_limiet);
    end if;

    -- Tegoed op: geen tekst, wel de cijfers zodat de melding kan kloppen.
    if v_gebruikt >= v_limiet then
        return jsonb_build_object('status', 'op',
                                  'gebruikt', v_gebruikt, 'limiet', v_limiet);
    end if;

    -- Een artikel zonder tekst in articles_full (ouder dan de paywall) kost
    -- geen tegoed: daar valt niets te ontgrendelen.
    if v_tekst is null then
        return jsonb_build_object('status', 'geen_tekst',
                                  'gebruikt', v_gebruikt, 'limiet', v_limiet);
    end if;

    insert into public.gelezen_artikelen (uid, artikel_id, maand)
    values (v_uid, p_id, v_maand)
    on conflict do nothing;

    return jsonb_build_object('status', 'gratis', 'tekst', v_tekst,
                              'gebruikt', v_gebruikt + 1, 'limiet', v_limiet);
end;
$$;

-- Alleen de stand, zonder een artikel te openen. Voor de profielpagina en
-- voor de melding onder de nieuwslijst.
create or replace function public.leestegoed()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
    v_uid      uuid := auth.uid();
    v_maand    date := date_trunc('month', now())::date;
    v_gebruikt integer := 0;
begin
    if v_uid is null then
        return jsonb_build_object('gebruikt', 0,
                                  'limiet', public.gratis_artikelen_per_maand());
    end if;
    select count(distinct artikel_id) into v_gebruikt
      from public.gelezen_artikelen
     where uid = v_uid and maand = v_maand;
    return jsonb_build_object('gebruikt', v_gebruikt,
                              'limiet', public.gratis_artikelen_per_maand());
end;
$$;

grant execute on function public.lees_artikel(text, text) to anon, authenticated;
grant execute on function public.leestegoed()            to anon, authenticated;
grant execute on function public.gratis_artikelen_per_maand() to anon, authenticated;
