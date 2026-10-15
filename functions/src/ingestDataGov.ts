// River water levels from data.gov.in, India's Open Government Data platform (GODL licence).
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase-admin/firestore";
import { isDomainScrapingAllowed } from "./compliance";
import { appDb } from "./firestore";

// Set with `firebase functions:secrets:set DATA_GOV_IN_API_KEY`. Secrets are only injected into
// functions that list them, so reading process.env without this always came back empty.
const DATA_GOV_IN_API_KEY = defineSecret("DATA_GOV_IN_API_KEY");
// Not secret: the dataset ID. Set in functions/.env (DATA_GOV_RESOURCE_ID=...) or at deploy prompt.
const DATA_GOV_RESOURCE_ID = defineString("DATA_GOV_RESOURCE_ID", { default: "" });

const PILOT_STATES = ["Bihar", "Assam"];
const FETCH_TIMEOUT_MS = 15000;

interface DataGovRecord {
  station_name?: string;
  water_level?: string | number;
  discharge?: string | number;
  date_time?: string;
  state?: string;
  river?: string;
}

interface DataGovResponse {
  status?: string;
  records?: DataGovRecord[];
  total?: number;
}

/**
 * Reads data.gov.in date strings. The OGD catalogue mixes "dd-mm-yyyy hh:mm[:ss]",
 * "dd/mm/yyyy" and ISO dates; `new Date()` misreads or rejects the first two. Times without a
 * zone are Indian time. Returns null for anything unreadable so the record can be skipped.
 */
function parseDataGovDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const value = raw.trim();

  const dmy = value.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dmy) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = dmy;
    return istDate(Number(y), Number(m), Number(d), Number(hh), Number(mm), Number(ss));
  }

  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ymd) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = ymd;
    return istDate(Number(y), Number(m), Number(d), Number(hh), Number(mm), Number(ss));
  }

  // Full ISO 8601 with its own zone
  const date = new Date(value);
  return /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) && !Number.isNaN(date.getTime()) ? date : null;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** A wall-clock time in India, or null if any part is out of range (e.g. 31 February) */
function istDate(y: number, m: number, d: number, hh: number, mm: number, ss: number): Date | null {
  if (hh > 23 || mm > 59 || ss > 59) return null;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  const check = new Date(utcMs);
  // Date.UTC rolls 31 Feb over to March; reject instead of storing the wrong day
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return new Date(utcMs - IST_OFFSET_MS);
}

function parseLevel(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const level = typeof raw === "number" ? raw : Number(String(raw).trim());
  // 0 is a real reading; only missing or non-numeric values are skipped
  return Number.isFinite(level) ? level : null;
}

async function fetchState(
  resourceId: string,
  apiKey: string,
  state: string
): Promise<DataGovRecord[]> {
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: "500",
    // One state per request: a comma-separated filter value isn't an OR in the OGD API
    "filters[state]": state,
  });
  const res = await fetch(`https://api.data.gov.in/resource/${resourceId}?${params}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    // Status only: the URL carries the API key and must never reach the logs
    throw new Error(`data.gov.in request for ${state} failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as DataGovResponse;
  return data.records || [];
}

/**
 * Every 6 hours, but only when DATA_GOV_RESOURCE_ID names a dataset of river water levels
 * (fields station_name and water_level). There is deliberately no default: the ID that used to be
 * hard-coded here is a mandi commodity price dataset, not hydrology.
 *
 * Re-runs are safe: each reading's document ID is the station plus the reading time, so the same
 * reading overwrites itself instead of being added again.
 */
