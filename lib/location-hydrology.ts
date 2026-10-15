// Spot analysis for a point tapped on a map. Everything here is derived from the gauge list and
// river centrelines in this file; live extras (place name, ground height, modelled flow) come from
// /api/hydrology/location-inspect. Nothing is forecast or invented: a spot far from our gauges is
// reported as outside coverage rather than borrowing a distant gauge's status.
import {
  DistrictData,
  GaugeStationData,
  PILOT_DISTRICTS_DATA,
  PILOT_GAUGE_STATIONS_DATA,
  calculateStationSeverity,
} from "./hydrology-data";

/** A spot counts as covered only inside Bihar or Assam and this close to one of our gauges */
const COVERAGE_RADIUS_KM = 40;

export type RiverProximity = "riverside" | "floodplain" | "further";

export interface ClickedLocationAnalysis {
  latitude: number;
  longitude: number;
  /** Inside the pilot area and within COVERAGE_RADIUS_KM of a gauge */
  isCovered: boolean;
  state: "Bihar" | "Assam" | null;
  /** Nearest pilot district, used for links and helplines */
  district: DistrictData;
  riverName: string;
  distanceToRiverKm: number;
  proximity: RiverProximity;
  nearestStation: GaugeStationData;
  distanceToNearestStationKm: number;
  bearingToNearestStation: string;
  stationSeverity: ReturnType<typeof calculateStationSeverity>;
  /** Nearest gauge's level minus its danger mark (positive means above) */
  differenceToDangerM: number;
  advice: string[];
  districtHelplines: Array<{ title: string; number: string; type: string }>;
}

/**
 * Approximate centrelines of the main pilot rivers, drawn as straight segments between known
 * ghats, bridges and towns. Accurate to a few kilometres: fine for "is this spot near the river",
 * not for mapping. Waypoints run downstream.
 */
