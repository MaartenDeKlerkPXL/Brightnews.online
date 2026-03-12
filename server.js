const express = require('express');
const bodyParser = require('body-parser');
const { sendSubscriptionConfirmation } = require('./backend/mailer');

const app = express();
app.use(bodyParser.urlencoded({ extended: false })); // Ko-fi stuurt data als URL-encoded

// De 'geheime' URL die alleen Ko-fi weet
app.post('/webhook/ko-fi', async (req, res) => {
    try {
        // Ko-fi stuurt data in een 'data' veld als JSON string
        const data = JSON.parse(req.body.data);

        const customerEmail = data.email;
        const isSubscription = data.is_subscription_payment;

        console.log(`💰 Nieuwe betaling ontvangen van: ${customerEmail}`);

        if (isSubscription) {
            // Verstuur de mail met de voorwaarden (Engels als standaard voor Ko-fi)
            await sendSubscriptionConfirmation(customerEmail, 'en');
            console.log(`✨ Welkomstmail + PDF verstuurd naar ${customerEmail}`);
        }

        res.status(200).send('Webhook ontvangen!');
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bright News server draait op poort ${PORT}`));