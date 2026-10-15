# Nadi-Gati security specification

How the data is protected, and why. The rules themselves are in `firestore.rules` and
`storage.rules`; the tests that check them are in `tests/` (`npm run test:rules`). The shape of
each collection is in `firebase-blueprint.json`.

## 1. Threat model

- **Visitors never sign in.** Every browser request reaches Firestore and Storage as an anonymous
  client (`request.auth == null`), so the rules alone decide what a browser can do.
- **Server code uses the Admin SDK**, which bypasses the rules: the API routes (`/api/corrections`,
  `/api/geocode`, `/api/hydrology/location-inspect`, `/api/health`) and every Cloud Function
  (ingestion, corroboration, unsubscribe, clean-up, seeding).
- **What an attacker would want:**
  - change river levels or danger marks to cause panic or false calm;
  - plant fake flood reports and make them look confirmed;
  - harvest push tokens or personal details;
  - use the site's storage or APIs for free hosting, spam or to run up costs.

## 2. Collections and who may do what

| Collection | Browser read | Browser write | Written by |
| :--- | :--- | :--- | :--- |
| `districts/{id}` | Yes | No | seed, Open-Meteo ingestion (`latestRainfallMm`) |
| `districts/{id}/rainfallReadings/{hour}` | Yes | No | Open-Meteo ingestion (24-hour totals) |
| `districts/{id}/owmRainfallReadings/{hour}` | No | No | OpenWeatherMap ingestion (1- or 3-hour) |
| `gaugeStations/{id}` | Yes | No | seed, Open-Meteo (`latestFlow`), data.gov.in (`latestReading`) |
| `gaugeStations/{id}/readings/{id}` | Yes | No | data.gov.in ingestion |
| `gaugeStations/{id}/flowReadings/{date}` | No | No | Open-Meteo ingestion |
| `reservoirs/{id}` and `readings` | Yes | No | seed |
| `reports/{id}` | Yes | **Create only**, validated | browser (report form); corroboration function updates |
| `alertSubscriptions/{id}` | No | **Create only**, validated | browser (alert modal, currently switched off) |
| `correction_requests/{id}` | No | No | `/api/corrections` (Admin SDK) |
| `external_call_cache/{hash}` | No | No | place-lookup API routes |
| anything else | No | No | n/a |

## 3. Invariants

1. **River data can't be changed from a browser.** Districts, gauge stations, reservoirs and all
   their reading subcollections are read-only to clients.
2. **Reports start unconfirmed.**
   - A report must be created with `confidence == 0` and `createdAt == request.time`.
   - Only the `onReportCreated` function changes confidence.
   - Browsers can never update or delete a report.
3. **Reports have a strict shape.** In `isValidReport`:
   - Only these fields are allowed: `category`, `description`, `location`, `geohash`, `createdAt`,
     `confidence`, `photoUrl`, `districtId`.
   - `description` is at most 1,000 characters.
   - `category` is from a fixed list.
   - `geohash` is 4–12 base-32 characters.
   - `districtId` is at most 64 characters.
4. **Reports must be in the service area.** `location` must lie within 6–38°N and 68–98°E (the
   same box the website and API routes use). This rejects values like latitude 999 and spots
   outside India.
5. **Photo links can only point at our own uploads.** `photoUrl` must be a Firebase Storage
   download URL for `report_photos/photo_<ms>_<random>`. Arbitrary URLs could track viewers or
   carry scripts.
6. **Subscriptions can't be read back.**
   - `alertSubscriptions` holds device push tokens, so it has no client read.
   - Creates must use exactly the fields the modal writes (`hasOnly`): `channel`,
     `severityThreshold`, `unsubscribeToken` (16–128 URL-safe characters), `createdAt`, `districtId`,
     `riverId` and `fcmToken`. Nothing else, so no phone numbers or emails can be stored.
   - Unsubscribing goes through the `unsubscribeAlert` callable function, which checks the token.
