// Checks firestore.rules against the Firebase emulator. Run with `npm run test:rules` (needs Java 21 for
// the emulator). The "Payload N" names match the attack list in security_spec.md.
import { describe, it, before, after, beforeEach } from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  setDoc,
  getDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  GeoPoint,
} from "firebase/firestore";

const PROJECT_ID = "nadi-gati-rules-test";
let testEnv: RulesTestEnvironment;

describe("Nadi-Gati Firestore Security Rules Unit Tests", () => {
  before(async () => {
    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    const rules = fs.readFileSync(rulesPath, "utf8");

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: "127.0.0.1",
        port: 8088,
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // ==========================================
  // 1. Official Telemetry Invariant (Read-only for public, Write-blocked for client)
  // ==========================================
  describe("Official Hydrology Telemetry Collections (Read-only)", () => {
    it("Allows unauthenticated public reads on districts", async () => {
      // Setup district via admin context
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "districts/bihar_patna"), {
          name: "Patna",
          state: "Bihar",
          source: "Bihar WRD",
          sourceUrl: "https://disastermgmt.bih.nic.in",
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, "districts/bihar_patna");
      await assertSucceeds(getDoc(docRef));
    });

    it("DENIES client write to districts (Payload 4: District Defacement)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, "districts/bihar_patna");
      await assertFails(
        setDoc(docRef, {
          name: "Defaced Patna",
          helplineNumbers: [],
        })
      );
    });

    it("Allows unauthenticated public reads on gaugeStations", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "gaugeStations/station_ganga_digha"), {
          name: "Dighaghat",
          dangerLevel: 50.45,
          warningLevel: 49.45,
          source: "CWC",
          sourceUrl: "https://flood-api.open-meteo.com",
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, "gaugeStations/station_ganga_digha");
      await assertSucceeds(getDoc(docRef));
    });

    it("DENIES client write to gaugeStations (Payload 2: Station Metadata Tampering)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const docRef = doc(unauthDb, "gaugeStations/station_ganga_digha");
      await assertFails(
        setDoc(docRef, {
          dangerLevel: 20.0, // Malicious lowering of danger level
        })
      );
    });

    it("DENIES client write to gauge readings subcollection (Payload 1: Ghost Hydrology Injection)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const readingRef = doc(unauthDb, "gaugeStations/station_ganga_digha/readings/fake_reading");
      await assertFails(
        setDoc(readingRef, {
          value: 999.0,
          recordedAt: new Date().toISOString(),
        })
      );
    });

    it("Allows unauthenticated public read on reservoirs and DENIES client write (Payload 3: Reservoir Sabotage)", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "reservoirs/reservoir_chandan"), {
          name: "Chandan Dam",
          dangerLevel: 152.4,
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const resRef = doc(unauthDb, "reservoirs/reservoir_chandan");
      await assertSucceeds(getDoc(resRef));

      // Client write must fail
      await assertFails(
        setDoc(resRef, {
          dangerLevel: 100.0,
        })
      );
    });

    it("DENIES client write to rainfallReadings subcollection (Payload 5: Fake Rainfall Telemetry)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const rainRef = doc(unauthDb, "districts/bihar_patna/rainfallReadings/fake_rain");
      await assertFails(
        setDoc(rainRef, {
          value: 500,
          unit: "mm",
        })
      );
    });
  });

  // ==========================================
  // 2. Citizen Flood Reports (Anonymous submissions with geohash & initial confidence 0)
  // ==========================================
  describe("Citizen Flood Reports (/reports)", () => {
    it("ALLOWS valid report submission with confidence = 0 and serverTimestamp", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_valid_001");

      await assertSucceeds(
        setDoc(reportRef, {
          category: "embankment_breach",
          description: "Water leaking near the village ring bundh at Digha Ghat.",
          location: { latitude: 25.65, longitude: 85.12 },
          geohash: "tu7kd8",
          createdAt: serverTimestamp(),
          confidence: 0,
        })
      );
    });

    it("ALLOWS a report with a GeoPoint location, as the website sends it", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_valid_geopoint");

      await assertSucceeds(
        setDoc(reportRef, {
          category: "road_submerged",
          description: "Road under water.",
          location: new GeoPoint(25.65, 85.12),
          geohash: "tu7kd8",
          createdAt: serverTimestamp(),
          confidence: 0,
        })
      );
    });

    for (const [label, photoUrl, allowed] of [
      [
        "a report-photo download link",
        "https://firebasestorage.googleapis.com/v0/b/test-bucket.firebasestorage.app/o/report_photos%2Fphoto_1760000000000_ab12cd3?alt=media&token=1b2c3d4e-aaaa-bbbb-cccc-123456789abc",
        true,
      ],
      ["a javascript: URL", "javascript:alert(1)", false],
      ["an outside image URL", "https://tracker.example/pixel.jpg", false],
    ] as const) {
      it(`${allowed ? "ALLOWS" : "DENIES"} photoUrl set to ${label}`, async () => {
        const unauthDb = testEnv.unauthenticatedContext().firestore();
        const reportRef = doc(unauthDb, `reports/report_photo_${allowed ? "ok" : label.length}`);
        const write = setDoc(reportRef, {
          category: "waterlogging",
          description: "Photo attached.",
          location: { latitude: 25.65, longitude: 85.12 },
          geohash: "tu7kd8",
          createdAt: serverTimestamp(),
          confidence: 0,
          photoUrl,
        });
        await (allowed ? assertSucceeds(write) : assertFails(write));
      });
    }

    for (const [label, latitude, longitude] of [
      ["latitude 999", 999, 85.12],
      ["a spot outside India (London)", 51.5, -0.12],
    ] as const) {
      it(`DENIES a report located at ${label}`, async () => {
        const unauthDb = testEnv.unauthenticatedContext().firestore();
        const reportRef = doc(unauthDb, `reports/report_out_of_area_${Math.round(latitude)}`);

        await assertFails(
          setDoc(reportRef, {
            category: "waterlogging",
            description: "Out-of-area location.",
            location: { latitude, longitude },
            geohash: "tu7kd8",
            createdAt: serverTimestamp(),
            confidence: 0,
          })
        );
      });
    }

    it("DENIES report creation with spoofed confidence > 0 (Payload 6: Confidence Spoofing)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_spoofed_conf");

      await assertFails(
        setDoc(reportRef, {
          category: "river_overflow",
          description: "Self-verified overflow report bypassing corroboration system.",
          location: { latitude: 25.65, longitude: 85.12 },
          geohash: "tu7kd8",
          createdAt: serverTimestamp(),
          confidence: 1.0, // VIOLATION: Must start at 0
        })
      );
    });

    it("DENIES report creation with description exceeding 1000 characters (Payload 7: String Poisoning)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_huge_desc");

      await assertFails(
        setDoc(reportRef, {
          category: "waterlogging",
          description: "A".repeat(1005), // VIOLATION: > 1000 chars
          location: { latitude: 25.65, longitude: 85.12 },
          geohash: "tu7kd8",
          createdAt: serverTimestamp(),
          confidence: 0,
        })
      );
    });

    it("DENIES report creation with invalid geohash (Payload 8: Geohash Injection)", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_bad_hash");

      await assertFails(
        setDoc(reportRef, {
          category: "waterlogging",
          description: "Waterlogging report with malicious script in geohash.",
          location: { latitude: 25.65, longitude: 85.12 },
          geohash: "<script>alert(1)</script>", // VIOLATION: Invalid base32 chars
          createdAt: serverTimestamp(),
          confidence: 0,
        })
      );
    });

    it("DENIES client update to an existing report (Payload 9: Report Overwrite / Shadow Update)", async () => {
      // First seed a valid report
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "reports/report_existing"), {
          category: "waterlogging",
          description: "Road submerged near station.",
          location: { latitude: 25.65, longitude: 85.12 },
          geohash: "tu7kd8",
          confidence: 0.2,
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_existing");

      await assertFails(
        updateDoc(reportRef, {
          description: "Erased description",
        })
      );
    });

    it("DENIES client deletion of a report (Payload 10: Report Erasure)", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "reports/report_to_delete"), {
          category: "waterlogging",
          description: "Critical flood report",
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const reportRef = doc(unauthDb, "reports/report_to_delete");

      await assertFails(deleteDoc(reportRef));
    });
  });

  // ==========================================
  // Correction requests (server-only: written by /api/corrections via the Admin SDK)
  // ==========================================
  describe("Correction requests (/correction_requests)", () => {
    it("DENIES client creation, even with a complete request", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const ref = doc(unauthDb, "correction_requests/corr_client_001");

      await assertFails(
        setDoc(ref, {
          email: "someone@example.com",
          issueType: "data_error",
          description: "The Digha Ghat danger mark looks wrong.",
          status: "open",
          createdAt: serverTimestamp(),
        })
      );
    });
  });

  // ==========================================
  // 3. Emergency Alert Subscriptions (Create-only, zero client read/update/delete)
  // ==========================================
  describe("Alert Subscriptions (/alertSubscriptions)", () => {
    it("ALLOWS valid subscription creation with unsubscribeToken", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const subRef = doc(unauthDb, "alertSubscriptions/sub_valid_001");

      await assertSucceeds(
        setDoc(subRef, {
          channel: "fcm",
          districtId: "bihar_patna",
          severityThreshold: "danger",
          fcmToken: "fcm_token_sample_1234567890",
          unsubscribeToken: "unsub_token_secure_random_abc123xyz789",
          createdAt: serverTimestamp(),
        })
      );
    });

    it("ALLOWS a subscription with exactly the fields the website writes, including riverId", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const subRef = doc(unauthDb, "alertSubscriptions/sub_valid_river");

      await assertSucceeds(
        setDoc(subRef, {
          channel: "fcm",
          severityThreshold: "warning",
          unsubscribeToken: "unsub_token_secure_random_abc123xyz789",
          createdAt: serverTimestamp(),
          districtId: "bihar_patna",
          fcmToken: "fcm_token_sample_1234567890",
          riverId: "station_ganga_dighaghat",
        })
      );
    });

    it("DENIES a subscription carrying extra fields such as a phone number", async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const subRef = doc(unauthDb, "alertSubscriptions/sub_extra_field");

      await assertFails(
        setDoc(subRef, {
          channel: "fcm",
          severityThreshold: "danger",
          unsubscribeToken: "unsub_token_secure_random_abc123xyz789",
          createdAt: serverTimestamp(),
          districtId: "bihar_patna",
          phone: "+919999999999",
        })
      );
    });

    it("DENIES client read on alert subscriptions (Payload 11: Token Scraping / PII Harvest)", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "alertSubscriptions/sub_secret"), {
          channel: "fcm",
          fcmToken: "secret_fcm_token",
          unsubscribeToken: "token_1234567890123456",
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const subRef = doc(unauthDb, "alertSubscriptions/sub_secret");

      // Reading must be blocked to prevent scraping citizen tokens
      await assertFails(getDoc(subRef));
    });

    it("DENIES client deletion of alert subscription (Payload 12: Direct Subscription Deletion)", async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), "alertSubscriptions/sub_to_delete"), {
          channel: "fcm",
          fcmToken: "token_abc",
          unsubscribeToken: "token_1234567890123456",
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const subRef = doc(unauthDb, "alertSubscriptions/sub_to_delete");

      // Must fail; unsubscription can only be done via callable Cloud Function
      await assertFails(deleteDoc(subRef));
    });
  });
});
