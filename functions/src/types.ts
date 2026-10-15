// Shapes of the Firestore documents the functions write (seeding, ingestion) or read
// (corroboration). The website has its own copies of these shapes in lib/hydrology-data.ts;
// firebase-blueprint.json describes every collection in one place.
import { GeoPoint, Timestamp } from "firebase-admin/firestore";

export type StateScope = "Bihar" | "Assam";

export interface HelplineContact {
  title: string;
  number: string;
  type: "state_control_room" | "district_disaster_authority" | "ndrf_sdrf" | "toll_free";
}

export interface DistrictDocument {
  id: string;
  name: string;
  state: StateScope;
  boundary: GeoPoint;
  helplineNumbers: HelplineContact[];
  source: string;
  sourceUrl: string;
  updatedAt?: Timestamp | string;
}

/** A pilot district as the ingestion jobs see it (src/pilotScope.generated.ts) */
export interface PilotScopeDistrict {
  id: string;
  name: string;
  state: StateScope;
  latitude: number;
  longitude: number;
}

/** A pilot gauge as the ingestion jobs see it (src/pilotScope.generated.ts) */
export interface PilotScopeGauge {
  id: string;
  name: string;
  districtId: string;
  riverName: string;
  latitude: number;
  longitude: number;
}

export interface LatestReading {
  value: number; // water level in metres; river flow lives in LatestFlow
  recordedAt: Timestamp | string;
  unit: "meters";
  trend?: "rising" | "falling" | "steady";
  source: string;
  sourceUrl: string;
}

export interface GaugeStationDocument {
  id: string;
  name: string;
  districtId: string;
  riverName?: string;
  location: GeoPoint;
  dangerLevel: number;
  warningLevel: number;
  source: string;
  sourceUrl: string;
  latestReading: LatestReading;
}

/** Seasonal normal flow: median for the same weeks of the year over past years */
export interface FlowNormal {
  valueM3s: number;
  /** IST date (YYYY-MM-DD) the normal was computed for */
  forDate: string;
  years: number;
  windowDays: number;
  computedAt: Timestamp;
}

/**
 * Modelled river flow from GloFAS. Kept apart from LatestReading because flow (m³/s) cannot be
 * compared with warning and danger marks, which are water levels in metres.
 */
export interface LatestFlow {
  valueM3s: number;
  /** IST date (YYYY-MM-DD) the value is for */
  forDate: string;
  trend: "rising" | "falling" | "steady";
  /** Change since 7 days earlier, in percent */
  changePct7d: number | null;
  /** Highest flow expected over the next 3 days */
  outlookPeakM3s: number;
  outlookPeakDate: string;
  normalM3s: number | null;
  percentOfNormal: number | null;
  recordedAt: Timestamp;
  source: string;
  sourceUrl: string;
}

export interface ReservoirDocument {
  id: string;
  name: string;
  districtId: string;
  riverName?: string;
  location: GeoPoint;
  dangerLevel: number; // Full reservoir level (meters)
  warningLevel: number; // Rule curve / flood warning level (meters)
  source: string;
  sourceUrl: string;
  latestReading: LatestReading;
}

// A community flood report, as created by the website's report form and then updated by the
// corroboration trigger. `category` lists every value firestore.rules accepts; the form currently
// offers road_submerged, embankment_breach, river_overflow and other.
export interface ReportDocument {
  id?: string;
  category:
    | "embankment_breach"
    | "waterlogging"
    | "river_overflow"
    | "evacuation_needed"
    | "road_submerged"
    | "dam_release"
    | "general_alert"
    | "other";
  description: string;
  photoUrl?: string;
  location: GeoPoint;
  geohash: string;
  createdAt: Timestamp;
  confidence: number;
  districtId?: string;
  corroboratedBy?: string[]; // IDs of nearby corroborating reports
}