7. **Corrections bypass the client entirely.**
   - `correction_requests` holds names and emails. Clients have no access at all.
   - `/api/corrections` validates input, rate-limits per IP and writes with `create()`, so it can
     never overwrite.
8. **Document IDs are plain.** Report and subscription IDs are 1–128 characters of `[A-Za-z0-9_-]`.

## 4. Storage

- `report_photos/{photoId}`:
  - Public read.
  - Anonymous create only when the name matches `photo_<13 digits>_<1–16 lowercase/digits>`, the
    type is `image/jpeg`, the size is between 1 byte and 5 MB, and metadata `anonymous == "true"`.
  - No update or delete.
  - The website re-encodes every photo to JPEG (at most 2048 px) before upload, which also strips
    GPS and camera metadata. Refusing everything else stops the bucket being used as free file
    hosting and blocks SVG or HTML payloads.
- `flood_reports/**`: legacy path. It stays readable for files uploaded earlier; nothing may be
  written there.
- Everything else is closed.

## 5. Corroboration limits

`functions/src/corroboration.ts` decides how "backed up" a report looks. Reports are anonymous, so
one person could send several. To limit that:

- Only reports within 15 km and the previous 24 hours are considered.
- Matches count **once per ~1 km cell** (0.01°), and a cell never backs up a report from inside
  itself. Several reports from one spot add nothing.
- Confidence by independent cells:

  | Cells | Confidence | Shown as |
  | :--- | :--- | :--- |
  | 0 | 0.2 | Unconfirmed |
  | 1 | 0.5 | Partly backed |
  | 2 | 0.65 | Partly backed |
  | 3 or more | 0.85 | Backed by other reports |

  It is capped at 0.85: anonymous reports alone never count as fully verified.
- The geohash is recomputed from the location on the server, so a mismatched geohash can't hide a
  report or plant it elsewhere.

## 6. Retention

`purgeExpiredData` runs daily at 03:00 IST:

- It deletes `correction_requests` older than 180 days.
- It deletes `external_call_cache` entries past `expiresAt`.
- `external_call_cache` stores only a hash of the query, never the typed text. Its `expireAt`
  Timestamp lets a Firestore TTL policy delete entries too.

Retention for reports, report photos and alert subscriptions is not set yet (a policy decision).

## 7. Known gaps

- **No App Check.** Rules validate the shape of writes but can't tell a real browser from a
  script, so report creation can still be automated, within the limits above.
- **Per-instance rate limits.** The per-IP limit and the Nominatim queue live in each server
  process's memory, so with several instances each counts separately. A shared store (e.g. Redis)
  or the platform firewall is needed for a site-wide limit.
- **`X-Forwarded-For` trust.** The per-IP limit relies on the host overwriting this header.

## 8. Attack payloads covered by tests

The `Payload N` names in `tests/firestore.rules.test.ts` refer to this list.

1. **Ghost Hydrology Injection:** writing a fake reading to `gaugeStations/{id}/readings`.
2. **Station Metadata Tampering:** changing a gauge's `dangerLevel`.
3. **Reservoir Sabotage:** writing to `reservoirs` or its readings.
4. **District Defacement:** overwriting district details or helplines.
5. **Fake Rainfall Telemetry:** writing to `districts/{id}/rainfallReadings`.
6. **Confidence Spoofing:** creating a report with `confidence > 0`.
7. **String Poisoning:** a description over 1,000 characters.
8. **Geohash Injection:** an invalid or over-long geohash.
9. **Report Overwrite:** updating an existing report.
10. **Report Erasure:** deleting a report.
11. **Token Scraping:** reading `alertSubscriptions`.
12. **Direct Subscription Deletion:** deleting a subscription without the unsubscribe function.

Also covered, without numbers:

- reports outside the service area (latitude 999, London);
- `photoUrl` set to a `javascript:` or outside URL;
- extra fields on a subscription;
- client-created correction requests;
- non-JPEG, SVG or wrongly named uploads to Storage;
- any upload to the legacy path.
