import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Languages, Mic, MicOff } from "lucide-react";
import SpeakControls from "../components/speak/SpeakControls";
import SpeakResponseCard from "../components/speak/SpeakResponseCard";
import { MODES, TRANSLATIONS, VOICE_COMMANDS } from "../constants/speakConstants";
import useAudioPlayback from "../hooks/useAudioPlayback";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { fetchLatestNews } from "../services/speakService";

// Refactor boundary: UI/behavior preserved; logic split into hooks/services/components for maintainability.
const MotionDiv = motion.div;
const MotionButton = motion.button;
const NEWS_LANGUAGE = "te";

const commandMatches = (dictionary, transcript) =>
  dictionary.some((command) => transcript.includes(command));

const getModeAudioUrl = (newsItem, mode) => {
  switch (mode) {
    case "top-news":
      return newsItem.topNewsAudioUrl ?? null;
    case "brief":
      return newsItem.briefAudioUrl ?? newsItem.audioUrl ?? null;
    case "radio":
      return newsItem.radioAudioUrl ?? null;
    default:
      return null;
  }
};

function Speak() {
  const [uiLanguage, setUiLanguage] = useState("en");
  const [selectedMode, setSelectedMode] = useState("radio");
  const [isLoading, setIsLoading] = useState(false);
  const [newsData, setNewsData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [showVoiceIndicator, setShowVoiceIndicator] = useState(false);

  const playbackEnabledRef = useRef(false);
  const loadingTimersRef = useRef([]);

  const t = TRANSLATIONS[uiLanguage];
  const currentModes = MODES[uiLanguage];
  const currentMode = useMemo(
    () => currentModes.find((mode) => mode.id === selectedMode) ?? currentModes[0],
    [currentModes, selectedMode],
  );

  const {
    isPlaying,
    isMuted,
    setIsPlaying,
    playUrl,
    stop,
    toggleMute,
  } = useAudioPlayback({
    language: NEWS_LANGUAGE === "te" ? "te-IN" : "en-US",
    defaultRate: 0.9,
  });

  const clearLoadingTimers = useCallback(() => {
    loadingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    loadingTimersRef.current = [];
  }, []);

  const speakNews = useCallback(
    (index) => {
      if (index >= newsData.length) {
        playbackEnabledRef.current = false;
        setIsPlaying(false);
        setCurrentIndex(0);
        return;
      }

      const newsItem = newsData[index];
      const modeAudioUrl = getModeAudioUrl(newsItem, selectedMode);
      const handleEnd = () => {
        const nextIndex = index + 1;
        if (playbackEnabledRef.current && nextIndex < newsData.length) {
          setTimeout(() => {
            setCurrentIndex(nextIndex);
            speakNews(nextIndex);
          }, 1000);
        } else {
          playbackEnabledRef.current = false;
          setCurrentIndex(0);
        }
      };

      const handleError = () => {
        playbackEnabledRef.current = false;
        setIsPlaying(false);
        setError("Edge Telugu audio playback failed. Please refresh the bulletin and try again.");
      };

      if (modeAudioUrl) {
        playUrl({
          url: modeAudioUrl,
          onEnd: handleEnd,
          onError: handleError,
        });
        return;
      }

      // Free-tier optimization: Graceful text-only display when audio unavailable
      // Instead of error, allow viewing text summaries without audio
      playbackEnabledRef.current = false;
      setIsPlaying(false);
      setLoadingStatus("Audio unavailable, showing text-only bulletin (free-tier)");
      // Don't set error - just show status and continue to next item
      setTimeout(() => {
        const nextIndex = index + 1;
        if (playbackEnabledRef.current && nextIndex < newsData.length) {
          speakNews(nextIndex);
        }
      }, 2000);
    },
    [newsData, playUrl, selectedMode, setIsPlaying, setLoadingStatus],
  );

  const handleFetchNews = useCallback(async () => {
    clearLoadingTimers();
    setIsLoading(true);
    setError(null);
    setLoadingStatus("Fetching Telugu news...");
    loadingTimersRef.current = [
      window.setTimeout(() => setLoadingStatus("Generating summaries..."), 5000),
      window.setTimeout(() => setLoadingStatus("Generating Telugu radio audio..."), 15000),
      window.setTimeout(() => setLoadingStatus("Preparing playback..."), 35000),
    ];

    try {
      const news = await fetchLatestNews(true);
      setNewsData(news);
      setCurrentIndex(0);
      setLoadingStatus("Ready to play");
    } catch {
      setError("Failed to prepare Edge Telugu audio. Please refresh and try again.");
      setNewsData([]);
    } finally {
      clearLoadingTimers();
      setIsLoading(false);
      setLoadingStatus("");
    }
  }, [clearLoadingTimers]);

  const togglePlayback = useCallback(() => {
    if (newsData.length === 0) {
      handleFetchNews();
      return;
    }

    if (isPlaying) {
      playbackEnabledRef.current = false;
      stop();
      return;
    }

    playbackEnabledRef.current = true;
    speakNews(currentIndex);
  }, [currentIndex, handleFetchNews, isPlaying, newsData.length, speakNews, stop]);

  const skipToNext = useCallback(() => {
    if (newsData.length === 0) return;
    const nextIndex = (currentIndex + 1) % newsData.length;
    setCurrentIndex(nextIndex);

    if (isPlaying) {
      playbackEnabledRef.current = true;
      stop();
      speakNews(nextIndex);
    }
  }, [currentIndex, isPlaying, newsData.length, speakNews, stop]);

  const skipToPrevious = useCallback(() => {
    if (newsData.length === 0) return;
    const prevIndex = currentIndex === 0 ? newsData.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);

    if (isPlaying) {
      playbackEnabledRef.current = true;
      stop();
      speakNews(prevIndex);
    }
  }, [currentIndex, isPlaying, newsData.length, speakNews, stop]);

  const refreshNews = useCallback(() => {
    playbackEnabledRef.current = false;
    stop();
    setCurrentIndex(0);
    handleFetchNews();
  }, [handleFetchNews, stop]);

  const handleVoiceCommand = useCallback(
    (transcript) => {
      const lowerTranscript = transcript.toLowerCase();

      const triggerIndicator = () => {
        setShowVoiceIndicator(true);
        setTimeout(() => setShowVoiceIndicator(false), 2000);
      };

      if (commandMatches(VOICE_COMMANDS.START, lowerTranscript)) {
        triggerIndicator();
        if (newsData.length === 0) {
          handleFetchNews();
        } else if (!isPlaying) {
          togglePlayback();
        }
      }

      if (commandMatches(VOICE_COMMANDS.STOP, lowerTranscript)) {
        triggerIndicator();
        if (isPlaying) {
          togglePlayback();
        }
      }

      if (commandMatches(VOICE_COMMANDS.NEXT, lowerTranscript)) {
        triggerIndicator();
        skipToNext();
      }

      if (commandMatches(VOICE_COMMANDS.PREVIOUS, lowerTranscript)) {
        triggerIndicator();
        skipToPrevious();
      }
    },
    [handleFetchNews, isPlaying, newsData.length, skipToNext, skipToPrevious, togglePlayback],
  );

  const { isListening, isSupported, toggle: toggleVoiceListening } = useSpeechRecognition({
    language: NEWS_LANGUAGE === "te" ? "te-IN" : "en-US",
    onTranscript: handleVoiceCommand,
  });

  useEffect(() => {
    playbackEnabledRef.current = false;
    stop();
    setCurrentIndex(0);
  }, [selectedMode, stop]);

  useEffect(() => clearLoadingTimers, [clearLoadingTimers]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <MotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"
        >
          <div>
            <h1 className="mb-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{t.title}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{t.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <Languages className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-secondary)]" />
              <div className="flex gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
                {["en", "te"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setUiLanguage(lang)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                      uiLanguage === lang
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                        : "text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
                    }`}
                  >
                    {lang === "en" ? "English UI" : "తెలుగు UI"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MotionDiv>

        <AnimatePresence>
          {showVoiceIndicator && (
            <MotionDiv
              initial={{ opacity: 0, scale: 0.85, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -16 }}
              className="fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-emerald-500/40"
            >
              <MotionDiv
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="h-2 w-2 rounded-full bg-white"
              />
              {t.commandRecognized}
            </MotionDiv>
          )}
        </AnimatePresence>

        <MotionDiv
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex justify-center"
        >
          <MotionButton
            whileHover={{ scale: isSupported ? 1.04 : 1 }}
            whileTap={{ scale: isSupported ? 0.96 : 1 }}
            onClick={toggleVoiceListening}
            disabled={!isSupported}
            className={`relative flex items-center gap-3 rounded-full px-7 py-3.5 text-sm font-semibold transition-all shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
              isListening
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/30"
                : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-indigo-500/30"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4.5 w-4.5" />
                <span>{t.voiceCommandsOff}</span>
                <MotionDiv
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-400"
                />
              </>
            ) : (
              <>
                <Mic className="h-4.5 w-4.5" />
                <span>{t.voiceCommandsOn}</span>
              </>
            )}
          </MotionButton>
        </MotionDiv>

        <AnimatePresence>
          {isListening && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5"
            >
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {t.voiceCommandsTitle}
              </h4>
              <div className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2 lg:grid-cols-3">
                <div>📢 {t.commands.start}</div>
                <div>⏸️ {t.commands.stop}</div>
                <div>⏭️ {t.commands.next}</div>
                <div>⏮️ {t.commands.previous}</div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            {t.chooseMode}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {currentModes.map((mode, index) => {
              const isSelected = selectedMode === mode.id;
              return (
                <MotionButton
                  key={mode.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.07 }}
                  onClick={() => setSelectedMode(mode.id)}
                  disabled={isPlaying}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? `scale-[1.02] border-transparent bg-gradient-to-br ${mode.gradient} shadow-xl`
                      : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-indigo-300 dark:hover:border-indigo-500/40"
                  }`}
                >
                  <div className="relative z-10">
                    <mode.icon className={`mb-3 h-6 w-6 ${isSelected ? "text-white" : "text-indigo-500"}`} />
                    <h4
                      className={`mb-1 text-sm font-bold ${
                        isSelected ? "text-white" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {mode.name}
                    </h4>
                    <p
                      className={`text-xs leading-relaxed ${
                        isSelected ? "text-white/80" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {mode.description}
                    </p>
                  </div>

                  {isSelected && (
                    <MotionDiv
                      layoutId="mode-selector"
                      className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/30"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </MotionDiv>
                  )}
                </MotionButton>
              );
            })}
          </div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="glass-card mb-6 rounded-3xl p-6 sm:p-8"
        >
          {error && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              {error}
            </MotionDiv>
          )}

          <SpeakResponseCard
            t={t}
            isLoading={isLoading}
            newsData={newsData}
            currentIndex={currentIndex}
            currentMode={currentMode}
            selectedMode={selectedMode}
            isPlaying={isPlaying}
            loadingStatus={loadingStatus}
          />

          <SpeakControls
            isLoading={isLoading}
            newsData={newsData}
            isPlaying={isPlaying}
            isMuted={isMuted}
            onPrev={skipToPrevious}
            onRefresh={refreshNews}
            onTogglePlayback={togglePlayback}
            onNext={skipToNext}
            onToggleMute={toggleMute}
          />

          <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
            {isPlaying
              ? `${currentMode.name} ${t.playStatus}`
              : newsData.length > 0
                ? t.playPrompt
                : t.fetchPrompt}
          </p>
        </MotionDiv>

        {newsData.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
              {t.loadedNews}
            </h3>
            <div className="space-y-2">
              {newsData.map((item, index) => (
                <MotionDiv
                  key={`${item.source}-${index}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 sm:p-5 ${
                    currentIndex === index
                      ? "border-indigo-300 bg-indigo-50 shadow-md shadow-indigo-500/10 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                      : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-indigo-200 dark:hover:border-indigo-500/20"
                  }`}
                  onClick={() => {
                    setCurrentIndex(index);
                    if (isPlaying) {
                      playbackEnabledRef.current = true;
                      stop();
                      speakNews(index);
                    }
                  }}
                >
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          #{index + 1}
                        </span>
                        <span className="text-[var(--border-color)]">·</span>
                        <span className="truncate text-xs text-[var(--text-secondary)]">{item.source}</span>
                      </div>
                      <h4
                        className={`text-sm font-semibold transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400 ${
                          currentIndex === index
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {item.headline}
                      </h4>
                      {selectedMode === "brief" && (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {item.brief}
                        </p>
                      )}
                    </div>

                    {currentIndex === index && isPlaying && (
                      <div className="flex h-5 flex-shrink-0 items-end gap-0.5">
                        {[0, 1, 2, 3].map((barIndex) => (
                          <MotionDiv
                            key={barIndex}
                            animate={{ scaleY: [0.4, 1, 0.4] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: barIndex * 0.15 }}
                            className="origin-bottom h-full w-1 rounded-full bg-indigo-500"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </MotionDiv>
              ))}
            </div>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}

export default Speak;
