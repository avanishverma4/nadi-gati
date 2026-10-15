"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { callUnsubscribeAlert } from "@/lib/firebase-client";

// Remove this device's record of the subscription. Keys are collected first: removing while
// walking localStorage by index shifts the indexes and skips entries.
function forgetLocalSubscription(subscriptionId: string) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("nadi_alert_sub_")) keys.push(key);
    }
    for (const key of keys) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || "{}");
        if (val.subscriptionId === subscriptionId) localStorage.removeItem(key);
      } catch {
        // Unreadable entry; leave it
      }
    }
  } catch {
    // Storage blocked; nothing to clean up
  }
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get("sub") || searchParams.get("id") || "";
  const unsubscribeToken = searchParams.get("token") || "";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUnsubscribe = async () => {
    if (!subscriptionId || !unsubscribeToken) {
      setErrorMsg("Invalid unsubscribe link. Missing subscription ID or security token.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    try {
      // Unsubscribing goes through a Cloud Function that checks the token: the database rules
      // don't let the browser read or delete subscriptions directly
      await callUnsubscribeAlert(subscriptionId, unsubscribeToken);

      forgetLocalSubscription(subscriptionId);
      setStatus("success");
    } catch (err: unknown) {
      // Already removed (e.g. from another device or an earlier click): the person is
      // unsubscribed either way, so say so instead of showing an error
      const code = (err as { code?: string } | null)?.code;
      if (code === "functions/not-found" || code === "not-found") {
        forgetLocalSubscription(subscriptionId);
        setStatus("success");
        return;
      }
      console.error("Failed to unsubscribe via callable function:", err);
      setErrorMsg(
        code === "functions/permission-denied" || code === "permission-denied"
          ? "This unsubscribe link isn't valid. Use the link from your most recent alert."
          : "We couldn't stop your alerts just now. Check your connection and try again."
      );
      setStatus("error");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-surface rounded-xl border border-outline-variant/80 shadow-elevation-2 space-y-5">
      {/* Header icon */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center flex-shrink-0">
          <BellOff className="w-6 h-6 text-error" />
        </div>
        <div>
          <h1 className="font-sans font-bold text-lg text-on-surface">
            Unsubscribe from Flood Alerts
          </h1>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Single-Tap Emergency Alert Opt-out
          </p>
        </div>
      </div>

      {status === "idle" && (
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            You are opting out of emergency push notifications on this device. Your device token will be permanently removed from the notification dispatch list.
          </p>

          {subscriptionId ? (
            <div className="p-3 rounded-md bg-surface-container border border-outline-variant/60 text-xs font-sans space-y-1">
              <div className="text-on-surface-variant text-xs">Subscription ID:</div>
              <div className="text-on-surface truncate font-semibold">{subscriptionId}</div>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-error-container/30 border border-error/30 text-xs text-error">
              No subscription parameters found in link.
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={!subscriptionId || !unsubscribeToken}
              id="confirm-one-tap-unsubscribe-btn"
              className="w-full py-2.5 px-4 rounded-full bg-error text-on-error font-sans text-xs font-bold shadow-elevation-1 hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BellOff className="w-4 h-4" />
              <span>Confirm Unsubscribe (Single Tap)</span>
            </button>
            <Link
              href="/districts"
              className="w-full py-2 px-4 rounded-full border border-outline text-on-surface text-center font-sans text-xs font-medium hover:bg-surface-container transition-colors"
            >
              Cancel and Return to Monitoring
            </Link>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="font-sans font-medium text-xs text-on-surface">
            Calling secure Cloud Function to remove subscription...
          </p>
          <span className="text-xs font-sans text-on-surface-variant">
            Validating unsubscribe token
          </span>
        </div>
      )}

      {status === "success" && (
        <div id="unsubscribed-success-view" className="space-y-4 py-2">
          <div className="p-4 rounded-lg bg-surface-container-high border border-primary/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-on-surface text-sm">Successfully Unsubscribed</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your device token has been deleted from the alert database. You will receive no further push notifications for this subscription.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-md bg-surface-container-low border border-outline-variant/60 text-xs text-on-surface-variant flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-secondary flex-shrink-0" />
            <span>Zero personal data retained. Push token removed by Admin SDK.</span>
          </div>

          <div className="pt-2">
            <Link
              href="/districts"
              id="return-to-districts-btn"
              className="w-full py-2.5 px-4 rounded-full bg-primary text-on-primary text-center font-sans text-xs font-semibold shadow-elevation-1 hover:brightness-110 active:brightness-95 transition-all inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to District Bulletins</span>
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div id="unsubscribe-error-view" className="space-y-4 py-2">
          <div className="p-4 rounded-lg bg-error-container/30 border border-error/40 flex items-start gap-3 text-error">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">Unsubscribe Failed</p>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleUnsubscribe}
              className="w-full py-2 px-4 rounded-full bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant hover:bg-surface-container-highest transition-colors"
            >
              Retry
            </button>
            <Link
              href="/districts"
              className="w-full py-2 px-4 rounded-full border border-outline text-on-surface text-center font-sans text-xs font-medium hover:bg-surface-container transition-colors"
            >
              Back to Monitoring
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-surface flex flex-col items-center justify-center p-4"
    >
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </main>
  );
}
