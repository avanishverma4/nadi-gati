// Scores how well each new community report is backed up by other recent reports nearby.
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as geofire from "geofire-common";
import { ReportDocument } from "./types";
import { appDb, APP_DATABASE_ID } from "./firestore";

const PROXIMITY_RADIUS_METERS = 15000; // 15 km radius for river basin / local flooding corroboration
const TIME_WINDOW_HOURS = 24; // 24-hour window for active corroboration

// Failed runs are retried (retry: true below). Firebase keeps retrying for up to 7 days, so give up
// on events older than this rather than retrying a persistent failure all week.
const MAX_RETRY_AGE_MS = 60 * 60 * 1000;

// Reports are anonymous, so we can't tell people apart. To stop one person (or a script) backing
// up their own report by sending several from the same place, nearby reports count once per
// ~1 km cell, and a cell never backs up a report from inside itself.
const INDEPENDENCE_CELL_DEGREES = 0.01;

// Must match REPORT_GEOHASH_PRECISION in lib/report-privacy.ts
const REPORT_GEOHASH_PRECISION = 7;

// Confidence by number of independent cells that back a report up. Capped below 1: anonymous
// reports alone can never count as fully verified.
const CONFIDENCE_BY_INDEPENDENT_MATCHES = [0.2, 0.5, 0.65, 0.85];

function independenceCell(latitude: number, longitude: number): string {
  return `${Math.round(latitude / INDEPENDENCE_CELL_DEGREES)}:${Math.round(longitude / INDEPENDENCE_CELL_DEGREES)}`;
}

const MAX_CONFIDENCE = CONFIDENCE_BY_INDEPENDENT_MATCHES[CONFIDENCE_BY_INDEPENDENT_MATCHES.length - 1];

function confidenceFor(independentMatches: number): number {
  const index = Math.min(independentMatches, CONFIDENCE_BY_INDEPENDENT_MATCHES.length - 1);
  return CONFIDENCE_BY_INDEPENDENT_MATCHES[index];
}

/**
 * Runs for every new report. Finds reports within PROXIMITY_RADIUS_METERS made in the previous
 * TIME_WINDOW_HOURS (geohash range queries, then an exact distance check), sets the new report's
 * confidence from how many independent cells back it up, and links it to the reports it matched.
 * The website shows confidence as "Unconfirmed", "Partly backed" or "Backed by other reports".
 */
