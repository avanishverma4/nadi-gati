"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Crosshair,
  Info,
  Loader2,
  MapPin,
  MapPinOff,
  Mountain,
  Phone,
  Waves,
  X,
} from "lucide-react";
import { formatFlow } from "@/lib/hydrology-data";
import { ClickedLocationAnalysis, RiverProximity } from "@/lib/location-hydrology";
import { SeverityChip } from "@/components/severity-chip";
import { useMapPanelFocus } from "@/hooks/map-use-panel-focus";

interface LocationHydrologyDrawerProps {
  analysis: ClickedLocationAnalysis | null;
  onClose: () => void;
  onSelectStation?: (_stationId: string) => void;
}

// Extras from /api/hydrology/location-inspect
interface LiveInspectionData {
  elevationMsl?: number;
  formattedAddress?: string;
  village?: string;
  discharge?: {
    currentDailyM3s?: number;
    forecastPeakM3s?: number;
    peakDate?: string;
  };
}

const PROXIMITY_LABEL: Record<RiverProximity, string> = {
  riverside: "Right by the river",
  floodplain: "On the floodplain",
  further: "Away from the river",
};

/**
 * Panel for a spot tapped on the map. Shows only what we know: the place, the nearest river and
 * gauge, ground height and modelled flow. Outside the pilot area it says so instead of guessing.
 */
