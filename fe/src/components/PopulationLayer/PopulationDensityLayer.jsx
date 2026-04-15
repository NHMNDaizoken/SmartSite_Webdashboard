/**
 * PopulationDensityLayer.jsx
 * ===========================
 * Dual-mode overlay (choropleth + heatmap) showing ward-level population
 * density for HCM, HN, or Da Nang.
 *
 * Props
 * -----
 * mapInstance  {object|null}   – The live Goong Maps map instance
 * mapReady     {boolean}       – True once the map 'load' event has fired
 * visible      {boolean}       – Controlled: whether the layer is shown
 * city         {string}        – Controlled: 'hcm' | 'hn' | 'danang'
 * viewMode     {string}        – Controlled: 'choropleth' | 'heatmap'
 *
 * The toggle button, city selector, and mode buttons have been moved into the
 * header panel (AIMapPage). This component only manages map layers + renders
 * the legend overlay when visible.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPopulationDensity } from '../../services/populationService'
import { removeSourceAndLayers, setGeoJSONSource } from '../GoongMap/goongMapUtils'

// ── Constants ─────────────────────────────────────────────────────────────────

/** ColorBrewer YlOrRd-5 — low → high density */
const YLORD_PALETTE = [
  '#ffffb2', // very low   (<100)
  '#fecc5c', // low        (100–1k)
  '#fd8d3c', // medium     (1k–5k)
  '#f03b20', // high       (5k–20k)
  '#bd0026', // very high  (>20k)
]

const SOURCE_ID      = 'population-density-data'
const FILL_LAYER     = 'population-density-fill'
const HEATMAP_LAYER  = 'population-heatmap'
const HEATMAP_SOURCE = 'population-heatmap-data'

/** Fixed log-scale break points for choropleth (ng/km²) */
const FIXED_BREAKS  = [100, 1_000, 5_000, 20_000]
const LEGEND_LABELS = ['<100', '100–1k', '1k–5k', '5k–20k', '>20k']

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map density → YLORD index using fixed log-scale breaks */
function densityColorIndexLog(density) {
  for (let i = 0; i < FIXED_BREAKS.length; i++) {
    if (density < FIXED_BREAKS[i]) return i
  }
  return 4
}

/** Build choropleth FeatureCollection with pre-computed fill_color property */
function buildChoroplethGeoJSON(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => {
      const density = Number(f.properties.density_per_km2) || 0
      const idx = densityColorIndexLog(density)
      return {
        ...f,
        properties: { ...f.properties, fill_color: YLORD_PALETTE[idx] },
      }
    }),
  }
}

/** Compute the arithmetic centroid of a Polygon or MultiPolygon */
function computeCentroid(geometry) {
  let coords = []
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0]
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygon) => {
      coords = coords.concat(polygon[0])
    })
  }
  if (!coords.length) return [0, 0]
  const sumLng = coords.reduce((s, c) => s + c[0], 0)
  const sumLat = coords.reduce((s, c) => s + c[1], 0)
  return [sumLng / coords.length, sumLat / coords.length]
}

/** Build Point FeatureCollection for heatmap with log-normalised weight */
function buildHeatmapGeoJSON(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => {
      const density = Number(f.properties.density_per_km2) || 0
      const weight  = Math.log10(density + 1) / 4
      const [lng, lat] = computeCentroid(f.geometry)
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { weight },
      }
    }),
  }
}

