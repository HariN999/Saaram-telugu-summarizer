import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Sparkles, Volume2, Copy, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import APIService from "../services/api";
import AudioPlayer from "../components/AudioPlayer";
import SkeletonLoader from "../components/SkeletonLoader";

const MotionDiv = motion.div;

const SAMPLE_URLS = [
  "https://www.bbc.com/telugu/international-53333964",
  "https://www.bbc.com/telugu/international-49333162",
  "https://www.bbc.com/telugu/india-43525042"
];

const SUMMARIZATION_METHODS = [
  {
    id: "auto",
    name: "Auto",
    model: "Adaptive Router",
    description: "Intelligently selects best model"
  },
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

function PasteUrl() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("auto");
  const [copied, setCopied] = useState(false);
  const [generateAudio, setGenerateAudio] = useState(true);



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
        title: "News Article Extract",
        summary: response.summary,
        audioUrl: response.audio_url || null,
        originalUrl: url,
        method: response.executed_method || response.method,
        routingReason: response.routing_reason || "",
        latencySeconds: response.latency_seconds ?? null,
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
    <div className="app-page text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] shadow-lg shadow-[var(--primary)]/25">
            <Link2 className="h-7 w-7 text-[var(--background)]" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] font-display">
            Fetch News from URL
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Paste a Telugu news link to scrape, clean, and summarize the content
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
          <div className="grid gap-3 sm:grid-cols-4">
            {SUMMARIZATION_METHODS.map((method) => {
              const isSelected = selectedMethod === method.id;
              const isAuto = method.id === "auto";
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={isLoading}
                  className={`group flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--text-primary)]"
                      : "border-[var(--border)] bg-[var(--surface-muted)]/30 text-[var(--text-secondary)] hover:border-[var(--primary)]/35 hover:text-[var(--text-primary)] disabled:opacity-40"
                  }`}
                >
                  <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-[var(--primary)]" : "text-[var(--text-primary)]"}`}>
                    {method.name}{isAuto && " ✦"}
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

        {/* URL Input Card */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="app-card mb-6 p-6 rounded-2xl"
        >
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              News Article URL
            </label>
          </div>

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
              placeholder="https://www.bbc.com/telugu/international-53333964..."
              disabled={isLoading}
              className="app-input pr-12 text-sm"
            />
            <Link2 className="absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[var(--text-secondary)]" />
          </div>

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
              disabled={isLoading}
              className="h-4.5 w-4.5 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
          </label>

          <div className="mt-5 flex items-center gap-3 pt-3 border-t border-[var(--border)]/80 justify-end">
            {url && !isLoading && (
              <button
                onClick={handleClear}
                className="app-button app-button-secondary rounded-xl px-5 py-2.5 text-xs"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleFetchNews}
              disabled={isLoading || !url.trim()}
              className="app-button app-button-primary rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Fetch &amp; Summarize
            </button>
          </div>

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

        {/* Loading / Result Panels */}
        <div className="space-y-6">
          <AnimatePresence>
            {isLoading && (
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <SkeletonLoader generateAudio={generateAudio} method={selectedMethod} />
              </MotionDiv>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && !isLoading && (
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-5"
              >
                <div className="app-card p-6 rounded-2xl space-y-4">
                  {/* Result Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {resultMethod && (
                        <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--primary)]">
                          Summarized with {resultMethod.name}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {result.title}
                      </h3>
                      <a
                        href={result.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline hover:opacity-90 font-semibold mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View original source article
                      </a>
                    </div>

                    <button
                      onClick={() => copyToClipboard(result.summary)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      title="Copy Summary"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
                    <p className="text-sm sm:text-base leading-relaxed text-[var(--text-primary)] font-medium" dir="auto">
                      {result.summary}
                    </p>
                  </div>

                  {/* Routing insight (auto mode) */}
                  {result.routingReason && (
                    <div className="rounded-lg border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-3 py-2 text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-bold text-[var(--primary)] uppercase tracking-wider mr-1.5">Router →</span>
                      {result.routingReason}
                    </div>
                  )}

                  {/* Latency */}
                  {result.latencySeconds !== null && result.latencySeconds !== undefined && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      <span>Completed in <strong>{result.latencySeconds.toFixed(2)}s</strong></span>
                    </div>
                  )}
                </div>

                {/* Custom Audio Player */}
                {result.audioUrl && (
                  <AudioPlayer src={APIService.getAudioUrl(result.audioUrl)} headline={result.originalUrl} />
                )}
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

export default PasteUrl;
