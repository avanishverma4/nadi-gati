"use client";

import React from "react";
import { MotionConfig } from "motion/react";
import {
  AlertTriangle,
  Building2,
  Clock,
  Code2,
  Database,
  Gauge,
  Mail,
  Scale,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { AboutPageHero } from "@/components/about-page-hero";
import { PolicyDocument, type PolicySection } from "@/components/policy-document";
import { REPO_URL } from "@/lib/site";

const LAST_UPDATED = "14 October 2026";

// TODO before public launch: name the Grievance Officer. Rule 3(2) of the IT (Intermediary
// Guidelines and Digital Media Ethics Code) Rules, 2021 requires an intermediary to publish the
// name and contact details of a Grievance Officer. Until both are filled in, the page says the
// role is still being appointed.
const GRIEVANCE_OFFICER = {
  name: "",
  email: "",
};
const hasGrievanceOfficer = Boolean(GRIEVANCE_OFFICER.name && GRIEVANCE_OFFICER.email);

const SECTIONS: PolicySection[] = [
  {
    id: "independent",
    icon: Building2,
    title: "Independent, not official",
    paragraphs: [
      "Nadi-Gati is an independent, open-source community project. It is not run by, affiliated with or endorsed by the Government of India, the Central Water Commission, the National Disaster Management Authority, or any state disaster management authority.",
      "We never issue warnings, evacuation orders or other official instructions. In an emergency, follow your District Magistrate, the NDMA and the State Disaster Response Force, and call 112, 1078 or 1070.",
    ],
  },
  {
    id: "public-data",
    icon: Database,
    title: "Public data, properly credited",
    paragraphs: [
      "Our river and rainfall figures come from data that agencies publish openly, including under India's National Data Sharing and Accessibility Policy (NDSAP, 2012) and the Government Open Data Licence – India. We credit every figure to the agency that published it and link back to the source.",
      "We respect each website's rules on automated access. The Central Water Commission's flood forecasting site asks automated tools not to collect its pages, so we don't. We cite its published records instead. We never get past logins, CAPTCHAs or other access controls.",
    ],
    link: { label: "See every source and licence", href: "/about/sources" },
  },
  {
    id: "reports",
    icon: Users,
    title: "Community reports",
    paragraphs: [
      "Flood reports are written by the people who send them. Nadi-Gati hosts them as an intermediary, in the sense of Section 79 of the Information Technology Act, 2000. We don't edit reports, and we label them clearly as community reports, never as official readings.",
      "We act on valid notices to remove unlawful content, as the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 require. We also remove reports that are false, abusive or show someone's private details.",
    ],
    points: [
      "A new report starts as unconfirmed and is never presented as fact",
      "Community reports never change a river gauge's official status",
      "Software never invents flood levels or forecasts",
    ],
    pointIcon: Scale,
    link: { label: "How reports are checked", href: "/about/verification" },
  },
  {
    id: "no-guarantee",
    icon: AlertTriangle,
    title: "No guarantee",
    paragraphs: [
      "We work hard to get things right, but the information on Nadi-Gati is provided as it is, without any guarantee. Figures can be late, incomplete or wrong. A river level is only as recent as its source's latest update, and during the pilot some readings are sample data.",
      "Use Nadi-Gati alongside official warnings, never instead of them. Nadi-Gati and its contributors are not responsible for decisions made using the site.",
    ],
  },
  {
    id: "fair-use",
    icon: Gauge,
    title: "Fair use of public services",
    paragraphs: [
      "Free public services such as OpenStreetMap's Nominatim place-name lookup are shared resources. We make at most one request a second, however many people are using Nadi-Gati, and save results for 7 days so we never ask twice for the same place.",
    ],
  },
  {
    id: "licences",
    icon: Code2,
    title: "Licences",
    paragraphs: [
      `The Nadi-Gati source code ${REPO_URL ? "is published" : "will be published"} under the MIT licence. Our written content and community reports are shared under Creative Commons Attribution 4.0 (CC BY 4.0). Data from other organisations remains under its own licence, listed on the data sources page.`,
    ],
    ...(REPO_URL ? { link: { label: "View the code on GitHub", href: REPO_URL } } : {}),
  },
  {
    id: "grievance-officer",
    icon: Scale,
    title: "Grievance Officer",
    paragraphs: [
      hasGrievanceOfficer
        ? `Our Grievance Officer is ${GRIEVANCE_OFFICER.name}. Write to ${GRIEVANCE_OFFICER.email} with complaints about content on Nadi-Gati, including requests to remove a report.`
        : "A Grievance Officer is being appointed and will be named here before Nadi-Gati opens to the public. Until then, send complaints about content through the contact page.",
      "We acknowledge every complaint within 24 hours and resolve it within 15 days, as the Intermediary Guidelines require. Requests to remove content that shows someone's private details are handled within 24 hours.",
    ],
    link: hasGrievanceOfficer
      ? { label: `Email ${GRIEVANCE_OFFICER.email}`, href: `mailto:${GRIEVANCE_OFFICER.email}` }
      : { label: "Contact us", href: "/about/contact" },
  },
  {
    id: "contact",
    icon: Mail,
    title: "Corrections and takedown requests",
    paragraphs: [
      "To correct a figure or a credit, report a problem with content, or send a legal notice, use the contact page. It lists who to contact and how quickly we aim to reply.",
    ],
    link: { label: "Contact us", href: "/about/contact" },
  },
];

export default function LegalAndTechnicalBasisPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          <AboutPageHero
            id="legal"
            crumb="Legal basis"
            icon={Scale}
            badge="Legal basis"
            title="How Nadi-Gati works within the law"
            note={
              <>
                <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>Last updated {LAST_UPDATED}.</span>
              </>
            }
          >
            Who we are, how we use public data, our role with community reports, and what we do and
            don&apos;t promise, in plain language.
          </AboutPageHero>

          <PolicyDocument id="legal" label="Legal basis" sections={SECTIONS} />
        </main>
      </MotionConfig>
    </div>
  );
}
