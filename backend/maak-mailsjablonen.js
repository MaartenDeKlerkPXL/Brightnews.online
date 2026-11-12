// De mails van Supabase in de v5-huisstijl en in de taal van de lezer (TODO 74).
//
// Supabase verstuurt zelf vijf soorten mail: inloglink, account bevestigen,
// wachtwoord opnieuw instellen, e-mailadres wijzigen en uitnodiging. Hun
// sjablonen staan in het dashboard (Authentication → Emails → Templates);
// dit script maakt ze uit één bron, zodat ze ook in de repo staan.
//
// Taal: de sjablonen kiezen met Go-templatecode op user_metadata.preferred_lang
// (gezet bij het aanmaken van een account, en bijgewerkt als de lezer van
// taal wisselt; js/v5/inloggen.js en js/v5/schil.js). Zonder taal: Engels.
// printf "%v" maakt er altijd tekst van: user_metadata schrijft de lezer
// zelf, en een getal in plaats van tekst mag het sjabloon niet laten vallen.
//
//   node backend/maak-mailsjablonen.js         schrijft supabase/templates/
//   SUPABASE_ACCESS_TOKEN=… node backend/maak-mailsjablonen.js --zet
//                                              zet ze ook in Supabase (Management API),
//                                              na een backup in supabase/templates/vorige.json
//   SUPABASE_ACCESS_TOKEN=… node backend/maak-mailsjablonen.js --terug
//                                              zet die backup terug
//
// Het toegangstoken maak je op supabase.com/dashboard/account/tokens. Zet het
// alleen in je eigen terminal, nooit in de repo of in een chat.

const fs = require('fs');
const path = require('path');
const { mailHtml, escape } = require('./mailopmaak');

const PROJECT = 'rquuqypgaannrakdrabj';
const TALEN = ['nl', 'en', 'de', 'fr', 'es'];
const URL = '{{ .ConfirmationURL }}';
const NIEUW = '{{ .NewEmail }}';

const VOET = {
    nl: 'Je krijgt deze mail omdat er op brightnews.online om werd gevraagd met dit e-mailadres.',
    en: 'You’re receiving this because it was requested on brightnews.online with this email address.',
    de: 'Du bekommst diese Mail, weil sie auf brightnews.online mit dieser E-Mail-Adresse angefordert wurde.',
    fr: 'Vous recevez ce message parce qu’il a été demandé sur brightnews.online avec cette adresse e-mail.',
    es: 'Recibes este correo porque se pidió en brightnews.online con esta dirección.',
};
const KNOP_WERKT_NIET = {
    nl: 'Werkt de knop niet? Plak deze link in je browser:',
    en: 'Button not working? Paste this link into your browser:',
    de: 'Der Button funktioniert nicht? Füge diesen Link in deinen Browser ein:',
    fr: 'Le bouton ne fonctionne pas ? Collez ce lien dans votre navigateur :',
    es: '¿El botón no funciona? Pega este enlace en tu navegador:',
};

