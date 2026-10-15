// Input checks and abuse limits shared by the API routes (geocode, location-inspect, corrections).
import type { NextRequest } from "next/server";

/**
 * Per-visitor request limit. Every unique place lookup costs a slot in the shared Nominatim queue
 * (1 request per second for the whole site), so one visitor sending hundreds of lookups would
 * stall everyone else; /api/corrections uses it too, to limit spam. One count per IP covers all
 * three routes.
 *
 * This lives in memory, so each server instance counts separately and the count resets on
 * restart. It stops casual floods; a determined attacker needs the platform firewall
 * (or a shared store such as Redis) to be stopped completely.
 */
const WINDOW_MS = 60_000;
// Generous on purpose: Indian mobile networks put many users behind one shared IP (carrier-grade
// NAT), and the queue cap in rate-limit-cache.ts already stops a burst from stalling everyone
const MAX_REQUESTS_PER_WINDOW = 120;
const MAX_TRACKED_CLIENTS = 5000;

const hitsByClient = new Map<string, number[]>();

// The visitor's IP as reported by the hosting proxy. Only trustworthy where the host overwrites
// X-Forwarded-For (Vercel, Firebase Hosting, Cloud Run do); behind a proxy that passes the header
// through, a client could set it and get a fresh count on every request.
function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns the seconds to wait before retrying, or 0 if the request may go ahead. */
export function retryAfterSeconds(req: NextRequest): number {
  const key = clientKey(req);
  const now = Date.now();
  const recent = (hitsByClient.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    hitsByClient.set(key, recent);
    return Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000));
  }

  recent.push(now);
  // Re-insert so the map stays in least-recently-seen order, then drop the oldest clients
  hitsByClient.delete(key);
  hitsByClient.set(key, recent);
  while (hitsByClient.size > MAX_TRACKED_CLIENTS) {
    const oldest = hitsByClient.keys().next().value;
    if (oldest === undefined) break;
    hitsByClient.delete(oldest);
  }
  return 0;
}

/**
 * Parses a latitude or longitude query value strictly. parseFloat accepts "25abc" and
 * "Infinity"; this accepts only plain decimal numbers.
 */
export function parseCoordinateParam(value: string | null): number | null {
  if (!value || !/^-?\d{1,3}(\.\d{1,17})?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The box the site serves: roughly India (6–38°N, 68–98°E). */
export function isInServiceArea(lat: number, lng: number): boolean {
  return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}
