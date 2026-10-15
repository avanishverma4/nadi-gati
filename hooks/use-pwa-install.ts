"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { isIOSDevice, isStandaloneDisplay } from "@/hooks/device";

// Chromium-only event (not in the standard DOM types) that lets a page offer its own install button
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const emptySubscribe = () => () => {};

/**
 * Whether Nadi-Gati can be installed to the home screen, and how. Browser checks run only on the
 * client: `isMounted` is false during server rendering and hydration, so callers render nothing
 * until it is true and the server and first client render match.
 */
export function usePWAInstall() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(
    () => typeof window !== "undefined" && isStandaloneDisplay()
  );

  const [isIOS] = useState<boolean>(() => typeof window !== "undefined" && isIOSDevice());

  // iPhones have no install event, only "Add to Home Screen" from Safari's share menu, so they can
  // always be shown the instructions unless already running from the home screen. Elsewhere,
  // installing becomes possible when beforeinstallprompt fires.
  const [canInstall, setCanInstall] = useState<boolean>(
    () => typeof window !== "undefined" && isIOSDevice() && !isStandaloneDisplay()
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Stop the browser's own mini-infobar and keep the event to show the prompt on our button
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setCanInstall(false);
        }
        // A prompt event can only be used once
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("PWA install prompt error:", err);
      }
    }
  }, [deferredPrompt]);

  return {
    isMounted,
    canInstall: canInstall && !isInstalled,
    isInstalled,
    isIOS,
    hasDeferredPrompt: !!deferredPrompt,
    installApp,
  };
}
