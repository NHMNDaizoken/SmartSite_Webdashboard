/**
 * useLocationIntelligence.js
 * Manages bbox state, API fetching, loading/error state,
 * and derived insights from the ZoneAnalysis response.
 */
import { useCallback, useReducer } from 'react'
import { analyzeZone } from '../services/locationApiService'
import { deriveInsights } from '../services/insightService'
import { fetchAiInsight } from '../services/aiInsightService'

const INITIAL_STATE = {
  bbox: null,          // { min_lat, max_lat, min_lng, max_lng } | null
  analysis: null,      // ZoneAnalysis response | null
  insights: null,      // derived insight object | null
  aiInsight: null,     // AI-powered insight from /api/ai-insight | null
  aiLoading: false,    // separate loading state for AI insight
  aiError: null,       // separate error state for AI insight
  loading: false,
  error: null,
  resetCount: 0,       // incremented on reset so MapPanel remounts via key prop
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BBOX':
      return { ...state, bbox: action.payload, analysis: null, insights: null, error: null }
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS': {
      const analysis = action.payload
      return {
        ...state,
        loading: false,
        analysis,
        insights: deriveInsights(analysis),
        error: null,
      }
    }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload }
    case 'AI_FETCH_START':
      return { ...state, aiLoading: true, aiError: null }
    case 'AI_FETCH_SUCCESS':
      return { ...state, aiLoading: false, aiInsight: action.payload, aiError: null }
    case 'AI_FETCH_ERROR':
      return { ...state, aiLoading: false, aiError: action.payload }
    case 'RESET':
      return { ...INITIAL_STATE, resetCount: state.resetCount + 1 }
    default:
      return state
  }
}

/**
 * @returns {{
 *   bbox: object|null,
 *   analysis: object|null,
 *   insights: object|null,
 *   loading: boolean,
 *   error: string|null,
 *   setBbox: (bbox: object) => void,
 *   submitBbox: (bbox: object) => Promise<void>,
 *   reset: () => void,
 * }}
 */
export function useLocationIntelligence() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const setBbox = useCallback((bbox) => {
    dispatch({ type: 'SET_BBOX', payload: bbox })
  }, [])

  const submitBbox = useCallback(async (bbox) => {
    if (!bbox) return
    dispatch({ type: 'SET_BBOX', payload: bbox })
    dispatch({ type: 'FETCH_START' })
    try {
      const analysis = await analyzeZone(bbox)
      dispatch({ type: 'FETCH_SUCCESS', payload: analysis })

      // Fire AI insight request in parallel (non-blocking)
      dispatch({ type: 'AI_FETCH_START' })
      fetchAiInsight(analysis)
        .then((aiResult) => dispatch({ type: 'AI_FETCH_SUCCESS', payload: aiResult }))
        .catch((aiErr) => {
          const aiMsg =
            aiErr?.response?.data?.detail ??
            aiErr?.message ??
            'AI insight unavailable'
          dispatch({ type: 'AI_FETCH_ERROR', payload: aiMsg })
        })
    } catch (err) {
      const message =
        err?.response?.data?.detail ??
        err?.message ??
        'Failed to analyze zone. Is the backend running?'
      dispatch({ type: 'FETCH_ERROR', payload: message })
    }
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    bbox: state.bbox,
    analysis: state.analysis,
    insights: state.insights,
    aiInsight: state.aiInsight,
    aiLoading: state.aiLoading,
    aiError: state.aiError,
    loading: state.loading,
    error: state.error,
    resetCount: state.resetCount,
    setBbox,
    submitBbox,
    reset,
  }
}