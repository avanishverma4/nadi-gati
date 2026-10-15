"use client";

import React from "react";
import { motion } from "motion/react";

export interface LevelGaugeProps {
  value: number;
  warningLevel: number;
  dangerLevel: number;
  level: "normal" | "watch" | "danger";
  className?: string;
}

/**
 * Horizontal bar showing a river level against its warning and danger marks.
 * The scale runs from two "steps" below the warning mark to one above the danger mark
 * (a step = danger − warning), which pins the warning mark at 50% and the danger mark at 75%.
 * The fill grows in when the bar scrolls into view.
 */
export function LevelGauge({
  value,
  warningLevel,
  dangerLevel,
  level,
  className = "",
}: LevelGaugeProps) {
  const step = dangerLevel - warningLevel || 1;
  const low = warningLevel - 2 * step;
  const percent = Math.min(100, Math.max(4, ((value - low) / (4 * step)) * 100));
  const fillClass =
    level === "danger" ? "bg-error" : level === "watch" ? "bg-tertiary" : "bg-success";

  return (
    <div className={className}>
      <div
        className="relative h-2.5 rounded-full bg-surface-container-highest"
        role="img"
        aria-label={`Level ${value.toFixed(2)} metres. Warning mark ${warningLevel.toFixed(2)} metres, danger mark ${dangerLevel.toFixed(2)} metres.`}
      >
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${fillClass}`}
          initial={{ width: "0%" }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
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
          Warning {warningLevel.toFixed(2)}
        </span>
        <span className="absolute left-3/4 -translate-x-1/4 whitespace-nowrap">
          Danger {dangerLevel.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
