"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, notFound, redirect } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Bell,
  Phone,
  Info,
  Waves,
  LineChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { SiteHeader } from "@/components/site-header";
import { SeverityChip } from "@/components/severity-chip";
import { LevelGauge } from "@/components/level-gauge";
import { SourceCitation } from "@/components/source-citation";
import { RiverFlowCard } from "@/components/river-flow-card";
import { AlertSubscriptionModal } from "@/components/alert-subscription-modal";
import { ALERTS_ENABLED } from "@/lib/features";
import {
  PILOT_DISTRICTS_DATA,
  PILOT_GAUGE_STATIONS_DATA,
  calculateStationSeverity,
  GaugeStationData,
  GaugeReadingHistoryPoint,
  isLevelReading,
  toIsoTimestamp,
  SAMPLE_READING_SOURCE,
} from "@/lib/hydrology-data";
import { collection, doc, onSnapshot, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

// Illustrative 7-day curve ending at the sample reading, shown only when no stored readings exist.
// It ends at the reading's own time, not "now", and is credited to sample data rather than an agency.
function generate7DayHistory(
  currentValue: number,
  trend: "rising" | "falling" | "steady",
  endsAt: string
): GaugeReadingHistoryPoint[] {
  const points: GaugeReadingHistoryPoint[] = [];
  const now = new Date(toIsoTimestamp(endsAt) ?? Date.now()).getTime();
  const totalSteps = 28; // 4 readings per day over 7 days (every 6 hours)
  const stepMs = 6 * 60 * 60 * 1000;

  // Where the curve starts 7 days earlier, so its overall direction matches the reading's trend
  const val =
    trend === "rising"
      ? currentValue - 1.8
      : trend === "falling"
        ? currentValue + 1.4
        : currentValue - 0.2;
  const targetDelta = currentValue - val;

  for (let i = totalSteps; i >= 0; i--) {
    const timeMs = now - i * stepMs;
    const dateObj = new Date(timeMs);

    // A straight line from start to the current value, with a small wobble so it doesn't look
    // ruled; the last point is exactly the current reading
    const progress = (totalSteps - i) / totalSteps;
    const simulated = val + targetDelta * progress + Math.sin(i * 0.7) * 0.15;
    const rounded = Math.round(simulated * 100) / 100;

    points.push({
      id: `sim_${i}`,
      value: i === 0 ? currentValue : rounded,
      timestampMs: timeMs,
      recordedAt: dateObj.toISOString(),
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    });
  }

  return points;
}

export default function RiverGaugeDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "bihar_patna";
  const gaugeId = (params?.gaugeId as string) || "station_ganga_dighaghat";

  // Unknown gauges get the 404 page rather than silently showing Patna
  const gaugeForUrl = PILOT_GAUGE_STATIONS_DATA[gaugeId];
  if (!gaugeForUrl) {
    notFound();
  }
  // Each gauge has one address, under its own district; other districts redirect there
  if (slug !== gaugeForUrl.districtId) {
    redirect(`/district/${gaugeForUrl.districtId}/river/${gaugeId}`);
  }

  // Some gauges sit in districts that aren't among the pilot districts yet. Their page still
  // works: it names the district from its ID, uses the state helpline and links back to the
  // river levels list instead of a district page that doesn't exist.
  const district = useMemo(() => {
    const pilot = PILOT_DISTRICTS_DATA.find((d) => d.id === gaugeForUrl.districtId);
    if (pilot) {
      return { ...pilot, pageHref: `/district/${pilot.slug}` as string | null };
    }
    const name = gaugeForUrl.districtId
      .replace(/^(bihar|assam)_/, "")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return {
      id: gaugeForUrl.districtId,
      name,
      state: gaugeForUrl.state,
      helplineNumbers: [{ title: `${gaugeForUrl.state} state control room`, number: "1070", type: "state" }],
      pageHref: null as string | null,
    };
  }, [gaugeForUrl]);

  const initialStation: GaugeStationData =
    PILOT_GAUGE_STATIONS_DATA[gaugeId] || PILOT_GAUGE_STATIONS_DATA.station_ganga_dighaghat;

  const [station, setStation] = useState<GaugeStationData>(initialStation);
  const [historyReadings, setHistoryReadings] = useState<GaugeReadingHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "3d" | "24h">("7d");
  const [loadingHistory, setLoadingHistory] = useState(true);
  // True when no recorded readings exist and the chart shows a generated example curve
  const [isSampleTrend, setIsSampleTrend] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // 1. Live latest reading and marks from the gauge's own document (a single small read)
  useEffect(() => {
    try {
      const stationRef = doc(db, "gaugeStations", gaugeId);
      const unsubscribe = onSnapshot(
        stationRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (isLevelReading(data.latestReading)) {
              setStation((prev) => ({
                ...prev,
                latestReading: {
                  value:
                    typeof data.latestReading.value === "number"
                      ? data.latestReading.value
                      : prev.latestReading.value,
                  recordedAt:
                    toIsoTimestamp(data.latestReading.recordedAt) ?? prev.latestReading.recordedAt,
                  unit: data.latestReading.unit || prev.latestReading.unit,
                  trend: data.latestReading.trend || prev.latestReading.trend,
                  source: data.latestReading.source || prev.latestReading.source,
                  sourceUrl: data.latestReading.sourceUrl || prev.latestReading.sourceUrl,
                },
                dangerLevel:
                  typeof data.dangerLevel === "number" ? data.dangerLevel : prev.dangerLevel,
                warningLevel:
                  typeof data.warningLevel === "number" ? data.warningLevel : prev.warningLevel,
              }));
            }
          }
        },
        () => {
          // Offline or blocked: keep the built-in reading
        }
      );
      return () => unsubscribe();
    } catch {
      // Same: keep the built-in reading
    }
  }, [gaugeId]);

  // 2. Recent history from the readings subcollection. Only this page reads it: other pages use
  // the latest reading on the gauge document, so a list of 100+ gauges costs one read each.
  useEffect(() => {
    async function loadTimeSeries() {
      setLoadingHistory(true);
      try {
        const readingsRef = collection(db, "gaugeStations", gaugeId, "readings");
        const q = query(readingsRef, orderBy("recordedAt", "desc"), limit(40));
        const querySnap = await getDocs(q);

        const records: GaugeReadingHistoryPoint[] = [];
        if (!querySnap.empty) {
          querySnap.forEach((doc) => {
            const rData = doc.data();
            // Skip river-flow values an earlier ingestion job stored here; the chart shows levels in metres
            if (!isLevelReading(rData)) return;
            const dateStr = toIsoTimestamp(rData.recordedAt);
            if (!dateStr) return; // skip records without a usable date
            records.push({
              id: doc.id,
              value: typeof rData.value === "number" ? rData.value : parseFloat(rData.value),
              timestampMs: new Date(dateStr).getTime(),
              recordedAt: dateStr,
              source: rData.source || station.source,
              sourceUrl: rData.sourceUrl || station.sourceUrl,
            });
          });
        }
        if (records.length > 0) {
          // Order chronologically for chart display
          records.sort((a, b) => a.timestampMs - b.timestampMs);
          setHistoryReadings(records);
          setIsSampleTrend(false);
        } else {
          // No stored water levels yet (e.g. before ingestion runs): show the labelled sample curve
          const simulated = generate7DayHistory(
            station.latestReading.value,
            station.latestReading.trend || "steady",
            station.latestReading.recordedAt
          );
          setHistoryReadings(simulated);
          setIsSampleTrend(true);
        }
      } catch {
        // Couldn't load history (offline or blocked): show the labelled sample curve
        const simulated = generate7DayHistory(
          station.latestReading.value,
          station.latestReading.trend || "steady",
          station.latestReading.recordedAt
        );
        setHistoryReadings(simulated);
        setIsSampleTrend(true);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadTimeSeries();
  }, [
    gaugeId,
    station.latestReading.value,
    station.warningLevel,
    station.dangerLevel,
    station.latestReading.trend,
    station.latestReading.recordedAt,
    station.source,
    station.sourceUrl,
  ]);

  const severityInfo = calculateStationSeverity(
    station.latestReading.value,
    station.warningLevel,
    station.dangerLevel
  );

  // The time window counts back from the newest point, not from now, so old or sample data still
  // fills the chart. With fewer than two points in the window, show everything instead.
  const filteredReadings = useMemo(() => {
    if (historyReadings.length === 0) return [];
    const latestTimestamp = historyReadings[historyReadings.length - 1]?.timestampMs || 0;
    const cutoff =
      timeRange === "24h"
        ? latestTimestamp - 24 * 60 * 60 * 1000
        : timeRange === "3d"
          ? latestTimestamp - 3 * 24 * 60 * 60 * 1000
          : latestTimestamp - 7 * 24 * 60 * 60 * 1000;

    const subset = historyReadings.filter((p) => p.timestampMs >= cutoff);
    return subset.length >= 2 ? subset : historyReadings;
  }, [historyReadings, timeRange]);

  // Y axis always includes the warning and danger marks (with 1.5 m to spare), so the reference
  // lines are visible even when the river is far below them
  const yDomain = useMemo(() => {
    const values = filteredReadings.map((r) => r.value);
    const minVal = Math.min(...values, station.warningLevel - 1.5);
    const maxVal = Math.max(...values, station.dangerLevel + 1.5);
    return [Math.floor(minVal), Math.ceil(maxVal)];
  }, [filteredReadings, station.warningLevel, station.dangerLevel]);

  const stationValue = station.latestReading.value;
  const dangerGap = stationValue - station.dangerLevel;
  const trend = station.latestReading.trend;
  const helplineNumber = district.helplineNumbers[0]?.number || "1070";
  const gapClass =
    severityInfo.level === "danger"
      ? "text-error"
      : severityInfo.level === "watch"
        ? "text-tertiary"
        : "text-success";

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <SiteHeader id="river-header" />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1">
          {/* Gauge header */}
          <section className="border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface">
            <motion.div
              className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-8 sm:pb-10"
              initial="hidden"
              animate="show"
              variants={STAGGER_VARIANTS}
            >
              <motion.div variants={ITEM_VARIANTS}>
                <Link
                  href={district.pageHref ?? "/ghats"}
                  id="back-to-dashboard-btn"
                  className="group inline-flex items-center gap-1.5 min-h-[44px] -ml-1 pr-3 pl-1 rounded-full font-sans text-sm font-medium text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ArrowLeft
                    className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                  {district.pageHref ? district.name : "River levels"}
                </Link>
              </motion.div>

              <div className="mt-2 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="min-w-0">
                  <motion.div
                    className="flex flex-wrap items-center gap-3"
                    variants={ITEM_VARIANTS}
                  >
                    <h1 className="font-sans font-bold text-3xl sm:text-5xl text-on-surface tracking-tight">
                      {station.name}
                    </h1>
                    <SeverityChip
                      id="river-header-status"
                      severity={severityInfo.level}
                      label={severityInfo.label}
                      size="md"
                      variant="filled"
                    />
                  </motion.div>
                  <motion.div
                    className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-sans text-base text-on-surface-variant"
                    variants={ITEM_VARIANTS}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-primary" aria-hidden="true" />
                      {station.riverName} River · {district.name}, {district.state}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-2.5 py-1.5 rounded-full border border-outline-variant whitespace-nowrap">
                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      Pilot preview · sample data
                    </span>
                  </motion.div>
                </div>

                <motion.div variants={ITEM_VARIANTS}>
                  <button
                    type="button"
                    onClick={() => setShowAlertModal(true)}
                    id="river-header-get-alerts-btn"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 active:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <Bell className="w-4 h-4" aria-hidden="true" />
                    {ALERTS_ENABLED ? "Get alerts" : "Alerts coming soon"}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </section>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">
            {/* Current level */}
            <motion.section
              id="gauge-hero-readout"
              aria-label="Current river level"
              className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-8 shadow-elevation-1"
              {...REVEAL_PROPS}
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                    <Waves className="w-4 h-4" aria-hidden="true" />
                    <span>Level now</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                    <span
                      id="large-numeric-readout"
                      className="font-sans font-bold text-6xl sm:text-7xl text-on-surface tracking-tight"
                    >
                      {stationValue.toFixed(2)}
                      <span className="font-medium text-2xl text-on-surface-variant"> m</span>
                    </span>
                    <span
                      id={`trend-indicator-${trend === "rising" || trend === "falling" ? trend : "steady"}`}
                      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full font-sans text-sm font-semibold ${
                        trend === "rising"
                          ? "bg-error-container text-on-error-container"
                          : trend === "falling"
                            ? "bg-success-container text-on-success-container"
                            : "bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      {trend === "rising" ? (
                        <TrendingUp className="w-4 h-4" aria-hidden="true" />
                      ) : trend === "falling" ? (
                        <TrendingDown className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Minus className="w-4 h-4" aria-hidden="true" />
                      )}
                      {trend === "rising" ? "Rising" : trend === "falling" ? "Falling" : "Steady"}
                    </span>
                  </div>
                </div>
                <div className={`font-sans text-base font-semibold ${gapClass}`}>
                  {Math.abs(dangerGap).toFixed(2)} m {dangerGap >= 0 ? "above" : "below"} the danger
                  mark
                </div>
              </div>

              <LevelGauge
                className="mt-6"
                value={stationValue}
                warningLevel={station.warningLevel}
                dangerLevel={station.dangerLevel}
                level={severityInfo.level}
              />

              <motion.ul
                className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 list-none"
                variants={STAGGER_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                {[
                  {
                    label: "Warning mark",
                    value: `${station.warningLevel.toFixed(2)} m`,
                    note: undefined,
                    dotClass: "bg-tertiary",
                  },
                  {
                    label: "Danger mark",
                    value: `${station.dangerLevel.toFixed(2)} m`,
                    note: undefined,
                    dotClass: "bg-error",
                  },
                  {
                    label: "Highest flood on record",
                    value: station.hfl ? `${station.hfl.toFixed(2)} m` : "Not listed",
                    note: station.hfl ? station.hflDate : undefined,
                    dotClass: "bg-primary",
                  },
                ].map((mark) => (
                  <motion.li
                    key={mark.label}
                    variants={ITEM_VARIANTS}
                    className="rounded-2xl border border-outline-variant/60 bg-surface p-4"
                  >
                    <div className="flex items-center gap-2 font-sans text-sm text-on-surface-variant">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${mark.dotClass}`}
                        aria-hidden="true"
                      />
                      {mark.label}
                    </div>
                    <div className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-1">
                      {mark.value}
                      {mark.note && (
                        <span className="font-sans font-normal text-sm text-on-surface-variant">
                          {" "}
                          · {mark.note}
                        </span>
                      )}
                    </div>
                  </motion.li>
                ))}
              </motion.ul>

              <SourceCitation
                className="mt-6"
                label="Latest reading"
                value={`${stationValue.toFixed(2)} m on the ${station.riverName}`}
                sourceName={station.latestReading.source}
                sourceUrl={station.latestReading.sourceUrl || undefined}
                timestamp={station.latestReading.recordedAt}
                variant="compact"
              />
              <RiverFlowCard stationId={gaugeId} className="mt-4" />
            </motion.section>

            {/* Level over time */}
            <motion.section
              id="hydro-chart-section"
              aria-labelledby="hydro-chart-title"
              className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-8 shadow-elevation-1"
              {...REVEAL_PROPS}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                    <LineChart className="w-4 h-4" aria-hidden="true" />
                    <span>Trend</span>
                  </div>
                  <h2
                    id="hydro-chart-title"
                    className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-2"
                  >
                    Level over time
                  </h2>
                  <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                    The dashed lines show the warning and danger marks.
                  </p>
                </div>

                {/* Time range switcher */}
                <div
                  role="group"
                  aria-label="Time range"
                  className="self-start md:self-auto flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/60"
                >
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.id}
                      type="button"
                      id={`range-${range.id}`}
                      aria-pressed={timeRange === range.id}
                      onClick={() => setTimeRange(range.id)}
                      className={`px-4 min-h-[44px] rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        timeRange === range.id
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="relative w-full h-72 sm:h-96 mt-6" id="recharts-container">
                {loadingHistory ? (
                  <div
                    className="absolute inset-0 rounded-2xl bg-surface-container animate-pulse flex items-center justify-center font-sans text-sm text-on-surface-variant"
                    role="status"
                  >
                    Loading readings…
                  </div>
                ) : (
                  <motion.div
                    key={timeRange}
                    className="w-full h-full"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={filteredReadings}
                        margin={{ top: 16, right: 8, left: -8, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id="waterLevelGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--outline-variant)"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="timestampMs"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={(unixTime) =>
                            new Date(unixTime).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })
                          }
                          stroke="var(--outline)"
                          tick={{ fontSize: 12, fill: "var(--on-surface-variant)" }}
                          tickLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          domain={yDomain}
                          stroke="var(--outline)"
                          tick={{ fontSize: 12, fill: "var(--on-surface-variant)" }}
                          tickFormatter={(val) => `${val} m`}
                          tickLine={false}
                          axisLine={false}
                          width={56}
                        />
                        <Tooltip
                          cursor={{ stroke: "var(--outline)", strokeDasharray: "3 3" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as GaugeReadingHistoryPoint;
                              const dateStr = new Date(data.timestampMs).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Kolkata",
                              });
                              return (
                                <div className="px-3.5 py-2.5 rounded-2xl bg-inverse-surface text-inverse-on-surface font-sans shadow-elevation-3">
                                  <div className="font-bold text-lg leading-tight">
                                    {data.value.toFixed(2)} m
                                  </div>
                                  <div className="text-xs opacity-80 mt-0.5">{dateStr} IST</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={station.warningLevel}
                          stroke="var(--tertiary)"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          label={{
                            value: `Warning ${station.warningLevel.toFixed(2)} m`,
                            position: "insideTopRight",
                            fill: "var(--tertiary)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        />
                        <ReferenceLine
                          y={station.dangerLevel}
                          stroke="var(--error)"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          label={{
                            value: `Danger ${station.dangerLevel.toFixed(2)} m`,
                            position: "insideTopRight",
                            fill: "var(--error)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#waterLevelGradient)"
                          dot={false}
                          activeDot={{
                            r: 5,
                            fill: "var(--primary)",
                            stroke: "var(--surface)",
                            strokeWidth: 2,
                          }}
                          animationDuration={700}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 font-sans text-sm text-on-surface-variant">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-0.5 rounded-full bg-primary" aria-hidden="true" />
                    Water level
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-4 border-t-2 border-dashed border-tertiary"
                      aria-hidden="true"
                    />
                    Warning mark
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-4 border-t-2 border-dashed border-error"
                      aria-hidden="true"
                    />
                    Danger mark
                  </span>
                </div>
                {!loadingHistory && isSampleTrend && (
                  <span
                    id="sample-trend-tag"
                    className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-2.5 py-1.5 rounded-2xl border border-outline-variant"
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                    Example trend, not recorded readings
                  </span>
                )}
              </div>
            </motion.section>

            {/* Alerts */}
            <motion.section
              id="river-alert-cta-banner"
              className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5"
              {...REVEAL_PROPS}
            >
              <div className="flex items-start gap-4">
                <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-sans font-bold text-xl text-on-surface tracking-tight">
                    {ALERTS_ENABLED ? "Get alerts for this gauge" : "Alerts are coming soon"}
                  </h2>
                  <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed mt-1">
                    {ALERTS_ENABLED ? "We notify you" : "Soon you'll be able to get a notification"}{" "}
                    when {station.name} passes its warning mark (
                    {station.warningLevel.toFixed(2)} m) or its danger mark (
                    {station.dangerLevel.toFixed(2)} m).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertModal(true)}
                id="river-cta-get-alerts-btn"
                className="flex-shrink-0 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 active:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {ALERTS_ENABLED ? "Get alerts" : "Alerts coming soon"}
              </button>
            </motion.section>

            {/* Where the marks come from */}
            <motion.section
              id="cwc-attribution-notice"
              className="flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-4 sm:px-5"
              {...REVEAL_PROPS}
            >
              <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="font-sans text-sm text-on-surface-variant leading-relaxed">
                <strong className="font-semibold text-on-surface">
                  Where the marks come from.
                </strong>{" "}
                Warning and danger marks are set by the Central Water Commission and state disaster
                authorities. Nadi-Gati does not calculate or change them.
              </span>
            </motion.section>

            {/* Back & helpline */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Link
                href={district.pageHref ?? "/ghats"}
                className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-surface-container transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft
                  className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
                {district.pageHref ? `Back to ${district.name}` : "All river levels"}
              </Link>
              <a
                href={`tel:${helplineNumber.replace(/[^0-9]/g, "")}`}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-error/40 bg-error/10 text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-error/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
              >
                <Phone className="w-4 h-4 text-error" aria-hidden="true" />
                Helpline {helplineNumber}
              </a>
            </div>
          </div>
        </main>
      </MotionConfig>

      {/* River Alert Subscription Modal */}
      <AlertSubscriptionModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        districtId={district.id}
        districtName={district.name}
        stateName={district.state}
        riverId={station.id}
        riverName={station.riverName}
      />
    </div>
  );
}

const TIME_RANGES = [
  { id: "24h", label: "24 hours" },
  { id: "3d", label: "3 days" },
  { id: "7d", label: "7 days" },
] as const;

const STAGGER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

// Fade a section up the first time it scrolls into view
const REVEAL_PROPS = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};
