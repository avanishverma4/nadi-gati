"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  Crosshair,
  Layers,
  Check,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { GaugeStationData, GAUGE_STATIONS, calculateStationSeverity } from "@/lib/hydrology-data";
import { MapGaugeCard } from "@/components/map-gauge-card";
import { analyzeLocationHydrology, ClickedLocationAnalysis } from "@/lib/location-hydrology";
import { LocationHydrologyDrawer } from "@/components/location-hydrology-drawer";
import { useTheme } from "@/components/theme-provider";
import {
  guardedMapOptions,
  useMapFullscreen,
  useMapScrollGuard,
} from "@/hooks/map-use-scroll-guard";
import {
  MAP_STYLE_OPTIONS,
  OSM_TILE_PROVIDERS,
  type OsmTileStyle,
} from "@/components/map-tile-providers";

interface AllDistrictsMapProps {
  initialState?: "all" | "Bihar" | "Assam";
  selectedGhatId?: string | null;
  onSelectGhat?: (_station: GaugeStationData) => void;
  /** Called when the gauge card is closed, so a parent that set `selectedGhatId` can clear it */
  onClearGhat?: () => void;
  className?: string;
}

// Zoom used when focusing on a single gauge
const GAUGE_ZOOM = 10;

// Marker sizes: the visible dot, and a larger invisible area around it that is easy to tap
const MARKER_DOT_SIZE = { danger: 18, watch: 16, normal: 12, selected: 22 } as const;
const MARKER_HIT_SIZE = 30;

// A white mark inside each dot, so status doesn't depend on colour alone
const MARKER_GLYPH = {
  danger: `<span style="font:800 12px/1 system-ui,sans-serif;color:#fff">!</span>`,
  watch: `<span style="width:6px;height:6px;border-radius:50%;background:#fff"></span>`,
  normal: "",
} as const;

// Starting view for each state filter
const STATE_VIEWS = {
  all: { center: [26.0, 89.2] as [number, number], zoom: 6.5 },
  Bihar: { center: [25.7, 85.7] as [number, number], zoom: 7.8 },
  Assam: { center: [26.3, 92.9] as [number, number], zoom: 7.5 },
};