const MAJOR_RIVER_TRAJECTORIES: Array<{
  name: string;
  state: "Bihar" | "Assam" | "Interstate";
  waypoints: Array<[number, number]>; // [lat, lng]
}> = [
  // --- BIHAR RIVERS ---
  {
    name: "Ganga",
    state: "Bihar",
    waypoints: [
      [25.57, 83.98], // Buxar
      [25.66, 84.71], // Barhara / Sinha
      [25.72, 84.85], // Doriganj Sangam
      [25.64, 85.04], // Danapur Peepal Ghat
      [25.65, 85.12], // Digha Ghat
      [25.62, 85.17], // Gandhi Ghat
      [25.61, 85.2], // Gai Ghat
      [25.51, 85.31], // Fatuha Confluence
      [25.55, 85.52], // Bakhtiyarpur
      [25.37, 85.98], // Hathidah / Mokama
      [25.38, 86.47], // Munger
      [25.24, 86.74], // Sultanganj
      [25.26, 87.01], // Barari Ghat Bhagalpur
      [25.26, 87.24], // Kahalgaon
      [25.33, 87.35], // Bateshwar Sthan
      [25.33, 87.62], // Manihari Ghat (Katihar)
    ],
  },
  {
    name: "Ghaghra",
    state: "Bihar",
    waypoints: [
      [25.89, 84.09], // Darauli (Siwan)
      [25.87, 84.45], // Siswan (Siwan)
      [25.82, 84.58], // Manjhi Bridge (Saran)
      [25.78, 84.66], // Revelganj (Saran)
      [25.77, 84.73], // Chhapra Town
      [25.72, 84.85], // Doriganj Sangam (Ganga confluence)
    ],
  },
  {
    name: "Gandak",
    state: "Bihar",
    waypoints: [
      [27.43, 83.91], // Valmikinagar Barrage
      [27.1, 84.09], // Bagaha
      [26.54, 84.52], // Jadopur (Gopalganj)
      [26.43, 84.72], // Sangrampur (East Champaran)
      [26.33, 84.88], // Dumariya Ghat
      [25.98, 85.05], // Rewaghat (Muzaffarpur border)
      [25.87, 85.17], // Lalganj (Vaishali)
      [25.69, 85.19], // Sonepur Harihar Nath Ghat
      [25.68, 85.21], // Konhara Ghat (Hajipur / Ganga confluence)
    ],
  },
  {
    name: "Burhi Gandak",
    state: "Bihar",
    waypoints: [
      [26.8, 84.51], // Bettiah / Sikrahana
      [26.93, 84.57], // Chanpatia
      [26.65, 84.91], // Ahirwalia (Motihari)
      [26.58, 85.02], // Lalbegia (Motihari)
      [26.42, 85.04], // Chakia
      [26.13, 85.39], // Sikandarpur / Akharaghat (Muzaffarpur)
      [25.85, 85.77], // Magardahi (Samastipur Town)
      [25.75, 86.01], // Rosera
      [25.5, 86.48], // Khagaria Town (Ganga confluence)
    ],
  },
  {
    name: "Bagmati",
    state: "Bihar",
    waypoints: [
      [26.79, 85.34], // Dheng (Sitamarhi)
      [26.38, 85.48], // Runisaidpur
      [26.31, 85.52], // Aurai (Muzaffarpur)
      [26.24, 85.49], // Lakhandei Confluence
      [26.21, 85.64], // Katra
      [26.17, 85.62], // Benibad
      [25.98, 85.83], // Hayaghat (Darbhanga)
      [25.55, 86.55], // Badlaghat / Kosi confluence
    ],
  },
  {
    name: "Kosi",
    state: "Bihar",
    waypoints: [
      [26.52, 86.99], // Birpur Barrage
      [26.31, 86.58], // Nirmali Ring Bundh
      [26.12, 86.6], // Supaul Plain
      [25.95, 86.58], // Saharsa West
      [25.56, 86.72], // Baltara (Khagaria)
      [25.46, 87.38], // Barari Kosi (Katihar)
      [25.42, 87.25], // Kursela Ghat (Ganga confluence)
    ],
  },
  {
    name: "Mahananda",
    state: "Bihar",
    waypoints: [
      [26.1, 88.15], // Kishanganj
      [25.86, 87.77], // Dhengraghat (Purnia)
      [25.68, 87.89], // Barsoi / Sudhani
      [25.64, 87.89], // Jhaua (Katihar)
      [25.54, 87.86], // Azamnagar
      [25.28, 87.82], // Amdabad (Ganga confluence)
    ],
  },
  {
    name: "Sone",
    state: "Bihar",
    waypoints: [
      [24.91, 84.18], // Dehri-on-Sone
      [25.24, 84.67], // Arwal
      [25.58, 84.79], // Koelwar Bridge (Bhojpur)
      [25.65, 84.98], // Maner / Danapur (Ganga confluence)
    ],
  },
  {
    name: "Punpun & Dardha",
    state: "Bihar",
    waypoints: [
      [25.02, 84.77], // Kinjar
      [25.4, 85.19], // Dhanarua / Dardha
      [25.51, 85.12], // Sripalpur (Patna)
      [25.51, 85.31], // Fatuha Triveni Ghat (Ganga confluence)
    ],
  },

  // --- ASSAM RIVERS ---
  {
    name: "Brahmaputra",
    state: "Assam",
    waypoints: [
      [27.5, 94.95], // Maijan (Dibrugarh)
      [27.48, 94.92], // Dibrugarh Old Ghat
      [27.4, 94.76], // Bogibeel Bridge
      [26.92, 94.18], // Kamalabari (Majuli Island)
      [26.85, 94.23], // Neamatighat (Jorhat)
      [26.62, 92.79], // Tezpur Jahajghat (Sonitpur)
      [26.25, 92.05], // Morigaon Reach
      [26.2, 91.73], // Aswaklanta / North Guwahati
      [26.19, 91.75], // Uzanbazar
      [26.18, 91.74], // Sukreswar / Fancy Bazar
      [26.17, 91.68], // Pandu Port
      [26.48, 90.93], // Beki Confluence Reach
      [26.18, 91.02], // Tarabari (Barpeta)
      [26.17, 90.62], // Goalpara Kacharighat
      [26.19, 90.57], // Jogighopa
      [26.02, 89.98], // Dhubri River Port
    ],
  },
  {
    name: "Burhi Dihing",
    state: "Assam",
    waypoints: [
      [27.3, 95.32], // Naharkatia
      [27.27, 94.92], // Khowang
      [27.24, 94.65], // Dihingmukh (Brahmaputra confluence)
    ],
  },
  {
    name: "Barak",
    state: "Assam",
    waypoints: [
      [24.79, 93.12], // Jirighat Border
      [24.78, 93.01], // Lakhipur
      [24.83, 92.83], // Sonai Confluence
      [24.83, 92.78], // Annapurna Ghat / Silchar
      [24.84, 92.8], // Sadarghat / Dudpatil
      [24.9, 92.58], // Badarpurghat (Karimganj)
    ],
  },
  {
    name: "Beki & Manas",
    state: "Assam",
    waypoints: [
      [26.78, 90.98], // Mathanguri / Manas National Park
      [26.5, 90.72], // Manas NH Crossing (Bijni)
      [26.48, 90.93], // Beki Road Bridge (Barpeta)
      [26.25, 91.01], // Barpeta Lower Reach
    ],
  },
  {
    name: "Jia Bhoreli",
    state: "Assam",
    waypoints: [
      [26.85, 92.95], // Bhalukpong Border
      [26.68, 92.85], // Tezpur Outer (Chowkighat)
      [26.63, 92.84], // Brahmaputra confluence
    ],
  },
  {
    name: "Gadadhar, Tipkai & Sonkosh",
    state: "Assam",
    waypoints: [
      [26.32, 90.13], // Sapatgram (Sonkosh)
      [26.26, 90.45], // Chapar (Champamati)
      [26.23, 90.23], // Bilasipara (Tipkai)
      [26.1, 89.84], // Golakganj (Gadadhar)
      [26.08, 89.96], // Gauripur Raj Ghat
    ],
  },
];

