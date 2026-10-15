// Modelled river flow (GloFAS) and estimated rainfall from Open-Meteo, for the pilot gauges and districts.
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase-admin/firestore";
import { PILOT_GAUGE_STATIONS, PILOT_DISTRICTS } from "./seedPilotData";
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
const NORMAL_WINDOW_DAYS = 7; // either side of today
// Day-to-day change (as a fraction) below which the river is "steady"
const STEADY_THRESHOLD = 0.02;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date in India (YYYY-MM-DD); Open-Meteo is queried with timezone=Asia/Kolkata */
function istDate(offsetDays = 0): string {
  return new Date(Date.now() + IST_OFFSET_MS + offsetDays * 86400000).toISOString().slice(0, 10);
}

/** The current hour in India in Open-Meteo's hourly format (YYYY-MM-DDTHH:00) */
function istHour(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 13) + ":00";
}

/** Days between two calendar dates ignoring the year, so 30 Dec and 2 Jan are 3 days apart */
function dayOfYearDistance(a: string, b: string): number {
  const toDoy = (iso: string) => {
    const d = new Date(`2001-${iso.slice(5, 10)}T00:00:00Z`); // fixed non-leap year
    return Math.round((d.getTime() - Date.UTC(2001, 0, 1)) / 86400000);
  };
  const diff = Math.abs(toDoy(a) - toDoy(b));
  return Math.min(diff, 365 - diff);
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// A hung request would otherwise use up the whole run and leave the remaining stations stale
const FETCH_TIMEOUT_MS = 15000;
// The 20-year history request for the seasonal normal is much larger
const NORMAL_FETCH_TIMEOUT_MS = 45000;

async function fetchJson<T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function computeFlowNormal(lat: number, lon: number, today: string): Promise<FlowNormal | null> {
  const lastYear = Number(today.slice(0, 4)) - 1;
  const url =
    `${FLOOD_API}?latitude=${lat}&longitude=${lon}&daily=river_discharge` +
    `&start_date=${lastYear - NORMAL_YEARS + 1}-01-01&end_date=${lastYear}-12-31`;
  const data = await fetchJson<OpenMeteoFloodResponse>(url, NORMAL_FETCH_TIMEOUT_MS);
  const times = data.daily?.time ?? [];
  const flows = data.daily?.river_discharge ?? [];

  const window: number[] = [];
  times.forEach((date, i) => {
    const value = flows[i];
    if (typeof value === "number" && dayOfYearDistance(date, today) <= NORMAL_WINDOW_DAYS) {
      window.push(value);
    }
  });
  if (window.length === 0) return null;

  return {
    valueM3s: Math.round(median(window)),
    forDate: today,
    years: NORMAL_YEARS,
    windowDays: NORMAL_WINDOW_DAYS * 2 + 1,
    computedAt: Timestamp.now(),
  };
}

/**
 * Scheduled ingestion from Open-Meteo (free, no key, non-commercial use).
 * Runs every 30 minutes and writes, per pilot station and district:
 *  - gaugeStations/{id}.latestFlow: modelled river flow (m³/s) from GloFAS, its trend, a 3-day
 *    outlook and how it compares with the seasonal normal. This is NOT a water level and must never
 *    be written to latestReading, which holds levels in metres compared with the danger mark.
 *  - gaugeStations/{id}/flowReadings/{date}: one flow value per day
 *  - districts/{id}.latestRainfallMm: estimated rain over the last 24 hours (not a forecast)
 */
// About 20 sequential requests (some fetching 20 years of history), so allow well over the 60 s default
export const ingestOpenMeteo = onSchedule(
  { schedule: "every 30 minutes", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    if (!isDomainScrapingAllowed("open-meteo.com")) {
      logger.warn("Open-Meteo ingestion skipped due to compliance policy");
      return;
    }

    const db = appDb();
    const today = istDate();

    // 1. River flow for pilot gauge stations
    for (const station of PILOT_GAUGE_STATIONS) {
      try {
        const lat = station.location.latitude;
        const lon = station.location.longitude;
        const stationRef = db.collection("gaugeStations").doc(station.id);

        const data = await fetchJson<OpenMeteoFloodResponse>(
          `${FLOOD_API}?latitude=${lat}&longitude=${lon}&daily=river_discharge` +
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

        // The seasonal normal only changes day to day, so recompute it once per day
        const existing = (await stationRef.get()).data();
        let normal: FlowNormal | null = existing?.flowNormal?.forDate === today ? existing.flowNormal : null;
        if (!normal) {
          try {
            normal = await computeFlowNormal(lat, lon, today);
          } catch (normalErr) {
            logger.warn(`Could not compute flow normal for ${station.id}:`, normalErr);
          }
        }

        const latestFlow: LatestFlow = {
          valueM3s: Math.round(todayFlow),
          forDate: today,
          trend: dayChange > STEADY_THRESHOLD ? "rising" : dayChange < -STEADY_THRESHOLD ? "falling" : "steady",
          changePct7d:
            typeof weekAgoFlow === "number" && weekAgoFlow > 0
              ? Math.round(((todayFlow - weekAgoFlow) / weekAgoFlow) * 100)
              : null,
          outlookPeakM3s: Math.round(outlookPeak),
          outlookPeakDate,
          normalM3s: normal?.valueM3s ?? null,
          percentOfNormal: normal?.valueM3s ? Math.round((todayFlow / normal.valueM3s) * 100) : null,
          recordedAt: Timestamp.now(),
          source: FLOW_SOURCE,
          sourceUrl: "https://open-meteo.com/en/docs/flood-api",
        };

        await stationRef.set({ latestFlow, ...(normal ? { flowNormal: normal } : {}) }, { merge: true });
        // One document per day, so the 30-minute schedule overwrites instead of piling up
        await stationRef.collection("flowReadings").doc(today).set({
          valueM3s: latestFlow.valueM3s,
          date: today,
          recordedAt: latestFlow.recordedAt,
          source: FLOW_SOURCE,
        });

        logger.info(
          `GloFAS flow for ${station.id}: ${latestFlow.valueM3s} m³/s (${latestFlow.trend}, ` +
            `${latestFlow.percentOfNormal ?? "?"}% of normal)`
        );
      } catch (stationErr) {
        logger.error(`Error ingesting GloFAS flow for station ${station.id}:`, stationErr);
      }
    }

    // 2. Estimated rainfall over the last 24 hours for pilot districts
    const currentHour = istHour();
    for (const district of PILOT_DISTRICTS) {
      try {
        const lat = district.boundary.latitude;
        const lon = district.boundary.longitude;

        const data = await fetchJson<OpenMeteoWeatherResponse>(
          `${WEATHER_API}?latitude=${lat}&longitude=${lon}&hourly=precipitation` +
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
          Math.round(rain.slice(nowIndex - 23, nowIndex + 1).reduce<number>((sum, v) => sum + (v ?? 0), 0) * 10) /
          10;
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
        logger.error(`Error ingesting rainfall for district ${district.id}:`, distErr);
      }
    }
  }
);
