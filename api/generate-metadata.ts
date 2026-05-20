import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transcript } = req.body;

    const shortenedTranscript = transcript.slice(0, 12000);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `
Erstelle aus diesem YouTube-Transkript SEO-Metadaten.

Antworte AUSSCHLIESSLICH mit gültigem JSON.
KEINE Markdown-Blöcke.
KEIN \`\`\`json.
KEIN zusätzlicher Text.

Format:

{
  "title": "",
  "description": "",
  "tags": [],
  "chapters": []
}

Transkript:
${shortenedTranscript}
`,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    let content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Leere Antwort von Groq erhalten");
    }

    // Sicherheitsbereinigung
    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(content);

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      error: error.message || "Fehler beim Generieren",
    });
  }
}
