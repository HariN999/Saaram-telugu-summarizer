import { useEffect, useMemo, useState } from "react";
import { THEME_STORAGE_KEY, THEME_TOKENS, resolveSystemTheme } from "../theme/tokens";
import ThemeContext from "./themeContextValue";

const isTheme = (value) => value === "light" || value === "dark";

const applyThemeTokens = (theme) => {
  const root = document.documentElement;
  const tokens = THEME_TOKENS[theme];

  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(`--${token}`, value);
  });

  // Compatibility aliases to avoid breaking existing classes.
  root.style.setProperty("--bg-primary", "var(--background)");
  root.style.setProperty("--bg-secondary", "var(--surface-muted)");
  root.style.setProperty("--accent-primary", "var(--primary)");
  root.style.setProperty("--accent-secondary", "var(--secondary)");
  root.style.setProperty("--border-color", "var(--border)");
  root.style.setProperty("--card-bg", tokens["card-bg"] || "var(--surface)");
  root.style.setProperty("--card-border", "var(--border)");
  root.style.setProperty("--shadow-card", "var(--shadow-soft)");

  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
};

export function ThemeProvider({ children }) {
  const [themeState, setThemeState] = useState(() => {
    const savedTheme =
      localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem("theme");

    if (isTheme(savedTheme)) {
      return { theme: savedTheme, followsSystem: false };
    }

    return { theme: resolveSystemTheme(), followsSystem: true };
  });

  useEffect(() => {
    applyThemeTokens(themeState.theme);
  }, [themeState.theme]);

  useEffect(() => {
    if (themeState.followsSystem) {
      localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }
    localStorage.setItem(THEME_STORAGE_KEY, themeState.theme);
  }, [themeState]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (event) => {
      setThemeState((prev) => {
        if (!prev.followsSystem) {
          return prev;
        }
        return { ...prev, theme: event.matches ? "dark" : "light" };
      });
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => ({
      theme: prev.theme === "light" ? "dark" : "light",
      followsSystem: false,
    }));
  };

  const resetToSystemTheme = () => {
    setThemeState({
      theme: resolveSystemTheme(),
      followsSystem: true,
    });
  };

  const value = useMemo(
    () => ({
      theme: themeState.theme,
      isSystemTheme: themeState.followsSystem,
      toggleTheme,
      resetToSystemTheme,
    }),
    [themeState],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
