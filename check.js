require('dotenv').config();

async function check() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Sleutel gevonden:", key ? "Ja (begint met " + key.substring(0,4) + ")" : "Nee");

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Fout:", data.error.message);
        } else {
            console.log("--- JOUW BESCHIKBARE MODELLEN ---");
            data.models.forEach(m => {
                console.log("- " + m.name.replace("models/", ""));
            });
            console.log("---------------------------------");
        }
    } catch (err) {
        console.error("Netwerkfout:", err.message);
    }
}

check();