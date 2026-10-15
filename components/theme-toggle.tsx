"use client";

import React, { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  id?: string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  /** Render just the sun/moon icon in a round 44px button */
  iconOnly?: boolean;
}

const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle({
  id = "theme-toggle-btn",
  className = "",
  showLabel = true,
  size = "md",
  iconOnly = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isClient = useIsClient();

  const isDark = theme === "dark";

  const sizeClasses =
    size === "sm" ? "px-3 py-1.5 text-xs min-h-[44px]" : "px-3.5 py-2 text-xs min-h-[44px]";

  // The server can't know the visitor's theme, so render a same-sized placeholder until the
  // client takes over; showing a sun or moon here would mismatch on hydration for half of people
  if (!isClient) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full ${iconOnly ? "w-11 h-11" : "border border-outline/30 bg-surface-container text-on-surface opacity-60 min-h-[44px] min-w-[44px] px-3"} ${className}`}
        aria-hidden="true"
      >
        <span className="w-5 h-5" />
      </div>
    );
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        id={id}
        onClick={toggleTheme}
        className={`inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${className}`}
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
        title={`Switch to ${isDark ? "light" : "dark"} theme`}
      >
        {isDark ? <Moon className="w-5 h-5" aria-hidden="true" /> : <Sun className="w-5 h-5" aria-hidden="true" />}
      </button>
    );
  }

  const visibleLabel = showLabel ? (isDark ? "Dark Theme" : "Light Theme") : isDark ? "Dark" : "Light";

  return (
    <button
      type="button"
      id={id}
      onClick={toggleTheme}
      className={`group relative inline-flex items-center gap-2 rounded-full border border-outline/40 bg-surface-container font-sans font-medium text-on-surface transition-all duration-200 hover:border-primary hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-w-[44px] shadow-elevation-1 cursor-pointer select-none ${sizeClasses} ${className}`}
      // Starts with the visible words, so voice control ("tap Dark Theme") finds the button
      aria-label={`${visibleLabel}: switch to ${isDark ? "light" : "dark"} theme`}
      title={`Current: ${isDark ? "Dark" : "Light"} mode. Click to switch.`}
    >
      <span className="relative flex items-center justify-center w-5 h-5 text-primary transition-transform duration-300 group-hover:rotate-12">
        {isDark ? (
          <Moon className="w-4 h-4 text-primary" aria-hidden="true" />
        ) : (
          <Sun className="w-4 h-4 text-tertiary" aria-hidden="true" />
        )}
      </span>

      {showLabel ? (
        <span className="font-sans text-xs tracking-wide">{visibleLabel}</span>
      ) : (
        <span className="hidden sm:inline font-sans text-xs font-semibold">{visibleLabel}</span>
      )}

      {/* Pill indicator */}
      <span
        className={`inline-block w-2 h-2 rounded-full transition-colors ${
          isDark ? "bg-primary" : "bg-tertiary"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
