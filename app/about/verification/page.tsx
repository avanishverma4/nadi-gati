"use client";

import React from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SectionHeading } from "@/components/section-heading";
import { AboutPageHero } from "@/components/about-page-hero";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";

// Keep in step with PROXIMITY_RADIUS_METERS and TIME_WINDOW_HOURS in functions/src/corroboration.ts
const MATCH_RADIUS_KM = 15;
const MATCH_WINDOW_HOURS = 24;

const STEPS = [
  {
    id: "report",
    icon: MapPin,
    title: "Someone reports what they see",
    body: "They choose what is happening, drop a pin and can add a photo. No account is needed. Before anything is sent, the pin is rounded to about 100 m and hidden data is removed from the photo.",
  },
  {
    id: "match",
    icon: Search,
    title: "We look for matching reports",
    body: `As soon as a report arrives, we look for other reports within ${MATCH_RADIUS_KM} km that were made in the previous ${MATCH_WINDOW_HOURS} hours. The more matches, the more weight the report carries.`,
  },
  {
    id: "label",
    icon: ShieldCheck,
    title: "You see a clear label",
    body: "Every report shows whether it stands alone or matches others nearby, and it is always marked as a community report, never as an official reading.",
  },
];

const LABELS = [
  {
    id: "unconfirmed",
    icon: Clock,
    name: "First report — unconfirmed",
    tileClass: "bg-tertiary-container",
    iconClass: "text-tertiary",
    meaning: `One person has reported this, and nobody else has reported flooding within ${MATCH_RADIUS_KM} km yet.`,
    advice: "Stay alert, check the nearest gauge, and don't forward it as fact.",
  },
  {
    id: "matches",
    icon: Users,
    name: "Matches nearby reports",
    tileClass: "bg-success-container",
    iconClass: "text-success",
    meaning: `Other people have reported flooding within ${MATCH_RADIUS_KM} km in the last ${MATCH_WINDOW_HOURS} hours. The label says how many.`,
    advice: "Take it seriously. Avoid low roads and culverts in the area.",
  },
  {
    id: "official",
    icon: Gauge,
    name: "Official river status",
    tileClass: "bg-primary-container",
    iconClass: "text-primary",
    meaning:
      "Normal, Watch and Danger on a river gauge come only from official warning and danger marks. Community reports never change them.",
    advice: "If a gauge shows Danger, follow your district administration's instructions.",
  },
];

const LIMITS = [
  `A match means several people reported flooding somewhere within ${MATCH_RADIUS_KM} km. It doesn't prove they saw the same thing.`,
  "Reports are not automatically compared with river gauge readings. Check the nearest gauge yourself on the district page.",
  "Photos are not reviewed automatically. A photo helps others judge a report, but it is not a confirmation.",
  "A report with no matches may still be true, especially in places where few people use Nadi-Gati.",
];

