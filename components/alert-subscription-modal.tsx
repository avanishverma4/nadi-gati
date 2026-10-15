"use client";

import React, { useState, useId, useRef } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  Bell,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Send,
  Smartphone,
  Info,
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, requestFCMToken, callUnsubscribeAlert } from "@/lib/firebase-client";
import { ALERTS_ENABLED } from "@/lib/features";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { isIOSDevice, isStandaloneDisplay } from "@/hooks/device";

/**
 * Dialog for following a district or gauge with browser push alerts. While ALERTS_ENABLED is
 * false (nothing sends alerts yet) it only explains that alerts are coming and gives the
 * emergency numbers. Subscriptions are anonymous: the document holds a push token and an
 * unsubscribe token, and this device keeps its own copy in localStorage so it can stop them.
 */

export type SeverityThreshold = "advisory" | "warning" | "danger";

const THRESHOLD_OPTIONS: Array<{
  id: SeverityThreshold;
  title: string;
  body: string;
  recommended?: boolean;
}> = [
  { id: "advisory", title: "Any update", body: "Every change in level, including small rises." },
  {
    id: "warning",
    title: "Watch and above",
    body: "When the river passes its warning mark.",
    recommended: true,
  },
  { id: "danger", title: "Danger only", body: "Only when the river passes its danger mark." },
];

interface AlertSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  districtId: string;
  districtName: string;
  stateName?: string;
  riverId?: string;
  riverName?: string;
}

// Errors written for people, as opposed to raw Firebase or network messages, which are shown
// only as a generic "try again"
class AlertSetupError extends Error {}

const GENERIC_SUBSCRIBE_ERROR = "We could not turn on alerts. Please try again.";
const GENERIC_UNSUBSCRIBE_ERROR = "We could not stop alerts. Please try again.";

interface LocalStoredSubscription {
  subscriptionId: string;
  unsubscribeToken: string;
  districtId: string;
  riverId?: string;
  severityThreshold: SeverityThreshold;
  createdAt: string;
}

