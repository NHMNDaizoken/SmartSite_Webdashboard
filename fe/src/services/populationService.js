/**
 * populationService.js
 * ====================
 * Fetch ward-level population density GeoJSON from the backend API.
 *
 * API: GET /api/population/density?city=hcm|hn|danang
 *
 * Simple in-memory per-city cache so switching cities doesn't re-fetch
 * on every render. Cache is cleared when the module reloads (i.e., dev HMR).
 */

/** @type {Map<string, object>} city → GeoJSON FeatureCollection */
const _cache = new Map()

/**
 * Fetch population density GeoJSON for a city.
 *
 * @param {'hcm'|'hn'|'danang'} city
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function fetchPopulationDensity(city) {
  const key = city.toLowerCase()
  if (_cache.has(key)) {
    return _cache.get(key)
  }

  const url = `/api/population/density?city=${encodeURIComponent(key)}`
  const resp = await fetch(url)
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(
      `Failed to fetch population density for city "${city}": HTTP ${resp.status} ${text}`,
    )
  }

  const geojson = await resp.json()
  _cache.set(key, geojson)
  return geojson
}

/**
 * Clear the in-memory cache for one or all cities.
 *
 * @param {string|null} [city] - If omitted, clears all cities.
 */
export function clearPopulationCache(city) {
  if (city) {
    _cache.delete(city.toLowerCase())
  } else {
    _cache.clear()
  }
}
