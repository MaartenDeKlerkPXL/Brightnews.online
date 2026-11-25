// Nieuwsbrief bevestigen of afmelden (TODO 49): de pagina achter de links
// uit de mails.
//   ?bevestig=<token>  uit de bevestigingsmail → nieuwsbrief_bevestig()
//   ?afmelden=<token>  onder elke nieuwsbrief  → nieuwsbrief_afmelden()
// Geen formulier, niets te bevestigen: de link doet het meteen. Het token
// gaat direct uit de adresbalk, zodat het niet als referrer meegaat.
// Afmelden zegt niets terug (net als meld_af), dus zonder fout: afgemeld.
// Om de staten te bekijken (alleen lokaal): ?staat=bezig|bevestigd|afgemeld|mislukt

(function () {
    'use strict';

    const B = window.BN5;
    const { t } = B;
    const $ = id => document.getElementById(id);
    const STATEN = ['bezig', 'bevestigd', 'afgemeld', 'mislukt'];
    const KOP = { bezig: 'v5_nb_bezig_h1', bevestigd: 'v5_nb_bevestigd_h1', afgemeld: 'v5_nb_afgemeld_h1', mislukt: 'v5_nb_mislukt_h1' };
    let huidig = 'bezig';

    function titel() {
        document.title = `${t(KOP[huidig])} · BrightNews`;
    }

    function toon(staat) {
        huidig = staat;
        STATEN.forEach(s => { $(`nb-${s}`).hidden = s !== staat; });
        if (staat !== 'bezig') $('nb-paginastatus').textContent = t(KOP[staat]);
        titel();
    }

    async function voerUit() {
        const zoek = new URLSearchParams(window.location.search);
        const bevestig = zoek.get('bevestig');
        const afmelden = zoek.get('afmelden');
        const token = bevestig || afmelden;
        if (token) history.replaceState(null, '', window.location.pathname);
        const client = window.supabaseClient;
        if (!token || !/^[0-9a-f-]{36}$/i.test(token) || !client) return 'mislukt';
        try {
            if (bevestig) {
                const { data, error } = await client.rpc('nieuwsbrief_bevestig', { p_token: token });
                if (error) throw error;
                return data === true ? 'bevestigd' : 'mislukt';
            }
            const { error } = await client.rpc('nieuwsbrief_afmelden', { p_token: token });
            if (error) throw error;
            return 'afgemeld';
        } catch (fout) {
            console.warn('BrightNews v5: nieuwsbrief', fout);
            return 'mislukt';
        }
    }

    B.start(titel);
    const staat = B.param('staat');
    if (STATEN.includes(staat)) {
        toon(staat);
    } else {
        toon('bezig');
        voerUit().then(toon);
    }
})();
