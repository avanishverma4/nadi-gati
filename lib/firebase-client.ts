// Firebase for the browser: Firestore, Storage, callable functions and push tokens. Visitors never
// sign in, so there is no Auth here; what they may do is decided by firestore.rules and
// storage.rules. Server code uses lib/firebase-admin.ts instead.
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import {
  getFunctions,
  Functions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import firebaseConfigData from "../firebase-applet-config.json";

// firebase-applet-config.json holds the project's public web config (these values are not
// secrets); NEXT_PUBLIC_FIREBASE_* variables override it, e.g. to point at another project.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigData.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigData.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigData.appId,
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || firebaseConfigData.firestoreDatabaseId,
};

// Reuse the existing app after a hot reload; initializing twice throws
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
} else {
  app = getApp();
}

// The app uses a named Firestore database, not "(default)"
const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const db: Firestore = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Local emulators (ports from firebase.json). Used only when NEXT_PUBLIC_CONNECT_EMULATORS=true,
// and then only on localhost or when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true, so a production build
// can never be pointed at an emulator by accident.
let isEmulatorConnected = false;
function connectClientEmulators() {
  if (isEmulatorConnected || typeof window === "undefined") return;

  const useEmulator =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (useEmulator && process.env.NEXT_PUBLIC_CONNECT_EMULATORS === "true") {
    try {
      const host = "127.0.0.1";
      connectFirestoreEmulator(db, host, 8088);
      connectStorageEmulator(storage, host, 9199);
      isEmulatorConnected = true;
      console.info("[Firebase Client] Connected to local Firebase emulators");
    } catch {
      // Already connected (e.g. after a hot reload); the SDK refuses a second connect
    }
  }
}

// Must run before the first Firestore or Storage call, so it happens as soon as this module loads.
// Only does anything when NEXT_PUBLIC_CONNECT_EMULATORS=true (see connectClientEmulators).
if (typeof window !== "undefined") {
  connectClientEmulators();
}

// Must match FUNCTIONS_REGION in functions/src/options.ts. The SDK defaults to us-central1, where
// the functions no longer run.
const FUNCTIONS_REGION = "asia-south1";

let functionsInstance: Functions | null = null;
function getFirebaseFunctions(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, FUNCTIONS_REGION);
    if (isEmulatorConnected) {
      connectFunctionsEmulator(functionsInstance, "127.0.0.1", 5001);
    }
  }
  return functionsInstance;
}

/** Stops alerts through the unsubscribeAlert function (browsers can't delete subscriptions). */
export async function callUnsubscribeAlert(
  subscriptionId: string,
  unsubscribeToken: string
): Promise<{ success: boolean; message: string; subscriptionId?: string }> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<
    { subscriptionId: string; unsubscribeToken: string },
    { success: boolean; message: string; subscriptionId?: string }
  >(functions, "unsubscribeAlert");
  const result = await callable({ subscriptionId, unsubscribeToken });
  return result.data;
}

/**
 * Asks for notification permission and returns this browser's push token. Throws with a message
 * fit to show the person when permission is refused or notifications aren't supported.
 */
export async function requestFCMToken(): Promise<{
  token: string;
  isMock?: boolean;
}> {
  if (typeof window === "undefined") {
    throw new Error("Push notifications can only be enabled in the browser.");
  }

  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Notifications are blocked. Allow them in your browser settings, then try again."
    );
  }

  try {
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();

    if (supported) {
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

      // Reuse the site's service worker if one is active. Never register another one at the "/"
      // scope: that replaced the offline-caching worker. Without one, getToken registers
      // Firebase's own worker under its separate scope, which leaves ours alone.
      let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
      if ("serviceWorker" in navigator) {
        try {
          serviceWorkerRegistration = await navigator.serviceWorker.getRegistration("/");
        } catch {
          // No registration available; getToken falls back to Firebase's own worker
        }
      }

      if (vapidKey) {
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration,
        });
        if (token) {
          return { token };
        }
      }
    }
  } catch (err) {
    console.warn("FCM getToken failed:", err);
  }

  // No real token: NEXT_PUBLIC_FIREBASE_VAPID_KEY isn't set, push isn't supported, or getToken
  // failed. Callers must check isMock; a placeholder token can never receive a notification, and
  // the alert modal refuses to save a subscription with one.
  const fallbackToken = `fcm_web_${Date.now()}_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`;
  return { token: fallbackToken, isMock: true };
}

