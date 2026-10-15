import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * The website reads and writes a named Firestore database (firestoreDatabaseId in
 * firebase-applet-config.json), not "(default)". Every function must use the same one, or its
 * writes never reach the site and its triggers never fire. Override with FIRESTORE_DATABASE_ID.
 *
 * The "ai-studio-…" name comes from the tool the project was first created with. It is the real
 * ID of the production database, so it must stay as it is.
 */
export const APP_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || "ai-studio-nadigati-00af5113-69fd-45e4-b0e3-4641377d4458";

export function appDb(): Firestore {
  return getFirestore(APP_DATABASE_ID);
}
