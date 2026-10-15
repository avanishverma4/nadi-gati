// Modelled river flow (GloFAS) and estimated rainfall from Open-Meteo, for the pilot gauges and districts.
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase-admin/firestore";
import { PILOT_SCOPE_DISTRICTS, PILOT_SCOPE_GAUGES } from "./pilotScope.generated";
import { FLOW_CELLS } from "./flowCells";
import { isDomainScrapingAllowed } from "./compliance";
import { FlowNormal, LatestFlow } from "./types";
import { appDb } from "./firestore";

interface OpenMeteoFloodResponse {
  daily?: {
    time: string[];
    river_discharge?: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  hourly?: {
    time: string[];
    precipitation?: Array<number | null>;
  };
}

const FLOOD_API = "https://flood-api.open-meteo.com/v1/flood";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const FLOW_SOURCE = "Open-Meteo, GloFAS river model";
const RAIN_SOURCE = "Open-Meteo, estimated";

// Seasonal normal: median flow for the same two weeks of the year over the last 20 years
const NORMAL_YEARS = 20;
// Either side of today. 6 keeps each yearly request to 13 days: Open-Meteo counts a request for
// more than two weeks of data as several calls against the free tier's daily limit.
const NORMAL_WINDOW_DAYS = 6;
// The normal moves only slowly through the year, so reuse it for a week
const NORMAL_MAX_AGE_DAYS = 7;
// Each normal costs one request per year; spread the first fill over several runs
const MAX_NORMALS_PER_RUN = 8;
// GloFAS publishes one value per day, so there is no point refetching a gauge every 30 minutes
const FLOW_REFRESH_MS = 3 * 60 * 60 * 1000;
// Day-to-day change (as a fraction) below which the river is "steady"
const STEADY_THRESHOLD = 0.02;
// A value this far from the seasonal normal is a model glitch, not a flood or a drought
const MAX_RATIO_TO_NORMAL = 50;
// Pause between requests, well inside Open-Meteo's 600-calls-a-minute limit
const REQUEST_GAP_MS = 250;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date in India (YYYY-MM-DD); Open-Meteo is queried with timezone=Asia/Kolkata */
function istDate(offsetDays = 0): string {
  return new Date(Date.now() + IST_OFFSET_MS + offsetDays * 86400000).toISOString().slice(0, 10);
}

/** The current hour in India in Open-Meteo's hourly format (YYYY-MM-DDTHH:00) */
function istHour(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 13) + ":00";
}

/** Days between two YYYY-MM-DD dates */
function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000;
}

