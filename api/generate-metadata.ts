import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const emptyResponse = {
  title: "",
  description: "",
  tags: [],
  chapters: [],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json(emptyResponse);
  }

  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json(emptyResponse);
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `
Erstelle aus diesem YouTube-Transkript SEO-Metadaten.

Antworte AUSSCHLIESSLICH mit gültigem JSON.
KEIN Markdown.
KEIN Text.

Format:
{
  "title": "",
  "description": "",
  "tags": [],
  "chapters": []
}

Transkript:
${transcript.slice(0, 12000)}
`,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    let content = completion.choices[0]?.message?.content;

    if (!content) {
      return res.status(200).json(emptyResponse);
    }

    // Cleanup
    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.log("JSON PARSE FAILED:", content);
      return res.status(200).json(emptyResponse);
    }

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error(error);
    return res.status(200).json(emptyResponse);
  }
}
