import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";

function SkeletonLoader({ generateAudio = false, method = "tfidf" }) {
  const [currentStep, setCurrentStep] = useState(0);

  const isModelMode = method.startsWith("mt5");

  const steps = [
    { label: "Acquiring source text", duration: 1000 },
    { label: "Running normalization and cleaning", duration: 1500 },
    isModelMode 
      ? { label: "Initializing mT5 transformer model", duration: 3500 }
      : { label: "Calculating lexical weights", duration: 1200 },
    { label: "Synthesizing abstractive summary text", duration: 2500 },
    ...(generateAudio ? [{ label: "Generating Telugu neural voice playback", duration: 3000 }] : []),
  ];

  useEffect(() => {
    setCurrentStep(0);
    let timerSum = 0;
    const timers = [];

    steps.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, timerSum);
      timers.push(timer);
      timerSum += step.duration;
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [generateAudio, method]);

  return (
    <div className="w-full space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
      {/* Top title */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--primary)] animate-spin" style={{ animationDuration: '4s' }} />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
          Saaram NLP Engine Active
        </span>
      </div>

      {/* Progress pipeline steps */}
      <div className="space-y-3.5">
        {steps.map((step, index) => {
          const isCompleted = currentStep > index;
          const isActive = currentStep === index;
          const isPending = currentStep < index;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 transition-colors duration-300 ${
                isActive ? "text-[var(--text-primary)]" : isCompleted ? "text-[var(--primary)]/80" : "text-[var(--text-secondary)]/40"
              }`}
            >
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-[var(--primary)]" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <span className={`text-xs sm:text-sm font-medium ${isActive ? "font-semibold" : ""}`}>
                {step.label}
                {isActive && isModelMode && index === 2 && (
                  <span className="block text-[10px] text-[var(--primary)]/70 font-normal mt-0.5 animate-pulse">
                    (Lazy loading checkpoint model; this may take up to 10 seconds)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pulse placeholder cards to simulate visual summary card output */}
      <div className="pt-4 border-t border-[var(--border)] space-y-2.5 animate-pulse">
        <div className="h-3 w-1/3 rounded bg-[var(--border)]/60" />
        <div className="h-4.5 w-full rounded bg-[var(--border)]/60" />
        <div className="h-4.5 w-5/6 rounded bg-[var(--border)]/60" />
        <div className="h-4.5 w-4/6 rounded bg-[var(--border)]/60" />
      </div>
    </div>
  );
}

export default SkeletonLoader;
