"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard support for the panels that open over a map (gauge card, tapped-spot panel). They
 * don't block the page, so they aren't modal dialogs, but keyboard users still need to land in
 * them, close them with Escape, and get back to where they were.
 *
 * `openKey` changes whenever the panel shows something new (another gauge or spot), which moves
 * focus into the panel again.
 */
export function useMapPanelFocus<T extends HTMLElement>(openKey: string, onClose: () => void) {
  const panelRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Remember what had focus before the panel first opened, and give it back on close
  useEffect(() => {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement ? active : null;
    return () => {
      const target = returnFocusRef.current;
      if (target && target.isConnected && target !== document.body) {
        target.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [openKey]);

  useEffect(() => {
    // Capture phase, and mark the event handled, so one Escape closes the panel before it
    // also exits the full-screen map underneath
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return panelRef;
}
