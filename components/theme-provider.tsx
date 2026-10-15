"use client";

import React, { createContext, useContext, useSyncExternalStore, useCallback } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (_theme: Theme) => void;
  toggleTheme: () => void;
}

/*
 * Light/dark theme. An inline script in app/layout.tsx sets the theme before first paint (no
 * flash); this module takes over on the client. The theme lives in a module-level store read with
 * useSyncExternalStore, so every component agrees on it and the server always renders "dark".
 * Precedence: saved choice, then the attribute the inline script set, then the system setting.
 */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "nadi_gati_theme";

// Source of truth, so the theme still works when localStorage is blocked
let currentTheme: Theme = "dark";
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      // Ignored
    }
  });
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  // Only swap the theme classes: replacing the whole class list would remove anything else set
  // on <html>, such as font variables
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  root.style.colorScheme = theme;
}

function initTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") {
      currentTheme = saved;
      applyThemeToDOM(saved);
      return saved;
    }
    const htmlTheme = document.documentElement.getAttribute("data-theme") as Theme | null;
    if (htmlTheme === "light" || htmlTheme === "dark") {
      currentTheme = htmlTheme;
      applyThemeToDOM(htmlTheme);
      return htmlTheme;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = prefersDark ? "dark" : "light";
    currentTheme = initial;
    applyThemeToDOM(initial);
    return initial;
  } catch {
    return currentTheme;
  }
}

// Read the theme as soon as the module loads, before any component renders
if (typeof window !== "undefined") {
  initTheme();
}

function subscribe(callback: () => void) {
  subscribers.add(callback);

  // A change in another tab, or to the system setting (when no choice was saved), applies here too
  const handleStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
      currentTheme = e.newValue;
      applyThemeToDOM(currentTheme);
      callback();
    }
  };

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMedia = (e: MediaQueryListEvent) => {
    try {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        currentTheme = e.matches ? "dark" : "light";
        applyThemeToDOM(currentTheme);
        callback();
      }
    } catch {
      // Ignored
    }
  };

  window.addEventListener("storage", handleStorage);
  mql.addEventListener("change", handleMedia);

  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", handleStorage);
    mql.removeEventListener("change", handleMedia);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((newTheme: Theme) => {
    currentTheme = newTheme;
    applyThemeToDOM(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Storage blocked (private mode): the theme still applies for this visit
    }
    notify();
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
