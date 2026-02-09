const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // We gebruiken de standaard fetch-methode van de library om te zien wat er is
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        console.log("--- Beschikbare Modellen voor jouw sleutel ---");
        data.models.forEach(m => {
            console.log("- " + m.name.replace("models/", ""));
        });
        console.log("----------------------------------------------");
    } catch (err) {
        console.error("Kon modellen niet ophalen:", err.message);
    }
}

listModels();