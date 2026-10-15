import { NextRequest, NextResponse } from "next/server";
import {
  reverseGeocodeNominatim,
  forwardGeocodeNominatim,
  LookupBusyError,
} from "@/lib/rate-limit-cache";
import { isInServiceArea, parseCoordinateParam, retryAfterSeconds } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

// Place-name lookups through OpenStreetMap's Nominatim: ?lat=&lon= for the place at a point, or
// ?q= to search by name. Every call goes through lib/rate-limit-cache.ts, which caches results
// and keeps the whole site within Nominatim's limit of one request per second.

export async function GET(req: NextRequest) {
  const waitSeconds = retryAfterSeconds(req);
  if (waitSeconds > 0) {
    return NextResponse.json(
      { success: false, error: "Too many lookups. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");
    const qStr = searchParams.get("q");

    if (latStr && lonStr) {
      const lat = parseCoordinateParam(latStr);
      const lon = parseCoordinateParam(lonStr);

      if (lat === null || lon === null) {
        return NextResponse.json(
          { success: false, error: "Invalid latitude or longitude numbers." },
          { status: 400 }
        );
      }

      // Roughly India (6–38°N, 68–98°E): the site only covers India, and Nominatim is a shared
      // free service we shouldn't spend on lookups elsewhere
      if (!isInServiceArea(lat, lon)) {
        return NextResponse.json(
          { success: false, error: "Coordinates are outside the supported territory of India." },
          { status: 400 }
        );
      }

      const result = await reverseGeocodeNominatim(lat, lon);

      return NextResponse.json({
        success: true,
        type: "reverse",
        result: result.data,
        source: result.source,
        latencyMs: result.latencyMs,
        scheduledDelayMs: result.scheduledDelayMs,
        cachedAt: result.cachedAt,
        expiresAt: result.expiresAt,
      });
    }

    if (qStr && qStr.trim().length > 0) {
      const query = qStr.trim().slice(0, 120);
      const result = await forwardGeocodeNominatim(query);

      return NextResponse.json({
        success: true,
        type: "forward",
        results: result.data,
        source: result.source,
        latencyMs: result.latencyMs,
        scheduledDelayMs: result.scheduledDelayMs,
        cachedAt: result.cachedAt,
        expiresAt: result.expiresAt,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Provide either lat & lon for reverse geocoding, or q for forward search.",
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    if (err instanceof LookupBusyError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 503, headers: { "Retry-After": "5" } }
      );
    }
    console.error("[api/geocode] error:", err);
    return NextResponse.json(
      { success: false, error: "Place lookup failed. Please try again." },
      { status: 500 }
    );
  }
}