export default function AboutVerificationPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          <AboutPageHero
            id="verification"
            crumb="How reports are checked"
            icon={ShieldCheck}
            badge="Community reports"
            title="How flood reports are checked"
          >
            Anyone can report flooding, and in a monsoon rumours travel fast. Here is how we tell a
            single report from a pattern, and how to read the labels you see.
          </AboutPageHero>

          {/* =========================================================================
              WHY IT MATTERS
              ========================================================================= */}
          <section
            id="verification-why"
            aria-labelledby="verification-why-title"
            className="py-12 sm:py-16 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
              >
                <div className="lg:col-span-4 flex items-center gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-tertiary-container flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-tertiary" aria-hidden="true" />
                  </span>
                  <h2
                    id="verification-why-title"
                    className="font-sans font-bold text-2xl text-on-surface tracking-tight"
                  >
                    Why it matters
                  </h2>
                </div>
                <p className="lg:col-span-8 font-sans text-base sm:text-lg text-on-surface-variant leading-relaxed">
                  A false alarm can send families and livestock out into the rain for nothing. A
                  missed report can leave someone stranded on a road that is already under water. So
                  we never treat a single report as fact, and we never let software invent flood
                  levels.
                </p>
              </motion.div>
            </div>
          </section>

          {/* =========================================================================
              STEPS
              ========================================================================= */}
          <section
            id="verification-steps"
            aria-labelledby="verification-steps-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 sm:mb-14">
                <SectionHeading
                  id="verification-steps-title"
                  icon={CheckCircle2}
                  eyebrow="How it works"
                  title="From a report to a label in three steps"
                  centered
                />
              </div>

              <motion.ol
                className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {STEPS.map((step, index) => (
                  <motion.li
                    key={step.id}
                    id={`verification-step-${step.id}`}
                    className="relative flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-7"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center">
                        <step.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                      </span>
                      <span
                        className="font-sans font-bold text-4xl text-on-surface-variant/25 tracking-tight"
                        aria-hidden="true"
                      >
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-5">
                      {step.title}
                    </h3>
                    <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2">
                      {step.body}
                    </p>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </section>

          {/* =========================================================================
              LABELS
              ========================================================================= */}
          <section
            id="verification-labels"
            aria-labelledby="verification-labels-title"
            className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 sm:mb-12">
                <SectionHeading
                  id="verification-labels-title"
                  icon={Info}
                  eyebrow="Reading the labels"
                  title="What each label means"
                  body="Each one tells you how much weight to give what you are seeing, and what to do next."
                />
              </div>

              <motion.ul
                className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {LABELS.map((label) => (
                  <motion.li
                    key={label.id}
                    id={`verification-label-${label.id}`}
                    className="flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low overflow-hidden"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <div className="p-6 sm:p-7 flex-1">
                      <span
                        className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full ${label.tileClass}`}
                      >
                        <span className="w-7 h-7 rounded-full bg-surface flex items-center justify-center">
                          <label.icon className={`w-4 h-4 ${label.iconClass}`} aria-hidden="true" />
                        </span>
                        <span className="font-sans font-semibold text-sm text-on-surface">
                          {label.name}
                        </span>
                      </span>
                      <p className="font-sans text-sm sm:text-base text-on-surface leading-relaxed mt-5">
                        {label.meaning}
                      </p>
                    </div>
                    <div className="border-t border-outline-variant/50 px-6 sm:px-7 py-4 flex items-start gap-2.5">
                      <ArrowRight
                        className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="font-sans text-sm text-on-surface-variant leading-snug">
                        {label.advice}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* =========================================================================
              LIMITS
              ========================================================================= */}
          <section
            id="verification-limits"
            aria-labelledby="verification-limits-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-5">
                <SectionHeading
                  id="verification-limits-title"
                  icon={XCircle}
                  eyebrow="Being honest"
                  title="What a match doesn't tell you"
                  body="Matching is a useful signal, not a guarantee. These are its limits."
                />
                <Link
                  href="/districts"
                  id="verification-gauges-link"
                  className="mt-6 inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                >
                  Check the gauges in your district
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <motion.ul
                className="lg:col-span-7 rounded-3xl border border-outline-variant/70 bg-surface-container-low divide-y divide-outline-variant/50 overflow-hidden list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {LIMITS.map((limit) => (
                  <motion.li
                    key={limit}
                    className="flex items-start gap-3.5 px-5 sm:px-7 py-5 font-sans text-sm sm:text-base text-on-surface leading-relaxed"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <Info
                      className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    {limit}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* =========================================================================
              FALSE REPORTS & EMERGENCY
              ========================================================================= */}
          <section
            id="verification-help"
            aria-label="Report a problem or get help"
            className="py-16 sm:py-20 bg-surface"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
              <motion.div
                className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8 flex flex-col"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
              >
                <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" aria-hidden="true" />
                </span>
                <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-5">
                  Seen a false or harmful report?
                </h2>
                <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                  Tell us which report it is and what is wrong. We can remove reports that are
                  false, abusive or show someone&apos;s private details.
                </p>
                <Link
                  href="/about/contact?topic=citizen_report_disputed"
                  id="verification-flag-link"
                  className="mt-6 self-start inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 transition-all"
                >
                  Flag a report
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </motion.div>

              <motion.div
                className="rounded-3xl border border-error/30 bg-error-container/40 p-6 sm:p-8 flex flex-col"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
              >
                <span className="w-12 h-12 rounded-2xl bg-error text-on-error flex items-center justify-center">
                  <Phone className="w-6 h-6" aria-hidden="true" />
                </span>
                <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-5">
                  In danger right now?
                </h2>
                <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                  Don&apos;t wait for a report to be confirmed. Call for help and follow your
                  district administration.
                </p>
                <ul className="mt-6 grid grid-cols-3 gap-2 list-none">
                  {[
                    { number: "112", label: "Emergency" },
                    { number: "1078", label: "Disaster helpline" },
                    { number: "1070", label: "State control room" },
                  ].map((line) => (
                    <li key={line.number}>
                      <a
                        href={`tel:${line.number}`}
                        className="flex flex-col items-center justify-center h-full rounded-2xl bg-surface border border-error/30 px-2 py-3 text-center hover:border-error transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                      >
                        <span className="font-sans font-bold text-xl text-error">
                          {line.number}
                        </span>
                        <span className="font-sans text-xs leading-tight text-on-surface-variant mt-0.5">
                          {line.label}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </section>
        </main>
      </MotionConfig>
    </div>
  );
}
