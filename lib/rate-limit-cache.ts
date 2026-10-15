// Server-side place lookups through OpenStreetMap's Nominatim, with caching and a request queue.
// Nominatim's usage policy allows at most one request a second for the whole site and asks that
// repeated lookups be cached, so every call goes through fetchWithRateLimitAndCache().
//
// The queue and memory cache live in this server process. With several server instances each has
// its own, so the 1-per-second limit holds per instance only; a shared store (e.g. Redis) would be
// needed to enforce it site-wide.
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import crypto from "crypto";
import { NOMINATIM_USER_AGENT } from "@/lib/site";

interface RateLimitCacheOptions<T> {
  service: string; // e.g. "nominatim"
  key: string; // Unique query or coordinate key
  ttlSeconds?: number; // Cache duration, defaults to 86400 (24h)
  minIntervalMs?: number; // Rate limit window, defaults to 1000 (1 req/sec)
  fetcher: () => Promise<T>;
}

interface RateLimitCacheResult<T> {
  data: T;
  source: "cache" | "fresh";
  latencyMs: number;
  scheduledDelayMs: number;
  cachedAt?: number;
  expiresAt?: number;
}

// First cache tier, in this process: answers repeat lookups without a Firestore read. Capped so a
// stream of unique lookups can't grow it without limit; the oldest entries are dropped first.
const inMemoryCache = new Map<string, { data: unknown; expiresAt: number; cachedAt: number }>();
const MAX_MEMORY_CACHE_ENTRIES = 2000;

function rememberInMemory(
  cacheKey: string,
  entry: { data: unknown; expiresAt: number; cachedAt: number }
) {
  inMemoryCache.delete(cacheKey);
  inMemoryCache.set(cacheKey, entry);
  while (inMemoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldest = inMemoryCache.keys().next().value;
    if (oldest === undefined) break;
    inMemoryCache.delete(oldest);
  }
}

// One first-in-first-out queue per outside service: each call waits for the previous one to finish
// plus minIntervalMs, which keeps calls at least a second apart
const serviceQueueMap = new Map<string, Promise<unknown>>();

// At 1 request per second, a queue longer than this means callers wait many seconds. Turn new
// lookups away instead of letting a burst stall every visitor (and outlive request timeouts).
const MAX_QUEUE_DEPTH = 8;
const queueDepthByService = new Map<string, number>();

/** Thrown when the lookup queue is full. Routes answer 503 with Retry-After. */
export class LookupBusyError extends Error {
  constructor() {
    super("Place lookup is busy. Please try again in a few seconds.");
    this.name = "LookupBusyError";
  }
}

// Nominatim calls that hang would hold the queue for everyone
const NOMINATIM_TIMEOUT_MS = 8000;

/**
 * Runs `action` after every earlier call to the same service, then holds the queue for
 * `minIntervalMs` so the next call can't start sooner. Throws LookupBusyError when the queue is full.
 */
async function runWithSerializedRateLimit<T>(
  service: string,
  minIntervalMs: number,
  action: () => Promise<T>
): Promise<{ result: T; delayMs: number }> {
  const depth = queueDepthByService.get(service) ?? 0;
  if (depth >= MAX_QUEUE_DEPTH) {
    throw new LookupBusyError();
  }
  queueDepthByService.set(service, depth + 1);

  const arrivalTime = Date.now();
  const previousQueuePromise = serviceQueueMap.get(service) || Promise.resolve();

  let actualDelayMs = 0;
  let executionResult: T;

  const executeStep = previousQueuePromise
    .catch(() => {}) // An earlier caller's failure is theirs; keep the queue moving
    .then(async () => {
      const startTime = Date.now();
      actualDelayMs = Math.max(0, startTime - arrivalTime);

      try {
        executionResult = await action();
      } finally {
        // Enforce strict spacing before next queued request can execute, even after a failure
        await new Promise((resolve) => setTimeout(resolve, minIntervalMs));
      }
    });

  // The next caller chains onto this one
  serviceQueueMap.set(service, executeStep);

  try {
    await executeStep;
  } finally {
    queueDepthByService.set(service, Math.max(0, (queueDepthByService.get(service) ?? 1) - 1));
  }
  return { result: executionResult!, delayMs: actualDelayMs };
}