export const ingestDataGov = onSchedule(
  {
    schedule: "every 6 hours",
    secrets: [DATA_GOV_IN_API_KEY],
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    if (!isDomainScrapingAllowed("data.gov.in")) {
      logger.warn("data.gov.in ingestion skipped due to compliance policy");
      return;
    }

    const apiKey = DATA_GOV_IN_API_KEY.value();
    if (!apiKey) {
      logger.info("DATA_GOV_IN_API_KEY not configured. Skipping data.gov.in scheduled run.");
      return;
    }

    const resourceId = DATA_GOV_RESOURCE_ID.value();
    if (!resourceId) {
      logger.warn(
        "DATA_GOV_RESOURCE_ID is not set. Skipping data.gov.in: set it to a river water-level dataset to enable."
      );
      return;
    }

    logger.info(`Starting data.gov.in water-level ingestion from resource ${resourceId}`);
    const db = appDb();

    const records: DataGovRecord[] = [];
    for (const state of PILOT_STATES) {
      try {
        const stateRecords = await fetchState(resourceId, apiKey, state);
        records.push(...stateRecords.map((rec) => ({ ...rec, state: rec.state || state })));
      } catch (err) {
        logger.error(
          err instanceof Error ? err.message : `data.gov.in request for ${state} failed`
        );
      }
    }
    logger.info(`Received ${records.length} records from data.gov.in OGD catalog`);

    // Guard against a misconfigured dataset: without these fields the records aren't water levels
    const usable = records.filter((rec) => rec.station_name && rec.water_level !== undefined);
    if (records.length > 0 && usable.length === 0) {
      logger.error(
        `data.gov.in resource ${resourceId} returned ${records.length} records with no station_name/water_level fields. ` +
          "It is probably not a water-level dataset; nothing was written."
      );
      return;
    }

    // Newest reading per station, so latestReading is never replaced by an older record
    const newestByStation = new Map<
      string,
      { recordedAt: Date; level: number; rec: DataGovRecord }
    >();
    let written = 0;
    let skipped = 0;

    for (const rec of usable) {
      const level = parseLevel(rec.water_level);
      const recordedAt = parseDataGovDate(rec.date_time);
      if (level === null || !recordedAt) {
        skipped++;
        logger.warn(
          `Skipping data.gov.in record for ${rec.station_name}: unreadable level or date (${rec.water_level}, ${rec.date_time})`
        );
        continue;
      }

      // Stations get their own ogd_* documents rather than being matched to the pilot gauges,
      // since data.gov.in station names don't line up with them
      const stationSlug = rec.station_name!.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const stationDocId = `ogd_${stationSlug}`;

      try {
        await db
          .collection("gaugeStations")
          .doc(stationDocId)
          .collection("readings")
          .doc(`${stationDocId}_${recordedAt.getTime()}`)
          .set({
            value: level,
            // Always a Timestamp: mixing strings and Timestamps breaks orderBy("recordedAt")
            recordedAt: Timestamp.fromDate(recordedAt),
            source: "data.gov.in OGD Platform",
            sourceUrl: "https://data.gov.in",
            unit: "meters",
          });
        written++;

        const newest = newestByStation.get(stationDocId);
        if (!newest || recordedAt > newest.recordedAt) {
          newestByStation.set(stationDocId, { recordedAt, level, rec });
        }
      } catch (err) {
        logger.error(`Error writing data.gov.in reading for ${stationDocId}:`, err);
      }
    }

    for (const [stationDocId, { recordedAt, level, rec }] of newestByStation) {
      try {
        const stationRef = db.collection("gaugeStations").doc(stationDocId);
        // A run can return only older records; never replace a newer latest reading with them
        const current = (await stationRef.get()).data()?.latestReading?.recordedAt;
        if (current instanceof Timestamp && current.toMillis() >= recordedAt.getTime()) continue;

        await stationRef.set(
          {
            name: rec.station_name,
            source: "data.gov.in (Government Open Data License - India)",
            sourceUrl: "https://data.gov.in",
            state: rec.state || "Pilot State",
            latestReading: {
              value: level,
              recordedAt: Timestamp.fromDate(recordedAt),
              unit: "meters",
              source: "data.gov.in Open Government Data Platform",
              sourceUrl: "https://data.gov.in",
            },
          },
          { merge: true }
        );
      } catch (err) {
        logger.error(`Error updating latest reading for ${stationDocId}:`, err);
      }
    }

    logger.info(
      `data.gov.in: wrote ${written} readings for ${newestByStation.size} stations, skipped ${skipped} records`
    );
  }
);
