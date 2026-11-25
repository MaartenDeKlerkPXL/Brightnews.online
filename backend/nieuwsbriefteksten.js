// De wekelijkse nieuwsbrief (TODO 49), in vijf talen.
//
// Los van het verzendscript (backend/stuur-nieuwsbrief.js), zodat de teksten
// te lezen en te wijzigen zijn zonder door code te hoeven, net als
// backend/mailteksten.js voor de welkomstreeks.
//
// Plaatshouders die het script invult:
//   {titel}  de kop van het eerste (best scorende) verhaal, in het onderwerp
//
// Toon: zoals de rest. Rustig, geen uitroeptekens-marketing.

const NIEUWSBRIEF = {
    nl: {
        onderwerp: 'Deze week: {titel}',
        kop: 'De mooiste verhalen van deze week',
        intro: 'Elke zaterdag de verhalen die er deze week het meest uitsprongen, gekozen uit alles wat BrightNews bracht.',
        knop: 'Lees al het nieuws op BrightNews',
        reden: 'Je krijgt deze mail omdat je je hebt ingeschreven voor de nieuwsbrief van BrightNews.',
        afmeld: 'Liever geen nieuwsbrief meer?',
        afmeldLink: 'Afmelden',
    },
    en: {
        onderwerp: 'This week: {titel}',
        kop: 'The best stories of the week',
        intro: 'Every Saturday, the stories that stood out most this week, picked from everything BrightNews published.',
        knop: 'Read all the news on BrightNews',
        reden: 'You are receiving this because you signed up for the BrightNews newsletter.',
        afmeld: 'Rather not get the newsletter?',
        afmeldLink: 'Unsubscribe',
    },
    de: {
        onderwerp: 'Diese Woche: {titel}',
        kop: 'Die schönsten Geschichten der Woche',
        intro: 'Jeden Samstag die Geschichten, die diese Woche am meisten herausstachen, ausgewählt aus allem, was BrightNews gebracht hat.',
        knop: 'Alle Nachrichten auf BrightNews lesen',
        reden: 'Du erhältst diese Mail, weil du dich für den Newsletter von BrightNews angemeldet hast.',
        afmeld: 'Lieber keinen Newsletter mehr?',
        afmeldLink: 'Abmelden',
    },
    fr: {
        onderwerp: 'Cette semaine : {titel}',
        kop: 'Les plus belles histoires de la semaine',
        intro: 'Chaque samedi, les histoires qui ont le plus marqué la semaine, choisies parmi tout ce que BrightNews a publié.',
        knop: 'Lire toutes les nouvelles sur BrightNews',
        reden: 'Vous recevez ce message parce que vous vous êtes inscrit à la newsletter de BrightNews.',
        afmeld: 'Vous ne souhaitez plus la recevoir ?',
        afmeldLink: 'Se désabonner',
    },
    es: {
        onderwerp: 'Esta semana: {titel}',
        kop: 'Las historias más bonitas de la semana',
        intro: 'Cada sábado, las historias que más destacaron esta semana, elegidas entre todo lo que publicó BrightNews.',
        knop: 'Leer todas las noticias en BrightNews',
        reden: 'Recibes este mensaje porque te suscribiste al boletín de BrightNews.',
        afmeld: '¿Prefieres no recibir más el boletín?',
        afmeldLink: 'Darse de baja',
    },
};

module.exports = { NIEUWSBRIEF };
