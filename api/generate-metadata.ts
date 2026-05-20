import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    const { transcript } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analysiere dies: ${transcript}`,
    });

    return res.status(200).json({
      result: response.text,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Fehler beim Generieren",
    });
  }
}
