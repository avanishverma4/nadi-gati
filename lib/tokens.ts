/**
 * Design tokens as JavaScript values, for code that needs them outside CSS: the severity chip and
 * the dev-only /design-system page (contrast checks, swatches).
 *
 * The site itself is styled from the CSS variables in app/globals.css. These colours are copies of
 * those and must be changed together with them. Roles follow Material Design 3; BRAND_SEEDS are
 * the two colours the palette was generated from, not colours used directly.
 */

interface ContrastPair {
  name: string;
  fgToken: string;
  bgToken: string;
  lightFg: string;
  lightBg: string;
  darkFg: string;
  darkBg: string;
  description: string;
}

export const BRAND_SEEDS = {
  primary: "#2196f3",
  tertiary: "#ffc107",
} as const;

export const COLOR_ROLES = {
  light: {
    // Primary role
    primary: "#0963ab",
    onPrimary: "#ffffff",
    primaryContainer: "#d4e7f7",
    onPrimaryContainer: "#0a2036",

    // Secondary role
    secondary: "#466a86",
    onSecondary: "#ffffff",
    secondaryContainer: "#dfe6ec",
    onSecondaryContainer: "#041f32",

    // Tertiary role (Amber seed)
    tertiary: "#795d00",
    onTertiary: "#ffffff",
    tertiaryContainer: "#ffe699",
    onTertiaryContainer: "#2b1f00",

    // Error role (Danger / Alert)
    error: "#ae1e2c",
    onError: "#ffffff",
    errorContainer: "#f3d8db",
    onErrorContainer: "#410006",

    // Success role (Normal / Safe hydrological status - Custom role)
    success: "#186f46",
    onSuccess: "#ffffff",
    successContainer: "#d9f2e6",
    onSuccessContainer: "#002111",

    // Surface & Neutrals
    surface: "#fafafa",
    surfaceDim: "#dadada",
    surfaceBright: "#fafafa",
    surfaceContainerLowest: "#ffffff",
    surfaceContainerLow: "#f4f4f4",
    surfaceContainer: "#eeeeee",
    surfaceContainerHigh: "#e8e8e8",
    surfaceContainerHighest: "#e2e2e2",
    onSurface: "#191a1a",
    onSurfaceVariant: "#464d53",
    outline: "#74818b",
    outlineVariant: "#c7cdd1",

    // Inverses
    inverseSurface: "#2e3133",
    inverseOnSurface: "#f0f1f2",
    inversePrimary: "#9ecef8",
  },
  dark: {
    // Primary role (tone 80)
    primary: "#9ecef8",
    onPrimary: "#003355",
    primaryContainer: "#004b77",
    onPrimaryContainer: "#d4e7f7",

    // Secondary role
    secondary: "#adcae6",
    onSecondary: "#16334a",
    secondaryContainer: "#2e4e68",
    onSecondaryContainer: "#dfe6ec",

    // Tertiary role (amber tone 80)
    tertiary: "#f5c138",
    onTertiary: "#453300",
    tertiaryContainer: "#664e00",
    onTertiaryContainer: "#ffe699",

    // Error role
    error: "#ffb4ab",
    onError: "#690010",
    errorContainer: "#93001a",
    onErrorContainer: "#ffdad6",

    // Success role
    success: "#7bd8a1",
    onSuccess: "#00391d",
    successContainer: "#00522c",
    onSuccessContainer: "#d9f2e6",

    // Surface & Neutrals
    surface: "#111315",
    surfaceDim: "#0e1011",
    surfaceBright: "#37393b",
    surfaceContainerLowest: "#0c0e0f",
    surfaceContainerLow: "#191b1d",
    surfaceContainer: "#1d1f21",
    surfaceContainerHigh: "#282a2c",
    surfaceContainerHighest: "#333537",
    onSurface: "#e1e2e5",
    onSurfaceVariant: "#c1c7ce",
    outline: "#8b9198",
    outlineVariant: "#41474d",

    // Inverses
    inverseSurface: "#e1e2e5",
    inverseOnSurface: "#2e3133",
    inversePrimary: "#0963ab",
  },
} as const;

/** Corner radii, matching the --radius-* values in app/globals.css */
export const SHAPE_SCALE = {
  xs: { name: "xs", radius: "8px", class: "rounded-xs" },
  sm: { name: "sm", radius: "12px", class: "rounded-sm" },
  md: { name: "md", radius: "16px", class: "rounded-md" },
  lg: { name: "lg", radius: "24px", class: "rounded-lg" },
  xl: { name: "xl", radius: "32px", class: "rounded-xl" },
  full: { name: "full", radius: "999px", class: "rounded-full" },
} as const;

