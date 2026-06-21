import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Volume2, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import APIService from "../services/api";
import AudioPlayer from "../components/AudioPlayer";
import SkeletonLoader from "../components/SkeletonLoader";

const MotionDiv = motion.div;

const SAMPLE_TEXTS = [
  "తెలుగు భాష ద్రావిడ భాషల కుటుంబానికి చెందిన భాష. ఇది ఆంధ్రప్రదేశ్ మరియు తెలంగాణ రాష్ట్రాల అధికార భాష. తెలుగు భాష చాలా ప్రాచీనమైనది మరియు గొప్ప సాహిత్య సంప్రదాయం కలిగి ఉంది. దీనిని అమృతభాష అని కూడా పిలుస్తారు. తెలుగు భాషలో అనేక ప్రాచీన గ్రంథాలు, కావ్యాలు మరియు సాహిత్య రచనలు ఉన్నాయి. నన్నయ, తిక్కన, ఎర్రన వంటి మహా కవులు తెలుగు సాహిత్యానికి ఎనలేని సేవ చేశారు.",
  "భారతదేశం అనేక సంస్కృతులు మరియు సంప్రదాయాలకు నిలయం. ఈ దేశంలో వివిధ మతాలు, భాషలు మరియు కళలు సమృద్ధిగా ఉన్నాయి. భారతీయ నాగరికత ప్రపంచంలోనే అత్యంత ప్రాచీనమైనది. సింధూ నాగరికత నుండి నేటి ఆధునిక భారతదేశం వరకు ఈ దేశం అనేక మార్పులను చూసింది. భారతదేశ స్వాతంత్ర్య పోరాటం ప్రపంచానికే ఆదర్శంగా నిలిచింది.",
  "హైదరాబాద్ తెలంగాణ రాష్ట్రానికి రాజధాని. ఇది భారతదేశంలోని ముఖ్యమైన సాంకేతిక కేంద్రాలలో ఒకటి. ఈ నగరం దాని చారిత్రక స్మారక చిహ్నాలకు, బిరియానీకి మరియు ముత్యాల మార్కెట్‌కు ప్రసిద్ధి చెందింది. చార్మినార్, గోల్కొండ కోట మరియు హుస్సేన్ సాగర్ ఇక్కడ ప్రసిద్ధ పర్యాటక ప్రదేశాలు. హైదరాబాద్ IT పరిశ్రమలో ప్రముఖ పాత్ర పోషిస్తోంది."
];

const SUMMARIZATION_METHODS = [
  {
    id: "tfidf",
    name: "Fast",
    model: "TF-IDF Model",
    description: "Extractive sentences selector"
  },
  {
    id: "mt5_base",
    name: "Balanced",
    model: "mT5 Base Model",
    description: "Multilingual transformer"
  },
  {
    id: "mt5_finetuned",
    name: "High Quality",
    model: "mT5 Fine-tuned",
    description: "Telugu specialist model"
  }
];

