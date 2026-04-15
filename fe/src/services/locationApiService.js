/**
 * locationApiService.js
 * Thin wrapper around POST /api/analyze-zone.
 * Returns a ZoneAnalysis object as defined by the FastAPI schema.
 */
import axios from 'axios'

const BASE_URL = '/api'

/**
 * @param {{ min_lat: number, max_lat: number, min_lng: number, max_lng: number }} bbox
 * @returns {Promise<import('../types/zoneAnalysis').ZoneAnalysis>}
 */
export async function analyzeZone(bbox) {
  const { data } = await axios.post(`${BASE_URL}/analyze-zone`, {
    min_lat: bbox.min_lat,
    max_lat: bbox.max_lat,
    min_lng: bbox.min_lng,
    max_lng: bbox.max_lng,
  })
  return data
}