/** Shadow levels, matching the shadow-elevation-* utilities in app/globals.css */
export const ELEVATION_TIERS = {
  1: {
    tier: 1,
    name: "Elevation 1",
    shadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.08), 0px 1px 3px 1px rgba(0, 0, 0, 0.05)",
    class: "shadow-elevation-1",
    useCase: "Resting cards, chips, subtle interactive controls",
  },
  2: {
    tier: 2,
    name: "Elevation 2",
    shadow: "0px 1px 2px 0px rgba(0, 0, 0, 0.12), 0px 2px 6px 2px rgba(0, 0, 0, 0.08)",
    class: "shadow-elevation-2",
    useCase: "Hover states, sticky app bar, small dropdowns, bottom sheets",
  },
  3: {
    tier: 3,
    name: "Elevation 3",
    shadow: "0px 1px 3px 0px rgba(0, 0, 0, 0.14), 0px 4px 8px 3px rgba(0, 0, 0, 0.10)",
    class: "shadow-elevation-3",
    useCase: "Floating Action Buttons, elevated modal drawers, navigation rails",
  },
  4: {
    tier: 4,
    name: "Elevation 4",
    shadow: "0px 2px 3px 0px rgba(0, 0, 0, 0.16), 0px 6px 10px 4px rgba(0, 0, 0, 0.12)",
    class: "shadow-elevation-4",
    useCase: "Critical alert dialogs, emergency popups, full-screen sheets",
  },
} as const;

/**
 * River status colours reuse existing roles: normal = success (green), watch = tertiary (amber),
 * danger = error (red). The extra names in SeverityLevel are aliases folded in by normalizeSeverity.
 */
export type SeverityLevel = "normal" | "watch" | "danger" | "warning" | "advisory" | "critical";

