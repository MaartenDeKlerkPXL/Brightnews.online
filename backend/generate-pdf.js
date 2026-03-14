cat << 'EOF' > backend/make-pdf.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generate() {
    console.log('🚀 START: Generating Extensive English Terms...');
    try {
        const doc = new PDFDocument({ margin: 50 });
        const outputDir = path.join(__dirname, '../assets/documents');
        const filePath = path.join(outputDir, 'Terms and Conditions BrightNews.online.pdf');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(25).fillColor('blue').text('BRIGHT NEWS - TERMS AND CONDITIONS', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).fillColor('black').text('Version: 12 March 2026', { align: 'right' });
        doc.moveDown(2);

        doc.fontSize(14).font('Helvetica-Bold').text('1. AI-Generated Content Notice');
        doc.fontSize(10).font('Helvetica').text('By using BrightNews, you acknowledge that content is rewritten by AI. While we focus on 100% positivity, BrightNews is not liable for interpretative errors.');
        doc.moveDown();

        doc.fontSize(14).font('Helvetica-Bold').text('2. Right of Withdrawal (Mandatory)');
        doc.fontSize(10).font('Helvetica').text('By purchasing a subscription and accessing premium content immediately, you explicitly agree to waive your statutory 14-day right of withdrawal.');
        doc.moveDown();

        doc.fontSize(14).font('Helvetica-Bold').text('3. Hosting & Privacy');
        doc.fontSize(10).font('Helvetica').text('Data is stored on Strato servers. We have a signed Data Processing Agreement (DPA) to ensure GDPR compliance.');

        doc.end();
        stream.on('finish', () => {
            console.log('✅ PDF SUCCESSVOL AANGEMAAKT!');
            console.log('Locatie: ' + filePath);
        });
    } catch (err) {
        console.error('❌ KRITIEKE FOUT:', err);
    }
}
generate();
EOF