// Eén bron voor de publieke Supabase-gegevens (review-ronde 2026-09-26: de
// anon-key stond ook los in js/feedback.js — publiek by design, maar bij een
// key-rotatie mis je zo'n tweede kopie makkelijk). Pagina's zonder de
// vendor-bundle (feedback.html) laden dit bestand alleen voor de gegevens;
// de client wordt dan niet aangemaakt.
window.BRIGHTNEWS_SUPABASE = {
    url: 'https://rquuqypgaannrakdrabj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdXVxeXBnYWFubnJha2RyYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTQyODUsImV4cCI6MjA4NjM5MDI4NX0.-H5ZIcLXBflqKvC0VQGlVGIX29G-nceC9ak5IrhJCzg',
};

// Maakt de gedeelde Supabase-client aan met de publieke anon-key.
// Laadt met defer, direct ná de (eveneens deferde) vendor-bundle —
// defer-scripts draaien gegarandeerd in documentvolgorde, dus alle
// scripts hierna (auth.js, index.js) kunnen op window.supabaseClient rekenen.
if (!window.supabaseClient && window.supabase) {
    window.supabaseClient = supabase.createClient(
        window.BRIGHTNEWS_SUPABASE.url,
        window.BRIGHTNEWS_SUPABASE.anonKey
    );
}
