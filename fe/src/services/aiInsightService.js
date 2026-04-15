/**
 * aiInsightService.js
 * Calls POST /api/ai-insight to get AI-powered (or enhanced rule-based)
 * zone insights with benchmark comparison.
 */
import axios from 'axios'

const BASE_URL = '/api'

/**
 * @param {object} zoneAnalysis  ZoneAnalysis object from /api/analyze-zone
 * @returns {Promise<{
 *   headline: string,
 *   bullets: string[],
 *   verdict: string,
 *   benchmark: object,
 *   model_used: string,
 *   fallback_reason?: string | null,
 *   language: string,
 * }>}
 */
export async function fetchAiInsight(zoneAnalysis) {
  const { data } = await axios.post(`${BASE_URL}/ai-insight`, {
    zone_analysis: zoneAnalysis,
  })
  return data
}
