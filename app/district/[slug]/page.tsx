"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Share2,
  Phone,
  Bell,
  Waves,
  CloudRain,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Info,
  Users,
  Map as MapIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SeverityChip } from "@/components/severity-chip";
import { LevelGauge } from "@/components/level-gauge";
import { SourceCitation } from "@/components/source-citation";
import { RiverFlowCard } from "@/components/river-flow-card";
import { AlertSubscriptionModal } from "@/components/alert-subscription-modal";
import { ALERTS_ENABLED } from "@/lib/features";
import { OfflineCachedBadge } from "@/components/offline-status-banner";
import { DistrictHydrologyMap } from "@/components/district-hydrology-map";
import {
  PILOT_DISTRICTS_DATA,
  PILOT_GAUGE_STATIONS_DATA,
  PILOT_RESERVOIRS_DATA,
  calculateStationSeverity,
  formatRelativeTime,
  DistrictData,
  GaugeStationData,
  ReservoirData,
  CitizenReportData,
  isLevelReading,
  pickHeadlineStation,
  toIsoTimestamp,
} from "@/lib/hydrology-data";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export default function DistrictDashboardPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "bihar_patna";

  // Unknown URLs get the 404 page rather than silently showing Patna
  if (!PILOT_DISTRICTS_DATA.some((d) => d.slug === slug || d.id === slug)) {
    notFound();
  }

  // The check above guarantees a match; the fallback only satisfies the type
  const district: DistrictData = useMemo(() => {
    return (
      PILOT_DISTRICTS_DATA.find((d) => d.slug === slug || d.id === slug) || PILOT_DISTRICTS_DATA[0]
    );
  }, [slug]);

  // Headline gauge: the district's most serious one, so the status never understates it
  const stationId =
    pickHeadlineStation(district.stationIds)?.station.id ?? "station_ganga_dighaghat";
  const initialStation: GaugeStationData =
    PILOT_GAUGE_STATIONS_DATA[stationId] || PILOT_GAUGE_STATIONS_DATA.station_ganga_dighaghat;

  const reservoirId = district.reservoirIds[0];
  const initialReservoir: ReservoirData | undefined = reservoirId
    ? PILOT_RESERVOIRS_DATA[reservoirId]
    : undefined;

  // Start from the built-in pilot data; the listeners below replace it with stored values
  const [stationData, setStationData] = useState<GaugeStationData>(initialStation);
  const [reservoirData, setReservoirData] = useState<ReservoirData | undefined>(initialReservoir);
  // Rainfall and reports start empty: they are only shown once a real record arrives, so a
  // placeholder figure or a made-up report is never presented as current
  const [rainfallMm, setRainfallMm] = useState<number | null>(null);
  const [rainfallSource, setRainfallSource] = useState<string>("Open-Meteo");
  const [rainfallRecordedAt, setRainfallRecordedAt] = useState<string | null>(null);
  const [nearbyReports, setNearbyReports] = useState<CitizenReportData[]>([]);
  const [reportsStatus, setReportsStatus] = useState<"loading" | "loaded" | "error">("loading");

  const [copiedNotification, setCopiedNotification] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // 1. The headline gauge's latest reading. Only the gauge document is read, never its readings
  // subcollection: the full history is loaded on the gauge's own page.
  useEffect(() => {
    if (!stationId) return;

    try {
      const stationRef = doc(db, "gaugeStations", stationId);
      const unsubscribe = onSnapshot(
        stationRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (isLevelReading(data.latestReading)) {
              setStationData((prev) => ({
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
          // Offline or blocked: the built-in reading stays on screen
        }
      );

      return () => unsubscribe();
    } catch {
      // Same: keep what's already on screen
    }
  }, [stationId]);

  // 2. The district's monitored reservoir, if it has one (one document)
  useEffect(() => {
    if (!reservoirId) return;

    try {
      const resRef = doc(db, "reservoirs", reservoirId);
      const unsubscribe = onSnapshot(
        resRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (isLevelReading(data.latestReading)) {
              setReservoirData((prev) => {
                if (!prev) return prev;
                return {
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
                };
              });
            }
          }
        },
        () => {
          // Offline or blocked: keep the built-in reservoir figures
        }
      );

      return () => unsubscribe();
    } catch {
      // Same: keep what's already on screen
    }
  }, [reservoirId]);

  // 3. Rain in the last 24 hours, written to the district document by the Open-Meteo ingestion
  useEffect(() => {
    try {
      const districtRef = doc(db, "districts", district.id);
      const unsubscribe = onSnapshot(
        districtRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (typeof data.latestRainfallMm === "number") {
              setRainfallMm(data.latestRainfallMm);
            }
            if (data.rainfallSource) {
              setRainfallSource(data.rainfallSource);
            }
            if (data.rainfallRecordedAt) {
              setRainfallRecordedAt(toIsoTimestamp(data.rainfallRecordedAt));
            }
          }
        },
        () => {
          // Offline or blocked: the card keeps saying there's no reading yet
        }
      );

      return () => unsubscribe();
    } catch {
      // Same: keep what's already on screen
    }
  }, [district.id]);

  // 4. The district's most recent reports from the last week, newest first
  useEffect(() => {
    async function loadReports() {
      setReportsStatus("loading");
      try {
        const since = Timestamp.fromMillis(Date.now() - RECENT_REPORTS_WINDOW_MS);
        const q = query(
          collection(db, "reports"),
          where("districtId", "==", district.id),
          where("createdAt", ">=", since),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const querySnap = await getDocs(q);
        const fetchedReports: CitizenReportData[] = [];
        querySnap.forEach((d) => {
          const rData = d.data();
          fetchedReports.push({
            id: d.id,
            category: rData.category || "general_alert",
            description: rData.description || "",
            photoUrl: rData.photoUrl,
            latitude: rData.location?.latitude || district.latitude,
            longitude: rData.location?.longitude || district.longitude,
            geohash: rData.geohash || "",
            createdAt: rData.createdAt?.toDate
              ? rData.createdAt.toDate().toISOString()
              : rData.createdAt || new Date().toISOString(),
            // A report without a stored confidence hasn't been matched yet
            confidence: rData.confidence ?? 0,
            districtId: district.id,
          });
        });
        setNearbyReports(fetchedReports);
        setReportsStatus("loaded");
      } catch {
        // Never fill the gap with sample reports: made-up flooding must not look real
        setNearbyReports([]);
        setReportsStatus("error");
      }
    }

    loadReports();
  }, [district.id, district.latitude, district.longitude]);

  // Native share sheet where the phone has one, otherwise copy the link
  const handleShare = async () => {
    const shareData = {
      title: `${district.name} river levels | Nadi-Gati`,
      text: `River levels and flood reports for ${district.name}, ${district.state} on Nadi-Gati.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Closing the share sheet rejects with AbortError: the person chose not to share, so
        // don't copy the link behind their back. Any other failure falls back to copying.
        if (err instanceof DOMException && err.name === "AbortError") return;
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    } catch {
      // Clipboard blocked (e.g. no permission): nothing more we can do
    }
  };

  const stationValue = stationData.latestReading.value;
  const severityInfo = calculateStationSeverity(
    stationValue,
    stationData.warningLevel,
    stationData.dangerLevel
  );

  // Reservoir fill, only for districts that have a monitored reservoir
  const reservoirPercent = reservoirData
    ? Math.min(
        100,
        Math.round((reservoirData.latestReading.value / reservoirData.dangerLevel) * 100)
      )
    : null;

  const primaryHelpline = district.helplineNumbers[0] || {
    title: "State Emergency Operation Centre",
    number: "1070",
    type: "state_control_room",
  };

  const dangerGap = stationValue - stationData.dangerLevel;
  const trend = stationData.latestReading.trend;
  const statusHeadline =
    severityInfo.level === "danger"
      ? "The river is above the danger mark"
      : severityInfo.level === "watch"
        ? "The river is above the warning mark"
        : "The river is below the warning mark";
  const rainfallLabel =
    rainfallMm === null
      ? null
      : rainfallMm > 64.5
        ? "Heavy rain"
        : rainfallMm > 15.5
          ? "Moderate rain"
          : "Light rain";

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <SiteHeader id="district-header" />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1">
          {/* District header */}
          <section className="border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface">
            <motion.div
              className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-8 sm:pb-10"
              initial="hidden"
              animate="show"
              variants={STAGGER_VARIANTS}
            >
              <motion.div variants={ITEM_VARIANTS}>
                <Link
                  href="/districts"
                  id="back-to-districts-btn"
                  className="group inline-flex items-center gap-1.5 min-h-[44px] -ml-1 pr-3 pl-1 rounded-full font-sans text-sm font-medium text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ArrowLeft
                    className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                  All districts
                </Link>
              </motion.div>

              <div className="mt-2 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="min-w-0">
                  <motion.div
                    className="flex flex-wrap items-center gap-3"
                    variants={ITEM_VARIANTS}
                  >
                    <h1
                      id="dashboard-district-title"
                      className="font-sans font-bold text-4xl sm:text-5xl text-on-surface tracking-tight"
                    >
                      {district.name}
                    </h1>
                    <SeverityChip
                      id="district-header-status"
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
                      {district.state} · {district.primaryRiver}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-2.5 py-1.5 rounded-full border border-outline-variant whitespace-nowrap">
                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      Pilot preview · sample data
                    </span>
                    <OfflineCachedBadge />
                  </motion.div>
                </div>

                {/* Actions */}
                <motion.div
                  className="relative flex flex-wrap items-center gap-3"
                  variants={ITEM_VARIANTS}
                >
                  <button
                    type="button"
                    onClick={() => setShowAlertModal(true)}
                    id="dashboard-header-alerts-btn"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 active:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <Bell className="w-4 h-4" aria-hidden="true" />
                    {ALERTS_ENABLED ? "Get alerts" : "Alerts coming soon"}
                  </button>
                  <button
                    onClick={handleShare}
                    id="share-district-btn"
                    type="button"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-surface-container transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Share the ${district.name} page`}
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    Share
                  </button>

                  {copiedNotification && (
                    <motion.div
                      id="copied-toast"
                      role="status"
                      className="absolute left-0 lg:left-auto lg:right-0 top-14 px-4 py-2 rounded-full bg-inverse-surface text-inverse-on-surface font-sans text-sm shadow-elevation-2 whitespace-nowrap z-50"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      Link copied
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </section>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">
            {/* River level */}
            <motion.section
              id="district-status-card"
              aria-labelledby="district-status-title"
              className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-8 shadow-elevation-1"
              {...REVEAL_PROPS}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                <div className="lg:col-span-6">
                  <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                    <Waves className="w-4 h-4" aria-hidden="true" />
                    <span>River level</span>
                  </div>
                  <h2
                    id="district-status-title"
                    className="font-sans font-bold text-2xl sm:text-3xl text-on-surface tracking-tight mt-3 text-balance"
                    aria-live="polite"
                  >
                    {statusHeadline}
                  </h2>
                  <p className="text-base text-on-surface-variant leading-relaxed mt-3">
                    {stationData.name} is at {stationValue.toFixed(2)} m. That is{" "}
                    {Math.abs(dangerGap).toFixed(2)} m {dangerGap >= 0 ? "above" : "below"} its
                    danger mark of {stationData.dangerLevel.toFixed(2)} m.
                  </p>
                  <Link
                    href={`/district/${district.slug}/river/${stationId}`}
                    id={`gauge-detail-link-${stationId}`}
                    className="group mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-surface-container transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    View level trend
                    <ArrowRight
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      aria-hidden="true"
                    />
                  </Link>
                </div>

                <div
                  id="metric-river-level"
                  className="lg:col-span-6 rounded-2xl border border-outline-variant/60 bg-surface p-5 sm:p-6"
                >
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-sans text-sm text-on-surface-variant truncate">
                        {stationData.name}
                      </div>
                      <div className="font-sans font-bold text-5xl text-on-surface tracking-tight mt-1">
                        {stationValue.toFixed(2)}
                        <span className="font-medium text-xl text-on-surface-variant"> m</span>
                      </div>
                    </div>
                    <span
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

                  <LevelGauge
                    className="mt-5"
                    value={stationValue}
                    warningLevel={stationData.warningLevel}
                    dangerLevel={stationData.dangerLevel}
                    level={severityInfo.level}
                  />

                  {stationData.hfl && (
                    <div className="mt-5 pt-4 border-t border-outline-variant/40 flex items-center justify-between gap-3 font-sans text-sm">
                      <span className="text-on-surface-variant">Highest flood on record</span>
                      <span className="font-semibold text-on-surface whitespace-nowrap">
                        {stationData.hfl.toFixed(2)} m
                        {stationData.hflDate && (
                          <span className="font-normal text-on-surface-variant">
                            {" "}
                            · {stationData.hflDate}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <SourceCitation
                className="mt-6"
                label="Latest reading"
                value={`${stationValue.toFixed(2)} m on the ${stationData.riverName}`}
                sourceName={stationData.latestReading.source}
                sourceUrl={stationData.latestReading.sourceUrl || undefined}
                timestamp={stationData.latestReading.recordedAt}
                variant="compact"
              />
              <RiverFlowCard stationId={stationId} className="mt-4" />
            </motion.section>

            {/* Rainfall & reservoir */}
            <section
              id="three-metrics-grid"
              className={`grid grid-cols-1 gap-5 sm:gap-6 ${reservoirData ? "md:grid-cols-2" : ""}`}
            >
              <motion.div
                id="metric-24h-rainfall"
                className="group rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                {...REVEAL_PROPS}
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                    <CloudRain
                      className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      aria-hidden="true"
                    />
                  </span>
                  {rainfallMm !== null && (
                    <span
                      className={`font-sans text-xs font-semibold px-2.5 py-1 rounded-full ${
                        rainfallMm > 64.5
                          ? "bg-error-container text-on-error-container"
                          : rainfallMm > 15.5
                            ? "bg-tertiary-container text-on-tertiary-container"
                            : "bg-success-container text-on-success-container"
                      }`}
                    >
                      {rainfallLabel}
                    </span>
                  )}
                </div>
                <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                  Rain in the last 24 hours
                </h2>
                <div className="font-sans font-bold text-4xl text-on-surface tracking-tight mt-1">
                  {rainfallMm !== null ? rainfallMm.toFixed(1) : "—"}
                  {rainfallMm !== null && (
                    <span className="font-medium text-lg text-on-surface-variant"> mm</span>
                  )}
                </div>
                <div
                  className="mt-4 pt-4 border-t border-outline-variant/40 font-sans text-sm text-on-surface-variant truncate"
                  suppressHydrationWarning
                >
                  {rainfallMm === null
                    ? "No rainfall reading yet"
                    : `${rainfallSource} · ${
                        rainfallRecordedAt
                          ? formatRelativeTime(rainfallRecordedAt)
                          : "time not recorded"
                      }`}
                </div>
              </motion.div>

              {reservoirData && reservoirPercent !== null && (
                <motion.div
                  id="metric-reservoir-storage"
                  className="group rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                  {...REVEAL_PROPS}
                  whileHover={{ y: -4 }}
                >
                  <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                    <Database
                      className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      aria-hidden="true"
                    />
                  </span>
                  <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                    {reservoirData.name}
                  </h2>
                  <div className="font-sans font-bold text-4xl text-on-surface tracking-tight mt-1">
                    {reservoirPercent}
                    <span className="font-medium text-lg text-on-surface-variant">% full</span>
                  </div>
                  <div
                    className="mt-4 h-2.5 rounded-full bg-surface-container-highest overflow-hidden"
                    role="img"
                    aria-label={`Reservoir is ${reservoirPercent} percent full`}
                  >
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: "0%" }}
                      whileInView={{ width: `${reservoirPercent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-outline-variant/40 font-sans text-sm text-on-surface-variant">
                    Level {reservoirData.latestReading.value} m of {reservoirData.dangerLevel} m
                    when full
                  </div>
                </motion.div>
              )}
            </section>

            {/* Map */}
            <motion.section
              id="district-reach-map-section"
              className="flex flex-col gap-4"
              {...REVEAL_PROPS}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                    <MapIcon className="w-4 h-4" aria-hidden="true" />
                    <span>Map</span>
                  </div>
                  <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-2">
                    Gauges in {district.name}
                  </h2>
                  <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                    Tap a gauge to see its level.
                  </p>
                </div>
                <Link
                  href="/ghats"
                  className="group inline-flex items-center gap-1 min-h-[44px] font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                >
                  All river levels
                  <ArrowRight
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <DistrictHydrologyMap district={district} primaryStationId={stationId} />
            </motion.section>

            {/* Community reports */}
            <motion.section
              id="nearby-reports-section"
              className="flex flex-col gap-4"
              {...REVEAL_PROPS}
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                    <Users className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {nearbyReports.length} {nearbyReports.length === 1 ? "report" : "reports"}
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-2">
                    Reports from people nearby
                  </h2>
                  <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                    Sent in by people in {district.name}. These are not official readings.
                  </p>
                </div>
                <Link
                  href="/report"
                  id="dashboard-header-report-btn"
                  className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-error text-on-error font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 active:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  Report a flood
                </Link>
              </div>

              {nearbyReports.length === 0 ? (
                <div
                  id="no-reports-card"
                  className="py-10 px-6 text-center rounded-3xl border border-dashed border-outline-variant bg-surface-container-low"
                >
                  {/* Neutral, not a green tick: no reports doesn't mean there's no flooding */}
                  <span className="w-12 h-12 rounded-2xl bg-surface-container-high mx-auto flex items-center justify-center">
                    <Users className="w-6 h-6 text-on-surface-variant" aria-hidden="true" />
                  </span>
                  <h3
                    className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4"
                    role={reportsStatus === "error" ? "alert" : undefined}
                  >
                    {reportsStatus === "loading"
                      ? "Loading reports…"
                      : reportsStatus === "error"
                        ? "Couldn't load reports"
                        : "No reports this week"}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {reportsStatus === "error"
                      ? "Check your connection and reload the page. This doesn't mean there's no flooding."
                      : reportsStatus === "loading"
                        ? "\u00a0"
                        : `Nobody has reported flooding in ${district.name} in the last 7 days. That doesn't mean there's none; check the river levels above.`}
                  </p>
                </div>
              ) : (
                <motion.ul
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none"
                  variants={STAGGER_VARIANTS}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.1 }}
                >
                  {nearbyReports.map((report) => {
                    const confidencePct = Math.round(report.confidence * 100);
                    const backing =
                      confidencePct >= 80
                        ? {
                            label: "Backed by other reports",
                            className: "bg-success-container text-on-success-container",
                          }
                        : confidencePct >= 50
                          ? {
                              label: "Partly backed",
                              className: "bg-tertiary-container text-on-tertiary-container",
                            }
                          : {
                              label: "Unconfirmed",
                              className: "bg-surface-container-highest text-on-surface-variant",
                            };

                    return (
                      <motion.li
                        key={report.id}
                        id={`report-item-${report.id}`}
                        variants={ITEM_VARIANTS}
                        className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 flex flex-col"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-tertiary" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-sans font-bold text-base text-on-surface capitalize leading-tight">
                              {report.category.replace(/_/g, " ")}
                            </div>
                            <div
                              className="font-sans text-sm text-on-surface-variant mt-0.5"
                              suppressHydrationWarning
                            >
                              {formatRelativeTime(report.createdAt)}
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-on-surface-variant leading-relaxed mt-3 mb-4 line-clamp-3">
                          {report.description}
                        </p>
                        <span
                          className={`mt-auto self-start font-sans text-xs font-semibold px-2.5 py-1 rounded-full ${backing.className}`}
                        >
                          {backing.label}
                        </span>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </motion.section>

            {/* Helplines */}
            <motion.section
              id="district-contacts-card"
              aria-labelledby="district-contacts-title"
              className="rounded-3xl border border-error/30 bg-error-container/20 p-5 sm:p-8"
              {...REVEAL_PROPS}
              // Helplines are rendered visible from the server, never faded in
              initial={false}
            >
              <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-error uppercase">
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>Emergency</span>
              </div>
              <h2
                id="district-contacts-title"
                className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-2"
              >
                Helplines for {district.name}
              </h2>
              <p className="text-sm sm:text-base text-on-surface-variant mt-1">
                Tap a number to call. In a life-threatening emergency, call 112.
              </p>
              <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
                {district.helplineNumbers.map((hl, idx) => (
                  <li key={idx}>
                    <a
                      href={`tel:${hl.number.replace(/[^0-9]/g, "")}`}
                      className="group flex items-center gap-3.5 rounded-2xl border border-outline-variant/60 bg-surface p-4 min-h-[72px] hover:border-error/60 hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    >
                      <span className="w-11 h-11 rounded-xl bg-error/15 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-error" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans font-bold text-lg text-on-surface leading-tight">
                          {hl.number}
                        </span>
                        <span className="block font-sans text-sm text-on-surface-variant leading-snug mt-0.5 truncate">
                          {hl.title}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.section>
          </div>
        </main>
      </MotionConfig>

      {/* Bottom bar on phones and tablets: call the helpline or get alerts */}
      <div
        id="dashboard-sticky-bar"
        className="lg:hidden sticky bottom-0 z-30 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/60 py-3 px-4 sm:px-6"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-3">
          <a
            href={`tel:${primaryHelpline.number.replace(/[^0-9]/g, "")}`}
            id="bottom-helpline-button"
            className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-surface-container transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Call helpline ${primaryHelpline.number}`}
          >
            <Phone className="w-4 h-4 text-primary" aria-hidden="true" />
            Call helpline
          </a>
          <button
            onClick={() => setShowAlertModal(true)}
            id="bottom-get-alerts-button"
            type="button"
            className="inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {ALERTS_ENABLED ? "Get alerts" : "Alerts soon"}
          </button>
        </div>
      </div>

      {/* Alert Subscription Modal */}
      <AlertSubscriptionModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        districtId={district.id}
        districtName={district.name}
        stateName={district.state}
      />
    </div>
  );
}

const STAGGER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

// How far back the district page looks for community reports
const RECENT_REPORTS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Fade a section up the first time it scrolls into view
const REVEAL_PROPS = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};
