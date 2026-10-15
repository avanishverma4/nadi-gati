"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Waves, ChevronRight, Maximize2, Minimize2, Crosshair } from "lucide-react";
import {
  DistrictData,
  GaugeStationData,
  PILOT_GAUGE_STATIONS_DATA,
  calculateStationSeverity,
  calculateHFLComparison,
} from "@/lib/hydrology-data";
import { analyzeLocationHydrology, ClickedLocationAnalysis } from "@/lib/location-hydrology";
import { LocationHydrologyDrawer } from "@/components/location-hydrology-drawer";
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

// Non-colour cue for each status, shown in the marker pill: a warning triangle for danger,
// a circled "!" for watch and a plain pin for normal
const STATUS_ICON_PATHS = {
  danger:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  watch: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  normal:
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
} as const;

interface DistrictHydrologyMapProps {
  district: DistrictData;
  primaryStationId?: string;
  className?: string;
}

/**
 * Map of one district's gauges with a card for the selected one. Tapping anywhere else opens the
 * spot panel for that location. Used on the district page.
 */
export function DistrictHydrologyMap({
  district,
  primaryStationId,
  className = "",
}: DistrictHydrologyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const clickedMarkerRef = useRef<L.Marker | null>(null);
  const leafletLibRef = useRef<typeof import("leaflet") | null>(null);

  const [userSelectedStation, setUserSelectedStation] = useState<GaugeStationData | null>(null);
  const [clickedLocation, setClickedLocation] = useState<ClickedLocationAnalysis | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTileStyle, setActiveTileStyle] = useState<OsmTileStyle>("osm");
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

  // All relevant stations in this district. Memoised: a new array on every render made the
  // marker effect clear and rebuild every marker each time anything re-rendered.
  const districtStations = useMemo(
    () => district.stationIds.map((id) => PILOT_GAUGE_STATIONS_DATA[id]).filter(Boolean),
    [district.stationIds]
  );

  const defaultStation =
    (primaryStationId && PILOT_GAUGE_STATIONS_DATA[primaryStationId]) ||
    districtStations[0] ||
    PILOT_GAUGE_STATIONS_DATA.station_ganga_dighaghat;

  const activeStation = userSelectedStation || defaultStation;

  const hflComp = activeStation?.hfl
    ? calculateHFLComparison(activeStation.latestReading.value, activeStation.hfl)
    : null;

  const initialTileStyleRef = useRef(activeTileStyle);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      leafletLibRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: [district.latitude, district.longitude],
        zoom: 9.3,
        zoomControl: false,
        attributionControl: true,
        // Scrolling the page past the map shouldn't zoom or pan it (see useMapScrollGuard)
        ...guardedMapOptions(),
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // First tile layer; later style changes are handled by the effect below
      const provider = OSM_TILE_PROVIDERS[initialTileStyleRef.current];
      const tileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
        subdomains: provider.subdomains || "abc",
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Tapping off a marker opens the spot panel for that place and closes any gauge card
      map.on("click", (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const analysis = analyzeLocationHydrology(lat, lng);
        setClickedLocation(analysis);
        setUserSelectedStation(null);
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
      // The layers belonged to the removed map. Clear them so a map rebuilt for another
      // district doesn't try to update layers that no longer exist.
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      clickedMarkerRef.current = null;
      setMapInstance(null);
      setIsMapReady(false);
    };
  }, [district.latitude, district.longitude]);

  // Swap the base tiles when another style is picked
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLibRef.current) return;
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
  }, [activeTileStyle]);

  // Draw the district's gauge markers; the active gauge's pill is drawn larger
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

    districtStations.forEach((station) => {
      const severity = calculateStationSeverity(
        station.latestReading.value,
        station.warningLevel,
        station.dangerLevel
      );
      const isSelected = activeStation?.id === station.id && !clickedLocation;

      // Text colours keep 4.5:1 contrast: white on the red fill, near-black on the amber and
      // green fills (white on those was 2.2:1 and 3.3:1). No endless pulse or ping: the icon
      // already marks danger, and constant motion over dozens of markers drains phones.
      let bgClass = "bg-map-normal text-neutral-950";
      let ringClass = "ring-2 ring-map-normal/40";
      if (severity.level === "danger") {
        bgClass = "bg-map-danger text-white";
        ringClass = "ring-4 ring-map-danger/40";
      } else if (severity.level === "watch") {
        bgClass = "bg-map-watch text-neutral-950";
        ringClass = "ring-2 ring-map-watch/60";
      }

      const borderClass = "border border-white/80 shadow-md";

      const scaleClass = isSelected ? "scale-115 z-30" : "z-10";
      const statusIcon = `<svg class="w-3.5 h-3.5 inline-block shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICON_PATHS[severity.level]}</svg>`;

      const html = `
        <div class="cursor-pointer transition-transform transform hover:scale-110 ${scaleClass} select-none" style="white-space: nowrap;">
          <div class="flex items-center gap-1 px-2.5 min-h-[28px] py-1 rounded-full text-xs font-sans font-bold shadow-md ${bgClass} ${borderClass} ${ringClass}">
            ${statusIcon}
            <span class="max-w-[110px] truncate">${station.locationName || station.name.split(" ")[0]}</span>
            <span class="font-sans">${station.latestReading.value.toFixed(1)}m</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: "nadi-gati-marker",
        iconAnchor: [50, 16],
      });

      const marker = L.marker([station.latitude, station.longitude], {
        icon: customIcon,
        title: `${station.name} (${severity.label})`,
      });

      marker.on("click", () => {
        setUserSelectedStation(station);
        setClickedLocation(null);
      });
      // Screen readers announce the gauge and its status rather than an unnamed button
      marker.on("add", () => {
        const el = marker.getElement();
        el?.setAttribute("role", "button");
        el?.setAttribute(
          "aria-label",
          `${station.name}: ${station.latestReading.value.toFixed(2)} m, ${severity.label}`
        );
      });

      markersLayer.addLayer(marker);
    });
  }, [districtStations, activeStation, clickedLocation, isMapReady]);

  // Pin on the spot that was tapped
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
        <span class="absolute w-9 h-9 rounded-full bg-map-pin/25 animate-ping pointer-events-none"></span>
        <span class="absolute w-6 h-6 rounded-full bg-map-pin/45 animate-pulse pointer-events-none"></span>
        <div class="relative w-7 h-7 rounded-full bg-map-pin text-white flex items-center justify-center shadow-md border-2 border-white ring-2 ring-map-pin/80">
          <svg class="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
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

  // Invalidate map size on fullscreen toggle
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
      id={`district-${district.slug}-osm-map-container`}
      className={`relative isolate flex flex-col rounded-2xl overflow-hidden border border-outline-variant/60 bg-surface shadow-elevation-1 transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "w-full h-[400px] sm:h-[460px]"
      } ${className}`}
    >
      {/* Top Header overlay */}
      <div className="absolute top-3 left-3 right-[7.5rem] z-[400] flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 h-11 px-4 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/50 shadow-elevation-1">
          <Waves className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-sans font-semibold text-on-surface">{district.name}</span>
        </div>

        {/* Tile Style Switcher */}
        <div
          role="group"
          aria-label="Map style"
          className="hidden sm:flex items-center p-1 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/50 shadow-elevation-1"
        >
          {(["osm", "topo", "hot"] as const).map((styleKey) => (
            <button
              key={styleKey}
              type="button"
              onClick={() => setActiveTileStyle(styleKey)}
              aria-pressed={activeTileStyle === styleKey}
              className={`h-9 px-3.5 text-sm font-sans font-medium rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeTileStyle === styleKey
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {MAP_STYLE_OPTIONS.find((option) => option.id === styleKey)?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Top-Right */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setUserSelectedStation(null);
            setClickedLocation(null);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([district.latitude, district.longitude], 9.3, {
                duration: 0.8,
              });
            }
          }}
          className="w-11 h-11 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/50 text-on-surface flex items-center justify-center shadow-elevation-1 hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Recentre on ${district.name}`}
          aria-label={`Recentre on ${district.name}`}
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-pressed={isFullscreen}
          className="w-11 h-11 rounded-full bg-surface/95 backdrop-blur-md border border-outline-variant/50 text-on-surface flex items-center justify-center shadow-elevation-1 hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={isFullscreen ? "Exit full screen" : "Full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Leaflet draws into this div */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[300px] bg-surface-container-high relative z-0"
      />

      {/* Shown when scrolling over an inactive map, which scrolls the page instead */}
      {scrollHint && (
        <div
          role="status"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-[450] mx-auto w-fit max-w-[90%] px-4 py-2 rounded-full bg-inverse-surface/90 text-inverse-on-surface text-sm font-sans text-center shadow-elevation-2 pointer-events-none"
        >
          {scrollHint}
        </div>
      )}

      {/* Card for the selected (or default) gauge, hidden while the spot panel is open */}
      {!clickedLocation && activeStation && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 z-[500] bg-surface/95 backdrop-blur-md border border-outline-variant/70 rounded-xl p-3 shadow-elevation-2">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {activeStation.isGhat && (
                  <span className="text-xs font-extrabold uppercase px-1.5 py-0.2 rounded bg-tertiary-container text-on-tertiary-container border border-tertiary/30">
                    River gauge
                  </span>
                )}
                <span className="text-xs font-sans text-primary truncate">
                  {activeStation.riverName} River
                </span>
              </div>
              <h4 className="font-sans font-bold text-sm text-on-surface leading-tight truncate mt-0.5">
                {activeStation.name}
              </h4>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-sans font-bold text-base text-on-surface">
                {activeStation.latestReading.value.toFixed(2)}m
              </div>
              <div className="text-xs font-sans text-on-surface-variant">
                Danger: {activeStation.dangerLevel}m
              </div>
            </div>
          </div>

          {/* Highest flood level on record, when the gauge has one */}
          {activeStation.hfl && hflComp && (
            <div className="mt-1.5 pt-1.5 border-t border-outline-variant/40 flex items-center justify-between text-xs">
              <span className="text-tertiary font-medium">HFL: {activeStation.hfl}m</span>
              <span className="font-sans text-xs text-on-surface-variant">
                {hflComp.hflStatusText}
              </span>
            </div>
          )}

          <div className="mt-2 pt-1.5 border-t border-outline-variant/40 flex items-center justify-between">
            <span className="text-xs font-sans text-on-surface-variant">
              {activeStation.source}
            </span>
            <a
              href={`/district/${district.slug}/river/${activeStation.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>View trend</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Panel for a tapped spot */}
      {clickedLocation && (
        <LocationHydrologyDrawer
          analysis={clickedLocation}
          onClose={() => setClickedLocation(null)}
          onSelectStation={(stationId) => {
            const st = PILOT_GAUGE_STATIONS_DATA[stationId];
            if (st) {
              setUserSelectedStation(st);
              setClickedLocation(null);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([st.latitude, st.longitude], 10, { duration: 0.8 });
              }
            }
          }}
        />
      )}
    </div>
  );
}
