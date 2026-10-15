"use client";

import React, { useRef, useState } from "react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  Download,
  Share2,
  PlusSquare,
  X,
  Smartphone,
  Zap,
} from "lucide-react";

/**
 * Small "Install Nadi-Gati" banner. Chrome and Android use the browser's own install prompt;
 * iPhone and iPad, which have none, get step-by-step "Add to Home Screen" instructions.
 * Hidden once installed, and for 7 days after it is dismissed.
 */
export function PwaInstallPrompt() {
  const { isMounted, canInstall, isInstalled, isIOS, hasDeferredPrompt, installApp } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const dismissedUntil = localStorage.getItem("nadi_gati_install_dismissed_until");
      return !!(dismissedUntil && Date.now() < parseInt(dismissedUntil, 10));
    } catch (_e) {
      return false;
    }
  });
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(
        "nadi_gati_install_dismissed_until",
        (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
      );
    } catch (_e) {
      // Storage blocked: the banner stays hidden for this visit only
    }
  };

  if (!isMounted || isInstalled || !canInstall) {
    return null;
  }

  return (
    <>
      {/* Sits above the floating "Report a flood" button */}
      {!isDismissed && (
        <aside
          id="pwa-install-banner"
          aria-label="Install Nadi-Gati progressive web application"
          className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-24 sm:max-w-sm z-40 bg-surface-container-high border border-outline-variant/80 rounded-xl shadow-xl p-2.5 text-on-surface backdrop-blur-md animate-in fade-in duration-200 print:hidden"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm leading-tight truncate">Install Nadi-Gati</div>
              <p className="text-xs text-on-surface-variant leading-snug truncate">
                {isIOS || hasDeferredPrompt
                  ? "Offline access to river levels"
                  : "Use your browser menu → Install app"}
              </p>
            </div>
            {isIOS ? (
              <button
                type="button"
                onClick={() => setShowIOSModal(true)}
                id="open-ios-instructions-btn"
                className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-95 transition-opacity shadow-xs flex-shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>How to add</span>
              </button>
            ) : hasDeferredPrompt ? (
              <button
                type="button"
                onClick={installApp}
                id="install-pwa-action-btn"
                className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-95 transition-opacity shadow-xs flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Install</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              id="dismiss-install-banner-btn"
              className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      {showIOSModal && <IosInstallDialog onClose={() => setShowIOSModal(false)} />}
    </>
  );
}

/**
 * Step-by-step "Add to Home Screen" instructions for iPhone and iPad, where Safari has no
 * install button. A proper modal: focus stays inside, Escape closes it, and the page behind
 * doesn't scroll.
 */
function IosInstallDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useFocusTrap(true, dialogRef, { onEscape: onClose, initialFocusRef: closeButtonRef });

  const steps: React.ReactNode[] = [
    <>
      Tap the <strong className="text-on-surface font-semibold">Share</strong> button (
      <Share2 className="w-3.5 h-3.5 inline mx-1 text-primary" aria-hidden="true" />) in the Safari
      toolbar.
    </>,
    <>
      Scroll down and choose{" "}
      <strong className="text-on-surface font-semibold">&apos;Add to Home Screen&apos;</strong> (
      <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-primary" aria-hidden="true" />
      ).
    </>,
    <>
      Tap <strong className="text-on-surface font-semibold">&apos;Add&apos;</strong> in the top right
      corner.
    </>,
    <>
      Open <strong className="text-on-surface font-semibold">Nadi-Gati</strong> from your Home Screen
      to use it like an app.
    </>,
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md bg-surface rounded-3xl border border-outline-variant shadow-elevation-3 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-outline-variant/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-primary">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 id="ios-install-title" className="font-sans font-bold text-base text-on-surface">
              Add Nadi-Gati to your Home Screen
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            id="close-ios-install-modal-btn"
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close instructions"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 font-sans text-sm text-on-surface">
          <p className="text-on-surface-variant leading-relaxed">
            iPhones and iPads don&apos;t have an install button. In Safari:
          </p>

          <ol className="space-y-3 bg-surface-container rounded-2xl p-4 border border-outline-variant/40 list-none">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs flex-shrink-0"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <div className="p-3 rounded-2xl bg-surface-container-low space-y-1 text-on-surface-variant">
            <div className="flex items-center gap-1.5 font-semibold text-on-surface">
              <Zap className="w-4 h-4 text-tertiary" aria-hidden="true" />
              <span>Opens without signal</span>
            </div>
            <p>
              Pages you have already opened, including emergency numbers, stay readable when the
              signal drops.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          id="dismiss-ios-modal-btn"
          className="w-full h-12 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
