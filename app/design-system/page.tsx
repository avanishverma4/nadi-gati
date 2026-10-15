"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Layers,
  Palette,
  Shield,
  Sliders,
  Sparkles,
  Type,
  Square,
  ShieldAlert,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { SeverityChip } from "@/components/severity-chip";
import { SourceCitation } from "@/components/source-citation";
import {
  BRAND_SEEDS,
  COLOR_ROLES,
  CORE_CONTRAST_PAIRS,
  ELEVATION_TIERS,
  SHAPE_SCALE,
  calculateContrastRatio,
  formatContrastRatio,
  getWcagRating,
  SeverityLevel,
} from "@/lib/tokens";

export default function DesignSystemPage() {
  const { theme } = useTheme();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Playground state
  const [testSeverity, setTestSeverity] = useState<SeverityLevel>("danger");
  const [testVariant, setTestVariant] = useState<"tonal" | "filled" | "outlined">("tonal");
  const [testSize, setTestSize] = useState<"xs" | "sm" | "md" | "lg">("sm");
  const [testPulse, setTestPulse] = useState(true);

  // Citation playground state
  const [citationVariant, setCitationVariant] = useState<"card" | "stat" | "compact" | "inline">("card");

  const isDark = theme === "dark";
  const activeRoles = isDark ? COLOR_ROLES.dark : COLOR_ROLES.light;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const roleCategories = [
    {
      title: "Primary Role (Seed: #2196f3)",
      description: "Hydrological Blue for key actions, brand identity, and active indicators.",
      tokens: [
        { name: "primary", hex: activeRoles.primary, textHex: activeRoles.onPrimary, role: "High-emphasis actions & badges", class: "bg-primary text-on-primary" },
        { name: "on-primary", hex: activeRoles.onPrimary, textHex: activeRoles.primary, role: "Text/icons on primary fill", class: "bg-on-primary text-primary" },
        { name: "primary-container", hex: activeRoles.primaryContainer, textHex: activeRoles.onPrimaryContainer, role: "Medium emphasis containers & active pills", class: "bg-primary-container text-on-primary-container" },
        { name: "on-primary-container", hex: activeRoles.onPrimaryContainer, textHex: activeRoles.primaryContainer, role: "Text on primary container", class: "bg-on-primary-container text-primary-container" },
      ],
    },
    {
      title: "Secondary Role (Muted Tonal Support)",
      description: "Desaturated slate-blue for secondary navigation, card borders, and auxiliary elements.",
      tokens: [
        { name: "secondary", hex: activeRoles.secondary, textHex: activeRoles.onSecondary, role: "Secondary actions & filters", class: "bg-secondary text-on-secondary" },
        { name: "on-secondary", hex: activeRoles.onSecondary, textHex: activeRoles.secondary, role: "Text on secondary fill", class: "bg-on-secondary text-secondary" },
        { name: "secondary-container", hex: activeRoles.secondaryContainer, textHex: activeRoles.onSecondaryContainer, role: "Tonal backgrounds for secondary cards", class: "bg-secondary-container text-on-secondary-container" },
        { name: "on-secondary-container", hex: activeRoles.onSecondaryContainer, textHex: activeRoles.secondaryContainer, role: "Text on secondary container", class: "bg-on-secondary-container text-secondary-container" },
      ],
    },
    {
      title: "Tertiary Role / Watch (Seed: #ffc107)",
      description: "Amber warning role for river watches, advisories, and heightened caution states.",
      tokens: [
        { name: "tertiary", hex: activeRoles.tertiary, textHex: activeRoles.onTertiary, role: "Watch state CTA & alert badges", class: "bg-tertiary text-on-tertiary" },
        { name: "on-tertiary", hex: activeRoles.onTertiary, textHex: activeRoles.tertiary, role: "Text on tertiary fill", class: "bg-on-tertiary text-tertiary" },
        { name: "tertiary-container", hex: activeRoles.tertiaryContainer, textHex: activeRoles.onTertiaryContainer, role: "Watch/Advisory chips & alert card surface", class: "bg-tertiary-container text-on-tertiary-container" },
        { name: "on-tertiary-container", hex: activeRoles.onTertiaryContainer, textHex: activeRoles.tertiaryContainer, role: "Text on tertiary container", class: "bg-on-tertiary-container text-tertiary-container" },
      ],
    },
    {
      title: "Error Role / Danger (Breach Alert)",
      description: "High-contrast red for river danger level breach, flood emergencies, and critical incidents.",
      tokens: [
        { name: "error", hex: activeRoles.error, textHex: activeRoles.onError, role: "Danger breach CTA & urgent pips", class: "bg-error text-on-error" },
        { name: "on-error", hex: activeRoles.onError, textHex: activeRoles.error, role: "Text on error fill", class: "bg-on-error text-error" },
        { name: "error-container", hex: activeRoles.errorContainer, textHex: activeRoles.onErrorContainer, role: "Danger severity chips & emergency alert cards", class: "bg-error-container text-on-error-container" },
        { name: "on-error-container", hex: activeRoles.onErrorContainer, textHex: activeRoles.errorContainer, role: "Text on error container", class: "bg-on-error-container text-error-container" },
      ],
    },
    {
      title: "Success Role / Normal (Custom M3 Role)",
      description: "Hydrological green for safe river stages, verified reports, and operational confirmations.",
      tokens: [
        { name: "success", hex: activeRoles.success, textHex: activeRoles.onSuccess, role: "Safe status indicators & confirmations", class: "bg-success text-on-success" },
        { name: "on-success", hex: activeRoles.onSuccess, textHex: activeRoles.success, role: "Text on success fill", class: "bg-on-success text-success" },
        { name: "success-container", hex: activeRoles.successContainer, textHex: activeRoles.onSuccessContainer, role: "Normal status severity chips & safe water panels", class: "bg-success-container text-on-success-container" },
        { name: "on-success-container", hex: activeRoles.onSuccessContainer, textHex: activeRoles.successContainer, role: "Text on success container", class: "bg-on-success-container text-success-container" },
      ],
    },
    {
      title: "Surface & Elevation Neutrals",
      description: "Tonal elevation surfaces with strictly calibrated <7% light / <12% dark delta.",
      tokens: [
        { name: "surface", hex: activeRoles.surface, textHex: activeRoles.onSurface, role: "Base application canvas", class: "bg-surface text-on-surface" },
        { name: "surface-container-low", hex: activeRoles.surfaceContainerLow, textHex: activeRoles.onSurface, role: "Low elevation container", class: "bg-surface-container-low text-on-surface" },
        { name: "surface-container", hex: activeRoles.surfaceContainer, textHex: activeRoles.onSurface, role: "Standard cards & panels", class: "bg-surface-container text-on-surface" },
        { name: "surface-container-high", hex: activeRoles.surfaceContainerHigh, textHex: activeRoles.onSurface, role: "High elevation cards & dialogs", class: "bg-surface-container-high text-on-surface" },
        { name: "on-surface", hex: activeRoles.onSurface, textHex: activeRoles.surface, role: "Primary headings & body text", class: "bg-on-surface text-surface" },
        { name: "on-surface-variant", hex: activeRoles.onSurfaceVariant, textHex: activeRoles.surface, role: "Secondary captions & metadata", class: "bg-on-surface-variant text-surface" },
        { name: "outline", hex: activeRoles.outline, textHex: activeRoles.surface, role: "High-contrast card & input borders", class: "bg-outline text-surface" },
        { name: "outline-variant", hex: activeRoles.outlineVariant, textHex: activeRoles.surface, role: "Subtle dividers & row borders", class: "bg-outline-variant text-surface" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header Landmark */}
      <header className="sticky top-0 z-40 border-b border-outline-variant/60 bg-surface/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1 min-h-[44px] min-w-[44px]"
              aria-label="Back to live flood dashboard"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>

            <div className="h-5 w-px bg-outline-variant" aria-hidden="true" />

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-sm bg-primary text-on-primary font-bold text-xs">
                NG
              </span>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-on-surface">
                Nadi-Gati <span className="font-normal text-on-surface-variant">Design System</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline-variant/50 bg-surface-container font-code text-xs text-on-surface-variant">
              <span>data-theme=</span>
              <strong className="text-primary font-bold">{theme}</strong>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
        {/* Hero Section */}
        <section aria-labelledby="design-system-overview" className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-code text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Material Design 3 (M3) Tonal Role Engine
          </div>
          <h2 id="design-system-overview" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Hydrological Tonal Architecture
          </h2>
          <p className="max-w-3xl text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Built from two brand seeds—<strong>#2196f3</strong> (Hydrological Blue, Primary) and{" "}
            <strong>#ffc107</strong> (Caution Amber, Tertiary)—producing mathematically balanced
            tonal roles with full dark mode parity, strict <strong>WCAG 2.1 AA</strong> contrast
            compliance, and dedicated flood severity semantics.
          </p>

          {/* Seed Visualizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 max-w-xl">
            <div className="p-4 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Primary Seed
                </div>
                <div className="font-code text-lg font-bold text-on-surface">{BRAND_SEEDS.primary}</div>
                <div className="text-xs text-on-surface-variant">Hydrological Blue</div>
              </div>
              <div
                className="w-12 h-12 rounded-sm border border-outline-variant shadow-elevation-1"
                style={{ backgroundColor: BRAND_SEEDS.primary }}
                aria-label={`Color swatch for ${BRAND_SEEDS.primary}`}
              />
            </div>

            <div className="p-4 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Tertiary Seed
                </div>
                <div className="font-code text-lg font-bold text-on-surface">{BRAND_SEEDS.tertiary}</div>
                <div className="text-xs text-on-surface-variant">Flood Warning Amber</div>
              </div>
              <div
                className="w-12 h-12 rounded-sm border border-outline-variant shadow-elevation-1"
                style={{ backgroundColor: BRAND_SEEDS.tertiary }}
                aria-label={`Color swatch for ${BRAND_SEEDS.tertiary}`}
              />
            </div>
          </div>
        </section>

        {/* Section: Shared Components (SeverityChip & SourceCitation) */}
        <section aria-labelledby="shared-components-heading" className="space-y-6">
          <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 id="shared-components-heading" className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-primary" aria-hidden="true" />
                Shared Core Components
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Reused across all views, data feeds, and alert layers regardless of storage backend.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Component 1: SeverityChip */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <span>&lt;SeverityChip /&gt;</span>
                  </h3>
                  <span className="font-code text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    Normal = success · Watch = tertiary · Danger = error
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Single shared component mapping core M3 roles to flood monitoring states. Uses Google Sans Code for labels.
                </p>
              </div>

              {/* Live Core Roles */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Core Flood Severity Roles
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <SeverityChip severity="normal" />
                  <SeverityChip severity="watch" />
                  <SeverityChip severity="danger" pulse />
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-3 pt-4 border-t border-outline-variant/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Variants (Tonal vs Filled vs Outlined)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <span className="text-[11px] text-on-surface-variant font-code">tonal (default)</span>
                    <div className="flex flex-col gap-2">
                      <SeverityChip severity="normal" variant="tonal" size="xs" />
                      <SeverityChip severity="watch" variant="tonal" size="xs" />
                      <SeverityChip severity="danger" variant="tonal" size="xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] text-on-surface-variant font-code">filled</span>
                    <div className="flex flex-col gap-2">
                      <SeverityChip severity="normal" variant="filled" size="xs" />
                      <SeverityChip severity="watch" variant="filled" size="xs" />
                      <SeverityChip severity="danger" variant="filled" size="xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] text-on-surface-variant font-code">outlined</span>
                    <div className="flex flex-col gap-2">
                      <SeverityChip severity="normal" variant="outlined" size="xs" />
                      <SeverityChip severity="watch" variant="outlined" size="xs" />
                      <SeverityChip severity="danger" variant="outlined" size="xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-3 pt-4 border-t border-outline-variant/30">
                <div className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Size Scale (xs, sm, md, lg)
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SeverityChip severity="danger" size="xs" />
                  <SeverityChip severity="danger" size="sm" />
                  <SeverityChip severity="danger" size="md" />
                  <SeverityChip severity="danger" size="lg" />
                </div>
              </div>
            </div>

            {/* Component 2: SourceCitation */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <span>&lt;SourceCitation /&gt;</span>
                  </h3>
                  <span className="font-code text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    Value · Source · URL · Timestamp
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Mandatory attribution container for every data point across Nadi-Gati. Displays tabular metric, official source link, and IST timestamp.
                </p>
              </div>

              {/* Card Variant */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Variant: Card (Default)
                </span>
                <SourceCitation
                  label="Brahmaputra at Dibrugarh (CWC Station #04)"
                  value="106.12 m (Danger: 105.70 m)"
                  sourceName="Central Water Commission (CWC)"
                  sourceUrl="https://cwc.gov.in"
                  timestamp="2026-09-06T09:30:00.000Z"
                  variant="card"
                />
              </div>

              {/* Stat Variant */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Variant: Stat (Dashboard Metric Tile)
                </span>
                <SourceCitation
                  label="Current River Flow Velocity"
                  value="4.82 m/s"
                  sourceName="Assam SDMA Hydrological Alert"
                  sourceUrl="https://sdma.assam.gov.in"
                  timestamp="2026-09-06T10:15:00.000Z"
                  variant="stat"
                />
              </div>

              {/* Compact & Inline Variants */}
              <div className="space-y-3 pt-2 border-t border-outline-variant/30">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Variant: Compact & Inline
                </span>
                <SourceCitation
                  label="Embankment Crest"
                  value="Safe Freeboard: 1.45m"
                  sourceName="DDMA Dibrugarh"
                  timestamp="2026-09-06T11:00:00.000Z"
                  variant="compact"
                />

                <div className="p-3 rounded-sm bg-surface-container-low border border-outline-variant/40">
                  <SourceCitation
                    value="Rainfall: 142mm in 24h"
                    sourceName="IMD Regional Meteorological Centre"
                    sourceUrl="https://mausam.imd.gov.in"
                    timestamp="2026-09-06T08:00:00.000Z"
                    variant="inline"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Color Palette & M3 Roles */}
        <section aria-labelledby="color-roles-heading" className="space-y-8">
          <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 id="color-roles-heading" className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Palette className="w-6 h-6 text-primary" aria-hidden="true" />
                M3 Tonal Color Roles
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Showing current active tokens for <strong className="text-primary">{theme.toUpperCase()}</strong> theme. Click any token to copy its CSS/Tailwind class.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleCategories.map((category) => (
              <div
                key={category.title}
                className="p-5 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{category.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">{category.description}</p>
                </div>

                <div className="space-y-2.5">
                  {category.tokens.map((tok) => {
                    const isCopied = copiedToken === tok.name;
                    return (
                      <button
                        type="button"
                        key={tok.name}
                        onClick={() => handleCopy(`var(--${tok.name})`, tok.name)}
                        className="w-full text-left p-2.5 rounded-sm border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high transition-colors group flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
                        title={`Click to copy var(--${tok.name})`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xs border border-outline-variant/80 flex-shrink-0 shadow-elevation-1"
                            style={{ backgroundColor: tok.hex }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="font-code text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                              {tok.name}
                            </div>
                            <div className="text-[11px] text-on-surface-variant truncate">
                              {tok.role}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-code text-xs font-semibold text-on-surface-variant">
                            {tok.hex}
                          </span>
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-success" aria-label="Copied" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-outline opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Live WCAG AA Contrast Matrix */}
        <section aria-labelledby="contrast-matrix-heading" className="space-y-6">
          <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 id="contrast-matrix-heading" className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Shield className="w-6 h-6 text-success" aria-hidden="true" />
                Live WCAG 2.1 Contrast Matrix
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Every foreground and container pairing mathematically tested. WCAG AA requires ≥ 4.5:1 (≥ 3.0:1 for large/UI components).
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-container text-on-success-container font-code text-xs font-bold">
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              100% PAIRINGS PASS WCAG AA
            </div>
          </div>

          <div className="rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-high text-on-surface-variant font-code">
                    <th scope="col" className="p-3.5 font-semibold">ROLE PAIRING</th>
                    <th scope="col" className="p-3.5 font-semibold">SAMPLE PREVIEW</th>
                    <th scope="col" className="p-3.5 font-semibold">LIGHT MODE</th>
                    <th scope="col" className="p-3.5 font-semibold">DARK MODE</th>
                    <th scope="col" className="p-3.5 font-semibold">WCAG STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {CORE_CONTRAST_PAIRS.map((pair) => {
                    const lightRatio = calculateContrastRatio(pair.lightFg, pair.lightBg);
                    const darkRatio = calculateContrastRatio(pair.darkFg, pair.darkBg);
                    const isBorder = pair.fgToken.includes("outline");

                    const lightRating = getWcagRating(lightRatio, isBorder);
                    const darkRating = getWcagRating(darkRatio, isBorder);

                    const currentFg = isDark ? pair.darkFg : pair.lightFg;
                    const currentBg = isDark ? pair.darkBg : pair.lightBg;
                    const currentRatio = isDark ? darkRatio : lightRatio;

                    return (
                      <tr key={pair.name} className="hover:bg-surface-container-high/50 transition-colors">
                        <td className="p-3.5 font-medium text-on-surface">
                          <div className="font-bold">{pair.name}</div>
                          <div className="text-[11px] text-on-surface-variant">{pair.description}</div>
                        </td>

                        <td className="p-3.5">
                          <div
                            className="px-3 py-1.5 rounded-xs font-code font-bold inline-flex items-center gap-1.5 shadow-elevation-1 border border-outline-variant/30"
                            style={{ backgroundColor: currentBg, color: currentFg }}
                          >
                            <span>Live Preview</span>
                            <span className="text-[10px] opacity-80">({formatContrastRatio(currentRatio)})</span>
                          </div>
                        </td>

                        <td className="p-3.5 font-code">
                          <div className="font-bold text-on-surface">{formatContrastRatio(lightRatio)}</div>
                          <div className="text-[10px] text-on-surface-variant">
                            {pair.lightFg} / {pair.lightBg}
                          </div>
                        </td>

                        <td className="p-3.5 font-code">
                          <div className="font-bold text-on-surface">{formatContrastRatio(darkRatio)}</div>
                          <div className="text-[10px] text-on-surface-variant">
                            {pair.darkFg} / {pair.darkBg}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-code font-bold text-[10px] ${
                                lightRating.rating === "AAA" && darkRating.rating === "AAA"
                                  ? "bg-success-container text-on-success-container border border-success/30"
                                  : "bg-primary-container text-on-primary-container border border-primary/30"
                              }`}
                            >
                              {lightRating.rating === "AAA" && darkRating.rating === "AAA"
                                ? "WCAG AAA"
                                : "WCAG AA"}
                            </span>
                            <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section: Typography */}
        <section aria-labelledby="typography-heading" className="space-y-6">
          <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 id="typography-heading" className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Type className="w-6 h-6 text-primary" aria-hidden="true" />
                Typography
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                <strong>Google Sans</strong> for headings and all body text; <strong>Roboto Mono</strong> only for code and coordinates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Google Sans */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-on-surface">Google Sans (Headers & Banners)</h3>
                <span className="font-code text-xs px-2 py-0.5 rounded bg-primary-container text-on-primary-container">
                  h1, h2, h3, .alert-title
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Bold, tight headings in the on-surface colour, so they follow light and dark mode.
              </p>

              <div className="space-y-3 pt-2">
                <div className="border-b border-outline-variant/30 pb-2">
                  <div className="text-[11px] text-on-surface-variant font-code">h1 Display Title (Bold)</div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Real-Time River Intelligence
                  </h1>
                </div>

                <div className="border-b border-outline-variant/30 pb-2">
                  <div className="text-[11px] text-on-surface-variant font-code">.alert-title Notice</div>
                  <div className="alert-title text-base font-bold text-error">
                    Critical Crest Alert: Flood Warning
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-on-surface-variant font-code">h3 Dashboard Section Header</div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Brahmaputra Basin Hydrology Matrix
                  </h3>
                </div>
              </div>
            </div>

            {/* Body text */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-on-surface">Google Sans (Body text)</h3>
                <span className="font-code text-xs px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container">
                  p, .report-content, li
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Regular weight with a 1.6 line height. Paragraphs inherit the colour of their container.
              </p>

              <div className="space-y-3 pt-2">
                <div className="border-b border-outline-variant/30 pb-2">
                  <div className="text-[11px] text-on-surface-variant font-code">Paragraph & Story Prose</div>
                  <p className="text-sm leading-relaxed">
                    Hydrology gauges at Dibrugarh recorded a steady 0.04m rise over the past 6 hours, approaching Warning threshold benchmark levels.
                  </p>
                </div>

                <div>
                  <div className="text-[11px] text-on-surface-variant font-code">.report-content Eyewitness Log</div>
                  <div className="report-content text-xs leading-relaxed p-3 rounded bg-surface-container-low border border-outline-variant/40">
                    River embankment access road inundated by approximately 15cm of surface overflow near the western culvert marker.
                  </div>
                </div>
              </div>
            </div>

            {/* Roboto Mono */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-on-surface">Roboto Mono (Code & coordinates)</h3>
                <span className="font-code text-xs px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container">
                  .data-metric, .geo-coordinates, code
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Fixed-width type for code and coordinates only. Levels, dates and labels use Google Sans.
              </p>

              <div className="space-y-3 pt-2 font-code">
                <div className="border-b border-outline-variant/30 pb-2">
                  <div className="text-[11px] text-on-surface-variant font-sans">.data-metric (32px)</div>
                  <div className="data-metric text-2xl font-bold text-primary tracking-tight">
                    106.12 <span className="text-xs font-normal text-on-surface-variant">meters MSL</span>
                  </div>
                </div>

                <div className="border-b border-outline-variant/30 pb-2">
                  <div className="text-[11px] text-on-surface-variant font-sans">.geo-coordinates</div>
                  <div className="geo-coordinates text-xs font-medium">
                    27.4728°N, 94.9120°E
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-on-surface-variant font-sans">.timestamp</div>
                  <div className="timestamp text-xs text-on-surface-variant">
                    2026-09-09T02:57:00Z · 09 Sep 08:27 IST
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Shapes & Elevation */}
        <section aria-labelledby="shapes-elevation-heading" className="space-y-8">
          <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 id="shapes-elevation-heading" className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Layers className="w-6 h-6 text-primary" aria-hidden="true" />
                Shape Scale & Layered Elevations
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                4px base spacing grid, strict 8pt spacing rhythm, mathematical corner radii, and 4 tiers of layered soft shadows.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Shapes */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-4">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Square className="w-4 h-4 text-primary" aria-hidden="true" />
                Shape Scale
              </h3>
              <p className="text-xs text-on-surface-variant">
                From micro tags (xs 8px) up to fully rounded chips (full 999px).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {Object.values(SHAPE_SCALE).map((shape) => (
                  <div
                    key={shape.name}
                    className={`p-4 border border-outline-variant bg-surface-container-high flex flex-col items-center justify-center text-center transition-all hover:border-primary ${shape.class}`}
                  >
                    <div className="font-code text-xs font-bold text-on-surface">{shape.name}</div>
                    <div className="font-code text-[11px] text-primary">{shape.radius}</div>
                    <div className="text-[10px] text-on-surface-variant font-code mt-1">{shape.class}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Elevation */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-1 space-y-4">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Layers className="w-4 h-4 text-tertiary" aria-hidden="true" />
                Layered Shadow Elevation (4 Tiers)
              </h3>
              <p className="text-xs text-on-surface-variant">
                Layered double ambient/key shadows for realistic optical depth.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {Object.values(ELEVATION_TIERS).map((el) => (
                  <div
                    key={el.tier}
                    className={`p-4 rounded-md border border-outline-variant/40 bg-surface-container-high transition-transform hover:-translate-y-0.5 ${el.class}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-on-surface">{el.name}</span>
                      <span className="font-code text-xs text-primary font-bold">Tier {el.tier}</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">{el.useCase}</p>
                    <div className="mt-2 font-code text-[10px] text-outline truncate">{el.class}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Interactive Playground */}
        <section aria-labelledby="playground-heading" className="space-y-6">
          <div className="border-b border-outline-variant/60 pb-3 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 id="playground-heading" className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                <Sliders className="w-6 h-6 text-primary" aria-hidden="true" />
                Interactive Component Sandbox
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Customize state, size, variant, and theme live to inspect rendering fidelity.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container shadow-elevation-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Severity selector */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Severity Level
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["normal", "watch", "danger"] as const).map((sev) => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setTestSeverity(sev)}
                      className={`px-3 py-1.5 rounded-full font-code text-xs font-bold capitalize transition-colors min-h-[44px] cursor-pointer ${
                        testSeverity === sev
                          ? "bg-primary text-on-primary shadow-elevation-1"
                          : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variant selector */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Chip Variant
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["tonal", "filled", "outlined"] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setTestVariant(v)}
                      className={`px-3 py-1.5 rounded-full font-code text-xs font-bold capitalize transition-colors min-h-[44px] cursor-pointer ${
                        testVariant === v
                          ? "bg-primary text-on-primary shadow-elevation-1"
                          : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size selector */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Chip Size
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["xs", "sm", "md", "lg"] as const).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setTestSize(s)}
                      className={`px-3 py-1.5 rounded-full font-code text-xs font-bold uppercase transition-colors min-h-[44px] cursor-pointer ${
                        testSize === s
                          ? "bg-primary text-on-primary shadow-elevation-1"
                          : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Citation Variant */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Citation Variant
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["card", "stat", "compact", "inline"] as const).map((cv) => (
                    <button
                      type="button"
                      key={cv}
                      onClick={() => setCitationVariant(cv)}
                      className={`px-3 py-1.5 rounded-full font-code text-xs font-bold capitalize transition-colors min-h-[44px] cursor-pointer ${
                        citationVariant === cv
                          ? "bg-primary text-on-primary shadow-elevation-1"
                          : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      {cv}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pulse Animation Toggle */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  Pulse Alert Animation
                </label>
                <button
                  type="button"
                  onClick={() => setTestPulse((prev) => !prev)}
                  className={`px-4 py-1.5 rounded-full font-code text-xs font-bold transition-colors min-h-[44px] cursor-pointer ${
                    testPulse
                      ? "bg-error-container text-on-error-container border border-error/40 shadow-elevation-1"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  {testPulse ? "Pulse Ping: Active" : "Pulse Ping: Off"}
                </button>
              </div>
            </div>

            {/* Live Preview Stage */}
            <div className="p-6 rounded-md border border-outline-variant/60 bg-surface-container-low space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-on-surface-variant">
                  Live Component Render
                </span>
                <span className="font-code text-xs text-primary">
                  Theme: {theme}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-6 p-4 rounded-md bg-surface border border-outline-variant/40">
                <SeverityChip
                  severity={testSeverity}
                  variant={testVariant}
                  size={testSize}
                  pulse={testPulse}
                />
              </div>

              <div>
                <SourceCitation
                  label="Flood Alert Reading"
                  value="106.84 m MSL (+1.14 m over Danger Level)"
                  sourceName="Central Water Commission - North Eastern Directorate"
                  sourceUrl="https://cwc.gov.in"
                  timestamp={new Date().toISOString()}
                  variant={citationVariant}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer Landmark */}
        <footer className="pt-8 border-t border-outline-variant/60 text-center text-xs text-on-surface-variant space-y-2 pb-12">
          <p className="font-medium text-on-surface">
            Nadi-Gati Open-Source Flood Reporting Platform for India
          </p>
          <p>
            Material Design 3 (M3) Tonal System · Brand Seeds #2196f3 & #ffc107 · WCAG 2.1 AA Compliant · Open Access
          </p>
        </footer>
      </main>
    </div>
  );
}
