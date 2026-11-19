# Sociale media: bio, beelden en eerste posts (TODO 80.3 en 81)

Eén Engelstalig account op Facebook, Instagram en LinkedIn (besluit Maarten,
2026-11-19). Threads komt later; dat neemt de bio van Instagram over.

## Beelden in deze map

Elk beeld staat er twee keer in: als **SVG** (bron, bewerkbaar in Illustrator)
en als **PNG** (om te uploaden).

- `banner-facebook` (1640×624): omslagfoto Facebook. De tekst staat in het
  midden, dus ook op de telefoon (die de zijkanten afsnijdt) blijft alles zichtbaar.
- `banner-linkedin` (1128×191): omslag van de bedrijfspagina. De inhoud
  staat rechts van het midden, zodat het logo van de pagina er niet overheen valt.
- `post-sjabloon` (1080×1080): sjabloon voor een post op Instagram en Facebook.
- Profielfoto op alle drie: `../brightnews-logo-faviconv5.png` (400×400).

## Het postsjabloon in Illustrator

Eenmalig:
1. Installeer **Instrument Sans** (gratis, fonts.google.com → Instrument Sans →
   Get font → Download). Dubbelklik de bestanden Medium en SemiBold in de map
   `static` en kies Installeer. Zonder die letter zet Illustrator er een andere
   letter neer.
2. Open `post-sjabloon.svg` in Illustrator en sla het op als
   `brightnews-post.ai`, buiten de repo (bijv. in je map Documenten). Werk
   voortaan in dat bestand.
3. Kies de kop met het tekstgereedschap en doe *Text → Convert to Area Type*
   (Tekst → Omzetten in tekst in vak). Dan loopt een lange kop vanzelf door
   naar de volgende regel.

Elke dag (± 2 minuten):
1. Kopieer in de cockpit (`marketing.html`) de kop van het verhaal van vandaag.
2. Selecteer in Illustrator de voorbeeldkop, plak, en kijk of hij binnen drie
   regels past. Zo niet: maak de letter iets kleiner (74 pt → 64 pt).
3. Bij een dagoverzicht verander je het label *GOOD NEWS* in *DAILY DIGEST*.
   Rek het groene vlak mee uit als de tekst langer wordt.
4. *File → Export → Export for Screens* (⌥⌘E), formaat PNG, schaal 1x →
   een vierkante PNG van 1080×1080. Die zet je op Instagram en Facebook.

## Een post met foto: `post-sjabloon-foto.svg`

Voor een foto vol beeld. Een donker verloop onderaan (en een lichter bovenin,
achter het logo) houdt de witte tekst leesbaar, wat de foto ook is.

1. Open `post-sjabloon-foto.svg` in Illustrator en bewaar als `.ai` (buiten
   de repo).
2. Open het deelvenster Lagen (*Window → Layers*). Selecteer in de groep
   **foto** het bruine vlak en de tekst "Plaats hier je foto", en verwijder ze.
3. Kies *File → Place*, kies je foto en sleep hem over het hele vierkant.
   Sleep hem in Lagen in de groep **foto**, zodat hij ónder **verloop-onder**
   en **verloop-boven** ligt. Ligt hij erboven, dan zie je het verloop niet.
4. Is de foto bovenin erg licht en valt het logo weg? Kies **verloop-boven**
   en zet de dekking hoger (bijv. 70%) in het deelvenster Transparantie.
5. Kop en label aanpassen gaat zoals in het gewone sjabloon. Exporteer met
   ⌥⌘E als PNG, 1x.

Kies foto's waar onderaan iets rustigs staat (gras, water, lucht): daar komt
de tekst.

## Bio

**Instagram** (max. 150 tekens; Threads neemt deze over):
> Only good news ☀️ A handful of hopeful stories from around the world, every day, in five languages.
> Link: brightnews.online

**LinkedIn, tagline** (max. 120 tekens):
> Only good news. Hopeful stories from around the world, every day, in five languages.

**Facebook en LinkedIn** (beschrijving):
> BrightNews brings you a handful of hopeful stories from around the world every day, in five languages.
> Summarised from trusted sources, without the doomscrolling. Read along at brightnews.online.

## Posts vóór de lancering

Per post: het beeld (PNG in deze map) plus de tekst eronder als bijschrift.
Op Instagram werkt een link in het bijschrift niet; zet daar "Link in bio" in
de plaats van het webadres. De SVG van elk beeld is bewerkbaar in Illustrator.

**1. Aankondiging (19 november)** — beeld `post-1-aankondiging.png`
> The news can be different.
> On Sunday 22 November, BrightNews goes live: every day, a handful of stories about what is going right in the world. In English, Dutch, German, French and Spanish.
> Follow us and be the first to know. ☀️

**2. Waarom (20 november)** — beeld `post-2-waarom.png`
> A lot of people read less news because it brings them down. We get it.
> That is why BrightNews only picks stories that show real progress: a new treatment, a river that is clean again, a village that pulls together.
> Real news, from trusted sources. Just the good part.

**3. Hoe we kiezen (21 november)** — beeld `post-3-hoe-we-kiezen.png`
> How do you know a story is good news?
> Every story from a trusted news source is scored on three things: does it make you feel happy or hopeful, does it tell you what is going well without crisis language, and does it matter to society? Only stories that score well on all three make it onto BrightNews. War, crime, ads and clickbait stay out.
> See how it works: brightnews.online/zo-kiezen-we.html

**4. Lancering (22 november)** — beeld `post-4-lancering.png`
> We are live! ☀️
> From today, brightnews.online brings you a handful of hopeful stories from around the world every day, in five languages.
> The start of every story is free. With a free account you can read five full stories a month.
> Have a look around and tell us what you think.
