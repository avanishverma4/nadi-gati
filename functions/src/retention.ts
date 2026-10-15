// Scheduled deletion of personal and temporary data, so nothing is kept longer than it is needed.
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import type { Query } from "firebase-admin/firestore";
import { appDb } from "./firestore";

// Correction requests hold the sender's name and email. Keep them long enough to answer and
// follow up, then delete them (data minimisation under the DPDP Act, 2023).
const CORRECTION_REQUEST_RETENTION_DAYS = 180;

// Firestore allows at most 500 writes per batch
const BATCH_SIZE = 400;
// Stops one run from looping for ever if deletes keep failing; the next day's run carries on
const MAX_BATCHES_PER_RUN = 50;

async function deleteMatching(label: string, query: Query): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    const snap = await query.limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = appDb().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < BATCH_SIZE) break;
  }
  logger.info(`Retention: deleted ${deleted} ${label}`);
  return deleted;
}

/**
 * Daily clean-up of personal and temporary data.
 *
 * Not handled here yet, because how long to keep them is a policy decision: community reports
 * and their photos, and alert subscriptions (device push tokens).
 */
export const purgeExpiredData = onSchedule(
  { schedule: "every day 03:00", timeZone: "Asia/Kolkata", timeoutSeconds: 540 },
  async () => {
    const db = appDb();

    // correction_requests.createdAt is an ISO string, which sorts in date order
    const correctionCutoff = new Date(
      Date.now() - CORRECTION_REQUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    await deleteMatching(
      "correction requests",
      db.collection("correction_requests").where("createdAt", "<", correctionCutoff)
    );

    // Place-lookup cache entries past their expiry (expiresAt is epoch milliseconds)
    await deleteMatching(
      "expired lookup cache entries",
      db.collection("external_call_cache").where("expiresAt", "<", Date.now())
    );
  }
);
