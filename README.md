# Nadi-Gati (नदी-गति)

> **An open-source, community-accessible flood reporting and river hydrology monitoring platform for India.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.4-black)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Storage%20%7C%20Functions%20%7C%20FCM-orange)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

Nadi-Gati ("river movement" in Hindi) puts river levels, flood thresholds and eyewitness flood
reports for flood-prone districts of India on one simple, fast page. It is built for people
living along rivers, local volunteers and journalists who need to know quickly whether the river
near them is rising, how close it is to its danger mark, and who to call. Every number carries
its source and the time it was recorded, so readers can always check it against the official
publisher.

## ✨ What it does

- **River gauge levels against official marks**: each gauge shows its latest level next to the
  Central Water Commission (CWC) warning and danger marks and the highest flood level on record,
  with a plain-language status (Normal, Watch, Danger) that never relies on colour alone.
- **District pages**: the headline gauge, every gauge in the district, modelled river flow and
  rainfall, recent community reports and the district's emergency helplines.
- **River level history**: a chart of recent readings for each gauge.
- **Ghats**: gauges people know by a riverside landmark, listed on their own page.
- **Flood map**: all pilot districts and gauges on one map. Tap any spot to see the nearest
  river and gauge, ground height and modelled flow, or a clear "outside our coverage" message.
- **Anonymous flood reports**: anyone can report flooding with a pin, a short description and an
  optional photo. No sign-in, and the location is coarsened before it leaves the phone.
- **Report corroboration**: each new report is checked against other recent reports nearby and
  labelled "Unconfirmed", "Partly backed" or "Backed by other reports".
- **Works on weak connections**: installable as an app (PWA), with offline caching and a banner
  that says when you are viewing saved data.
- **Accessible**: keyboard navigation, focus management, skip links, WCAG AA
  contrast checks, and light and dark themes.

## 🗺️ Coverage (pilot)

The pilot covers **24 districts in Bihar (16) and Assam (8)**, with **112 river gauges on 42
rivers** and **2 reservoirs**, across five river basins: Ganges, Brahmaputra, Barak, Gandak &
Ghaghra, and Kosi & Mahananda. Districts, gauges and their thresholds are defined in
`lib/hydrology-data.ts` (website) and `functions/src/seedPilotData.ts` (Cloud Functions).

## 📡 Data sources

| Source | What Nadi-Gati uses it for | How |
| --- | --- | --- |
| Central Water Commission (CWC) | Warning and danger marks, highest flood levels, official bulletins | Cited and linked, never scraped (its site asks automated tools not to collect pages) |
| Open-Meteo & GloFAS | Modelled river flow and estimated rainfall | Fetched every 30 minutes |
| OpenWeatherMap | Recent hourly rainfall per district | Fetched hourly (API key required) |
| data.gov.in | River water levels (Open Government Data, GODL licence) | Fetched every 6 hours (API key required) |
| State disaster management authorities | Helplines and official advisories | Cited and linked |
| OpenStreetMap / Nominatim | Map tiles and place names | Rate-limited and cached |
| People on the ground | Flood reports and photos | Submitted anonymously, then corroborated |

Before polling any outside website, the ingestion functions check an allow-list built from each
source's robots.txt and terms (`functions/src/compliance.ts`). The full list, with licences, is
on the site at `/about/sources`.

> **Sample data:** until the ingestion functions have run against your Firebase project, pages
> show built-in illustrative readings labelled **"Sample data, pilot preview"** and dated
> 20 Aug 2026. They are replaced automatically as soon as live readings arrive in Firestore.

---

## ⚠️ Important Legal & Operational Disclaimer

1. **Non-Affiliation**: **Nadi-Gati is an independent, open-source initiative and is NOT affiliated with, endorsed by, or representing the Government of India, Central Water Commission (CWC), National Disaster Management Authority (NDMA), or any State Disaster Management Authority (SDMA).**
2. **No Predictive Modeling or Forecasting**: **This platform DOES NOT forecast or predict floods, cyclones, or weather events.** It exclusively aggregates, structures, and visualizes river gauge levels, flood bulletins, and incident reports already published by official government agencies (such as CWC, IMD, district administrations) and verified community eyewitnesses on the ground.
3. **Emergency Situations**: For life-threatening emergencies, evacuation orders, or official disaster instructions, always defer directly to official local district emergency operation centers, NDRF, or toll-free national emergency helplines (`112` / `1070` / `1078`).

---

## 🌊 Architecture & Design Decisions