// Per sjabloon en taal: onderwerp, kop, tekst, knop, en een regel eronder.
const SJABLONEN = {
    magic_link: {
        nl: ['Je inloglink voor BrightNews', 'Log in bij BrightNews', 'Klik op de knop om in te loggen. De link werkt één keer.', 'Inloggen', 'Heb je dit niet aangevraagd? Dan kun je deze mail gewoon negeren.'],
        en: ['Your BrightNews sign-in link', 'Sign in to BrightNews', 'Click the button to sign in. The link works once.', 'Sign in', 'Didn’t ask for this? You can safely ignore this email.'],
        de: ['Dein Anmeldelink für BrightNews', 'Bei BrightNews anmelden', 'Klick auf den Button, um dich anzumelden. Der Link funktioniert einmal.', 'Anmelden', 'Hast du das nicht angefordert? Dann kannst du diese Mail einfach ignorieren.'],
        fr: ['Votre lien de connexion à BrightNews', 'Connectez-vous à BrightNews', 'Cliquez sur le bouton pour vous connecter. Le lien ne fonctionne qu’une fois.', 'Se connecter', 'Vous n’avez rien demandé ? Vous pouvez ignorer ce message.'],
        es: ['Tu enlace de acceso a BrightNews', 'Entra en BrightNews', 'Pulsa el botón para iniciar sesión. El enlace funciona una sola vez.', 'Iniciar sesión', '¿No lo has pedido tú? Puedes ignorar este correo.'],
    },
    confirmation: {
        nl: ['Bevestig je e-mailadres voor BrightNews', 'Welkom bij BrightNews', 'Bevestig je e-mailadres en je gratis account is klaar. Je leest dan 5 volledige artikelen per maand.', 'E-mailadres bevestigen', 'Heb je geen account gemaakt? Dan kun je deze mail negeren; er gebeurt niets.'],
        en: ['Confirm your email for BrightNews', 'Welcome to BrightNews', 'Confirm your email address and your free account is ready. You can then read 5 full articles a month.', 'Confirm email address', 'Didn’t create an account? You can ignore this email; nothing will happen.'],
        de: ['Bestätige deine E-Mail-Adresse für BrightNews', 'Willkommen bei BrightNews', 'Bestätige deine E-Mail-Adresse, dann ist dein kostenloses Konto bereit. Du liest dann 5 vollständige Artikel pro Monat.', 'E-Mail-Adresse bestätigen', 'Du hast kein Konto angelegt? Dann kannst du diese Mail ignorieren; es passiert nichts.'],
        fr: ['Confirmez votre adresse e-mail pour BrightNews', 'Bienvenue sur BrightNews', 'Confirmez votre adresse e-mail et votre compte gratuit est prêt. Vous pourrez alors lire 5 articles complets par mois.', 'Confirmer l’adresse e-mail', 'Vous n’avez pas créé de compte ? Ignorez ce message, rien ne se passera.'],
        es: ['Confirma tu correo para BrightNews', 'Te damos la bienvenida a BrightNews', 'Confirma tu dirección de correo y tu cuenta gratuita estará lista. Podrás leer 5 artículos completos al mes.', 'Confirmar correo', '¿No has creado una cuenta? Ignora este correo; no pasará nada.'],
    },
    recovery: {
        nl: ['Kies een nieuw wachtwoord voor BrightNews', 'Kies een nieuw wachtwoord', 'Je vroeg om een nieuw wachtwoord. Klik op de knop om er een te kiezen. De link werkt één keer.', 'Nieuw wachtwoord kiezen', 'Heb je dit niet aangevraagd? Dan blijft je wachtwoord zoals het is.'],
        en: ['Choose a new BrightNews password', 'Choose a new password', 'You asked for a new password. Click the button to choose one. The link works once.', 'Choose a new password', 'Didn’t ask for this? Your password stays as it is.'],
        de: ['Wähle ein neues Passwort für BrightNews', 'Wähle ein neues Passwort', 'Du hast ein neues Passwort angefordert. Klick auf den Button, um eins zu wählen. Der Link funktioniert einmal.', 'Neues Passwort wählen', 'Hast du das nicht angefordert? Dann bleibt dein Passwort, wie es ist.'],
        fr: ['Choisissez un nouveau mot de passe BrightNews', 'Choisissez un nouveau mot de passe', 'Vous avez demandé un nouveau mot de passe. Cliquez sur le bouton pour en choisir un. Le lien ne fonctionne qu’une fois.', 'Choisir un mot de passe', 'Vous n’avez rien demandé ? Votre mot de passe ne change pas.'],
        es: ['Elige una nueva contraseña de BrightNews', 'Elige una nueva contraseña', 'Has pedido una nueva contraseña. Pulsa el botón para elegirla. El enlace funciona una sola vez.', 'Elegir contraseña', '¿No lo has pedido tú? Tu contraseña sigue igual.'],
    },
    email_change: {
        nl: ['Bevestig je nieuwe e-mailadres', 'Bevestig je nieuwe e-mailadres', `Je wilt je e-mailadres bij BrightNews wijzigen naar ${NIEUW}. Klik op de knop om dat te bevestigen.`, 'Nieuw adres bevestigen', 'Heb je dit niet aangevraagd? Laat het ons weten via brightnews.online/contact.html.'],
        en: ['Confirm your new email address', 'Confirm your new email address', `You want to change your BrightNews email address to ${NIEUW}. Click the button to confirm.`, 'Confirm new address', 'Didn’t ask for this? Let us know via brightnews.online/contact.html.'],
        de: ['Bestätige deine neue E-Mail-Adresse', 'Bestätige deine neue E-Mail-Adresse', `Du möchtest deine E-Mail-Adresse bei BrightNews in ${NIEUW} ändern. Klick auf den Button, um das zu bestätigen.`, 'Neue Adresse bestätigen', 'Hast du das nicht angefordert? Sag uns Bescheid über brightnews.online/contact.html.'],
        fr: ['Confirmez votre nouvelle adresse e-mail', 'Confirmez votre nouvelle adresse e-mail', `Vous souhaitez remplacer votre adresse e-mail BrightNews par ${NIEUW}. Cliquez sur le bouton pour confirmer.`, 'Confirmer la nouvelle adresse', 'Vous n’avez rien demandé ? Prévenez-nous via brightnews.online/contact.html.'],
        es: ['Confirma tu nueva dirección de correo', 'Confirma tu nueva dirección de correo', `Quieres cambiar tu correo de BrightNews a ${NIEUW}. Pulsa el botón para confirmarlo.`, 'Confirmar nueva dirección', '¿No lo has pedido tú? Avísanos en brightnews.online/contact.html.'],
    },
    invite: {
        nl: ['Je bent uitgenodigd voor BrightNews', 'Je bent uitgenodigd voor BrightNews', 'Je bent uitgenodigd om een account te maken bij BrightNews: elke dag nieuws waar je een beter gevoel van krijgt, in vijf talen.', 'Uitnodiging aannemen', 'Verwacht je dit niet? Dan kun je deze mail negeren.'],
        en: ['You’re invited to BrightNews', 'You’re invited to BrightNews', 'You’ve been invited to create a BrightNews account: news that makes you feel better, every day, in five languages.', 'Accept invitation', 'Not expecting this? You can ignore this email.'],
        de: ['Du bist zu BrightNews eingeladen', 'Du bist zu BrightNews eingeladen', 'Du bist eingeladen, ein Konto bei BrightNews anzulegen: jeden Tag Nachrichten, die gute Laune machen, in fünf Sprachen.', 'Einladung annehmen', 'Hast du das nicht erwartet? Dann kannst du diese Mail ignorieren.'],
        fr: ['Vous êtes invité sur BrightNews', 'Vous êtes invité sur BrightNews', 'Vous êtes invité à créer un compte BrightNews : chaque jour des nouvelles qui font du bien, en cinq langues.', 'Accepter l’invitation', 'Vous ne vous y attendiez pas ? Ignorez ce message.'],
        es: ['Te han invitado a BrightNews', 'Te han invitado a BrightNews', 'Te han invitado a crear una cuenta en BrightNews: cada día noticias que te hacen sentir mejor, en cinco idiomas.', 'Aceptar la invitación', '¿No te lo esperabas? Ignora este correo.'],
    },
};

