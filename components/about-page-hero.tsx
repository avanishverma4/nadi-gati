"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";

// Shared header for the detail pages under /about: breadcrumb, badge, title, intro and an
// optional note (pilot caveat, last-updated date). Wrap the page in <MotionConfig reducedMotion="user">.
export function AboutPageHero({
  id,
  crumb,
  icon: Icon,
  badge,
  title,
  children,
  note,
}: {
  id: string;
  crumb: string;
  icon: React.ElementType;
  badge: string;
  title: string;
  /** Intro paragraph */
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <section
      id={`${id}-hero`}
      aria-labelledby={`${id}-title`}
      className="border-b border-outline-variant/50 bg-gradient-to-b from-primary/10 via-surface to-surface"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-14 sm:pt-10 sm:pb-20">
        <nav
          id={`${id}-breadcrumbs`}
          aria-label="Breadcrumb"
          className="flex items-center gap-2 font-sans text-sm text-on-surface-variant"
        >
          <Link href="/about" className="hover:text-primary transition-colors">
            About
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-on-surface font-medium">{crumb}</span>
        </nav>

        <motion.div
          className="mt-10 sm:mt-14 max-w-3xl space-y-5"
          variants={STAGGER_GRID_VARIANTS}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={RISE_TILE_VARIANTS}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary-container/50 text-on-primary-container text-xs font-sans font-semibold"
          >
            <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>{badge}</span>
          </motion.div>
          <motion.h1
            id={`${id}-title`}
            variants={RISE_TILE_VARIANTS}
            className="font-sans font-bold text-4xl sm:text-5xl text-on-surface tracking-tight leading-[1.08] text-balance"
          >
            {title}
          </motion.h1>
          <motion.p
            variants={RISE_TILE_VARIANTS}
            className="font-sans text-base sm:text-xl text-on-surface-variant leading-relaxed"
          >
            {children}
          </motion.p>
        </motion.div>

        {note && (
          <div
            id={`${id}-note`}
            className="mt-8 inline-flex items-start gap-2.5 rounded-2xl border border-outline-variant/70 bg-surface-container-low/90 px-4 py-3 font-sans text-sm text-on-surface-variant max-w-3xl"
          >
            {note}
          </div>
        )}
      </div>
    </section>
  );
}
