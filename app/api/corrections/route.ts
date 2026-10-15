import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { retryAfterSeconds } from "@/lib/request-guards";

export const dynamic = "force-dynamic";

// Receives messages from the contact page. They are saved with the Admin SDK because the
// database rules don't let browsers write correction_requests directly; the daily
// purgeExpiredData function deletes them after 180 days, since they can hold a name and email.

// Target reply times by topic. The contact page shows the same numbers, so keep them in step.
const REPLY_HOURS: Record<string, number> = {
  telemetry_discrepancy: 4,
  citizen_report_disputed: 4,
  privacy_removal: 4,
  source_attribution: 24,
  agency_official_inquiry: 24,
  licensing_legal: 48,
  other: 48,
};

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const waitSeconds = retryAfterSeconds(req);
  if (waitSeconds > 0) {
    return NextResponse.json(
      { success: false, error: "Too many messages. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(waitSeconds) } }
    );
  }

  // Only JSON. A plain HTML form on another site can post text/plain without a CORS check;
  // insisting on application/json means a cross-site page can't submit messages for a visitor.
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { success: false, error: "Send the message as JSON." },
      { status: 415 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("We couldn't read your message. Please try again.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("We couldn't read your message. Please try again.");
  }

  try {
    const { name, email, issueType, targetEntity, referenceUrl, description } = body as Record<
      string,
      unknown
    >;

    // Object.hasOwn: a plain lookup also matched inherited keys such as "constructor"
    const replyHours =
      typeof issueType === "string" && Object.hasOwn(REPLY_HOURS, issueType)
        ? REPLY_HOURS[issueType]
        : undefined;
    if (!replyHours) {
      return NextResponse.json(
        { success: false, error: "Please choose what your message is about." },
        { status: 400 }
      );
    }

    if (typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Please describe the problem in at least 10 characters." },
        { status: 400 }
      );
    }

    // Email is optional: people only give one if they want a reply
    const contactEmail = optionalText(email, 120);
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "That email address doesn't look right. Check it, or leave it blank.",
        },
        { status: 400 }
      );
    }

    // Enough randomness that two messages in the same millisecond can't share an ID
    const ticketId = `corr-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    // Firestore rejects undefined values, so optional fields are only added when present
    const optionalFields = {
      name: optionalText(name, 100),
      email: contactEmail,
      targetEntity: optionalText(targetEntity, 120),
      referenceUrl: optionalText(referenceUrl, 300),
    };
    const correctionData = {
      id: ticketId,
      issueType,
      description: description.trim().slice(0, 2000),
      status: "open",
      createdAt: now,
      updatedAt: now,
      ...Object.fromEntries(
        Object.entries(optionalFields).filter(([, value]) => value !== undefined)
      ),
    };

    // A message we failed to save must not be reported as received. create() fails rather than
    // overwriting if the ID already exists.
    await adminDb.collection("correction_requests").doc(ticketId).create(correctionData);

    return NextResponse.json({
      success: true,
      ticketId,
      replyHours,
      hasEmail: Boolean(contactEmail),
    });
  } catch (err: unknown) {
    console.error("[api/corrections] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "We couldn't save your message. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
