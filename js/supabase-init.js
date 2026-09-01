// Maakt de gedeelde Supabase-client aan met de publieke anon-key.
// Laadt met defer, direct ná de (eveneens deferde) vendor-bundle —
// defer-scripts draaien gegarandeerd in documentvolgorde, dus alle
// scripts hierna (auth.js, index.js) kunnen op window.supabaseClient rekenen.
if (!window.supabaseClient) {
    window.supabaseClient = supabase.createClient(
        'https://rquuqypgaannrakdrabj.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdXVxeXBnYWFubnJha2RyYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTQyODUsImV4cCI6MjA4NjM5MDI4NX0.-H5ZIcLXBflqKvC0VQGlVGIX29G-nceC9ak5IrhJCzg'
    );
}
