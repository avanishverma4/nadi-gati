"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import {
  Waves,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Bell,
  FileText,
  Smartphone,
  CheckCircle2,
  Users,
  Code2,
  Radio,
  TrendingUp,
  Droplets,
  Lock,
  Info,
  Map as MapIcon,
  MapPin,
  AlertCircle,
  ChevronRight,
  Phone,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { FlowingRiverAnimation } from "@/components/flowing-river-animation";
import { AllDistrictsMap } from "@/components/all-districts-map";
import { SeverityChip } from "@/components/severity-chip";
import {
  RIVER_BASIN_SHOWCASE,
  GAUGE_STATIONS,
  PILOT_DISTRICTS_DATA,
  PILOT_GAUGE_STATIONS_DATA,
  calculateStationSeverity,
} from "@/lib/hydrology-data";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";
import { REPO_URL } from "@/lib/site";

const DISTRICT_COUNT = PILOT_DISTRICTS_DATA.length;

// One representative gauge per featured district for the hero preview card
const HERO_SNAPSHOT = [
  "bihar_patna",
  "assam_kamrup_metro",
  "assam_cachar",
  "bihar_muzaffarpur",
].flatMap((districtId) => {
  const district = PILOT_DISTRICTS_DATA.find((d) => d.id === districtId);
  const station = district ? PILOT_GAUGE_STATIONS_DATA[district.stationIds[0]] : undefined;
  if (!district || !station) return [];
  const severity = calculateStationSeverity(
    station.latestReading.value,
    station.warningLevel,
    station.dangerLevel
  );
  return [{ district, station, severity }];
});

const FEATURES = [
  {
    id: "levels",
    icon: Waves,
    title: "River levels at a glance",
    body: "Every gauge shows its current level beside the warning mark, the danger mark and the highest flood on record, so you can see how much room is left.",
    spanClass: "sm:col-span-2",
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Alerts without sign-up",
    body: "Follow a district in one tap and your browser will tell you when its rivers rise. No account, phone number or email.",
    spanClass: "",
    // Remove when ALERTS_ENABLED (lib/features.ts) is switched on
    badge: "Coming soon",
  },
  {
    id: "reports",
    icon: Radio,
    title: "Reports from the ground",
    body: "Share what you see with a photo and a map pin. Reports close to each other back one another up.",
    spanClass: "",
  },
  {
    id: "reservoirs",
    icon: Droplets,
    title: "Reservoir watch",
    body: "See how full the major reservoirs are, so a release upstream does not come as a surprise.",
    spanClass: "",
  },
  {
    id: "pwa",
    icon: Smartphone,
    title: "Light on data",
    body: "Add it to your home screen like an app. It is built to stay usable when the signal is weak.",
    spanClass: "",
  },
  {
    id: "clarity",
    icon: ShieldCheck,
    title: "Clear, not just colourful",
    body: "Every status has its own word as well as a colour, so it reads clearly in bright sun, in dark mode, and for people who are colour-blind.",
    spanClass: "sm:col-span-2 lg:col-span-3 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10",
  },
];

// Short trust summary near the end of the page; /about has the full story
const TRUST_POINTS = [
  {
    id: "independent",
    icon: ShieldCheck,
    title: "Not a government site",
    body: "A community project, not affiliated with any agency. We never issue evacuation orders.",
  },
  {
    id: "sources",
    icon: FileText,
    title: "Sources on every figure",
    body: "Each reading names the agency that published it and when it was recorded.",
  },
  {
    id: "open",
    icon: Code2,
    title: "Free and open source",
    body: REPO_URL
      ? "No fees, adverts or sign-up. The code is public under the MIT licence."
      : "No fees, adverts or sign-up. The code will be published under the MIT licence.",
  },
];

// Scroll-in animation for the closing call-to-action panel
const CTA_PANEL_VARIANTS = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
      delayChildren: 0.2,
      staggerChildren: 0.1,
    },
  },
};

const CTA_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const CTA_ICON_VARIANTS = {
  hidden: { opacity: 0, scale: 0.5 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 15 },
  },
};