interface SeverityConfig {
  label: string;
  role: "success" | "tertiary" | "error";
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export const SEVERITY_CONFIG: Record<"normal" | "watch" | "danger", SeverityConfig> = {
  normal: {
    label: "Normal",
    role: "success",
    description: "Hydrological levels well below warning mark; safe standard flow.",
    bgClass: "bg-success-container",
    textClass: "text-on-success-container",
    borderClass: "border-success/30",
    dotClass: "bg-success",
  },
  watch: {
    label: "Watch",
    role: "tertiary",
    description: "River levels approaching or exceeding official Warning mark; heightened vigilance.",
    bgClass: "bg-tertiary-container",
    textClass: "text-on-tertiary-container",
    borderClass: "border-tertiary/30",
    dotClass: "bg-tertiary",
  },
  danger: {
    label: "Danger",
    role: "error",
    description: "Hydrological levels have breached Danger threshold; immediate emergency response.",
    bgClass: "bg-error-container",
    textClass: "text-on-error-container",
    borderClass: "border-error/30",
    dotClass: "bg-error",
  },
};

/** Maps any severity name used across the data and APIs onto normal, watch or danger */
export function normalizeSeverity(sev: string): "normal" | "watch" | "danger" {
  const s = sev.toLowerCase().trim();
  if (s === "normal" || s === "safe" || s === "low") return "normal";
  if (s === "watch" || s === "warning" || s === "advisory" || s === "moderate") return "watch";
  if (s === "danger" || s === "critical" || s === "severe" || s === "high") return "danger";
  return "normal";
}

// WCAG 2.1 contrast ratio: relative luminance of each colour, then (lighter + 0.05) / (darker + 0.05)
function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

export function getWcagRating(ratio: number, isLargeText: boolean = false): {
  rating: "AAA" | "AA" | "FAIL";
  pass: boolean;
} {
  const aaThreshold = isLargeText ? 3.0 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7.0;

  if (ratio >= aaaThreshold) return { rating: "AAA", pass: true };
  if (ratio >= aaThreshold) return { rating: "AA", pass: true };
  return { rating: "FAIL", pass: false };
}

/** The text/background pairs the /design-system page checks against WCAG AA */
export const CORE_CONTRAST_PAIRS: ContrastPair[] = [
  {
    name: "Primary / On-Primary",
    fgToken: "on-primary",
    bgToken: "primary",
    lightFg: COLOR_ROLES.light.onPrimary,
    lightBg: COLOR_ROLES.light.primary,
    darkFg: COLOR_ROLES.dark.onPrimary,
    darkBg: COLOR_ROLES.dark.primary,
    description: "Buttons, active indicators, high-emphasis interactive elements",
  },
  {
    name: "Primary Container / On-Primary Container",
    fgToken: "on-primary-container",
    bgToken: "primary-container",
    lightFg: COLOR_ROLES.light.onPrimaryContainer,
    lightBg: COLOR_ROLES.light.primaryContainer,
    darkFg: COLOR_ROLES.dark.onPrimaryContainer,
    darkBg: COLOR_ROLES.dark.primaryContainer,
    description: "Tonal cards, prominent badge surfaces, filter pills",
  },
  {
    name: "Secondary / On-Secondary",
    fgToken: "on-secondary",
    bgToken: "secondary",
    lightFg: COLOR_ROLES.light.onSecondary,
    lightBg: COLOR_ROLES.light.secondary,
    darkFg: COLOR_ROLES.dark.onSecondary,
    darkBg: COLOR_ROLES.dark.secondary,
    description: "Secondary action controls and auxiliary components",
  },
  {
    name: "Secondary Container / On-Secondary Container",
    fgToken: "on-secondary-container",
    bgToken: "secondary-container",
    lightFg: COLOR_ROLES.light.onSecondaryContainer,
    lightBg: COLOR_ROLES.light.secondaryContainer,
    darkFg: COLOR_ROLES.dark.onSecondaryContainer,
    darkBg: COLOR_ROLES.dark.secondaryContainer,
    description: "Subtle informational groupings and table headers",
  },
  {
    name: "Tertiary (Watch) / On-Tertiary",
    fgToken: "on-tertiary",
    bgToken: "tertiary",
    lightFg: COLOR_ROLES.light.onTertiary,
    lightBg: COLOR_ROLES.light.tertiary,
    darkFg: COLOR_ROLES.dark.onTertiary,
    darkBg: COLOR_ROLES.dark.tertiary,
    description: "High-emphasis Watch/Warning buttons and badges",
  },
  {
    name: "Tertiary Container / On-Tertiary Container",
    fgToken: "on-tertiary-container",
    bgToken: "tertiary-container",
    lightFg: COLOR_ROLES.light.onTertiaryContainer,
    lightBg: COLOR_ROLES.light.tertiaryContainer,
    darkFg: COLOR_ROLES.dark.onTertiaryContainer,
    darkBg: COLOR_ROLES.dark.tertiaryContainer,
    description: "Watch/Warning severity chips, flood advisory banners",
  },
  {
    name: "Error (Danger) / On-Error",
    fgToken: "on-error",
    bgToken: "error",
    lightFg: COLOR_ROLES.light.onError,
    lightBg: COLOR_ROLES.light.error,
    darkFg: COLOR_ROLES.dark.onError,
    darkBg: COLOR_ROLES.dark.error,
    description: "Danger breach action buttons, urgent emergency indicators",
  },
  {
    name: "Error Container / On-Error Container",
    fgToken: "on-error-container",
    bgToken: "error-container",
    lightFg: COLOR_ROLES.light.onErrorContainer,
    lightBg: COLOR_ROLES.light.errorContainer,
    darkFg: COLOR_ROLES.dark.onErrorContainer,
    darkBg: COLOR_ROLES.dark.errorContainer,
    description: "Danger severity chips, river breach alert cards",
  },
  {
    name: "Success (Normal) / On-Success",
    fgToken: "on-success",
    bgToken: "success",
    lightFg: COLOR_ROLES.light.onSuccess,
    lightBg: COLOR_ROLES.light.success,
    darkFg: COLOR_ROLES.dark.onSuccess,
    darkBg: COLOR_ROLES.dark.success,
    description: "Normal/Safe confirmation buttons and positive indicators",
  },
  {
    name: "Success Container / On-Success Container",
    fgToken: "on-success-container",
    bgToken: "success-container",
    lightFg: COLOR_ROLES.light.onSuccessContainer,
    lightBg: COLOR_ROLES.light.successContainer,
    darkFg: COLOR_ROLES.dark.onSuccessContainer,
    darkBg: COLOR_ROLES.dark.successContainer,
    description: "Normal status severity chips, safe gauge indicators",
  },
  {
    name: "Surface / On-Surface",
    fgToken: "on-surface",
    bgToken: "surface",
    lightFg: COLOR_ROLES.light.onSurface,
    lightBg: COLOR_ROLES.light.surface,
    darkFg: COLOR_ROLES.dark.onSurface,
    darkBg: COLOR_ROLES.dark.surface,
    description: "Primary body text, card content, and headings",
  },
  {
    name: "Surface / On-Surface Variant",
    fgToken: "on-surface-variant",
    bgToken: "surface",
    lightFg: COLOR_ROLES.light.onSurfaceVariant,
    lightBg: COLOR_ROLES.light.surface,
    darkFg: COLOR_ROLES.dark.onSurfaceVariant,
    darkBg: COLOR_ROLES.dark.surface,
    description: "Secondary captions, timestamps, metadata labels",
  },
  {
    name: "Surface Container / On-Surface",
    fgToken: "on-surface",
    bgToken: "surface-container",
    lightFg: COLOR_ROLES.light.onSurface,
    lightBg: COLOR_ROLES.light.surfaceContainer,
    darkFg: COLOR_ROLES.dark.onSurface,
    darkBg: COLOR_ROLES.dark.surfaceContainer,
    description: "Container cards, panels, and table rows",
  },
  {
    name: "Outline / Surface (Border Contrast)",
    fgToken: "outline",
    bgToken: "surface",
    lightFg: COLOR_ROLES.light.outline,
    lightBg: COLOR_ROLES.light.surface,
    darkFg: COLOR_ROLES.dark.outline,
    darkBg: COLOR_ROLES.dark.surface,
    description: "Component boundaries, inputs, and divider lines",
  },
];
