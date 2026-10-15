"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Plus, ArrowRight } from "lucide-react";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  /** Optional "read more" link shown under the answer */
  link?: { label: string; href: string };
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "government",
    question: "Is Nadi-Gati a government website?",
    answer:
      "No. Nadi-Gati is an independent, open-source project. It gathers river data that government agencies publish and presents it more clearly, but it is not run or endorsed by any of them.",
    link: { label: "Read the legal basis", href: "/about/legal" },
  },
  {
    id: "live",
    question: "Are the river levels live?",
    answer:
      "Each level is only as recent as the agency's latest update, and it always shows when it was recorded. During the pilot, some readings are sample data and are labelled that way.",
  },
  {
    id: "sources",
    question: "Where do the numbers come from?",
    answer:
      "Mainly from the Central Water Commission, with rainfall and river-flow estimates from Open-Meteo and GloFAS. The source is named next to every figure.",
    link: { label: "See all sources", href: "/about/sources" },
  },
  {
    id: "forecast",
    question: "Does Nadi-Gati predict floods?",
    answer:
      "No. We show what agencies have measured and published. We don't make forecasts of our own, and any forecast shown is credited to the agency that made it.",
  },
  {
    id: "account",
    question: "Do I need an account to report a flood?",
    answer:
      "No. Reports are anonymous. You add a map pin and, if you like, a photo. We don't ask for your name, phone number or email.",
    link: { label: "Report a flood", href: "/report" },
  },
  {
    id: "checked",
    question: "How are flood reports checked?",
    answer:
      "A new report starts as unconfirmed. When other people report flooding within 15 km in the previous 24 hours, it shows how many nearby reports it matches. Reports are always labelled as community reports, never as official readings.",
    link: { label: "How reports are checked", href: "/about/verification" },
  },
  {
    id: "alerts",
    question: "Can I get flood alerts?",
    answer:
      "Alerts are still being built during the pilot. Once they are ready, you will be able to follow a district, choose how serious an alert should be, and get a browser notification when a river there crosses that level, with no account, phone number or email. Until then, check your district's page and follow official warnings.",
  },
  {
    id: "cost",
    question: "Does it cost anything?",
    answer: "No. Nadi-Gati is free to use and carries no adverts.",
    link: { label: "About the project", href: "/about" },
  },
  {
    id: "emergency",
    question: "What should I do in an emergency?",
    answer:
      "Don't wait for this website. Call 112 for emergencies or 1078 for the disaster helpline, and follow instructions from your district administration.",
  },
];

const LIST_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

/**
 * Frequently asked questions: one question open at a time, with the answer sliding open.
 */
export function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);
  const componentId = useId();

  return (
    // reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion
    <MotionConfig reducedMotion="user">
      <motion.ul
        id="faq-accordion"
        className="flex flex-col gap-3 list-none"
        variants={LIST_VARIANTS}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.05 }}
      >
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          const buttonId = `faq-trigger-${item.id}-${componentId}`;
          const panelId = `faq-panel-${item.id}-${componentId}`;

          return (
            <motion.li
              key={item.id}
              id={`faq-item-${item.id}`}
              variants={ITEM_VARIANTS}
              className={`rounded-3xl border transition-colors duration-200 ${
                isOpen
                  ? "border-primary/50 bg-surface-container"
                  : "border-outline-variant/70 bg-surface-container-low hover:border-outline"
              }`}
            >
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="group w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4 sm:py-5 min-h-[64px] rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="font-sans font-semibold text-base sm:text-lg text-on-surface leading-snug">
                    {item.question}
                  </span>
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      isOpen
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-highest text-on-surface group-hover:bg-primary-container"
                    }`}
                  >
                    <Plus
                      className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pr-12 sm:pr-16">
                      <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed">
                        {item.answer}
                      </p>
                      {item.link && (
                        <Link
                          href={item.link.href}
                          className="mt-3 inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                        >
                          {item.link.label}
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </motion.ul>
    </MotionConfig>
  );
}
