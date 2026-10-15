"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Info } from "lucide-react";
import { db } from "@/lib/firebase-client";
import { formatFlow, formatRelativeTime } from "@/lib/hydrology-data";

// Mirrors LatestFlow in functions/src/types.ts, written by functions/src/ingestOpenMeteo.ts
export interface LatestFlow {
  valueM3s: number;
  forDate: string;
  trend: "rising" | "falling" | "steady";
  changePct7d: number | null;
  outlookPeakM3s: number;
  outlookPeakDate: string;
  normalM3s: number | null;
  percentOfNormal: number | null;
  recordedAt: Timestamp;
  source: string;
  sourceUrl: string;
}

const TREND = {
  rising: { label: "Rising", icon: ArrowUpRight, className: "text-error" },
  falling: { label: "Falling", icon: ArrowDownRight, className: "text-success" },
  steady: { label: "Steady", icon: ArrowRight, className: "text-on-surface-variant" },
} as const;

function describeNormal(percent: number): string {
  if (percent >= 150) return "Well above normal";
  if (percent >= 115) return "Above normal";
  if (percent > 85) return "About normal";
  if (percent > 50) return "Below normal";
  return "Well below normal";
}

/**
 * Modelled river flow for a gauge, shown only when live GloFAS data exists for it.
 * Flow is a volume of water (m³/s), not a level, so it is never compared with the danger mark.
 */
export function RiverFlowCard({
  stationId,
  className = "",
}: {
  stationId: string;
  className?: string;
}) {
  const [flow, setFlow] = useState<LatestFlow | null>(null);

  useEffect(() => {
    if (!stationId) return;
    try {
      return onSnapshot(
        doc(db, "gaugeStations", stationId),
        (snap) => {
          const latest = snap.data()?.latestFlow;
          setFlow(latest && typeof latest.valueM3s === "number" ? (latest as LatestFlow) : null);
        },
        () => setFlow(null)
      );
    } catch {
      return undefined;
    }
  }, [stationId]);

  if (!flow) return null;
  return <RiverFlowSummary flow={flow} stationId={stationId} className={className} />;
}

/** The flow figure, how it compares with the usual flow, and the 3-day outlook */
function RiverFlowSummary({
  flow,
  stationId,
  className = "",
}: {
  flow: LatestFlow;
  stationId: string;
  className?: string;
}) {
  const trend = TREND[flow.trend] ?? TREND.steady;
  // Without a stored time, say so rather than presenting the figure as just recorded
  const recordedAt = flow.recordedAt?.toDate ? flow.recordedAt.toDate() : null;
  const peakDay = new Date(`${flow.outlookPeakDate}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const peakIsToday = flow.outlookPeakDate === flow.forDate;

  return (
    <div
      id={`river-flow-${stationId}`}
      className={`rounded-2xl border border-outline-variant/60 bg-surface p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
          </span>
          <h3 className="font-sans font-bold text-base text-on-surface">River flow</h3>
        </div>
        <span className="font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant">
          Live model estimate
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="font-sans font-bold text-3xl text-on-surface tracking-tight">
            {formatFlow(flow.valueM3s)}
          </div>
          <div
            className={`mt-1 inline-flex items-center gap-1 font-sans text-sm font-semibold ${trend.className}`}
          >
            <trend.icon className="w-4 h-4" aria-hidden="true" />
            {trend.label}
            {flow.changePct7d !== null && (
              <span className="font-normal text-on-surface-variant">
                · {flow.changePct7d > 0 ? "+" : ""}
                {flow.changePct7d}% on a week ago
              </span>
            )}
          </div>
        </div>
        {flow.percentOfNormal !== null && (
          <div className="text-right">
            <div className="font-sans font-semibold text-on-surface">
              {describeNormal(flow.percentOfNormal)}
            </div>
            <div className="font-sans text-sm text-on-surface-variant">
              {flow.percentOfNormal}% of usual for this time of year
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-surface-container-low px-4 py-3 font-sans text-sm text-on-surface">
        {peakIsToday
          ? "Not expected to rise over the next 3 days."
          : `Expected to reach ${formatFlow(flow.outlookPeakM3s)} by ${peakDay}.`}
      </div>

      <p className="mt-4 flex items-start gap-2 font-sans text-xs text-on-surface-variant leading-relaxed">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          How much water is flowing, estimated by a computer model. It is not a water level, so it
          can&apos;t be compared with the danger mark.{" "}
          <a
            href={flow.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline underline-offset-2"
          >
            {flow.source}
          </a>{" "}
          · {recordedAt ? formatRelativeTime(recordedAt) : "time not recorded"}
        </span>
      </p>
    </div>
  );
}
