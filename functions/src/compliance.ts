// Which outside websites the ingestion functions may call automatically. Every fetcher checks
// isDomainScrapingAllowed() first, so a source whose robots.txt or terms forbid automated access
// can only ever be cited on the website, never polled.
import * as logger from "firebase-functions/logger";

interface DomainRobotsPolicy {
  domain: string;
  allowAutomatedAccess: boolean;
  checkedAt: string;
  robotsUrl: string;
  notes: string;
  rateLimitPerMinute: number;
}

// Add a domain here (after reading its robots.txt and terms) before writing a fetcher for it.
// Domains missing from this list are refused.
const DOMAIN_COMPLIANCE_POLICIES: Record<string, DomainRobotsPolicy> = {
  // Central Water Commission Flood Forecasting System
  // Evaluated: Disallows automated crawlers/scrapers. STRICTLY PROHIBITED FROM POLLING.
  "ffs.india-water.gov.in": {
    domain: "ffs.india-water.gov.in",
    allowAutomatedAccess: false,
    checkedAt: "2026-09-06T00:00:00.000Z",
    robotsUrl: "https://ffs.india-water.gov.in/robots.txt",
    notes:
      "Robots.txt disallows automated scraping. Do NOT scrape or poll on schedule. Cited only via <SourceCitation> component.",
    rateLimitPerMinute: 0,
  },
  // National Water Data Portal (NWIC)
  "nwdp.nwic.gov.in": {
    domain: "nwdp.nwic.gov.in",
    allowAutomatedAccess: false, // Default to false pending formal direct API grant
    checkedAt: "2026-09-06T00:00:00.000Z",
    robotsUrl: "https://nwdp.nwic.gov.in/robots.txt",
    notes:
      "Gated portal. Pending direct API grant. Do not bypass login or CAPTCHA.",
    rateLimitPerMinute: 0,
  },
  // India-WRIS
  "indiawris.gov.in": {
    domain: "indiawris.gov.in",
    allowAutomatedAccess: false,
    checkedAt: "2026-09-06T00:00:00.000Z",
    robotsUrl: "https://indiawris.gov.in/robots.txt",
    notes:
      "Pending official bulk data agreement. Manual/citable reference only.",
    rateLimitPerMinute: 0,
  },
  // Open-Meteo API (Open & explicitly allowed)
  "open-meteo.com": {
    domain: "open-meteo.com",
    allowAutomatedAccess: true,
    checkedAt: "2026-09-06T00:00:00.000Z",
    robotsUrl: "https://open-meteo.com/robots.txt",
    notes: "Non-commercial free tier explicitly permitted. GloFAS & weather forecast.",
    rateLimitPerMinute: 60,
  },
  // OpenWeatherMap API (Free tier with API key)
  "openweathermap.org": {
    domain: "openweathermap.org",
    allowAutomatedAccess: true,
    checkedAt: "2026-09-06T00:00:00.000Z",
    robotsUrl: "https://openweathermap.org/robots.txt",
    notes: "Free tier API allowed with key. Rate limit capped at 60 calls/min.",
    rateLimitPerMinute: 60,
  },
  // data.gov.in Open Government Data Platform
  "data.gov.in": {
    domain: "data.gov.in",
    allowAutomatedAccess: true,
    checkedAt: "2026-09-06T00:00:00.000Z",
    robotsUrl: "https://data.gov.in/robots.txt",
    notes: "GODL-licensed APIs permitted with valid developer key.",
    rateLimitPerMinute: 30,
  },
};

/**
 * Logs the outstanding data-access tasks (asking CWC for an official API) whenever the pilot
 * data is seeded, so they stay visible in the function logs.
 */
export function logOpenActionItems(): void {
  logger.info("=== NADI-GATI COMPLIANCE & ACTION ITEMS ===");
  logger.info(
    "[ACTION ITEM #1]: Submit formal request for official CWC Flood Forecasting API access (Email: cwc-flood@gov.in, nwic-support@gov.in) to move from cited reference to direct ingested pipeline."
  );
  logger.info(
    "[COMPLIANCE NOTE]: ffs.india-water.gov.in robots.txt disallows scraping. Scraper is blocked by design; references are cited via <SourceCitation>."
  );
  logger.info(
    "[COMPLIANCE NOTE]: OpenWeatherMap calls strictly constrained to <= 60 requests/minute."
  );
}

/** True only for domains listed above as allowing automated access; unknown domains are refused. */
export function isDomainScrapingAllowed(domain: string): boolean {
  const policy = DOMAIN_COMPLIANCE_POLICIES[domain];
  if (!policy) {
    logger.warn(`No compliance entry found for ${domain}. Denying by default until robots.txt is inspected.`);
    return false;
  }
  return policy.allowAutomatedAccess;
}
