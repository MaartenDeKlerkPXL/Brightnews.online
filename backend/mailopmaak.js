// Eén opmaak voor elke mail van BrightNews, in de huisstijl van redesign v5
// (TODO 74): de welkomstreeks (backend/stuur-mails.js) en de mails van
// Supabase (inloglink, account bevestigen, wachtwoord, e-mailadres wijzigen,
// uitnodiging; backend/maak-mailsjablonen.js).
//
// Waarom zo ouderwets: tabellen en inline stijlen zijn de enige opmaak die
// Gmail, Outlook en Apple Mail allemaal goed tonen. Geen afbeeldingen (die
// staan vaak uit), geen webfont (de meeste mailprogramma's laden het niet):
// het woordmerk is gewone tekst, Figtree met een systeemletter als terugval.
// Altijd licht, ook als het mailprogramma donker staat.
//
// mailHtml() krijgt al veilige HTML: de aanroeper escapet zijn eigen tekst.
// Zo kunnen de Supabase-sjablonen er Go-template-code ({{ .ConfirmationURL }})
// in kwijt zonder dat die ge-escapet wordt.

const KLEUR = {
    groen: '#186F49',      // --brand-primary (v5), wit erop haalt 6,16:1
    tekst: '#152019',      // --text-primary
    zacht: '#4e574d',      // --text-secondary
    vlak: '#f7f8f3',       // --surface-subtle
    rand: '#dfe3da',       // --border-default
};
const LETTER = "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escape(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// { taal, kop, alineas: [html], knop, knopUrl, onderKnop?: [html], voet: [html] }
function mailHtml({ taal, kop, alineas, knop, knopUrl, onderKnop = [], voet = [] }) {
    const p = (html, extra = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${KLEUR.zacht};${extra}">${html}</p>`;
    const klein = html => `<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${KLEUR.zacht}">${html}</p>`;
    return `<!DOCTYPE html>
<html lang="${taal}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${kop}</title></head>
<body style="margin:0;padding:0;background:${KLEUR.vlak}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${KLEUR.vlak}">
<tr><td align="center" style="padding:32px 16px;font-family:${LETTER}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding:0 4px 20px;font-family:${LETTER};font-size:22px;font-weight:600;letter-spacing:-0.3px;color:${KLEUR.tekst}">Bright<span style="color:${KLEUR.groen}">News</span></td></tr>
  <tr><td style="background:#ffffff;border:1px solid ${KLEUR.rand};border-radius:16px;padding:32px 32px 28px;font-family:${LETTER}">
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:500;letter-spacing:-0.3px;color:${KLEUR.tekst}">${kop}</h1>
    ${alineas.map(a => p(a)).join('\n    ')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:999px;background:${KLEUR.groen}">
      <a href="${knopUrl}" style="display:inline-block;padding:13px 24px;font-family:${LETTER};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">${knop}</a>
    </td></tr></table>
    ${onderKnop.map(a => p(a, 'font-size:14px;margin-bottom:8px')).join('\n    ')}
  </td></tr>
  <tr><td style="padding:20px 4px 0;font-family:${LETTER}">
    ${voet.map(klein).join('\n    ')}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { mailHtml, escape, KLEUR };
