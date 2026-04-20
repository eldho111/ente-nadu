"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";

import type { ReportCard } from "@/lib/api";

type Props = {
  reports: ReportCard[];
};

// Clean, colorful map style — CartoDB Voyager (Google Maps-like)
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
  layers: [
    {
      id: "carto-voyager-layer",
      type: "raster",
      source: "carto-voyager",
    },
  ],
};

// Kerala bounding box — restricts map to Kerala only
const KERALA_BOUNDS: [[number, number], [number, number]] = [
  [74.85, 8.18],   // Southwest corner (bottom-left)
  [77.42, 12.82],  // Northeast corner (top-right)
];

// Kerala center
const KERALA_CENTER: [number, number] = [76.27, 10.85];

// Marker colors for light map
const COLORS = {
  primary: "#dc2626",      // Red — stands out on light map
  primaryGlow: "rgba(220, 38, 38, 0.25)",
  cluster10: "#ea580c",    // Orange
  cluster30: "#dc2626",    // Red
  clusterBig: "#9333ea",   // Purple
  text: "#ffffff",
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
          style: MAP_STYLE,
          center: KERALA_CENTER,
          zoom: 7.2,
          minZoom: 6.5,
          maxZoom: 18,
          maxBounds: [
            [73.5, 7.5],    // Allow slight padding beyond Kerala
            [78.5, 13.5],
          ],
        });
        loadedMap.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
        loadedMap.on("error", (e) => {
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

        // Soft glow behind clusters
        map.addLayer({
          id: "cluster-glow",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": COLORS.primaryGlow,
            "circle-radius": ["step", ["get", "point_count"], 28, 10, 36, 30, 48],
            "circle-blur": 0.6,
          },
        });

        // Cluster circles
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step", ["get", "point_count"],
              COLORS.cluster10, 10, COLORS.cluster30, 30, COLORS.clusterBig,
            ],
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 28],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
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
            "text-color": COLORS.text,
            "text-halo-color": "rgba(0,0,0,0.2)",
            "text-halo-width": 1,
          },
        });

        // Glow behind individual points
        map.addLayer({
          id: "point-glow",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": COLORS.primaryGlow,
            "circle-radius": 14,
            "circle-blur": 0.5,
          },
        });

        // Individual report markers
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": COLORS.primary,
            "circle-radius": 7,
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        });

        // Click cluster to zoom
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

        // Click point for popup
        map.on("click", "unclustered-point", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["unclustered-point"] });
          if (!features.length) return;
          const props = features[0].properties;
          const geom = features[0].geometry;
          if (geom.type !== "Point" || !props) return;

          const popupContent = document.createElement("div");
          popupContent.style.cssText = "font-family:system-ui;font-size:13px;padding:2px;";
          const titleEl = document.createElement("strong");
          titleEl.textContent = props.title;
          titleEl.style.cssText = "text-transform:capitalize;color:#0f172a;";
          const br = document.createElement("br");
          const linkEl = document.createElement("a");
          linkEl.href = `/reports/${encodeURIComponent(props.publicId)}`;
          linkEl.textContent = "View report \u2192";
          linkEl.style.cssText = "color:#0d9488;font-weight:600;text-decoration:none;font-size:12px;";
          popupContent.appendChild(titleEl);
          popupContent.appendChild(br);
          popupContent.appendChild(linkEl);

          popupInstance?.remove();
          popupInstance = new maplibregl.Popup({ offset: 14, closeButton: false })
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
          background: "linear-gradient(145deg, #ecfdf5 0%, #f0f9ff 50%, #f0fdf4 100%)",
          minHeight: "50vh",
        }}
      >
        <div style={{ maxWidth: 340, display: "grid", gap: 14 }}>
          <div style={{ fontSize: 48 }}>&#x1F30D;</div>
          <strong style={{ fontSize: 18, color: "#0f766e" }}>Kerala Civic Map</strong>
          <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            Interactive map showing civic issues across Kerala.
            Report an issue to see it appear on the map!
          </p>
          <a href="/report" className="button" style={{ justifySelf: "center", marginTop: 4 }}>
            Report an Issue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapContainerRef} className="mapFrame" aria-label="Public issue map" style={{
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }} />
  );
}
