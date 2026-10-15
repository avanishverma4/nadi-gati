# Nadi-Gati (नदी-गति)

> **An open-source, community-accessible flood reporting and river hydrology monitoring platform for India.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.4-black)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Storage%20%7C%20Functions%20%7C%20FCM-orange)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

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
- **SDK Separation**:
  - **Firebase Admin SDK** (`lib/firebase-admin.ts`): Utilized strictly in server-side Next.js API route handlers (`/app/api/*`) and Cloud Functions with administrative authority.
  - **Firebase Client SDK** (`lib/firebase-client.ts`): Minimal, browser-scoped footprint: Firestore and Storage, with Functions and Messaging loaded on demand. No Auth bundle.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Java (JRE)**: v21 or higher (required for Firebase Local Emulator Suite)
- **npm** or **bun**

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure:
```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID="gen-lang-client-0050238545"
NEXT_PUBLIC_FIREBASE_DATABASE_ID="ai-studio-cd3bfc6c-af8a-4bc1-b36a-ec8975179759"
```

### 3. Local Development

Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Running the Local Firebase Emulator Suite

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

### Deploying Cloud Functions

Functions run in **asia-south1 (Mumbai)**, the same region as the Firestore database
(`functions/src/options.ts`). Set the secrets once, then deploy:
```bash
firebase functions:secrets:set OPENWEATHER_API_KEY
firebase functions:secrets:set DATA_GOV_IN_API_KEY
firebase functions:secrets:set SEED_TOKEN
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```
If functions were deployed earlier in us-central1, the deploy offers to delete those copies:
answer yes, or they keep running alongside the new ones.

### 5. Linting & Formatting

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

## 📄 License

Open-source under the [MIT License](LICENSE).
