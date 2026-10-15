"use client";

import React from "react";
import { MotionConfig } from "motion/react";
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  Clock,
  Copyright,
  ExternalLink,
  FileText,
  Gavel,
  HandHeart,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AboutPageHero } from "@/components/about-page-hero";
import { PolicyDocument, type PolicySection } from "@/components/policy-document";

const LAST_UPDATED = "14 October 2026";

const SECTIONS: PolicySection[] = [
  {
    id: "agreement",
    icon: HandHeart,
    title: "Using Nadi-Gati",
    paragraphs: [
      "Nadi-Gati is free to use, and you don't need an account. By using the site, including reading river levels, following a district or sending a flood report, you agree to these terms. If you don't agree, please don't use the site.",
      "These terms sit alongside our privacy page, which explains what we store, and our legal basis page, which explains our independence and how we use public data.",
    ],
    link: { label: "Read the privacy page", href: "/about/privacy" },
  },
  {
    id: "not-emergency",
    icon: Phone,
    title: "Not an emergency service",
    paragraphs: [
      "Nadi-Gati is not an official warning service and cannot send help. It does not issue warnings or evacuation orders, and it is not run by any government agency.",
      "If you or someone else is in danger, call 112 or the disaster helpline on 1078, and follow instructions from your district administration. Never wait for this website before acting.",
    ],
  },
  {
    id: "as-is",
    icon: AlertTriangle,
    title: "Information is provided as it is",
    paragraphs: [
      "We bring together figures that agencies publish and reports that people send. We try hard to get them right, but we can't guarantee that anything on the site is complete, accurate or up to date. A reading is only as recent as its source, and during the pilot some readings are sample data.",
      "The site may be slow or unavailable at times, including during floods when it is busiest. Don't rely on Nadi-Gati as your only source of information.",
    ],
    link: { label: "Where our numbers come from", href: "/about/sources" },
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Alerts",
    paragraphs: [
      "Alerts are a convenience, not a warning system. They depend on your browser, your phone's settings and your connection, and on the sources we read. An alert may arrive late or not at all. Keep following official warnings whether or not you have subscribed.",
    ],
  },
  {
    id: "reporting",
    icon: MapPin,
    title: "Sending a flood report",
    paragraphs: [
      "Reports help your neighbours, so please send them in good faith. When you send a report, you agree that:",
    ],
    points: [
      "It describes something you saw yourself, as honestly as you can",
      "The pin marks where the flooding is, not where someone lives",
      "Any photo is one you took or have the right to share",
      "It leaves out names, phone numbers and other personal details",
      "It contains nothing abusive, hateful or illegal",
    ],
    pointIcon: CheckCircle2,
    pointIconClass: "text-success",
    link: { label: "How reports are checked", href: "/about/verification" },
  },
  {
    id: "not-allowed",
    icon: Ban,
    title: "What you must not do",
    paragraphs: ["To keep Nadi-Gati useful and safe for everyone, you must not:"],
    points: [
      "Send false reports, hoaxes or anything meant to cause panic",
      "Pretend to be a government agency, official or rescue service",
      "Present screenshots of the site as an official warning",
      "Send reports automatically, or flood the site with requests",
      "Try to break into, overload or disrupt the site or its data",
      "Use the site to harass anyone or collect their personal details",
    ],
    pointIcon: XCircle,
    pointIconClass: "text-error",
  },
  {
    id: "your-content",
    icon: Copyright,
    title: "Your reports and photos",
    paragraphs: [
      "You keep the rights to what you send. By sending a report or photo, you let anyone use, share and adapt it under the Creative Commons Attribution 4.0 licence (CC BY 4.0), including Nadi-Gati showing it on the site. Reports are anonymous, so they are credited to 'Nadi-Gati contributors' rather than to you.",
      "Reports and photos are public as soon as you send them. Before upload, photos are cleaned of hidden location data on your phone, and pins are rounded to about 100 metres.",
    ],
  },
  {
    id: "removal",
    icon: Trash2,
    title: "Removing content",
    paragraphs: [
      "We may remove any report or photo, or limit access to the site, if we believe it breaks these terms, is false or harmful, shows someone's private details, or if the law requires it. We don't have to give notice, though we try to explain when we can.",
      "If you see something that shouldn't be on the site, or want something you sent taken down, tell us.",
    ],
    link: { label: "Ask us to remove something", href: "/about/contact?topic=privacy_removal" },
  },
  {
    id: "links",
    icon: ExternalLink,
    title: "Other websites",
    paragraphs: [
      "Nadi-Gati links to government portals, data providers and other sites. We don't control them and aren't responsible for what they publish or how they treat your data.",
    ],
  },
  {
    id: "liability",
    icon: ShieldAlert,
    title: "Limits on our responsibility",
    paragraphs: [
      "As far as the law allows, Nadi-Gati and the volunteers who build it are not responsible for any loss, damage or injury that comes from using the site, relying on its information, or being unable to use it. Nothing in these terms limits any responsibility that cannot be limited by law.",
      "The source code is published under the MIT licence, which comes with its own terms and no warranty.",
    ],
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "Changes to these terms",
    paragraphs: [
      "We may update these terms as Nadi-Gati grows. The date at the top of this page shows when they last changed. If you keep using the site after a change, the new terms apply.",
    ],
  },
  {
    id: "law",
    icon: Gavel,
    title: "Law that applies",
    paragraphs: ["These terms are governed by the laws of India."],
    link: { label: "Read our legal basis", href: "/about/legal" },
  },
  {
    id: "contact",
    icon: Mail,
    title: "Questions",
    paragraphs: ["If anything here is unclear, ask us. We're happy to explain."],
    link: { label: "Contact us", href: "/about/contact?topic=licensing_legal" },
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          <AboutPageHero
            id="terms"
            crumb="Terms"
            icon={FileText}
            badge="Terms of use"
            title="The ground rules for using Nadi-Gati"
            note={
              <>
                <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>Last updated {LAST_UPDATED}.</span>
              </>
            }
          >
            Short and in plain language: what you can expect from us, and what we ask of you when
            you use the site or send a flood report.
          </AboutPageHero>

          <PolicyDocument id="terms" label="Terms of use" sections={SECTIONS} />
        </main>
      </MotionConfig>
    </div>
  );
}
