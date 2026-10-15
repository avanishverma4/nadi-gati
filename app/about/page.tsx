"use client";

import React from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Code2,
  Database,
  Droplets,
  ExternalLink,
  FileText,
  Lock,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SectionHeading } from "@/components/section-heading";
import { FlowingRiverAnimation } from "@/components/flowing-river-animation";
import { FaqAccordion } from "@/components/legal-faq-accordion";
import { GAUGE_STATIONS, PILOT_DISTRICTS_DATA, RIVER_BASIN_SHOWCASE } from "@/lib/hydrology-data";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";
import { REPO_URL } from "@/lib/site";

const PROJECT_FACTS = [
  { id: "gauges", value: String(GAUGE_STATIONS.length), label: "river gauges" },
  { id: "districts", value: String(PILOT_DISTRICTS_DATA.length), label: "districts" },
  { id: "basins", value: String(RIVER_BASIN_SHOWCASE.length), label: "river basins" },
  { id: "cost", value: "₹0", label: "no fees, no sign-up" },
];

const HELPLINES = [
  { number: "112", label: "Emergency" },
  { number: "1078", label: "Disaster helpline" },
  { number: "1070", label: "State control room" },
];

// Each problem is paired with what the platform does about it
const PROBLEMS = [
  {
    id: "pdfs",
    icon: FileText,
    title: "Buried in PDFs",
    body: "Official bulletins are tables inside PDF files, spread across several government websites. They are hard to find and harder to read on a phone.",
    answer: "One page per district, designed for a phone screen.",
  },
  {
    id: "distance",
    icon: MapPin,
    title: "Gauges are far apart",
    body: "River gauges can be tens of kilometres apart. A reading upstream can't tell you that the road or embankment near you is already under water.",
    answer: "Reports from people on the ground, shown beside the gauge readings.",
  },
  {
    id: "rumours",
    icon: AlertTriangle,
    title: "Rumours travel faster",
    body: "With no single place to check, forwarded messages fill the gap. That causes panic where it is safe and calm where it is not.",
    answer: "Every figure shows where it came from and when it was recorded.",
  },
];

// Where each kind of information comes from
const DATA_SOURCES = [
  {
    id: "cwc",
    icon: Building2,
    name: "Central Water Commission",
    provides: "Flood thresholds",
    body: "The reference for warning marks, danger marks and highest-flood records. We cite CWC bulletins rather than copying its website automatically.",
  },
  {
    id: "open-meteo",
    icon: Droplets,
    name: "Open-Meteo & GloFAS",
    provides: "River flow & rainfall",
    body: "River-flow estimates from the GloFAS model through Open-Meteo's open API, plus rainfall from Open-Meteo and OpenWeatherMap.",
  },
  {
    id: "data-gov",
    icon: FileText,
    name: "data.gov.in",
    provides: "Open government data",
    body: "Water-resources datasets published under the Government Open Data Licence.",
  },
  {
    id: "sdma",
    icon: Phone,
    name: "State disaster authorities",
    provides: "Helplines",
    body: "District control-room and emergency numbers from the Bihar and Assam disaster management authorities.",
  },
  {
    id: "community",
    icon: Users,
    name: "People on the ground",
    provides: "Flood reports",
    body: "Anonymous reports with a photo and a map pin. Always labelled as community reports, never as official readings.",
  },
  {
    id: "osm",
    icon: MapIcon,
    name: "OpenStreetMap",
    provides: "Maps",
    body: "Map tiles and place names from OpenStreetMap and its contributors.",
  },
];

