"use client";

import React from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { Waves, ExternalLink, Phone, ShieldCheck } from "lucide-react";
import { REPO_URL } from "@/lib/site";

const FOOTER_COLUMNS: Array<{
  id: string;
  title: string;
  links: Array<{ id: string; label: string; href: string; external?: boolean }>;
}> = [
  {
    id: "explore",
    title: "Explore",
    links: [
      { id: "districts", label: "Districts", href: "/districts" },
      { id: "ghats", label: "River levels", href: "/ghats" },
      { id: "map", label: "Flood map", href: "/#map-section" },
      { id: "report", label: "Report a flood", href: "/report" },
    ],
  },
  {
    id: "about",
    title: "About",
    links: [
      { id: "about", label: "About Nadi-Gati", href: "/about" },
      { id: "sources", label: "Data sources", href: "/about/sources" },
      { id: "verification", label: "Verification", href: "/about/verification" },
      { id: "contact", label: "Contact", href: "/about/contact" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { id: "legal", label: "Legal basis", href: "/about/legal" },
      { id: "privacy", label: "Privacy", href: "/about/privacy" },
      { id: "terms", label: "Terms of use", href: "/about/terms" },
      // Shown only once the repository is public
      ...(REPO_URL ? [{ id: "github", label: "Source code", href: REPO_URL, external: true }] : []),
    ],
  },
];

const HELPLINES = [
  { number: "112", label: "National emergency" },
  { number: "1077", label: "District control room" },
  { number: "1070", label: "State control room" },
  { number: "1078", label: "Disaster helpline" },
];

const FOOTER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const FOOTER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

const LINK_CLASS =
  "group inline-flex items-center gap-1.5 min-h-[44px] font-sans text-sm text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm";

// An underline that grows from the left when the link is hovered
const LINK_LABEL_CLASS =
  "bg-gradient-to-r from-primary to-primary bg-no-repeat bg-[length:0%_1.5px] bg-[position:0_100%] group-hover:bg-[length:100%_1.5px] transition-[background-size] duration-300 pb-0.5";

export function GlobalFooter() {
  return (
    <footer
      id="global-persistent-footer"
      className="relative overflow-hidden w-full border-t border-outline-variant/60 bg-surface-container-lowest text-on-surface mt-auto"
      role="contentinfo"
    >
      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <motion.div
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-8"
          variants={FOOTER_VARIANTS}
          // Rendered visible from the server: the emergency numbers in here must show even on a
          // phone that is slow to load JavaScript, or never does
          initial={false}
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-10">
            {/* Brand & helplines */}
            <motion.div
              className="col-span-2 md:col-span-5 lg:col-span-5"
              variants={FOOTER_ITEM_VARIANTS}
            >
              <Link
                href="/"
                id="footer-brand-home"
                className="inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                aria-label="Nadi-Gati home"
              >
                <span className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center transition-transform group-hover:scale-105">
                  <Waves className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="font-sans font-bold text-xl tracking-tight text-on-surface">
                  Nadi-Gati{" "}
                  <span lang="hi" className="font-normal text-sm text-primary">
                    नदी-गति
                  </span>
                </span>
              </Link>
              <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed mt-4 max-w-sm">
                River levels, danger marks and community flood reports, in plain language.
              </p>

              <div className="mt-6">
                <div className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <Phone className="w-3.5 h-3.5 text-error" aria-hidden="true" />
                  <span>Emergency helplines</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {HELPLINES.map((line) => (
                    <a
                      key={line.number}
                      href={`tel:${line.number}`}
                      id={`footer-helpline-${line.number}`}
                      className="inline-flex items-center gap-2 h-11 pl-3 pr-4 rounded-full border border-error/40 bg-error/10 hover:bg-error/20 hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    >
                      <span className="font-sans font-bold text-base text-error">
                        {line.number}
                      </span>
                      <span className="font-sans text-xs text-on-surface-variant">
                        {line.label}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map((column) => (
              <motion.nav
                key={column.id}
                id={`footer-nav-${column.id}`}
                aria-label={column.title}
                className={
                  column.id === "legal"
                    ? "col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-2"
                    : "col-span-1 md:col-span-2 lg:col-span-2"
                }
                variants={FOOTER_ITEM_VARIANTS}
              >
                <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-on-surface">
                  {column.title}
                </h2>
                <ul className="mt-3 flex flex-col list-none">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`footer-link-${link.id}`}
                          className={LINK_CLASS}
                        >
                          <span className={LINK_LABEL_CLASS}>{link.label}</span>
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <Link href={link.href} id={`footer-link-${link.id}`} className={LINK_CLASS}>
                          <span className={LINK_LABEL_CLASS}>{link.label}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.nav>
            ))}
          </div>

          {/* Independence notice (shown on every page) */}
          <motion.div
            id="footer-persistent-disclaimer"
            className="mt-12 flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-3.5 sm:px-5"
            variants={FOOTER_ITEM_VARIANTS}
          >
            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="font-sans text-sm text-on-surface-variant leading-relaxed">
              <strong className="font-semibold text-on-surface">
                Nadi-Gati is independent and is not affiliated with the Government of India.
              </strong>{" "}
              Data is credited to its original publisher. In an emergency, follow official
              instructions.
            </span>
          </motion.div>

          {/* Bottom bar */}
          <motion.div
            className="mt-8 pt-6 border-t border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-sans text-sm text-on-surface-variant"
            variants={FOOTER_ITEM_VARIANTS}
          >
            <span suppressHydrationWarning>© {new Date().getFullYear()} Nadi-Gati</span>
            <span>Open source under the MIT licence · Pilot preview</span>
          </motion.div>
        </motion.div>
      </MotionConfig>
    </footer>
  );
}
