// Entry point for every Cloud Function. Firebase deploys whatever this module exports.

// First, so the region applies to every function defined by the modules below
import "./options";
import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { timingSafeEqual } from "node:crypto";
import * as logger from "firebase-functions/logger";
import { logOpenActionItems } from "./compliance";
import { seedPilotHydrologyData } from "./seedPilotData";

// Must run before any function touches Firestore (they all go through appDb() in ./firestore)
initializeApp();

export { onReportCreated } from "./corroboration";
export { unsubscribeAlert } from "./unsubscribe";
export { ingestOpenMeteo } from "./ingestOpenMeteo";
export { ingestOpenWeather } from "./ingestOpenWeather";
export { ingestDataGov } from "./ingestDataGov";
export { purgeExpiredData } from "./retention";

// Secret for the seeding endpoint: `firebase functions:secrets:set SEED_TOKEN`
const SEED_TOKEN = defineSecret("SEED_TOKEN");

/**
 * Admin-only endpoint that writes the pilot districts, gauges and reservoirs. It overwrites
 * warning and danger marks, so it must never be callable by the public: it accepts only a POST
 * with header `x-seed-token` matching the SEED_TOKEN secret, and refuses everything if the
 * secret is not set.
 */
export const seedPilotScope = onRequest({ secrets: [SEED_TOKEN] }, async (req, res) => {
  const expected = SEED_TOKEN.value();
  const provided = req.get("x-seed-token") ?? "";
  const authorised =
    req.method === "POST" &&
    expected.length > 0 &&
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!authorised) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  logOpenActionItems();
  try {
    const result = await seedPilotHydrologyData();
    res.status(200).json(result);
  } catch (err: unknown) {
    logger.error("Error seeding pilot scope data:", err);
    res.status(500).json({ error: "Seeding failed. Check the function logs." });
  }
});