export function LocationHydrologyDrawer({
  analysis,
  onClose,
  onSelectStation,
}: LocationHydrologyDrawerProps) {
  // The result is stored with the spot it belongs to, so a new tap never shows the previous
  // spot's place name or river flow while its own lookup is still loading
  const [fetched, setFetched] = useState<{
    key: string;
    data: LiveInspectionData;
    notice: string | null;
  } | null>(null);

  const lat = analysis?.latitude;
  const lng = analysis?.longitude;
  const currentKey =
    lat !== undefined && lng !== undefined ? `${lat.toFixed(4)},${lng.toFixed(4)}` : null;
  const isLoading = currentKey !== null && fetched?.key !== currentKey;
  const liveData: LiveInspectionData = !isLoading && fetched ? fetched.data : {};
  const lookupNotice = !isLoading && fetched ? fetched.notice : null;

  const panelRef = useMapPanelFocus<HTMLElement>(currentKey ?? "", onClose);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    // Cancel the lookup for an earlier tap: its answer is no longer wanted, and quick taps
    // shouldn't pile up requests to the shared place-name service
    const controller = new AbortController();
    const reqKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    fetch(`/api/hydrology/location-inspect?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 429 || res.status === 503) {
          setFetched({
            key: reqKey,
            data: {},
            notice: "Place lookups are busy right now. Try this spot again in a minute.",
          });
          return;
        }
        const data = res.ok ? await res.json() : null;
        setFetched({
          key: reqKey,
          data: data?.success
            ? {
                elevationMsl: data.elevationMsl,
                formattedAddress: data.address?.formatted,
                village: data.address?.village,
                discharge: data.discharge,
              }
            : {},
          notice: data?.success ? null : "We couldn't look up this spot's details.",
        });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFetched({
          key: reqKey,
          data: {},
          notice: "We couldn't look up this spot's details. Check your connection.",
        });
      });

    return () => controller.abort();
  }, [lat, lng]);

  if (!analysis) return null;

  const {
    latitude,
    longitude,
    isCovered,
    district,
    riverName,
    distanceToRiverKm,
    proximity,
    nearestStation,
    distanceToNearestStationKm,
    bearingToNearestStation,
    stationSeverity,
    differenceToDangerM,
    advice,
    districtHelplines,
  } = analysis;

  const title =
    liveData.village ||
    liveData.formattedAddress?.split(",")[0]?.trim() ||
    (isCovered ? `Near ${district.name}` : "Unnamed place");
  const subtitle = isLoading
    ? null
    : lookupNotice && !liveData.formattedAddress
      ? `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}° · ${lookupNotice}`
      : liveData.formattedAddress || `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;

  // Level bar: warning mark at 50%, danger mark at 75%, matching the basin cards on the landing page
  const step = nearestStation.dangerLevel - nearestStation.warningLevel || 1;
  const barLow = nearestStation.warningLevel - 2 * step;
  const levelPercent = Math.min(
    100,
    Math.max(4, ((nearestStation.latestReading.value - barLow) / (4 * step)) * 100)
  );
  const barColor =
    stationSeverity.level === "danger"
      ? "bg-error"
      : stationSeverity.level === "watch"
        ? "bg-tertiary"
        : "bg-success";

  const showFlow =
    isCovered && proximity !== "further" && typeof liveData.discharge?.currentDailyM3s === "number";
  const flowPeakDay = liveData.discharge?.peakDate
    ? new Date(`${liveData.discharge.peakDate}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    // A panel beside the map, not a modal: the map stays usable, so it is a labelled region
    <section
      ref={panelRef}
      tabIndex={-1}
      id="location-hydrology-inspection-drawer"
      className="focus:outline-none absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[400px] max-h-[calc(100%-1.5rem)] z-[600] flex flex-col rounded-3xl border border-outline-variant/70 bg-surface/95 backdrop-blur-xl shadow-elevation-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
      aria-labelledby="spot-panel-title"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-outline-variant/50">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-primary">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Spot you tapped
          </span>
          <h2
            id="spot-panel-title"
            className="font-sans font-bold text-lg text-on-surface tracking-tight leading-snug mt-0.5 truncate"
          >
            {title}
          </h2>
          {isLoading ? (
            <p className="mt-0.5 inline-flex items-center gap-1.5 font-sans text-sm text-on-surface-variant">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              Finding the place name…
            </p>
          ) : (
            <p className="mt-0.5 font-sans text-sm text-on-surface-variant line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 -mr-2 flex-shrink-0 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close spot details"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
        {!isCovered ? (
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
            <span className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
              <MapPinOff className="w-5 h-5 text-on-surface-variant" aria-hidden="true" />
            </span>
            <h3 className="font-sans font-bold text-base text-on-surface mt-3">
              Outside the pilot area
            </h3>
            <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1">
              During the pilot, Nadi-Gati covers parts of Bihar and Assam. The nearest gauge we
              follow is {Math.round(distanceToNearestStationKm)} km away, so we can&apos;t tell you
              much about flooding here.
            </p>
          </div>
        ) : (
          <>
            {/* Status at the nearest gauge */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-xs font-semibold text-on-surface-variant">
                  At the nearest gauge
                </span>
                <SeverityChip
                  severity={stationSeverity.level}
                  label={stationSeverity.label}
                  size="xs"
                />
              </div>
              <p className="font-sans text-sm text-on-surface leading-relaxed mt-2">{advice[0]}</p>
            </div>

            {/* River */}
            <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
              <span className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0">
                <Waves className="w-5 h-5 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-sans font-semibold text-sm text-on-surface">
                  {PROXIMITY_LABEL[proximity]}
                </div>
                <div className="font-sans text-sm text-on-surface-variant">
                  About {distanceToRiverKm < 1 ? "<1" : Math.round(distanceToRiverKm)} km from the{" "}
                  {riverName}
                </div>
              </div>
            </div>

            {/* Nearest gauge */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-sans text-xs font-semibold text-on-surface-variant">
                    Nearest gauge · {Math.round(distanceToNearestStationKm)} km{" "}
                    {bearingToNearestStation}
                  </div>
                  <div className="font-sans font-bold text-base text-on-surface mt-0.5 truncate">
                    {nearestStation.name}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-sans font-bold text-xl text-on-surface tracking-tight">
                    {nearestStation.latestReading.value.toFixed(2)}
                    <span className="font-medium text-sm text-on-surface-variant"> m</span>
                  </div>
                </div>
              </div>

              <div
                className="relative mt-3 h-2 rounded-full bg-surface-container-highest"
                role="img"
                aria-label={`Level ${nearestStation.latestReading.value.toFixed(2)} metres. Warning mark ${nearestStation.warningLevel.toFixed(2)} metres, danger mark ${nearestStation.dangerLevel.toFixed(2)} metres.`}
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
              <div className="mt-2 flex items-center justify-between gap-2 font-sans text-xs text-on-surface-variant">
                <span>
                  {differenceToDangerM >= 0
                    ? `${differenceToDangerM.toFixed(2)} m above the danger mark`
                    : `${Math.abs(differenceToDangerM).toFixed(2)} m below the danger mark`}
                </span>
                <span>Sample data</span>
              </div>

              {onSelectStation && (
                <button
                  type="button"
                  onClick={() => onSelectStation(nearestStation.id)}
                  className="mt-3 inline-flex items-center gap-1.5 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                >
                  <Crosshair className="w-4 h-4" aria-hidden="true" />
                  Show this gauge
                </button>
              )}
            </div>

            {/* Ground height and modelled flow */}
            <div className={`grid gap-3 ${showFlow ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
                <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-on-surface-variant">
                  <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
                  Ground height
                </div>
                <div className="font-sans font-bold text-lg text-on-surface mt-1">
                  {isLoading
                    ? "…"
                    : typeof liveData.elevationMsl === "number"
                      ? `${Math.round(liveData.elevationMsl)} m`
                      : "Not available"}
                </div>
                <div className="font-sans text-xs text-on-surface-variant">above sea level</div>
              </div>
              {showFlow && (
                <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
                  <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-on-surface-variant">
                    <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                    River flow nearby
                  </div>
                  <div className="font-sans font-bold text-lg text-on-surface mt-1">
                    {formatFlow(liveData.discharge!.currentDailyM3s!)}
                  </div>
                  <div className="font-sans text-xs text-on-surface-variant">
                    {liveData.discharge?.forecastPeakM3s &&
                    flowPeakDay &&
                    liveData.discharge.forecastPeakM3s > liveData.discharge.currentDailyM3s! * 1.02
                      ? `Up to ${formatFlow(liveData.discharge.forecastPeakM3s)} by ${flowPeakDay}`
                      : "Model estimate"}
                  </div>
                </div>
              )}
            </div>

            {advice[1] && (
              <p className="flex items-start gap-2 font-sans text-sm text-on-surface-variant leading-relaxed">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {advice[1]}
              </p>
            )}

            {/* Helplines */}
            <div className="rounded-2xl border border-error/30 bg-error-container/30 p-4">
              <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-on-surface">
                <Phone className="w-3.5 h-3.5 text-error" aria-hidden="true" />
                Helplines for {district.name}
              </div>
              <ul className="mt-2 flex flex-col gap-1.5 list-none">
                {[
                  { title: "National emergency", number: "112" },
                  ...districtHelplines.slice(0, 2),
                ].map((line) => (
                  <li key={`${line.title}-${line.number}`}>
                    <a
                      href={`tel:${line.number}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    >
                      <span className="font-sans text-sm text-on-surface truncate">
                        {line.title}
                      </span>
                      <span className="font-sans font-bold text-sm text-error whitespace-nowrap">
                        {line.number}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-outline-variant/50 grid grid-cols-2 gap-2">
        {isCovered ? (
          <Link
            href={`/district/${district.slug}`}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-3 min-w-0 whitespace-nowrap rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm hover:bg-surface-container transition-colors"
          >
            <span className="truncate">Open {district.name}</span>
          </Link>
        ) : (
          <a
            href="tel:112"
            className="inline-flex items-center justify-center gap-1.5 h-11 px-3 min-w-0 whitespace-nowrap rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm hover:bg-surface-container transition-colors"
          >
            <Phone className="w-4 h-4 text-error" aria-hidden="true" />
            Emergency 112
          </a>
        )}
        {isCovered ? (
          <Link
            href={`/report?lat=${latitude}&lng=${longitude}`}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-3 min-w-0 whitespace-nowrap rounded-full bg-error text-on-error font-sans font-semibold text-sm hover:brightness-110 transition-all"
          >
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            Report flooding
          </Link>
        ) : (
          // Reports outside the pilot area would be filed under a distant district, so don't offer one
          <Link
            href="/districts"
            className="inline-flex items-center justify-center gap-1 h-11 px-3 min-w-0 whitespace-nowrap rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all"
          >
            Districts we cover
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
