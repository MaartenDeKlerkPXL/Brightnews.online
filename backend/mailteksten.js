// De welkomstreeks na registratie (TODO punt 60), in vijf talen.
//
// Drie mails: bij aanmelding, na drie dagen en na een week. Losgetrokken van
// het verzendscript zodat de teksten te lezen en te wijzigen zijn zonder door
// code te hoeven — hetzelfde idee als backend/selectie-prompt.md.
//
// Plaatshouders die stuur-mails.js invult:
//   {naam}           voornaam uit user_metadata.full_name (of "daar")
//   {artikel_titel}  kop van het best scorende artikel in die taal
//   {artikel_url}    link naar dat artikel
//   {afmeld_url}     uitschrijflink met token — verplicht, ook bij mail 1
//
// Toon: geen uitroeptekens-marketing. BrightNews verkoopt rust, dus de mails
// horen te klinken als een redactie die iets uitlegt, niet als een winkel.

const MAILS = {
    nl: {
        welkom: {
            onderwerp: 'Welkom bij BrightNews',
            kop: 'Fijn dat je er bent, {naam}',
            alinea: [
                'BrightNews verzamelt elke dag nieuws waar je een beter gevoel van krijgt. Geen ramp, geen ruzie, geen doemscenario — wel herstel, hulp, doorbraken en mensen die iets voor elkaar krijgen.',
                'Dat klinkt eenvoudiger dan het is. Elk bericht dat binnenkomt wordt eerst getoetst: gaat de kern van dit verhaal ergens goed over, of wordt er alleen een positief sausje over iets naars gegoten? Pas als het die poort door komt, kijken we of het goed geschreven is en of het ertoe doet. Wat overblijft lees jij.',
                'Je vindt alles in vijf talen, en elke dag een overzicht van wat er die dag gebeurde.',
            ],
            knop: 'Lees het nieuws van vandaag',
        },
        dagdrie: {
            onderwerp: 'Dit las iedereen deze week',
            kop: 'Het best gelezen verhaal van deze week',
            alinea: [
                'Je bent nu een paar dagen lid, {naam}. Dit is het verhaal waar deze week de meeste mensen op klikten:',
                '{artikel_titel}',
                'Wil je dit vaker zien: het dagoverzicht op de homepage vat elke dag samen in één artikel, met de bronnen erbij.',
            ],
            knop: 'Lees het verhaal',
        },
        dagzeven: {
            onderwerp: 'Wat BrightNews Premium erbij geeft',
            kop: 'Een week verder',
            alinea: [
                'Je leest nu een week mee, {naam}. Daarom één keer uitleg over wat Premium doet, en daarna hoor je hier niets meer over.',
                'Gratis lees je elke dag mee. Met Premium krijg je de volledige artikelen in plaats van de samenvatting, en lees je zonder onderbrekingen.',
                'De eerste 30 dagen kosten niets. Bevalt het niet, dan zeg je op vóór die tijd en betaal je nul.',
            ],
            knop: 'Bekijk Premium',
        },
    },

    en: {
        welkom: {
            onderwerp: 'Welcome to BrightNews',
            kop: 'Glad you are here, {naam}',
            alinea: [
                'BrightNews gathers news that leaves you feeling better every day. No disasters, no shouting matches, no doom — but recovery, help, breakthroughs and people getting things done.',
                'That is harder than it sounds. Every story that comes in is tested first: is the heart of this story about something good, or is a positive coat of paint being applied to something grim? Only once it passes that gate do we look at how well it is written and whether it matters. What is left is what you read.',
                'Everything is available in five languages, plus a daily round-up of what happened that day.',
            ],
            knop: 'Read today’s news',
        },
        dagdrie: {
            onderwerp: 'What everyone read this week',
            kop: 'The most-read story this week',
            alinea: [
                'You have been with us a few days now, {naam}. This is the story most people clicked on this week:',
                '{artikel_titel}',
                'Want more of this: the daily digest on the homepage sums up each day in a single article, with the sources included.',
            ],
            knop: 'Read the story',
        },
        dagzeven: {
            onderwerp: 'What BrightNews Premium adds',
            kop: 'One week in',
            alinea: [
                'You have been reading for a week, {naam}. So here is one explanation of what Premium does, and then you will not hear about it again.',
                'Reading along daily is free. With Premium you get the full articles instead of the summary, and you read without interruptions.',
                'The first 30 days cost nothing. If it is not for you, cancel before then and you pay zero.',
            ],
            knop: 'See Premium',
        },
    },

    de: {
        welkom: {
            onderwerp: 'Willkommen bei BrightNews',
            kop: 'Schön, dass du da bist, {naam}',
            alinea: [
                'BrightNews sammelt jeden Tag Nachrichten, die ein besseres Gefühl hinterlassen. Keine Katastrophen, kein Streit, keine Untergangsszenarien — dafür Erholung, Hilfe, Durchbrüche und Menschen, die etwas bewegen.',
                'Das klingt einfacher, als es ist. Jede Meldung wird zuerst geprüft: Geht es im Kern dieser Geschichte um etwas Gutes, oder wird nur ein positiver Anstrich über etwas Schlimmes gelegt? Erst wenn sie dieses Tor passiert, schauen wir, wie gut sie geschrieben ist und ob sie zählt. Was übrig bleibt, liest du.',
                'Alles gibt es in fünf Sprachen, dazu täglich einen Überblick über den Tag.',
            ],
            knop: 'Die Nachrichten von heute lesen',
        },
        dagdrie: {
            onderwerp: 'Das haben diese Woche alle gelesen',
            kop: 'Die meistgelesene Geschichte dieser Woche',
            alinea: [
                'Du bist jetzt ein paar Tage dabei, {naam}. Das ist die Geschichte, die diese Woche am häufigsten geklickt wurde:',
                '{artikel_titel}',
                'Mehr davon: Der Tagesüberblick auf der Startseite fasst jeden Tag in einem Artikel zusammen, mit den Quellen dazu.',
            ],
            knop: 'Die Geschichte lesen',
        },
        dagzeven: {
            onderwerp: 'Was BrightNews Premium zusätzlich bietet',
            kop: 'Eine Woche später',
            alinea: [
                'Du liest jetzt seit einer Woche mit, {naam}. Deshalb einmal eine Erklärung, was Premium bringt — danach hörst du davon nichts mehr.',
                'Täglich mitlesen ist kostenlos. Mit Premium bekommst du die vollständigen Artikel statt der Zusammenfassung und liest ohne Unterbrechungen.',
                'Die ersten 30 Tage kosten nichts. Wenn es nicht passt, kündigst du vorher und zahlst null.',
            ],
            knop: 'Premium ansehen',
        },
    },

    fr: {
        welkom: {
            onderwerp: 'Bienvenue sur BrightNews',
            kop: 'Content de vous compter parmi nous, {naam}',
            alinea: [
                'BrightNews rassemble chaque jour des nouvelles qui font du bien. Pas de catastrophes, pas de querelles, pas de scénarios catastrophes — mais des rétablissements, de l’entraide, des avancées et des gens qui font bouger les choses.',
                'C’est moins simple qu’il n’y paraît. Chaque information est d’abord passée au crible : le cœur de cette histoire porte-t-il sur quelque chose de bon, ou s’agit-il d’une couche de vernis positif sur un sujet pénible ? Ce n’est qu’une fois cette porte franchie que nous regardons si c’est bien écrit et si cela compte. Ce qui reste, vous le lisez.',
                'Tout est disponible en cinq langues, avec chaque jour un résumé de la journée.',
            ],
            knop: 'Lire les nouvelles du jour',
        },
        dagdrie: {
            onderwerp: 'Ce que tout le monde a lu cette semaine',
            kop: 'L’article le plus lu cette semaine',
            alinea: [
                'Vous êtes parmi nous depuis quelques jours, {naam}. Voici l’histoire sur laquelle le plus de monde a cliqué cette semaine :',
                '{artikel_titel}',
                'Vous en voulez plus : le résumé du jour sur la page d’accueil condense chaque journée en un seul article, sources comprises.',
            ],
            knop: 'Lire l’article',
        },
        dagzeven: {
            onderwerp: 'Ce que BrightNews Premium apporte en plus',
            kop: 'Une semaine plus tard',
            alinea: [
                'Vous lisez depuis une semaine, {naam}. Voici donc une explication de ce qu’apporte Premium, et vous n’en entendrez plus parler ensuite.',
                'Lire chaque jour est gratuit. Avec Premium, vous recevez les articles complets au lieu du résumé, et vous lisez sans interruption.',
                'Les 30 premiers jours ne coûtent rien. Si cela ne vous convient pas, vous résiliez avant et vous ne payez rien.',
            ],
            knop: 'Découvrir Premium',
        },
    },

    es: {
        welkom: {
            onderwerp: 'Bienvenido a BrightNews',
            kop: 'Nos alegra tenerte aquí, {naam}',
            alinea: [
                'BrightNews reúne cada día noticias que te dejan mejor de lo que estabas. Sin desastres, sin peleas, sin escenarios catastróficos, pero sí recuperación, ayuda, avances y personas que consiguen cosas.',
                'Suena más sencillo de lo que es. Cada noticia que llega se somete primero a una prueba: ¿el núcleo de esta historia trata de algo bueno, o solo se le da una capa positiva a algo desagradable? Solo cuando pasa esa puerta miramos si está bien escrita y si importa. Lo que queda es lo que lees.',
                'Todo está en cinco idiomas, además de un resumen diario de lo que ocurrió ese día.',
            ],
            knop: 'Leer las noticias de hoy',
        },
        dagdrie: {
            onderwerp: 'Esto leyó todo el mundo esta semana',
            kop: 'La historia más leída de esta semana',
            alinea: [
                'Llevas unos días con nosotros, {naam}. Esta es la historia en la que más gente hizo clic esta semana:',
                '{artikel_titel}',
                'Si quieres más: el resumen del día en la página de inicio condensa cada jornada en un solo artículo, con las fuentes incluidas.',
            ],
            knop: 'Leer la historia',
        },
        dagzeven: {
            onderwerp: 'Qué añade BrightNews Premium',
            kop: 'Una semana después',
            alinea: [
                'Llevas una semana leyendo, {naam}. Por eso, una única explicación de lo que hace Premium; después no volverás a oír hablar de ello.',
                'Leer cada día es gratis. Con Premium recibes los artículos completos en lugar del resumen y lees sin interrupciones.',
                'Los primeros 30 días no cuestan nada. Si no te convence, cancelas antes y no pagas nada.',
            ],
            knop: 'Ver Premium',
        },
    },
};