- **Framework**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Authentication**: **Deliberately Unused**. Consistent with emergency and open-data utility architectures, Nadi-Gati provides open access without requiring user sign-in, authentication paywalls, or personal data collection. Firebase Authentication is provisioned in the backend project for parity but intentionally left inactive in the user application.
- **Backend Persistence**: Firebase Firestore with strict declarative security rules (`firestore.rules`) and blueprint specification (`firebase-blueprint.json`).
- **Storage**: Firebase Cloud Storage for observational report attachments and hydrological gauge imagery with strict mime-type validation (`storage.rules`).
- **Cloud Functions (2nd Gen)**: Firebase Functions 2nd gen (`functions/src/index.ts`) for scheduled data ingestion (Open-Meteo, OpenWeatherMap, data.gov.in), report corroboration, data retention and unsubscribe handling.
- **Cloud Messaging (FCM)**: Push-token plumbing is in place, but flood alerts stay switched off (`lib/features.ts`) until a function actually sends them.
- **Privacy by design**: report coordinates are rounded to about 100 m, photos are resized and
  stripped of metadata in the browser (`lib/report-privacy.ts`), and a daily job deletes personal
  data once it is no longer needed (`functions/src/retention.ts`).
- **SDK Separation**:
  - **Firebase Admin SDK** (`lib/firebase-admin.ts`): Utilized strictly in server-side Next.js API route handlers (`/app/api/*`) and Cloud Functions with administrative authority.
  - **Firebase Client SDK** (`lib/firebase-client.ts`): Minimal, browser-scoped footprint: Firestore and Storage, with Functions and Messaging loaded on demand. No Auth bundle.

### Cloud Functions

All functions run in `asia-south1` (Mumbai) and are exported from `functions/src/index.ts`.

| Function | Trigger | What it does |
| --- | --- | --- |
| `ingestOpenMeteo` | Every 30 minutes | Modelled river flow (GloFAS) and rainfall for pilot gauges and districts |
| `ingestOpenWeather` | Every hour | Recent rainfall per district from OpenWeatherMap |
| `ingestDataGov` | Every 6 hours | River water levels from data.gov.in |
| `onReportCreated` | New report in Firestore | Scores how well the report is backed up by nearby recent reports |
| `purgeExpiredData` | Daily, 03:00 IST | Deletes expired personal and temporary data |
| `unsubscribeAlert` | Callable | Removes an alert subscription after checking its secret token |
| `seedPilotScope` | HTTPS POST (admin only) | Writes the pilot districts, gauges and reservoirs; needs the `SEED_TOKEN` secret |

---

## 🚧 Project status

Nadi-Gati is a **pilot**. Working today: district, gauge, ghat and map pages, anonymous flood
reports with corroboration, data ingestion, and the PWA. Still to come:

- **Flood alerts** are switched off (`ALERTS_ENABLED` in `lib/features.ts`) until a Cloud
  Function actually sends push notifications when a gauge crosses a subscriber's level.
- **Grievance Officer** details must be published before public launch (IT Rules, 2021); see the
  TODO in `app/about/legal/page.tsx`.
- **Retention periods** for community reports, photos and alert subscriptions are still a policy
  decision (`functions/src/retention.ts`).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v22 (the Cloud Functions runtime; the website also runs on v20+)
- **Java (JRE)**: v21 or higher (required for Firebase Local Emulator Suite)
- **npm** or **bun**

### 2. Clone and install
```bash
git clone https://github.com/avanishverma4/nadi-gati.git
cd nadi-gati
npm install            # also copies the MapLibre worker into public/
npm --prefix functions install
```

### 3. Environment Variables
The public Firebase web config is read from `firebase-applet-config.json`, so the site runs
without any `.env.local`. To point it at your own Firebase project, copy the template and fill
in what you need (every variable is documented in `.env.example`):
```bash
cp .env.example .env.local
```

Server routes such as `/api/health` and `/api/corrections` use the Firebase Admin SDK. Give them
credentials either with `gcloud auth application-default login` or by putting a service account
key on one line, in single quotes, in `FIREBASE_SERVICE_ACCOUNT_KEY`. Never commit `.env.local`.

### 4. Local Development

Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Running the Local Firebase Emulator Suite

The project is pre-configured with local Firestore, Cloud Storage, and Functions emulators:

```bash
# Start all configured Firebase emulators
npm run emulators:start

# Or start exclusively the Firestore emulator
npm run emulators:firestore
```

- **Firestore Emulator**: Port `8088` (custom port to avoid default host collisions)
- **Storage Emulator**: Port `9199`
- **Cloud Functions Emulator**: Port `5001`

