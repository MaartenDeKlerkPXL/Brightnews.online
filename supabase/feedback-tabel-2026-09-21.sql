-- Tabel voor de feedbackvraag in de footer (TODO punt 35).
-- Draaien in de SQL-editor van Supabase; daarna werkt het formulier meteen.
--
-- Anoniem van opzet: geen user_id, geen user agent, geen IP. Het toestel
-- wordt als één woord bewaard ('mobiel' / 'tablet' / 'desktop') zodat we
-- "werkt het op mijn telefoon" kunnen beantwoorden zonder iemand te kunnen
-- herkennen. Het e-mailadres is optioneel en vult de bezoeker zelf in.

create table if not exists public.feedback (
    id             bigint generated always as identity primary key,
    aangemaakt_op  timestamptz not null default now(),

    taal           text,
    pagina         text,
    toestel        text,

    -- De vijf schalen, elk 1 t/m 5 en allemaal optioneel.
    positief       smallint check (positief  between 1 and 5),
    techniek       smallint check (techniek  between 1 and 5),
    uiterlijk      smallint check (uiterlijk between 1 and 5),
    navigatie      smallint check (navigatie between 1 and 5),
    teksten        smallint check (teksten   between 1 and 5),

    droom          text check (char_length(droom) <= 2000),
    email          text check (char_length(email) <= 254),

    -- Een volledig leeg formulier hoeft niet bewaard te worden. Het
    -- formulier weigert dat zelf ook al, dit is de grendel erachter.
    constraint feedback_niet_leeg check (
        positief is not null or techniek is not null or uiterlijk is not null
        or navigatie is not null or teksten is not null or droom is not null
    )
);

alter table public.feedback enable row level security;

-- Alleen toevoegen mag, en verder niets: er is bewust géén select-, update-
-- of delete-policy voor anon. Bezoekers kunnen dus niet elkaars antwoorden
-- lezen. Zelf meelezen doe je in het Supabase-dashboard (service role).
drop policy if exists "iedereen mag feedback achterlaten" on public.feedback;
create policy "iedereen mag feedback achterlaten"
    on public.feedback
    for insert
    to anon, authenticated
    with check (true);

-- Handig bij het terugkijken: nieuwste eerst.
create index if not exists feedback_aangemaakt_op_idx
    on public.feedback (aangemaakt_op desc);
