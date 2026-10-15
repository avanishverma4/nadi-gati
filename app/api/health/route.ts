import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Without credentials the Admin SDK can spend 10+ seconds retrying. A health check that hangs is
// worse than one that says "degraded" quickly.
const CHECK_TIMEOUT_MS = 4000;

// Open-Meteo ingestion runs every 30 minutes; data older than this means the pipeline has stopped
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Public health check: says whether the database is reachable and whether ingested river data is
// fresh. Details such as error messages and project or database IDs go to the server log, never
// to the response.
export async function GET() {
  let connected = false;
  let latestFlowAgeMinutes: number | null = null;

  try {
    // One read: the most recently ingested river flow. It proves the database is reachable and
    // shows whether the scheduled ingestion is still running.
    const snapshot = await withTimeout(
      adminDb.collection("gaugeStations").orderBy("latestFlow.recordedAt", "desc").limit(1).get(),
      CHECK_TIMEOUT_MS
    );
    connected = true;
    const recordedAt = snapshot.docs[0]?.get("latestFlow.recordedAt");
    if (recordedAt && typeof recordedAt.toMillis === "function") {
      latestFlowAgeMinutes = Math.round((Date.now() - recordedAt.toMillis()) / 60000);
    }
  } catch (err) {
    console.error("[api/health] Firestore check failed:", err);
  }

  const dataFresh = latestFlowAgeMinutes !== null && latestFlowAgeMinutes * 60000 <= STALE_AFTER_MS;
  const status = !connected ? "degraded" : dataFresh ? "ok" : "stale";

  return NextResponse.json(
    {
      status,
      database: connected ? "reachable" : "unreachable",
      latestRiverDataAgeMinutes: latestFlowAgeMinutes,
      timestamp: new Date().toISOString(),
    },
    {
      // Monitoring must see the current state, never a cached answer
      status: connected ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
