const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Flash is snel en gratis

async function analyzeAndTranslate(newsContent) {
    const prompt = `
    Je bent de hoofdredacteur van 'Bright News'. 
    Analyseer het volgende artikel op sentiment:
    "${newsContent}"

    Stap 1: Is dit nieuws positief, hoopgevend of constructief? 
    Stap 2: Zo ja, schrijf een korte, krachtige samenvatting (max 30 woorden).
    Stap 3: Vertaal deze samenvatting naar het Nederlands, Engels, Frans en Duits.

    Antwoord uitsluitend in dit JSON-formaat:
    {
      "isBright": true/false,
      "score": 1-10,
      "translations": {
        "nl": "...",
        "en": "...",
        "fr": "...",
        "de": "..."
      }
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    } catch (error) {
        console.error("Gemini Fout:", error);
        return { isBright: false };
    }
}

module.exports = { analyzeAndTranslate };