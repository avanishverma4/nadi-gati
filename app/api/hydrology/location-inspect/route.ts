import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodeNominatim } from "@/lib/rate-limit-cache";
import { isInServiceArea, parseCoordinateParam, retryAfterSeconds } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

// Everything the map's spot panel shows about a tapped point: ground height, modelled river flow
// nearby (Open-Meteo GloFAS) and the place name. Each part is optional; one failing lookup leaves
// the others in the answer.

interface LocationInspectResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  elevationMsl?: number;
  address?: {
    formatted: string;
    village?: string;
    subdistrict?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
  discharge?: {
    currentDailyM3s?: number;
    forecastPeakM3s?: number;
    peakDate?: string;
    dailyDischarges?: Array<{ date: string; dischargeM3s: number }>;
  };
  source: string;
}

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
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { success: false, error: "Missing lat or lng parameter." },
        { status: 400 }
      );
    }

    const lat = parseCoordinateParam(latStr);
    const lng = parseCoordinateParam(lngStr);

    if (lat === null || lng === null) {
      return NextResponse.json(
        { success: false, error: "Invalid latitude or longitude numbers." },
        { status: 400 }
      );
    }

    // Only look up places the site covers, so outside callers can't use it as a free proxy
    if (!isInServiceArea(lat, lng)) {
      return NextResponse.json(
        { success: false, error: "Coordinates are outside the supported territory of India." },
        { status: 400 }
      );
    }

    // 1. Fetch Elevation via Open-Meteo Digital Elevation Model (DEM)
    let elevationMsl: number | undefined;
    try {
      const elevationRes = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`,
        { next: { revalidate: 86400 } }
      );
      if (elevationRes.ok) {
        const elevData = await elevationRes.json();
        if (Array.isArray(elevData.elevation) && elevData.elevation.length > 0) {
          elevationMsl = Math.round(elevData.elevation[0] * 10) / 10;
        }
      }
    } catch (e) {
      console.warn("[location-inspect] elevation fetch error:", e);
    }

    // 2. Fetch GloFAS River Discharge Forecast via Open-Meteo Flood API
    let discharge: LocationInspectResponse["discharge"];
    try {
      const floodRes = await fetch(
        `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&forecast_days=7&past_days=2&timezone=Asia%2FKolkata`,
        { next: { revalidate: 3600 } }
      );
      if (floodRes.ok) {
        const floodData = await floodRes.json();
        const dates: string[] = floodData.daily?.time || [];
        const discharges: (number | null)[] = floodData.daily?.river_discharge || [];

        const paired = dates
          .map((d, i) => ({
            date: d,
            dischargeM3s: discharges[i] !== null ? Math.round(discharges[i]!) : 0,
          }))
          .filter((p) => p.dischargeM3s > 0);

        // Today in India; the request uses timezone=Asia/Kolkata so dates line up
        const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const todayIndex = paired.findIndex((p) => p.date === today);

        if (todayIndex >= 0) {
          const currentDailyM3s = paired[todayIndex].dischargeM3s;

          // Peak from today onwards only, so a past day is never shown as an upcoming peak
          let maxVal = currentDailyM3s;
          let maxDate = today;
          for (const item of paired.slice(todayIndex + 1)) {
            if (item.dischargeM3s > maxVal) {
              maxVal = item.dischargeM3s;
              maxDate = item.date;
            }
          }

          discharge = {
            currentDailyM3s,
            forecastPeakM3s: maxVal,
            peakDate: maxDate,
            dailyDischarges: paired,
          };
        }
      }
    } catch (e) {
      console.warn("[location-inspect] flood discharge fetch error:", e);
    }

    // 3. Reverse Geocode via existing cached rate-limited service
    let addressObj: LocationInspectResponse["address"];
    try {
      const geocodeResult = await reverseGeocodeNominatim(lat, lng);
      // reverseGeocodeNominatim already flattens Nominatim's address into these fields
      const place = geocodeResult?.data;
      if (place) {
        addressObj = {
          formatted: place.displayName,
          village: place.suburb,
          subdistrict: place.subdistrict,
          district: place.district,
          state: place.state,
          pincode: place.postcode,
        };
      }
    } catch (e) {
      console.warn("[location-inspect] reverse geocode error:", e);
    }

    return NextResponse.json({
      success: true,
      latitude: lat,
      longitude: lng,
      elevationMsl,
      address: addressObj,
      discharge,
      source:
        "Open-Meteo elevation and GloFAS river model; place names from OpenStreetMap Nominatim",
    });
  } catch (error: unknown) {
    console.error("[location-inspect] error:", error);
    return NextResponse.json(
      { success: false, error: "Couldn't look up this spot. Please try again." },
      { status: 500 }
    );
  }
}
