"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";

import type { ReportCard } from "@/lib/api";
import {
  NON_KERALA_MASK_GEOJSON,
  KERALA_OUTLINE_GEOJSON,
} from "@/components/dashboard/keralaBoundary";

type Props = {
  reports: ReportCard[];
};

const KERALA_CENTER: [number, number] = [76.27, 10.85];

// ── CartoDB raster basemaps: Dark Matter (dark) / Positron (light) ──
// Both are free, CC-BY attribution required, same endpoint pattern.
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
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

const BASEMAP_SOURCE_ID = "basemap";
const BASEMAP_LAYER_ID = "basemap-layer";
const MASK_SOURCE_ID = "kerala-mask";
const MASK_FILL_LAYER_ID = "kerala-mask-fill";
const MASK_OUTLINE_SOURCE_ID = "kerala-outline";
const MASK_OUTLINE_LAYER_ID = "kerala-outline-line";

function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark";
}

function tilesForTheme(theme: "light" | "dark"): string[] {
  return theme === "light" ? LIGHT_TILES : DARK_TILES;
}

/**
 * Mask color + opacity by theme. Darker on dark theme so non-Kerala
 * areas genuinely recede; lighter wash on light theme so the state's
 * shape stays legible without overwhelming the page.
 */
function maskFillForTheme(theme: "light" | "dark"): { color: string; opacity: number } {
  return theme === "light"
    ? { color: "#f7f8fa", opacity: 0.78 }
    : { color: "#0b0b0d", opacity: 0.78 };
}

function outlineColorForTheme(theme: "light" | "dark"): string {
  // Subtle red hairline reinforces "this is Kerala" on both themes.
  return theme === "light" ? "rgba(230, 57, 70, 0.45)" : "rgba(230, 57, 70, 0.55)";
}

function buildStyle(theme: "light" | "dark"): StyleSpecification {
  return {
    version: 8,
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: "raster",
        tiles: tilesForTheme(theme),
        tileSize: 256,
        attribution: ATTRIBUTION,
      },
    },
    layers: [{ id: BASEMAP_LAYER_ID, type: "raster", source: BASEMAP_SOURCE_ID }],
  };
}

// JHU-style: all reports render as red dots; size scales with severity.
// Status is encoded via a small orange ring for in-progress and a muted
// green for fixed — keeps the dashboard "alarm-first" without lying
// about progress.
const C_OPEN = "#e63946";    // alarm
const C_PROGRESS = "#f59e0b"; // warn
const C_FIXED = "#22c55e";   // ok
const C_REJECTED = "#6b7078"; // muted

