const fs = require('fs');
const path = require('path');

// Functie om inschrijving te verwerken
function saveSubscriber(email) {
    const filePath = path.join(__dirname, '../data/subscribers.json');

    // 1. Lees bestaande data
    const fileData = fs.readFileSync(filePath, 'utf-8');
    const subscribers = JSON.parse(fileData);

    // 2. Voeg nieuwe toe
    subscribers.push({
        email: email,
        date: new Date().toISOString()
    });

    // 3. Sla op
    fs.writeFileSync(filePath, JSON.stringify(subscribers, null, 2));
    console.log(`New subscriber added: ${email}`);
}