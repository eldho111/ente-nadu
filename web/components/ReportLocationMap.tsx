"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";

type Props = {
  lat: number;
  lng: number;
};

const RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "\u00A9 OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm-raster", type: "raster", source: "osm" }],
};

export default function ReportLocationMap({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: RASTER_STYLE,
        center: [lng, lat],
        zoom: 15,
        interactive: false,
      });
    } catch {
      setUnavailable(true);
      return;
    }

    new maplibregl.Marker({ color: "#0c7a5f" })
      .setLngLat([lng, lat])
      .addTo(map);

    return () => map.remove();
  }, [lat, lng]);

  if (unavailable) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 200, borderRadius: 12 }}
      aria-label="Report location map"
    />
  );
}