/** The same calendar date `years` earlier, shifted by `days`, as YYYY-MM-DD */
function shiftDate(iso: string, years: number, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A hung request would otherwise use up the whole run and leave the remaining stations stale
const FETCH_TIMEOUT_MS = 15000;

/** Open-Meteo answered 429: the free tier's limit is used up, so stop asking this run */
class RateLimitedError extends Error {}

async function fetchJson<T>(url: string): Promise<T> {
  await sleep(REQUEST_GAP_MS);
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 429) throw new RateLimitedError("Open-Meteo rate limit reached");
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/**
 * Median flow for the same weeks of the year over the past NORMAL_YEARS years, fetched one short
 * window per year rather than 20 years of daily data in one request.
 */
async function computeFlowNormal(
  lat: number,
  lon: number,
  today: string
): Promise<FlowNormal | null> {
  const window: number[] = [];
  for (let years = 1; years <= NORMAL_YEARS; years++) {
    const url =
      `${FLOOD_API}?latitude=${lat}&longitude=${lon}&daily=river_discharge` +
      `&start_date=${shiftDate(today, years, -NORMAL_WINDOW_DAYS)}` +
      `&end_date=${shiftDate(today, years, NORMAL_WINDOW_DAYS)}`;
    const data = await fetchJson<OpenMeteoFloodResponse>(url);
    for (const value of data.daily?.river_discharge ?? []) {
      if (typeof value === "number") window.push(value);
    }
  }
  if (window.length === 0) return null;

  return {
    valueM3s: Math.round(median(window)),
    forDate: today,
    years: NORMAL_YEARS,
    windowDays: NORMAL_WINDOW_DAYS * 2 + 1,
    computedAt: Timestamp.now(),
  };
}

/** Why a modelled flow can't be shown, or null if it looks like a real river */
function implausibleFlow(flow: number, minM3s: number, normal: FlowNormal | null): string | null {
  if (!Number.isFinite(flow) || flow < 0) return `not a usable number (${flow})`;
  if (flow < minM3s) return `${flow} m³/s is below this river's floor of ${minM3s} m³/s`;
  if (normal && normal.valueM3s > 0) {
    const ratio = flow / normal.valueM3s;
    if (ratio > MAX_RATIO_TO_NORMAL || ratio < 1 / MAX_RATIO_TO_NORMAL) {
      return `${flow} m³/s is more than ${MAX_RATIO_TO_NORMAL}x away from the seasonal normal of ${normal.valueM3s} m³/s`;
    }
  }
  return null;
}

/**
 * Scheduled ingestion from Open-Meteo (free, no key, non-commercial use).
 * Runs every 30 minutes and writes, per pilot station and district:
 *  - gaugeStations/{id}.latestFlow: modelled river flow (m³/s) from GloFAS, its trend, a 3-day
 *    outlook and how it compares with the seasonal normal. This is NOT a water level and must never
 *    be written to latestReading, which holds levels in metres compared with the danger mark.
 *    Only for gauges with a checked model cell in flowCells.ts, and refreshed every 3 hours.
 *  - gaugeStations/{id}/flowReadings/{date}: one flow value per day
 *  - districts/{id}.latestRainfallMm: estimated rain over the last 24 hours (not a forecast)
 */
// Up to a few hundred short requests per run, so allow well over the 60 s default
export const ingestOpenMeteo = onSchedule(
  { schedule: "every 30 minutes", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    if (!isDomainScrapingAllowed("open-meteo.com")) {
      logger.warn("Open-Meteo ingestion skipped due to compliance policy");
      return;
    }

    const db = appDb();
    const today = istDate();
    let normalsComputed = 0;
    let updated = 0;
    let fresh = 0;
    let rejected = 0;
    let noCell = 0;

    // 1. River flow for pilot gauge stations
    for (const station of PILOT_SCOPE_GAUGES) {
      const cell = FLOW_CELLS[station.id];
      if (!cell) {
        noCell++;
        continue;
      }

      try {
        const stationRef = db.collection("gaugeStations").doc(station.id);
        const existing = (await stationRef.get()).data();

        const lastFlowAt = existing?.latestFlow?.recordedAt;
        if (
          existing?.latestFlow?.forDate === today &&
          lastFlowAt instanceof Timestamp &&
          Date.now() - lastFlowAt.toMillis() < FLOW_REFRESH_MS
        ) {
          fresh++;
          continue;
        }

        const data = await fetchJson<OpenMeteoFloodResponse>(
          `${FLOOD_API}?latitude=${cell.latitude}&longitude=${cell.longitude}&daily=river_discharge` +
            `&past_days=7&forecast_days=4&timezone=Asia%2FKolkata`
        );
        const times = data.daily?.time ?? [];
        const flows = data.daily?.river_discharge ?? [];
        const todayIndex = times.indexOf(today);
        const todayFlow = flows[todayIndex];
        if (todayIndex < 1 || typeof todayFlow !== "number") {
          logger.warn(`No GloFAS flow for ${station.id} on ${today}`);
          continue;
        }

        let normal: FlowNormal | null =
          existing?.flowNormal?.forDate &&
          daysBetween(existing.flowNormal.forDate, today) < NORMAL_MAX_AGE_DAYS
            ? existing.flowNormal
            : null;
        if (!normal && normalsComputed < MAX_NORMALS_PER_RUN) {
          normalsComputed++;
          try {
            normal = await computeFlowNormal(cell.latitude, cell.longitude, today);
          } catch (normalErr) {
            if (normalErr instanceof RateLimitedError) throw normalErr;
            logger.warn(`Could not compute flow normal for ${station.id}:`, normalErr);
          }
        }

        const problem = implausibleFlow(todayFlow, cell.minM3s, normal);
        if (problem) {
          rejected++;
          logger.warn(`Rejected GloFAS flow for ${station.id}: ${problem}`);
          continue;
        }

        const yesterdayFlow = flows[todayIndex - 1];
        const weekAgoFlow = flows[todayIndex - 7];
        const dayChange =
          typeof yesterdayFlow === "number" && yesterdayFlow > 0
            ? (todayFlow - yesterdayFlow) / yesterdayFlow
            : 0;

        // Highest flow expected over the next three days
        let outlookPeak = todayFlow;
        let outlookPeakDate = today;
        for (let i = todayIndex + 1; i <= todayIndex + 3 && i < flows.length; i++) {
          const value = flows[i];
          if (typeof value === "number" && value > outlookPeak) {
            outlookPeak = value;
            outlookPeakDate = times[i];
          }
        }

        const latestFlow: LatestFlow = {
          valueM3s: Math.round(todayFlow),
          forDate: today,
          trend:
            dayChange > STEADY_THRESHOLD
              ? "rising"
              : dayChange < -STEADY_THRESHOLD
                ? "falling"
                : "steady",
          changePct7d:
            typeof weekAgoFlow === "number" && weekAgoFlow > 0
              ? Math.round(((todayFlow - weekAgoFlow) / weekAgoFlow) * 100)
              : null,
          outlookPeakM3s: Math.round(outlookPeak),
          outlookPeakDate,
          normalM3s: normal?.valueM3s ?? null,
          percentOfNormal: normal?.valueM3s
            ? Math.round((todayFlow / normal.valueM3s) * 100)
            : null,
          recordedAt: Timestamp.now(),
          source: FLOW_SOURCE,
          sourceUrl: "https://open-meteo.com/en/docs/flood-api",
        };

        await stationRef.set(
          { latestFlow, ...(normal ? { flowNormal: normal } : {}) },
          { merge: true }
        );
        // One document per day, so repeated runs overwrite instead of piling up
        await stationRef.collection("flowReadings").doc(today).set({
          valueM3s: latestFlow.valueM3s,
          date: today,
          recordedAt: latestFlow.recordedAt,
          source: FLOW_SOURCE,
        });
        updated++;
      } catch (stationErr) {
        if (stationErr instanceof RateLimitedError) {
          // The rest would fail too; they are picked up on the next run
          logger.warn(
            `Open-Meteo rate limit reached at ${station.id}; leaving the remaining gauges for the next run`
          );
          break;
        }
        logger.error(`Error ingesting GloFAS flow for station ${station.id}:`, stationErr);
      }
    }
    logger.info(
      `GloFAS flow: ${updated} updated, ${fresh} already fresh, ${rejected} rejected, ` +
        `${noCell} without a checked model cell, ${normalsComputed} normals computed`
    );

    // 2. Estimated rainfall over the last 24 hours for pilot districts
    const currentHour = istHour();
    for (const district of PILOT_SCOPE_DISTRICTS) {
      try {
        const data = await fetchJson<OpenMeteoWeatherResponse>(
          `${WEATHER_API}?latitude=${district.latitude}&longitude=${district.longitude}&hourly=precipitation` +
            `&past_days=1&forecast_days=1&timezone=Asia%2FKolkata`
        );
        const times = data.hourly?.time ?? [];
        const rain = data.hourly?.precipitation ?? [];
        const nowIndex = times.indexOf(currentHour);
        if (nowIndex < 23) {
          logger.warn(`Not enough past hourly rainfall for ${district.id} at ${currentHour}`);
          continue;
        }

        // Each hourly value is the rain in the hour before it, so the 24 values up to now cover the last day
        const last24hMm =
          Math.round(
            rain.slice(nowIndex - 23, nowIndex + 1).reduce<number>((sum, v) => sum + (v ?? 0), 0) *
              10
          ) / 10;
        const recordedAt = new Date().toISOString();

        const districtRef = db.collection("districts").doc(district.id);
        await districtRef.set(
          {
            latestRainfallMm: last24hMm,
            rainfallPeriodHours: 24,
            rainfallSource: RAIN_SOURCE,
            rainfallSourceUrl: "https://open-meteo.com/en/docs",
            rainfallRecordedAt: recordedAt,
          },
          { merge: true }
        );
        // One document per hour, so repeated runs within the hour overwrite
        await districtRef.collection("rainfallReadings").doc(currentHour).set({
          value: last24hMm,
          unit: "mm",
          periodHours: 24,
          recordedAt: Timestamp.now(),
          source: RAIN_SOURCE,
          sourceUrl: "https://open-meteo.com/en/docs",
        });

        logger.info(`Rainfall in the last 24 h for ${district.id}: ${last24hMm} mm`);
      } catch (distErr) {
        if (distErr instanceof RateLimitedError) {
          logger.warn(
            `Open-Meteo rate limit reached at ${district.id}; leaving the remaining districts for the next run`
          );
          break;
        }
        logger.error(`Error ingesting rainfall for district ${district.id}:`, distErr);
      }
    }
  }
);
