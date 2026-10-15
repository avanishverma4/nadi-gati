"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  Waves,
  Search,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Map as MapIcon,
  List,
  Info,
  Clock,
  X,
  ChevronDown,
} from "lucide-react";
import { getAllGhats, calculateStationSeverity } from "@/lib/hydrology-data";
import { AllDistrictsMap } from "@/components/all-districts-map";
import { OfflineCachedBadge } from "@/components/offline-status-banner";
import { SiteHeader } from "@/components/site-header";
import { SeverityChip } from "@/components/severity-chip";
import { LevelGauge } from "@/components/level-gauge";

export default function GhatsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<"all" | "Bihar" | "Assam">("all");
  const [selectedRiver, setSelectedRiver] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | "danger" | "watch" | "normal">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"cards" | "map">("cards");
  const [selectedGhatId, setSelectedGhatId] = useState<string | null>(null);

  const allGhats = useMemo(() => getAllGhats(), []);

  const riverList = useMemo(() => {
    const rivers = Array.from(new Set(allGhats.map((g) => g.riverName)));
    return rivers.sort();
  }, [allGhats]);

  const filteredGhats = useMemo(() => {
    return allGhats.filter((ghat) => {
      if (selectedState !== "all" && ghat.state !== selectedState) return false;

      if (selectedRiver !== "all" && ghat.riverName.toLowerCase() !== selectedRiver.toLowerCase())
        return false;

      const severity = calculateStationSeverity(
        ghat.latestReading.value,
        ghat.warningLevel,
        ghat.dangerLevel
      );
      if (selectedSeverity !== "all" && severity.level !== selectedSeverity) return false;

      // Free-text search matches any of the gauge's names, its river or its state
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = ghat.name.toLowerCase().includes(query);
        const matchGhatName = ghat.ghatName ? ghat.ghatName.toLowerCase().includes(query) : false;
        const matchLocation = ghat.locationName
          ? ghat.locationName.toLowerCase().includes(query)
          : false;
        const matchRiver = ghat.riverName.toLowerCase().includes(query);
        const matchState = ghat.state.toLowerCase().includes(query);

        if (!matchName && !matchGhatName && !matchLocation && !matchRiver && !matchState) {
          return false;
        }
      }

      return true;
    });
  }, [allGhats, selectedState, selectedRiver, selectedSeverity, searchQuery]);

  // Counts for the summary tiles, including gauges within 1 m of their highest flood on record
  const stats = useMemo(() => {
    let dangerCount = 0;
    let watchCount = 0;
    let nearHflCount = 0;

    allGhats.forEach((g) => {
      const sev = calculateStationSeverity(g.latestReading.value, g.warningLevel, g.dangerLevel);
      if (sev.level === "danger") dangerCount++;
      if (sev.level === "watch") watchCount++;

      if (g.hfl) {
        const diffToHfl = g.hfl - g.latestReading.value;
        if (diffToHfl <= 1.0) nearHflCount++;
      }
    });

    return {
      total: allGhats.length,
      dangerCount,
      watchCount,
      nearHflCount,
    };
  }, [allGhats]);

  // Most recent reading time across all gauges, for the "Last updated" line
  const latestUpdate = useMemo(() => {
    const times = allGhats
      .map((g) => new Date(g.latestReading.recordedAt).getTime())
      .filter((t) => !isNaN(t));
    return times.length > 0 ? new Date(Math.max(...times)) : null;
  }, [allGhats]);

  const filtersActive =
    searchQuery.trim() !== "" ||
    selectedState !== "all" ||
    selectedRiver !== "all" ||
    selectedSeverity !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedState("all");
    setSelectedRiver("all");
    setSelectedSeverity("all");
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <SiteHeader id="ghats-header" />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1">
          {/* Page header */}
          <section className="border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface">
            <motion.div
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pt-14 sm:pb-10"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.div
                className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase"
                variants={HEADER_ITEM_VARIANTS}
              >
                <Waves className="w-4 h-4" aria-hidden="true" />
                <span>River levels</span>
              </motion.div>
              <motion.h1
                className="font-sans font-bold text-3xl sm:text-5xl text-on-surface tracking-tight mt-3"
                variants={HEADER_ITEM_VARIANTS}
              >
                River levels, gauge by gauge
              </motion.h1>
              <motion.p
                className="text-base sm:text-lg text-on-surface-variant leading-relaxed mt-3 max-w-2xl"
                variants={HEADER_ITEM_VARIANTS}
              >
                Every river gauge in Bihar and Assam, with its level, its warning and danger marks,
                and the highest flood on record.
              </motion.p>

              <motion.div
                className="mt-6 flex flex-wrap items-center gap-2.5"
                variants={HEADER_ITEM_VARIANTS}
              >
                {[
                  { value: stats.dangerCount, label: "above danger", dotClass: "bg-error" },
                  { value: stats.watchCount, label: "on watch", dotClass: "bg-tertiary" },
                  {
                    value: stats.total - stats.dangerCount - stats.watchCount,
                    label: "normal",
                    dotClass: "bg-success",
                  },
                  {
                    value: stats.nearHflCount,
                    label: "within 1 m of their record",
                    dotClass: "bg-primary",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-outline-variant/70 bg-surface-container-low font-sans text-sm text-on-surface-variant"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${stat.dotClass}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-sans font-semibold text-on-surface">
                        {stat.value}
                      </strong>{" "}
                      {stat.label}
                    </span>
                  </div>
                ))}
              </motion.div>

              <motion.div
                className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-sm text-on-surface-variant"
                variants={HEADER_ITEM_VARIANTS}
              >
                {latestUpdate && (
                  <span id="ghats-last-updated" className="inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span>
                      Last updated{" "}
                      <time
                        dateTime={latestUpdate.toISOString()}
                        className="font-semibold text-on-surface"
                        suppressHydrationWarning
                      >
                        {formatUpdated(latestUpdate)}
                      </time>
                    </span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-2.5 py-1.5 rounded-full border border-outline-variant whitespace-nowrap">
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  Pilot preview · sample data
                </span>
                <OfflineCachedBadge />
              </motion.div>
            </motion.div>
          </section>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Search & filters */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="ghat-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search gauge, place or river"
                    aria-label="Search river gauges"
                    className="w-full h-14 pl-13 pr-14 rounded-full bg-surface-container border border-outline-variant/70 text-on-surface placeholder:text-on-surface-variant/70 font-sans text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all [&::-webkit-search-cancel-button]:hidden"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* List / map */}
                <div
                  role="group"
                  aria-label="View"
                  className="self-start lg:self-auto flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/60"
                >
                  {(
                    [
                      { id: "cards", label: "List", icon: List },
                      { id: "map", label: "Map", icon: MapIcon },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      id={`view-${option.id}`}
                      type="button"
                      aria-pressed={viewMode === option.id}
                      onClick={() => setViewMode(option.id)}
                      className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        viewMode === option.id
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <option.icon className="w-4 h-4" aria-hidden="true" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="group"
                  aria-label="Filter by state"
                  className="flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/60"
                >
                  {(["all", "Bihar", "Assam"] as const).map((st) => (
                    <button
                      key={st}
                      id={`ghat-filter-${st.toLowerCase()}`}
                      type="button"
                      aria-pressed={selectedState === st}
                      onClick={() => setSelectedState(st)}
                      className={`px-4 min-h-[44px] rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selectedState === st
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {st === "all" ? "All" : st}
                    </button>
                  ))}
                </div>

                <div
                  role="group"
                  aria-label="Filter by status"
                  className="flex items-center max-w-full overflow-x-auto p-1 rounded-full bg-surface-container border border-outline-variant/60 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {(
                    [
                      { id: "all", label: "Any status" },
                      { id: "danger", label: "Danger" },
                      { id: "watch", label: "Watch" },
                      { id: "normal", label: "Normal" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      id={`ghat-status-${option.id}`}
                      type="button"
                      aria-pressed={selectedSeverity === option.id}
                      onClick={() => setSelectedSeverity(option.id)}
                      className={`px-3.5 sm:px-4 min-h-[44px] rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selectedSeverity === option.id
                          ? "bg-surface-container-highest text-on-surface"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <select
                    id="ghat-river-select"
                    value={selectedRiver}
                    onChange={(e) => setSelectedRiver(e.target.value)}
                    aria-label="Filter by river"
                    className="appearance-none h-[52px] pl-5 pr-11 rounded-full bg-surface-container border border-outline-variant/60 font-sans text-sm font-medium text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="all">All rivers ({riverList.length})</option>
                    {riverList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            {/* Result count */}
            <div
              className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-2 font-sans text-sm text-on-surface-variant"
              aria-live="polite"
            >
              <span>
                <strong className="font-sans font-semibold text-on-surface">
                  {filteredGhats.length}
                </strong>{" "}
                {filteredGhats.length === 1 ? "gauge" : "gauges"}
                {viewMode === "map" && filtersActive
                  ? " match your filters (the map shows all gauges)"
                  : ""}
              </span>
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  id="ghat-clear-filters"
                  className="inline-flex items-center gap-1.5 min-h-[44px] font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>

            {viewMode === "map" ? (
              <div id="ghats-map-view" className="flex flex-col gap-3 scroll-mt-24">
                <div className="font-sans text-sm text-on-surface-variant">
                  Tap a gauge to see its level.
                </div>
                <AllDistrictsMap
                  initialState={selectedState}
                  selectedGhatId={selectedGhatId}
                  onSelectGhat={(station) => setSelectedGhatId(station.id)}
                  onClearGhat={() => setSelectedGhatId(null)}
                />
              </div>
            ) : filteredGhats.length === 0 ? (
              <div
                id="no-ghats-card"
                className="py-16 px-6 text-center rounded-3xl border border-dashed border-outline-variant bg-surface-container-low"
              >
                <span className="w-14 h-14 rounded-2xl bg-primary-container mx-auto flex items-center justify-center">
                  <Waves className="w-7 h-7 text-primary" aria-hidden="true" />
                </span>
                <h2 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-5">
                  No gauges match those filters
                </h2>
                <div className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-md mx-auto mt-2">
                  Try a different place or river, or clear the filters to see every gauge.
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 list-none">
                {filteredGhats.map((ghat) => {
                  const value = ghat.latestReading.value;
                  const severity = calculateStationSeverity(
                    value,
                    ghat.warningLevel,
                    ghat.dangerLevel
                  );
                  const dangerGap = value - ghat.dangerLevel;
                  const trend = ghat.latestReading.trend;
                  const recordGap = ghat.hfl ? ghat.hfl - value : null;

                  return (
                    <motion.li
                      key={ghat.id}
                      id={`ghat-card-${ghat.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -4 }}
                      className="group relative flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6 shadow-elevation-1 hover:shadow-elevation-3 hover:border-primary/60 transition-[border-color,box-shadow] duration-200 focus-within:border-primary/60"
                    >
                      {/* Name & status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-sans font-bold text-xl text-on-surface tracking-tight leading-tight">
                            <Link
                              href={`/district/${ghat.districtId}/river/${ghat.id}`}
                              className="focus:outline-none after:absolute after:inset-0 after:z-[1] after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-primary"
                            >
                              {ghat.name}
                            </Link>
                          </h2>
                          <div className="flex items-center gap-1.5 font-sans text-sm text-on-surface-variant mt-1">
                            <Waves
                              className="w-4 h-4 text-primary flex-shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {ghat.riverName} River · {ghat.state}
                            </span>
                          </div>
                        </div>
                        <SeverityChip
                          id={`ghat-status-chip-${ghat.id}`}
                          severity={severity.level}
                          label={severity.label}
                          size="xs"
                        />
                      </div>

                      {/* Level reading & gauge */}
                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-sans font-bold text-3xl text-on-surface tracking-tight">
                            {value.toFixed(2)}
                            <span className="font-medium text-base text-on-surface-variant">
                              {" "}
                              m
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full font-sans text-xs font-semibold ${
                              trend === "rising"
                                ? "bg-error-container text-on-error-container"
                                : trend === "falling"
                                  ? "bg-success-container text-on-success-container"
                                  : "bg-surface-container-highest text-on-surface-variant"
                            }`}
                          >
                            {trend === "rising" ? (
                              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : trend === "falling" ? (
                              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            {trend === "rising"
                              ? "Rising"
                              : trend === "falling"
                                ? "Falling"
                                : "Steady"}
                          </span>
                        </div>
                        <div
                          className={`font-sans text-xs font-semibold text-right ${
                            severity.level === "danger"
                              ? "text-error"
                              : severity.level === "watch"
                                ? "text-tertiary"
                                : "text-success"
                          }`}
                        >
                          {Math.abs(dangerGap).toFixed(2)} m {dangerGap >= 0 ? "above" : "below"}
                          <br />
                          danger mark
                        </div>
                      </div>
                      <LevelGauge
                        className="mt-4"
                        value={value}
                        warningLevel={ghat.warningLevel}
                        dangerLevel={ghat.dangerLevel}
                        level={severity.level}
                      />

                      {/* Record & last updated */}
                      <dl className="mt-4 pt-4 border-t border-outline-variant/40 flex flex-col gap-2 font-sans text-sm">
                        {ghat.hfl && recordGap !== null && (
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-on-surface-variant">Highest flood on record</dt>
                            <dd className="text-right">
                              <span className="font-semibold text-on-surface whitespace-nowrap">
                                {ghat.hfl.toFixed(2)} m
                              </span>
                              <span
                                className={`block text-xs ${recordGap <= 0 ? "text-error font-semibold" : "text-on-surface-variant"}`}
                              >
                                {recordGap <= 0
                                  ? `${Math.abs(recordGap).toFixed(2)} m above the record`
                                  : `${recordGap.toFixed(2)} m below the record`}
                              </span>
                            </dd>
                          </div>
                        )}
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="inline-flex items-center gap-1.5 text-on-surface-variant">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            Last updated
                          </dt>
                          <dd className="text-right font-medium text-on-surface">
                            <time
                              dateTime={String(ghat.latestReading.recordedAt)}
                              suppressHydrationWarning
                            >
                              {formatUpdated(ghat.latestReading.recordedAt)}
                            </time>
                          </dd>
                        </div>
                      </dl>

                      {/* Actions */}
                      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGhatId(ghat.id);
                            setViewMode("map");
                            // Bring the map itself into view once it has rendered; the map opens
                            // zoomed in on this gauge with its card showing
                            requestAnimationFrame(() =>
                              document
                                .getElementById("ghats-map-view")
                                ?.scrollIntoView({ behavior: "smooth", block: "start" })
                            );
                          }}
                          className="relative z-10 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-outline-variant/70 bg-surface text-on-surface font-sans text-sm font-medium hover:border-primary hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                          Show on map
                        </button>
                        <span
                          className="inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary"
                          aria-hidden="true"
                        >
                          View trend
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}

            {/* Notice */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-3.5 sm:px-5">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-sans text-sm text-on-surface-variant leading-relaxed">
                <strong className="font-semibold text-on-surface">Pilot preview.</strong> The levels
                and update times shown here are sample data, not live readings. In an emergency,
                follow your district administration and call 112.
              </span>
            </div>
          </div>
        </main>
      </MotionConfig>
    </div>
  );
}

const HEADER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

// "13 Oct 2026, 9:05 pm" in Indian Standard Time
function formatUpdated(value: string | number | Date): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
