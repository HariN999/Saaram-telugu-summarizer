import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, FileText, Volume2,
  Download, Copy, CheckCircle2, ChevronDown, AlertCircle,
} from "lucide-react";
import APIService from "../services/api";

const MotionDiv = motion.div;
const MotionSpan = motion.span;

const SAMPLE_TEXTS = [
  "తెలుగు భాష ద్రావిడ భాషల కుటుంబానికి చెందిన భాష. ఇది ఆంధ్రప్రదేశ్ మరియు తెలంగాణ రాష్ట్రాల అధికార భాష. తెలుగు భాష చాలా ప్రాచీనమైనది మరియు గొప్ప సాహిత్య సంప్రదాయం కలిగి ఉంది. దీనిని అమృతభాష అని కూడా పిలుస్తారు. తెలుగు భాషలో అనేక ప్రాచీన గ్రంథాలు, కావ్యాలు మరియు సాహిత్య రచనలు ఉన్నాయి. నన్నయ, తిక్కన, ఎర్రన వంటి మహా కవులు తెలుగు సాహిత్యానికి ఎనలేని సేవ చేశారు.",
  "భారతదేశం అనేక సంస్కృతులు మరియు సంప్రదాయాలకు నిలయం. ఈ దేశంలో వివిధ మతాలు, భాషలు మరియు కళలు సమృద్ధిగా ఉన్నాయి. భారతీయ నాగరికత ప్రపంచంలోనే అత్యంత ప్రాచీనమైనది. సింధూ నాగరికత నుండి నేటి ఆధునిక భారతదేశం వరకు ఈ దేశం అనేక మార్పులను చూసింది. భారతదేశ స్వాతంత్ర్య పోరాటం ప్రపంచానికే ఆదర్శంగా నిలిచింది.",
  "హైదరాబాద్ తెలంగాణ రాష్ట్రానికి రాజధాని. ఇది భారతదేశంలోని ముఖ్యమైన సాంకేతిక కేంద్రాలలో ఒకటి. ఈ నగరం దాని చారిత్రక స్మారక చిహ్నాలకు, బిరియానీకి మరియు ముత్యాల మార్కెట్‌కు ప్రసిద్ధి చెందింది. చార్మినార్, గోల్కొండ కోట మరియు హుస్సేన్ సాగర్ ఇక్కడ ప్రసిద్ధ పర్యాటక ప్రదేశాలు. హైదరాబాద్ IT పరిశ్రమలో ప్రముఖ పాత్ర పోషిస్తోంది.",
];

