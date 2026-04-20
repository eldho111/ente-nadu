"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";

import type { ReportCard } from "@/lib/api";

type Props = {
  reports: ReportCard[];
};

// Clean map — CartoDB Voyager
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: "carto-voyager-layer", type: "raster", source: "carto-voyager" }],
};

const KERALA_CENTER: [number, number] = [76.27, 10.85];

// Status-based colors
// Red = open (urgent), Orange = acknowledged/in-progress, Green = fixed
const STATUS_COLORS: Record<string, string> = {
  open: "#dc2626",
  acknowledged: "#ea580c",
  in_progress: "#d97706",
  fixed: "#16a34a",
  rejected: "#6b7280",
};

const STATUS_GLOW: Record<string, string> = {
  open: "rgba(220, 38, 38, 0.4)",
  acknowledged: "rgba(234, 88, 12, 0.3)",
  in_progress: "rgba(217, 119, 6, 0.3)",
  fixed: "rgba(22, 163, 74, 0.2)",
  rejected: "rgba(107, 114, 128, 0.15)",
};

export default function PublicMap({ reports }: Props) {
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [mapReady, setMapReady] = useState(false);

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

    const init = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !mapContainerRef.current) return;
        loadedMap = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLE,
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
    return () => { cancelled = true; loadedMap?.remove(); mapRef.current = null; setMapReady(false); };
  }, []);

  // ── Layers + Pulse Animation ──
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
          ["pulse-ring", "cluster-glow", "clusters", "cluster-count", "point-glow", "points"].forEach((id) => {
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

        // ── CLUSTER LAYERS ──

        map.addLayer({
          id: "cluster-glow",
          type: "circle",
          source: SRC,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "rgba(220, 38, 38, 0.2)",
            "circle-radius": ["step", ["get", "point_count"], 28, 10, 36, 30, 48],
            "circle-blur": 0.6,
          },
        });

        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SRC,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "point_count"], "#ea580c", 10, "#dc2626", 30, "#9333ea"],
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 28],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: SRC,
          filter: ["has", "point_count"],
          layout: { "text-field": "{point_count_abbreviated}", "text-size": 13 },
          paint: { "text-color": "#ffffff" },
        });

        // ── INDIVIDUAL POINT LAYERS ──

        // Pulsing ring — only for unresolved issues
        map.addLayer({
          id: "pulse-ring",
          type: "circle",
          source: SRC,
          filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "status"], "fixed"], ["!=", ["get", "status"], "rejected"]],
          paint: {
            "circle-color": [
              "match", ["get", "status"],
              "open", STATUS_GLOW.open,
              "acknowledged", STATUS_GLOW.acknowledged,
              "in_progress", STATUS_GLOW.in_progress,
              STATUS_GLOW.open,
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["get", "severity"],
              0, 14,
              2, 18,
              4, 24,
              5, 30,
            ],
            "circle-opacity": 0.8,
          },
        });

        // Inner glow
        map.addLayer({
          id: "point-glow",
          type: "circle",
          source: SRC,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match", ["get", "status"],
              "open", STATUS_GLOW.open,
              "acknowledged", STATUS_GLOW.acknowledged,
              "in_progress", STATUS_GLOW.in_progress,
              "fixed", STATUS_GLOW.fixed,
              "rejected", STATUS_GLOW.rejected,
              STATUS_GLOW.open,
            ],
            "circle-radius": 12,
            "circle-blur": 0.4,
          },
        });

        // Solid dot — color by status
        map.addLayer({
          id: "points",
          type: "circle",
          source: SRC,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match", ["get", "status"],
              "open", STATUS_COLORS.open,
              "acknowledged", STATUS_COLORS.acknowledged,
              "in_progress", STATUS_COLORS.in_progress,
              "fixed", STATUS_COLORS.fixed,
              "rejected", STATUS_COLORS.rejected,
              STATUS_COLORS.open,
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["get", "severity"],
              0, 5,
              2, 7,
              4, 9,
              5, 11,
            ],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });

        // ── PULSE ANIMATION ──
        let pulsePhase = 0;
        const animatePulse = () => {
          pulsePhase = (pulsePhase + 0.03) % (Math.PI * 2);
          const scale = 1 + 0.35 * Math.sin(pulsePhase); // oscillates 0.65 to 1.35
          const opacity = 0.4 + 0.4 * Math.sin(pulsePhase); // oscillates 0.0 to 0.8

          if (map.getLayer("pulse-ring")) {
            map.setPaintProperty("pulse-ring", "circle-radius", [
              "interpolate", ["linear"], ["get", "severity"],
              0, 14 * scale,
              2, 18 * scale,
              4, 24 * scale,
              5, 30 * scale,
            ]);
            map.setPaintProperty("pulse-ring", "circle-opacity", opacity);
          }
          pulseFrame = requestAnimationFrame(animatePulse);
        };
        pulseFrame = requestAnimationFrame(animatePulse);

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
          const dotColor = STATUS_COLORS[status] || STATUS_COLORS.open;

          const el = document.createElement("div");
          el.style.cssText = "font-family:system-ui;font-size:13px;padding:4px;min-width:140px;";
          el.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;"></span>
              <strong style="text-transform:capitalize;color:#0f172a;">${props.title}</strong>
            </div>
            <div style="font-size:11px;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">
              ${status.replace("_", " ")}${props.severity ? " &middot; Severity " + props.severity + "/5" : ""}
            </div>
            <a href="/reports/${encodeURIComponent(props.publicId)}" style="color:#0d9488;font-weight:600;text-decoration:none;font-size:12px;">
              View details &rarr;
            </a>
          `;

          popupInstance?.remove();
          popupInstance = new maplibregl.Popup({ offset: 14, closeButton: false })
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
      if (map.getSource(SRC)) {
        ["pulse-ring", "cluster-glow", "clusters", "cluster-count", "point-glow", "points"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        map.removeSource(SRC);
      }
    };
  }, [mapReady, mapUnavailable, geojsonData]);

  if (mapUnavailable) {
    return (
      <div className="mapFrame" aria-label="Public issue map" style={{
        display: "grid", placeItems: "center", padding: 32, textAlign: "center",
        background: "linear-gradient(145deg, #ecfdf5 0%, #f0f9ff 50%, #f0fdf4 100%)", minHeight: "50vh",
      }}>
        <div style={{ maxWidth: 340, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 48 }}>&#x1F30D;</div>
          <strong style={{ fontSize: 18, color: "#0f766e" }}>Kerala Civic Map</strong>
          <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            Interactive map showing civic issues across Kerala. Report an issue to see it on the map!
          </p>
          <a href="/report" className="button" style={{ justifySelf: "center", marginTop: 4 }}>Report an Issue</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapContainerRef} className="mapFrame" aria-label="Public issue map" style={{
        borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }} />
      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 28, left: 12, background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(6px)", borderRadius: 10, padding: "8px 12px",
        fontSize: 11, display: "flex", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block", boxShadow: "0 0 6px rgba(220,38,38,0.5)" }} />
          Open
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ea580c", display: "inline-block" }} />
          In Progress
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          Fixed
        </span>
      </div>
    </div>
  );
}
