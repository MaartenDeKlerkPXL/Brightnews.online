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
    const enPdfPath = path.join(__dirname, '../assets/documents/Terms and Conditions BrightNews.online.pdf');
    const nlPdfPath = path.join(__dirname, '../assets/documents/voorwaarden.pdf');

    let pdfPath = isEn ? enPdfPath : nlPdfPath;
    let attachmentName = isEn ? 'Terms and Conditions BrightNews.online.pdf' : 'BrightNews_Voorwaarden.pdf';
    let pdfIsFallbackEn = false;

    // Val terug op de Engelse PDF i.p.v. te crashen als de vertaalde versie
    // ontbreekt — een e-mail met de verkeerde bijlage is beter dan een
    // gegarandeerde fout bij elke niet-Engelse aankoop.
    if (!isEn && !fs.existsSync(nlPdfPath)) {
        console.warn(`⚠️ ${language.toUpperCase()}-PDF ontbreekt (${nlPdfPath}), EN gebruikt.`);
        pdfPath = enPdfPath;
        attachmentName = 'Terms and Conditions BrightNews.online.pdf';
        pdfIsFallbackEn = true;
    }

    // Controleer of de (eventueel teruggevallen) PDF echt bestaat voordat we proberen te mailen
    if (!fs.existsSync(pdfPath)) {
        throw new Error(`Kritieke fout: PDF niet gevonden op pad: ${pdfPath}`);
    }

    let bodyText = isEn
        ? 'Thank you for your subscription. You can find our terms and conditions in the attachment.'
        : 'Bedankt voor je inschrijving. Je vindt onze voorwaarden in de bijlage.';
    if (pdfIsFallbackEn) {
        bodyText += ' (Let op: de bijlage is momenteel alleen in het Engels beschikbaar. De Nederlandse versie volgt zo snel mogelijk.)';
    }

    const mailOptions = {
        from: '"Bright News ✨" <info@brightnews.online>',
        to: userEmail,
        subject: isEn ? 'Welcome to the Bright Side! ✨' : 'Welkom bij de Bright Side! ✨',
        text: bodyText,
        attachments: [
            {
                filename: attachmentName,
                path: pdfPath
            }
        ]
    };

    console.log(`📧 Mail wordt voorbereid voor ${userEmail} (Taal: ${language}${pdfIsFallbackEn ? ', PDF: EN-fallback' : ''})...`);
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