/** Great-circle distance in km (haversine formula) */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/** Compass bearing in degrees from point 1 to point 2 (0 = north, 90 = east) */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(brng / 45) % 8;
  return directions[index];
}

/**
 * Calculates the shortest perpendicular distance in kilometers from a point (pLat, pLng)
 * to a line segment defined by (aLat, aLng) and (bLat, bLng).
 */
function distanceToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  // Over a few km the earth is flat enough: treat lat/lng as x/y in km (longitude shrunk by
  // cos(latitude)) relative to point A
  const degToKmLat = 111.0;
  const degToKmLng = 111.0 * Math.cos((aLat * Math.PI) / 180);

  const px = (pLng - aLng) * degToKmLng;
  const py = (pLat - aLat) * degToKmLat;

  const bx = (bLng - aLng) * degToKmLng;
  const by = (bLat - aLat) * degToKmLat;

  const segmentLenSq = bx * bx + by * by;
  if (segmentLenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  // Where the perpendicular from the point meets the segment, clamped to the segment's ends (0..1)
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segmentLenSq));
  const projX = t * bx;
  const projY = t * by;

  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** The nearest river in MAJOR_RIVER_TRAJECTORIES and the distance to its nearest segment, in km */
function findNearestRiverCorridor(
  lat: number,
  lng: number
): {
  riverName: string;
  distanceKm: number;
} {
  let closestRiver = "Ganga";
  let minDistanceKm = Infinity;

  MAJOR_RIVER_TRAJECTORIES.forEach((river) => {
    for (let i = 0; i < river.waypoints.length - 1; i++) {
      const [aLat, aLng] = river.waypoints[i];
      const [bLat, bLng] = river.waypoints[i + 1];
      const dist = distanceToSegmentKm(lat, lng, aLat, aLng, bLat, bLng);
      if (dist < minDistanceKm) {
        minDistanceKm = dist;
        closestRiver = river.name;
      }
    }
  });

  return {
    riverName: closestRiver,
    distanceKm: Math.max(0.1, Math.round(minDistanceKm * 10) / 10),
  };
}

// Rough outlines of the two pilot states as [lat, lng] points, accurate to about 15–20 km.
// They replace rectangles that also took in Nepal, Bhutan, Bangladesh, Meghalaya, Jharkhand and
// eastern UP, so a tap there was labelled Bihar or Assam. Good enough to name the state; not a
// legal boundary.
const BIHAR_OUTLINE: Array<[number, number]> = [
  [27.52, 83.88], // Valmikinagar, north-west corner
  [27.02, 84.6],
  [26.98, 84.85], // Raxaul
  [26.75, 85.5],
  [26.6, 86.14], // Jaynagar
  [26.57, 86.95], // Birpur, by the Kosi barrage
  [26.4, 87.26], // Jogbani
  [26.45, 88.0], // Galgalia
  [26.3, 88.2], // Kishanganj, east corner
  [25.85, 88.1],
  [25.5, 87.9],
  [25.2, 87.8],
  [25.0, 87.35],
  [24.95, 87.0],
  [24.6, 86.4],
  [24.5, 86.2], // Jamui
  [24.3, 85.4],
  [24.3, 84.0],
  [24.5, 83.35], // Kaimur, south-west corner
  [25.0, 83.45],
  [25.5, 83.8], // Chausa, where the Karmanasa meets the Ganga
  [25.57, 83.98], // Buxar, then along the Ganga (UP's Ballia lies to the north)
  [25.62, 84.3],
  [25.72, 84.65], // Ganga–Ghaghra confluence, then up the Ghaghra
  [25.8, 84.55],
  [25.9, 84.3],
  [26.08, 84.05], // Darauli
  [26.2, 84.0],
  [26.45, 84.05],
  [26.9, 84.0],
  [27.3, 83.9],
];

