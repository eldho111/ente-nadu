/**
 * Simplified Kerala state boundary (~45 vertices).
 *
 * Accuracy: visually faithful at zoom levels 6–12 (statewide → district
 * level). Not suitable for geo-analytics — for that, import an official
 * GeoJSON like the one at github.com/datameet/maps.
 *
 * Coordinates are [lon, lat], traced clockwise starting from the
 * northwest tip (Manjeshwaram) → Arabian Sea coast south →
 * southern tip (Parassala) → Western Ghats north → back to start.
 */
export const KERALA_BOUNDARY: [number, number][] = [
  // Northwest start
  [74.88, 12.78],
  // Arabian Sea coastline (clockwise south)
  [75.08, 12.45],
  [75.28, 12.22],
  [75.48, 11.95],
  [75.60, 11.78],
  [75.72, 11.55],
  [75.90, 11.32],
  [75.92, 11.05],
  [75.80, 10.80],
  [75.90, 10.55],
  [76.02, 10.30],
  [76.15, 10.10],
  [76.15, 9.95],
  [76.10, 9.75],
  [76.18, 9.60],
  [76.22, 9.48],
  [76.30, 9.30],
  [76.32, 9.10],
  [76.28, 8.90],
  [76.40, 8.75],
  [76.52, 8.58],
  [76.65, 8.45],
  [76.80, 8.35],
  [76.98, 8.28],
  [77.15, 8.28],
  [77.25, 8.32],
  // Southeast turn — Tamil Nadu border begins
  [77.35, 8.50],
  [77.38, 8.78],
  [77.25, 9.00],
  [77.15, 9.30],
  [77.20, 9.55],
  [77.08, 9.80],
  [77.00, 10.05],
  [77.08, 10.30],
  [76.90, 10.45],
  // Munnar / Idukki Western Ghats
  [76.75, 10.55],
  [76.85, 10.80],
  [76.70, 10.95],
  // Palakkad gap
  [76.55, 11.10],
  [76.65, 11.30],
  [76.55, 11.48],
  [76.30, 11.62],
  // Wayanad
  [76.20, 11.78],
  [76.05, 12.00],
  [75.88, 12.22],
  // Kodagu / Karnataka border north
  [75.68, 12.38],
  [75.45, 12.55],
  [75.18, 12.68],
  [74.88, 12.78], // close
];

/**
 * World-extent outer ring (counterclockwise) so it's treated as the
 * "fill" area, with Kerala as the hole (clockwise inner ring).
 * Using the odd-even fill rule, a polygon of the world MINUS Kerala
 * is the set of points outside the state — exactly what we want to dim.
 */
export const WORLD_RING: [number, number][] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

export const NON_KERALA_MASK_GEOJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [WORLD_RING, KERALA_BOUNDARY],
  },
};

/**
 * Kerala-only outline for a highlight stroke around the focus region.
 */
export const KERALA_OUTLINE_GEOJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [KERALA_BOUNDARY],
  },
};
