/**
 * Map Service - Core spatial utility functions
 * Handles distance calculations, nearby search, point-in-polygon, and bounds fitting.
 */

const EARTH_RADIUS_KM = 6371;
const SPATIAL_INDEX_URL = `${import.meta.env.BASE_URL}spatial/index.json`;

/**
 * Haversine distance between two lat/lng points in kilometers.
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Find all points within `radiusKm` of the target point.
 * Returns sorted by distance ascending.
 */
export function findNearbyPoints(targetPoint, allPoints, radiusKm = 1) {
  if (!targetPoint || !allPoints?.length) return [];
  const { lat: tLat, lng: tLng } = targetPoint;
  if (tLat == null || tLng == null) return [];

  return allPoints
    .filter((p) => p !== targetPoint && p.lat != null && p.lng != null)
    .map((p) => ({
      ...p,
      distance: calculateDistance(tLat, tLng, p.lat, p.lng),
    }))
    .filter((p) => p.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Ray-casting point-in-polygon test.
 * `polygon` is an array of [lng, lat] pairs (GeoJSON convention).
 */
export function pointInPolygon(lat, lng, polygon) {
  if (!polygon?.length) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1],
      yi = polygon[i][0];
    const xj = polygon[j][1],
      yj = polygon[j][0];
    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Filter points that fall inside a polygon boundary.
 * Polygon can be a single ring [[lng,lat]...] or GeoJSON coordinates array.
 */
export function filterPointsByPolygon(points, polygon) {
  if (!points?.length || !polygon?.length) return points || [];
  // Handle GeoJSON multi-ring: use outer ring
  const ring = Array.isArray(polygon[0]?.[0]) ? polygon[0] : polygon;
  return points.filter((p) => p.lat != null && p.lng != null && pointInPolygon(p.lat, p.lng, ring));
}

/**
 * Compute Leaflet LatLngBounds from an array of points.
 */
export function computeBounds(points) {
  if (!points?.length) return null;
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const p of points) {
    if (p.lat == null || p.lng == null) continue;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  if (!isFinite(minLat)) return null;
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Normalize a GeoJSON feature into our flat point format.
 */
export function normalizeGeoJSONFeature(feature) {
  const props = feature.properties || {};
  const geom = feature.geometry;
  let lat = props.Center_Lat;
  let lng = props.Center_Lng;

  // Fallback: compute polygon centroid
  if ((lat == null || lng == null) && geom?.coordinates) {
    const coords = geom.type === 'Polygon' ? geom.coordinates[0] : null;
    if (coords?.length) {
      lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
      lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    }
  }

  return {
    gridId: props.Grid_ID || props.gridId || 'unknown',
    city: props.City || 'unknown',
    lat,
    lng,
    cafeCount: props.Cafe_Count ?? null,
    totalReviews: props.Total_Reviews ?? null,
    avgRating: props.Avg_Weighted_Rating ?? null,
    avgSentiment: props.Avg_Sentiment ?? null,
    ntlMean: props.NTL_Mean ?? null,
    poiDensity: props.POI_Density ?? null,
    opportunityScore: props.opportunityScore ?? null,
    opportunityTier: props.opportunityTier ?? null,
    opportunityScoreSource: props.opportunityScoreSource ?? null,
    step5GlobalOpportunityScore: props.step5GlobalOpportunityScore ?? null,
    predictionLabelName: props.predictionLabelName ?? null,
    predictionStatus: props.predictionStatus ?? null,
    predictionSource: props.predictionSource ?? null,
    // Keep raw geometry for grid overlay
    geometry: geom,
    cellSouth: props.cellSouth,
    cellNorth: props.cellNorth,
    cellWest: props.cellWest,
    cellEast: props.cellEast,
    rawProperties: props,
  };
}

/**
 * Load the spatial manifest for per-city grid assets.
 */
export async function loadSpatialIndex() {
  const resp = await fetch(SPATIAL_INDEX_URL);
  if (!resp.ok) throw new Error(`Failed to load spatial index: ${resp.status}`);
  return resp.json();
}

/**
 * Load and normalize a city's grid GeoJSON.
 */
export async function loadCitySpatialLayer(cityCode, layer = 'hotspots') {
  const safeCityCode = encodeURIComponent(String(cityCode));
  const url = `${import.meta.env.BASE_URL}spatial/${layer}/${safeCityCode}.geojson`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load ${layer} layer for ${cityCode}: ${resp.status}`);
  const geojson = await resp.json();
  return (geojson.features || []).map(normalizeGeoJSONFeature);
}
