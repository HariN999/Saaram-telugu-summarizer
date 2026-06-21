import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, FileText, Link2, ArrowRight, Radio } from "lucide-react";
import ArchStep from "../components/ArchStep";

const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionP = motion.p;

function HeroIllustration() {
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none">
      {/* Decorative ambient glows */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[280px] w-[280px] rounded-full bg-gradient-to-tr from-[var(--primary)]/10 to-[var(--secondary)]/15 blur-[60px] animate-pulse" />
      </div>

      {/* Floating Document Card (Input) */}
      <MotionDiv
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-8 left-4 z-20 w-[220px] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-4 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-[var(--secondary)] animate-ping" />
          <div className="h-1.5 w-16 rounded bg-[var(--text-muted)]/20" />
        </div>
        <div className="space-y-2">
          {/* Mock Telugu text lines */}
          <div className="h-3 w-5/6 rounded bg-[var(--text-muted)]/30" />
          <div className="h-2 w-full rounded bg-[var(--text-muted)]/15" />
          <div className="h-2 w-full rounded bg-[var(--text-muted)]/15" />
          <div className="h-2 w-4/5 rounded bg-[var(--text-muted)]/15" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="h-1.5 w-12 rounded bg-[var(--text-muted)]/20" />
          <span className="text-[10px] font-mono text-[var(--secondary)] font-bold">ARTICLE INPUT</span>
        </div>
      </MotionDiv>

      {/* Pulsing Connector Flow */}
      <div className="absolute top-1/2 left-[45%] -translate-y-1/2 z-10 w-24 h-12 hidden lg:block">
        <svg className="w-full h-full text-[var(--primary)]/25" fill="none" viewBox="0 0 100 50">
          <path
            d="M0,25 C30,25 70,25 100,25"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeDashoffset="0"
            className="animate-[dash_8s_linear_infinite]"
          />
        </svg>
      </div>

      {/* Floating Summary & Speech Card */}
      <MotionDiv
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-6 right-4 z-20 w-[240px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-3.5 border-b border-[var(--border)] pb-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--primary)]">mT5 Radio AI Summary</span>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Bullet points summaries */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--primary)] font-bold">·</span>
            <div className="h-2 w-full rounded bg-[var(--text-primary)]/10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--primary)] font-bold">·</span>
            <div className="h-2 w-11/12 rounded bg-[var(--text-primary)]/10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--primary)] font-bold">·</span>
            <div className="h-2 w-5/6 rounded bg-[var(--text-primary)]/10" />
          </div>
        </div>

        {/* Mock Waveform Audio Player */}
        <div className="rounded-xl bg-[var(--surface-muted)] p-2.5 flex items-center gap-3 border border-[var(--border)] shadow-inner">
          <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--background)] shadow-md shadow-[var(--primary)]/20">
            <svg className="h-4.5 w-4.5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex-1 flex items-end gap-0.5 h-6">
            {/* Animating Waveform bars */}
            {[8, 14, 18, 12, 16, 20, 14, 10, 16, 12].map((height, i) => (
              <MotionDiv
                key={i}
                animate={{ height: [height * 0.4, height, height * 0.4] }}
                transition={{ duration: 1.2 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 rounded-full bg-[var(--primary)]/60 origin-bottom"
                style={{ height }}
              />
            ))}
          </div>
        </div>
      </MotionDiv>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Background Grid Overlay */}
      <div className="home-hero-bg absolute inset-0" />
      <div className="noise-overlay" />
      <div className="home-grid-overlay absolute inset-0" />

      {/* Decorative ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <MotionDiv
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-48 top-12 h-[500px] w-[500px] rounded-full bg-[var(--secondary)]/10 blur-[100px]"
        />
        <MotionDiv
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -right-48 bottom-12 h-[500px] w-[500px] rounded-full bg-[var(--primary)]/5 blur-[120px]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-32">
        {/* Hero Header Section with Staggered Entrance Animations (<600ms) */}
        <div className="grid gap-12 lg:grid-cols-12 items-center mb-28 text-center lg:text-left">
          {/* Left Column: Title, Tagline & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="home-pill-badge mb-6 inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Powered by mT5 + Speech AI</span>
            </MotionDiv>

            <MotionH1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
              className="mb-2 font-display"
            >
              <span className="block text-6xl font-black leading-none tracking-tight text-[var(--text-primary)] sm:text-7xl md:text-8xl">
                Saaram
              </span>
            </MotionH1>

            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.10, ease: "easeOut" }}
              className="mt-4 mb-3 font-display"
            >
              <span className="block text-2xl font-extrabold tracking-tight text-[var(--primary)] sm:text-3xl md:text-4xl">
                Telugu News, Summarized &amp; Spoken.
              </span>
            </MotionDiv>

            <MotionP
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15, ease: "easeOut" }}
              className="mx-auto lg:mx-0 mb-8 max-w-2xl text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]"
            >
              The essence of Telugu news articles, instantly transformed into concise, readable summaries and natural voice bulletins.
            </MotionP>

            {/* Call-to-Actions (Staggered load @ 0.20s) */}
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.20, ease: "easeOut" }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
            >
              <Link
                to="/summarize"
                className="app-button app-button-primary rounded-xl px-7 py-3 text-sm font-bold uppercase tracking-wider shadow-lg"
              >
                Get Started
              </Link>
              <button
                onClick={() => {
                  document.getElementById("capabilities")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="app-button app-button-secondary rounded-xl px-7 py-3 text-sm font-bold uppercase tracking-wider"
              >
                See How It Works
              </button>
            </MotionDiv>
          </div>

          {/* Right Column: Hero Illustration Animation */}
          <div className="lg:col-span-5 hidden lg:block relative h-[380px] w-full">
            <HeroIllustration />
          </div>
        </div>

        {/* Scroll Target for Secondary Button */}
        <div id="capabilities" className="scroll-mt-24" />

        {/* Feature Cards Grid (Staggered CTA Cards, fully loaded in ~550ms) */}
        <div className="grid gap-6 sm:grid-cols-3 mb-16">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.25, ease: "easeOut" }}
            className="app-card flex flex-col p-6 h-full border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20">
              <FileText className="h-5 w-5 text-[var(--secondary)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Text Summarizer</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6 flex-1">
              Summarize Telugu text into concise key insights.
            </p>
            <Link
              to="/summarize"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] hover:opacity-80 transition-opacity mt-auto group"
            >
              Summarize Text
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.29, ease: "easeOut" }}
            className="app-card flex flex-col p-6 h-full border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20">
              <Link2 className="h-5 w-5 text-[var(--secondary)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">URL News Fetcher</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6 flex-1">
              Extract and summarize Telugu news articles instantly.
            </p>
            <Link
              to="/url"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] hover:opacity-80 transition-opacity mt-auto group"
            >
              Extract Article
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.33, ease: "easeOut" }}
            className="app-card flex flex-col p-6 h-full border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
              <Radio className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Saaram Radio</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6 flex-1">
              Listen to AI-generated Telugu radio bulletins.
            </p>
            <Link
              to="/speak"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)] hover:opacity-80 transition-opacity mt-auto group"
            >
              Listen to Radio
              <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </MotionDiv>
        </div>

        {/* NLP Engine Pipeline section */}
        <section className="mb-16">
          <div className="mb-5 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--primary)]">
              Architecture Overview
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl font-display">
              NLP Engine Pipeline
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              How raw Telugu news is parsed, normalized, summarized, and synthesized in five distinct processing phases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <ArchStep
              step="01"
              icon="search"
              title="Content Extraction"
              desc="Safely extracts clean article text from Telugu news sources."
              connectorDirection="right"
            />
            <ArchStep
              step="02"
              icon="broom"
              title="Telugu Normalization"
              desc="Cleans Unicode noise and removes boilerplate content."
              connectorDirection="both"
            />
            <ArchStep
              step="03"
              icon="filter"
              title="Extractive Weights (TF-IDF)"
              desc="Fast extractive summarization using keyword importance."
              connectorDirection="down"
              isConnectorDashed={true}
            />

            {/* Empty space in Row 2 Col 1 to align steps 04 and 05 directly below 02 and 03 */}
            <div className="hidden md:block" />

            <ArchStep
              step="04"
              icon="brain"
              title="Abstractive mT5 Model"
              desc="Generates fluent abstractive Telugu summaries."
              connectorDirection="right"
              isConnectorDashed={true}
            />
            <ArchStep
              step="05"
              icon="volume-up"
              title="Edge Speech Synthesis (TTS)"
              desc="Converts summaries into natural Telugu voice bulletins."
              connectorDirection="none"
              isOptional={true}
            />
          </div>
        </section>


      </div>
    </div>
  );
}

export default HeroSection;
