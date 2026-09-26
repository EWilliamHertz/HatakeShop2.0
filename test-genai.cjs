require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: "Hello"
    });
    console.log("Is text a function?", typeof response.text);
  } catch (e) {
    console.error(e);
  }
}
run();
