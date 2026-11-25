# Bereik vergroten zonder te posten (stand 25 november 2026)

Wat er al staat en dus niet meer hoeft: RSS-feeds in vijf talen, IndexNow,
nieuwssitemap, NewsArticle-gegevens, hreflang, Search Console.

## 1. Pers (Maarten verstuurt)

Het persbericht staat in `marketing/persbericht-nl.md`. Eén redactie per mail,
met een eigen eerste zin waarom het voor híén past. Niet in bcc naar iedereen.

| Redactie | Waarom | Waar sturen |
|---|---|---|
| Hogeschool PXL, communicatie | jouw school, award-verhaal | via je docent of de studentstartup-coördinator |
| Het Belang van Limburg | regio van PXL (Hasselt) | "tip de redactie" onderaan hbvl.be |
| Je eigen regionale krant / omroep | lokale student | contactpagina van die krant |
| Emerce | digitale media en start-ups | **redactie@emerce.nl** (geen pdf; anders gratis via hun Industry Wire) |
| Villamedia | vakblad journalistiek: AI kiest het nieuws | contactpagina op villamedia.nl |
| Bright.nl | tech en lifestyle | contactpagina op bright.nl |

Alleen het adres van Emerce is nagekeken. Bij de rest: het adres zelf op de
site opzoeken, niet gokken.

## 2. Google en nieuwslezers (Maarten vult in)

- **Google Publisher Center:** stappen en valkuilen staan in TODO 54. Kost een
  kwartier; daarna kan BrightNews in Google Nieuws verschijnen.
- **Flipboard:** aanmelden via flipboard.com/publishers met de feeds
  (`/feed-en.xml`, `/feed-nl.xml` …). Let op: Flipboard vroeg in 2017 een
  volledige feed, onze feeds geven bewust alleen de samenvatting (Premium).
  Proberen kost niets; een afwijzing is dan de verklaring.
- **Feedly en Inoreader:** daar kun je je niet aanmelden. Een feed verschijnt
  zodra één lezer hem toevoegt. Doe dat zelf één keer met elke taalfeed, dan
  is BrightNews daar vindbaar.

## 3. Reddit en Hacker News (Maarten plaatst, één keer)

Regels eerst lezen in de zijbalk van elk subreddit. Vuistregel: hooguit één
op de tien van je berichten mag over je eigen site gaan; een vers account dat
alleen linkt, wordt weggehaald.

- **r/UpliftingNews:** linkt naar nieuwsartikelen, niet naar projecten. Niet
  BrightNews zelf posten; hoogstens af en toe één sterk verhaal, als de regels
  dat toestaan.
- **r/SideProject** en **Hacker News (Show HN):** hier mag je eigen project
  juist. Concepten hieronder.

**Show HN: BrightNews – a good-news-only site in five languages, picked by Claude**

> I built a news site that only shows hopeful stories. Twice a day it pulls
> from about 16 sources; Claude Haiku scores every item on three criteria
> (does it make you feel good, is it framed positively, does it matter) and
> only 8/10 or higher gets in. Sonnet writes a short summary, Haiku
> translates it into NL/DE/FR/ES. No editorial team, static site on GitHub
> Pages, runs for under €75/month. Even from good-news sources, only about
> one in three items makes the cut.
> I'd love feedback on the selection: is what you see actually good news?
> https://brightnews.online

**r/SideProject: I made a news site that only shows good news (5 languages)**

> Same text as above, a bit shorter, plus what you learned: e.g. that the
> hardest part was not the AI but keeping out listicles and ads disguised as
> "good news".

Na het plaatsen: de eerste uren zelf op reacties antwoorden. Dat bepaalt of
een post blijft staan.

## 4. WhatsApp-kanaal (later)

Er komt bijna niemand vanzelf in: een kanaal is alleen te vinden als iemand
erop zoekt of jouw link krijgt. Meta heeft geen officiële manier om er
automatisch op te posten; de diensten die dat wel beloven, gaan om de regels
heen en riskeren een ban. Dus: zelf het dagoverzicht plakken (twee minuten).
Pas zinvol als de nieuwsbrief er is, zodat de link daarin en in de footer kan.

## 5. Nieuwsbrief en verwijssysteem (gebouwd door Claude, Erik reviewt)

- **Nieuwsbrief (TODO 49):** eerst. Raakt Supabase, dus als PR naar Erik.
- **Verwijssysteem (TODO 48):** daarna. Eerst samen met Erik beslissen wat
  de beloning is (gratis maand? langere proef?). Kanttekening uit TODO 48:
  het levert pas iets op vanaf zo'n 50 lezers.