function TextSummarize() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("tfidf");
  const [copied, setCopied] = useState(false);
  const [usedMethod, setUsedMethod] = useState("");
  const [generateAudio, setGenerateAudio] = useState(true);

  const loadSampleText = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_TEXTS.length);
    setInputText(SAMPLE_TEXTS[randomIndex]);
    setSummary("");
    setAudioUrl("");
    setError("");
    setUsedMethod("");
    setCopied(false);
  };

  const handleSummarize = async () => {
    if (!inputText.trim()) {
      setError("Please enter some Telugu text to summarize.");
      return;
    }
    setIsProcessing(true);
    setError("");
    setSummary("");
    setAudioUrl("");
    setUsedMethod("");
    try {
      const result = await APIService.summarizeText(inputText, selectedMethod, generateAudio);
      setSummary(result.summary);
      setUsedMethod(result.executed_method || result.method);
      if (result.audio_url) {
        setAudioUrl(result.audio_url);
      }
    } catch (err) {
      setError(err.message || "An error occurred while processing your request");
      console.error("Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setInputText("");
    setSummary("");
    setAudioUrl("");
    setError("");
    setUsedMethod("");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const charCount = inputText?.length || 0;
  const isDisabled = !inputText.trim() || isProcessing;
  const usedMethodObj = SUMMARIZATION_METHODS.find((m) => m.id === usedMethod);

  return (
    <div className="app-page text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-lg shadow-[var(--primary)]/25">
            <Sparkles className="h-7 w-7 text-[var(--background)]" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] font-display">
            Telugu Text Summarization
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Summarize Telugu news copy and synthesize spoken bulletins
          </p>
        </MotionDiv>

        {/* Method Selector Pills */}
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <span className="block text-center text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">
            Choose Summarization Method
          </span>
          <div className="mx-auto max-w-3xl grid gap-3 sm:grid-cols-3">
            {SUMMARIZATION_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={isProcessing}
                  className={`group flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--text-primary)]"
                      : "border-[var(--border)] bg-[var(--surface-muted)]/30 text-[var(--text-secondary)] hover:border-[var(--primary)]/35 hover:text-[var(--text-primary)] disabled:opacity-40"
                  }`}
                >
                  <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                    {method.name}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]/90 mt-0.5">
                    {method.model}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]/70 leading-normal">
                    {method.description}
                  </span>
                </button>
              );
            })}
          </div>
        </MotionDiv>

        {/* Main Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Input Panel */}
          <MotionDiv
            className="app-card flex flex-col p-6 rounded-2xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <FileText className="h-4.5 w-4.5 text-[var(--primary)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Input Text
                </h3>
              </div>
              <button
                onClick={loadSampleText}
                disabled={isProcessing}
                className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] hover:opacity-85 transition-colors disabled:opacity-50"
              >
                Load sample
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setError("");
              }}
              placeholder="తెలుగు వచనం ఇక్కడ టైప్ చేయండి లేదా అతికించండి (Type or paste Telugu text here)..."
              disabled={isProcessing}
              className="app-textarea min-h-[340px] flex-1 resize-none text-sm leading-relaxed"
              dir="auto"
            />

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-4 py-3 transition-colors hover:border-[var(--primary)]/25">
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <Volume2 className="h-4 w-4 text-[var(--primary)]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    Generate Telugu Radio bulletin
                  </span>
                  <span className="block text-[11px] text-[var(--text-secondary)]">
                    Synthesizes Edge TTS MP3 after summary
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(event) => setGenerateAudio(event.target.checked)}
                disabled={isProcessing}
                className="h-4.5 w-4.5 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>

            {/* Footer row */}
            <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]/80">
              <span className="font-mono text-xs text-[var(--text-secondary)] font-semibold">
                {charCount.toLocaleString()} characters
              </span>

              <div className="flex items-center gap-2">
                {inputText && !isProcessing && (
                  <button
                    onClick={handleClear}
                    className="app-button app-button-secondary rounded-xl px-4 py-2 text-xs"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSummarize}
                  disabled={isDisabled}
                  className="app-button app-button-primary rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-wider"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Summarize
                </button>
              </div>
            </div>

            {/* Error alerts */}
            <AnimatePresence>
              {error && (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-2 overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2.5 text-xs text-red-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </MotionDiv>
              )}
            </AnimatePresence>
          </MotionDiv>

          {/* Output Panel */}
          <MotionDiv
            className="app-card flex flex-col p-6 rounded-2xl"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <Sparkles className="h-4.5 w-4.5 text-[var(--primary)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Summary Output
                </h3>
                {usedMethodObj && (
                  <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    {usedMethodObj.name}
                  </span>
                )}
              </div>
              {summary && (
                <button
                  onClick={() => copyToClipboard(summary)}
                  className="app-button app-button-secondary rounded-xl px-3 py-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="min-h-[340px] flex-1 flex flex-col">
              {isProcessing ? (
                <div className="flex-1 flex items-center justify-center">
                  <SkeletonLoader generateAudio={generateAudio} method={selectedMethod} />
                </div>
              ) : summary ? (
                <div className="flex-1 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
                  <p className="text-sm sm:text-base leading-relaxed text-[var(--text-primary)] flex-1 font-medium" dir="auto">
                    {summary}
                  </p>

                  {audioUrl && (
                    <div className="mt-2">
                      <AudioPlayer src={APIService.getAudioUrl(audioUrl)} headline="Text Summary Segment" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--surface-muted)]/10">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Your generated abstractive summary will display here
                  </p>
                </div>
              )}
            </div>
          </MotionDiv>

        </div>
      </div>
    </div>
  );
}

export default TextSummarize;
