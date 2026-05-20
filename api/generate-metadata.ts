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

    const completion =
      await groq.chat.completions.create({

        messages: [
          {
            role: "user",
            content: `Analysiere dieses YouTube-Transkript und erstelle SEO-Metadaten:

${transcript}`,
          },
        ],

        model: "llama-3.3-70b-versatile",

      });

    res.status(200).json({
      result:
        completion.choices[0]?.message?.content || "",
    });

  } catch (error: any) {

    console.error(error);

    res.status(500).json({
      error: error.message || "Fehler beim Generieren",
    });
  }
}
