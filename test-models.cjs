require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function check() {
    try {
        // Wait, I can't use the API key locally because it's invalid.
        console.log("Cannot test API without key");
    } catch (e) {
        console.error(e);
    }
}
check();
