const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: "smtp.strato.de",
    port: 465,
    secure: true, // Gebruik TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Verstuurt de wettelijk verplichte bevestiging na aankoop.
 * @param {string} userEmail - Het adres van de klant.
 * @param {string} language - 'nl' of 'en'.
 */
async function sendSubscriptionConfirmation(userEmail, language = 'en') {
    const isEn = language === 'en';

    // Bepaal de paden naar de PDF's
    const pdfPath = isEn
        ? path.join(__dirname, '../assets/documents/terms-conditions-en.pdf')
        : path.join(__dirname, '../assets/documents/voorwaarden.pdf');

    // Controleer of de PDF echt bestaat voordat we proberen te mailen
    if (!fs.existsSync(pdfPath)) {
        throw new Error(`Kritieke fout: PDF niet gevonden op pad: ${pdfPath}`);
    }

    const mailOptions = {
        from: '"Bright News ✨" <info@brightnews.online>',
        to: userEmail,
        subject: isEn ? 'Welcome to the Bright Side! ✨' : 'Welkom bij de Bright Side! ✨',
        text: isEn
            ? 'Thank you for your subscription. You can find our terms and conditions in the attachment.'
            : 'Bedankt voor je inschrijving. Je vindt onze voorwaarden in de bijlage.',
        attachments: [
            {
                filename: isEn ? 'BrightNews_Terms_Conditions.pdf' : 'BrightNews_Voorwaarden.pdf',
                path: pdfPath
            }
        ]
    };

    console.log(`📧 Mail wordt voorbereid voor ${userEmail} (Taal: ${language})...`);
    return await transporter.sendMail(mailOptions);
}

module.exports = { sendSubscriptionConfirmation };

// TEST BLOK: Wordt alleen uitgevoerd bij 'node backend/mailer.js'
if (require.main === module) {
    const testEmail = "Maartendeklerk2002@gmail.com";

    // We testen eerst de Engelse flow (verplicht voor je internationale ambities)
    sendSubscriptionConfirmation(testEmail, "en")
        .then(info => {
            console.log("✅ Engelse test-mail succesvol verzonden!");
            console.log("Bericht ID:", info.messageId);
        })
        .catch(err => {
            console.error("❌ Fout bij Engelse test-mail:", err.message);
        });
}