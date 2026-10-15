// Checks storage.rules against the Firebase Storage emulator. Run with `npm run test:rules` (needs
// Java 21 for the emulator).
import { describe, it, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { ref, uploadBytes, deleteObject, getBytes } from "firebase/storage";

const PROJECT_ID = "nadi-gati-qa-test-storage";

describe("Nadi-Gati Cloud Storage Security Rules Regression Suite", () => {
  let testEnv: RulesTestEnvironment;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      storage: {
        host: "127.0.0.1",
        port: 9199,
        rules: readFileSync("storage.rules", "utf8"),
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
      await testEnv.clearStorage();
    }
  });

  it("ALLOWS anonymous upload of a report photo as the website sends it", async () => {
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const photoRef = ref(unauthStorage, "report_photos/photo_1760000000000_abc123x");
    const dummyImageBuffer = Buffer.from("fake-jpg-content");

    await assertSucceeds(
      uploadBytes(photoRef, dummyImageBuffer, {
        contentType: "image/jpeg",
        customMetadata: { anonymous: "true" },
      })
    );
  });

  it("DENIES report photos that aren't JPEG, such as SVG", async () => {
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const photoRef = ref(unauthStorage, "report_photos/photo_1760000000000_svg1234");

    await assertFails(
      uploadBytes(photoRef, Buffer.from("<svg onload=alert(1)>"), {
        contentType: "image/svg+xml",
        customMetadata: { anonymous: "true" },
      })
    );
  });

  it("DENIES report photos with names the website never uses", async () => {
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const photoRef = ref(unauthStorage, "report_photos/evidence_001.jpg");

    await assertFails(
      uploadBytes(photoRef, Buffer.from("fake-jpg-content"), {
        contentType: "image/jpeg",
        customMetadata: { anonymous: "true" },
      })
    );
  });

  it("DENIES uploads to the legacy /flood_reports path", async () => {
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const legacyRef = ref(unauthStorage, "flood_reports/x/payload.svg");

    await assertFails(
      uploadBytes(legacyRef, Buffer.from("<svg onload=alert(1)>"), {
        contentType: "image/svg+xml",
      })
    );
  });

  it("ALLOWS public unauthenticated read of uploaded photo in /report_photos", async () => {
    // Seed photo via admin context
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminStorage = adminContext.storage();
      const photoRef = ref(adminStorage, "report_photos/evidence_seed.png");
      await uploadBytes(photoRef, Buffer.from("admin-seeded-image"), {
        contentType: "image/png",
      });
    });

    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const photoRef = ref(unauthStorage, "report_photos/evidence_seed.png");
    await assertSucceeds(getBytes(photoRef));
  });

  it("DENIES upload of non-image MIME type (e.g. application/pdf or text/html)", async () => {
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const badFileRef = ref(unauthStorage, "report_photos/malicious_payload.sh");

    await assertFails(
      uploadBytes(badFileRef, Buffer.from("echo 'malicious code'"), {
        contentType: "text/x-shellscript",
      })
    );
  });

  it("DENIES client overwrite / update of existing photo", async () => {
    // Seed initial photo
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminStorage = adminContext.storage();
      const photoRef = ref(adminStorage, "report_photos/locked_evidence.jpg");
      await uploadBytes(photoRef, Buffer.from("initial-evidence"), {
        contentType: "image/jpeg",
      });
    });

    // Client attempts to overwrite
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const photoRef = ref(unauthStorage, "report_photos/locked_evidence.jpg");
    await assertFails(
      uploadBytes(photoRef, Buffer.from("overwritten-evidence"), {
        contentType: "image/jpeg",
      })
    );
  });

  it("DENIES client deletion of uploaded report photo", async () => {
    // Seed initial photo
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminStorage = adminContext.storage();
      const photoRef = ref(adminStorage, "report_photos/photo_to_delete.jpg");
      await uploadBytes(photoRef, Buffer.from("evidence-data"), {
        contentType: "image/jpeg",
      });
    });

    // Client attempts to delete
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const photoRef = ref(unauthStorage, "report_photos/photo_to_delete.jpg");
    await assertFails(deleteObject(photoRef));
  });

  it("DENIES write to arbitrary unauthorized storage path", async () => {
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const unauthorizedRef = ref(unauthStorage, "internal_backups/database.dump");

    await assertFails(
      uploadBytes(unauthorizedRef, Buffer.from("fake-dump"), {
        contentType: "application/octet-stream",
      })
    );
  });
});