export const onReportCreated = onDocumentCreated(
  // Listen on the database the website writes reports to, not "(default)"
  // retry: transient errors (e.g. Firestore contention) throw below and the run is repeated. Every
  // write here is safe to repeat: values are set, links are added with arrayUnion, and confidence
  // only moves to a computed maximum.
  { document: "reports/{reportId}", database: APP_DATABASE_ID, retry: true },
  async (event) => {
    const eventAgeMs = Date.now() - new Date(event.time).getTime();
    if (eventAgeMs > MAX_RETRY_AGE_MS) {
      logger.error(`onReportCreated: giving up on report ${event.params.reportId} after ${Math.round(eventAgeMs / 60000)} min of retries`);
      return;
    }

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("onReportCreated: No document snapshot in event");
      return;
    }

    const reportId = event.params.reportId;
    const reportData = snapshot.data() as ReportDocument;
    const db = appDb();

    logger.info(`Processing corroboration for report ${reportId} (${reportData.category}) at ${reportData.geohash}`);

    if (!reportData.location || typeof reportData.location.latitude !== "number" || typeof reportData.location.longitude !== "number") {
      logger.warn(`Report ${reportId} does not contain valid GeoPoint location`);
      return;
    }

    const center: [number, number] = [reportData.location.latitude, reportData.location.longitude];

    // The geohash is sent by the browser and the rules can't check it against the location. A
    // mismatched one would hide this report from nearby searches or plant it in the wrong place,
    // so it is always recomputed here from the location itself.
    const geohash = geofire.geohashForLocation(center, REPORT_GEOHASH_PRECISION);
    const ownCell = independenceCell(center[0], center[1]);
    const bounds = geofire.geohashQueryBounds(center, PROXIMITY_RADIUS_METERS);
    // The event's own time, not the clock: a retry must look at the same 24 hours as the first run
    const nowMs = new Date(event.time).getTime();
    const minTimestamp = new Date(nowMs - TIME_WINDOW_HOURS * 60 * 60 * 1000);

    const matchedReportIds: string[] = [];

    try {
      // Query each geohash bound for nearby reports
      const promises = bounds.map((bound) => {
        return db
          .collection("reports")
          .orderBy("geohash")
          .startAt(bound[0])
          .endAt(bound[1])
          .get();
      });

      const snapshots = await Promise.all(promises);

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          if (doc.id === reportId) {
            continue; // Skip self
          }

          const other = doc.data() as ReportDocument;
          if (!other.location) continue;

          // Check exact geographic distance
          const distanceKm = geofire.distanceBetween(
            [other.location.latitude, other.location.longitude],
            center
          );

          if (distanceKm > PROXIMITY_RADIUS_METERS / 1000) {
            continue; // Outside exact radius
          }

          // Check time window (within last 24 hours). A report without a readable date is skipped
          // rather than treated as new.
          let otherDate: Date | null = null;
          if (other.createdAt instanceof Timestamp) {
            otherDate = other.createdAt.toDate();
          } else if (typeof other.createdAt === "string") {
            otherDate = new Date(other.createdAt);
          }

          if (otherDate && !Number.isNaN(otherDate.getTime()) && otherDate >= minTimestamp) {
            if (!matchedReportIds.includes(doc.id)) {
              matchedReportIds.push(doc.id);
            }
          }
        }
      }

      // Count each ~1 km cell once, and ignore reports from this report's own cell
      const independentCells = new Set<string>();
      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          if (!matchedReportIds.includes(doc.id)) continue;
          const other = doc.data() as ReportDocument;
          const cell = independenceCell(other.location.latitude, other.location.longitude);
          if (cell !== ownCell) independentCells.add(cell);
        }
      }
      const independentMatches = independentCells.size;
      const newConfidence = confidenceFor(independentMatches);
      logger.info(
        `Report ${reportId}: ${matchedReportIds.length} nearby report(s), ${independentMatches} independent area(s)`
      );

      // Update current report via Admin SDK (bypasses security rules)
      await db.collection("reports").doc(reportId).update({
        geohash,
        confidence: newConfidence,
        corroboratedBy: matchedReportIds,
        updatedAt: Timestamp.now(),
      });

      // A report from a different cell backs up the nearby ones too. Reports from the same cell
      // are linked but don't raise each other's confidence.
      const failedLinks: string[] = [];
      for (const otherId of matchedReportIds) {
        try {
          const otherRef = db.collection("reports").doc(otherId);
          await db.runTransaction(async (tx) => {
            const otherDoc = await tx.get(otherRef);
            if (!otherDoc.exists) return;
            const other = otherDoc.data() as ReportDocument;
            const sameCell =
              independenceCell(other.location.latitude, other.location.longitude) === ownCell;
            const currentConf = (otherDoc.data()?.confidence as number) || 0;
            const updatedConf = sameCell ? currentConf : Math.max(currentConf, confidenceFor(1));
            tx.update(otherRef, {
              // Also brings down any report scored 1.0 under the old rules
              confidence: Math.min(updatedConf, MAX_CONFIDENCE),
              // arrayUnion so two reports arriving together don't overwrite each other's link
              corroboratedBy: FieldValue.arrayUnion(reportId),
              updatedAt: Timestamp.now(),
            });
          });
        } catch (subErr) {
          logger.error(`Failed to update corroboration for matched report ${otherId}:`, subErr);
          failedLinks.push(otherId);
        }
      }

      if (failedLinks.length > 0) {
        // Throw so the whole run is retried; the links that did succeed are simply rewritten
        throw new Error(`Could not update ${failedLinks.length} matched report(s): ${failedLinks.join(", ")}`);
      }

      logger.info(`Updated confidence to ${newConfidence} for report ${reportId}`);
    } catch (err) {
      logger.error(`Error calculating proximity corroboration for report ${reportId}:`, err);
      // Rethrow so the trigger retries instead of leaving the report unscored
      throw err;
    }
  }
);