To run the Firestore and Storage rules tests against the emulators (needs Java 21+):
```bash
npm run test:rules
```

### 6. Deploying Cloud Functions

Cloud Functions need the Firebase **Blaze** (pay-as-you-go) plan. Functions run in **asia-south1 (Mumbai)**, the same region as the Firestore database
(`functions/src/options.ts`). Set the secrets once, then deploy:
```bash
firebase functions:secrets:set OPENWEATHER_API_KEY
firebase functions:secrets:set DATA_GOV_IN_API_KEY
firebase functions:secrets:set SEED_TOKEN
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```
If functions were deployed earlier in us-central1, the deploy offers to delete those copies:
answer yes, or they keep running alongside the new ones.

Then load the pilot data once (the ingestion functions keep it fresh after that):
```bash
curl -X POST -H "x-seed-token: <your SEED_TOKEN>" \
  https://asia-south1-<project-id>.cloudfunctions.net/seedPilotScope
```

### 7. Linting & Formatting

Strict ESLint and Prettier configurations are maintained:
```bash
# Run strict ESLint checks
npm run lint

# Automatically fix linting issues
npm run lint:fix

# Check formatting via Prettier
npm run format:check

# Format all files
npm run format
```

---

## 📁 Repository Structure

```
.
├── app/
│   ├── api/
│   │   ├── corrections/          # Correction requests for published data
│   │   ├── geocode/              # Rate-limited, cached Nominatim lookups
│   │   ├── health/               # Health check for the Firebase Admin connection
│   │   └── hydrology/location-inspect/  # Live details for a spot tapped on the map
│   ├── about/                    # About, sources, verification, privacy, terms, legal, contact
│   ├── district/[slug]/          # District page, its alerts page and river gauge pages
│   ├── districts/  ghats/  report/  alerts/unsubscribe/
│   ├── contact/  unsubscribe/    # Redirects from old addresses
│   ├── design-system/            # Dev-only design reference (404 in production)
│   ├── sw.ts                     # Service worker source (Serwist builds public/sw.js)
│   ├── layout.tsx  page.tsx  manifest.ts  not-found.tsx  globals.css
├── components/                   # UI components, maps and gauge cards
├── hooks/                        # Shared React hooks and browser checks
├── lib/
│   ├── firebase-admin.ts         # Server-side Firebase Admin SDK
│   ├── firebase-client.ts        # Client-side Firebase SDK (auth-free)
│   ├── hydrology-data.ts         # Pilot districts, gauges, reservoirs and data types
│   ├── location-hydrology.ts     # Analysis of a tapped map location
│   ├── rate-limit-cache.ts       # Nominatim rate limiting and caching
│   ├── features.ts  site.ts  tokens.ts  ...
├── functions/                    # Firebase Cloud Functions (2nd Gen)
│   └── src/index.ts              # Exports every deployed function
├── public/                       # Icons, push-message worker, MapLibre worker (copied on install)
├── tests/                        # Firestore and Storage rules tests (emulator)
├── firebase.json                 # Firebase emulators, firestore, storage & functions setup
├── firebase-blueprint.json       # Data model description of every collection
├── firestore.rules  firestore.indexes.json  storage.rules
├── security_spec.md              # Threat list the rules tests check against
└── README.md
```

---

## 🛡️ Security Model

- `firestore.rules`: Public read for flood reports and basin gauges; client-side creates validated against strict field schemas (size limits, enum checks, coordinate bounds); updates and administrative overrides restricted to Firebase Admin SDK.
- `storage.rules`: Read allowed for report attachments; writes restricted to image MIME types under 5MB.
- No client-side tokens, session leaks, or user tracking cookies.

---

## 🤝 Contributing

Contributions are welcome, especially from people who know the rivers and districts covered.

1. Fork the repository and create a branch from `main`.
2. Run `npm run lint` and `npx tsc --noEmit` before opening a pull request; if you change
   `firestore.rules` or `storage.rules`, also run `npm run test:rules`.
3. Keep every reading traceable: new data must name its source and recording time, and new
   automated sources must be added to the allow-list in `functions/src/compliance.ts` only if
   their terms permit automated access.
4. Never present modelled or sample values as official measurements, and never add forecasting.

Good first areas: adding districts or gauges with sourced thresholds, translations, and
accessibility fixes. Found a wrong threshold or helpline? Open an issue or use the correction
form on the site (`/about/contact`).

---

## 📄 License

Open-source under the [MIT License](LICENSE).
