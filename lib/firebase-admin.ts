// Firebase Admin SDK for server code only (API routes). It bypasses the security rules, so it must
// never be imported by a client component. Browsers use lib/firebase-client.ts.
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import firebaseConfigData from "../firebase-applet-config.json";

function getAdminApp(): App {
  // Reuse the app across hot reloads and route modules; initializing twice throws
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    firebaseConfigData.projectId;

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    firebaseConfigData.storageBucket;

  // A service-account key in the environment (one line of JSON) takes priority; without one the SDK
  // uses Application Default Credentials, which is what a deployed Google Cloud host provides
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(parsed),
        projectId,
        storageBucket,
      });
    } catch (err) {
      // Say so loudly: silently falling back to default credentials made every server route fail
      // later with an unrelated-looking permission error. Never log the key itself.
      console.warn(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY is set but isn't a valid service account " +
          `JSON (${err instanceof Error ? err.name : "parse error"}). ` +
          "Falling back to Application Default Credentials."
      );
    }
  }

  return initializeApp({
    projectId,
    storageBucket,
  });
}

const adminApp = getAdminApp();

// The app uses a named Firestore database, not "(default)" (see functions/src/firestore.ts)
const databaseId =
  process.env.FIREBASE_DATABASE_ID ||
  firebaseConfigData.firestoreDatabaseId;

export const adminDb =
  databaseId && databaseId !== "(default)"
    ? getAdminFirestore(adminApp, databaseId)
    : getAdminFirestore(adminApp);