// Who the platform is for, and the first thing each group would do here
const AUDIENCES = [
  {
    id: "residents",
    icon: Users,
    label: "Residents & farmers",
    title: "If you live near a river",
    body: "Check your district before you travel, move livestock or decide whether to leave.",
    points: [
      "Today's level against the danger mark",
      "Your district's helpline numbers",
      "Alerts for your district, coming soon",
    ],
    cta: "Find your district",
    href: "/districts",
    tileClass: "bg-primary text-on-primary",
  },
  {
    id: "responders",
    icon: ShieldCheck,
    label: "Volunteers & responders",
    title: "If you help when it floods",
    body: "See where people are reporting trouble, next to the nearest gauge readings.",
    points: [
      "Reports with a map pin and photo",
      "Which reports back each other up",
      "Gauge readings for the same area",
    ],
    cta: "Open the flood map",
    href: "/#map-section",
    tileClass: "bg-error text-on-error",
  },
  {
    id: "researchers",
    icon: Code2,
    label: "Researchers & journalists",
    title: "If you study or report on floods",
    body: "Nothing is hidden. The code is open and every source is listed.",
    points: [
      "Open-source code under the MIT licence",
      "Sources and licences listed in full",
      "A corrections desk for reporting errors",
    ],
    cta: "See data sources",
    href: "/about/sources",
    tileClass: "bg-tertiary text-on-tertiary",
  },
];

// What "open" means for this project
const OPEN_PRINCIPLES = [
  {
    id: "free",
    icon: CheckCircle2,
    title: "Free to use",
    body: "No fees, no adverts and no account to create.",
  },
  {
    id: "code",
    icon: Code2,
    title: "Open code",
    body: "Published under the MIT licence. Read it, run it or build on it.",
  },
  {
    id: "sources",
    icon: Database,
    title: "Open about its data",
    body: "Every source and its licence is listed for anyone to check.",
  },
  {
    id: "corrections",
    icon: Mail,
    title: "Open to correction",
    body: "Spot a mistake? Tell us and we will put it right.",
  },
];

