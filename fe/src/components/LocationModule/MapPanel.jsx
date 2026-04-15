/**
 * MapPanel.jsx
 * Goong Maps with interactive bounding-box draw.
 * User clicks twice (SW corner then NE corner) to define a bbox.
 * Calls onBboxSubmit when confirmed.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import GoongMap from '../GoongMap/GoongMap'
import {
    setGeoJSONSource,
    removeSourceAndLayers,
  } from '../GoongMap/goongMapUtils'

const DEFAULT_CENTER = [108.206, 16.047] // [lng, lat] Da Nang
const DEFAULT_ZOOM = 13

const RECT_COLOR = '#0f766e'
const RECT_OPACITY_DRAFT = 0.12
const RECT_OPACITY_CONFIRMED = 0.18

// ── Helpers ──────────────────────────────────────────────────────────────────
function pointsToBbox(p1, p2) {
  return {
    min_lat: Math.min(p1[0], p2[0]),
    max_lat: Math.max(p1[0], p2[0]),
    min_lng: Math.min(p1[1], p2[1]),
    max_lng: Math.max(p1[1], p2[1]),
  }
}

function bboxToGeoJSON(bbox, fillOpacity) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [bbox.min_lng, bbox.min_lat],
        [bbox.max_lng, bbox.min_lat],
        [bbox.max_lng, bbox.max_lat],
        [bbox.min_lng, bbox.max_lat],
        [bbox.min_lng, bbox.min_lat],
      ]],
    },
    properties: { fillOpacity },
  }
}

function formatCoord(n) {
  return n == null ? '—' : n.toFixed(5)
}

// ── Component ────────────────────────────────────────────────────────────────
export default function MapPanel({ onBboxSubmit, loading, confirmedBbox }) {
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState([])  // up to 2 [lat, lng] pairs
  const [draftBbox, setDraftBbox] = useState(null)
  const mapRef = useRef(null)
  const rectLayerAdded = useRef(false)

  // Sync rectangle on map
  const syncRectangle = useCallback((bbox, confirmed) => {
    const map = mapRef.current
    if (!map) return

    if (!bbox) {
      removeSourceAndLayers(map, 'draw-rect', ['draw-rect-fill', 'draw-rect-fill-outline'])
      rectLayerAdded.current = false
      return
    }

    const fillOpacity = confirmed ? RECT_OPACITY_CONFIRMED : RECT_OPACITY_DRAFT
    const geojson = bboxToGeoJSON(bbox, fillOpacity)

    setGeoJSONSource(map, 'draw-rect', geojson)

    if (!rectLayerAdded.current) {
      map.addLayer({
        id: 'draw-rect-fill',
        type: 'fill',
        source: 'draw-rect',
        paint: {
          'fill-color': RECT_COLOR,
          'fill-opacity': ['get', 'fillOpacity'],
        },
      })
      map.addLayer({
        id: 'draw-rect-outline',
        type: 'line',
        source: 'draw-rect',
        paint: {
          'line-color': RECT_COLOR,
          'line-width': 2,
          'line-dasharray': confirmed ? [1, 0] : [6, 4],
        },
      })
      rectLayerAdded.current = true
    } else {
      // Update outline dash
      map.setPaintProperty('draw-rect-outline', 'line-dasharray', confirmed ? [1, 0] : [6, 4])
    }
  }, [])

  // Update rectangle when bbox changes
  const activeBbox = draftBbox ?? confirmedBbox
  const confirmed = !draftBbox && !!confirmedBbox

  useEffect(() => {
    syncRectangle(activeBbox, confirmed)
  }, [activeBbox, confirmed, syncRectangle])

  // Map click handler
  const handleMapClick = useCallback((e) => {
    if (!drawing) return
    const pt = [e.lngLat.lat, e.lngLat.lng]
    setPoints((prev) => {
      const next = [...prev, pt]
      if (next.length === 1) return next
      // Two points → form bbox
      const bbox = pointsToBbox(next[0], next[1])
      setDraftBbox(bbox)
      setDrawing(false)
      return []
    })
  }, [drawing])

  function handleStartDraw() {
    setDrawing(true)
    setPoints([])
    setDraftBbox(null)
  }

  function handleCancelDraw() {
    setDrawing(false)
    setPoints([])
    setDraftBbox(null)
  }

  function handleConfirm() {
    if (!draftBbox) return
    onBboxSubmit(draftBbox)
  }

  const handleMapReady = useCallback((map) => {
    mapRef.current = map
  }, [])

  return (
    <div className="lm-map-panel">
      {/* Toolbar */}
      <div className="lm-map-toolbar">
        <span className="lm-map-toolbar-title">
          {drawing
            ? points.length === 0
              ? '📍 Nhấn vào góc đầu tiên…'
              : '📍 Nhấn vào góc đối diện…'
            : draftBbox
            ? '✅ Đã vẽ vùng — xác nhận để phân tích'
            : confirmed
            ? '🔒 Vùng đã xác nhận'
            : 'Vẽ vùng để phân tích'}
        </span>

        <div className="lm-map-toolbar-actions">
          {!drawing && !draftBbox && (
            <button
              type="button"
              className="lm-btn lm-btn--primary"
              onClick={handleStartDraw}
              disabled={loading}
            >
              ✏ Vẽ vùng
            </button>
          )}

          {drawing && (
            <button
              type="button"
              className="lm-btn lm-btn--ghost"
              onClick={handleCancelDraw}
            >
              Hủy
            </button>
          )}

          {draftBbox && !drawing && (
            <>
              <button
                type="button"
                className="lm-btn lm-btn--ghost"
                onClick={handleCancelDraw}
              >
                Vẽ lại
              </button>
              <button
                type="button"
                className="lm-btn lm-btn--primary"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Đang phân tích…' : 'Phân tích vùng'}
              </button>
            </>
          )}

          {confirmed && !draftBbox && (
            <button
              type="button"
              className="lm-btn lm-btn--ghost"
              onClick={handleStartDraw}
              disabled={loading}
            >
              Vẽ lại
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="lm-map-container" style={{ cursor: drawing ? 'crosshair' : 'grab' }}>
        <GoongMap
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="lm-leaflet"
          onMapReady={handleMapReady}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Coordinate readout */}
      {activeBbox && (
        <div className="lm-map-coords">
          <span>SW: {formatCoord(activeBbox.min_lat)}, {formatCoord(activeBbox.min_lng)}</span>
          <span>NE: {formatCoord(activeBbox.max_lat)}, {formatCoord(activeBbox.max_lng)}</span>
        </div>
      )}
    </div>
  )
}