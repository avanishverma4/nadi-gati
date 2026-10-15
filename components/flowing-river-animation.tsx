"use client";

import React, { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

// Each SVG is 2880 units wide (two 1440-unit cycles) and slides by exactly one cycle (-50%),
// so the loop is seamless. Wave periods all divide 1440 and use smooth Q/T curves (no kinks).
const WAVES: Array<{
  id: string;
  /** Crest line */
  line: string;
  height: string;
  topOpacity: number;
  bottomOpacity: number;
  duration: number;
  reverse?: boolean;
  crest?: boolean;
}> = [
  {
    // Back: one long, slow swell per cycle
    id: "back",
    line: "M0,60 Q360,10 720,60 T1440,60 T2160,60 T2880,60",
    height: "h-28 sm:h-40",
    topOpacity: 0.1,
    bottomOpacity: 0.04,
    duration: 38,
  },
  {
    // Middle: two swells per cycle, drifting the other way
    id: "mid",
    line: "M0,60 Q180,24 360,60 T720,60 T1080,60 T1440,60 T1800,60 T2160,60 T2520,60 T2880,60",
    height: "h-20 sm:h-28",
    topOpacity: 0.14,
    bottomOpacity: 0.06,
    duration: 26,
    reverse: true,
  },
  {
    // Front: three shallow ripples per cycle with a soft crest line
    id: "front",
    line: "M0,60 Q120,38 240,60 T480,60 T720,60 T960,60 T1200,60 T1440,60 T1680,60 T1920,60 T2160,60 T2400,60 T2640,60 T2880,60",
    height: "h-14 sm:h-20",
    topOpacity: 0.2,
    bottomOpacity: 0.1,
    duration: 18,
    crest: true,
  },
];

/**
 * Decorative river at the foot of the hero: three translucent wave layers drifting at
 * different speeds. Stays still when the visitor prefers reduced motion, and pauses while
 * scrolled out of view so it doesn't keep a phone busy for nothing.
 */
export function FlowingRiverAnimation() {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useInView(containerRef, { margin: "100px 0px" });

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-40 sm:h-52 pointer-events-none overflow-hidden select-none z-0"
    >
      {/* Soft glow rising from the water */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />

      {WAVES.map((wave) => (
        <div
          key={wave.id}
          className={`absolute bottom-0 left-0 w-[200%] min-w-[1600px] ${wave.height} ${
            shouldReduceMotion ? "" : "will-change-transform"
          }`}
          // A CSS animation can be paused in place; the motion library would restart the loop
          style={
            shouldReduceMotion
              ? undefined
              : {
                  animation: `${wave.reverse ? "nadi-river-drift-reverse" : "nadi-river-drift"} ${wave.duration}s linear infinite`,
                  animationPlayState: isVisible ? "running" : "paused",
                }
          }
        >
          <svg className="w-full h-full" viewBox="0 0 2880 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`river-${wave.id}-grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={wave.topOpacity} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={wave.bottomOpacity} />
              </linearGradient>
            </defs>
            <path d={`${wave.line} L2880,120 L0,120 Z`} fill={`url(#river-${wave.id}-grad)`} />
            {wave.crest && (
              <path
                d={wave.line}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </div>
      ))}
    </div>
  );
}