// Tekst escapen, maar de Go-templatecode ({{ … }}) heel laten.
const veilig = s => escape(s).replace(/\{\{ \.(\w+) \}\}/g, '{{ .$1 }}');

// Kies per taal; Engels als terugval (ook voor een onbekende taal).
function perTaal(maak) {
    const [eerste, ...rest] = TALEN.filter(l => l !== 'en');
    return `{{ $taal := printf "%v" (or .Data.preferred_lang "en") }}{{ if eq $taal "${eerste}" }}${maak(eerste)}`
        + rest.map(l => `{{ else if eq $taal "${l}" }}${maak(l)}`).join('')
        + `{{ else }}${maak('en')}{{ end }}`;
}

function sjabloon(naam) {
    const teksten = SJABLONEN[naam];
    const onderwerp = perTaal(l => teksten[l][0]);
    const html = perTaal(l => {
        const [, kop, tekst, knop, onder] = teksten[l];
        return mailHtml({
            taal: l,
            kop: veilig(kop),
            alineas: [veilig(tekst)],
            knop: veilig(knop),
            knopUrl: URL,
            onderKnop: [veilig(onder), `${veilig(KNOP_WERKT_NIET[l])}<br><a href="${URL}" style="color:#186F49;word-break:break-all">${URL}</a>`],
            voet: [veilig(VOET[l]), 'BrightNews · brightnews.online'],
        });
    });
    return { onderwerp, html };
}

