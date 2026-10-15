"use client";

import React from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  ArrowRight,
  Bell,
  Camera,
  Clock,
  Cookie,
  Eye,
  EyeOff,
  Globe,
  Lightbulb,
  Lock,
  Mail,
  MapPin,
  Smartphone,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SectionHeading } from "@/components/section-heading";
import { AboutPageHero } from "@/components/about-page-hero";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";

const LAST_UPDATED = "14 October 2026";

// Each promise here is enforced in code: see lib/report-privacy.ts, app/report/page.tsx,
// components/alert-subscription-modal.tsx and firestore.rules.
const PROMISES = [
  {
    id: "no-account",
    icon: UserX,
    title: "No account, no contact details",
    body: "We never ask for your name, phone number, email or ID, to browse, report or get alerts.",
  },
  {
    id: "no-tracking",
    icon: Cookie,
    title: "No tracking",
    body: "No tracking cookies, no analytics, no adverts and no data sold to anyone.",
  },
  {
    id: "photos",
    icon: Camera,
    title: "Photos cleaned on your phone",
    body: "Hidden data, such as where and when a photo was taken and on which phone, is removed before it is sent.",
  },
  {
    id: "location",
    icon: MapPin,
    title: "Locations rounded",
    body: "The pin on a report is rounded to about 100 metres, so it shows the area, not a doorstep.",
  },
];

const STORED = [
  {
    id: "report",
    icon: MapPin,
    what: "A flood report",
    details:
      "What you saw, your short description, the pin rounded to about 100 m, the nearest district and the time.",
    visibility: "Public",
    visibilityNote: "Anyone can see reports. That is how they help others.",
    isPublic: true,
  },
  {
    id: "photo",
    icon: Camera,
    what: "A report photo, if you add one",
    details:
      "The picture only, re-saved on your phone without its hidden data and scaled to at most 2048 pixels.",
    visibility: "Public",
    visibilityNote: "Shown with the report.",
    isPublic: true,
  },
  {
    id: "alerts",
    icon: Bell,
    what: "An alert subscription",
    details:
      "Your browser's notification address, the district and the alert level you chose, and a random key for unsubscribing.",
    visibility: "Private",
    visibilityNote: "Never shown on the site. Used only to send alerts.",
    isPublic: false,
  },
  {
    id: "message",
    icon: Mail,
    what: "A message to us",
    details:
      "What you write on the contact page, and your name and email only if you choose to add them so we can reply.",
    visibility: "Private",
    visibilityNote: "Read only by the people who answer messages.",
    isPublic: false,
  },
];

const ON_DEVICE = [
  "Your light or dark theme choice",
  "Whether you dismissed the 'add to home screen' prompt",
  "The key for any alert subscription, so you can unsubscribe",
  "Copies of pages, so the site still opens on a weak connection",
];

const NEVER = [
  "Your name or email, unless you add them to a message",
  "Your phone number",
  "Aadhaar or any other ID",
  "An account or password",
  "Your IP address or a device ID with a report",
  "Your exact location",
  "Advertising or tracking IDs",
];

