"use client";

import React from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  CloudRain,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  Info,
  Map as MapIcon,
  MapPin,
  Phone,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SectionHeading } from "@/components/section-heading";
import { AboutPageHero } from "@/components/about-page-hero";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";

interface DataSource {
  id: string;
  icon: React.ElementType;
  name: string;
  publisher: string;
  provides: string;
  usedFor: string[];
  /** How often Nadi-Gati reads it */
  cadence: string;
  coverage: string;
  licence: string;
  links: Array<{ label: string; href: string; external: boolean }>;
}

// Every source the site actually reads or cites. Keep in step with the ingestion code in
// functions/src and the domain rules in functions/src/compliance.ts.
const DATA_SOURCES: DataSource[] = [
  {
    id: "cwc",
    icon: Building2,
    name: "Central Water Commission",
    publisher: "Ministry of Jal Shakti, Government of India",
    provides: "Flood thresholds",
    usedFor: [
      "Warning and danger marks for each river gauge",
      "Highest flood level on record",
      "Links to the official flood bulletins",
    ],
    cadence:
      "Not fetched automatically. CWC's website asks automated tools not to collect its pages, so we cite its published records and link to them instead.",
    coverage: "Gauges in the pilot districts of Bihar and Assam",
    licence: "Government of India public information",
    links: [
      {
        label: "CWC flood forecasting portal",
        href: "https://ffs.india-water.gov.in/",
        external: true,
      },
    ],
  },
  {
    id: "open-meteo",
    icon: Gauge,
    name: "Open-Meteo & GloFAS",
    publisher: "Open-Meteo, using the Copernicus Global Flood Awareness System",
    provides: "River flow & rainfall",
    usedFor: [
      "Estimated river flow for each gauge, compared with the usual flow for the time of year, with a three-day outlook",
      "Estimated rainfall over the last 24 hours for each district",
    ],
    cadence: "Every 30 minutes",
    coverage: "Gauges and districts in the pilot",
    licence:
      "Data under CC BY 4.0. The free API is for non-commercial use; commercial use needs a paid Open-Meteo plan",
    links: [
      {
        label: "Open-Meteo flood API",
        href: "https://open-meteo.com/en/docs/flood-api",
        external: true,
      },
    ],
  },
  {
    id: "openweathermap",
    icon: CloudRain,
    name: "OpenWeatherMap",
    publisher: "OpenWeather Ltd",
    provides: "Recent rainfall",
    usedFor: ["Rainfall over the last one to three hours in each pilot district"],
    cadence: "Every hour",
    coverage: "Pilot districts in Bihar and Assam",
    licence: "Free tier, CC BY-SA 4.0",
    links: [{ label: "OpenWeatherMap", href: "https://openweathermap.org/", external: true }],
  },
  {
    id: "data-gov",
    icon: Database,
    name: "data.gov.in",
    publisher: "Open Government Data Platform India",
    provides: "Open government data",
    usedFor: ["Water-resources datasets for Bihar and Assam, through the official API"],
    cadence: "Every 6 hours",
    coverage: "Bihar and Assam",
    licence: "Government Open Data Licence – India (GODL)",
    links: [{ label: "data.gov.in", href: "https://data.gov.in/", external: true }],
  },
  {
    id: "sdma",
    icon: Phone,
    name: "State disaster management authorities",
    publisher: "Bihar SDMA and Assam SDMA",
    provides: "Helplines",
    usedFor: ["National and state toll-free emergency numbers (112, 1077, 1070, 1078)"],
    cadence:
      "District landlines are left out until each one is checked against the authority's own website",
    coverage: "Pilot districts in Bihar and Assam",
    licence: "State government public information",
    links: [
      { label: "Bihar SDMA", href: "http://bsdma.org/", external: true },
      { label: "Assam SDMA", href: "https://asdma.assam.gov.in/", external: true },
    ],
  },
  {
    id: "osm",
    icon: MapIcon,
    name: "OpenStreetMap",
    publisher: "OpenStreetMap contributors",
    provides: "Maps & place names",
    usedFor: [
      "Map tiles on the flood map and district pages",
      "Turning a map pin into a village or district name, through Nominatim",
    ],
    cadence:
      "Place-name lookups are limited to one a second and saved for 7 days, as OpenStreetMap's usage policy asks",
    coverage: "All of India",
    licence: "Open Database Licence (ODbL)",
    links: [
      {
        label: "OpenStreetMap copyright",
        href: "https://www.openstreetmap.org/copyright",
        external: true,
      },
    ],
  },
  {
    id: "community",
    icon: Users,
    name: "People on the ground",
    publisher: "Nadi-Gati users",
    provides: "Flood reports",
    usedFor: [
      "Flooded roads, rising water and damaged embankments, with a map pin and optional photo",
      "Always labelled as community reports, never as official readings",
    ],
    cadence: "As reports come in",
    coverage: "Pilot districts in Bihar and Assam",
    licence: "CC BY 4.0",
    links: [{ label: "How reports are checked", href: "/about/verification", external: false }],
  },
];

