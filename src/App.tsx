import React, { useState, useRef } from "react";
import { 
  Youtube, 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Compass, 
  Sliders, 
  RefreshCw, 
  FileUp, 
  Tag as TagIcon, 
  Layers, 
  Edit3, 
  Info,
  Type as TypeIcon,
  Trash2,
  Plus,
  Moon,
  Sun
} from "lucide-react";
import { SAMPLE_TRANSCRIPTS } from "./sampleData";

interface Chapter {
  emoji: string;
  timestamp: string;
  title: string;
}

interface Titles {
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  variant5: string;
}

interface MetadataResponse {
  chapters: Chapter[];
  description: string;
  tags: string[];
  processedTags: string;
  emotionalCore: string;
  triggerExtraction: string;
  triggerRanking: string;
  titles: Titles;
  thumbnailPrompt: string;
  rawPlainText: string;
  suggestedFileName?: string;
}

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Form states
  const [transcript, setTranscript] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [durationMode, setDurationMode] = useState<string>("auto");
  const [themeTone, setThemeTone] = useState<string>("Professionell & SEO-optimiert");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Progress/Status States
  const [loading, setLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Response dataset
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  
  // Tabs: "raw" (clean textual copy-paste) or "visual" (individual structured components with editor)
  const [activeTab, setActiveTab] = useState<"raw" | "visual">("raw");
  const [copied, setCopied] = useState<boolean>(false);

  // File drag-and-drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (["txt", "srt", "vtt"].includes(extension || "")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTranscript(text);
        setFileName(file.name);
        setMetadata(null); // Clear previous output context immediately on new upload
        setError(null);
      };
      reader.readAsText(file);
    } else {
      setError("Ungültiges Dateiformat. Bitte lade nur .txt, .srt oder .vtt Dateien hoch.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const loadSample = (index: number) => {
    const sample = SAMPLE_TRANSCRIPTS[index];
    setTranscript(sample.text);
    setKeywords(sample.keywords);
    setDurationMode(sample.durationMode);
    setThemeTone(sample.tone);
    setFileName(`Beispiel: ${sample.name}`);
    setMetadata(null); // Reset calculated results on sample load too
    setError(null);
  };

  const handleReset = () => {
    setTranscript("");
    setKeywords("");
    setFileName(null);
    setMetadata(null);
    setError(null);
    setCurrentStep(0);
  };

  const generateMetadata = async () => {
    if (!transcript.trim()) {
      setError("Bitte füge zuerst einen Transkript-Text ein oder lade eine Datei hoch.");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentStep(1); // Analyzing

    // Fake steps interval for ultra premium UX feel
    const stepIntervals = [
      setTimeout(() => setCurrentStep(2), 1200), // Structuring Chapters
      setTimeout(() => setCurrentStep(3), 2400), // Optimizing SEO Tags & Limit Checking
      setTimeout(() => setCurrentStep(4), 3600), // Final compilation
    ];

    try {
      const response = await fetch("/api/generate-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          customKeywords: keywords,
          durationMode,
          tone: themeTone,
        }),
      });

      // Clear the fake timings if response is immediate or errored
      stepIntervals.forEach(clearTimeout);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Unerwarteter Fehler beim Server");
      }

      const data: MetadataResponse = await response.json();
      setMetadata(data);
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || "Es gab ein Problem beim Generieren der Metadaten. Überprüfe deinen API-Schlüssel.");
    } finally {
      setLoading(false);
    }
  };

  // Allow live editing of chapters, description, or tags & regenerate raw text
  const updateChapter = (index: number, field: keyof Chapter, value: string) => {
    if (!metadata) return;
    const newChapters = [...metadata.chapters];
    newChapters[index] = { ...newChapters[index], [field]: value };
    
    recompileRawText({ ...metadata, chapters: newChapters });
  };

  const removeChapter = (index: number) => {
    if (!metadata) return;
    const newChapters = metadata.chapters.filter((_, i) => i !== index);
    recompileRawText({ ...metadata, chapters: newChapters });
  };

  const addChapter = () => {
    if (!metadata) return;
    const newChapters = [...metadata.chapters];
    
    // Auto calculate next sensible timestamp or default to 00:00
    let nextTimestamp = "00:00";
    if (newChapters.length > 0) {
      const lastTs = newChapters[newChapters.length - 1].timestamp;
      // Simple parse & add 5 minutes mockup
      const parts = lastTs.split(":").map(Number);
      if (parts.length === 2) {
        let mins = parts[0] + 5;
        let secs = parts[1];
        if (mins >= 60) {
          nextTimestamp = `01:${String(mins - 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
          nextTimestamp = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      } else if (parts.length === 3) {
        let hrs = parts[0];
        let mins = parts[1] + 5;
        let secs = parts[2];
        if (mins >= 60) {
          hrs += 1;
          mins = mins - 60;
        }
        nextTimestamp = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }

    newChapters.push({
      emoji: "💡",
      timestamp: nextTimestamp,
      title: "Neues Video-Kapitel"
    });
    recompileRawText({ ...metadata, chapters: newChapters });
  };

  const updateDescription = (value: string) => {
    if (!metadata) return;
    recompileRawText({ ...metadata, description: value });
  };

  const handleAddTag = (newTag: string) => {
    if (!metadata || !newTag.trim()) return;
    const cleanTag = newTag.trim().replace(/^["']|["']$/g, '');
    const currentTags = [...metadata.tags];
    
    if (currentTags.includes(cleanTag)) return; // No duplicates
    
    const nextTags = [...currentTags, cleanTag];
    const candidateText = nextTags.join(", ");
    
    if (candidateText.length <= 495) {
      recompileRawText({ ...metadata, tags: nextTags, processedTags: candidateText });
    } else {
      // Show mini alert or just ignore
      alert("Dieses Tag überschreitet das YouTube 495-Zeichen Limit!");
    }
  };

  const handleRemoveTag = (index: number) => {
    if (!metadata) return;
    const nextTags = metadata.tags.filter((_, i) => i !== index);
    const candidateText = nextTags.join(", ");
    recompileRawText({ ...metadata, tags: nextTags, processedTags: candidateText });
  };

  const updateTitle = (variant: keyof Titles, value: string) => {
    if (!metadata) return;
    const newTitles = { ...metadata.titles, [variant]: value };
    recompileRawText({ ...metadata, titles: newTitles });
  };

  const updateThumbnailPrompt = (value: string) => {
    if (!metadata) return;
    recompileRawText({ ...metadata, thumbnailPrompt: value });
  };

  const updateEmotionalCore = (value: string) => {
    if (!metadata) return;
    recompileRawText({ ...metadata, emotionalCore: value });
  };

  const updateTriggerExtraction = (value: string) => {
    if (!metadata) return;
    recompileRawText({ ...metadata, triggerExtraction: value });
  };

  const updateTriggerRanking = (value: string) => {
    if (!metadata) return;
    recompileRawText({ ...metadata, triggerRanking: value });
  };

  const recompileRawText = (updated: MetadataResponse) => {
    const formattedChapters = updated.chapters.map((ch) => {
      const emoji = ch.emoji || "🎥";
      const ts = ch.timestamp || "00:00";
      const title = ch.title || "Kapitel";
      return `${emoji} ${ts} - ${title}`;
    }).join("\n");

    const formattedDescription = updated.description || "";
    const tagsText = updated.tags.join(", ");

    const emotionalCore = updated.emotionalCore || "";
    const triggerExtraction = updated.triggerExtraction || "";
    const triggerRanking = updated.triggerRanking || "";
    const v1 = updated.titles?.variant1 || "";
    const v2 = updated.titles?.variant2 || "";
    const v3 = updated.titles?.variant3 || "";
    const v4 = updated.titles?.variant4 || "";
    const v5 = updated.titles?.variant5 || "";
    const tPrompt = updated.thumbnailPrompt || "";
    const suggestedName = updated.suggestedFileName || "metadata_export.txt";

    const rawPlainText = `1. YouTube-Kapitel:
${formattedChapters}

2. Optimierte Videobeschreibung:
${formattedDescription}

3. SEO-Tags:
${tagsText}

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

    setMetadata({
      ...updated,
      processedTags: tagsText,
      rawPlainText
    });
  };

  const copyToClipboard = () => {
    if (!metadata) return;
    navigator.clipboard.writeText(metadata.rawPlainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxtFile = () => {
    if (!metadata) return;
    const element = document.createElement("a");
    const file = new Blob([metadata.rawPlainText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    const downloadName = metadata.suggestedFileName || `YouTube_SEO_Metadaten_${new Date().toISOString().slice(0,10)}.txt`;
    element.download = downloadName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="app-root" className={`min-h-screen font-sans transition-colors duration-200 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Upper Navigation / Decorative Header */}
      <header className={`border-b transition-colors duration-200 ${darkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white/80"} sticky top-0 z-30 backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-600/20">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <span className="font-display font-medium text-lg leading-tight tracking-tight block">
                YouTube SEO <span className="text-red-600 font-bold font-mono text-sm uppercase px-1.5 py-0.5 rounded ml-1 bg-red-100 dark:bg-red-950/40 dark:text-red-400">Metadaten</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Professional Keywords & Chapters Generator</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Branding Anchor */}
            <a 
              href="https://www.youtube.com/@ElvisZvonicKnowledge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono font-bold text-red-600 dark:text-red-400 select-none mr-2 sm:mr-4 hidden md:inline hover:underline"
            >
              Ein Tool von @ElvisZvonicKnowledge
            </a>
            <a 
              href="https://www.youtube.com/@ElvisZvonicKnowledge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 select-none mr-1 sm:mr-2 md:hidden hover:underline"
            >
              @ElvisZvonicKnowledge
            </a>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors border ${
                darkMode 
                  ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Farbschema umschalten"
              id="theme-toggler"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <a 
              href="#beispiele" 
              className={`hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                darkMode 
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Beispiele ansehen</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Intro Banner */}
        <div 
          id="hero-banner" 
          className="mb-8 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden bg-slate-950"
        >
          {/* Background image watermark at 20% opacity (80% transparency) */}
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 opacity-20"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/d/1oUTUtXJ-sMdjMb2OO_vFv7SErCY3PhPi')"
            }}
          />
          {/* Subtle dark gradient overlay to guarantee extreme readability */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />
          
          {/* Branding Badge (Top-Right inside Hero Banner with drop shadow and YouTube link) */}
          <div className="absolute top-4 right-4 z-20">
            <a 
              href="https://www.youtube.com/@ElvisZvonicKnowledge"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-mono font-bold text-white hover:text-red-200 transition-colors uppercase border border-white/20 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full"
              style={{ textShadow: "2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 4px 6px rgba(0,0,0,1)" }}
            >
              Ein Tool von @ElvisZvonicKnowledge
            </a>
          </div>

          <div className="relative z-10 max-w-3xl">
            <span 
              className="inline-block px-3 py-1 bg-black/65 backdrop-blur-sm rounded-full text-xs font-mono tracking-wider uppercase mb-3 text-white border border-white/15" 
              style={{ textShadow: "2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 2px 3px rgba(0,0,0,1)" }}
            >
              🚀 Algorithmus-Optimierung 2026
            </span>
            <h1 
              className="text-2xl sm:text-4xl font-display font-bold leading-tight mb-2 text-white" 
              style={{ textShadow: "2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 4px 10px rgba(0,0,0,1)" }}
            >
              Generiere perfekte YouTube-Metadaten in Sekunden.
            </h1>
            <p 
              className="text-white text-sm sm:text-base mb-6 font-sans leading-relaxed font-medium" 
              style={{ textShadow: "1px 1px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 3px 6px rgba(0,0,0,1)" }}
            >
              Analysiere deine Videotranskripte lückenlos. Unser KI-gestütztes SEO-Tool erstellt fesselnde Video-Kapitel mit Timestamps und passenden Emojis, schreibt eine suchmaschinenoptimierte Beschreibung und beachtet strikt das 495-Zeichen-Limit für Tags im YouTube Studio.
            </p>
            
            <div 
              className="flex flex-wrap gap-4 items-center text-xs font-mono bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-white"
              style={{ textShadow: "1px 1px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 0px 2px 4px rgba(0,0,0,1)" }}
            >
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Erstes Kapitel startet bei 00:00</span>
              </span>
              <span className="text-white/30 hidden sm:inline">|</span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Thematische Emojis</span>
              </span>
              <span className="text-white/30 hidden sm:inline">|</span>
              <span className="flex items-center space-x-1 font-semibold text-yellow-300">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>Strikte &lt; 495 Zeichen Tag-Garantie</span>
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Panel (Span 6) */}
          <section className="lg:col-span-6 space-y-6">
            
            <div className={`p-6 rounded-2xl border transition-colors duration-200 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            } shadow-sm`}>
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display font-semibold text-base flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <span>Transkript oder Untertitel</span>
                </h3>
                {transcript && (
                  <button 
                    onClick={() => { setTranscript(""); setFileName(null); setError(null); }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Leeren</span>
                  </button>
                )}
              </div>

              {/* Drag and Drop Zone and Text Area */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-1 transition-all ${
                  dragActive 
                    ? "border-red-500 bg-red-500/5" 
                    : darkMode ? "border-slate-800 hover:border-slate-700 bg-slate-950/40" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                id="dropzone"
              >
                {!transcript && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none text-center z-10">
                    <div className="bg-red-500/10 p-3.5 rounded-full mb-3 shadow-inner">
                      <Upload className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      SRT-Datei hierher ziehen oder Inhalt einfügen
                    </p>
                  </div>
                )}

                <textarea
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (fileName && !e.target.value) setFileName(null);
                  }}
                  placeholder="Füge hier das Roh-Transkript deines Videos ein..."
                  rows={12}
                  className={`w-full block bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-0 border-0 resize-y relative z-20 font-mono transition-opacity ${
                    !transcript ? "opacity-20" : "opacity-100"
                  } ${darkMode ? "text-slate-200" : "text-slate-800"}`}
                  id="transcript-input"
                />

                {/* Hidden File Input */}
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".txt,.srt,.vtt"
                  onChange={handleFileInput}
                />
                {!transcript && (
                  <label 
                    htmlFor="file-upload" 
                    className="absolute inset-0 cursor-pointer z-10"
                    aria-label="Datei hochladen"
                  />
                )}
              </div>

              {fileName && (
                <div className="mt-3 flex items-center justify-between text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-lg border border-emerald-500/20 font-mono">
                  <div className="flex items-center space-x-2 truncate">
                    <FileUp className="w-4 h-4 shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold shrink-0">Geladen</span>
                </div>
              )}

              {/* Advanced Fine-Tuning SEO controls */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>SEO Stellschrauben (Optional)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Keywords Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center space-x-1">
                      <TagIcon className="w-3 h-3 text-red-500" />
                      <span>Fokus SEO-Keywords</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="z.B. YouTube SEO, Ranking, 2026"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3 py-2.5 border transition-colors ${
                        darkMode 
                          ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-red-600 focus:outline-none" 
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-red-500 focus:outline-none"
                      }`}
                      id="opt-keywords"
                    />
                  </div>

                  {/* Format/Length Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-red-500" />
                      <span>Videolänge / Kapitel-Format</span>
                    </label>
                    <select
                      value={durationMode}
                      onChange={(e) => setDurationMode(e.target.value)}
                      className={`w-full text-xs rounded-xl px-3 py-2.5 border transition-colors ${
                        darkMode 
                          ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-red-600 focus:outline-none" 
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-red-500 focus:outline-none"
                      }`}
                      id="opt-duration"
                    >
                      <option value="auto">Automatisch erkennen</option>
                      <option value="under_60">Unter 60 Minuten (Format mm:ss)</option>
                      <option value="over_60">Über 60 Minuten (Format hh:mm:ss)</option>
                    </select>
                  </div>

                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tonalität & Zielgruppen-Fokus</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      "Professionell & SEO-optimiert",
                      "Begeistert & Klickstark",
                      "Informativ & Sachlich",
                      "Unterhaltsam & Locker"
                    ].map((toneOpt) => (
                      <button
                        key={toneOpt}
                        type="button"
                        onClick={() => setThemeTone(toneOpt)}
                        className={`text-[10px] font-medium p-2 rounded-lg border text-center transition-all ${
                          themeTone === toneOpt
                            ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-bold"
                            : darkMode 
                              ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200" 
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {toneOpt.split(" & ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Button */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={generateMetadata}
                  disabled={loading || !transcript.trim()}
                  className={`flex-1 py-3.5 px-4 rounded-xl font-display font-semibold transition-all shadow-md flex items-center justify-center space-x-2 ${
                    loading || !transcript.trim()
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none"
                      : "bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white shadow-red-600/10 hover:shadow-red-600/20"
                  }`}
                  id="btn-generate"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Metadaten werden berechnet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      <span>YouTube SEO Metadaten Generieren</span>
                    </>
                  )}
                </button>

                {(transcript.trim() || metadata) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className={`py-3.5 px-5 rounded-xl font-display font-semibold transition-all border duration-200 cursor-pointer ${
                      darkMode
                        ? "border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                    title="Alles zurücksetzen für ein neues Projekt"
                    id="btn-reset"
                  >
                    Zurücksetzen
                  </button>
                )}
              </div>

              {/* Loading Status Log details */}
              {loading && (
                <div className={`mt-4 p-4 rounded-xl border text-xs font-mono transition-colors ${
                  darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Arbeitsschritte:</span>
                    <span className="text-red-500 font-bold animate-pulse">LÄUFT...</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                    <li className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${currentStep >= 1 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className={currentStep === 1 ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                        1. Lückenlose Transkript-Analyse
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${currentStep >= 2 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className={currentStep === 2 ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                        2. SEO-optimierte Kapitel Generierung (00:00 zwingend)
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${currentStep >= 3 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className={currentStep === 3 ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                        3. Beschreibungssynthese (3-4 Sätze)
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${currentStep >= 4 ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className={currentStep === 4 ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                        4. 495-Zeichen Tag-Limit Extraktion & Formatierung
                      </span>
                    </li>
                  </ul>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20 text-xs">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Generierung fehlgeschlagen</p>
                      <p className="mt-1 font-mono">{error}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Guide Info Box */}
            <div className={`p-5 rounded-2xl border text-xs leading-relaxed transition-colors ${
              darkMode ? "bg-slate-900/50 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
            }`}>
              <h4 className="font-display font-semibold text-slate-800 dark:text-slate-300 mb-2 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-slate-500" />
                <span>YouTube Studio Metadaten-Richtlinien</span>
              </h4>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Kapitel:</strong> Müssen lückenlos sein, mindestens 3 Kapitel, und das allererste muss exakt bei <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">00:00</code> beginnen.</li>
                <li><strong>Beschreibung:</strong> Die ersten 3 Sätze sind entscheidend für SEO, da diese im Google- und YouTube-Snippets angezeigt werden.</li>
                <li><strong>Tags:</strong> 500 Zeichen Maximum. Unser Tool erzwingt eine maximale Länge von <strong className="text-red-600 dark:text-red-400">495 Zeichen</strong>, um Puffer für ungewollte Sonderzeichen-Berechnungen zu bieten.</li>
              </ul>
            </div>

          </section>

          {/* Right Column: Results Panel (Span 6) */}
          <section className="lg:col-span-6 space-y-6">
            
            {!metadata && !loading && (
              <div className={`border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[500px] transition-colors ${
                darkMode ? "bg-slate-900/40 border-slate-800/80" : "bg-white border-slate-200"
              }`}>
                <div className="bg-red-500/10 p-4 rounded-full text-red-500 mb-4">
                  <Youtube className="w-8 h-8" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">Bereit für Metadaten-Analyse</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">
                  Füge links ein Videotranskript ein, nutze eines unserer Beispiele, oder lade ein Untertitel-File hoch, um perfekte SEO Kapitel, Beschreibungen und Tags zu generieren.
                </p>
                <div className="animate-bounce text-slate-400">
                  ⬇️
                </div>
              </div>
            )}

            {loading && (
              <div className={`border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[500px] transition-colors ${
                darkMode ? "bg-slate-900/40 border-slate-800/80" : "bg-white border-slate-200"
              }`}>
                <div className="relative mb-6">
                  {/* Glowing spinner */}
                  <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-red-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-red-500">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
                <h3 className="font-display font-semibold text-lg mb-1">KI-Algorithmus arbeitet</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                  {currentStep === 1 && "Analysiere Text und isoliere Schlüsselthemen..."}
                  {currentStep === 2 && "Generiere lückenlose Kapitel-Timestamps..."}
                  {currentStep === 3 && "Optimiere Beschreibung & Keywords..."}
                  {currentStep === 4 && "Validiere Tags unter 495 Zeichen..."}
                </p>
                <div className="w-48 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
                  <div 
                    className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {metadata && !loading && (
              <div className="space-y-6">
                
                {/* Result Header & Selector */}
                <div className={`p-4 rounded-2xl border transition-colors ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                } shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4`}>
                  
                  <div className="flex space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab("raw")}
                      className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                        activeTab === "raw"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-slate-200"
                      }`}
                      id="tab-raw"
                    >
                      <FileText className="w-4.5 h-4.5" />
                      <span>Kopierfertiger Text (Rohdaten)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("visual")}
                      className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                        activeTab === "visual"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-slate-200"
                      }`}
                      id="tab-visual"
                    >
                      <Sliders className="w-4.5 h-4.5" />
                      <span>Studio Editor (Feinschliff)</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all"
                      title="Gesamten Text kopieren"
                      id="btn-copy-raw"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Kopieren</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={downloadTxtFile}
                      className={`p-2 rounded-xl transition-colors border ${
                        darkMode 
                          ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      title="Als .txt Datei herunterladen"
                      id="btn-download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                </div>

                {/* Tab Content 1: RAW (No markdown, perfect Copy-Paste) */}
                {activeTab === "raw" && (
                  <div className={`p-6 rounded-2xl border transition-colors ${
                    darkMode ? "bg-slate-950 border-slate-900" : "bg-white border-slate-200"
                  } shadow-sm relative`}>
                    
                    <div className="absolute top-4 right-4 text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-400">
                      Direkt importierbare TXT
                    </div>

                    <h4 className="font-display font-semibold text-sm mb-4 text-slate-500 dark:text-slate-400">
                      Vorschau der Export-Datei (.txt)
                    </h4>

                    {/* Complies exactly with output restrictions: No header like 'Hier ist das Ergebnis', no markdown bold asterisks */}
                    <pre 
                      className={`whitespace-pre-wrap font-mono text-xs sm:text-sm p-4 rounded-xl border leading-relaxed select-all max-h-[500px] overflow-y-auto ${
                        darkMode ? "bg-slate-900/40 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                      id="raw-output-preview"
                    >
                      {metadata.rawPlainText}
                    </pre>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Kapitel: {metadata.chapters.length}</span>
                      <span>Tags Länge: {metadata.processedTags.length} / 495 Zeichen</span>
                    </div>

                  </div>
                )}

                {/* Tab Content 2: VISUAL EDITOR / Feinschliff */}
                {activeTab === "visual" && (
                  <div className="space-y-6">
                    
                    {/* Interactive Chapters Editor */}
                    <div className={`p-6 rounded-2xl border transition-colors ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    } shadow-sm`}>
                      
                      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <h4 className="font-display font-semibold text-sm">Kapitel-Einteilung (Chapters)</h4>
                          <p className="text-[10px] text-slate-500">Erstes Kapitel muss bei 00:00 starten</p>
                        </div>
                        <button
                          onClick={addChapter}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-colors"
                          id="btn-add-chapter"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Hinzufügen</span>
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {metadata.chapters.map((ch, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center space-x-2 p-2 rounded-xl border ${
                              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <input
                              type="text"
                              value={ch.emoji}
                              onChange={(e) => updateChapter(idx, "emoji", e.target.value)}
                              className="w-8 py-1.5 text-center bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none text-sm"
                              title="Kapitel Emoji"
                            />
                            
                            <input
                              type="text"
                              value={ch.timestamp}
                              onChange={(e) => updateChapter(idx, "timestamp", e.target.value)}
                              className="w-16 font-mono text-center text-xs py-1.5 bg-transparent border-b border-dashed border-red-400 focus:outline-none focus:border-red-500 font-bold"
                              placeholder="00:00"
                              title="Zeitstempel"
                            />

                            <input
                              type="text"
                              value={ch.title}
                              onChange={(e) => updateChapter(idx, "title", e.target.value)}
                              className="flex-1 text-xs py-1.5 px-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none font-medium truncate"
                              placeholder="Kapitel-Titel"
                              title="Kapitel-Titel"
                            />

                            <button
                              onClick={() => removeChapter(idx)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Kapitel löschen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Interactive Description Editor */}
                    <div className={`p-6 rounded-2xl border transition-colors ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    } shadow-sm`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-display font-semibold text-sm">Videobeschreibung (3-4 Sätze)</h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {metadata.description.length} Zeichen
                        </span>
                      </div>
                      
                      <textarea
                        value={metadata.description}
                        onChange={(e) => updateDescription(e.target.value)}
                        rows={4}
                        className={`w-full text-xs rounded-xl p-3 border font-sans focus:outline-none focus:ring-1 focus:ring-red-500 ${
                          darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                        placeholder="Zusammenfassung des Videos..."
                        id="description-editor"
                      />
                    </div>

                    {/* Smart Tags Manager */}
                    <div className={`p-6 rounded-2xl border transition-colors ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    } shadow-sm`}>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-display font-semibold text-sm">YouTube-Tags</h4>
                          <p className="text-[10px] text-slate-500">Kommagetrennt, für direkte Platzierung im Studio</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-mono font-bold ${
                            metadata.processedTags.length > 480 ? "text-amber-500" : "text-emerald-500"
                          }`}>
                            {metadata.processedTags.length}
                          </span>
                          <span className="text-xs font-mono text-slate-400"> / 495 Zeichen</span>
                        </div>
                      </div>

                      {/* Tags Badges Box */}
                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        {metadata.tags.map((tag, idx) => (
                          <div
                            key={idx}
                            className="bg-red-600/10 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-medium pl-2.5 pr-1.5 py-1 rounded-full flex items-center space-x-1 border border-red-500/10 hover:border-red-500/30 transition-all"
                          >
                            <span>{tag}</span>
                            <button
                              onClick={() => handleRemoveTag(idx)}
                              className="hover:bg-red-500/20 text-red-500 rounded-full p-0.5 transition-colors focus:outline-none"
                              title="Tag entfernen"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        {metadata.tags.length === 0 && (
                          <span className="text-xs text-slate-400 p-2 italic w-full text-center">Keine Tags hinzugefügt.</span>
                        )}
                      </div>

                      {/* Add Custom Tag Form */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = (e.currentTarget.elements.namedItem("tagInput") as HTMLInputElement);
                          if (input && input.value) {
                            handleAddTag(input.value);
                            input.value = "";
                          }
                        }}
                        className="flex space-x-2"
                      >
                        <input
                          type="text"
                          name="tagInput"
                          placeholder="Neues Tag hinzufügen..."
                          className={`flex-1 text-xs rounded-xl px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-red-500 ${
                            darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                          }`}
                        />
                        <button
                          type="submit"
                          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-transparent dark:hover:bg-slate-100 hover:bg-slate-800 transition-colors px-3 rounded-xl text-xs font-bold"
                        >
                          Hinzufügen
                        </button>
                      </form>

                    </div>

                    {/* Interactive Step 1, 2 & 3: Emotional Core, Trigger Extraction & Trigger Ranking Editor */}
                    <div className={`p-6 rounded-2xl border transition-colors ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    } shadow-sm space-y-4`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-red-500" />
                          <span>Schritt 1 bis 3: Doku-Fokus</span>
                        </h4>
                        <span className="text-[9px] font-bold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full uppercase">
                          Emotional Hook Pipeline
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Schritt 1: Emotionaler Kern (Stärkster Kontrast)
                          </label>
                          <textarea
                            value={metadata.emotionalCore || ""}
                            onChange={(e) => updateEmotionalCore(e.target.value)}
                            rows={2}
                            className={`w-full text-xs rounded-xl p-3 border font-sans focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed ${
                              darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                            placeholder="Z.B. Angst vs. Hoffnung oder vergessenes Wissen..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Schritt 2: Trigger-Extraktion (Ungewöhnliche Begriffe / Szenen)
                          </label>
                          <textarea
                            value={metadata.triggerExtraction || ""}
                            onChange={(e) => updateTriggerExtraction(e.target.value)}
                            rows={2}
                            className={`w-full text-xs rounded-xl p-3 border font-sans focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed ${
                              darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                            placeholder="Z.B. Ungewöhnliche oder seltene Szenen..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Schritt 3: Trigger-Ranking (Scroll-Stopper Analyse)
                          </label>
                          <textarea
                            value={metadata.triggerRanking || ""}
                            onChange={(e) => updateTriggerRanking(e.target.value)}
                            rows={2}
                            className={`w-full text-xs rounded-xl p-3 border font-sans focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed ${
                              darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                            placeholder="Welches Element fesselt den Zuschauer sofort beim Scrollen?"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Interactive Titles Editor */}
                    <div className={`p-6 rounded-2xl border transition-colors ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    } shadow-sm space-y-4`}>
                      <div>
                        <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                          <TypeIcon className="w-4 h-4 text-red-500" />
                          <span>Schritt 4: CTR-Titel-Generierung (5 Varianten)</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">Klickstarke Varianten, die eine packende Geschichte anteasern</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { key: "variant1" as keyof Titles, label: "Titel 1: Emotionaler Teaser (Menschliche Story)" },
                          { key: "variant2" as keyof Titles, label: "Titel 2: Das Schicksal / Die persönliche Herausforderung" },
                          { key: "variant3" as keyof Titles, label: "Titel 3: Der unerwartete Kontrast / Geheimnis" },
                          { key: "variant4" as keyof Titles, label: "Titel 4: Der ungelöste Schmerzpunkt (Neugier-basiert)" },
                          { key: "variant5" as keyof Titles, label: "Titel 5: Seriöse, dokumentarische Enthüllung (SEO-optimiert)" },
                        ].map((item) => (
                          <div key={item.key}>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                              {item.label}
                            </label>
                            <input
                              type="text"
                              value={metadata.titles?.[item.key] || ""}
                              onChange={(e) => updateTitle(item.key, e.target.value)}
                              className={`w-full text-xs rounded-xl p-3 border font-sans focus:outline-none focus:ring-1 focus:ring-red-500 ${
                                darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                              }`}
                              placeholder="Fesselnder Titel..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Thumbnail Prompt Editor */}
                    <div className={`p-6 rounded-2xl border transition-colors ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    } shadow-sm space-y-3`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          <span>Schritt 5: Thumbnail-Logik (&quot;Ein Frame eines Films&quot;)</span>
                        </h4>
                        <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase">
                          Für Midjourney / KI-Bildgeneratoren
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Ein präziser, englischer Prompt für eine filmisch eingefrorene Szene mit starker Lichtstimmung, Texturen und dem Platzhalter <code className="font-mono bg-amber-500/15 py-0.5 px-1 rounded text-amber-600 font-bold">[HIER TITEL-TRIGGER EINSETZEN]</code>.
                      </p>

                      <textarea
                        value={metadata.thumbnailPrompt || ""}
                        onChange={(e) => updateThumbnailPrompt(e.target.value)}
                        rows={4}
                        className={`w-full text-xs rounded-xl p-3 border font-mono focus:outline-none focus:ring-1 focus:ring-red-500 leading-relaxed ${
                          darkMode ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                        placeholder="Filmisches Thumbnail Prompt..."
                      />
                    </div>

                  </div>
                )}

              </div>
            )}

          </section>

        </div>

        {/* Section: Try beautiful interactive Samples (Under index) */}
        <section id="beispiele" className="mt-16 pt-12 border-t border-slate-200 dark:border-slate-800">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-red-500 text-xs font-mono font-bold uppercase tracking-wider block mb-1">
                ⚡ Sofortiger Test
              </span>
              <h3 className="font-display font-bold text-xl sm:text-2xl tracking-tight">
                Kein Transkript bereit? Versuche diese Musterbeispiele.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Klicke auf eines der Beispiele, um das Video-Transkript, Keywords und Tonalität automatisch zu laden.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLE_TRANSCRIPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  loadSample(idx);
                  // Scroll to top layout smoothly
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden group hover:scale-[1.01] ${
                  darkMode 
                    ? "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80" 
                    : "bg-white border-slate-200 hover:border-red-200 hover:bg-slate-50"
                }`}
              >
                {/* Decorative floating icon */}
                <div className="absolute -top-3 -right-3 w-16 h-16 bg-red-500/5 group-hover:bg-red-500/10 rounded-full transition-colors flex items-center justify-center pointer-events-none">
                  <Sparkles className="w-6 h-6 text-red-500/25 group-hover:text-red-500/50" />
                </div>

                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider mb-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  {sample.type === "srt" ? "Subtitle .SRT Format" : "Standard Raw-Text"}
                </span>

                <h4 className="font-display font-bold text-sm tracking-tight mb-2 text-slate-800 dark:text-slate-100 group-hover:text-red-600 transition-colors">
                  {sample.name}
                </h4>

                <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-3 mb-4 font-mono leading-relaxed">
                  {sample.text}
                </p>

                <div className="flex flex-col gap-1 text-[10px] border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="truncate">
                    <span className="font-bold text-slate-500">Keywords:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{sample.keywords}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500">Tonalität:</span>{" "}
                    <span className="text-slate-600 dark:text-slate-400">{sample.tone}</span>
                  </div>
                </div>

              </button>
            ))}
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className={`mt-24 border-t py-8 text-center text-xs transition-colors ${
        darkMode ? "border-slate-800 bg-slate-950 text-slate-500" : "border-slate-200 bg-white text-slate-400"
      }`}>
        <p className="font-mono">YouTube SEO Metadaten-Generator &copy; 2026. Lückenlos & 495-Zeichen Safe.</p>
        <p className="mt-1 text-[10px]">Optimiert für ultraschnelles Copy-and-Paste direkt in das YouTube Studio.</p>
      </footer>

    </div>
  );
}
