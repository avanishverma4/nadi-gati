"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Search, Droplets, Phone, Waves, MapPin, ArrowRight, Info, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SeverityChip } from "@/components/severity-chip";
import { LevelGauge } from "@/components/level-gauge";
import { OfflineCachedBadge } from "@/components/offline-status-banner";
import {
  PILOT_DISTRICTS_DATA,
  PILOT_GAUGE_STATIONS_DATA,
  calculateStationSeverity,
  isLevelReading,
  pickHeadlineStation,
} from "@/lib/hydrology-data";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

const STATE_FILTERS = ["all", "Bihar", "Assam"] as const;
const SEVERITY_RANK = { danger: 0, watch: 1, normal: 2 };

export default function DistrictSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<"all" | "Bihar" | "Assam">("all");
  const [sortBy, setSortBy] = useState<"name" | "urgent">("name");
  const [liveReadings, setLiveReadings] = useState<Record<string, number>>({});

  // Listen to each pilot gauge's document, which holds only the latest reading (the full history
  // lives in a subcollection that this page never reads). Live values replace the built-in ones.
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    PILOT_DISTRICTS_DATA.forEach((district) => {
      district.stationIds.forEach((stationId) => {
        try {
          const docRef = doc(db, "gaugeStations", stationId);
          const unsub = onSnapshot(
            docRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                if (isLevelReading(data.latestReading) && typeof data.latestReading.value === "number") {
                  setLiveReadings((prev) => ({
                    ...prev,
                    [stationId]: data.latestReading.value,
                  }));
                }
              }
            },
            () => {
              // Offline or blocked: the built-in sample readings stay on screen
            }
          );
          unsubscribers.push(unsub);
        } catch {
          // Same: keep showing the built-in reading for this gauge
        }
      });
    });

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, []);

  // One card per district, represented by its most serious gauge (live values when available)
  const districtCards = useMemo(
    () =>
      PILOT_DISTRICTS_DATA.map((district) => {
        const headline = pickHeadlineStation(district.stationIds, liveReadings);
        const station = headline?.station;
        const value = headline?.value;
        const severity =
          station && value !== undefined
            ? calculateStationSeverity(value, station.warningLevel, station.dangerLevel)
            : undefined;
        return {
          district,
          station,
          value,
          severity,
          dangerGap: station && value !== undefined ? value - station.dangerLevel : undefined,
        };
      }),
    [liveReadings]
  );

  const statusCounts = useMemo(() => {
    const counts = { danger: 0, watch: 0, normal: 0 };
    for (const card of districtCards) {
      if (card.severity) counts[card.severity.level] += 1;
    }
    return counts;
  }, [districtCards]);

  const filteredDistricts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = districtCards.filter(({ district }) => {
      const matchesState = selectedState === "all" || district.state === selectedState;
      const matchesSearch =
        query === "" ||
        district.name.toLowerCase().includes(query) ||
        district.state.toLowerCase().includes(query) ||
        district.primaryRiver.toLowerCase().includes(query);
      return matchesState && matchesSearch;
    });
    return [...matches].sort((a, b) => {
      if (sortBy === "urgent") {
        const rank =
          SEVERITY_RANK[a.severity?.level ?? "normal"] -
          SEVERITY_RANK[b.severity?.level ?? "normal"];
        if (rank !== 0) return rank;
        const gap = (b.dangerGap ?? -Infinity) - (a.dangerGap ?? -Infinity);
        if (gap !== 0) return gap;
      }
      return a.district.name.localeCompare(b.district.name);
    });
  }, [districtCards, searchQuery, selectedState, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedState("all");
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <SiteHeader id="districts-header" />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1">
          {/* Page header */}
          <section className="relative overflow-hidden border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface">
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
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>Districts</span>
              </motion.div>
              <motion.h1
                id="districts-page-heading"
                className="font-sans font-bold text-3xl sm:text-5xl text-on-surface tracking-tight mt-3"
                variants={HEADER_ITEM_VARIANTS}
              >
                Find your district
              </motion.h1>
              <motion.p
                className="text-base sm:text-lg text-on-surface-variant leading-relaxed mt-3 max-w-2xl"
                variants={HEADER_ITEM_VARIANTS}
              >
                Search by district, state or river to see the river level and the helpline for your
                area.
              </motion.p>

              <motion.div
                className="mt-6 flex flex-wrap items-center gap-2.5"
                variants={HEADER_ITEM_VARIANTS}
              >
                {[
                  { value: statusCounts.danger, label: "above danger", dotClass: "bg-error" },
                  { value: statusCounts.watch, label: "on watch", dotClass: "bg-tertiary" },
                  { value: statusCounts.normal, label: "normal", dotClass: "bg-success" },
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
                <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-2.5 py-1.5 rounded-full border border-outline-variant text-on-surface-variant whitespace-nowrap">
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  Pilot preview · sample data
                </span>
              </motion.div>
            </motion.div>
          </section>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Search & filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="district-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search district, state or river"
                  aria-label="Search districts"
                  className="w-full h-14 pl-13 pr-14 rounded-full bg-surface-container border border-outline text-on-surface placeholder:text-on-surface-variant font-sans text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all [&::-webkit-search-cancel-button]:hidden"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    id="clear-search-btn"
                    type="button"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="group"
                  aria-label="Filter by state"
                  className="flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/60"
                >
                  {STATE_FILTERS.map((state) => (
                    <button
                      key={state}
                      id={`filter-${state.toLowerCase()}`}
                      type="button"
                      aria-pressed={selectedState === state}
                      onClick={() => setSelectedState(state)}
                      className={`px-4 min-h-[44px] rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selectedState === state
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {state === "all" ? "All" : state}{" "}
                      <span className="font-normal">
                        {state === "all"
                          ? PILOT_DISTRICTS_DATA.length
                          : PILOT_DISTRICTS_DATA.filter((d) => d.state === state).length}
                      </span>
                    </button>
                  ))}
                </div>

                <div
                  role="group"
                  aria-label="Sort districts"
                  className="flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/60"
                >
                  {(
                    [
                      { id: "name", label: "A to Z" },
                      { id: "urgent", label: "Most urgent" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      id={`sort-${option.id}`}
                      type="button"
                      aria-pressed={sortBy === option.id}
                      onClick={() => setSortBy(option.id)}
                      className={`px-4 min-h-[44px] rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        sortBy === option.id
                          ? "bg-surface-container-highest text-on-surface"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result count */}
            <div
              className="mt-5 mb-4 flex flex-wrap items-center gap-2 font-sans text-sm text-on-surface-variant"
              aria-live="polite"
            >
              <span>
                <strong className="font-sans font-semibold text-on-surface">
                  {filteredDistricts.length}
                </strong>{" "}
                {filteredDistricts.length === 1 ? "district" : "districts"}
              </span>
              <OfflineCachedBadge />
            </div>

            {/* District grid */}
            {filteredDistricts.length === 0 ? (
              <motion.div
                id="no-districts-card"
                className="py-16 px-6 text-center rounded-3xl border border-dashed border-outline-variant bg-surface-container-low"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="w-14 h-14 rounded-2xl bg-primary-container mx-auto flex items-center justify-center">
                  <Droplets className="w-7 h-7 text-primary" aria-hidden="true" />
                </span>
                <h2 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-5">
                  No districts match that search
                </h2>
                <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-md mx-auto mt-2">
                  Try a district such as Patna or Kamrup, or a river such as Ganga or Brahmaputra.
                  The pilot covers Bihar and Assam only.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-6 inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all"
                  id="reset-search-btn"
                  type="button"
                >
                  Clear search
                </button>
              </motion.div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 list-none">
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredDistricts.map(
                    ({ district, station, value, severity, dangerGap }, index) => {
                      const primaryHelpline = district.helplineNumbers[0];

                      return (
                        <motion.li
                          key={district.id}
                          id={`district-card-${district.slug}`}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{
                            duration: 0.4,
                            ease: [0.22, 1, 0.36, 1],
                            delay: Math.min(index, 8) * 0.04,
                          }}
                          whileHover={{ y: -4 }}
                          className="group relative flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6 shadow-elevation-1 hover:shadow-elevation-3 hover:border-primary/60 transition-[border-color,box-shadow] duration-200 focus-within:border-primary/60"
                        >
                          {/* Name & status */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="font-sans font-bold text-xl text-on-surface tracking-tight leading-tight">
                                <Link
                                  href={`/district/${district.slug}`}
                                  id={`view-dashboard-link-${district.slug}`}
                                  className="focus:outline-none after:absolute after:inset-0 after:z-[1] after:rounded-3xl focus-visible:after:ring-2 focus-visible:after:ring-primary"
                                >
                                  {district.name}
                                </Link>
                              </h2>
                              <div className="flex items-center gap-1.5 font-sans text-sm text-on-surface-variant mt-1">
                                <Waves
                                  className="w-4 h-4 text-primary flex-shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {district.state} · {district.primaryRiver}
                                </span>
                              </div>
                            </div>
                            {severity && (
                              <SeverityChip
                                id={`district-status-${district.slug}`}
                                severity={severity.level}
                                label={severity.label}
                                size="xs"
                              />
                            )}
                          </div>

                          {/* Level reading & gauge */}
                          {station && value !== undefined && severity && dangerGap !== undefined ? (
                            <div className="mt-5">
                              <div className="flex items-end justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-sans text-xs text-on-surface-variant truncate">
                                    {station.name}
                                  </div>
                                  <div className="font-sans font-bold text-3xl text-on-surface tracking-tight mt-0.5">
                                    {value.toFixed(2)}
                                    <span className="font-medium text-base text-on-surface-variant">
                                      {" "}
                                      m
                                    </span>
                                  </div>
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
                                  {Math.abs(dangerGap).toFixed(2)} m{" "}
                                  {dangerGap >= 0 ? "above" : "below"}
                                  <br />
                                  danger mark
                                </div>
                              </div>
                              <LevelGauge
                                className="mt-4"
                                value={value}
                                warningLevel={station.warningLevel}
                                dangerLevel={station.dangerLevel}
                                level={severity.level}
                              />
                            </div>
                          ) : (
                            <div className="mt-5 font-sans text-sm text-on-surface-variant">
                              No gauge reading available for this district yet.
                            </div>
                          )}

                          {/* Helpline & link */}
                          <div className="mt-auto pt-5 flex items-center justify-between gap-3">
                            {primaryHelpline ? (
                              <a
                                href={`tel:${primaryHelpline.number.replace(/[^0-9]/g, "")}`}
                                id={`helpline-btn-${district.slug}`}
                                className="relative z-10 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-outline-variant/70 bg-surface text-on-surface font-sans text-sm font-medium hover:border-primary hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                title={`Call ${primaryHelpline.title}`}
                                aria-label={`Call helpline ${primaryHelpline.number}`}
                              >
                                <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
                                <span>{primaryHelpline.number}</span>
                              </a>
                            ) : (
                              <span />
                            )}
                            <span
                              className="inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary"
                              aria-hidden="true"
                            >
                              View district
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </motion.li>
                      );
                    }
                  )}
                </AnimatePresence>
              </ul>
            )}

            {/* River levels link */}
            <Link
              href="/ghats"
              id="districts-ghats-link"
              className="group mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 hover:border-primary/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex items-center gap-4">
                <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                  <Waves className="w-6 h-6" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-sans font-bold text-lg text-on-surface tracking-tight">
                    Looking for one particular gauge?
                  </span>
                  <span className="block font-sans text-sm text-on-surface-variant mt-0.5">
                    Browse all {Object.keys(PILOT_GAUGE_STATIONS_DATA).length} river gauges, with
                    the highest flood on record for each.
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary whitespace-nowrap">
                View river levels
                <ArrowRight
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </span>
            </Link>

            {/* Notice */}
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-3.5 sm:px-5">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-sans text-sm text-on-surface-variant leading-relaxed">
                <strong className="font-semibold text-on-surface">Pilot preview.</strong> The levels
                shown here are sample data, not live readings. In an emergency, follow your district
                administration and call 112.
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
