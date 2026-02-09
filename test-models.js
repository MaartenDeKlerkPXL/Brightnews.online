const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
    try {
        // We proberen de lijst met modellen op te halen
        console.log("Beschikbare modellen zoeken...");
        // Let op: listModels() is soms beperkt in v1beta,
        // maar we kunnen een simpele test doen met de meest stabiele naam:
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hallo");
        console.log("Verbinding succesvol met 'gemini-pro'!");
    } catch (err) {
        console.error("Zelfs 'gemini-pro' werkt niet:", err.message);
    }
}

checkModels();