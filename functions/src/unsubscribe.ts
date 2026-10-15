import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { appDb } from "./firestore";

interface UnsubscribeRequest {
  subscriptionId: string;
  unsubscribeToken: string;
}

/**
 * Callable function behind every "stop alerts" link and button. Browsers can't delete
 * alertSubscriptions themselves (firestore.rules forbids it), so this checks the subscription's
 * random unsubscribeToken and deletes the document with the Admin SDK.
 *
 * "not-found" is kept separate from "permission-denied": the website treats not-found as
 * "already unsubscribed" and shows success.
 */
export const unsubscribeAlert = onCall<UnsubscribeRequest>(async (request) => {
  const { subscriptionId, unsubscribeToken } = request.data || {};

  if (!subscriptionId || typeof subscriptionId !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid subscriptionId parameter");
  }

  if (!unsubscribeToken || typeof unsubscribeToken !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid unsubscribeToken parameter");
  }

  const db = appDb();
  const subRef = db.collection("alertSubscriptions").doc(subscriptionId);

  try {
    const docSnap = await subRef.get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "Alert subscription does not exist or has already been removed");
    }

    const data = docSnap.data();
    if (!data || data.unsubscribeToken !== unsubscribeToken) {
      logger.warn(`Failed unsubscribe attempt for ${subscriptionId}: Invalid token provided`);
      throw new HttpsError("permission-denied", "Invalid unsubscribe token");
    }

    await subRef.delete();
    logger.info(`Successfully unsubscribed alert subscription: ${subscriptionId}`);

    return {
      success: true,
      message: "Successfully unsubscribed from emergency flood alerts.",
      subscriptionId,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error(`Error deleting alert subscription ${subscriptionId}:`, error);
    throw new HttpsError("internal", "An unexpected error occurred while processing unsubscription.");
  }
});
