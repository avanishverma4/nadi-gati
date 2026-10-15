"use client";

import React from "react";
import { ChevronRight, Minus, TrendingDown, TrendingUp, Waves, X } from "lucide-react";
import { GaugeStationData, calculateStationSeverity } from "@/lib/hydrology-data";
import { SeverityChip } from "@/components/severity-chip";
import { useMapPanelFocus } from "@/hooks/map-use-panel-focus";

/**
 * Card shown over a map when a gauge marker is tapped: level, status, a bar with the warning and
 * danger marks, the record flood and links. Used by the flood map and the district maps.
 */
export function MapGaugeCard({
  station,
  onClose,
  showDistrictLink = true,
}: {
  station: GaugeStationData;
  onClose: () => void;
  /** Off on a district's own page, where the link would point back to the same page */
  showDistrictLink?: boolean;
}) {
  const panelRef = useMapPanelFocus<HTMLDivElement>(station.id, onClose);
  const reading = station.latestReading;
  const severity = calculateStationSeverity(
    reading.value,
    station.warningLevel,
    station.dangerLevel
  );
  const differenceToDanger = reading.value - station.dangerLevel;
  // Level bar: warning mark at 50%, danger mark at 75%, as on the landing page basin cards
  const step = station.dangerLevel - station.warningLevel || 1;
  const barLow = station.warningLevel - 2 * step;
  const levelPercent = Math.min(100, Math.max(4, ((reading.value - barLow) / (4 * step)) * 100));
  const barColor =
    severity.level === "danger"
      ? "bg-error"
      : severity.level === "watch"
        ? "bg-tertiary"
        : "bg-success";
  const trend =
    reading.trend === "rising"
      ? { label: "Rising", icon: TrendingUp, className: "text-error" }
      : reading.trend === "falling"
        ? { label: "Falling", icon: TrendingDown, className: "text-success" }
        : { label: "Steady", icon: Minus, className: "text-on-surface-variant" };
  const hflMonth = station.hflDate
    ? new Date(`${station.hflDate}T00:00:00`).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;
  const belowRecord = station.hfl ? station.hfl - reading.value : null;

  return (
    // A panel beside the map, not a modal: the map stays usable, so it is a labelled region
    <section
      ref={panelRef}
      tabIndex={-1}
      id={`map-gauge-card-${station.id}`}
      aria-labelledby={`map-gauge-card-title-${station.id}`}
      className="focus:outline-none absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[380px] z-[500] rounded-3xl border border-outline-variant/70 bg-surface/95 backdrop-blur-xl shadow-elevation-3 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="px-5 pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-primary">
            <Waves className="w-3.5 h-3.5" aria-hidden="true" />
            River gauge · {station.riverName}, {station.state}
          </span>
          <h3
            id={`map-gauge-card-title-${station.id}`}
            className="font-sans font-bold text-lg text-on-surface tracking-tight leading-snug mt-0.5 truncate"
          >
            {station.name}
          </h3>
          {station.ghatName && station.ghatName !== station.name && (
            <p className="font-sans text-sm text-on-surface-variant truncate">
              Also known as {station.ghatName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 -mr-2 flex-shrink-0 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close gauge details"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 pt-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="font-sans text-xs font-semibold text-on-surface-variant">
              Water level
            </div>
            <div className="font-sans font-bold text-3xl text-on-surface tracking-tight">
              {reading.value.toFixed(2)}
              <span className="font-medium text-base text-on-surface-variant"> m</span>
            </div>
            <div
              className={`inline-flex items-center gap-1 font-sans text-sm font-semibold ${trend.className}`}
            >
              <trend.icon className="w-4 h-4" aria-hidden="true" />
              {trend.label}
            </div>
          </div>
          <SeverityChip severity={severity.level} label={severity.label} size="sm" />
        </div>

        <div
          className="relative mt-4 h-2.5 rounded-full bg-surface-container-highest"
          role="img"
          aria-label={`Level ${reading.value.toFixed(2)} metres. Warning mark ${station.warningLevel.toFixed(2)} metres, danger mark ${station.dangerLevel.toFixed(2)} metres.`}
        >
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
            style={{ width: `${levelPercent}%` }}
          />
          <span
            className="absolute -inset-y-1 left-1/2 w-0.5 rounded-full bg-tertiary"
            aria-hidden="true"
          />
          <span
            className="absolute -inset-y-1 left-3/4 w-0.5 rounded-full bg-error"
            aria-hidden="true"
          />
        </div>
        <div
          className="relative mt-2 h-4 font-sans text-xs text-on-surface-variant"
          aria-hidden="true"
        >
          <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
            Warning {station.warningLevel.toFixed(2)}
          </span>
          <span className="absolute left-3/4 -translate-x-1/4 whitespace-nowrap">
            Danger {station.dangerLevel.toFixed(2)}
          </span>
        </div>

        <p
          className={`mt-3 font-sans text-sm font-semibold ${
            differenceToDanger >= 0 ? "text-error" : "text-on-surface"
          }`}
        >
          {differenceToDanger >= 0
            ? `${differenceToDanger.toFixed(2)} m above the danger mark`
            : `${Math.abs(differenceToDanger).toFixed(2)} m below the danger mark`}
        </p>

        {station.hfl && belowRecord !== null && (
          <p className="mt-1 font-sans text-sm text-on-surface-variant">
            Highest flood on record: {station.hfl.toFixed(2)} m{hflMonth ? ` (${hflMonth})` : ""}.{" "}
            {belowRecord > 0
              ? `Today is ${belowRecord.toFixed(2)} m lower.`
              : `Today is ${Math.abs(belowRecord).toFixed(2)} m higher.`}
          </p>
        )}

        <p className="mt-3 font-sans text-xs text-on-surface-variant">
          Sample data during the pilot, not a live reading.
        </p>
      </div>

      <div
        className={`px-5 py-3 border-t border-outline-variant/50 grid gap-2 ${showDistrictLink ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {showDistrictLink && (
          <a
            href={`/district/${station.districtId}`}
            className="inline-flex items-center justify-center h-11 px-3 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm hover:bg-surface-container transition-colors"
          >
            District page
          </a>
        )}
        <a
          href={`/district/${station.districtId}/river/${station.id}`}
          className="inline-flex items-center justify-center gap-1 h-11 px-3 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all"
        >
          Level history
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
