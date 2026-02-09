const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    try {
        const result = await model.generateContent("Hallo, leef je nog?");
        console.log("✅ ANTWOORD VAN AI:", result.response.text());
    } catch (e) {
        console.error("❌ NOG STEEDS GEEN TOEGANG:", e.message);
    }
}
test();