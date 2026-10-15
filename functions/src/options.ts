import { setGlobalOptions } from "firebase-functions/v2";

/**
 * The Firestore database is in asia-south1 (Mumbai). Functions run in the same region so report
 * and subscriber data stays in India, Firestore triggers line up with the database, and calls
 * avoid a round trip to the US.
 *
 * Must be imported before any module that defines a function (index.ts imports it first).
 * The website's callable client (lib/firebase-client.ts) uses the same region.
 */
export const FUNCTIONS_REGION = "asia-south1";

setGlobalOptions({ region: FUNCTIONS_REGION });
