const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function checkModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // We proberen de lijst met beschikbare modellen op te halen
        console.log("Sleutel gevonden, modellen ophalen...");

        // In de nieuwste SDK versies gebruiken we deze methode:
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Beschikbare modellen voor jouw sleutel:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("❌ Geen modellen gevonden. Check je API key in AI Studio.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Fout bij testen:", err);
    }
}

checkModels();