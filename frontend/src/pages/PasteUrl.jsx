import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2, Loader2, CheckCircle2, AlertCircle,
  Download, Copy, ExternalLink, ChevronDown, Volume2,
} from "lucide-react";
import APIService from "../services/api";

const MotionDiv = motion.div;

const SUMMARIZATION_METHODS = [
  {
    id: "tfidf",
    name: "TF-IDF",
    badge: "Fast",
    emoji: "⚡",
    description: "Picks the most important sentences directly from the article.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  {
    id: "mt5_base",
    name: "mT5 Base",
    badge: "AI",
    emoji: "🤖",
    description: "Generates fluent summaries using the multilingual XLSum base model.",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    border: "border-indigo-200 dark:border-indigo-500/20",
  },
  {
    id: "mt5_finetuned",
    name: "mT5 Fine-tuned",
    badge: "Experimental",
    emoji: "✨",
    description: "Fine-tuned on Telugu dataset",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    border: "border-violet-200 dark:border-violet-500/20",
  },
];

const methodLabel = (id) =>
  SUMMARIZATION_METHODS.find((m) => m.id === id)?.name ?? id;

function PasteUrl() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("tfidf");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generateAudio, setGenerateAudio] = useState(false);

  const currentMethod = SUMMARIZATION_METHODS.find((m) => m.id === selectedMethod);

  const handleFetchNews = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await APIService.processUrl(url, selectedMethod, generateAudio);
      setResult({
        title: "News Article",
        summary: response.summary,
        audioUrl: response.audio_url || null,
        originalUrl: url,
        method: response.executed_method || response.method,
      });
    } catch (err) {
      setError(err.message || "Failed to process URL. Please check the URL and try again.");
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setUrl("");
    setResult(null);
    setError("");
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

  const resultMethod = SUMMARIZATION_METHODS.find((m) => m.id === result?.method);

  return (
    <div className="app-page">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
            Fetch News from URL
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Paste a news article link to summarize and generate audio
          </p>
        </MotionDiv>

        {/* Method Selector */}
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex justify-center"
        >
          <div className="relative">
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              disabled={isLoading}
              className={`flex items-center gap-3 rounded-xl border px-5 py-3 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${currentMethod.bg} ${currentMethod.border}`}
            >
              <span className="text-lg">{currentMethod.emoji}</span>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${currentMethod.color}`}>
                    {currentMethod.name}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${currentMethod.bg} ${currentMethod.color} ${currentMethod.border}`}>
                    {currentMethod.badge}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {currentMethod.description}
                </div>
              </div>
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${currentMethod.color} ${showMethodDropdown ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showMethodDropdown && (
                <MotionDiv
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl"
                  style={{ minWidth: "300px", backdropFilter: 'blur(12px)' }}
                >
                  {SUMMARIZATION_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setShowMethodDropdown(false);
                      }}
                      className={`w-full border-b border-[var(--border-color)] p-4 text-left transition-colors last:border-b-0 ${
                        selectedMethod === method.id ? method.bg : "hover:bg-[var(--bg-secondary)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{method.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${method.color}`}>{method.name}</span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${method.bg} ${method.color} ${method.border}`}>
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

        {/* URL Input Card */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="app-card mb-6 rounded-2xl p-6"
        >
          <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            News Article URL
          </label>

          <div className="relative">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading && url.trim()) {
                  handleFetchNews();
                }
              }}
              placeholder="https://example.com/telugu-news-article"
              disabled={isLoading}
              className="app-input pr-12 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Link2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          </div>

          <AnimatePresence>
            {error && (
              <MotionDiv
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-900/20 px-3 py-2.5 text-xs text-red-700 dark:text-red-400"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </MotionDiv>
            )}
          </AnimatePresence>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 transition-colors hover:border-indigo-300 dark:hover:border-indigo-500/40">
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <Volume2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                  Also generate Telugu audio
                </span>
                <span className="block text-xs text-[var(--text-secondary)]">
                  Optional Edge TTS MP3 for the summary
                </span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={generateAudio}
              onChange={(event) => setGenerateAudio(event.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleFetchNews}
              disabled={isLoading || !url.trim()}
              className="app-button app-button-primary rounded-xl px-6 py-3 text-sm disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Fetch & Summarize
                </>
              )}
            </button>

            {url && !isLoading && (
              <button
                onClick={handleClear}
                className="app-button app-button-secondary rounded-xl px-5 py-3 text-sm hover:border-red-300 hover:text-red-600 dark:hover:border-red-500/40 dark:hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        </MotionDiv>

        {/* Loading State */}
        <AnimatePresence>
          {isLoading && !result && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="app-card flex flex-col items-center justify-center rounded-2xl p-14"
            >
              <div className="relative mb-6">
                <div className="h-14 w-14 rounded-full bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/20 animate-ping-slow" />
              </div>
              <p className="mb-1.5 text-base font-semibold text-[var(--text-primary)]">
                Processing your URL...
              </p>
              <p className="text-center text-sm text-[var(--text-secondary)]">
                {generateAudio
                  ? "Fetching article, extracting text, summarizing, and generating audio"
                  : "Fetching article, extracting text, and generating summary"}
              </p>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Result Card */}
        <AnimatePresence>
          {result && (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="app-card rounded-2xl p-6"
            >
              {/* Result header */}
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  {resultMethod && (
                    <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${resultMethod.bg} ${resultMethod.color} ${resultMethod.border}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      Summarized with {methodLabel(result.method)}
                    </span>
                  )}
                  <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                    {result.title}
                  </h3>
                  <a
                    href={result.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline animated-underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View original article
                  </a>
                </div>
                <button
                  onClick={() => copyToClipboard(result.summary)}
                  className="app-button app-button-secondary flex h-9 w-9 flex-shrink-0 rounded-lg p-0"
                  title="Copy summary"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Summary box */}
              <div className="mb-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                  Summary
                </p>
                <p className="text-sm leading-relaxed text-[var(--text-primary)]" dir="auto">
                  {result.summary}
                </p>
              </div>

              {/* Audio section */}
              {result.audioUrl && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Audio generated successfully
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <audio controls className="w-full mt-3">
                      <source src={APIService.getAudioUrl(result.audioUrl)} type="audio/mpeg" />
                    </audio>

                    <a
                      href={APIService.getAudioUrl(result.audioUrl)}
                      download="summary_audio.mp3"
                      className="app-button app-button-secondary rounded-xl px-5 py-2.5 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              )}
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default PasteUrl;
