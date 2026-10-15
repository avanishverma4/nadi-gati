"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import { WifiOff, RotateCcw, AlertTriangle } from "lucide-react";

interface OfflineContextType {
  isOffline: boolean;
  /** When the site last had a connection, so the pages on screen date from then */
  lastOnlineAt: number | null;
  formattedCachedTime: string;
}

const OfflineContext = createContext<OfflineContextType>({
  isOffline: false,
  lastOnlineAt: null,
  formattedCachedTime: "",
});

function useOfflineStatus() {
  return useContext(OfflineContext);
}

const LAST_ONLINE_STORAGE_KEY = "nadi_gati_last_online_ts";
const emptySubscribe = () => () => {};

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// "Last online" lives in localStorage so it survives reloads; listeners re-render on updates
const lastOnlineListeners = new Set<() => void>();

function subscribeToLastOnline(onChange: () => void) {
  lastOnlineListeners.add(onChange);
  return () => {
    lastOnlineListeners.delete(onChange);
  };
}

function readLastOnline(): string | null {
  try {
    return localStorage.getItem(LAST_ONLINE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function recordOnlineNow() {
  try {
    localStorage.setItem(LAST_ONLINE_STORAGE_KEY, Date.now().toString());
  } catch {
    // localStorage may fail in private mode
  }
  lastOnlineListeners.forEach((listener) => listener());
}

/** "10:57 am" today, otherwise "12 Oct, 10:57 am", so an old copy is never mistaken for today's */
function formatLastOnline(timestamp: number | null): string {
  if (!timestamp || !Number.isFinite(timestamp)) return "your last visit";
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (date.toDateString() === new Date().toDateString()) return time;
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

type RetryState = "idle" | "checking" | "still-offline" | "back-online";

export function OfflineStatusProvider({ children }: { children: React.ReactNode }) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Read connectivity through useSyncExternalStore so the server snapshot ("online") is used
  // during hydration. (Node 21+ defines a global `navigator` without `onLine`, so checking it
  // in a state initializer made the server believe it was offline and broke hydration.)
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true
  );
  const isOffline = !isOnline;

  const storedLastOnline = useSyncExternalStore(subscribeToLastOnline, readLastOnline, () => null);
  const lastOnlineAt = storedLastOnline ? parseInt(storedLastOnline, 10) : null;

  // The time shown while offline is when the pages were last loaded with a connection: on every
  // page load while online, and whenever the connection comes back. (It used to be the time of
  // the very first visit, so someone offline weeks later was told their data was from "10:15 AM".)
  useEffect(() => {
    if (navigator.onLine) recordOnlineNow();
    window.addEventListener("online", recordOnlineNow);
    return () => window.removeEventListener("online", recordOnlineNow);
  }, []);

  const formattedCachedTime = formatLastOnline(lastOnlineAt);

  return (
    <OfflineContext.Provider
      value={{
        isOffline,
        lastOnlineAt,
        formattedCachedTime,
      }}
    >
      {/* Offline notice. In the normal page flow above the header, not stuck over it: the sticky
          header (with its Report button) stays usable. Cards also show their own cached badge. */}
      {isMounted && isOffline && <OfflineBanner formattedCachedTime={formattedCachedTime} />}

      {children}
    </OfflineContext.Provider>
  );
}

/**
 * The offline notice. Mounted only while offline, so the result of a connection check doesn't
 * carry over into the next time the signal drops.
 */
function OfflineBanner({ formattedCachedTime }: { formattedCachedTime: string }) {
  // Retry actually checks for a connection (the browser's offline flag can lag) and says what it
  // found, instead of silently doing nothing
  const [retryState, setRetryState] = useState<RetryState>("idle");
  const handleRetry = useCallback(async () => {
    setRetryState("checking");
    try {
      await fetch(`/manifest.webmanifest?connectivity=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      recordOnlineNow();
      setRetryState("back-online");
    } catch {
      setRetryState("still-offline");
    }
  }, []);

  return (
    <aside
      id="offline-sync-status-banner"
      role="status"
      aria-live="polite"
      className="w-full bg-tertiary-container border-b border-tertiary/40 text-on-tertiary-container px-4 py-2 font-sans text-sm flex flex-wrap items-center justify-between gap-x-3 gap-y-2 animate-in fade-in duration-200"
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-full bg-tertiary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <WifiOff className="w-3.5 h-3.5 text-tertiary" aria-hidden="true" />
        </div>
        <p className="leading-snug">
          <strong className="font-semibold">You&apos;re offline.</strong> Showing what was loaded at{" "}
          <strong className="font-semibold">{formattedCachedTime}</strong>.{" "}
          {retryState === "still-offline"
            ? "Still no connection; we'll update when it's back."
            : retryState === "back-online"
              ? "Connection found. Reload the page for new readings."
              : "New readings will load when you're back online."}
        </p>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retryState === "checking"}
        id="offline-retry-connection-btn"
        className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-full bg-tertiary text-on-tertiary hover:brightness-110 font-sans font-semibold text-sm transition-all flex-shrink-0 disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2"
      >
        <RotateCcw
          className={`w-4 h-4 ${retryState === "checking" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        <span>{retryState === "checking" ? "Checking…" : "Check connection"}</span>
      </button>
    </aside>
  );
}

/**
 * Small badge for data cards while offline, so figures loaded earlier are never taken for
 * current ones
 */
export function OfflineCachedBadge() {
  const { isOffline, formattedCachedTime } = useOfflineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="note"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container border border-tertiary/30 text-on-tertiary-container font-sans text-xs font-medium"
      title="You're offline: this shows what was loaded earlier"
    >
      <AlertTriangle className="w-3 h-3 text-tertiary flex-shrink-0" aria-hidden="true" />
      <span>showing cached data as of {formattedCachedTime}</span>
    </div>
  );
}
