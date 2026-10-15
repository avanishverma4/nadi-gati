import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase-admin/firestore";
import { PILOT_SCOPE_DISTRICTS } from "./pilotScope.generated";
import { isDomainScrapingAllowed } from "./compliance";
import { appDb } from "./firestore";

// Set with `firebase functions:secrets:set OPENWEATHER_API_KEY`. Secrets are only injected into
// functions that list them, so reading process.env without this always came back empty.
const OPENWEATHER_API_KEY = defineSecret("OPENWEATHER_API_KEY");

const FETCH_TIMEOUT_MS = 15000;

interface OwmWeatherResponse {
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  main?: {
    humidity?: number;
  };
}

/** The current hour in UTC (YYYY-MM-DDTHH), used as the document ID so re-runs overwrite */
function utcHourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

/**
 * Hourly: recent rainfall (1-hour, or 3-hour when that's all OpenWeatherMap has) for each pilot
 * district, from OpenWeatherMap's free API (key required; the free tier allows 60 calls a minute).
 *
 * Written to districts/{id}/owmRainfallReadings, not rainfallReadings: that subcollection holds
 * Open-Meteo's 24-hour totals, and mixing 1- and 3-hour values into it made any sum or chart wrong.
 * The website doesn't read this collection yet; it shows Open-Meteo's districts/{id}.latestRainfallMm.
 */
export const ingestOpenWeather = onSchedule(
  {
    schedule: "every 1 hours",
    secrets: [OPENWEATHER_API_KEY],
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    if (!isDomainScrapingAllowed("openweathermap.org")) {
      logger.warn("OpenWeatherMap ingestion skipped due to compliance policy");
      return;
    }

    const apiKey = OPENWEATHER_API_KEY.value();
    if (!apiKey) {
      logger.info("OPENWEATHER_API_KEY not configured. Skipping OpenWeatherMap scheduled run.");
      return;
    }

    logger.info("Starting OpenWeatherMap Rainfall Ingestion for Bihar & Assam pilot districts");
    const db = appDb();
    const hourKey = utcHourKey();

    // One call at a time with a 1-second pause, well inside the free tier's 60 calls a minute
    for (let i = 0; i < PILOT_SCOPE_DISTRICTS.length; i++) {
      const district = PILOT_SCOPE_DISTRICTS[i];
      try {
        const lat = district.latitude;
        const lon = district.longitude;

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

        if (!res.ok) {
          // Status only: the URL carries the API key and must never reach the logs
          logger.error(`OpenWeatherMap error for ${district.id}: ${res.status} ${res.statusText}`);
          continue;
        }

        const data = (await res.json()) as OwmWeatherResponse;
        // Prefer the 1-hour figure whenever OpenWeatherMap sends one, even if it is 0. With no
        // rain block at all, nothing fell in the last hour.
        const oneHour = data.rain?.["1h"];
        const threeHour = data.rain?.["3h"];
        const reading =
          typeof oneHour === "number"
            ? { value: oneHour, periodHours: 1 }
            : typeof threeHour === "number"
              ? { value: threeHour, periodHours: 3 }
              : { value: 0, periodHours: 1 };

        await db
          .collection("districts")
          .doc(district.id)
          .collection("owmRainfallReadings")
          .doc(hourKey)
          .set({
            value: reading.value,
            unit: "mm",
            periodHours: reading.periodHours,
            recordedAt: Timestamp.now(),
            source: "OpenWeatherMap Free API",
            sourceUrl: "https://openweathermap.org/api",
          });

        logger.info(
          `OpenWeatherMap recorded ${reading.value}mm rain over ${reading.periodHours}h for district ${district.name}`
        );
      } catch (err) {
        // Log the error name only; a fetch error message can include the request URL, which holds the key
        logger.error(
          `Error ingesting OpenWeatherMap for district ${district.id}: ${err instanceof Error ? err.name : "unknown error"}`
        );
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
);