// De sjablonen van vóór --zet, om mee terug te kunnen (--terug). Alleen de
// mailvelden: de rest van de auth-config (met o.a. SMTP) komt niet op schijf.
const VORIGE = path.join(__dirname, '..', 'supabase', 'templates', 'vorige.json');

async function authConfig(methode, body) {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!token) throw new Error('SUPABASE_ACCESS_TOKEN ontbreekt (supabase.com/dashboard/account/tokens).');
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/config/auth`, {
        method: methode,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
}

const velden = naam => [`mailer_subjects_${naam}`, `mailer_templates_${naam}_content`];

async function zet(alles) {
    const huidig = await authConfig('GET');
    const vorige = {};
    for (const naam of Object.keys(alles)) for (const v of velden(naam)) vorige[v] = huidig[v] ?? null;
    // Niet overschrijven: na een tweede --zet blijft de stand van vóór de eerste bewaard.
    if (!fs.existsSync(VORIGE)) {
        fs.writeFileSync(VORIGE, `${JSON.stringify(vorige, null, 2)}\n`);
        console.log('💾 Vorige sjablonen bewaard in supabase/templates/vorige.json.');
    }
    const body = {};
    for (const [naam, { onderwerp, html }] of Object.entries(alles)) {
        const [o, h] = velden(naam);
        body[o] = onderwerp;
        body[h] = html;
    }
    await authConfig('PATCH', body);
    console.log(`✅ ${Object.keys(alles).length} sjablonen in Supabase gezet. Test nu elke mail in nl en en; mis? --terug.`);
}

async function terug() {
    if (!fs.existsSync(VORIGE)) throw new Error('Geen supabase/templates/vorige.json: niets om naar terug te gaan.');
    const vorige = JSON.parse(fs.readFileSync(VORIGE, 'utf8'));
    // null = Supabase had geen eigen sjabloon; een lege tekst zet de standaard terug.
    for (const k of Object.keys(vorige)) if (vorige[k] === null) vorige[k] = '';
    await authConfig('PATCH', vorige);
    console.log('↩️  De vorige sjablonen staan weer in Supabase.');
}

async function main() {
    if (process.argv.includes('--terug')) return terug();
    const map = path.join(__dirname, '..', 'supabase', 'templates');
    fs.mkdirSync(map, { recursive: true });
    const alles = {};
    const onderwerpen = {};
    for (const naam of Object.keys(SJABLONEN)) {
        alles[naam] = sjabloon(naam);
        onderwerpen[naam] = alles[naam].onderwerp;
        fs.writeFileSync(path.join(map, `${naam}.html`), `${alles[naam].html}\n`);
    }
    fs.writeFileSync(path.join(map, 'onderwerpen.json'), `${JSON.stringify(onderwerpen, null, 2)}\n`);
    console.log(`📝 ${Object.keys(alles).length} sjablonen geschreven in supabase/templates/.`);
    if (process.argv.includes('--zet')) await zet(alles);
}

if (require.main === module) main().catch(e => { console.error('💥', e.message); process.exit(1); });

module.exports = { sjabloon, SJABLONEN };