function formatDensity(n) {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Math.round(n).toLocaleString('vi-VN')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PopulationDensityLayer({
  mapInstance,
  mapReady,
  visible  = false,
  city     = 'hcm',
  viewMode = 'choropleth',
}) {
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const layersAddedRef = useRef(false)
  const popupRef       = useRef(null)

  // ── Layer teardown ────────────────────────────────────────────────────────

  const removeLayers = useCallback(() => {
    const map = mapInstance
    if (!map) return
    if (popupRef.current) {
      popupRef.current.remove()
      popupRef.current = null
    }
    removeSourceAndLayers(map, SOURCE_ID,      [FILL_LAYER])
    removeSourceAndLayers(map, HEATMAP_SOURCE, [HEATMAP_LAYER])
    layersAddedRef.current = false
  }, [mapInstance])

  // ── Load + render (choropleth or heatmap) ─────────────────────────────────

  const loadAndRender = useCallback(async (targetCity, targetMode) => {
    const map = mapInstance
    if (!map || !mapReady) return

    setLoading(true)
    setError('')

    try {
      const geojson  = await fetchPopulationDensity(targetCity)
      const features = geojson?.features ?? []
      if (!features.length) throw new Error('Không có dữ liệu mật độ cho thành phố này.')

      if (targetMode === 'choropleth') {
        // ── Choropleth mode ──────────────────────────────────────────────────
        const painted = buildChoroplethGeoJSON(features)
        setGeoJSONSource(map, SOURCE_ID, painted)

        if (!layersAddedRef.current) {
          map.addLayer({
            id: FILL_LAYER,
            type: 'fill',
            source: SOURCE_ID,
            paint: {
              'fill-color':   ['get', 'fill_color'],
              'fill-opacity': 0.55,
            },
          })

          // Popup on click
          map.on('click', FILL_LAYER, (e) => {
            if (!e.features?.length) return
            const props    = e.features[0].properties
            const ward     = props.ward_name     ?? '—'
            const district = props.district_name ?? '—'
            const pop      = Number.isFinite(Number(props.population))
              ? Number(props.population).toLocaleString('vi-VN') : '—'
            const density  = formatDensity(Number(props.density_per_km2))
            const area     = Number.isFinite(Number(props.area_km2))
              ? Number(props.area_km2).toFixed(2) : '—'

            const html = (
              '<div style="min-width:220px;padding:14px;font-family:inherit;">'
              + '<div style="margin-bottom:10px;">'
              + '<span style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Mật độ dân số</span>'
              + '<h3 style="margin:4px 0 0;font-size:0.95rem;color:#0f172a;">' + ward + '</h3>'
              + '<p style="margin:2px 0 0;font-size:0.8rem;color:#64748b;">' + district + '</p>'
              + '</div>'
              + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
              + '<div class="prediction-popup-score-card"><span>Dân số</span><strong>' + pop + '</strong></div>'
              + '<div class="prediction-popup-score-card"><span>Mật độ (ng/km²)</span><strong>' + density + '</strong></div>'
              + '<div class="prediction-popup-score-card"><span>Diện tích (km²)</span><strong>' + area + '</strong></div>'
              + '</div>'
              + '<p style="margin:8px 0 0;font-size:0.72rem;color:#64748b;">Nguồn: Tổng điều tra DS-NÔ 2019 (GSO)</p>'
              + '</div>'
            )

            const goongjs = window.goongjs
            if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
            if (goongjs) {
              popupRef.current = new goongjs.Popup({ maxWidth: '320px', closeOnClick: true })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map)
            }
          })

          map.on('mouseenter', FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', FILL_LAYER, () => { map.getCanvas().style.cursor = '' })

          layersAddedRef.current = true
        }
      } else {
        // ── Heatmap mode ─────────────────────────────────────────────────────
        const heatGeoJSON = buildHeatmapGeoJSON(features)
        setGeoJSONSource(map, HEATMAP_SOURCE, heatGeoJSON)

        if (!layersAddedRef.current) {
          map.addLayer({
            id:     HEATMAP_LAYER,
            type:   'heatmap',
            source: HEATMAP_SOURCE,
            paint: {
              'heatmap-weight':    ['get', 'weight'],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 3],
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,   'rgba(255,255,178,0)',
                0.2, '#fecc5c',
                0.4, '#fd8d3c',
                0.6, '#f03b20',
                0.8, '#bd0026',
                1,   '#800026',
              ],
              'heatmap-radius':  ['interpolate', ['linear'], ['zoom'], 8, 15, 14, 40],
              'heatmap-opacity': 0.75,
            },
          })

          layersAddedRef.current = true
        }
      }
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu mật độ dân số.')
      removeLayers()
    } finally {
      setLoading(false)
    }
  }, [mapInstance, mapReady, removeLayers])

  // ── React to visibility / city / viewMode changes ─────────────────────────

  useEffect(() => {
    if (!mapReady) return
    if (!visible) {
      removeLayers()
      return
    }
    // Always tear down before re-rendering (handles city AND mode switches)
    removeLayers()
    loadAndRender(city, viewMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, city, viewMode, mapReady])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => { removeLayers() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Layer visibility sync ─────────────────────────────────────────────────

  useEffect(() => {
    const map = mapInstance
    if (!map || !mapReady || !layersAddedRef.current) return
    const v = visible ? 'visible' : 'none'
    if (map.getLayer(FILL_LAYER))    map.setLayoutProperty(FILL_LAYER,    'visibility', v)
    if (map.getLayer(HEATMAP_LAYER)) map.setLayoutProperty(HEATMAP_LAYER, 'visibility', v)
  }, [visible, mapInstance, mapReady])

  // ── Render — legend overlay only ─────────────────────────────────────────

  if (!visible || loading || error || !layersAddedRef.current) {
    // Show a minimal status overlay only when loading or errored
    if (visible && (loading || error)) {
      return (
        <div className="population-layer-widget">
          {loading && (
            <div className="population-status population-loading">
              Đang tải dữ liệu mật độ…
            </div>
          )}
          {error && !loading && (
            <div className="population-status population-error">
              ⚠ {error}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="population-layer-widget">
      <div className="population-legend">
        {viewMode === 'choropleth' ? (
          <>
            <span className="population-legend-title">Mật độ (ng/km²)</span>
            <div className="population-legend-items">
              {YLORD_PALETTE.map((color, i) => (
                <div key={color} className="population-legend-item">
                  <span className="population-legend-swatch" style={{ background: color }} />
                  <span className="population-legend-range">{LEGEND_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <span className="population-legend-title">Thấp → Cao mật độ dân số</span>
        )}
        <p className="population-legend-note">Nguồn: Tổng điều tra DS-NÔ 2019 (GSO)</p>
      </div>
    </div>
  )
}