const TIPS = [
  {
    id: "pin",
    title: "Pin the flooding, not your home",
    body: "Drop the pin where the water is, such as the road or embankment.",
  },
  {
    id: "faces",
    title: "Leave people out of photos",
    body: "Photos are public and faces are not blurred. Frame the water, not people or number plates.",
  },
  {
    id: "words",
    title: "Keep personal details out of descriptions",
    body: "Describe what you see. Don't include names or phone numbers.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          <AboutPageHero
            id="privacy"
            crumb="Privacy"
            icon={Lock}
            badge="Privacy"
            title="We collect as little as we can"
            note={
              <>
                <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>Last updated {LAST_UPDATED}.</span>
              </>
            }
          >
            Here is exactly what is stored when you use Nadi-Gati, who can see it, and what never
            leaves your phone.
          </AboutPageHero>

          {/* =========================================================================
              PROMISES
              ========================================================================= */}
          <section
            id="privacy-promises"
            aria-label="Our privacy promises"
            className="py-12 sm:py-16 bg-surface border-b border-outline-variant/50"
          >
            <motion.ul
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 list-none"
              variants={STAGGER_GRID_VARIANTS}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {PROMISES.map((promise) => (
                <motion.li
                  key={promise.id}
                  id={`privacy-promise-${promise.id}`}
                  className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6"
                  variants={RISE_TILE_VARIANTS}
                >
                  <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                    <promise.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </span>
                  <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                    {promise.title}
                  </h2>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                    {promise.body}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </section>

          {/* =========================================================================
              WHAT WE STORE
              ========================================================================= */}
          <section
            id="privacy-stored"
            aria-labelledby="privacy-stored-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 sm:mb-12">
                <SectionHeading
                  id="privacy-stored-title"
                  icon={Eye}
                  eyebrow="What we store"
                  title="Only what you choose to send reaches us"
                  body="Just browsing the site sends us nothing about you. These are the only things we store."
                />
              </div>

              <motion.ul
                className="rounded-3xl border border-outline-variant/70 bg-surface-container-low divide-y divide-outline-variant/50 overflow-hidden list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {STORED.map((item) => (
                  <motion.li
                    key={item.id}
                    id={`privacy-stored-${item.id}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 px-5 sm:px-7 py-6"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <div className="md:col-span-7 flex items-start gap-4">
                      <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-sans font-bold text-lg text-on-surface tracking-tight">
                          {item.what}
                        </h3>
                        <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-1">
                          {item.details}
                        </p>
                      </div>
                    </div>
                    <div className="md:col-span-5 md:pl-8 md:border-l border-outline-variant/50 pl-[60px]">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-sans text-xs font-semibold ${
                          item.isPublic
                            ? "bg-tertiary-container text-on-tertiary-container"
                            : "bg-success-container text-on-success-container"
                        }`}
                      >
                        {item.isPublic ? (
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {item.visibility}
                      </span>
                      <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-2">
                        {item.visibilityNote}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* =========================================================================
              ON YOUR DEVICE / NEVER COLLECTED
              ========================================================================= */}
          <section
            id="privacy-device"
            aria-label="What stays on your device and what we never collect"
            className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
          >
            <motion.div
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6"
              variants={STAGGER_GRID_VARIANTS}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
            >
              <motion.div
                className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8"
                variants={RISE_TILE_VARIANTS}
              >
                <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
                  <Smartphone className="w-6 h-6" aria-hidden="true" />
                </span>
                <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-5">
                  Kept only on your device
                </h2>
                <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                  Your browser keeps these for you. We never receive them, and clearing your browser
                  data removes them.
                </p>
                <ul className="mt-5 flex flex-col gap-2.5 list-none">
                  {ON_DEVICE.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 font-sans text-sm sm:text-base text-on-surface leading-snug"
                    >
                      <Smartphone
                        className="w-5 h-5 text-primary flex-shrink-0 mt-px"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8"
                variants={RISE_TILE_VARIANTS}
              >
                <span className="w-12 h-12 rounded-2xl bg-surface-container-highest text-on-surface flex items-center justify-center">
                  <XCircle className="w-6 h-6" aria-hidden="true" />
                </span>
                <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-5">
                  Never collected
                </h2>
                <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                  We never ask for these, and nothing on the site needs them.
                </p>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 list-none">
                  {NEVER.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 font-sans text-sm sm:text-base text-on-surface leading-snug"
                    >
                      <XCircle
                        className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-px"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </section>

          {/* =========================================================================
              OTHER SERVICES
              ========================================================================= */}
          <section
            id="privacy-services"
            aria-labelledby="privacy-services-title"
            className="py-16 sm:py-24 bg-surface-container-lowest border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  id="privacy-services-title"
                  icon={Globe}
                  eyebrow="Other services"
                  title="Services that help run the site"
                />
              </div>
              <div className="lg:col-span-7 space-y-4">
                <p className="font-sans text-base text-on-surface-variant leading-relaxed">
                  Like any website, Nadi-Gati relies on other services to work. Reports and alert
                  subscriptions are stored with Google Firebase. Maps come from OpenStreetMap, and
                  fonts from Google Fonts.
                </p>
                <p className="font-sans text-base text-on-surface-variant leading-relaxed">
                  To send you a page, a map or a font, these services see your IP address, the way
                  any website does. We don&apos;t add it to your reports, and we don&apos;t use it
                  to work out who you are.
                </p>
                <p className="font-sans text-base text-on-surface-variant leading-relaxed">
                  When you tap the map to look up a place, our own server asks OpenStreetMap&apos;s
                  Nominatim service for the place name, so your browser doesn&apos;t contact it
                  directly.
                </p>
              </div>
            </div>
          </section>

          {/* =========================================================================
              TIPS
              ========================================================================= */}
          <section
            id="privacy-tips"
            aria-labelledby="privacy-tips-title"
            className="py-16 sm:py-24 bg-surface border-b border-outline-variant/50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-10 sm:mb-12">
                <SectionHeading
                  id="privacy-tips-title"
                  icon={Lightbulb}
                  eyebrow="When you report"
                  title="Three ways to keep yourself and others private"
                  body="Reports are public, so a little care goes a long way."
                />
              </div>

              <motion.ol
                className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 list-none"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
              >
                {TIPS.map((tip, index) => (
                  <motion.li
                    key={tip.id}
                    id={`privacy-tip-${tip.id}`}
                    className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-7"
                    variants={RISE_TILE_VARIANTS}
                  >
                    <span
                      className="font-sans font-bold text-4xl text-on-surface-variant/25 tracking-tight"
                      aria-hidden="true"
                    >
                      0{index + 1}
                    </span>
                    <h3 className="font-sans font-bold text-xl text-on-surface tracking-tight mt-3">
                      {tip.title}
                    </h3>
                    <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-2">
                      {tip.body}
                    </p>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </section>

          {/* =========================================================================
              YOUR CHOICES
              ========================================================================= */}
          <section
            id="privacy-choices"
            aria-labelledby="privacy-choices-title"
            className="py-16 sm:py-20 bg-surface-container-lowest"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-surface-container-low p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl"
                />
                <div className="relative lg:col-span-8">
                  <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
                    <Trash2 className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <h2
                    id="privacy-choices-title"
                    className="font-sans font-bold text-2xl sm:text-3xl text-on-surface tracking-tight mt-5"
                  >
                    Want something removed?
                  </h2>
                  <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                    If a report or photo shows you, your home or anything private, tell us and we
                    will take it down. To stop alerts, use the unsubscribe link you were given, or
                    turn off notifications for this site in your browser.
                  </p>
                </div>
                <div className="relative lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-stretch">
                  <Link
                    href="/about/contact?topic=privacy_removal"
                    id="privacy-removal-link"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 transition-all"
                  >
                    Ask us to remove something
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/about/legal"
                    id="privacy-legal-link"
                    className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm whitespace-nowrap hover:bg-surface-container transition-all"
                  >
                    Read the legal basis
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
      </MotionConfig>
    </div>
  );
}
