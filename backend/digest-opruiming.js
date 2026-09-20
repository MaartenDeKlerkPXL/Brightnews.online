// Verweesde dagoverzichten opruimen.
//
// Een dagoverzicht (type 'digest') is een samenvatting van een handvol
// artikelen en verwijst daar in `refs` naar terug. Die artikelen zakken na
// verloop van tijd uit de lijst van 150 — processor.js gooit bij elke run de
// oudste eruit — maar het overzicht zelf bleef staan. Je kreeg dan een
// bronnenlijst waarin de helft van de links nergens meer heen gaat. Gemeten op
// 2026-09-20: van de 26 overzichten hadden er 5 al gaten, waarvan die van
// Health (5 september) er nog 1 van de 4 over had.
//
// Afspraak met Maarten (2026-09-20): een overzicht verdwijnt zodra er minder
// dan de helft van zijn bronnen nog in de lijst staat. Dan valt hij weg vóór
// de bronnenlijst gatenkaas wordt, in plaats van erna.
//
// Let op: dit gaat alleen over de homepage-lijst (`data/news_*.json`). De
// statische artikelpagina van een verwijderd overzicht blijft gewoon bestaan —
// geïndexeerde URL's mogen niet sterven (afspraak in CLAUDE.md).

const DREMPEL = 0.5;

// Geeft een nieuwe lijst terug plus welke overzichten eruit gingen. De
// ingevoerde lijst blijft ongemoeid.
function verwijderVerweesdeDigests(items) {
    const aanwezig = new Set(items.map(a => String(a.id)));
    const verwijderd = [];

    const overgebleven = items.filter(a => {
        if (a.type !== 'digest' || !Array.isArray(a.refs) || a.refs.length === 0) return true;

        const levend = a.refs.filter(r => aanwezig.has(String(r.id))).length;
        if (levend / a.refs.length >= DREMPEL) return true;

        verwijderd.push({ id: a.id, categorie: a.category, dag: a.digest_date, levend, totaal: a.refs.length });
        return false;
    });

    return { items: overgebleven, verwijderd };
}

module.exports = { verwijderVerweesdeDigests, DREMPEL };
