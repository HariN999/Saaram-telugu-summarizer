function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-muted)] transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h3 className="mb-2 text-center text-xl font-bold tracking-tight text-[var(--text-primary)] font-display">
          Saaram
        </h3>

        <p className="mx-auto mb-6 max-w-2xl text-center text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
          The essence of Telugu news, instantly summarized and spoken. Transform complex articles
          into key audio bulletins powered by transformer-based abstractive AI.
        </p>

        <div className="my-6 h-px bg-[var(--border)]" />

        <h4 className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
          Project Team
        </h4>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[var(--text-secondary)]">
          <span className="transition-colors hover:text-[var(--primary)]">
            Hariharan Narlakanti
          </span>
          <span className="transition-colors hover:text-[var(--primary)]">
            Vivek Nidumolu
          </span>
          <span className="transition-colors hover:text-[var(--primary)]">
            Vishnu Vardhan Reddy Padala
          </span>
          <span className="transition-colors hover:text-[var(--primary)]">
            Sanjeev Practur
          </span>
        </div>

        <div className="my-6 h-px bg-[var(--border)]" />

        <p className="text-center text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} Saaram · Engineered for low-resource Telugu NLP.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
