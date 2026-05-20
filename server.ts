import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.post('/api/generate-metadata', async (req, res) => {
  try {
    const { transcript } = req.body;
    const model = ai.models.generateContent({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent(`Analysiere dies: ${transcript}`);
    res.json({ result: result.text() });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Generieren" });
  }
});

export default app;
