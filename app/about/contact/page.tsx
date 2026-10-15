"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AboutPageHero } from "@/components/about-page-hero";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";

// Topic values are stored with each message; reply times must match REPLY_HOURS in
// app/api/corrections/route.ts. Other pages link here with ?topic=<value> to preselect one.
const TOPICS = [
  { value: "telemetry_discrepancy", label: "A river level or danger mark is wrong", hours: 4 },
  { value: "citizen_report_disputed", label: "A flood report is false or harmful", hours: 4 },
  { value: "privacy_removal", label: "Remove a photo or personal details", hours: 4 },
  { value: "source_attribution", label: "A source is missing or credited wrongly", hours: 24 },
  { value: "agency_official_inquiry", label: "I work for a government agency", hours: 24 },
  { value: "licensing_legal", label: "Licensing or a legal notice", hours: 48 },
  { value: "other", label: "Something else", hours: 48 },
];

const REPLY_TIERS = [
  {
    id: "urgent",
    hours: 4,
    title: "Safety and privacy",
    body: "A wrong danger mark, a false flood report, or a photo or detail that should come down.",
    tileClass: "bg-error-container",
    iconClass: "text-error",
    icon: AlertTriangle,
  },
  {
    id: "credits",
    hours: 24,
    title: "Sources and agencies",
    body: "A missing or wrong credit, a broken source link, or a question from a government agency.",
    tileClass: "bg-primary-container",
    iconClass: "text-primary",
    icon: Clock,
  },
  {
    id: "general",
    hours: 48,
    title: "Everything else",
    body: "Questions, ideas, research and press enquiries, licensing and legal notices.",
    tileClass: "bg-surface-container-highest",
    iconClass: "text-on-surface-variant",
    icon: MessageSquare,
  },
];

const FIELD_CLASS =
  "w-full rounded-2xl border border-outline bg-surface px-4 py-3 font-sans text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors";
const LABEL_CLASS = "block font-sans text-sm font-semibold text-on-surface mb-1.5";
const OPTIONAL_CLASS = "font-normal text-on-surface-variant";