// Vaste regels onderaan elke mail. De afmeldregel is niet optioneel: mail 3
// is werving, en zonder werkende uitschrijflink is dat in strijd met de AVG.
const VOET = {
    nl: { afmeld: 'Geen mails meer van BrightNews?', afmeldLink: 'Afmelden', reden: 'Je krijgt deze mail omdat je een BrightNews-account hebt aangemaakt.' },
    en: { afmeld: 'No more emails from BrightNews?', afmeldLink: 'Unsubscribe', reden: 'You are receiving this because you created a BrightNews account.' },
    de: { afmeld: 'Keine Mails mehr von BrightNews?', afmeldLink: 'Abmelden', reden: 'Du erhältst diese Mail, weil du ein BrightNews-Konto angelegt hast.' },
    fr: { afmeld: 'Plus de mails de BrightNews ?', afmeldLink: 'Se désabonner', reden: 'Vous recevez ce message parce que vous avez créé un compte BrightNews.' },
    es: { afmeld: '¿No quieres más correos de BrightNews?', afmeldLink: 'Darse de baja', reden: 'Recibes este mensaje porque creaste una cuenta de BrightNews.' },
};

const TALEN = Object.keys(MAILS);
const SOORTEN = ['welkom', 'dagdrie', 'dagzeven'];

// Na hoeveel dagen elke mail hoort te vertrekken.
const DAGEN = { welkom: 0, dagdrie: 3, dagzeven: 7 };

function vulIn(tekst, waarden) {
    return String(tekst).replace(/\{(\w+)\}/g, (heel, sleutel) =>
        Object.prototype.hasOwnProperty.call(waarden, sleutel) ? waarden[sleutel] : heel);
}

module.exports = { MAILS, VOET, TALEN, SOORTEN, DAGEN, vulIn };
