/**
 * Flood alerts are switched off until a Cloud Function actually sends them. Subscribing used to
 * succeed and say "Alerts are on" even though nothing was ever delivered, so people could have
 * relied on warnings that never came.
 *
 * Before setting this to true:
 *  - a function in functions/src must send FCM messages when a gauge crosses a subscriber's level
 *  - NEXT_PUBLIC_FIREBASE_VAPID_KEY must be set, so the browser gets a real push token
 */
export const ALERTS_ENABLED = false;