// The detailed policy pages under /about
const POLICY_PAGES = [
  {
    id: "sources",
    icon: Database,
    title: "Data sources & licences",
    body: "Every feed we use, how often it updates and the licence it is published under.",
    href: "/about/sources",
  },
  {
    id: "verification",
    icon: ShieldCheck,
    title: "How reports are checked",
    body: "How a report goes from unconfirmed to matching nearby reports, and what a match does and doesn't tell you.",
    href: "/about/verification",
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy",
    body: "No name, phone or email, no tracking cookies, photos cleaned of hidden location data, and report pins rounded to about 100 m.",
    href: "/about/privacy",
  },
  {
    id: "legal",
    icon: Scale,
    title: "Legal basis",
    body: "Why we are independent, how we credit government data, and our role under the IT Act.",
    href: "/about/legal",
  },
  {
    id: "terms",
    icon: FileText,
    title: "Terms of use",
    body: "The ground rules for using the site and sending reports, in plain language.",
    href: "/about/terms",
  },
  {
    id: "contact",
    icon: Mail,
    title: "Corrections & contact",
    body: "Report a wrong figure or a missing credit. We aim to reply within 24 to 48 hours.",
    href: "/about/contact",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          {/* =========================================================================
              HERO
              ========================================================================= */}
          <section
            id="about-hero"
            aria-labelledby="about-title"
            className="relative overflow-hidden border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface"
          >
            <FlowingRiverAnimation />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-28 sm:pt-20 sm:pb-40">
              <motion.div
                className="max-w-3xl space-y-6"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                animate="show"
              >
                <motion.div
                  variants={RISE_TILE_VARIANTS}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary-container/50 text-on-primary-container text-xs font-sans font-semibold"
                >
                  <Waves className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>
                    About Nadi-Gati · <span lang="hi">नदी-गति</span>
                  </span>
                </motion.div>

                <motion.h1
                  id="about-title"
                  variants={RISE_TILE_VARIANTS}
                  className="font-sans font-bold text-4xl sm:text-5xl xl:text-6xl text-on-surface tracking-tight leading-[1.08] text-balance"
                >
                  Flood information,{" "}
                  <span className="text-primary">made for the people who live with it.</span>
                </motion.h1>

                <motion.p
                  variants={RISE_TILE_VARIANTS}
                  className="font-sans text-base sm:text-xl text-on-surface-variant leading-relaxed max-w-2xl"
                >
                  Nadi-Gati is a free, open-source website that turns published river data into one
                  clear page for each district, with reports from people on the ground beside the
                  official readings.
                </motion.p>

                <motion.div
                  variants={RISE_TILE_VARIANTS}
                  className="pt-1 grid grid-cols-1 sm:inline-grid sm:grid-cols-2 gap-3"
                >
                  <Link
                    href="/districts"
                    id="about-hero-districts"
                    className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full bg-primary text-on-primary font-sans font-semibold text-base whitespace-nowrap shadow-elevation-2 hover:brightness-110 active:brightness-95 transition-all"
                  >
                    <MapPin className="w-5 h-5" aria-hidden="true" />
                    <span>Find your district</span>
                  </Link>
                  {REPO_URL && (
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="about-hero-code"
                      className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full border border-outline-variant bg-surface-container text-on-surface font-sans font-semibold text-base whitespace-nowrap hover:bg-surface-container-high transition-all"
                    >
                      <Code2 className="w-5 h-5 text-primary" aria-hidden="true" />
                      <span>View the code</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </motion.div>
              </motion.div>

              {/* Project at a glance */}
              <motion.dl
                id="about-facts"
                className="mt-12 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-3xl overflow-hidden border border-outline-variant/70 bg-outline-variant/50"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                animate="show"
              >
                {PROJECT_FACTS.map((fact) => (
                  <motion.div
                    key={fact.id}
                    variants={RISE_TILE_VARIANTS}
                    className="bg-surface-container-low/90 backdrop-blur-md px-5 py-5 sm:px-7 sm:py-6"
                  >
                    <dt className="sr-only">{fact.label}</dt>
                    <dd className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight">
                      {fact.value}
                    </dd>
                    <dd className="font-sans text-sm text-on-surface-variant mt-1">{fact.label}</dd>
                  </motion.div>
                ))}
              </motion.dl>
            </div>
          </section>

          {/* =========================================================================
              INDEPENDENCE & EMERGENCY
              ========================================================================= */}
          <section
            id="about-independence"
            aria-labelledby="about-independence-title"
            className="py-12 sm:py-16 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="relative overflow-hidden rounded-3xl border border-outline-variant/70 bg-surface-container-low grid grid-cols-1 lg:grid-cols-12"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl"
                />

                <div className="relative lg:col-span-7 p-6 sm:p-8 lg:p-10">
                  <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <h2
                    id="about-independence-title"
                    className="font-sans font-bold text-2xl sm:text-3xl text-on-surface tracking-tight mt-5"
                  >
                    Independent, not official
                  </h2>
                  <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-3 max-w-2xl">
                    Nadi-Gati is a community project. It is not affiliated with or endorsed by the
                    Government of India, the Central Water Commission, the NDMA or any state
                    disaster authority. We credit every figure to the agency that published it, and
                    we never issue evacuation orders.
                  </p>
                  <ul className="mt-5 flex flex-wrap gap-2 list-none">
                    {["Community-run", "Not a government service", "MIT licence"].map((fact) => (
                      <li
                        key={fact}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/70 bg-surface font-sans text-sm font-medium text-on-surface"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative lg:col-span-5 p-6 sm:p-8 lg:p-10 bg-error-container/40 border-t lg:border-t-0 lg:border-l border-outline-variant/60 flex flex-col justify-center">
                  <h3 className="font-sans font-bold text-lg text-on-surface tracking-tight flex items-center gap-2">
                    <Phone className="w-5 h-5 text-error" aria-hidden="true" />
                    In an emergency
                  </h3>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                    Don&apos;t wait for this website. Call for help and follow instructions from
                    your district administration.
                  </p>
                  <ul className="mt-5 grid grid-cols-3 gap-2 list-none">
                    {HELPLINES.map((line) => (
                      <li key={line.number}>
                        <a
                          href={`tel:${line.number}`}
                          className="flex flex-col items-center justify-center h-full rounded-2xl bg-surface border border-error/30 px-2 py-3 text-center hover:border-error hover:bg-error-container/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
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
                </div>
              </motion.div>
            </div>
          </section>

          {/* =========================================================================
              WHY WE BUILT IT
              ========================================================================= */}
          <section
            id="about-why"
            aria-labelledby="about-why-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-5">
                <div className="lg:sticky lg:top-36">
                  <SectionHeading
                    id="about-why-title"
                    icon={Waves}
                    eyebrow="Why we built it"
                    title="Flood information exists. It's just hard to use."
                    body="River levels are published every day of the monsoon, but rarely in a form a family can act on in a hurry. Here is what gets in the way, and what we do instead."
                  />
                </div>
              </div>

              <motion.ol
                className="lg:col-span-7 flex flex-col gap-4 sm:gap-5 list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {PROBLEMS.map((problem, index) => (
                  <motion.li
                    key={problem.id}
                    id={`about-problem-${problem.id}`}
                    className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-7 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <div className="flex items-start gap-4 sm:gap-5">
                      <span className="w-12 h-12 rounded-2xl bg-error-container flex items-center justify-center flex-shrink-0">
                        <problem.icon className="w-6 h-6 text-error" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-sans font-bold text-xl text-on-surface tracking-tight">
                            {problem.title}
                          </h3>
                          <span
                            className="font-sans font-bold text-sm text-on-surface-variant/60"
                            aria-hidden="true"
                          >
                            0{index + 1}
                          </span>
                        </div>
                        <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2">
                          {problem.body}
                        </p>
                        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-primary-container/50 px-4 py-3">
                          <CheckCircle2
                            className="w-5 h-5 text-primary flex-shrink-0 mt-px"
                            aria-hidden="true"
                          />
                          <span className="font-sans text-sm text-on-surface leading-snug">
                            <strong className="font-semibold">What we do:</strong> {problem.answer}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </section>

          {/* =========================================================================
              WHERE THE NUMBERS COME FROM
              ========================================================================= */}
          <section
            id="about-sources"
            aria-labelledby="about-sources-title"
            className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
                <SectionHeading
                  id="about-sources-title"
                  icon={Database}
                  eyebrow="Our sources"
                  title="Where the numbers come from"
                  body="We don't make forecasts of our own. Nadi-Gati brings together what these sources publish and names the source next to every figure."
                />
                <Link
                  href="/about/sources"
                  id="about-sources-link"
                  className="self-start md:self-auto inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4 whitespace-nowrap"
                >
                  Full source list &amp; licences
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <motion.ul
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
              >
                {DATA_SOURCES.map((source) => (
                  <motion.li
                    key={source.id}
                    id={`about-source-${source.id}`}
                    className="flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center flex-shrink-0">
                        <source.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </span>
                      <span className="font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant whitespace-nowrap">
                        {source.provides}
                      </span>
                    </div>
                    <h3 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                      {source.name}
                    </h3>
                    <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                      {source.body}
                    </p>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* =========================================================================
              WHO IT'S FOR
              ========================================================================= */}
          <section
            id="about-audiences"
            aria-labelledby="about-audiences-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 sm:mb-14">
                <SectionHeading
                  id="about-audiences-title"
                  icon={Users}
                  eyebrow="Who it's for"
                  title="Built for people who live with the river"
                  body="Whether you live on the floodplain, help when it floods, or study what happened afterwards."
                  centered
                />
              </div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
              >
                {AUDIENCES.map((audience) => (
                  <motion.article
                    key={audience.id}
                    id={`about-audience-${audience.id}`}
                    className="flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-7 hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <span
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${audience.tileClass}`}
                    >
                      <audience.icon className="w-6 h-6" aria-hidden="true" />
                    </span>
                    <div className="font-sans text-xs font-semibold uppercase tracking-wider text-on-surface-variant mt-5">
                      {audience.label}
                    </div>
                    <h3 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-1">
                      {audience.title}
                    </h3>
                    <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2">
                      {audience.body}
                    </p>

                    <ul className="mt-5 mb-6 flex flex-col gap-2.5 list-none">
                      {audience.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2.5 font-sans text-sm text-on-surface leading-snug"
                        >
                          <CheckCircle2
                            className="w-5 h-5 text-primary flex-shrink-0 mt-px"
                            aria-hidden="true"
                          />
                          {point}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={audience.href}
                      id={`about-audience-${audience.id}-link`}
                      className="mt-auto inline-flex items-center justify-center gap-2 h-12 px-4 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
                    >
                      {audience.cta}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </section>

          {/* =========================================================================
              OPEN BY DEFAULT
              ========================================================================= */}
          <section
            id="about-open-source"
            aria-labelledby="about-open-source-title"
            className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-surface-container-low grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 p-6 sm:p-10 lg:p-14"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
                />

                <motion.div
                  className="relative lg:col-span-6 flex flex-col justify-center"
                  variants={RISE_TILE_VARIANTS}
                >
                  <SectionHeading
                    id="about-open-source-title"
                    icon={Code2}
                    eyebrow="Open by default"
                    title="Flood information should belong to everyone"
                    body="Anyone can check how Nadi-Gati works, point out a mistake, or adapt it for another river."
                  />
                  {REPO_URL && (
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="about-open-source-github"
                      className="mt-8 self-start inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 transition-all"
                    >
                      <Code2 className="w-4 h-4" aria-hidden="true" />
                      <span>View the code on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </motion.div>

                <ul className="relative lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 list-none">
                  {OPEN_PRINCIPLES.map((principle) => (
                    <motion.li
                      key={principle.id}
                      id={`about-principle-${principle.id}`}
                      className="rounded-3xl border border-outline-variant/60 bg-surface p-5"
                      variants={RISE_TILE_VARIANTS}
                    >
                      <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                        <principle.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </span>
                      <h3 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                        {principle.title}
                      </h3>
                      <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1">
                        {principle.body}
                      </p>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </section>

          {/* =========================================================================
              POLICIES
              ========================================================================= */}
          <section
            id="about-policies"
            aria-labelledby="about-policies-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-4">
                <SectionHeading
                  id="about-policies-title"
                  icon={FileText}
                  eyebrow="The details"
                  title="How we work, in full"
                  body="The longer answers on data, checking, privacy, our legal position and the terms of use."
                />
              </div>

              <motion.ul
                className="lg:col-span-8 rounded-3xl border border-outline-variant/70 bg-surface-container-low divide-y divide-outline-variant/50 overflow-hidden list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {POLICY_PAGES.map((page) => (
                  <motion.li key={page.id} variants={RISE_TILE_VARIANTS}>
                    <Link
                      href={page.href}
                      id={`about-policy-${page.id}`}
                      className="group flex items-center gap-4 sm:gap-5 px-5 sm:px-7 py-5 hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                        <page.icon
                          className="w-5 h-5 text-primary group-hover:text-on-primary transition-colors"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans font-bold text-base sm:text-lg text-on-surface tracking-tight group-hover:text-primary transition-colors">
                          {page.title}
                        </span>
                        <span className="block font-sans text-sm text-on-surface-variant leading-relaxed mt-0.5">
                          {page.body}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="w-5 h-5 text-on-surface-variant flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        aria-hidden="true"
                      />
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* =========================================================================
              FAQ
              ========================================================================= */}
          <section
            id="faq"
            aria-labelledby="faq-title"
            className="scroll-mt-28 py-16 sm:py-24 bg-surface"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-36 space-y-8">
                  <SectionHeading
                    id="faq-title"
                    icon={FileText}
                    eyebrow="FAQ"
                    title="Questions people ask"
                    body="Short answers about who runs Nadi-Gati, where its numbers come from and what it can and can't do."
                  />
                  <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6">
                    <h3 className="font-sans font-bold text-lg text-on-surface tracking-tight">
                      Still have a question?
                    </h3>
                    <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                      Ask us, or tell us about something that looks wrong.
                    </p>
                    <Link
                      href="/about/contact"
                      id="faq-contact-link"
                      className="mt-4 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-surface-container transition-all"
                    >
                      Contact us
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8">
                <FaqAccordion />
              </div>
            </div>
          </section>
        </main>
      </MotionConfig>
    </div>
  );
}