// Assam in two parts: the Brahmaputra valley with the hill districts, and the Barak valley
const ASSAM_OUTLINES: Array<Array<[number, number]>> = [
  [
    [26.5, 89.7], // north-west, near the West Bengal border
    [26.8, 90.2],
    [26.75, 91.0],
    [26.85, 92.0], // Bhutan / Arunachal foothills
    [27.2, 93.5],
    [27.6, 94.5],
    [27.9, 95.5],
    [27.9, 96.0], // north-east tip
    [27.3, 96.0],
    [27.0, 95.6],
    [26.6, 94.9],
    [26.5, 94.5], // Nagaland border
    [26.0, 93.8],
    [25.6, 93.5],
    [25.0, 93.2], // Dima Hasao
    [25.3, 92.8],
    [25.9, 92.3],
    [26.0, 91.5], // Meghalaya border, south of Guwahati
    [25.95, 90.6],
    [25.8, 89.85], // Dhubri, Bangladesh border
  ],
  [
    [25.0, 92.3],
    [25.0, 93.2],
    [24.4, 93.1],
    [24.15, 92.6],
    [24.1, 92.25],
    [24.6, 92.15],
    [24.9, 92.2],
  ],
];

/** Ray-casting point-in-polygon test on [lat, lng] outlines */
function isInsideOutline(lat: number, lng: number, outline: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [latI, lngI] = outline[i];
    const [latJ, lngJ] = outline[j];
    const crosses =
      latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Describes a tapped point: nearest river and gauge, how close it is to the river, and whether
 * it falls inside the area Nadi-Gati covers.
 */
export function analyzeLocationHydrology(lat: number, lng: number): ClickedLocationAnalysis {
  const isBihar = isInsideOutline(lat, lng, BIHAR_OUTLINE);
  const isAssam = !isBihar && ASSAM_OUTLINES.some((outline) => isInsideOutline(lat, lng, outline));

  let district = PILOT_DISTRICTS_DATA[0];
  let minDistrictKm = Infinity;
  for (const candidate of PILOT_DISTRICTS_DATA) {
    const km = calculateDistanceKm(lat, lng, candidate.latitude, candidate.longitude);
    if (km < minDistrictKm) {
      minDistrictKm = km;
      district = candidate;
    }
  }

  const { riverName, distanceKm: distanceToRiverKm } = findNearestRiverCorridor(lat, lng);
  const proximity: RiverProximity =
    distanceToRiverKm <= 2 ? "riverside" : distanceToRiverKm <= 8 ? "floodplain" : "further";

  const nearest = Object.values(PILOT_GAUGE_STATIONS_DATA)
    .map((station) => ({
      station,
      km: calculateDistanceKm(lat, lng, station.latitude, station.longitude),
    }))
    .sort((a, b) => a.km - b.km)[0];
  const station = nearest.station;

  const isCovered = (isBihar || isAssam) && nearest.km <= COVERAGE_RADIUS_KM;
  const stationSeverity = calculateStationSeverity(
    station.latestReading.value,
    station.warningLevel,
    station.dangerLevel
  );

  const advice: string[] = [];
  if (isCovered) {
    if (stationSeverity.level === "danger") {
      advice.push(
        "The nearest gauge is above its danger mark. Keep away from the riverbank, embankments and low roads, and follow your district administration."
      );
    } else if (stationSeverity.level === "watch") {
      advice.push(
        "The nearest gauge is above its warning mark. Keep an eye on the river and on official advisories."
      );
    } else {
      advice.push(
        "The nearest gauge is below its warning mark. Levels can change quickly in the monsoon, so check again before you travel."
      );
    }
    if (proximity === "further") {
      advice.push(
        `This spot is about ${Math.round(distanceToRiverKm)} km from the ${riverName}, so river flooding is less likely here, but heavy rain can still cause waterlogging.`
      );
    }
  }

  return {
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lng * 10000) / 10000,
    isCovered,
    state: isBihar ? "Bihar" : isAssam ? "Assam" : null,
    district,
    riverName,
    distanceToRiverKm,
    proximity,
    nearestStation: station,
    distanceToNearestStationKm: nearest.km,
    bearingToNearestStation: calculateBearing(lat, lng, station.latitude, station.longitude),
    stationSeverity,
    differenceToDangerM:
      Math.round((station.latestReading.value - station.dangerLevel) * 100) / 100,
    advice,
    districtHelplines: district.helplineNumbers,
  };
}
