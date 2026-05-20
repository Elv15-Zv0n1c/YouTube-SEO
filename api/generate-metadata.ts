import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transcript } = req.body;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analysiere dies: ${transcript}`,
    });

    res.status(200).json({
      result: result.text,
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      error: error.message || "Fehler beim Generieren",
    });
  }
}