// The three gauge statuses, each with its own icon and wording so colour is never the only cue
const STATUS_KEY = [
  {
    level: "normal",
    label: "Normal",
    meaning: "Below the warning mark",
    icon: CheckCircle2,
    tileClass: "bg-success-container",
    iconClass: "text-success",
  },
  {
    level: "watch",
    label: "Watch",
    meaning: "Past the warning mark",
    icon: AlertTriangle,
    tileClass: "bg-tertiary-container",
    iconClass: "text-tertiary",
  },
  {
    level: "danger",
    label: "Danger",
    meaning: "Past the danger mark",
    icon: AlertCircle,
    tileClass: "bg-error-container",
    iconClass: "text-error",
  },
];

const FEATURE_BAR_VARIANTS = {
  hidden: { width: "0%" },
  show: { width: "61%", transition: { duration: 0.9, ease: "easeOut" as const } },
};

const FEATURE_CHIP_VARIANTS = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 18 },
  },
};

const HOW_IT_WORKS_STEPS = [
  {
    id: "collect",
    icon: Waves,
    title: "We gather the readings",
    body: "River levels are collected from official sources and shown gauge by gauge, next to each gauge's warning and danger marks.",
    note: "Source shown on every reading",
  },
  {
    id: "report",
    icon: Users,
    title: "People add what they see",
    body: "Anyone nearby can report a flooded road, a rising river or a damaged embankment with a photo and a map pin. Reports that match others nearby say so.",
    note: "Anonymous, no account needed",
  },
  {
    id: "alert",
    icon: Bell,
    title: "You follow your district",
    body: "Check your district's page whenever you need to. Soon you will also be able to follow it and get a browser alert when a river there crosses the level you choose.",
    note: "Alerts coming soon",
  },
];

// Scroll-in animation for the "How it works" steps: the connector line draws, then each
// step fades up in order and its number pops.
const STEPS_LIST_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

const STEP_LINE_VARIANTS = {
  hidden: { scaleX: 0, opacity: 0 },
  show: { scaleX: 1, opacity: 1, transition: { duration: 0.9, ease: "easeInOut" as const } },
};

const STEP_LINE_VARIANTS_VERTICAL = {
  hidden: { scaleY: 0, opacity: 0 },
  show: { scaleY: 1, opacity: 1, transition: { duration: 0.9, ease: "easeInOut" as const } },
};

const STEP_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, staggerChildren: 0.1 },
  },
};

const STEP_NUMBER_VARIANTS = {
  hidden: { scale: 0.4, opacity: 0 },
  show: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 15 },
  },
};

// Gauge counts by status for the map section
const MAP_STATS = (() => {
  const counts = { danger: 0, watch: 0, normal: 0 };
  for (const station of GAUGE_STATIONS) {
    counts[
      calculateStationSeverity(
        station.latestReading.value,
        station.warningLevel,
        station.dangerLevel
      ).level
    ] += 1;
  }
  return [
    { value: counts.danger, label: "above danger", dotClass: "bg-map-danger" },
    { value: counts.watch, label: "on watch", dotClass: "bg-map-watch" },
    { value: counts.normal, label: "normal", dotClass: "bg-map-normal" },
  ];
})();

// Basin cards: each basin is represented by the first gauge of its featured district.
// The level bar runs from two "steps" below the warning mark to one above the danger mark
// (a step = danger − warning), which pins the warning mark at 50% and the danger mark at 75%.
const BASIN_CARDS = RIVER_BASIN_SHOWCASE.flatMap((basin) => {
  const district = PILOT_DISTRICTS_DATA.find((d) => d.slug === basin.districtSlug);
  const station = district ? PILOT_GAUGE_STATIONS_DATA[district.stationIds[0]] : undefined;
  if (!district || !station) return [];
  const { value } = station.latestReading;
  const step = station.dangerLevel - station.warningLevel || 1;
  const low = station.warningLevel - 2 * step;
  const levelPercent = Math.min(100, Math.max(4, ((value - low) / (4 * step)) * 100));
  return [
    {
      basin,
      district,
      station,
      severity: calculateStationSeverity(value, station.warningLevel, station.dangerLevel),
      levelPercent,
      dangerGap: value - station.dangerLevel,
    },
  ];
});

