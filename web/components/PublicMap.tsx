"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";

import type { ReportCard } from "@/lib/api";

type Props = {
  reports: ReportCard[];
};

// Dark futuristic map style using CartoDB Dark Matter tiles
const DARK_FUTURISTIC_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
    },
  ],
};

// Neon color palette for the futuristic look
const NEON = {
  cyan: "#00ffd5",
  cyanDim: "#0d9488",
  magenta: "#ff2d95",
  orange: "#ff9f1c",
  blue: "#3b82f6",
  glow: "rgba(0, 255, 213, 0.35)",
  glowStrong: "rgba(0, 255, 213, 0.55)",
};

export default function PublicMap({ reports }: Props) {
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const points = useMemo(
    () =>
      reports.map((report) => ({
        lng: report.public_lon,
        lat: report.public_lat,
        title: report.category.replaceAll("_", " "),
        publicId: report.public_id,
      })),
    [reports],
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;
    let loadedMap: import("maplibre-gl").Map | null = null;

    const init = async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !mapContainerRef.current) {
          return;
        }
        loadedMap = new maplibregl.Map({
          container: mapContainerRef.current,
          style: DARK_FUTURISTIC_STYLE,
          center: [76.2711, 10.8505],
          zoom: 7,
          pitch: 20,
          maxPitch: 60,
        });
        loadedMap.addControl(
          new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
          "top-right",
        );
        loadedMap.on("error", (e) => {
          // Only mark unavailable for critical errors (WebGL, style load)
          // Ignore individual tile load failures
          if (e?.error?.message?.includes("Failed to initialize")) {
            setMapUnavailable(true);
          }
        });
        mapRef.current = loadedMap;
        setMapReady(true);
      } catch (error) {
        console.error("[PublicMap] map init failed", error);
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

  useEffect(() => {
    if (!mapRef.current || !mapReady || mapUnavailable) return;

    const map = mapRef.current;
    const SOURCE_ID = "reports-source";
    let popupInstance: import("maplibre-gl").Popup | null = null;

    const setup = async () => {
      try {
        const maplibregl = await import("maplibre-gl");

        const geojson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: points.map((p) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            properties: { title: p.title, publicId: p.publicId },
          })),
        };

        // Remove previous source/layers if re-rendering
        if (map.getSource(SOURCE_ID)) {
          ["cluster-glow", "clusters", "cluster-count", "point-glow", "unclustered-point"].forEach((id) => {
            if (map.getLayer(id)) map.removeLayer(id);
          });
          map.removeSource(SOURCE_ID);
        }

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Outer glow ring for clusters
        map.addLayer({
          id: "cluster-glow",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": NEON.glow,
            "circle-radius": ["step", ["get", "point_count"], 30, 10, 40, 30, 55],
            "circle-blur": 0.7,
          },
        });

        // Solid cluster circle
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step", ["get", "point_count"],
              NEON.cyan, 10, NEON.orange, 30, NEON.magenta,
            ],
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 28],
            "circle-stroke-width": 2,
            "circle-stroke-color": "rgba(255,255,255,0.3)",
          },
        });

        // Cluster count label
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 13,
          },
          paint: {
            "text-color": "#0a0a0a",
            "text-halo-color": "rgba(255,255,255,0.6)",
            "text-halo-width": 1,
          },
        });

        // Outer glow for individual points
        map.addLayer({
          id: "point-glow",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": NEON.glowStrong,
            "circle-radius": 16,
            "circle-blur": 0.6,
          },
        });

        // Individual point
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": NEON.cyan,
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "rgba(255,255,255,0.5)",
          },
        });

        // Zoom into cluster on click
        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource(SOURCE_ID) as import("maplibre-gl").GeoJSONSource;
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const geom = features[0].geometry;
            if (geom.type === "Point") {
              map.easeTo({ center: geom.coordinates as [number, number], zoom });
            }
          });
        });

        // Popup on individual point click
        map.on("click", "unclustered-point", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
          if (!features.length) return;
          const props = features[0].properties;
          const geom = features[0].geometry;
          if (geom.type !== "Point" || !props) return;

          const popupContent = document.createElement("div");
          popupContent.style.cssText = "font-family:system-ui;font-size:13px;";
          const titleEl = document.createElement("strong");
          titleEl.textContent = props.title;
          titleEl.style.cssText = "color:#00ffd5;text-transform:capitalize;";
          const br = document.createElement("br");
          const linkEl = document.createElement("a");
          linkEl.href = `/reports/${encodeURIComponent(props.publicId)}`;
          linkEl.textContent = "View report \u2192";
          linkEl.style.cssText = "color:#3b82f6;font-weight:600;text-decoration:none;";
          popupContent.appendChild(titleEl);
          popupContent.appendChild(br);
          popupContent.appendChild(linkEl);

          popupInstance?.remove();
          popupInstance = new maplibregl.Popup({
            offset: 12,
            className: "dark-popup",
          })
            .setLngLat(geom.coordinates as [number, number])
            .setDOMContent(popupContent)
            .addTo(map);
        });

        map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });
      } catch (error) {
        console.error("[PublicMap] clustering setup failed", error);
        setMapUnavailable(true);
      }
    };

    if (map.isStyleLoaded()) {
      void setup();
    } else {
      map.on("load", () => void setup());
    }

    return () => {
      popupInstance?.remove();
      if (map.getSource(SOURCE_ID)) {
        ["cluster-glow", "clusters", "cluster-count", "point-glow", "unclustered-point"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        map.removeSource(SOURCE_ID);
      }
    };
  }, [mapReady, mapUnavailable, points]);

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
          background: "linear-gradient(145deg, #0a1628 0%, #0d2137 40%, #0a1a2e 100%)",
          minHeight: "50vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated grid background */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.08,
          backgroundImage: `
            linear-gradient(rgba(0,255,213,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,213,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }} />
        {/* Glow orb */}
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translate(-50%, -50%)",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,213,0.12) 0%, transparent 70%)",
        }} />
        <div style={{ maxWidth: 360, display: "grid", gap: 14, position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: 56, filter: "drop-shadow(0 0 20px rgba(0,255,213,0.6))",
          }}>&#x1F30D;</div>
          <strong style={{
            fontSize: 20, color: "#00ffd5",
            textShadow: "0 0 20px rgba(0,255,213,0.4)",
            letterSpacing: "0.05em",
          }}>
            ENTE NADU
          </strong>
          <p style={{
            margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6,
          }}>
            Interactive map powered by AI issue detection.
            Report a civic issue to see it appear in real-time.
          </p>
          <a
            href="/report"
            style={{
              justifySelf: "center", marginTop: 8,
              padding: "12px 28px", borderRadius: 10,
              background: "linear-gradient(135deg, #00ffd5, #0d9488)",
              color: "#0a0a0a", fontWeight: 700, fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(0,255,213,0.3), 0 4px 12px rgba(0,0,0,0.3)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            Report an Issue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainerRef} className="mapFrame" aria-label="Public issue map" style={{
      border: "1px solid rgba(0,255,213,0.15)",
      borderRadius: 14,
      boxShadow: "0 0 30px rgba(0,255,213,0.05), 0 8px 32px rgba(0,0,0,0.2)",
    }} />
  );
}
