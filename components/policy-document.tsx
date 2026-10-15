"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, ExternalLink, Phone } from "lucide-react";
import { RISE_TILE_VARIANTS } from "@/lib/motion-variants";

export interface PolicySection {
  id: string;
  icon: React.ElementType;
  title: string;
  paragraphs: React.ReactNode[];
  points?: string[];
  /** Icon shown before each point; defaults to a check mark */
  pointIcon?: React.ElementType;
  pointIconClass?: string;
  link?: { label: string; href: string };
}

// Numbered policy sections with a sticky "On this page" menu, shared by the Legal and Terms
// pages. Wrap the page in <MotionConfig reducedMotion="user">.
export function PolicyDocument({
  id,
  label,
  sections,
}: {
  id: string;
  label: string;
  sections: PolicySection[];
}) {
  return (
    <section id={`${id}-content`} aria-label={label} className="py-12 sm:py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        {/* On this page */}
        <nav aria-label="On this page" className="lg:col-span-4">
          <div className="lg:sticky lg:top-36 rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-6">
            <div className="font-sans text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              On this page
            </div>
            <ol className="mt-3 flex flex-col list-none">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${id}-${section.id}`}
                    className="group flex items-center gap-3 py-2 font-sans text-sm text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                  >
                    <span className="w-6 font-semibold text-on-surface-variant/60 group-hover:text-primary">
                      {index + 1}
                    </span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>

            <div className="mt-5 pt-5 border-t border-outline-variant/50 flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-sans text-sm text-on-surface-variant leading-snug">
                In an emergency, call{" "}
                <a href="tel:112" className="font-bold text-error hover:underline">
                  112
                </a>{" "}
                or{" "}
                <a href="tel:1078" className="font-bold text-error hover:underline">
                  1078
                </a>
                .
              </p>
            </div>
          </div>
        </nav>

        {/* Sections */}
        <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
          {sections.map((section, index) => {
            const PointIcon = section.pointIcon ?? CheckCircle2;
            return (
              <motion.article
                key={section.id}
                id={`${id}-${section.id}`}
                aria-labelledby={`${id}-${section.id}-title`}
                className="scroll-mt-32 rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8"
                variants={RISE_TILE_VARIANTS}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-primary-container flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </span>
                  <h2
                    id={`${id}-${section.id}-title`}
                    className="font-sans font-bold text-xl sm:text-2xl text-on-surface tracking-tight"
                  >
                    <span className="text-on-surface-variant/50 mr-2">{index + 1}.</span>
                    {section.title}
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {section.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className="font-sans text-base text-on-surface-variant leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {section.points && (
                  <ul className="mt-5 rounded-2xl bg-surface border border-outline-variant/60 divide-y divide-outline-variant/50 list-none">
                    {section.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 px-4 py-3 font-sans text-sm text-on-surface leading-snug"
                      >
                        <PointIcon
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${section.pointIconClass ?? "text-primary"}`}
                          aria-hidden="true"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                )}

                {section.link &&
                  (section.link.href.startsWith("http") ? (
                    <a
                      href={section.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-1.5 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                    >
                      {section.link.label}
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link
                      href={section.link.href}
                      className="mt-5 inline-flex items-center gap-1.5 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                    >
                      {section.link.label}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  ))}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
