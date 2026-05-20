import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API client on the server
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint
  app.post("/api/generate-metadata", async (req, res) => {
    try {
      const { transcript, customKeywords, durationMode, tone } = req.body;

      if (!transcript || transcript.trim() === "") {
        return res.status(400).json({ error: "Transkript-Text ist erforderlich." });
      }

      if (!apiKey) {
        return res.status(500).json({ 
          error: "Gemini API-Schlüssel ist nicht konfiguriert. Bitte füge GEMINI_API_KEY in den Secrets hinzu." 
        });
      }

      const prompt = `
Du bist ein Elite-Assistent für YouTube-Dokumentationen. Dein Ziel ist es, aus dem Transkript nicht die Fakten zusammenzufassen, sondern den klickstärksten "Emotional Hook" zu extrahieren.
Analysiere das folgende Transkript lückenlos und erstelle hochpräzise YouTube-Metadaten.

ZUSATZ-KONTEXT (falls angegeben):
- Ziel-Keywords / Thema: ${customKeywords || "Nicht angegeben. Extrahiere die wichtigsten Themen automatisch."}
- Video-Länge: ${durationMode === "over_60" ? "Über 60 Minuten (Format hh:mm:ss zwingend nutzen)" : durationMode === "under_60" ? "Unter 60 Minuten (Format mm:ss nutzen)" : "Automatisch erkennen (nutze hh:mm:ss bei langen Transkripten, sonst mm:ss)"}
- Tonalität: ${tone || "Dokumentarisch und packend"}

TRANSKRIPT / UNTERTITEL:
${transcript}

Bitte folge diesen strikten Regeln für die Ausgabe:
1. Video Chapters (Kapitel):
   - Analysiere das Transkript lückenlos und identifiziere alle wesentlichen Themenwechsel ab 00:00 (lückenlos).
   - Das erste Kapitel MUSS bei 00:00 beginnen (00:00 oder 00:00:00).
   - Kapitel-Titel müssen SEO-optimiert, packend und dokumentarisch sein (Open Loops, die Neugier wecken).
   - Jedem Kapitel muss ein thematisch passendes, atmosphärisches Emoji zugeordnet werden, das vor dem Zeitstempel platziert wird.
   - Format: "hh:mm:ss" wenn das Video über 60 Minuten lang ist, ansonsten "mm:ss".

2. Inhaltsbeschreibung (Description):
   - Schreibe eine prägnante Zusammenfassung (genau 3 bis 4 Sätze) für die ersten Zeilen der Videobeschreibung, basierend auf dem emotionalen Kern der Geschichte.
   - Die ersten zwei Sätze müssen den emotionalen Kern oder den Trigger enthalten.
   - Fokus liegt auf dem klickstärksten "Emotional Hook", Nutzwert und Kontrasten, jedoch absolut OHNE Wunderheilungs-Versprechen (bleibe seriös, wissenschaftlich/historisch authentisch und dokumentarisch).

3. Tags:
   - Extrahiere die wichtigsten, für das Video relevantesten Keywords und Phrasen.
   - Gib sie als Array zurück.

4. Arbeitsablauf & Pipeline für die Dokumentations-Strategie:
   - Schritt 1: Emotionaler Kern: Identifiziere den stärksten Kontrast im Transkript (z. B. Angst vs. Hoffnung, Diagnose vs. Naturwunder, wissenschaftliches Chaos vs. vergessenes Wissen).
   - Schritt 2: Trigger-Extraktion: Suche nach ungewöhnlichen Begriffen oder seltenen Szenen (z. B. "Zungentumor", "1950er Jahre", "Gurgeln mit grünem Tee").
   - Schritt 3: Trigger-Ranking: Welches Element würde einen Menschen beim Scrollen sofort zum Anhalten bringen?
   - Schritt 4: CTR-Titel-Generierung: Erstelle genau 5 unterschiedliche Titel, die eine persönliche oder historische Geschichte anteasern, ohne alles zu verraten. Priorisiere menschliche Schicksale und Geschichten vor abstrakter Wissenschaft (z. B. "Der Zahnarzt gab ihn auf..."). Bleibe seriös und dokumentarisch (keine Wunderheilungs-Versprechen).
   - Schritt 5: Thumbnail-Logik ("Ein Frame eines Films"): Beschreibe eine einzige, eingefrorene, filmisch anmutende Szene für eine Bild-KI (z.B. Midjourney) auf Englisch.
     * Fokus auf: intensive Gesichtsemotionen, eine klare Handlung oder ein dominantes Fokus-Objekt. Vermeide generische Bilder (z.B. lächelnde Ärzte, wahllose Kräutergrafiken).
     * Nutze ausgeprägte Lichtstimmungen (z. B. "warm morning light through a window", "dramatic side light", "shadowy cinematic contrast") und plastische Texturen für visuelle Kontraste.
     * Platziere den Textplatzhalter [HIER TITEL-TRIGGER EINSETZEN] zwingend an einer strategisch sinnvollen, harmonischen Stelle (z.B. im "negative space", "leaving space for overlay: [HIER TITEL-TRIGGER EINSETZEN]"). Stil: Dokumentarisch, filmisch, hohe Texturen, kein generischer "Stock-Foto"-Look.

WICHTIG: Verwende in allen von dir generierten Feldern (Kapiteln, Beschreibungen, Analysen, Titeln, Prompts) KEINERLEI Markdown (keine fettmarkierten Worte wie **Satz**, keine Überschriften wie #, keine kursiven Schriftarten, keine Spiegelstriche).
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Du bist ein erfahrener YouTube-SEO-Experte und deutschsprachiger Metadaten-Optimierer. Gib die Antwort exakt im vorgegebenen JSON-Schema zurück. Verwende absolut kein Markdown in deinen Textfeldern und Werten.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    emoji: { type: Type.STRING, description: "Ein thematisch passendes Emoji für das Kapitel, z.B. 🚀, 💡, 📈, 🎥." },
                    timestamp: { type: Type.STRING, description: "Der Zeitstempel im Format mm:ss oder hh:mm:ss ab 00:00 lückenlos." },
                    title: { type: Type.STRING, description: "Ein fesselnder, SEO-optimierter Kapitel-Titel mit relevanten Suchbegriffen." }
                  },
                  required: ["emoji", "timestamp", "title"]
                },
                description: "Die lückenlosen Kapitel des Videos ab 00:00."
              },
              description: {
                type: Type.STRING,
                description: "Zusammenfassung des Videos in genau 3-4 Sätzen. Erste 2 Sätze enthalten den emotionalen Kern/Trigger. Null Markdown."
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Relevante YouTube-Tags für dieses Video."
              },
              emotionalCore: {
                type: Type.STRING,
                description: "Schritt 1: Emotionaler Kern (stärkster Kontrast, z.B. Angst vs. Hoffnung...). Null Markdown."
              },
              triggerExtraction: {
                type: Type.STRING,
                description: "Schritt 2: Trigger-Extraktion (ungewöhnliche Begriffe, seltene Szenen...). Null Markdown."
              },
              triggerRanking: {
                type: Type.STRING,
                description: "Schritt 3: Trigger-Ranking (Analyse, welches Element den Zuschauer sofort stoppt). Null Markdown."
              },
              titles: {
                type: Type.OBJECT,
                properties: {
                  variant1: { type: Type.STRING, description: "CTR Titel 1: Emotionaler Teaser (menschliche Story)" },
                  variant2: { type: Type.STRING, description: "CTR Titel 2: Das Schicksal / Die persönliche Herausforderung" },
                  variant3: { type: Type.STRING, description: "CTR Titel 3: Der unerwartete Kontrast / Geheimnis" },
                  variant4: { type: Type.STRING, description: "CTR Titel 4: Der ungelöste Schmerzpunkt (Neugier-basiert)" },
                  variant5: { type: Type.STRING, description: "CTR Titel 5: Seriöse, dokumentarische Enthüllung (SEO-optimiert)" }
                },
                required: ["variant1", "variant2", "variant3", "variant4", "variant5"]
              },
              thumbnailPrompt: {
                type: Type.STRING,
                description: "Schritt 4: Filmischer Midjourney Prompt in Englisch, beschreibt eine eingefrorene Szene mit Fokus auf Ausdruck/Licht/Handlung und enthält die Zeichenfolge '[HIER TITEL-TRIGGER EINSETZEN]'. Null Markdown."
              },
              suggestedFileName: {
                type: Type.STRING,
                description: "Schlag einen Linux Mint-kompatiblen Dateinamen für den Export vor (z.B. zungentumor_doku_seo.txt), der den Haupt-Trigger enthält. Alles kleingeschrieben, Leerzeichen durch Unterstriche ersetzt."
              }
            },
            required: ["chapters", "description", "tags", "emotionalCore", "triggerExtraction", "triggerRanking", "titles", "thumbnailPrompt", "suggestedFileName"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Leere Antwort von der Gemini API erhalten.");
      }

      // Parse JSON from model response
      const metadata = JSON.parse(responseText.trim());

      // Let's perform post-processing on the tags to guarantee 100% adherence to 495 chars:
      let tagsArray = metadata.tags || [];
      // Clean up tags (remove leading/trailing spaces, quotes, etc.)
      tagsArray = tagsArray.map((t: string) => t.trim().replace(/^["']|["']$/g, '')).filter((t: string) => t.length > 0);
      
      // We will join tags with commas. The strict requirement is: must not exceed 495 characters total.
      let finalTagsText = "";
      let selectedTags: string[] = [];
      for (const tag of tagsArray) {
        const nextTags = [...selectedTags, tag];
        const candidateText = nextTags.join(", ");
        if (candidateText.length <= 495) {
          selectedTags.push(tag);
          finalTagsText = candidateText;
        } else {
          // If a single tag makes it exceed 495 chars, we stop adding more tags.
          break;
        }
      }

      // If we don't have enough tags or selectedTags is empty, let's make sure it's valid
      metadata.processedTags = finalTagsText;
      metadata.tags = selectedTags;

      // Construct the Raw Output (Wichtig für Copy & Paste) exactly as requested:
      // - No introduction, no "Hier ist das Ergebnis".
      // - STRICTLY NO MARKDOWN (absolutely no stars *, no hashes #, no underline _, no markdown lists).
      // - Simple line breaks between sections.
      // - Emoji before each timestamp.
      const formattedChapters = (metadata.chapters || []).map((ch: any) => {
        const emoji = ch.emoji || "🎥";
        const ts = ch.timestamp || "00:00";
        const title = ch.title || "Kapitel";
        return `${emoji} ${ts} - ${title}`;
      }).join("\n");

      const formattedDescription = metadata.description || "";
      
      const emotionalCore = metadata.emotionalCore || "";
      const triggerExtraction = metadata.triggerExtraction || "";
      const triggerRanking = metadata.triggerRanking || "";
      const v1 = metadata.titles?.variant1 || "";
      const v2 = metadata.titles?.variant2 || "";
      const v3 = metadata.titles?.variant3 || "";
      const v4 = metadata.titles?.variant4 || "";
      const v5 = metadata.titles?.variant5 || "";
      const tPrompt = metadata.thumbnailPrompt || "";
      const suggestedName = metadata.suggestedFileName || "metadata_export.txt";

      const rawPlainText = `1. YouTube-Kapitel:
${formattedChapters}

2. Optimierte Videobeschreibung:
${formattedDescription}

3. SEO-Tags:
${finalTagsText}

4. Trigger-Titel (5 Varianten):
Variante 1: ${v1}
Variante 2: ${v2}
Variante 3: ${v3}
Variante 4: ${v4}
Variante 5: ${v5}

5. Thumbnail-Film-Frame (Englischer Prompt):
${tPrompt}

PIPELINE-DETAILS:
Emotionaler Kern: ${emotionalCore}
Trigger-Extraktion: ${triggerExtraction}
Trigger-Ranking: ${triggerRanking}

--- [PROJEKT ABGESCHLOSSEN - BEREIT FÜR NÄCHSTES TRANSKRIPT] ---

Empfohlener Dateiname für Export (Linux Mint):
${suggestedName}`;

      metadata.rawPlainText = rawPlainText;

      return res.json(metadata);
    } catch (error: any) {
      console.error("Fehler bei der Metadaten-Generierung:", error);
      return res.status(500).json({ error: error.message || "Interner Serverfehler" });
    }
  });

  // Serve static assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
  });
}

startServer();
