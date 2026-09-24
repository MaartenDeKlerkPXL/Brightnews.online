/* ==========================================================================
   Verzendlogica van /feedback.html (TODO punt 35 en 42)

   Dit stond tot 2026-09-24 in index.js en bouwde daar een <dialog>. Dat botste
   met de huisregel "geen modals behalve een cookiebalk", dus het formulier is
   een eigen pagina geworden. De vragen staan nu gewoon in de HTML met
   data-i18n erop, net als op elke andere pagina; hier staat alleen nog wat er
   gebeurt als je op Versturen drukt.

   Dit bestand hoort alleen bij feedback.html. index.js draait op élke pagina
   en zet daar enkel nog het lijntje in de footer dat hierheen wijst.
   ========================================================================== */

// Publieke anon-gegevens, dezelfde als in js/supabase-init.js. Die bundel
// staat niet op elke pagina, dus hier een eigen fetch in plaats van
// window.supabaseClient. De host staat al in de connect-src van de CSP.
const FEEDBACK_URL = 'https://rquuqypgaannrakdrabj.supabase.co/rest/v1/feedback';
const FEEDBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdXVxeXBnYWFubnJha2RyYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTQyODUsImV4cCI6MjA4NjM5MDI4NX0.-H5ZIcLXBflqKvC0VQGlVGIX29G-nceC9ak5IrhJCzg';

// Moet gelijk blijven aan de kolomnamen in
// supabase/feedback-tabel-2026-09-21.sql en aan de name="fb-..." in de HTML.
const FEEDBACK_KOLOMMEN = [
    'positief', 'onderwerpen', 'techniek', 'snelheid',
    'uiterlijk', 'navigatie', 'teksten', 'aanbeveling',
];

// Grof genoeg om iets te zeggen over "werkt het op mijn toestel", te grof om
// iemand aan te herkennen. Bewust geen user agent opslaan.
function feedbackToestel() {
    const breedte = window.innerWidth;
    if (breedte < 768) return 'mobiel';
    if (breedte < 1024) return 'tablet';
    return 'desktop';
}

// getT komt uit index.js en staat er dankzij de defer-volgorde al vóór dit
// bestand draait. Mocht dat ooit verschuiven, dan valt hij terug op de tekst
// die al in de HTML staat in plaats van een lege melding te tonen.
function fbTekst(sleutel, terugval) {
    return (typeof getT === 'function' && getT(sleutel)) || terugval;
}

async function verstuurFeedback() {
    const form = document.getElementById('fb-form');
    const melding = form.querySelector('.fb-melding');
    const knop = form.querySelector('.fb-verstuur');

    const antwoord = {
        taal: window.huidigeTaal || 'nl',
        pagina: window.location.pathname,
        toestel: feedbackToestel(),
        droom: form.querySelector('#fb-droom').value.trim() || null,
        email: form.querySelector('#fb-email').value.trim() || null,
    };
    for (const kolom of FEEDBACK_KOLOMMEN) {
        const gekozen = form.querySelector('input[name="fb-' + kolom + '"]:checked');
        antwoord[kolom] = gekozen ? Number(gekozen.value) : null;
    }

    // Eén antwoord is genoeg; een leeg formulier versturen heeft geen zin.
    // "Geen idee" (0) telt mee — dat is een antwoord, geen overslaan.
    const ingevuld = FEEDBACK_KOLOMMEN.some(k => antwoord[k] !== null) || antwoord.droom;
    if (!ingevuld) {
        melding.textContent = fbTekst('fb_leeg', 'Beantwoord eerst één vraag, dan kun je versturen.');
        melding.className = 'fb-melding fb-fout';
        return;
    }

    knop.disabled = true;
    melding.textContent = '';
    melding.className = 'fb-melding';

    try {
        const res = await fetch(FEEDBACK_URL, {
            method: 'POST',
            headers: {
                'apikey': FEEDBACK_KEY,
                'Authorization': 'Bearer ' + FEEDBACK_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify(antwoord),
        });
        if (!res.ok) throw new Error('status ' + res.status);

        melding.textContent = fbTekst('fb_dank', 'Dank je wel. Hier hebben we echt iets aan.');
        melding.className = 'fb-melding fb-gelukt';
        // Op een pagina valt er niets te sluiten: de vragen verdwijnen en het
        // bedankje blijft staan met de terugkeerlink eronder.
        form.classList.add('fb-verzonden');
        melding.setAttribute('tabindex', '-1');
        melding.focus();
    } catch (err) {
        console.error('Feedback versturen mislukt:', err.message);
        melding.textContent = fbTekst('fb_fout', 'Het versturen lukte niet. Probeer het zo nog eens.');
        melding.className = 'fb-melding fb-fout';
        knop.disabled = false;
    }
}

function koppelFeedbackFormulier() {
    const knop = document.querySelector('#fb-form .fb-verstuur');
    if (knop) knop.addEventListener('click', verstuurFeedback);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', koppelFeedbackFormulier);
} else {
    koppelFeedbackFormulier();
}
