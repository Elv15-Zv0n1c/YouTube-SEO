import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req: any, res: any) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    const { transcript } = req.body;

    const shortenedTranscript =
      transcript.slice(0, 12000);

    const completion =
      await groq.chat.completions.create({

        messages: [
          {
            role: "user",
            content: `
Erstelle aus diesem YouTube-Transkript SEO-Metadaten.

Antworte AUSSCHLIESSLICH im JSON-Format.

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

    const content =
      completion.choices[0]?.message?.content || "";

    const parsed =
      JSON.parse(content);

    res.status(200).json(parsed);

  } catch (error: any) {

    console.error(error);

    res.status(500).json({
      error: error.message || "Fehler beim Generieren",
    });
  }
}
