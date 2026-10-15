"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("inert") && el.getClientRects().length > 0
  );
}

interface FocusTrapOptions {
  /** Called on Escape. Leave out to ignore Escape. */
  onEscape?: () => void;
  /** Element to focus when the trap opens. Defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Stop the page behind from scrolling while open. Defaults to true. */
  lockScroll?: boolean;
}

/**
 * Keeps keyboard focus inside a dialog or menu while it is open, the way a modal should behave:
 * Tab and Shift+Tab cycle within it, Escape closes it, the page behind doesn't scroll, and focus
 * goes back to whatever opened it when it closes. Without this, keyboard and screen-reader users
 * end up tabbing through the hidden page behind the dialog.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  { onEscape, initialFocusRef, lockScroll = true }: FocusTrapOptions = {}
) {
  // Keep the latest callback without re-running the effect (which would steal focus again)
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;

    const opener = document.activeElement as HTMLElement | null;

    // Wait a frame so the dialog is rendered (and any entrance animation has started)
    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const target = initialFocusRef?.current ?? focusableIn(container)[0] ?? container;
      target.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === "Escape" && onEscapeRef.current) {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (e.key !== "Tab") return;
      const items = focusableIn(container);
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (e.shiftKey && (current === first || !container.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !container.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      // Return focus to the button that opened the dialog, if it is still on the page
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [active, containerRef, initialFocusRef, lockScroll]);
}
