import { motion } from "framer-motion";
import { Cpu, Layers, HardDrive, Volume2, HelpCircle } from "lucide-react";
import ArchStep from "../components/ArchStep";

const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionP = motion.p;

function HowItWorks() {
  return (
    <div className="relative min-h-screen bg-[var(--background)] py-12 pt-28 overflow-hidden transition-colors duration-300">
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

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {/* Header Section */}
        <div className="mb-16 text-center">
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="home-pill-badge mb-6 inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wider"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>System Architecture</span>
          </MotionDiv>

          <MotionH1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
            className="mb-4 font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[var(--text-primary)]"
          >
            How Saaram Works
          </MotionH1>

          <MotionP
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]"
          >
            Explore the 5-stage natural language processing and voice synthesis pipeline that transforms Telugu articles into concise audio bulletins.
          </MotionP>
        </div>

        {/* 3+2 Step-Pipeline Section */}
        <section className="mb-20">
          <div className="space-y-8">
            {/* Row 1: Steps 01, 02, 03 */}
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
                connectorDirection="right"
              />
              <ArchStep
                step="03"
                icon="filter"
                title="Extractive Weights (TF-IDF)"
                desc="Fast extractive summarization using keyword importance."
                connectorDirection="down"
              />
            </div>

            {/* Row 2: Steps 04, 05 centered */}
            <div className="flex flex-col md:flex-row justify-center gap-8 relative">
              <div className="w-full md:w-[calc(33.333%-1.333rem)]">
                <ArchStep
                  step="04"
                  icon="brain"
                  title="Abstractive mT5 Model"
                  desc="Generates fluent abstractive Telugu summaries."
                  connectorDirection="right"
                />
              </div>
              <div className="w-full md:w-[calc(33.333%-1.333rem)]">
                <ArchStep
                  step="05"
                  icon="volume-up"
                  title="Edge Speech Synthesis (TTS)"
                  desc="Converts summaries into natural Telugu voice bulletins."
                  connectorDirection="none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Stats Strip */}
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          <div className="app-card p-6 border border-[var(--border)] bg-[var(--surface)] flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">mT5 + TF-IDF Hybrid</h4>
              <p className="text-xs text-[var(--text-secondary)]">Dual NLP Model Engine</p>
            </div>
          </div>

          <div className="app-card p-6 border border-[var(--border)] bg-[var(--surface)] flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">5-Stage Pipeline</h4>
              <p className="text-xs text-[var(--text-secondary)]">SSRF Safe Crawler</p>
            </div>
          </div>

          <div className="app-card p-6 border border-[var(--border)] bg-[var(--surface)] flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">FastAPI Backend</h4>
              <p className="text-xs text-[var(--text-secondary)]">LRU Bounded Cache</p>
            </div>
          </div>

          <div className="app-card p-6 border border-[var(--border)] bg-[var(--surface)] flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              <Volume2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Edge TTS Audio</h4>
              <p className="text-xs text-[var(--text-secondary)]">Natural Speech Synthesis</p>
            </div>
          </div>
        </MotionDiv>

        {/* Detailed Description Section */}
        <div className="grid gap-8 md:grid-cols-3">
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="app-card p-8 border border-[var(--border)] bg-[var(--surface)]/45 backdrop-blur-sm shadow-md"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 font-display">
              Extractive Fallback (TF-IDF)
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Analyzes the frequency and importance of terms inside crawled news articles. It filters out boilerplate noise and extracts the most relevant sentences directly from the source material, providing a fast and highly robust extractive summary.
            </p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="app-card p-8 border border-[var(--border)] bg-[var(--surface)]/45 backdrop-blur-sm shadow-md"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 font-display">
              Abstractive mT5 Model
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Utilizes Google's massively multilingual sequence-to-sequence model (mT5) fine-tuned on custom Telugu summaries. It parses deep contextual semantic structures to write natural, coherent, and fluent summaries rather than just concatenating source sentences.
            </p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="app-card p-8 border border-[var(--border)] bg-[var(--surface)]/45 backdrop-blur-sm shadow-md"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 font-display">
              Neural Audio Synthesis (TTS)
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Feeds processed abstractive text into high-fidelity neural text-to-speech models optimized for Telugu phonemes and cadence. The speech bulletins are generated in real-time, cached in backend storage, and streamed with pristine audio quality.
            </p>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;
