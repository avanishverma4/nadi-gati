"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type * as L from "leaflet";

const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Leaflet options for a map embedded in a scrolling page: no scroll-wheel zoom, and on touch
 * screens no one-finger drag, until the map is activated. Pinch-zoom still works.
 */
export function guardedMapOptions(): Pick<L.MapOptions, "scrollWheelZoom" | "dragging"> {
  return { scrollWheelZoom: false, dragging: !isCoarsePointer() };
}

/**
 * Stops an embedded map from catching the page's scroll. Scrolling down the page used to stop
 * dead whenever the pointer or a finger passed over the map. The map only takes the scroll
 * wheel and one-finger drag after it is clicked or tapped (call `activate`), or while full
 * screen, and hands them back when the person clicks or taps elsewhere on the page.
 *
 * `containerRef` is the element wrapping the map and its controls. Returns a short hint to show
 * when someone scrolls over the map before activating it.
 */
export function useMapScrollGuard(
  map: L.Map | null,
  containerRef: RefObject<HTMLElement | null>,
  isFullscreen: boolean
) {
  const [isActive, setIsActive] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const activate = useCallback(() => setIsActive(true), []);

  useEffect(() => {
    if (!map) return;
    if (isActive || isFullscreen) {
      map.scrollWheelZoom.enable();
      map.dragging.enable();
    } else {
      map.scrollWheelZoom.disable();
      if (isCoarsePointer()) map.dragging.disable();
    }
  }, [map, isActive, isFullscreen]);

  // Clicking or tapping anywhere outside the map hands scrolling back to the page
  useEffect(() => {
    if (!isActive) return;
    const handlePointerDown = (e: PointerEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) setIsActive(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isActive, containerRef]);

  // Explain why the wheel or a one-finger swipe moved the page instead of the map
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isActive || isFullscreen) return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const showHint = (text: string) => {
      setHint(text);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setHint(null), 1800);
    };
    const handleWheel = () => showHint("Click the map to zoom with scroll");
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) showHint("Tap the map to move it, or use two fingers");
    };
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      clearTimeout(hideTimer);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isActive, isFullscreen, containerRef]);

  return { activate, hint: isActive || isFullscreen ? null : hint };
}

/**
 * Full-screen map: Escape leaves it, and the page behind doesn't scroll. Panels open over the
 * map handle Escape first (see map-use-panel-focus) and mark it handled.
 */
export function useMapFullscreen(isFullscreen: boolean, exitFullscreen: () => void) {
  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) exitFullscreen();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, exitFullscreen]);
}