export default function MarketingLandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  // The call-to-action waves drift only while on screen, and not at all for reduced motion
  const ctaWavesRef = useRef<SVGSVGElement>(null);
  const ctaWavesVisible = useInView(ctaWavesRef, { margin: "100px 0px" });
  const reduceMotion = useReducedMotion();

  // Subtle GSAP entrance: a short upward drift only. Opacity is never animated, because the hero
  // is already painted from the server HTML; fading it from 0 made the text flash, vanish and
  // fade back in after hydration (and delayed the largest paint).
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // fromTo & clearProps so elements always end exactly where the CSS puts them
      gsap.fromTo(
        "#hero-pilot-badge",
        { y: -8 },
        { y: 0, duration: 0.4, ease: "power2.out", clearProps: "all" }
      );
      gsap.fromTo(
        "#hero-headline",
        { y: 14 },
        { y: 0, duration: 0.5, delay: 0.08, ease: "power2.out", clearProps: "all" }
      );
      gsap.fromTo(
        "#hero-hindi-tagline",
        { y: 10 },
        { y: 0, duration: 0.4, delay: 0.12, ease: "power2.out", clearProps: "all" }
      );
      gsap.fromTo(
        "#hero-subheading",
        { y: 12 },
        { y: 0, duration: 0.45, delay: 0.16, ease: "power2.out", clearProps: "all" }
      );
      gsap.fromTo(
        "#hero-cta-group",
        { y: 10 },
        { y: 0, duration: 0.4, delay: 0.2, ease: "power2.out", clearProps: "all" }
      );
      gsap.fromTo(
        "#hero-snapshot-card",
        { y: 16 },
        { y: 0, duration: 0.5, delay: 0.2, ease: "power2.out", clearProps: "all" }
      );
      gsap.fromTo(
        ".hero-trust-box",
        { y: 8 },
        {
          y: 0,
          stagger: 0.04,
          duration: 0.35,
          delay: 0.24,
          ease: "power2.out",
          clearProps: "all",
        }
      );

      // Basin cards drift up one after another
      gsap.fromTo(
        ".basin-showcase-card",
        { y: 14 },
        {
          y: 0,
          stagger: 0.08,
          duration: 0.45,
          delay: 0.1,
          ease: "power2.out",
          clearProps: "all",
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-surface text-on-surface flex flex-col selection:bg-primary-container selection:text-on-primary-container"
    >
      <SiteHeader id="landing-header" />

      <main id="main-content" className="flex-1 flex flex-col">
        {/* =========================================================================
            SECTION: HERO
            ========================================================================= */}
        <section
          id="hero"
          aria-labelledby="hero-headline"
          className="relative overflow-hidden border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface"
        >
          <FlowingRiverAnimation />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 sm:pt-16 sm:pb-32 lg:pt-20 lg:pb-40 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Copy & actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div
                id="hero-pilot-badge"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary-container/50 text-on-primary-container text-xs font-sans font-semibold"
              >
                <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                <span>Pilot preview · Bihar &amp; Assam</span>
              </div>

              <h1
                id="hero-headline"
                className="font-sans font-bold text-3xl sm:text-5xl xl:text-6xl text-on-surface tracking-tight leading-[1.1]"
              >
                Know your river&apos;s level{" "}
                <span className="block text-primary">before the water rises.</span>
              </h1>

              <p
                id="hero-hindi-tagline"
                lang="hi"
                className="font-sans text-base sm:text-lg font-medium text-primary"
              >
                अपने ज़िले की नदी का जलस्तर और बाढ़ की ख़बर — एक ही जगह।
              </p>

              <p
                id="hero-subheading"
                className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-xl mx-auto lg:mx-0 font-sans"
              >
                Nadi-Gati puts river gauge levels, danger marks and community flood reports for your
                district on one simple page. It&apos;s free, open source, and needs no sign-up.
              </p>

              <div
                id="hero-cta-group"
                className="pt-1 grid grid-cols-1 sm:inline-grid sm:grid-cols-2 gap-3"
              >
                <Link
                  href="/districts"
                  id="hero-primary-cta"
                  className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full bg-primary text-on-primary font-sans font-semibold text-base whitespace-nowrap shadow-elevation-2 hover:brightness-110 active:brightness-95 transition-all"
                >
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                  <span>Find your district</span>
                </Link>
                <Link
                  href="/report"
                  id="hero-secondary-cta"
                  className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full border border-outline-variant bg-surface-container text-on-surface font-sans font-semibold text-base whitespace-nowrap hover:bg-surface-container-high transition-all"
                >
                  <AlertCircle className="w-5 h-5 text-error" aria-hidden="true" />
                  <span>Report a flood</span>
                </Link>
              </div>

              {/* Key facts */}
              <ul
                id="hero-trust-metrics"
                className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm font-sans text-on-surface-variant"
              >
                <li className="hero-trust-box inline-flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="font-sans">
                    <strong className="font-sans font-semibold text-on-surface">
                      {GAUGE_STATIONS.length}
                    </strong>{" "}
                    river gauges
                  </span>
                </li>
                <li className="hero-trust-box inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="font-sans">
                    <strong className="font-sans font-semibold text-on-surface">
                      {DISTRICT_COUNT}
                    </strong>{" "}
                    districts
                  </span>
                </li>
                <li className="hero-trust-box inline-flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="font-sans">No sign-up</span>
                </li>
                <li className="hero-trust-box inline-flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="font-sans">Open source</span>
                </li>
              </ul>
            </div>

            {/* River snapshot preview */}
            <aside
              id="hero-snapshot-card"
              aria-labelledby="hero-snapshot-title"
              className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none rounded-3xl border border-outline-variant/70 bg-surface-container-low/90 backdrop-blur-md shadow-elevation-3 overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-outline-variant/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
                  </span>
                  <h2
                    id="hero-snapshot-title"
                    className="font-sans font-bold text-base text-on-surface truncate"
                  >
                    River Snapshot
                  </h2>
                </div>
                <span className="text-xs font-sans font-semibold px-2 py-1 rounded-full border border-outline-variant text-on-surface-variant whitespace-nowrap">
                  Sample data
                </span>
              </div>

              <ul className="divide-y divide-outline-variant/40">
                {HERO_SNAPSHOT.map(({ district, station, severity }) => (
                  <li key={station.id}>
                    <Link
                      href={`/district/${district.slug}`}
                      id={`hero-snapshot-${district.id}`}
                      className="group flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-sans font-semibold text-sm text-on-surface truncate">
                          {district.name}
                          <span className="font-normal text-on-surface-variant">
                            {" "}
                            · {station.riverName}
                          </span>
                        </div>
                        <div className="text-xs font-sans text-on-surface-variant mt-0.5 truncate">
                          {station.latestReading.value.toFixed(2)} m · danger{" "}
                          {station.dangerLevel.toFixed(2)} m
                        </div>
                      </div>
                      <SeverityChip
                        id={`hero-snapshot-status-${district.id}`}
                        severity={severity.level}
                        label={severity.label}
                        size="xs"
                      />
                      <ChevronRight
                        className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform flex-shrink-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="px-5 py-3.5 border-t border-outline-variant/50 flex items-center justify-between gap-3">
                <Link
                  href="/districts"
                  id="hero-snapshot-all-link"
                  className="inline-flex items-center gap-1 text-sm font-sans font-semibold text-primary hover:underline underline-offset-4"
                >
                  <span>See all {DISTRICT_COUNT} districts</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <a
                  href="tel:112"
                  id="hero-emergency-link"
                  className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold text-error hover:underline underline-offset-4 whitespace-nowrap"
                >
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Emergency: 112</span>
                </a>
              </div>
            </aside>
          </div>
        </section>

        {/* =========================================================================
            SECTION: RIVER BASINS WE COVER
            ========================================================================= */}
        <section
          id="monitored-basins"
          aria-labelledby="monitored-basins-title"
          className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10 sm:mb-12">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                  <Waves className="w-4 h-4" aria-hidden="true" />
                  <span>Rivers we cover</span>
                </div>
                <h2
                  id="monitored-basins-title"
                  className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight"
                >
                  Five river basins. One place to check.
                </h2>
                <p className="font-sans text-base sm:text-lg text-on-surface-variant leading-relaxed">
                  Pick a basin to see how its main gauge compares with the warning and danger marks.
                </p>
              </div>
              <span className="self-start md:self-auto inline-flex items-center gap-1.5 text-xs font-sans font-semibold px-2.5 py-1.5 rounded-full border border-outline-variant text-on-surface-variant whitespace-nowrap">
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                Pilot preview · sample data
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {BASIN_CARDS.map(
                ({ basin, district, station, severity, levelPercent, dangerGap }) => (
                  <Link
                    key={basin.id}
                    href={`/district/${district.slug}`}
                    id={`basin-card-${basin.id}`}
                    className="basin-showcase-card group relative flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6 shadow-elevation-1 hover:shadow-elevation-3 hover:border-primary/60 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {/* Basin name & status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center flex-shrink-0">
                          <Waves className="w-5 h-5 text-primary" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-sans font-bold text-lg text-on-surface leading-tight text-balance">
                            {basin.name}
                          </h3>
                          <div className="font-sans text-xs text-on-surface-variant mt-0.5 truncate">
                            <span lang="hi">{basin.hindiName}</span> · {basin.state}
                          </div>
                        </div>
                      </div>
                      <SeverityChip
                        id={`basin-status-${basin.id}`}
                        severity={severity.level}
                        label={severity.label}
                        size="xs"
                      />
                    </div>

                    <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-4 mb-5">
                      {basin.description}
                    </p>

                    {/* Level reading & gauge */}
                    <div className="mt-auto pt-5 border-t border-outline-variant/40">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-sans text-xs text-on-surface-variant truncate">
                            {station.name}
                          </div>
                          <div className="font-sans font-bold text-3xl text-on-surface tracking-tight mt-0.5">
                            {station.latestReading.value.toFixed(2)}
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
                          {Math.abs(dangerGap).toFixed(2)} m {dangerGap >= 0 ? "above" : "below"}
                          <br />
                          danger mark
                        </div>
                      </div>

                      <div
                        className="relative mt-4 h-2.5 rounded-full bg-surface-container-highest"
                        role="img"
                        aria-label={`Level ${station.latestReading.value.toFixed(2)} metres. Warning mark ${station.warningLevel.toFixed(2)} metres, danger mark ${station.dangerLevel.toFixed(2)} metres.`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            severity.level === "danger"
                              ? "bg-error"
                              : severity.level === "watch"
                                ? "bg-tertiary"
                                : "bg-success"
                          }`}
                          style={{ width: `${levelPercent}%` }}
                        />
                        {/* Warning (50%) and danger (75%) marks */}
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
                    </div>

                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-outline-variant/40 flex items-center justify-between gap-3 font-sans text-sm">
                      <span className="text-on-surface-variant">
                        {basin.activeStationsCount} gauges
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        View {district.name}
                        <ArrowRight
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                )
              )}

              {/* All-districts tile fills the grid */}
              <Link
                href="/districts"
                id="view-all-basins-link"
                className="basin-showcase-card group flex flex-col justify-between rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 min-h-[220px] hover:border-primary/70 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="w-11 h-11 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="space-y-2 mt-6">
                  <h3 className="font-sans font-bold text-2xl text-on-surface tracking-tight">
                    Looking for your district?
                  </h3>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
                    Browse all {DISTRICT_COUNT} districts and {GAUGE_STATIONS.length} river gauges
                    across Bihar and Assam.
                  </p>
                  <span className="inline-flex items-center gap-1 pt-2 font-sans font-semibold text-sm text-primary">
                    See all districts
                    <ArrowRight
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION: FLOOD MAP
            ========================================================================= */}
        <section
          id="map-section"
          aria-labelledby="map-section-title"
          className="scroll-mt-16 py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                  <MapIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Flood map</span>
                </div>
                <h2
                  id="map-section-title"
                  className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight"
                >
                  Every river gauge, on one map.
                </h2>
                <p className="font-sans text-base sm:text-lg text-on-surface-variant leading-relaxed">
                  Tap a gauge to see its water level and how close it is to the danger mark. Tap
                  anywhere else to find the nearest river.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {MAP_STATS.map((stat) => (
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
              </div>
            </div>

            <AllDistrictsMap />

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 font-sans text-sm text-on-surface-variant">
                <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Pilot preview. Levels on the map are sample data, not live readings.
              </span>
              <Link
                href="/ghats"
                id="map-section-list-link"
                className="inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4 whitespace-nowrap"
              >
                Prefer a list? View all river levels
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION: HOW IT WORKS
            ========================================================================= */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-title"
          className="scroll-mt-16 py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center space-y-4 mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                <span>How it works</span>
              </div>
              <h2
                id="how-it-works-title"
                className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight text-balance"
              >
                From the river to your phone in three steps
              </h2>
              <p className="font-sans text-base sm:text-lg text-on-surface-variant leading-relaxed">
                No app to install, no account to create, and nothing to pay.
              </p>
            </div>

            {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
            <MotionConfig reducedMotion="user">
              <motion.ol
                className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6 lg:gap-8 list-none"
                variants={STEPS_LIST_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
              >
                {/* Connector: runs across on desktop, down the left edge on phones */}
                <motion.span
                  aria-hidden="true"
                  className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60 origin-left"
                  variants={STEP_LINE_VARIANTS}
                />
                <motion.span
                  aria-hidden="true"
                  className="md:hidden absolute top-6 bottom-6 left-6 w-0.5 -translate-x-1/2 bg-primary/30 origin-top"
                  variants={STEP_LINE_VARIANTS_VERTICAL}
                />

                {HOW_IT_WORKS_STEPS.map((step, index) => (
                  <motion.li
                    key={step.id}
                    id={`how-step-${index + 1}`}
                    className="relative flex md:flex-col md:items-center gap-4 md:gap-6"
                    variants={STEP_ITEM_VARIANTS}
                  >
                    <motion.span
                      className="relative z-10 w-12 h-12 rounded-full bg-primary text-on-primary font-sans font-bold text-lg flex items-center justify-center flex-shrink-0 ring-8 ring-surface"
                      variants={STEP_NUMBER_VARIANTS}
                    >
                      {index + 1}
                    </motion.span>

                    <motion.div
                      className="group flex-1 w-full flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                      whileHover={{ y: -4 }}
                    >
                      <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                        <step.icon
                          className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                          aria-hidden="true"
                        />
                      </span>
                      <h3 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-4">
                        {step.title}
                      </h3>
                      <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2 mb-5">
                        {step.body}
                      </p>
                      <div className="mt-auto pt-4 border-t border-outline-variant/40 flex items-center gap-2 font-sans text-sm font-medium text-primary">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{step.note}</span>
                      </div>
                    </motion.div>
                  </motion.li>
                ))}
              </motion.ol>
            </MotionConfig>
          </div>
        </section>

        {/* =========================================================================
            SECTION: FEATURES
            ========================================================================= */}
        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-16 py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-4 mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
                <Smartphone className="w-4 h-4" aria-hidden="true" />
                <span>Features</span>
              </div>
              <h2
                id="features-title"
                className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight text-balance"
              >
                Made for the moment you need it
              </h2>
              <p className="font-sans text-base sm:text-lg text-on-surface-variant leading-relaxed">
                Simple enough to use in a hurry, on any phone, even when the signal is weak.
              </p>
            </div>

            {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
            <MotionConfig reducedMotion="user">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
              >
                {FEATURES.map((feature) => (
                  <motion.article
                    key={feature.id}
                    id={`feature-card-${feature.id}`}
                    className={`group flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-7 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200 ${feature.spanClass}`}
                    variants={RISE_TILE_VARIANTS}
                    whileHover={{ y: -4 }}
                  >
                    <div className={feature.id === "clarity" ? "lg:col-span-4" : undefined}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center">
                          <feature.icon
                            className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                            aria-hidden="true"
                          />
                        </span>
                        {"badge" in feature && feature.badge && (
                          <span className="font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary-container whitespace-nowrap">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-5">
                        {feature.title}
                      </h3>
                      <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2 max-w-xl">
                        {feature.body}
                      </p>
                    </div>

                    {/* Illustration: a gauge level bar that fills as the tile scrolls in */}
                    {feature.id === "levels" && (
                      <div className="mt-auto pt-8" aria-hidden="true">
                        <div className="flex items-end justify-between font-sans">
                          <span className="font-bold text-3xl text-on-surface tracking-tight">
                            48.90
                            <span className="font-medium text-base text-on-surface-variant">
                              {" "}
                              m
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-tertiary">
                            0.55 m below danger mark
                          </span>
                        </div>
                        <div className="relative mt-3 h-2.5 rounded-full bg-surface-container-highest">
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full bg-tertiary"
                            variants={FEATURE_BAR_VARIANTS}
                          />
                          <span className="absolute -inset-y-1 left-1/2 w-0.5 rounded-full bg-tertiary" />
                          <span className="absolute -inset-y-1 left-3/4 w-0.5 rounded-full bg-error" />
                        </div>
                        <div className="relative mt-2 h-4 font-sans text-xs text-on-surface-variant">
                          <span className="absolute left-1/2 -translate-x-1/2">Warning</span>
                          <span className="absolute left-3/4 -translate-x-1/2">Danger</span>
                        </div>
                      </div>
                    )}

                    {/* Illustration: what each status means, with a label and an icon as well as a colour */}
                    {feature.id === "clarity" && (
                      <div className="lg:col-span-8 mt-6 lg:mt-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {STATUS_KEY.map((status) => (
                          <motion.div
                            key={status.level}
                            className="rounded-2xl border border-outline-variant/60 bg-surface p-4 flex sm:flex-col items-center sm:items-start gap-3"
                            variants={FEATURE_CHIP_VARIANTS}
                          >
                            <span
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${status.tileClass}`}
                            >
                              <status.icon
                                className={`w-5 h-5 ${status.iconClass}`}
                                aria-hidden="true"
                              />
                            </span>
                            <div className="min-w-0">
                              <div className="font-sans font-bold text-base text-on-surface leading-tight">
                                {status.label}
                              </div>
                              <div className="font-sans text-sm text-on-surface-variant leading-snug mt-0.5">
                                {status.meaning}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.article>
                ))}
              </motion.div>
            </MotionConfig>
          </div>
        </section>

        {/* =========================================================================
            SECTION: ABOUT THE PROJECT (the longer story lives on /about)
            ========================================================================= */}
        <section
          id="about-strip"
          aria-labelledby="about-strip-title"
          className="py-16 sm:py-20 bg-surface border-b border-outline-variant/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <MotionConfig reducedMotion="user">
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                <motion.div className="lg:col-span-4 space-y-4" variants={RISE_TILE_VARIANTS}>
                  <h2
                    id="about-strip-title"
                    className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight text-balance"
                  >
                    Independent, open and honest about its data
                  </h2>
                  <Link
                    href="/about"
                    id="about-strip-link"
                    className="inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                  >
                    Read about the project
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </motion.div>

                <ul className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 list-none">
                  {TRUST_POINTS.map((point) => (
                    <motion.li
                      key={point.id}
                      id={`trust-${point.id}`}
                      className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6"
                      variants={RISE_TILE_VARIANTS}
                    >
                      <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                        <point.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </span>
                      <h3 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                        {point.title}
                      </h3>
                      <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1">
                        {point.body}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </MotionConfig>
          </div>
        </section>

        {/* =========================================================================
            SECTION: FINAL CTA
            ========================================================================= */}
        <section
          id="final-cta"
          aria-labelledby="final-cta-headline"
          className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
            <MotionConfig reducedMotion="user">
              <motion.div
                className="relative overflow-hidden rounded-[2rem] bg-primary text-on-primary px-6 py-14 sm:px-10 sm:py-20 text-center shadow-elevation-3"
                variants={CTA_PANEL_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
              >
                {/* Drifting water lines along the bottom edge */}
                <svg
                  ref={ctaWavesRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 w-[200%] min-w-[1600px] h-24 sm:h-32 text-on-primary"
                  viewBox="0 0 2880 120"
                  preserveAspectRatio="none"
                  style={
                    reduceMotion
                      ? undefined
                      : {
                          animation: "nadi-river-drift 30s linear infinite",
                          animationPlayState: ctaWavesVisible ? "running" : "paused",
                        }
                  }
                >
                  <path
                    d="M0,70 Q360,20 720,70 T1440,70 T2160,70 T2880,70 L2880,120 L0,120 Z"
                    fill="currentColor"
                    fillOpacity="0.08"
                  />
                  <path
                    d="M0,90 Q180,60 360,90 T720,90 T1080,90 T1440,90 T1800,90 T2160,90 T2520,90 T2880,90 L2880,120 L0,120 Z"
                    fill="currentColor"
                    fillOpacity="0.1"
                  />
                </svg>

                <div className="relative max-w-2xl mx-auto">
                  <motion.span
                    className="w-14 h-14 rounded-2xl bg-on-primary/15 mx-auto flex items-center justify-center"
                    variants={CTA_ICON_VARIANTS}
                  >
                    <Waves className="w-7 h-7" aria-hidden="true" />
                  </motion.span>

                  <motion.h2
                    id="final-cta-headline"
                    className="font-sans font-bold text-3xl sm:text-5xl text-on-primary tracking-tight leading-[1.1] text-balance mt-6"
                    variants={CTA_ITEM_VARIANTS}
                  >
                    See what your river is doing
                  </motion.h2>

                  <motion.p
                    id="final-cta-subtitle"
                    className="font-sans text-base sm:text-lg text-on-primary leading-relaxed mt-4"
                    variants={CTA_ITEM_VARIANTS}
                  >
                    Find your district to check its river levels, or tell others what you are seeing
                    on the ground.
                  </motion.p>

                  <motion.div
                    className="mt-8 grid grid-cols-1 sm:inline-grid sm:grid-cols-2 gap-3"
                    variants={CTA_ITEM_VARIANTS}
                  >
                    <Link
                      href="/districts"
                      id="final-cta-check-district-btn"
                      className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full bg-surface text-on-surface font-sans font-semibold text-base whitespace-nowrap shadow-elevation-2 hover:-translate-y-0.5 hover:shadow-elevation-3 active:translate-y-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    >
                      <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
                      <span>Find your district</span>
                    </Link>
                    <Link
                      href="/report"
                      id="final-cta-report-flood-btn"
                      className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full border border-on-primary/40 bg-on-primary/10 text-on-primary font-sans font-semibold text-base whitespace-nowrap hover:bg-on-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                    >
                      <AlertCircle className="w-5 h-5" aria-hidden="true" />
                      <span>Report a flood</span>
                    </Link>
                  </motion.div>

                  {/* Emergency helplines */}
                  <motion.div
                    id="final-cta-emergency-notice"
                    className="mt-8 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 rounded-full bg-on-primary/10 font-sans text-sm"
                    variants={CTA_ITEM_VARIANTS}
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    <span>In an emergency, call</span>
                    <a
                      href="tel:112"
                      className="font-bold underline underline-offset-4 hover:no-underline"
                    >
                      112
                    </a>
                    <span>or</span>
                    <a
                      href="tel:1078"
                      className="font-bold underline underline-offset-4 hover:no-underline"
                    >
                      1078
                    </a>
                  </motion.div>
                </div>
              </motion.div>
            </MotionConfig>
          </div>
        </section>
      </main>
    </div>
  );
}