export default function AboutContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  // Other pages link here with ?topic=... to preselect what the message is about
  const requestedTopic = use(searchParams).topic;
  const [topic, setTopic] = useState(
    TOPICS.some((t) => t.value === requestedTopic) ? requestedTopic! : TOPICS[0].value
  );
  const [targetEntity, setTargetEntity] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [received, setReceived] = useState<{
    id: string;
    replyHours: number;
    hasEmail: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (description.trim().length < 10) {
      setSubmitError("Please tell us a little more, at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          issueType: topic,
          targetEntity,
          referenceUrl,
          description,
        }),
      });
      // A server error page or the offline fallback isn't JSON; don't show the parser's message
      const data = await res.json().catch(() => ({
        success: false,
        error: res.status === 429 ? "Too many messages. Please wait a minute and try again." : null,
      }));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "We couldn't send your message. Please try again.");
      }
      setReceived({ id: data.ticketId, replyHours: data.replyHours, hasEmail: data.hasEmail });
      setTargetEntity("");
      setReferenceUrl("");
      setDescription("");
      setName("");
      setEmail("");
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "We couldn't send your message. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTopic = TOPICS.find((t) => t.value === topic) ?? TOPICS[0];

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          <AboutPageHero
            id="contact"
            crumb="Contact"
            icon={Mail}
            badge="Contact & corrections"
            title="Tell us what we got wrong"
            note={
              <>
                <Phone className="w-4 h-4 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-on-surface">
                    This form is not for emergencies.
                  </strong>{" "}
                  If you are in danger, call{" "}
                  <a href="tel:112" className="font-bold text-error hover:underline">
                    112
                  </a>{" "}
                  or{" "}
                  <a href="tel:1078" className="font-bold text-error hover:underline">
                    1078
                  </a>
                  .
                </span>
              </>
            }
          >
            A wrong river level, a missing credit, or a report that shouldn&apos;t be there? Send us
            a message. We read every one and fix what we can.
          </AboutPageHero>

          {/* =========================================================================
              REPLY TIMES
              ========================================================================= */}
          <section
            id="contact-reply-times"
            aria-label="How quickly we aim to reply"
            className="py-12 sm:py-16 bg-surface border-b border-outline-variant/50"
          >
            <motion.ul
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 list-none"
              variants={STAGGER_GRID_VARIANTS}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
            >
              {REPLY_TIERS.map((tier) => (
                <motion.li
                  key={tier.id}
                  id={`contact-tier-${tier.id}`}
                  className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6"
                  variants={RISE_TILE_VARIANTS}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tier.tileClass}`}
                    >
                      <tier.icon className={`w-5 h-5 ${tier.iconClass}`} aria-hidden="true" />
                    </span>
                    <span className="font-sans text-sm text-on-surface-variant">
                      Reply within{" "}
                      <strong className="font-bold text-2xl text-on-surface tracking-tight">
                        {tier.hours}h
                      </strong>
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                    {tier.title}
                  </h2>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                    {tier.body}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
            <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 font-sans text-sm text-on-surface-variant">
              These are the times we aim for. Nadi-Gati is a small volunteer project, so a reply can
              sometimes take longer.
            </p>
          </section>

          {/* =========================================================================
              FORM & SIDEBAR
              ========================================================================= */}
          <section
            id="contact-form-section"
            aria-labelledby="contact-form-title"
            className="py-16 sm:py-24 bg-surface-container-lowest"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Form */}
              <motion.div
                className="lg:col-span-8 rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8 lg:p-10"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
              >
                {received ? (
                  <div id="contact-success" role="status" className="py-6 sm:py-10 text-center">
                    <span className="w-16 h-16 rounded-full bg-success-container mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
                    </span>
                    <h2
                      id="contact-form-title"
                      className="font-sans font-bold text-2xl sm:text-3xl text-on-surface tracking-tight mt-6"
                    >
                      Thank you. We&apos;ve got your message.
                    </h2>
                    <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-3 max-w-lg mx-auto">
                      {received.hasEmail
                        ? `We aim to reply within ${received.replyHours} hours.`
                        : `We aim to look at it within ${received.replyHours} hours. You didn't leave an email, so we can't reply, but we will act on it.`}
                    </p>
                    <p className="font-sans text-sm text-on-surface-variant mt-4">
                      Reference: <span className="font-code text-on-surface">{received.id}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setReceived(null)}
                      className="mt-8 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2
                      id="contact-form-title"
                      className="font-sans font-bold text-2xl sm:text-3xl text-on-surface tracking-tight"
                    >
                      Send us a message
                    </h2>
                    <p className="font-sans text-base text-on-surface-variant leading-relaxed mt-2">
                      Only the topic and your message are needed.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
                      <div>
                        <label htmlFor="contact-topic" className={LABEL_CLASS}>
                          What is it about?
                        </label>
                        <select
                          id="contact-topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          className={`${FIELD_CLASS} appearance-none bg-[length:20px] bg-no-repeat bg-[position:right_14px_center] pr-11`}
                          style={{
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2374818b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                          }}
                        >
                          {TOPICS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <p className="font-sans text-sm text-on-surface-variant mt-1.5">
                          We aim to reply within {selectedTopic.hours} hours.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="contact-description" className={LABEL_CLASS}>
                          Your message
                        </label>
                        <textarea
                          id="contact-description"
                          required
                          rows={5}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What is wrong, and what should it say instead?"
                          className={`${FIELD_CLASS} resize-y min-h-[140px]`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="contact-target" className={LABEL_CLASS}>
                            Where on the site? <span className={OPTIONAL_CLASS}>(optional)</span>
                          </label>
                          <input
                            type="text"
                            id="contact-target"
                            value={targetEntity}
                            onChange={(e) => setTargetEntity(e.target.value)}
                            placeholder="A district, river, gauge or report"
                            className={FIELD_CLASS}
                          />
                        </div>
                        <div>
                          <label htmlFor="contact-reference-url" className={LABEL_CLASS}>
                            Link to the correct source{" "}
                            <span className={OPTIONAL_CLASS}>(optional)</span>
                          </label>
                          <input
                            type="url"
                            id="contact-reference-url"
                            value={referenceUrl}
                            onChange={(e) => setReferenceUrl(e.target.value)}
                            placeholder="https://"
                            className={FIELD_CLASS}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 sm:p-6">
                        <div className="font-sans font-semibold text-on-surface">Want a reply?</div>
                        <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1">
                          Leave your details and we will write back. Otherwise you can stay
                          anonymous. We only use them to reply about this message.
                        </p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="contact-email" className={LABEL_CLASS}>
                              Email <span className={OPTIONAL_CLASS}>(optional)</span>
                            </label>
                            <input
                              type="email"
                              id="contact-email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              autoComplete="email"
                              className={FIELD_CLASS}
                            />
                          </div>
                          <div>
                            <label htmlFor="contact-name" className={LABEL_CLASS}>
                              Name or organisation{" "}
                              <span className={OPTIONAL_CLASS}>(optional)</span>
                            </label>
                            <input
                              type="text"
                              id="contact-name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. Resident, or CWC Patna"
                              autoComplete="name"
                              className={FIELD_CLASS}
                            />
                          </div>
                        </div>
                      </div>

                      {submitError && (
                        <div
                          id="contact-error"
                          role="alert"
                          className="flex items-start gap-2.5 rounded-2xl border border-error/40 bg-error-container/50 px-4 py-3 font-sans text-sm text-on-error-container"
                        >
                          <AlertTriangle
                            className="w-4 h-4 flex-shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <p className="flex items-center gap-2 font-sans text-sm text-on-surface-variant">
                          <Lock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          Messages are private and never shown on the site.
                        </p>
                        <button
                          type="submit"
                          id="contact-submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full bg-primary text-on-primary font-sans font-semibold text-base whitespace-nowrap hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" aria-hidden="true" />
                              Send message
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </motion.div>

              {/* Sidebar */}
              <aside className="lg:col-span-4 lg:sticky lg:top-36 flex flex-col gap-5">
                <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6">
                  <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight">
                    Before you write
                  </h2>
                  <ul className="mt-3 flex flex-col list-none">
                    {[
                      { label: "Where our numbers come from", href: "/about/sources" },
                      { label: "How flood reports are checked", href: "/about/verification" },
                      { label: "What we store about you", href: "/about/privacy" },
                    ].map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="group flex items-center justify-between gap-3 py-2 font-sans text-sm text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {link.label}
                          <ArrowRight
                            className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-error/30 bg-error-container/40 p-6">
                  <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight flex items-center gap-2">
                    <Phone className="w-5 h-5 text-error" aria-hidden="true" />
                    In danger right now?
                  </h2>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1.5">
                    Don&apos;t wait for a reply. Call for help.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {[
                      { number: "112", label: "Emergency" },
                      { number: "1078", label: "Disaster helpline" },
                    ].map((line) => (
                      <a
                        key={line.number}
                        href={`tel:${line.number}`}
                        className="flex flex-col items-center justify-center rounded-2xl bg-surface border border-error/30 px-2 py-3 text-center hover:border-error transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                      >
                        <span className="font-sans font-bold text-xl text-error">
                          {line.number}
                        </span>
                        <span className="font-sans text-xs leading-tight text-on-surface-variant mt-0.5">
                          {line.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </main>
      </MotionConfig>
    </div>
  );
}