export default function PublicMap({ reports }: Props) {
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const geojsonData = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.public_lon, r.public_lat] },
      properties: {
        title: r.category.replaceAll("_", " "),
        publicId: r.public_id,
        status: r.status || "open",
        severity: r.severity_ai ?? 2,
        category: r.category,
      },
    })),
  }), [reports]);

  // ── Map Init ──
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;
    let loadedMap: import("maplibre-gl").Map | null = null;
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);

    const init = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !mapContainerRef.current) return;
        loadedMap = new maplibregl.Map({
          container: mapContainerRef.current,
          style: buildStyle(initialTheme),
          center: KERALA_CENTER,
          zoom: 7.2,
          minZoom: 6.5,
          maxZoom: 18,
          maxBounds: [[73.5, 7.5], [78.5, 13.5]],
        });
        loadedMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        loadedMap.on("error", (e) => {
          if (e?.error?.message?.includes("Failed to initialize")) setMapUnavailable(true);
        });
        mapRef.current = loadedMap;
        setMapReady(true);
      } catch {
        setMapUnavailable(true);
      }
    };
    void init();
    return () => {
      cancelled = true;
      loadedMap?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Live theme swap — swap raster tile source + retint mask on theme-change ──
  useEffect(() => {
    const handle = () => {
      const next = getInitialTheme();
      setTheme(next);
      const map = mapRef.current;
      if (!map) return;
      // Swap basemap raster tiles
      const src = map.getSource(BASEMAP_SOURCE_ID) as import("maplibre-gl").RasterTileSource | undefined;
      if (src && typeof (src as unknown as { setTiles?: (t: string[]) => void }).setTiles === "function") {
        (src as unknown as { setTiles: (t: string[]) => void }).setTiles(tilesForTheme(next));
      }
      // Retint the Kerala focus mask + outline
      if (map.getLayer(MASK_FILL_LAYER_ID)) {
        const { color, opacity } = maskFillForTheme(next);
        map.setPaintProperty(MASK_FILL_LAYER_ID, "fill-color", color);
        map.setPaintProperty(MASK_FILL_LAYER_ID, "fill-opacity", opacity);
      }
      if (map.getLayer(MASK_OUTLINE_LAYER_ID)) {
        map.setPaintProperty(MASK_OUTLINE_LAYER_ID, "line-color", outlineColorForTheme(next));
      }
    };
    window.addEventListener("theme-change", handle);
    return () => window.removeEventListener("theme-change", handle);
  }, []);

  // ── Install the non-Kerala dim mask (runs once after map is ready) ──
  useEffect(() => {
    if (!mapRef.current || !mapReady || mapUnavailable) return;
    const map = mapRef.current;

    const install = () => {
      try {
        const current = getInitialTheme();
        const { color, opacity } = maskFillForTheme(current);

        // Clean up any previous instance (safety for hot-reload)
        if (map.getLayer(MASK_OUTLINE_LAYER_ID)) map.removeLayer(MASK_OUTLINE_LAYER_ID);
        if (map.getSource(MASK_OUTLINE_SOURCE_ID)) map.removeSource(MASK_OUTLINE_SOURCE_ID);
        if (map.getLayer(MASK_FILL_LAYER_ID)) map.removeLayer(MASK_FILL_LAYER_ID);
        if (map.getSource(MASK_SOURCE_ID)) map.removeSource(MASK_SOURCE_ID);

        // If cluster/point layers already exist (reports effect raced us),
        // insert the mask UNDER them so markers stay visible.
        const insertBefore =
          (map.getLayer("cluster-glow") && "cluster-glow") ||
          (map.getLayer("clusters") && "clusters") ||
          (map.getLayer("pulse") && "pulse") ||
          (map.getLayer("points") && "points") ||
          undefined;

        // World-with-Kerala-hole source → dim overlay
        map.addSource(MASK_SOURCE_ID, {
          type: "geojson",
          data: NON_KERALA_MASK_GEOJSON,
        });
        map.addLayer(
          {
            id: MASK_FILL_LAYER_ID,
            type: "fill",
            source: MASK_SOURCE_ID,
            paint: {
              "fill-color": color,
              "fill-opacity": opacity,
            },
          },
          insertBefore,
        );

        // Kerala boundary outline — subtle focus ring.
        map.addSource(MASK_OUTLINE_SOURCE_ID, {
          type: "geojson",
          data: KERALA_OUTLINE_GEOJSON,
        });
        map.addLayer(
          {
            id: MASK_OUTLINE_LAYER_ID,
            type: "line",
            source: MASK_OUTLINE_SOURCE_ID,
            paint: {
              "line-color": outlineColorForTheme(current),
              "line-width": 1,
              "line-opacity": 0.8,
            },
          },
          insertBefore,
        );
      } catch (e) {
        console.warn("[PublicMap] mask install failed", e);
      }
    };

    if (map.isStyleLoaded()) install();
    else map.once("load", install);

    return () => {
      // Lifecycle cleanup — best effort; map teardown also clears sources.
      try {
        if (!map) return;
        if (map.getLayer(MASK_OUTLINE_LAYER_ID)) map.removeLayer(MASK_OUTLINE_LAYER_ID);
        if (map.getSource(MASK_OUTLINE_SOURCE_ID)) map.removeSource(MASK_OUTLINE_SOURCE_ID);
        if (map.getLayer(MASK_FILL_LAYER_ID)) map.removeLayer(MASK_FILL_LAYER_ID);
        if (map.getSource(MASK_SOURCE_ID)) map.removeSource(MASK_SOURCE_ID);
      } catch { /* noop */ }
    };
  }, [mapReady, mapUnavailable]);

  // ── Dot-stroke color must contrast against the basemap, so it depends on theme ──
  const dotStroke = theme === "light" ? "#0b0b0d" : "#ffffff";

  // ── Data layers ──
  useEffect(() => {
    if (!mapRef.current || !mapReady || mapUnavailable) return;

    const map = mapRef.current;
    const SRC = "reports-src";
    let popupInstance: import("maplibre-gl").Popup | null = null;
    let pulseFrame: number | null = null;

    const setup = async () => {
      try {
        const maplibregl = await import("maplibre-gl");

        // Clean previous
        if (map.getSource(SRC)) {
          ["pulse", "clusters", "cluster-count", "points"].forEach((id) => {
            if (map.getLayer(id)) map.removeLayer(id);
          });
          map.removeSource(SRC);
        }

        map.addSource(SRC, {
          type: "geojson",
          data: geojsonData,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // ── CLUSTERS: solid red disc + count ──
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SRC,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#e63946", 10,
              "#b4202f", 30,
              "#7a1320",
            ],
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 20, 30, 26],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": dotStroke,
            "circle-opacity": 0.9,
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: SRC,
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 11,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        // ── OPEN pulse — subtle ring that expands/fades ──
        map.addLayer({
          id: "pulse",
          type: "circle",
          source: SRC,
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            ["==", ["get", "status"], "open"],
          ],
          paint: {
            "circle-color": "rgba(230, 57, 70, 0)",
            "circle-stroke-color": "#e63946",
            "circle-stroke-width": 1.5,
            "circle-radius": 8,
            "circle-opacity": 0.8,
          },
        });

        // ── SOLID DOTS — colored by status ──
        map.addLayer({
          id: "points",
          type: "circle",
          source: SRC,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "status"],
              "open", C_OPEN,
              "acknowledged", C_PROGRESS,
              "in_progress", C_PROGRESS,
              "fixed", C_FIXED,
              "rejected", C_REJECTED,
              C_OPEN,
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["get", "severity"],
              0, 4,
              2, 5,
              4, 7,
              5, 9,
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": dotStroke,
            "circle-opacity": [
              "match",
              ["get", "status"],
              "fixed", 0.65,      // faded — already solved
              "rejected", 0.4,
              1,
            ],
          },
        });

        // ── Pulse animation on open dots ──
        let phase = 0;
        const step = () => {
          phase = (phase + 0.025) % 1;   // 0..1 progress of one pulse cycle
          const radius = 8 + phase * 14; // grows 8 → 22 px
          const opacity = 0.65 * (1 - phase);
          if (map.getLayer("pulse")) {
            map.setPaintProperty("pulse", "circle-radius", radius);
            map.setPaintProperty("pulse", "circle-opacity", opacity);
          }
          pulseFrame = requestAnimationFrame(step);
        };
        pulseFrame = requestAnimationFrame(step);

        // ── INTERACTIONS ──

        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource(SRC) as import("maplibre-gl").GeoJSONSource;
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const geom = features[0].geometry;
            if (geom.type === "Point") map.easeTo({ center: geom.coordinates as [number, number], zoom });
          });
        });

        map.on("click", "points", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["points"] });
          if (!features.length) return;
          const props = features[0].properties;
          const geom = features[0].geometry;
          if (geom.type !== "Point" || !props) return;

          const status = props.status || "open";
          const dotColor =
            status === "open" ? C_OPEN :
            status === "fixed" ? C_FIXED :
            status === "rejected" ? C_REJECTED :
            C_PROGRESS;

          const el = document.createElement("div");
          el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;"></span>
              <strong style="text-transform:capitalize;font-weight:700;letter-spacing:0.02em;">${props.title}</strong>
            </div>
            <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px;font-weight:700;">
              ${status.replace("_", " ")}${props.severity ? " · Sev " + props.severity + "/5" : ""}
            </div>
            <a href="/reports/${encodeURIComponent(props.publicId)}" style="color:var(--alarm);font-weight:700;text-decoration:none;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;">
              View report →
            </a>
          `;

          popupInstance?.remove();
          popupInstance = new maplibregl.Popup({ offset: 12, closeButton: false, className: "enteNaduPopup" })
            .setLngLat(geom.coordinates as [number, number])
            .setDOMContent(el)
            .addTo(map);
        });

        map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "points", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "points", () => { map.getCanvas().style.cursor = ""; });

      } catch (error) {
        console.error("[PublicMap] setup failed", error);
        setMapUnavailable(true);
      }
    };

    if (map.isStyleLoaded()) void setup();
    else map.on("load", () => void setup());

    return () => {
      if (pulseFrame) cancelAnimationFrame(pulseFrame);
      popupInstance?.remove();
      try {
        if (map && map.getSource && map.getSource(SRC)) {
          ["pulse", "clusters", "cluster-count", "points"].forEach((id) => {
            try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
          });
          try { map.removeSource(SRC); } catch {}
        }
      } catch {}
    };
  }, [mapReady, mapUnavailable, geojsonData, dotStroke]);

  if (mapUnavailable) {
    return (
      <div
        className="mapFrame"
        aria-label="Public issue map"
        style={{
          display: "grid",
          placeItems: "center",
          padding: 32,
          textAlign: "center",
          background: "var(--bg-sunken)",
          color: "var(--ink-1)",
          minHeight: "50vh",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 340, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.16em", color: "var(--alarm)", textTransform: "uppercase" }}>
            MAP UNAVAILABLE
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            The live map couldn't initialize. Reports are still being collected and will appear once the map loads.
          </p>
          <a href="/report" className="button primary" style={{ justifySelf: "center" }}>Report an Issue</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={mapContainerRef}
        className="mapFrame"
        aria-label="Public issue map"
      />
      {/* Legend — institutional, echoes dashboard chrome */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          gap: 12,
          padding: "6px 10px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          fontSize: 10,
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-1)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <LegendItem color={C_OPEN} label="Open" />
        <LegendItem color={C_PROGRESS} label="In Progress" />
        <LegendItem color={C_FIXED} label="Fixed" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          boxShadow: `0 0 0 1px rgba(255,255,255,0.12)`,
        }}
      />
      {label}
    </span>
  );
}