/** A fixed-length document ID for a lookup, so the cache never stores the raw query as its key */
function hashCacheKey(service: string, key: string): string {
  const normalized = `${service}:${key.trim().toLowerCase()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 48);
}

/**
 * Second cache tier, shared by all server instances. Gives up after `timeoutMs` and treats it as a
 * miss: a slow cache read must not hold the whole lookup queue.
 */
async function readFirestoreCacheWithTimeout(cacheKey: string, timeoutMs = 80): Promise<any> {
  try {
    const cacheDocRef = adminDb.collection("external_call_cache").doc(cacheKey);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    );
    const doc = (await Promise.race([cacheDocRef.get(), timeoutPromise])) as any;
    if (doc && doc.exists) {
      return doc.data();
    }
  } catch {
    // Treat as cache miss
  }
  return null;
}

/**
 * Looks in the memory cache, then (inside the queue) the memory cache again and the Firestore
 * cache, and only then calls `fetcher`. Checking again inside the queue means that when several
 * visitors ask for the same place at once, only the first one reaches the outside service.
 */
async function fetchWithRateLimitAndCache<T>({
  service,
  key,
  ttlSeconds = 86400,
  minIntervalMs = 1000,
  fetcher,
}: RateLimitCacheOptions<T>): Promise<RateLimitCacheResult<T>> {
  const startTime = Date.now();
  const cacheKey = hashCacheKey(service, key);
  const ttlMs = ttlSeconds * 1000;

  // A memory hit skips the queue entirely
  const memCached = inMemoryCache.get(cacheKey);
  if (memCached && Date.now() < memCached.expiresAt) {
    return {
      data: memCached.data as T,
      source: "cache",
      latencyMs: Date.now() - startTime,
      scheduledDelayMs: 0,
      cachedAt: memCached.cachedAt,
      expiresAt: memCached.expiresAt,
    };
  }

  let isFromCache = false;
  const { result: fetchedData, delayMs: scheduledDelayMs } = await runWithSerializedRateLimit(
    service,
    minIntervalMs,
    async () => {
      // Another caller may have fetched this key while we waited in the queue
      const freshMem = inMemoryCache.get(cacheKey);
      if (freshMem && Date.now() < freshMem.expiresAt) {
        isFromCache = true;
        return freshMem.data as T;
      }

      const remoteCacheData = await readFirestoreCacheWithTimeout(cacheKey, 80);
      if (
        remoteCacheData &&
        typeof remoteCacheData?.expiresAt === "number" &&
        Date.now() < remoteCacheData.expiresAt &&
        remoteCacheData?.response !== undefined
      ) {
        isFromCache = true;
        rememberInMemory(cacheKey, {
          data: remoteCacheData.response,
          expiresAt: remoteCacheData.expiresAt,
          cachedAt: remoteCacheData.cachedAt,
        });
        return remoteCacheData.response as T;
      }

      return await fetcher();
    }
  );

  const now = Date.now();
  const expiresAt = now + ttlMs;

  if (!isFromCache) {
    // The Firestore write isn't awaited: the person shouldn't wait for the cache to be saved
    rememberInMemory(cacheKey, { data: fetchedData, expiresAt, cachedAt: now });

    try {
      // The raw key isn't stored: for searches it is what the person typed, which can be a home
      // address. `expireAt` is a Timestamp so a Firestore TTL policy on it can delete old entries.
      adminDb
        .collection("external_call_cache")
        .doc(cacheKey)
        .set({
          service,
          response: fetchedData,
          cachedAt: now,
          expiresAt,
          expireAt: Timestamp.fromMillis(expiresAt),
          ttlSeconds,
        })
        .catch(() => {});
    } catch {
      // A failed cache write only costs a repeat lookup later
    }
  }

  return {
    data: fetchedData,
    source: isFromCache ? "cache" : "fresh",
    latencyMs: Date.now() - startTime,
    scheduledDelayMs,
    cachedAt: now,
    expiresAt,
  };
}

/** Place name and district for a point, cached for 7 days (places don't move). */
export async function reverseGeocodeNominatim(lat: number, lon: number): Promise<RateLimitCacheResult<{
  displayName: string;
  suburb?: string;
  subdistrict?: string;
  district?: string;
  state?: string;
  postcode?: string;
}>> {
  // Round to 4 decimal places (~11 meters precision) to maximize cache hits
  const roundedLat = Number(lat.toFixed(4));
  const roundedLon = Number(lon.toFixed(4));
  const cacheKey = `${roundedLat},${roundedLon}`;

  const result = await fetchWithRateLimitAndCache({
    service: "nominatim",
    key: cacheKey,
    ttlSeconds: 7 * 86400,
    minIntervalMs: 1000,
    fetcher: async () => {
      // zoom=14 asks for suburb/village-level detail, enough to name a spot without a house address
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${roundedLat}&lon=${roundedLon}&zoom=14&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          "Accept-Language": "en,hi",
        },
        signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      });

      if (!res.ok) {
        throw new Error(`Nominatim reverse geocode failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const address = data.address || {};

      return {
        displayName: data.display_name || `${roundedLat}, ${roundedLon}`,
        suburb: address.suburb || address.village || address.neighbourhood || address.town,
        subdistrict: address.subdistrict || address.county,
        // Indian addresses use different OSM fields for the district depending on the area
        district: address.state_district || address.county || address.city,
        state: address.state,
        postcode: address.postcode,
      };
    },
  });

  return result;
}

/** Up to five places in India matching a typed search, cached for 24 hours. */
export async function forwardGeocodeNominatim(query: string): Promise<RateLimitCacheResult<Array<{
  lat: number;
  lon: number;
  displayName: string;
  district?: string;
  state?: string;
}>>> {
  const normalizedQuery = query.trim().toLowerCase();

  const result = await fetchWithRateLimitAndCache({
    service: "nominatim",
    key: `search:${normalizedQuery}`,
    ttlSeconds: 86400,
    minIntervalMs: 1000,
    fetcher: async () => {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        normalizedQuery
      )}&countrycodes=in&limit=5&addressdetails=1`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": NOMINATIM_USER_AGENT,
          "Accept-Language": "en,hi",
        },
        signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      });

      if (!res.ok) {
        throw new Error(`Nominatim search failed with HTTP ${res.status}`);
      }

      const items = await res.json();
      if (!Array.isArray(items)) return [];

      return items.map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
        district: item.address?.state_district || item.address?.county || item.address?.city,
        state: item.address?.state,
      }));
    },
  });

  return result;
}
