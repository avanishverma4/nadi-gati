// Starting data for the pilot: districts, gauge stations and reservoirs in Bihar and Assam. Written
// by the seedPilotScope endpoint (index.ts); the ingestion functions also read these lists to know
// which places to fetch. The website keeps its own copy in lib/hydrology-data.ts.
import { GeoPoint, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { DistrictDocument, GaugeStationDocument, ReservoirDocument } from "./types";
import { appDb } from "./firestore";

// Seeded readings are illustrative starting values, not measurements, so they are never credited
// to an agency. Keep the wording in step with SAMPLE_READING_SOURCE in lib/hydrology-data.ts.
const SAMPLE_READING_SOURCE = "Sample data, pilot preview";

// helplineNumbers here are unchecked. The website doesn't read them (it shows only verified
// national and state numbers), so check each one before any page starts using them.
export const PILOT_DISTRICTS: DistrictDocument[] = [
  // --- BIHAR PILOT ---
  {
    id: "bihar_patna",
    name: "Patna",
    state: "Bihar",
    boundary: new GeoPoint(25.61, 85.14),
    helplineNumbers: [
      { title: "State Emergency Operation Centre (SEOC) Bihar", number: "1070", type: "state_control_room" },
      { title: "District Disaster Control Room Patna", number: "0612-2210118", type: "district_disaster_authority" },
      { title: "SDRF 9th Battalion Command", number: "0612-2501112", type: "ndrf_sdrf" },
    ],
    source: "Disaster Management Department, Government of Bihar",
    sourceUrl: "https://disastermgmt.bih.nic.in",
  },
  {
    id: "bihar_bhagalpur",
    name: "Bhagalpur",
    state: "Bihar",
    boundary: new GeoPoint(25.25, 86.98),
    helplineNumbers: [
      { title: "District Disaster Control Room Bhagalpur", number: "0641-2401101", type: "district_disaster_authority" },
      { title: "District Emergency Toll Free", number: "1077", type: "toll_free" },
    ],
    source: "Disaster Management Department, Government of Bihar",
    sourceUrl: "https://disastermgmt.bih.nic.in",
  },
  {
    id: "bihar_muzaffarpur",
    name: "Muzaffarpur",
    state: "Bihar",
    boundary: new GeoPoint(26.12, 85.39),
    helplineNumbers: [
      { title: "District Disaster Control Room Muzaffarpur", number: "0621-2212377", type: "district_disaster_authority" },
      { title: "SDRF Quick Response Control", number: "1077", type: "ndrf_sdrf" },
    ],
    source: "Disaster Management Department, Government of Bihar",
    sourceUrl: "https://disastermgmt.bih.nic.in",
  },
  {
    id: "bihar_katihar",
    name: "Katihar",
    state: "Bihar",
    boundary: new GeoPoint(25.55, 87.58),
    helplineNumbers: [
      { title: "District Disaster Control Room Katihar", number: "06452-242400", type: "district_disaster_authority" },
      { title: "Flood Control Room Mahananda", number: "06452-243501", type: "district_disaster_authority" },
    ],
    source: "Disaster Management Department, Government of Bihar",
    sourceUrl: "https://disastermgmt.bih.nic.in",
  },

  // --- ASSAM PILOT ---
  {
    id: "assam_kamrup_metro",
    name: "Kamrup Metropolitan",
    state: "Assam",
    boundary: new GeoPoint(26.18, 91.75),
    helplineNumbers: [
      { title: "Assam State Disaster Management Authority (ASDMA)", number: "1070", type: "state_control_room" },
      { title: "Kamrup Metro District Disaster Control Room", number: "1077 / 0361-2733052", type: "district_disaster_authority" },
      { title: "1st Battalion NDRF Guwahati", number: "0361-2840284", type: "ndrf_sdrf" },
    ],
    source: "Assam State Disaster Management Authority (ASDMA)",
    sourceUrl: "https://asdma.assam.gov.in",
  },
  {
    id: "assam_dibrugarh",
    name: "Dibrugarh",
    state: "Assam",
    boundary: new GeoPoint(27.48, 94.92),
    helplineNumbers: [
      { title: "Dibrugarh District Disaster Control Room", number: "0373-2312940", type: "district_disaster_authority" },
      { title: "Emergency Operations Toll Free", number: "1077", type: "toll_free" },
    ],
    source: "Assam State Disaster Management Authority (ASDMA)",
    sourceUrl: "https://asdma.assam.gov.in",
  },
  {
    id: "assam_cachar",
    name: "Cachar",
    state: "Assam",
    boundary: new GeoPoint(24.83, 92.79),
    helplineNumbers: [
      { title: "Cachar District Emergency Operation Centre Silchar", number: "03842-245866", type: "district_disaster_authority" },
      { title: "Barak Flood Control Helpline", number: "1077", type: "toll_free" },
    ],
    source: "Assam State Disaster Management Authority (ASDMA)",
    sourceUrl: "https://asdma.assam.gov.in",
  },
  {
    id: "assam_dhubri",
    name: "Dhubri",
    state: "Assam",
    boundary: new GeoPoint(26.02, 89.98),
    helplineNumbers: [
      { title: "Dhubri District Disaster Management Cell", number: "03662-230018", type: "district_disaster_authority" },
      { title: "Brahmaputra Border Control Room", number: "1077", type: "toll_free" },
    ],
    source: "Assam State Disaster Management Authority (ASDMA)",
    sourceUrl: "https://asdma.assam.gov.in",
  },
];

export const PILOT_GAUGE_STATIONS: GaugeStationDocument[] = [
  // --- BIHAR STATIONS ---
  {
    id: "station_ganga_dighaghat",
    name: "Dighaghat (Ganga River)",
    districtId: "bihar_patna",
    riverName: "Ganga",
    location: new GeoPoint(25.65, 85.12),
    dangerLevel: 50.45,
    warningLevel: 49.45,
    source: "Open-Meteo GloFAS & Central Water Commission Hydrological Bulletin",
    sourceUrl: "https://flood-api.open-meteo.com",
    latestReading: {
      value: 48.35,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "steady",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
  {
    id: "station_ganga_bhagalpur",
    name: "Bhagalpur (Ganga River)",
    districtId: "bihar_bhagalpur",
    riverName: "Ganga",
    location: new GeoPoint(25.26, 87.01),
    dangerLevel: 33.68,
    warningLevel: 32.68,
    source: "Open-Meteo GloFAS & CWC Water Level Monitoring",
    sourceUrl: "https://flood-api.open-meteo.com",
    latestReading: {
      value: 31.85,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "rising",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
  {
    id: "station_gandak_rewaghat",
    name: "Rewaghat (Gandak River)",
    districtId: "bihar_muzaffarpur",
    riverName: "Gandak",
    location: new GeoPoint(25.98, 85.05),
    dangerLevel: 54.41,
    warningLevel: 53.41,
    source: "Open-Meteo GloFAS & Bihar WRD",
    sourceUrl: "https://flood-api.open-meteo.com",
    latestReading: {
      value: 52.9,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "falling",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },

  // --- ASSAM STATIONS ---
  {
    id: "station_brahmaputra_pandu",
    name: "Pandu Guwahati (Brahmaputra River)",
    districtId: "assam_kamrup_metro",
    riverName: "Brahmaputra",
    location: new GeoPoint(26.17, 91.68),
    dangerLevel: 49.68,
    warningLevel: 48.68,
    source: "Open-Meteo GloFAS & ASDMA River Gauge Bulletin",
    sourceUrl: "https://flood-api.open-meteo.com",
    latestReading: {
      value: 47.92,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "steady",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
  {
    id: "station_brahmaputra_dibrugarh",
    name: "Dibrugarh (Brahmaputra River)",
    districtId: "assam_dibrugarh",
    riverName: "Brahmaputra",
    location: new GeoPoint(27.48, 94.92),
    dangerLevel: 105.7,
    warningLevel: 104.7,
    source: "Open-Meteo GloFAS & Brahmaputra Board Telemetry",
    sourceUrl: "https://flood-api.open-meteo.com",
    latestReading: {
      value: 104.15,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "rising",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
  {
    id: "station_barak_annapurnaghat",
    name: "Annapurna Ghat Silchar (Barak River)",
    districtId: "assam_cachar",
    riverName: "Barak",
    location: new GeoPoint(24.83, 92.78),
    dangerLevel: 19.83,
    warningLevel: 18.83,
    source: "Open-Meteo GloFAS & Cachar Disaster Cell",
    sourceUrl: "https://flood-api.open-meteo.com",
    latestReading: {
      value: 17.65,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "falling",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
];

export const PILOT_RESERVOIRS: ReservoirDocument[] = [
  {
    id: "reservoir_chandan_dam",
    name: "Chandan Dam Reservoir",
    districtId: "bihar_bhagalpur",
    riverName: "Chandan",
    location: new GeoPoint(24.85, 86.95),
    dangerLevel: 152.4, // Full reservoir level (meters)
    warningLevel: 150.0,
    source: "Water Resources Department, Bihar",
    sourceUrl: "https://wrd.bihar.gov.in",
    latestReading: {
      value: 148.2,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "steady",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
  {
    id: "reservoir_khandong_kopili",
    name: "Khandong Dam (Kopili Reservoir)",
    districtId: "assam_kamrup_metro",
    riverName: "Kopili",
    location: new GeoPoint(25.53, 92.68),
    dangerLevel: 719.3,
    warningLevel: 715.0,
    source: "NEEPCO Hydrological Telemetry & ASDMA",
    sourceUrl: "https://neepco.co.in",
    latestReading: {
      value: 712.5,
      recordedAt: Timestamp.now(),
      unit: "meters",
      trend: "steady",
      source: SAMPLE_READING_SOURCE,
      sourceUrl: "",
    },
  },
];

/**
 * Writes the pilot districts, gauges and reservoirs in one batch (well under Firestore's 500-write
 * limit). merge: true keeps fields the ingestion functions have added, such as latestFlow.
 */
export async function seedPilotHydrologyData(): Promise<{ success: boolean; message: string }> {
  const db = appDb();
  logger.info("Starting seed of Bihar & Assam pilot hydrology collections...");

  const batch = db.batch();

  // 1. Seed Districts
  for (const district of PILOT_DISTRICTS) {
    const ref = db.collection("districts").doc(district.id);
    batch.set(ref, district, { merge: true });
  }

  // 2. Seed Gauge Stations
  for (const station of PILOT_GAUGE_STATIONS) {
    const ref = db.collection("gaugeStations").doc(station.id);
    batch.set(ref, station, { merge: true });
  }

  // 3. Seed Reservoirs
  for (const reservoir of PILOT_RESERVOIRS) {
    const ref = db.collection("reservoirs").doc(reservoir.id);
    batch.set(ref, reservoir, { merge: true });
  }

  await batch.commit();
  logger.info("Successfully seeded pilot districts, gauge stations, and reservoirs.");

  return {
    success: true,
    message: `Seeded ${PILOT_DISTRICTS.length} districts, ${PILOT_GAUGE_STATIONS.length} gauge stations, and ${PILOT_RESERVOIRS.length} reservoirs for Bihar & Assam.`,
  };
}
