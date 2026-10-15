"use client";

import { normalizeSeverity, SEVERITY_CONFIG, SeverityLevel } from "@/lib/tokens";

export interface SeverityChipProps {
  severity: SeverityLevel | string;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "tonal" | "filled" | "outlined";
  pulse?: boolean;
  className?: string;
  id?: string;
}

/**
 * River status pill. Normal uses the success colours, Watch (past the warning mark) the amber
 * tertiary colours and Danger (past the danger mark) the error colours. The status is always
 * spelled out in the label, so it never depends on colour alone.
 */
export function SeverityChip({
  severity,
  label,
  size = "sm",
  variant = "tonal",
  pulse = false,
  className = "",
  id,
}: SeverityChipProps) {
  const normalized = normalizeSeverity(severity);
  const config = SEVERITY_CONFIG[normalized];
  const displayLabel = label || config.label;

  // Chips are labels, not buttons, so only the largest size reaches the 44px touch-target size
  const sizeStyles = {
    xs: "text-xs px-2 py-0.5 min-h-[22px] gap-1",
    sm: "text-xs px-2.5 py-1 min-h-[28px] gap-1.5",
    md: "text-sm px-3.5 py-1.5 min-h-[36px] gap-2",
    lg: "text-base px-4 py-2 min-h-[44px] gap-2.5",
  }[size];

  const dotSize = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  }[size];

  let colorClasses = "";
  if (variant === "tonal") {
    if (normalized === "normal") {
      colorClasses = "bg-success-container text-on-success-container border border-success/30";
    } else if (normalized === "watch") {
      colorClasses = "bg-tertiary-container text-on-tertiary-container border border-tertiary/30";
    } else {
      colorClasses = "bg-error-container text-on-error-container border border-error/30";
    }
  } else if (variant === "filled") {
    if (normalized === "normal") {
      colorClasses = "bg-success text-on-success border border-transparent shadow-elevation-1";
    } else if (normalized === "watch") {
      colorClasses = "bg-tertiary text-on-tertiary border border-transparent shadow-elevation-1";
    } else {
      colorClasses = "bg-error text-on-error border border-transparent shadow-elevation-1";
    }
  } else {
    // Outlined
    if (normalized === "normal") {
      colorClasses = "bg-transparent text-success border border-success/50";
    } else if (normalized === "watch") {
      colorClasses = "bg-tertiary/10 text-tertiary border border-tertiary/60";
    } else {
      colorClasses = "bg-error/10 text-error border border-error/60";
    }
  }

  // Danger always draws the eye; animate-ping-few pulses three times and stops (WCAG 2.2.2)
  const shouldPulse = pulse || normalized === "danger";

  return (
    <span
      // Not a live region: pages show dozens of chips, and the visible label already names the status
      id={id}
      className={`inline-flex items-center justify-center font-sans font-semibold tracking-wide rounded-full select-none transition-all duration-150 whitespace-nowrap ${sizeStyles} ${colorClasses} ${className}`}
    >
      <span aria-hidden="true" className="relative flex items-center justify-center flex-shrink-0">
        {shouldPulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping-few ${
              variant === "filled" ? "bg-current" : config.dotClass
            }`}
          />
        )}
        <span
          className={`relative inline-block rounded-full ${dotSize} ${
            variant === "filled" ? "bg-current" : config.dotClass
          }`}
        />
      </span>

      <span>{displayLabel}</span>
    </span>
  );
}
