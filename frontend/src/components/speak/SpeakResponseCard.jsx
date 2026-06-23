import { motion } from "framer-motion";
import { Loader2, Newspaper } from "lucide-react";

const MotionDiv = motion.div;
const MotionH2 = motion.h2;
const MotionP = motion.p;

function SpeakResponseCard({
  t,
  isLoading,
  newsData,
  currentIndex,
  currentMode,
  selectedMode,
  isPlaying,
  loadingStatus,
}) {
  return (
    <div className="mb-8 min-h-[180px]">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative mb-5">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
            <div className="absolute inset-0 h-10 w-10 animate-ping-slow rounded-full border-2 border-[var(--primary)]/20" />
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {loadingStatus || t.loading}
          </p>
        </div>
      ) : newsData.length > 0 ? (
        <div className="text-center">
          <MotionDiv
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 flex items-center justify-center gap-2"
          >
            <span className="font-mono text-xs font-bold text-[var(--primary)]">
              {currentIndex + 1} / {newsData.length}
            </span>
            <span className="text-[var(--border)]">·</span>
            <span className="text-xs text-[var(--text-muted)] font-semibold">{newsData[currentIndex]?.source}</span>
          </MotionDiv>

          <div className="mb-5 flex justify-center">
            <div className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${currentMode.gradient} px-4 py-1.5 text-xs font-bold text-[var(--background)] shadow-md`}>
              <currentMode.icon className="h-3.5 w-3.5" />
              {currentMode.name}
            </div>
          </div>

          <MotionH2
            key={`headline-${currentIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-xl font-bold text-[var(--text-primary)] sm:text-2xl font-display"
          >
            {newsData[currentIndex]?.headline}
          </MotionH2>

          {selectedMode === "brief" && (
            <MotionP
              key={`brief-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]"
            >
              {newsData[currentIndex]?.brief}
            </MotionP>
          )}

          {selectedMode === "radio" && (
            <MotionDiv
              key={`full-${currentIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm"
            >
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">{newsData[currentIndex]?.fullText}</p>
            </MotionDiv>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
            <Newspaper className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <p className="mb-1 font-bold text-[var(--text-primary)]">{t.noNews}</p>
          <p className="text-sm text-[var(--text-secondary)]">{t.noNewsDesc}</p>
        </div>
      )}

      {isPlaying && (
        <div className="mb-6 mt-6 flex h-8 items-end justify-center gap-1.5">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="wave-bar h-6 w-1.5 rounded-full bg-gradient-to-t from-[var(--primary)] to-[var(--secondary)]" />
          ))}
        </div>
      )}
    </div>
  );
}

export default SpeakResponseCard;