export function AllDistrictsMap({
  initialState = "all",
  selectedGhatId = null,
  onSelectGhat,
  onClearGhat,
  className = "",
}: AllDistrictsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const clickedMarkerRef = useRef<L.Marker | null>(null);
  const leafletLibRef = useRef<typeof import("leaflet") | null>(null);

  const [filterState, setFilterState] = useState<"all" | "Bihar" | "Assam">(initialState);
  const [filterType, setFilterType] = useState<"all" | "critical">("all");
  const { theme } = useTheme();
  const [activeTileStyle, setActiveTileStyle] = useState<OsmTileStyle>("osm");
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  // The keyless street tiles only come in a light style, so dim them with a CSS filter in dark mode
  const dimStreetTiles = theme === "dark" && activeTileStyle === "osm";
  const [userSelectedStation, setUserSelectedStation] = useState<GaugeStationData | null>(null);
  const [clickedLocation, setClickedLocation] = useState<ClickedLocationAnalysis | null>(null);
  const [showClickHint, setShowClickHint] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  // Same map as mapInstanceRef, held in state for hooks that need to react to it
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const { activate: activateMap, hint: scrollHint } = useMapScrollGuard(
    mapInstance,
    mapWrapperRef,
    isFullscreen
  );
  const exitFullscreen = useCallback(() => setIsFullscreen(false), []);
  useMapFullscreen(isFullscreen, exitFullscreen);
  const activateMapRef = useRef(activateMap);
  useEffect(() => {
    activateMapRef.current = activateMap;
  }, [activateMap]);

  const selectedStation = useMemo(() => {
    if (selectedGhatId) {
      return GAUGE_STATIONS.find((s) => s.id === selectedGhatId) || userSelectedStation;
    }
    return userSelectedStation;
  }, [selectedGhatId, userSelectedStation]);

  // Closing the card has to clear the parent's selection too, or the card comes straight back
  const onClearGhatRef = useRef(onClearGhat);
  useEffect(() => {
    onClearGhatRef.current = onClearGhat;
  }, [onClearGhat]);
  const closeGaugeCard = useCallback(() => {
    setUserSelectedStation(null);
    onClearGhatRef.current?.();
  }, []);

  // Filtered station list based on state and category
  const visibleStations = useMemo(() => {
    return GAUGE_STATIONS.filter((station) => {
      // 1. State filter
      if (filterState === "Bihar" && station.state !== "Bihar") return false;
      if (filterState === "Assam" && station.state !== "Assam") return false;

      // 2. "Alerts" shows only gauges past their warning or danger mark
      if (filterType === "critical") {
        const severity = calculateStationSeverity(
          station.latestReading.value,
          station.warningLevel,
          station.dangerLevel
        );
        if (severity.level !== "danger" && severity.level !== "watch") return false;
      }

      return true;
    });
  }, [filterState, filterType]);

  const alertCount = useMemo(
    () =>
      GAUGE_STATIONS.filter(
        (s) =>
          calculateStationSeverity(s.latestReading.value, s.warningLevel, s.dangerLevel).level !==
          "normal"
      ).length,
    []
  );

  const handleStationClick = useCallback(
    (station: GaugeStationData) => {
      setUserSelectedStation(station);
      setClickedLocation(null);
      if (onSelectGhat) onSelectGhat(station);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([station.latitude, station.longitude], 10, { duration: 0.8 });
      }
    },
    [onSelectGhat]
  );

  const initialFilterStateRef = useRef(filterState);
  const initialGhatIdRef = useRef(selectedGhatId);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      leafletLibRef.current = L;

      const target = STATE_VIEWS[initialFilterStateRef.current];
      // Opened from "Show on map": start at that gauge rather than flying there from the state view
      const startStation = initialGhatIdRef.current
        ? GAUGE_STATIONS.find((st) => st.id === initialGhatIdRef.current)
        : undefined;
      const map = L.map(mapContainerRef.current, {
        center: startStation ? [startStation.latitude, startStation.longitude] : target.center,
        zoom: startStation ? GAUGE_ZOOM : target.zoom,
        // Leaflet's own zoom buttons are replaced by the larger, theme-aware ones rendered below
        zoomControl: false,
        attributionControl: true,
        // Scrolling the page past the map shouldn't zoom or pan it (see useMapScrollGuard)
        ...guardedMapOptions(),
      });

      // The base tile layer is added by the tile-style effect below once the map is ready
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Tapping anywhere off a marker opens the spot panel: nearest river, state and district
      map.on("click", (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const analysis = analyzeLocationHydrology(lat, lng);
        setClickedLocation(analysis);
        // Only one panel at a time: the spot panel replaces any open gauge card
        setUserSelectedStation(null);
        onClearGhatRef.current?.();
        activateMapRef.current();
      });

      mapInstanceRef.current = map;
      setMapInstance(map);
      setIsMapReady(true);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only once on mount

  // Set the tile layer once the map is ready, and swap it when the style changes. Dark mode is
  // handled by dimming the tiles with CSS (dimStreetTiles), not by changing layer.
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLibRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;
    const provider = OSM_TILE_PROVIDERS[activeTileStyle];

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || "abc",
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeTileStyle, isMapReady]);

  // Update map view when filterState changes. The map already starts at the initial state (or
  // the chosen gauge), so this only flies when the filter actually changes.
  const flownFilterStateRef = useRef(filterState);
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    if (flownFilterStateRef.current === filterState) return;
    flownFilterStateRef.current = filterState;
    const target = STATE_VIEWS[filterState];
    mapInstanceRef.current.flyTo(target.center, target.zoom, { duration: 1 });
  }, [filterState, isMapReady]);

  // A gauge chosen outside the map (e.g. "Show on map") is flown to
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || !selectedGhatId) return;
    const station = GAUGE_STATIONS.find((st) => st.id === selectedGhatId);
    if (!station) return;
    mapInstanceRef.current.flyTo([station.latitude, station.longitude], GAUGE_ZOOM, {
      duration: 0.8,
    });
  }, [selectedGhatId, isMapReady]);

  // Rebuild the markers when the filters or the selected gauge change (the selected one is drawn
  // larger, with a label)
  useEffect(() => {
    if (
      !mapInstanceRef.current ||
      !leafletLibRef.current ||
      !markersLayerRef.current ||
      !isMapReady
    )
      return;

    const L = leafletLibRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    visibleStations.forEach((station) => {
      const severity = calculateStationSeverity(
        station.latestReading.value,
        station.warningLevel,
        station.dangerLevel
      );
      const isSelected = selectedStation?.id === station.id;

      const color =
        severity.level === "danger"
          ? "var(--color-map-danger)"
          : severity.level === "watch"
            ? "var(--color-map-watch)"
            : "var(--color-map-normal)";
      const dot = isSelected ? MARKER_DOT_SIZE.selected : MARKER_DOT_SIZE[severity.level];
      const hit = Math.max(MARKER_HIT_SIZE, dot + 8);

      const labelHtml = isSelected
        ? `<span style="position:absolute;left:50%;top:${hit / 2 + dot / 2 + 6}px;transform:translateX(-50%);white-space:nowrap;background:var(--inverse-surface);color:var(--inverse-on-surface);font:600 12px/1 system-ui,sans-serif;padding:5px 8px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.35)">${station.name} · ${station.latestReading.value.toFixed(2)} m</span>`
        : "";

      // color is a CSS variable, so the halo is mixed with color-mix rather than a hex alpha suffix
      const html = `
        <div style="position:relative;width:${hit}px;height:${hit}px;display:flex;align-items:center;justify-content:center;cursor:pointer">
          <span style="display:flex;align-items:center;justify-content:center;width:${dot}px;height:${dot}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 ${isSelected ? 5 : 3}px color-mix(in srgb, ${color} 30%, transparent), 0 1px 4px rgba(0,0,0,.45)">${MARKER_GLYPH[severity.level]}</span>
          ${labelHtml}
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: "nadi-gati-marker",
        iconSize: [hit, hit],
        iconAnchor: [hit / 2, hit / 2],
      });

      const marker = L.marker([station.latitude, station.longitude], {
        icon: customIcon,
        title: `${station.name} (${severity.label})`,
        // Keep alerts and the selected gauge above the rest
        zIndexOffset: isSelected
          ? 900
          : severity.level === "danger"
            ? 600
            : severity.level === "watch"
              ? 300
              : 0,
      });

      const markerName = `${station.name}: ${station.latestReading.value.toFixed(2)} m, ${severity.label}`;
      marker.bindTooltip(
        `${station.name} · ${station.latestReading.value.toFixed(2)} m · ${severity.label}`,
        {
          direction: "top",
          offset: [0, -dot / 2 - 2],
        }
      );
      // Screen readers announce the gauge and its status rather than an unnamed button
      marker.on("add", () => {
        const el = marker.getElement();
        el?.setAttribute("role", "button");
        el?.setAttribute("aria-label", markerName);
      });

      // Tap areas are larger than the dots, so in dense clusters a neighbour's tap area can sit on
      // top of this dot. Open the gauge whose dot is nearest the tap, not whichever area caught it.
      marker.on("click", (e: L.LeafletMouseEvent) => {
        const map = mapInstanceRef.current;
        // Leaflet reports a marker's own position as containerPoint, so read the real pointer
        // position from the browser event (absent for keyboard activation, which is exact anyway)
        const pointer = e.originalEvent as MouseEvent | undefined;
        const tap =
          map && pointer && "clientX" in pointer ? map.mouseEventToContainerPoint(pointer) : null;
        if (!map || !tap) {
          handleStationClick(station);
          return;
        }
        let nearest = station;
        let nearestDistance = Infinity;
        for (const candidate of visibleStations) {
          const point = map.latLngToContainerPoint([candidate.latitude, candidate.longitude]);
          const distance = point.distanceTo(tap);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = candidate;
          }
        }
        handleStationClick(nearest);
      });

      markersLayer.addLayer(marker);
    });
  }, [visibleStations, selectedStation, handleStationClick, isMapReady]);

  // Pin on the spot that was tapped, labelled with its district
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLibRef.current || !isMapReady) return;
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;

    if (!clickedLocation) {
      if (clickedMarkerRef.current) {
        map.removeLayer(clickedMarkerRef.current);
        clickedMarkerRef.current = null;
      }
      return;
    }

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer select-none" style="transform: translate(-16px, -32px); width: 32px; height: 32px;">
        <span class="absolute w-10 h-10 rounded-full bg-map-pin/25 animate-ping pointer-events-none"></span>
        <span class="absolute w-7 h-7 rounded-full bg-map-pin/45 animate-pulse pointer-events-none"></span>
        <div class="relative w-8 h-8 rounded-full bg-map-pin text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-map-pin/80">
          <svg class="w-4 h-4 fill-current text-white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>
        <div class="absolute top-9 px-2 py-0.5 rounded-md bg-surface/95 backdrop-blur-md border border-map-pin/50 text-xs font-sans font-bold text-on-surface shadow-xs whitespace-nowrap pointer-events-none">
          ${clickedLocation.isCovered ? clickedLocation.district.name : "Outside pilot area"}
        </div>
      </div>
    `;

    const clickedIcon = L.divIcon({
      html,
      className: "nadi-gati-clicked-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (clickedMarkerRef.current) {
      clickedMarkerRef.current.setLatLng([clickedLocation.latitude, clickedLocation.longitude]);
      clickedMarkerRef.current.setIcon(clickedIcon);
    } else {
      const marker = L.marker([clickedLocation.latitude, clickedLocation.longitude], {
        icon: clickedIcon,
        zIndexOffset: 1000,
      }).addTo(map);
      clickedMarkerRef.current = marker;
    }
  }, [clickedLocation, isMapReady]);

  // Leaflet measures its container only on load, so tell it the size changed after going in or
  // out of full screen (once the CSS transition has finished), or tiles stay half-drawn
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const timeout = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(timeout);
  }, [isFullscreen]);

  return (
    <div
      ref={mapWrapperRef}
      id="all-districts-osm-map-container"
      className={`relative isolate flex flex-col rounded-3xl overflow-hidden border border-outline-variant/60 bg-surface shadow-elevation-2 transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full h-[540px] sm:h-[620px]"
      } ${className}`}
    >
      {/* Filters */}
      <div className="absolute top-3 left-3 right-16 z-[400] flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Filter by state"
          className="flex items-center p-1 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/60 shadow-elevation-1"
        >
          {(["all", "Bihar", "Assam"] as const).map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={filterState === st}
              onClick={() => {
                setFilterState(st);
                closeGaugeCard();
              }}
              className={`px-3.5 min-h-[36px] text-sm font-sans font-medium rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                filterState === st
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              {st === "all" ? "All" : st}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Filter by status"
          className="flex items-center p-1 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/60 shadow-elevation-1"
        >
          <button
            type="button"
            aria-pressed={filterType !== "critical"}
            onClick={() => setFilterType("all")}
            className={`px-3.5 min-h-[36px] text-sm font-sans font-medium rounded-full transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filterType !== "critical"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            All gauges
          </button>
          <button
            type="button"
            aria-pressed={filterType === "critical"}
            onClick={() => setFilterType("critical")}
            className={`px-3.5 min-h-[36px] text-sm font-sans font-medium rounded-full transition-colors inline-flex items-center gap-1.5 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-error ${
              filterType === "critical"
                ? "bg-error text-on-error"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Alerts ({alertCount})</span>
          </button>
        </div>
      </div>

      {/* Map tools */}
      <div className="absolute top-3 right-3 z-[450] flex flex-col items-end gap-2">
        <div className="flex flex-col rounded-2xl bg-surface/95 backdrop-blur-md border border-outline-variant/60 shadow-elevation-1 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-pressed={isFullscreen}
            className="w-11 h-11 text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            title={isFullscreen ? "Exit full screen" : "Full screen"}
            aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowStyleMenu((open) => !open)}
            aria-expanded={showStyleMenu}
            className="w-11 h-11 border-t border-outline-variant/50 text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            title="Map style"
            aria-label="Map style"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              closeGaugeCard();
              setClickedLocation(null);
              setFilterState("all");
              if (mapInstanceRef.current) {
                const target = STATE_VIEWS.all;
                mapInstanceRef.current.flyTo(target.center, target.zoom, { duration: 0.8 });
              }
            }}
            className="w-11 h-11 border-t border-outline-variant/50 text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            title="Reset view"
            aria-label="Reset view"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col rounded-2xl bg-surface/95 backdrop-blur-md border border-outline-variant/60 shadow-elevation-1 overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-11 h-11 text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-11 h-11 border-t border-outline-variant/50 text-on-surface flex items-center justify-center hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {showStyleMenu && (
          <div
            role="menu"
            aria-label="Map style"
            className="w-44 p-1 rounded-2xl bg-surface/95 backdrop-blur-md border border-outline-variant/60 shadow-elevation-2"
          >
            {MAP_STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={activeTileStyle === option.id}
                onClick={() => {
                  setActiveTileStyle(option.id);
                  setShowStyleMenu(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 min-h-[40px] rounded-xl text-sm font-sans text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <span>{option.label}</span>
                {activeTileStyle === option.id && (
                  <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaflet draws into this div */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full min-h-[380px] bg-surface-container-high relative z-0 ${dimStreetTiles ? "nadi-map-dark" : ""}`}
      />

      {/* Gauge card: opens when a gauge marker is tapped */}
      {selectedStation && <MapGaugeCard station={selectedStation} onClose={closeGaugeCard} />}

      {/* Panel for a tapped spot: nearest river, flow and local helplines */}
      {clickedLocation && (
        <LocationHydrologyDrawer
          analysis={clickedLocation}
          onClose={() => setClickedLocation(null)}
          onSelectStation={(stationId) => {
            const st = GAUGE_STATIONS.find((s) => s.id === stationId);
            if (st) {
              handleStationClick(st);
            }
          }}
        />
      )}

      {/* Shown when scrolling over an inactive map, which scrolls the page instead */}
      {scrollHint && (
        <div
          role="status"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-[450] mx-auto w-fit max-w-[90%] px-4 py-2 rounded-full bg-inverse-surface/90 text-inverse-on-surface text-sm font-sans text-center shadow-elevation-2 pointer-events-none"
        >
          {scrollHint}
        </div>
      )}

      {/* Hint */}
      {showClickHint && !clickedLocation && !selectedStation && (
        <div className="absolute bottom-14 left-3 right-16 sm:right-auto sm:max-w-sm z-[400] flex items-center gap-2 pl-3.5 pr-1 py-1 rounded-full bg-inverse-surface text-inverse-on-surface shadow-elevation-2 animate-in fade-in duration-200">
          <span className="flex-1 text-xs font-sans leading-snug">
            Tap a gauge for its level, or anywhere on the map for the nearest river.
          </span>
          <button
            type="button"
            onClick={() => setShowClickHint(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-inverse-on-surface/10 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Dismiss hint"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none flex items-center gap-3 px-3 py-2 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/50 text-xs font-sans text-on-surface shadow-elevation-1">
        {/* Same marks as the map markers: "!" for danger, a dot for watch, plain for normal */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-full bg-map-danger border border-white flex items-center justify-center text-white text-[10px] font-extrabold leading-none"
            aria-hidden="true"
          >
            !
          </span>
          <span>Danger</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-full bg-map-watch border border-white flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </span>
          <span>Watch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full bg-map-normal border border-white"
            aria-hidden="true"
          />
          <span>Normal</span>
        </div>
      </div>
    </div>
  );
}
