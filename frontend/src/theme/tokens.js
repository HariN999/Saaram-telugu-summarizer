export const THEME_STORAGE_KEY = "saaram-theme";

// Palette: Ochre & Steel Blue (Semantic Theme Values)
const darkThemeTokens = {
  background: "#0B1120",
  surface: "#111827",
  "surface-muted": "#1F2937",
  primary: "#D89B2B", // Ochre brand accent
  secondary: "#4A6FA5", // Steel Blue brand accent
  "text-primary": "#F8FAFC",
  "text-secondary": "#CBD5E1",
  "text-muted": "#94A3B8",
  border: "#334155",
  "focus-ring": "rgba(216, 155, 43, 0.45)",
  "shadow-soft": "0 10px 24px rgba(0, 0, 0, 0.6)",
  "shadow-lift": "0 16px 42px rgba(0, 0, 0, 0.8)",
  "bg-gradient": "radial-gradient(ellipse at 15% 0%, rgba(216, 155, 43, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(74, 111, 165, 0.04) 0%, transparent 50%), #0B1120",
  "card-bg": "rgba(17, 24, 39, 0.65)",
  "btn-primary-text": "#08080c",
};

const lightThemeTokens = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  "surface-muted": "#F1F5F9",
  primary: "#B45309", // Darker Ochre for accessible text contrast (> 4.5:1)
  secondary: "#4A6FA5", // Steel Blue brand accent
  "text-primary": "#0F172A",
  "text-secondary": "#475569",
  "text-muted": "#64748B",
  border: "#E2E8F0",
  "focus-ring": "rgba(216, 155, 43, 0.35)",
  "shadow-soft": "0 4px 16px rgba(15, 23, 42, 0.05)",
  "shadow-lift": "0 10px 32px rgba(15, 23, 42, 0.08)",
  "bg-gradient": "radial-gradient(ellipse at 15% 0%, rgba(216, 155, 43, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(74, 111, 165, 0.03) 0%, transparent 50%), #F8FAFC",
  "card-bg": "rgba(255, 255, 255, 0.75)",
  "btn-primary-text": "#ffffff",
};

export const THEME_TOKENS = {
  light: lightThemeTokens,
  dark: darkThemeTokens,
};

export const resolveSystemTheme = () => {
  return "dark"; // Force dark mode as the default/system theme
};
