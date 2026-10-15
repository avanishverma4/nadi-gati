"use client";

import React from "react";
import { toIsoTimestamp, SAMPLE_READING_SOURCE } from "@/lib/hydrology-data";
import { ExternalLink, Clock, ShieldCheck, Database, Building2 } from "lucide-react";

export interface SourceCitationProps {
  value: React.ReactNode;
  sourceName: string;
  sourceUrl?: string;
  timestamp: string | number | Date;
  label?: string;
  variant?: "card" | "inline" | "compact" | "stat";
  verified?: boolean;
  className?: string;
  id?: string;
}

/**
 * Formats a reading's time in India Standard Time, e.g. "06 Sep 2026, 17:30 IST", whatever the
 * viewer's own time zone. Accepts anything toIsoTimestamp understands, including Firestore
 * Timestamps.
 */
function formatTimestamp(ts: string | number | Date): string {
  try {
    const iso = toIsoTimestamp(ts);
    if (!iso) return "Time not available";
    const d = new Date(iso);

    const dateStr = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });

    return `${dateStr}, ${timeStr} IST`;
  } catch {
    return String(ts);
  }
}

/**
 * Shows a figure together with where it came from and when it was recorded, so no number on the
 * site appears without its source. Four layouts: card, inline, compact and stat.
 */
export function SourceCitation({
  value,
  sourceName,
  sourceUrl,
  timestamp,
  label,
  variant = "card",
  verified: verifiedProp = true,
  className = "",
  id,
}: SourceCitationProps) {
  // Sample pilot figures are never shown with the "official verified data" mark
  const verified = verifiedProp && sourceName !== SAMPLE_READING_SOURCE;
  const formattedTime = formatTimestamp(timestamp);
  const elementId = id || `source-citation-${sourceName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  if (variant === "inline") {
    return (
      <span
        id={elementId}
        className={`inline-flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant ${className}`}
      >
        <span className="font-sans font-bold text-on-surface">{value}</span>
        <span className="text-outline">·</span>
        <span className="inline-flex items-center gap-1 font-medium text-on-surface">
          <Building2 className="w-3 h-3 text-primary flex-shrink-0" aria-hidden="true" />
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-primary hover:underline underline-offset-2 transition-colors"
              title={`View source bulletin at ${sourceName}`}
            >
              <span>{sourceName}</span>
              <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
            </a>
          ) : (
            <span>{sourceName}</span>
          )}
        </span>
        <span className="text-outline">·</span>
        <span className="inline-flex items-center gap-1 font-sans text-xs text-on-surface-variant">
          <Clock className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
          <time className="timestamp" suppressHydrationWarning dateTime={toIsoTimestamp(timestamp) ?? undefined}>{formattedTime}</time>
        </span>
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div
        id={elementId}
        className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 rounded-sm border border-outline-variant/50 bg-surface-container text-xs ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans font-bold text-on-surface truncate">{value}</span>
          {label && (
            <span className="text-xs font-medium text-on-surface-variant truncate">({label})</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 font-sans text-xs text-on-surface-variant">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <span>{sourceName}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-on-surface">{sourceName}</span>
          )}
          <span className="text-outline">·</span>
          <time className="timestamp" suppressHydrationWarning dateTime={toIsoTimestamp(timestamp) ?? undefined}>{formattedTime}</time>
        </div>
      </div>
    );
  }

  if (variant === "stat") {
    return (
      <div
        id={elementId}
        className={`p-4 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 transition-all hover:border-primary/50 ${className}`}
      >
        {label && (
          <div className="text-xs uppercase tracking-wider font-semibold text-on-surface-variant mb-1">
            {label}
          </div>
        )}
        <div className="font-sans text-2xl font-bold text-on-surface tracking-tight mb-2">
          {value}
        </div>
        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0">
            {verified ? (
              <ShieldCheck className="w-3.5 h-3.5 text-success flex-shrink-0" aria-label="Official verified data" />
            ) : (
              <Database className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
            )}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <span className="truncate">{sourceName}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="truncate font-medium text-on-surface">{sourceName}</span>
            )}
          </div>
          <div className="font-sans text-xs text-on-surface-variant flex-shrink-0">
            <time className="timestamp" suppressHydrationWarning dateTime={toIsoTimestamp(timestamp) ?? undefined}>{formattedTime}</time>
          </div>
        </div>
      </div>
    );
  }

  // Default: "card"
  return (
    <div
      id={elementId}
      className={`p-3.5 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-200 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        {label && (
          <span className="text-xs font-medium text-on-surface-variant">{label}</span>
        )}
        <span className="font-sans text-base font-bold text-on-surface">{value}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/30 text-xs">
        <div className="inline-flex items-center gap-1.5 text-on-surface-variant">
          {verified ? (
            <ShieldCheck
              className="w-3.5 h-3.5 text-success flex-shrink-0"
              aria-label="Authoritative source"
            />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
          )}

          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline inline-flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
            >
              <span>{sourceName}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          ) : (
            <span className="font-medium text-on-surface">{sourceName}</span>
          )}
        </div>

        <div className="inline-flex items-center gap-1 font-sans text-xs text-on-surface-variant">
          <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <time className="timestamp" suppressHydrationWarning dateTime={toIsoTimestamp(timestamp) ?? undefined}>{formattedTime}</time>
        </div>
      </div>
    </div>
  );
}
