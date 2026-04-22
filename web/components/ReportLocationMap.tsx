"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";

type Props = {
  lat: number;
  lng: number;
};

// CartoDB Dark Matter tiles (same basemap family as PublicMap). Swapping to
// these keeps the dashboard's visual continuity — the tiny location pin no
// longer renders a bright OSM panel on a dark page.
const DARK_TILES = [
  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
];
const LIGHT_TILES = [
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
  "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
  "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
  "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
];

function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark";
}

export default function ReportLocationMap({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;

    // Dynamic import keeps MapLibre (~200 KB) out of the route's initial JS
    // chunk. The detail page now hydrates ~200 KB lighter and the map loads
    // in parallel with page paint instead of blocking it.
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        const theme = getInitialTheme();
        map = new maplibregl.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              basemap: {
                type: "raster",
                tiles: theme === "light" ? LIGHT_TILES : DARK_TILES,
                tileSize: 256,
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
              },
            },
            layers: [{ id: "basemap-layer", type: "raster", source: "basemap" }],
          },
          center: [lng, lat],
          zoom: 15,
          interactive: false,
        });

        new maplibregl.Marker({ color: "#d15e6a" })
          .setLngLat([lng, lat])
          .addTo(map);

        // Retheme live on theme-change (same signal PublicMap uses).
        const onThemeChange = () => {
          if (!map) return;
          const next = getInitialTheme();
          const src = map.getSource("basemap") as import("maplibre-gl").RasterTileSource | undefined;
          if (src && typeof (src as unknown as { setTiles?: (t: string[]) => void }).setTiles === "function") {
            (src as unknown as { setTiles: (t: string[]) => void }).setTiles(
              next === "light" ? LIGHT_TILES : DARK_TILES,
            );
          }
        };
        window.addEventListener("theme-change", onThemeChange);
        // Stash cleanup on the map so the outer return can find it.
        (map as unknown as { __onThemeChange?: () => void }).__onThemeChange = onThemeChange;
      } catch {
        if (!cancelled) setUnavailable(true);
      }
    })();

    return () => {
      cancelled = true;
      if (map) {
        const handler = (map as unknown as { __onThemeChange?: () => void }).__onThemeChange;
        if (handler) window.removeEventListener("theme-change", handler);
        map.remove();
      }
    };
  }, [lat, lng]);

  if (unavailable) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 200,
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-sunken)",
      }}
      aria-label="Report location map"
    />
  );
}