const SUMMARIZATION_METHODS = [
  {
    id: "tfidf",
    name: "TF-IDF",
    badge: "Fast",
    type: "Extractive",
    description: "Picks the most important sentences directly from the article.",
    emoji: "⚡",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  {
    id: "mt5_base",
    name: "mT5 Base",
    badge: "AI",
    type: "Abstractive",
    description: "Generates fluent summaries using the multilingual XLSum base model.",
    emoji: "🤖",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    border: "border-indigo-200 dark:border-indigo-500/20",
  },
  {
    id: "mt5_finetuned",
    name: "mT5 Fine-tuned",
    badge: "Experimental",
    type: "Abstractive",
    description: "Fine-tuned on Telugu dataset",
    emoji: "✨",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/20",
  },
];

function TextSummarize() {
  const [inputText, setInputText] = useState("");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("tfidf");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [usedMethod, setUsedMethod] = useState("");

  const currentMethod = SUMMARIZATION_METHODS.find((m) => m.id === selectedMethod);

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
      setError("Please enter some text to summarize");
      return;
    }
    setIsProcessing(true);
    setProcessingStatus(`Processing with ${currentMethod.name}...`);
    setError("");
    setSummary("");
    setAudioUrl("");
    setUsedMethod("");
    try {
      const result = await APIService.summarizeText(inputText, selectedMethod);
      setProcessingStatus("Summary generated successfully!");
      setSummary(result.summary);
      setUsedMethod(result.executed_method || result.method);
      if (result.audio_url) {
        setAudioUrl(result.audio_url);
      }
      setTimeout(() => setProcessingStatus(""), 2000);
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
    setProcessingStatus("");
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
    <div className="app-page">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
            Telugu Text Summarization
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Summarize Telugu text using AI-powered algorithms
          </p>
        </MotionDiv>

        {/* Method Selector */}
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              disabled={isProcessing}
              className={`flex items-center gap-3 rounded-xl border px-5 py-3 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${currentMethod.bg} ${currentMethod.border}`}
            >
              <span className="text-lg">{currentMethod.emoji}</span>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${currentMethod.color}`}>
                    {currentMethod.name}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${currentMethod.bg} ${currentMethod.color} border ${currentMethod.border}`}>
                    {currentMethod.badge}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {currentMethod.type}
                </div>
              </div>
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform duration-200 ${currentMethod.color} ${showMethodDropdown ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {showMethodDropdown && (
                <MotionDiv
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl"
                  style={{ minWidth: "280px", backdropFilter: 'blur(12px)' }}
                >
                  {SUMMARIZATION_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setShowMethodDropdown(false);
                      }}
                      className={`w-full border-b border-[var(--border-color)] p-4 text-left transition-colors last:border-b-0 ${
                        selectedMethod === method.id ? `${method.bg}` : "hover:bg-[var(--bg-secondary)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{method.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${method.color}`}>{method.name}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${method.bg} ${method.color} border ${method.border}`}>
                              {method.badge}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {method.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </MotionDiv>

        {/* Main Panels */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Input Panel */}
          <MotionDiv
            className="app-card flex flex-col rounded-2xl p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            {/* Panel header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Input Text
                </h3>
              </div>
              <button
                onClick={loadSampleText}
                disabled={isProcessing}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 animated-underline"
              >
                Load sample
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="తెలుగు వచనం ఇక్కడ టైప్ చేయండి..."
              disabled={isProcessing}
              className="app-textarea min-h-[380px] flex-1 resize-none font-sans text-sm leading-relaxed disabled:cursor-not-allowed disabled:opacity-50"
              dir="auto"
            />

            {/* Footer row */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  {charCount.toLocaleString()} chars
                </span>
                <AnimatePresence>
                  {isProcessing && processingStatus && (
                    <MotionSpan
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-indigo-600 dark:text-indigo-400"
                    >
                      {processingStatus}
                    </MotionSpan>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                {inputText && (
                  <button
                    onClick={handleClear}
                    disabled={isProcessing}
                    className="app-button app-button-secondary rounded-lg px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleSummarize}
                  disabled={isDisabled}
                  className="app-button app-button-primary rounded-lg px-5 py-2 text-xs disabled:hover:scale-100"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Summarize
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2.5 text-xs text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                >
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </MotionDiv>
              )}
            </AnimatePresence>
          </MotionDiv>

          {/* Output Panel */}
          <MotionDiv
            className="app-card flex flex-col rounded-2xl p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            {/* Panel header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Summary
                </h3>
                {usedMethodObj && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${usedMethodObj.bg} ${usedMethodObj.color} ${usedMethodObj.border}`}>
                    {usedMethodObj.name}
                  </span>
                )}
              </div>
              {summary && (
                <button
                  onClick={() => copyToClipboard(summary)}
                  className="app-button app-button-secondary rounded-lg px-3 py-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
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

            <div className="min-h-[380px] flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              {summary ? (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-[var(--text-primary)]" dir="auto">
                    {summary}
                  </p>

                  {audioUrl && (
                    <MotionDiv
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <Volume2 className="h-3.5 w-3.5" />
                        Audio generated
                      </div>
                      <audio controls className="mt-3 w-full">
                        <source src={APIService.getAudioUrl(audioUrl)} type="audio/mpeg" />
                      </audio>
                      <a
                        href={APIService.getAudioUrl(audioUrl)}
                        download="summary_audio.mp3"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Audio
                      </a>
                    </MotionDiv>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[340px] items-center justify-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <div className="absolute inset-0 h-8 w-8 animate-ping-slow rounded-full border-2 border-indigo-400/30" />
                      </div>
                      <p className="text-xs font-medium text-[var(--text-secondary)]">
                        Generating summary...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)]">
                        <Sparkles className="h-4 w-4 text-[var(--text-secondary)]" />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Your summary will appear here after processing
                      </p>
                    </div>
                  )}
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
