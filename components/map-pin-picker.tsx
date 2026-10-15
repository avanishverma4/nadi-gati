"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Navigation, Crosshair, Loader2, Layers, MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapPinPickerProps {
  latitude: number;
  longitude: number;
  onChange: (_lat: number, _lng: number) => void;
  className?: string;
}

export type OpenFreeMapStyle = "liberty" | "bright" | "positron";

// Labels describe what each style looks like; the OpenFreeMap style names mean nothing to people
const OPENFREEMAP_STYLES: Record<OpenFreeMapStyle, { name: string; url: string }> = {
  liberty: {
    name: "Streets",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
  bright: {
    name: "Colourful",
    url: "https://tiles.openfreemap.org/styles/bright",
  },
  positron: {
    name: "Plain",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
};

// If the map hasn't finished loading by then (no WebGL, blocked tiles, or the worker file
// missing from /public), stop the spinner and offer a retry
const MAP_LOAD_TIMEOUT_MS = 15000;

/**
 * Keeps a picked point on the globe and rounds it to 4 decimals. MapLibre reports longitudes
 * past ±180 after panning across the date line, and the nudge buttons could push latitude past
 * ±90; either made the geohash or GeoPoint throw when the report was sent.
 */
function normalisePoint(lat: number, lng: number): [number, number] {
  const clampedLat = Math.min(90, Math.max(-90, lat));
  const wrappedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  return [Math.round(clampedLat * 10000) / 10000, Math.round(wrappedLng * 10000) / 10000];
}

export function MapPinPicker({
  latitude,
  longitude,
  onChange,
  className = "",
}: MapPinPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  const [activeStyle, setActiveStyle] = useState<OpenFreeMapStyle>("liberty");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  // Bumped by the Retry button to rebuild the map from scratch
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    onChangeRef.current(lat, lng);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        essential: true,
      });
      markerRef.current.setLngLat([lng, lat]);
    }
  }, []);

  const requestUserLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const [lat, lng] = normalisePoint(pos.coords.latitude, pos.coords.longitude);
        handleLocationFound(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Drag the pin manually to your location.");
        } else {
          setLocationError("Could not determine location. Please adjust the pin manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Build the MapLibre map (OpenFreeMap vector tiles, no API key) with a draggable pin
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isSubscribed = true;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;

    // MapLibre needs WebGL and the DOM, so it is loaded in the browser only
    import("maplibre-gl").then((maplibregl) => {
      if (!isSubscribed || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const { Map, Marker, NavigationControl, AttributionControl } = maplibregl;

      // The bundler can't resolve MapLibre's worker next to the module, so serve it from /public
      // (copied by the `postinstall` script) — without this the map never finishes loading.
      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

      loadTimer = setTimeout(() => {
        if (isSubscribed) setMapFailed(true);
      }, MAP_LOAD_TIMEOUT_MS);
      const map = new Map({
        container: mapContainerRef.current,
        style: OPENFREEMAP_STYLES[activeStyle].url,
        center: [longitude, latitude], // [lng, lat]
        zoom: 12,
        attributionControl: false, // added below in compact form
      });

      // Zoom buttons, plus a compass that resets north if the map gets rotated
      map.addControl(new NavigationControl({ showCompass: true }), "top-right");

      // Attribution comes from the OpenFreeMap style itself; a custom string duplicated it
      map.addControl(
        new AttributionControl({
          compact: true,
        }),
        "bottom-right"
      );

      // Teardrop pin drawn in HTML so it can use the theme's error colour
      const pinEl = document.createElement("div");
      pinEl.className = "openfreemap-incident-marker";
      pinEl.setAttribute("role", "button");
      pinEl.setAttribute("aria-label", "Draggable incident location marker");
      pinEl.style.width = "36px";
      pinEl.style.height = "36px";
      pinEl.style.cursor = "grab";
      pinEl.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-error);
          color: #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          border: 2px solid #ffffff;
          transition: transform 0.15s ease;
        ">
          <div style="
            transform: rotate(45deg);
            width: 10px;
            height: 10px;
            background-color: #ffffff;
            border-radius: 50%;
          "></div>
        </div>
      `;

      // anchor "bottom" puts the tip of the pin, not its centre, on the chosen point
      const marker = new Marker({
        element: pinEl,
        draggable: true,
        anchor: "bottom",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        const [lat, lng] = normalisePoint(lngLat.lat, lngLat.lng);
        marker.setLngLat([lng, lat]);
        onChangeRef.current(lat, lng);
      });

      // Tapping the map moves the pin there
      map.on("click", (e) => {
        const [lat, lng] = normalisePoint(e.lngLat.lat, e.lngLat.lng);
        marker.setLngLat([lng, lat]);
        onChangeRef.current(lat, lng);
      });

      map.on("load", () => {
        if (isSubscribed) {
          clearTimeout(loadTimer);
          setMapLoaded(true);
        }
      });

      // If the map can't start (offline, blocked tiles, no WebGL), say so instead of spinning forever
      map.on("error", () => {
        if (isSubscribed && !map.loaded()) {
          setMapFailed(true);
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      isSubscribed = false;
      clearTimeout(loadTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // Rebuilt only on mount and on Retry; later pin and style changes are applied to the live map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempt]);

  const retryMap = () => {
    setMapFailed(false);
    setMapLoaded(false);
    setLoadAttempt((n) => n + 1);
  };

  // Nudge buttons move the pin about 500 m, staying on the globe
  const nudge = (dLat: number, dLng: number) => {
    const [lat, lng] = normalisePoint(latitude + dLat, longitude + dLng);
    onChange(lat, lng);
  };

  // setStyle swaps the tiles on the live map; the pin is a DOM marker, so it survives the swap
  const handleStyleChange = (newStyle: OpenFreeMapStyle) => {
    setActiveStyle(newStyle);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setStyle(OPENFREEMAP_STYLES[newStyle].url);
    }
  };

  // Follow pin changes made outside the map (nudge buttons, "Use my location", a restored draft).
  // The small tolerance avoids flying the map in response to its own drag and click updates.
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const currentPos = markerRef.current.getLngLat();
      if (
        Math.abs(currentPos.lat - latitude) > 0.0001 ||
        Math.abs(currentPos.lng - longitude) > 0.0001
      ) {
        markerRef.current.setLngLat([longitude, latitude]);
        mapInstanceRef.current.flyTo({
          center: [longitude, latitude],
          essential: true,
        });
      }
    }
  }, [latitude, longitude]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Header: heading, style selector and "Use my location" */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Crosshair className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="font-sans font-medium">Where it&apos;s happening</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Style Selector */}
          <div
            role="group"
            aria-label="Map style"
            className="flex items-center gap-1 bg-surface-container-high rounded-sm p-0.5 border border-outline-variant/60"
          >
            <Layers className="w-3 h-3 text-on-surface-variant ml-1" aria-hidden="true" />
            {(["liberty", "bright", "positron"] as OpenFreeMapStyle[]).map((styleKey) => (
              <button
                key={styleKey}
                type="button"
                onClick={() => handleStyleChange(styleKey)}
                aria-pressed={activeStyle === styleKey}
                className={`px-2.5 min-h-[36px] rounded-xs text-xs font-sans transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeStyle === styleKey
                    ? "bg-primary text-on-primary font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {OPENFREEMAP_STYLES[styleKey].name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={requestUserLocation}
            disabled={isLocating}
            id="use-my-location-btn"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/60 font-sans text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 min-h-[44px]"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-primary" />
            )}
            <span>{isLocating ? "Locating..." : "Use my location"}</span>
          </button>
        </div>
      </div>

      {locationError && (
        <div className="text-xs text-error font-sans bg-error-container/30 px-2.5 py-1 rounded-xs border border-error/30">
          {locationError}
        </div>
      )}

      <div
        id="openfreemap-picker-frame"
        className="relative w-full h-64 sm:h-72 rounded-xl border border-outline-variant overflow-hidden bg-surface-container shadow-elevation-1"
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Usage tip over the map */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-outline-variant/50 text-xs font-sans text-on-surface shadow-xs">
            <MapPin className="w-3 h-3 text-error" />
            <span className="font-medium">Click or drag pin to position</span>
          </div>
        </div>

        <div className="absolute bottom-2 left-2 z-10 pointer-events-auto">
          <a
            href="https://openfreemap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-surface/90 backdrop-blur-md px-2 py-0.5 rounded-xs border border-outline-variant/50 text-xs font-sans text-on-surface-variant hover:text-primary transition-colors shadow-xs"
          >
            <span>Powered by OpenFreeMap</span>
          </a>
        </div>

        {!mapLoaded && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/80 backdrop-blur-xs px-6 text-center">
            {mapFailed ? (
              <div role="status" className="flex flex-col items-center gap-3">
                <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                  The map couldn&apos;t load. You can still set the location with{" "}
                  <strong className="text-on-surface">Use my location</strong> or the nudge buttons
                  below.
                </p>
                <button
                  type="button"
                  onClick={retryMap}
                  className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border border-outline-variant bg-surface text-on-surface font-sans text-sm font-semibold hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Try loading the map again
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-sans text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading map…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coordinate Readout with accessible keyboard adjustment controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-on-surface-variant px-1">
        <span>
          Selected: <strong className="text-on-surface">{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</strong>
        </span>
        <div className="flex items-center gap-1" role="group" aria-label="Keyboard location nudge controls">
          <span className="text-xs text-on-surface-variant/80 mr-0.5 font-sans">Nudge:</span>
          <button
            type="button"
            onClick={() => nudge(0.005, 0)}
            className="px-2.5 min-h-[44px] min-w-[44px] rounded-xs border border-outline-variant/60 bg-surface hover:bg-surface-container text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Nudge location North by 0.005 degrees"
            title="Nudge North (+0.005°)"
          >
            ↑ N
          </button>
          <button
            type="button"
            onClick={() => nudge(-0.005, 0)}
            className="px-2.5 min-h-[44px] min-w-[44px] rounded-xs border border-outline-variant/60 bg-surface hover:bg-surface-container text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Nudge location South by 0.005 degrees"
            title="Nudge South (-0.005°)"
          >
            ↓ S
          </button>
          <button
            type="button"
            onClick={() => nudge(0, -0.005)}
            className="px-2.5 min-h-[44px] min-w-[44px] rounded-xs border border-outline-variant/60 bg-surface hover:bg-surface-container text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Nudge location West by 0.005 degrees"
            title="Nudge West (-0.005°)"
          >
            ← W
          </button>
          <button
            type="button"
            onClick={() => nudge(0, 0.005)}
            className="px-2.5 min-h-[44px] min-w-[44px] rounded-xs border border-outline-variant/60 bg-surface hover:bg-surface-container text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Nudge location East by 0.005 degrees"
            title="Nudge East (+0.005°)"
          >
            → E
          </button>
        </div>
      </div>
    </div>
  );
}