export function AlertSubscriptionModal({
  isOpen,
  onClose,
  districtId,
  districtName,
  stateName = "Bihar",
  riverId,
  riverName,
}: AlertSubscriptionModalProps) {
  const modalTitleId = useId();
  const [severityThreshold, setSeverityThreshold] = useState<SeverityThreshold>("warning");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ unsubscribeUrl: string } | null>(null);

  // iPhones and iPads only deliver web push to sites added to the Home Screen
  const [isIOS] = useState<boolean>(() => typeof window !== "undefined" && isIOSDevice());

  const [isStandalone] = useState<boolean>(
    () => typeof window !== "undefined" && isStandaloneDisplay()
  );

  // Existing subscription for this district/river in localStorage
  const storageKey = `nadi_alert_sub_${districtId}${riverId ? `_${riverId}` : ""}`;
  const [existingSub, setExistingSub] = useState<LocalStoredSubscription | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [unsubSuccessMsg, setUnsubSuccessMsg] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Keyboard focus stays in the dialog, Escape closes it, and focus returns to the button
  // that opened it
  useFocusTrap(isOpen, dialogRef, { onEscape: onClose, initialFocusRef: closeButtonRef });

  if (!isOpen) return null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    // One subscription per device and place: a second one would overwrite the saved unsubscribe
    // token, leaving the first subscription with no way to stop it from this device
    if (existingSub) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      // 1. Ask for notification permission and get this browser's push token. Nothing else about
      // the person is collected: no name, phone number or email.
      const { token: fcmToken, isMock } = await requestFCMToken();
      // A made-up token can never receive a notification. Saying "Alerts are on" with one would
      // leave the person waiting for warnings that can't arrive.
      if (isMock) {
        throw new AlertSetupError(
          "This browser couldn't be set up for notifications. Check that notifications are allowed for this site and try again."
        );
      }

      // 2. Random unsubscribe token (64 hex characters). firestore.rules requires 16-128
      // characters from [a-zA-Z0-9_-]; whoever holds it can stop these alerts.
      const rawUuid1 = crypto.randomUUID().replace(/-/g, "");
      const rawUuid2 = crypto.randomUUID().replace(/-/g, "");
      const unsubscribeToken = `${rawUuid1}${rawUuid2}`;

      // 3. Document ID; the rules only accept [a-zA-Z0-9_-]
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // 4. Create the subscription. The rules allow create only, with exactly these fields, so
      // it can't be read back or changed from a browser afterwards.
      const subRef = doc(db, "alertSubscriptions", subscriptionId);
      const payload: Record<string, unknown> = {
        channel: "fcm",
        severityThreshold,
        unsubscribeToken,
        createdAt: serverTimestamp(),
        districtId,
        fcmToken: fcmToken.substring(0, 300),
      };

      if (riverId) {
        payload.riverId = riverId;
      }

      await setDoc(subRef, payload);

      const unsubscribeUrl = `${window.location.origin}/alerts/unsubscribe?sub=${subscriptionId}&token=${unsubscribeToken}`;

      // Keep this device's copy so it can show "Alerts are on" and stop them later
      const localSub: LocalStoredSubscription = {
        subscriptionId,
        unsubscribeToken,
        districtId,
        riverId,
        severityThreshold,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(localSub));
      setExistingSub(localSub);

      setSuccessData({ unsubscribeUrl });
    } catch (err: unknown) {
      console.error("Alert subscription failed:", err);
      setErrorMsg(err instanceof AlertSetupError ? err.message : GENERIC_SUBSCRIBE_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const forgetSubscription = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Storage blocked; the state below still updates
    }
    setExistingSub(null);
    setSuccessData(null);
    setUnsubSuccessMsg("Alerts are off for this device.");
  };

  const handleUnsubscribeExisting = async () => {
    if (!existingSub) return;
    setIsUnsubscribing(true);
    setErrorMsg(null);

    try {
      // Browsers can't delete subscriptions (the rules forbid it); the unsubscribeAlert function
      // checks the token and deletes the document
      await callUnsubscribeAlert(existingSub.subscriptionId, existingSub.unsubscribeToken);
      forgetSubscription();
    } catch (err: unknown) {
      // Already removed elsewhere (e.g. through the link in the alert): the goal is met, so
      // clear it here too instead of showing "Alerts are on" for ever
      const code = (err as { code?: string } | null)?.code;
      if (code === "functions/not-found" || code === "not-found") {
        forgetSubscription();
      } else {
        console.error("Stopping alerts failed:", err);
        setErrorMsg(GENERIC_UNSUBSCRIBE_ERROR);
      }
    } finally {
      setIsUnsubscribing(false);
    }
  };

  if (!ALERTS_ENABLED) {
    return (
      // Pages may render this outside their own MotionConfig, so honour reduced motion here too
      <MotionConfig reducedMotion="user">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-scrim/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            id="alert-subscription-dialog"
            ref={dialogRef}
            tabIndex={-1}
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-outline-variant/70 bg-surface text-on-surface shadow-elevation-3 overflow-hidden max-h-[92dvh] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-12 h-12 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2
                    id={modalTitleId}
                    className="font-sans font-bold text-xl text-on-surface tracking-tight leading-tight"
                  >
                    Flood alerts are coming soon
                  </h2>
                  <div className="font-sans text-sm text-on-surface-variant mt-0.5 truncate">
                    {riverName ? `${riverName} River · ` : ""}
                    {districtName}, {stateName}
                  </div>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                id="close-alert-modal-btn"
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex flex-col gap-4 font-sans text-sm leading-relaxed text-on-surface-variant">
              <p>
                Nadi-Gati can&apos;t send alerts yet. Please don&apos;t rely on this site to warn
                you.
              </p>
              {existingSub && (
                <p className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 text-on-surface">
                  You turned on alerts on this device earlier. They won&apos;t arrive until this
                  feature is finished.
                </p>
              )}
              <p>
                Until then, check this page for river levels, follow your district
                administration&apos;s announcements, and call{" "}
                <a
                  href="tel:1077"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  1077
                </a>{" "}
                (district control room) or{" "}
                <a href="tel:112" className="font-semibold text-error underline underline-offset-2">
                  112
                </a>{" "}
                in an emergency.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="self-end inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary text-on-primary font-semibold hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                OK
              </button>
            </div>
          </div>
        </motion.div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-scrim/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="alert-subscription-dialog"
          ref={dialogRef}
          tabIndex={-1}
          className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-outline-variant/70 bg-surface text-on-surface shadow-elevation-3 overflow-hidden max-h-[92dvh] flex flex-col"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2
                  id={modalTitleId}
                  className="font-sans font-bold text-xl text-on-surface tracking-tight leading-tight"
                >
                  Get flood alerts
                </h2>
                <div className="font-sans text-sm text-on-surface-variant mt-0.5 truncate">
                  {riverName ? `${riverName} River · ` : ""}
                  {districtName}, {stateName}
                </div>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              id="close-alert-modal-btn"
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 overflow-y-auto flex flex-col gap-4">
            {/* iPhone: alerts only work from the Home Screen */}
            {isIOS && !isStandalone && (
              <div
                id="ios-homescreen-notice"
                className="flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4"
              >
                <Smartphone
                  className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="font-sans text-sm leading-relaxed">
                  <div className="font-semibold text-on-surface">
                    On iPhone, add Nadi-Gati to your Home Screen first
                  </div>
                  <div className="text-on-surface-variant mt-0.5">
                    Tap Share, then &ldquo;Add to Home Screen&rdquo;, and open Nadi-Gati from there.
                    iPhones only deliver alerts to apps on the Home Screen.
                  </div>
                </div>
              </div>
            )}

            {/* Alerts stopped */}
            {unsubSuccessMsg && (
              <div
                id="unsub-success-banner"
                role="status"
                className="flex items-center gap-2.5 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-3 font-sans text-sm text-on-surface"
              >
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                <span>{unsubSuccessMsg}</span>
              </div>
            )}

            {/* Already getting alerts on this device */}
            {existingSub && !successData && (
              <div
                id="existing-subscription-box"
                className="rounded-2xl border border-primary/40 bg-primary-container/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-sans font-semibold text-sm text-on-surface">
                    <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                    <span>Alerts are on for {districtName}</span>
                  </div>
                  <span className="font-sans text-xs font-semibold px-2.5 py-1 rounded-full bg-surface text-on-surface border border-outline-variant/60">
                    {THRESHOLD_OPTIONS.find((option) => option.id === existingSub.severityThreshold)
                      ?.title ?? existingSub.severityThreshold}
                  </span>
                </div>
                <div className="font-sans text-sm text-on-surface-variant leading-relaxed mt-2">
                  This device is notified when the river passes the level you chose.
                </div>
                <button
                  type="button"
                  onClick={handleUnsubscribeExisting}
                  disabled={isUnsubscribing}
                  id="modal-unsubscribe-btn"
                  className="mt-4 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-error/50 text-error font-sans font-semibold text-sm hover:bg-error/10 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                >
                  {isUnsubscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Stopping…
                    </>
                  ) : (
                    "Stop alerts on this device"
                  )}
                </button>
              </div>
            )}

            {successData ? (
              /* Alerts turned on */
              <div id="subscription-success-view" className="flex flex-col gap-4">
                <div className="text-center pt-2">
                  <motion.span
                    className="w-16 h-16 rounded-full bg-success-container mx-auto flex items-center justify-center"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 16 }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
                  </motion.span>
                  <h3 className="font-sans font-bold text-2xl text-on-surface tracking-tight mt-4">
                    Alerts are on
                  </h3>
                  <div className="font-sans text-base text-on-surface-variant leading-relaxed mt-1.5">
                    This device will be notified when the river in {districtName} passes the level
                    you chose.
                  </div>
                </div>

                <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
                  <div className="font-sans font-semibold text-sm text-on-surface">
                    Your link to stop alerts
                  </div>
                  <div className="font-sans text-sm text-on-surface-variant leading-relaxed mt-1">
                    Open this link at any time to stop alerts. You can also stop them from this
                    window.
                  </div>
                  <div className="mt-3 rounded-xl border border-outline-variant/60 bg-surface p-3 font-sans text-xs text-on-surface-variant break-all select-all">
                    {successData.unsubscribeUrl}
                  </div>
                </div>

                <div className="flex items-center gap-2 font-sans text-sm text-on-surface-variant">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span>We did not ask for your name, phone number or email.</span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  id="subscription-done-btn"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Done
                </button>
              </div>
            ) : existingSub ? null : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-5">
                {/* How alerts arrive */}
                <div
                  id="channel-fcm-option"
                  className="flex items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4"
                >
                  <Smartphone className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1 font-sans text-sm leading-snug">
                    <div className="font-semibold text-on-surface">
                      Notifications on this device
                    </div>
                    <div className="text-on-surface-variant">
                      Your browser will ask for permission.
                    </div>
                  </div>
                  <span
                    id="channel-telegram-option"
                    className="inline-flex items-center gap-1.5 font-sans text-xs font-medium px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface-variant whitespace-nowrap"
                    title="Telegram alerts are coming soon"
                  >
                    <Send className="w-3 h-3" aria-hidden="true" />
                    Telegram soon
                  </span>
                </div>

                {/* When to alert */}
                <fieldset className="flex flex-col gap-2.5">
                  <legend className="font-sans font-bold text-base text-on-surface mb-2.5">
                    When should we alert you?
                  </legend>

                  {THRESHOLD_OPTIONS.map((option) => {
                    const selected = severityThreshold === option.id;
                    return (
                      <label
                        key={option.id}
                        id={`threshold-${option.id}-label`}
                        className={`relative flex items-center gap-3.5 min-h-[72px] px-4 py-3 rounded-2xl border-2 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                          selected
                            ? "border-primary bg-primary-container/30"
                            : "border-outline-variant/60 hover:border-outline hover:bg-surface-container-low"
                        }`}
                      >
                        <input
                          type="radio"
                          name="severity"
                          value={option.id}
                          checked={selected}
                          onChange={() => setSeverityThreshold(option.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected ? "border-primary" : "border-outline"
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded-full bg-primary transition-transform duration-200 ${
                              selected ? "scale-100" : "scale-0"
                            }`}
                          />
                        </span>
                        <span className="min-w-0 flex-1 font-sans leading-snug">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base text-on-surface">
                              {option.title}
                            </span>
                            {option.recommended && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-on-primary">
                                Recommended
                              </span>
                            )}
                          </span>
                          <span className="block text-sm text-on-surface-variant mt-0.5">
                            {option.body}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                {errorMsg && (
                  <div
                    id="subscription-error-msg"
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl border border-error/40 bg-error-container/40 px-4 py-3 font-sans text-sm text-on-surface"
                  >
                    <AlertTriangle
                      className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 font-sans text-sm text-on-surface-variant">
                  <Info className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span>No phone number or email needed.</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    id="cancel-alert-btn"
                    className="inline-flex items-center justify-center h-12 px-5 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm hover:bg-surface-container transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="confirm-alert-subscription-btn"
                    className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 active:brightness-95 transition-all disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Turning on…
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" aria-hidden="true" />
                        Turn on alerts
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