const PRINCIPLES = [
  {
    id: "real",
    icon: CheckCircle2,
    title: "We never make up numbers",
    body: "Every level, mark and rainfall figure comes from a source on this page. We don't estimate or fill gaps ourselves.",
  },
  {
    id: "credited",
    icon: FileText,
    title: "Every figure is credited",
    body: "Readings name their source and when they were recorded, with a link back to the publisher.",
  },
  {
    id: "polite",
    icon: Clock,
    title: "We go easy on public servers",
    body: "We follow each site's rules on automated access, limit how often we ask, and keep copies so we don't ask twice.",
  },
];

export default function AboutSourcesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          <AboutPageHero
            id="sources"
            crumb="Data sources"
            icon={Database}
            badge="Data sources & licences"
            title="Where the numbers come from"
            note={
              <>
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-on-surface">Pilot preview.</strong> Some
                  readings on the site are still sample data, and they are labelled that way.
                </span>
              </>
            }
          >
            We don&apos;t make forecasts of our own. Nadi-Gati brings together what these{" "}
            {DATA_SOURCES.length} sources publish, says how often we read each one, and names the
            source next to every figure.
          </AboutPageHero>

          {/* =========================================================================
              PRINCIPLES
              ========================================================================= */}
          <section
            id="sources-principles"
            aria-label="How we handle data"
            className="py-12 sm:py-16 bg-surface border-b border-outline-variant/50"
          >
            <motion.ul
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 list-none"
              variants={STAGGER_GRID_VARIANTS}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {PRINCIPLES.map((principle) => (
                <motion.li
                  key={principle.id}
                  id={`sources-principle-${principle.id}`}
                  className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6"
                  variants={RISE_TILE_VARIANTS}
                >
                  <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                    <principle.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </span>
                  <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                    {principle.title}
                  </h2>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                    {principle.body}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </section>

          {/* =========================================================================
              AT A GLANCE
              ========================================================================= */}
          <section
            id="sources-summary"
            aria-labelledby="sources-summary-title"
            className="py-16 sm:py-20 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-8 sm:mb-10">
                <SectionHeading
                  id="sources-summary-title"
                  icon={FileText}
                  eyebrow="At a glance"
                  title="Every source in one list"
                  body="Tap a source for what we use it for, how often we read it and its licence."
                />
              </div>

              <ul className="rounded-3xl border border-outline-variant/70 bg-surface-container-low divide-y divide-outline-variant/50 overflow-hidden list-none">
                {DATA_SOURCES.map((source) => (
                  <li key={source.id}>
                    <a
                      href={`#source-${source.id}`}
                      id={`sources-summary-${source.id}`}
                      className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 sm:px-6 py-4 hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <span className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center row-span-2 sm:row-span-1">
                        <source.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </span>
                      <span className="font-sans font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {source.name}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all row-span-2 sm:row-span-1 sm:order-last"
                        aria-hidden="true"
                      />
                      <span className="font-sans text-sm text-on-surface-variant">
                        {source.provides}
                      </span>
                      <span className="hidden sm:block font-sans text-sm text-on-surface-variant truncate">
                        {source.licence}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* =========================================================================
              SOURCE DETAILS
              ========================================================================= */}
          <section
            id="sources-details"
            aria-label="Source details"
            className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-5 sm:gap-6">
              {DATA_SOURCES.map((source) => (
                <motion.article
                  key={source.id}
                  id={`source-${source.id}`}
                  aria-labelledby={`source-${source.id}-title`}
                  className="scroll-mt-32 rounded-3xl border border-outline-variant/70 bg-surface-container-low overflow-hidden hover:border-primary/50 hover:shadow-elevation-2 transition-[border-color,box-shadow] duration-200"
                  variants={RISE_TILE_VARIANTS}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-4 sm:gap-5">
                      <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                        <source.icon className="w-6 h-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <h2
                            id={`source-${source.id}-title`}
                            className="font-sans font-bold text-xl sm:text-2xl text-on-surface tracking-tight"
                          >
                            {source.name}
                          </h2>
                          <span className="font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-container/70 text-on-primary-container whitespace-nowrap">
                            {source.provides}
                          </span>
                        </div>
                        <p className="font-sans text-sm text-on-surface-variant mt-1">
                          {source.publisher}
                        </p>
                      </div>
                    </div>

                    <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-on-surface-variant mt-6">
                      What we use it for
                    </h3>
                    <ul className="mt-3 flex flex-col gap-2.5 list-none">
                      {source.usedFor.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 font-sans text-sm sm:text-base text-on-surface leading-snug"
                        >
                          <CheckCircle2
                            className="w-5 h-5 text-primary flex-shrink-0 mt-px"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-outline-variant/50 border-t border-outline-variant/50">
                    {[
                      { label: "How often we read it", value: source.cadence, icon: Clock },
                      { label: "Coverage", value: source.coverage, icon: MapPin },
                      { label: "Licence", value: source.licence, icon: Scale },
                    ].map((meta) => (
                      <div key={meta.label} className="bg-surface-container-low px-6 sm:px-8 py-4">
                        <dt className="flex items-center gap-1.5 font-sans text-xs font-semibold text-on-surface-variant">
                          <meta.icon className="w-3.5 h-3.5" aria-hidden="true" />
                          {meta.label}
                        </dt>
                        <dd className="font-sans text-sm text-on-surface leading-relaxed mt-1">
                          {meta.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="border-t border-outline-variant/50 px-6 sm:px-8 py-4 flex flex-wrap gap-x-6 gap-y-2">
                    {source.links.map((link) =>
                      link.external ? (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                        >
                          {link.label}
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex items-center gap-1.5 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                        >
                          {link.label}
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      )
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          {/* =========================================================================
              CORRECTIONS
              ========================================================================= */}
          <section
            id="sources-corrections"
            aria-labelledby="sources-corrections-title"
            className="py-16 sm:py-20 bg-surface-container-lowest"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-surface-container-low p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl"
                />
                <div className="relative max-w-2xl">
                  <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <h2
                    id="sources-corrections-title"
                    className="font-sans font-bold text-2xl sm:text-3xl text-on-surface tracking-tight mt-5"
                  >
                    Spot a wrong figure or a missing credit?
                  </h2>
                  <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                    Whether you work for an agency, report on floods or live by the river, tell us
                    and we will put it right. We aim to reply within 24 hours about credits and 48
                    hours about data.
                  </p>
                </div>
                <Link
                  href="/about/contact?topic=source_attribution"
                  id="sources-correction-link"
                  className="relative self-start lg:self-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 transition-all"
                >
                  Send a correction
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </motion.div>
            </div>
          </section>
        </main>
      </MotionConfig>
    </div>
  );
}
