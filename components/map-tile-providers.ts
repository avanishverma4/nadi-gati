/**
 * Base-map tile servers and their names, shared by the flood map (all-districts-map.tsx) and the
 * district map (district-hydrology-map.tsx) so the two can't drift apart.
 */

export type OsmTileStyle = "osm" | "topo" | "hot";

export const MAP_STYLE_OPTIONS: Array<{ id: OsmTileStyle; label: string }> = [
  { id: "osm", label: "Streets" },
  { id: "topo", label: "Terrain" },
  { id: "hot", label: "Humanitarian" },
];

// Keyless public tile servers. Each has a fair-use policy (no bulk downloading, attribution
// shown), which is fine for a pilot but would need a paid or self-hosted source at scale.
export const OSM_TILE_PROVIDERS: Record<
  OsmTileStyle,
  { url: string; attribution: string; maxZoom: number; subdomains?: string[] }
> = {
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>, SRTM | Style: &copy; OpenTopoMap',
    maxZoom: 17,
    subdomains: ["a", "b", "c"],
  },
  hot: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, Tiles: <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">HOT</a>',
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
};
