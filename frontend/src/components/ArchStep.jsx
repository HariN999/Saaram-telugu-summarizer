import { motion } from "framer-motion";
import { Search, Filter, Brain, Volume2, Brush, ChevronRight, ChevronDown } from "lucide-react";

const MotionDiv = motion.div;

const ICONS = {
  search: Search,
  broom: Brush,
  filter: Filter,
  brain: Brain,
  "volume-up": Volume2,
};

const STEP_COLORS = {
  "01": { dot: "bg-[var(--secondary)]", text: "text-[var(--secondary)]", bg: "bg-[var(--secondary)]/10", border: "border-[var(--secondary)]/20" },
  "02": { dot: "bg-[var(--secondary)]", text: "text-[var(--secondary)]", bg: "bg-[var(--secondary)]/10", border: "border-[var(--secondary)]/20" },
  "03": { dot: "bg-[var(--primary)]", text: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10", border: "border-[var(--primary)]/20" },
  "04": { dot: "bg-[var(--primary)]", text: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10", border: "border-[var(--primary)]/20" },
  "05": { dot: "bg-[var(--secondary)]", text: "text-[var(--secondary)]", bg: "bg-[var(--secondary)]/10", border: "border-[var(--secondary)]/20" },
};

function ArchStep({ step, icon, title, desc, sectionId, connectorDirection = "none", isConnectorDashed = false, isOptional = false }) {
  const Icon = ICONS[icon];
  const colors = STEP_COLORS[step] || STEP_COLORS["01"];
  const isEngine = step === "03" || step === "04";

  return (
    <MotionDiv
      id={sectionId}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className={`group relative flex flex-col items-center text-center rounded-3xl border border-[var(--border)] bg-[var(--surface)]/65 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-[var(--primary)]/35 h-full min-h-[270px] lg:min-h-[290px]
        ${isEngine 
          ? "hover:-translate-y-3 hover:shadow-[0_0_30px_rgba(216,155,43,0.15)]" 
          : "hover:-translate-y-2 hover:shadow-2xl"
        }`}
    >
      {/* Top row with step number, icon, and optional/engine badge */}
      <div className="w-full flex items-center justify-between mb-5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)]/40 shadow-inner group-hover:border-[var(--primary)]/30 group-hover:bg-[var(--primary)]/5 transition-all duration-300">
          <span className={`font-mono text-xl font-black ${colors.text}`}>{step}</span>
          {Icon && (
            <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg border ${colors.border} ${colors.bg} shadow-md`}>
              <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
            </div>
          )}
        </div>

        {isEngine && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] border border-[var(--primary)]/20 px-2.5 py-1 rounded-full bg-[var(--primary)]/5 shadow-sm">
            {step === "03" ? "Extractive Engine" : "Abstractive Engine"}
          </span>
        )}

        {isOptional && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border border-[var(--border)] px-2.5 py-1 rounded-full bg-[var(--surface-muted)]/50 shadow-sm">
            Optional Stage
          </span>
        )}
      </div>

      {/* Text Content */}
      <div className="flex flex-col items-center flex-1">
        <h4 className={`mb-2 tracking-tight text-[var(--text-primary)] font-display transition-colors group-hover:text-[var(--primary)]
          ${isEngine ? "text-xl font-black" : "text-lg font-bold"}`}>
          {title}
        </h4>
        <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
          {desc}
        </p>
      </div>

      {/* Floating visual connector line/arrow (Horizontal right connector) */}
      {(connectorDirection === "right" || connectorDirection === "both") && (
        <svg 
          className="absolute left-full top-1/2 -translate-y-1/2 w-8 h-4 hidden lg:block text-[var(--border)] group-hover:text-[var(--primary)]/60 transition-colors pointer-events-none z-20" 
          fill="none" 
          viewBox="0 0 32 16"
        >
          <path 
            d="M0 8h28" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray={isConnectorDashed ? "4 4" : "none"} 
          />
          <path 
            d="M24 4l4 4-4 4" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      )}

      {/* Floating visual connector line/arrow (Vertical down connector) */}
      {(connectorDirection === "down" || connectorDirection === "both") && (
        <svg 
          className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-8 hidden lg:block text-[var(--border)] group-hover:text-[var(--primary)]/60 transition-colors pointer-events-none z-20" 
          fill="none" 
          viewBox="0 0 16 32"
        >
          <path 
            d="M8 0v28" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray={isConnectorDashed ? "4 4" : "none"} 
          />
          <path 
            d="M4 24l4 4 4-4" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      )}

      {/* Mobile-only visual connector (Vertical down connector for mobile layout) */}
      {connectorDirection !== "none" && (
        <svg 
          className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-8 flex lg:hidden text-[var(--border)] group-hover:text-[var(--primary)]/60 transition-colors pointer-events-none z-20" 
          fill="none" 
          viewBox="0 0 16 32"
        >
          <path 
            d="M8 0v28" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray={isConnectorDashed ? "4 4" : "none"}
          />
          <path 
            d="M4 24l4 4 4-4" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      )}

      {/* Hover top accent line */}
      <div className={`absolute left-8 right-8 top-0 h-0.5 rounded-full ${colors.dot} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </MotionDiv>
  );
}

export default ArchStep;
