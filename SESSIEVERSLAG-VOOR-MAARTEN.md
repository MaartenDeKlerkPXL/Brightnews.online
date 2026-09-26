# Voor Maarten — wat er op 26 september is gebeurd

*Geschreven na de sessie van papa met Claude, in gewone taal. De technische
details staan in de pull requests (#8 en #9) en in `BRIGHTNEWS-OVERDRACHT-FABLE.md`.*

## Je werk stond niet voor niets te wachten — en nu draait het

Je twee pull requests zijn allebei bekeken, goedgekeurd en live gezet:

- **Het alarm** (PR #6): als een nachtelijke run stilletjes niets oplevert —
  zoals in september, toen de site drie dagen stilstond zonder dat iemand een
  mailtje kreeg — gaat er nu wél een melding uit. Bij het nakijken bleek er
  één klein foutje in te zitten dat per ongeluk álle runs zou hebben
  stilgelegd (een dubbele punt op een plek waar dat niet mag); dat is
  gerepareerd. Verder was je werk gewoon goed.
- **De meetlus** (PR #7): het weekrapport laat nu zien hoeveel mensen er via
  Google komen en op welke zoektermen. De Search Console-kant werkt meteen —
  er staan al echte cijfers in het rapport. **De Google Analytics-kant wacht
  op één klik van jou**: in Google Cloud de "Google Analytics Data API"
  aanzetten (staat stap voor stap bij punt 30 in `TODO.md`). Daarna vult dat
  deel zichzelf.

## Grote onderhoudsbeurt

Daarna is de hele codebase nog eens streng nagelopen — alles wat de laatste
weken is gebouwd, door jou en door ons. Er kwamen geen grote problemen uit,
wel een lijst kleinere dingen die stuk voor stuk zijn gerepareerd. De rode
draad: de site let nu véél beter op zichzelf. Het alarm bewaakt voortaan ook
de onderdelen die stilletjes konden falen (dagoverzichten, de postfabriek),
en er is een automatische controle die voorkomt dat bezoekers op een oude
versie van de site blijven hangen na een wijziging — dat is in september één
keer echt misgegaan, en dat kan nu niet meer ongemerkt.

## Eén ding dat je zult merken: de cockpit

Het weekrapport en de conceptposts stonden tot nu toe als gewone bestanden op
de site — en omdat de site en de code openbaar zijn, kon in principe iedereen
onze cijfers (aantal abonnees, wat goed en slecht scoort) meelezen. Dat is
verhuisd: die gegevens staan nu veilig in de database en zijn alleen zichtbaar
voor jou en papa, na inloggen. **Kijk bij je volgende bezoek even of de
cockpit (`marketing.html`) alles nog netjes toont** — je bestaande posts en
rapporten zijn meeverhuisd, er zou niets weg mogen zijn.

## Wat jij morgen kunt doen

1. Begin zoals altijd met **"verder met BrightNews"** — de vaste checklist
   (pull requests eerst, dan `TODO.md`) wijst vanzelf de weg.
2. **Google Analytics Data API aanzetten** (punt 30 in `TODO.md`) — één klik.
3. **De cockpit even nalopen** na de verhuizing.
4. Voor de socials-koppeling (punt 45) ben jij aan zet met de accounts
   (Facebook-pagina, Instagram Business, LinkedIn-bedrijfspagina) — pas
   daarna kan er gebouwd worden.

Papa heeft zelf nog drie punten op zijn naam staan (de privacytekst nalezen,
de selectieprompt bijstellen, en iets in de Anthropic-console) — daar hoef
jij niets mee.

Dit bestand mag weg zodra je het gelezen hebt.
