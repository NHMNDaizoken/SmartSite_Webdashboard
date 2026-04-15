/**
 * AIMapPage.jsx
 * Full grid data map using Goong Maps (Vietnamese vector tiles).
 * Features:
 *   - City / District / Ward cascading dropdowns
 *   - Selecting a location flies the map to that area + highlights boundary
 *   - GeoJSON grid overlay with opportunity score coloring
 *   - Click grid cell to see popup details
 *   - Paginated list below the map
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import GoongMap from '../GoongMap/GoongMap'
import {
  flyToCenter,
  setGeoJSONSource,
  removeSourceAndLayers,
  addBoundaryLayer,
} from '../GoongMap/goongMapUtils'
import {
  CITIES,
  getDistrictsByCity,
  getWardsByDistrict,
} from '../../data/administrativeData'
import { loadCitySpatialLayer } from '../../services/mapService'
import PopulationDensityLayer from '../PopulationLayer/PopulationDensityLayer'

// ── Constants ────────────────────────────────────────────────────────────────

const SORT_FIELDS = [
  { value: 'cafeCount', label: 'Số quán' },
  { value: 'totalReviews', label: 'Lượt đánh giá' },
  { value: 'opportunityScore', label: 'Điểm tiềm năng' },
  { value: 'ntlMean', label: 'Ánh sáng đêm (NTL)' },
  { value: 'gridId', label: 'Mã ô lưới' },
]

const ITEMS_PER_PAGE = 10
const MAX_MAP_FEATURES = Infinity

// Shared opportunity palette: đỏ (thấp) → cam → vàng → xanh lá → xanh đậm (cao)
// Dùng chung cho cả density grid và point mode để dễ so sánh
const OPPORTUNITY_PALETTE = [
  '#dc2626', // 0.0 – tiềm năng rất thấp (đỏ)
  '#f97316', // 0.25 – thấp (cam)
  '#facc15', // 0.5  – trung bình (vàng)
  '#4ade80', // 0.75 – tốt (xanh lá)
  '#0f766e', // 1.0  – rất tốt (xanh đậm)
]

const DENSITY_PALETTE = OPPORTUNITY_PALETTE // alias cũ giữ để không vỡ code

const MAP_MODES = [
  { value: 'density', label: '▦ Mật độ', title: 'Chế độ mật độ: tô màu ô lưới liền nhau theo điểm tiềm năng' },
  { value: 'points', label: '● Điểm', title: 'Chế độ điểm: hiển thị tọa độ từng ô, màu theo điểm tiềm năng' },
]

const numberFmt = new Intl.NumberFormat('vi-VN')

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCityDisplayName(code) {
  const city = CITIES.find((item) => item.code === code)
  return city?.name || code
}

function formatVal(value, digits = 0, fallback = '-') {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return digits > 0 ? parsed.toFixed(digits) : numberFmt.format(Math.round(parsed))
}

function hasProcessedSignal(item) {
  return (
    (Number(item.cafeCount) || 0) > 0 ||
    (Number(item.totalReviews) || 0) > 0 ||
    (Number(item.poiDensity) || 0) > 0
  )
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function metricRange(items, metricKey) {
  const values = items
    .map((item) => Number(item?.[metricKey]))
    .filter((value) => Number.isFinite(value))
  if (!values.length) return { min: 0, max: 1 }
  return { min: Math.min(...values), max: Math.max(...values) }
}

function interpolateColor(startHex, endHex, t) {
  const safeT = Math.max(0, Math.min(1, t))
  const start = startHex.match(/\w\w/g).map((hex) => parseInt(hex, 16))
  const end = endHex.match(/\w\w/g).map((hex) => parseInt(hex, 16))
  const mixed = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * safeT)
  )
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function getMetricFillColor(value, range, palette) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '#94a3b8'
  if (range.max <= range.min) return palette[Math.floor(palette.length / 2)]
  const normalized = Math.max(0, Math.min(1, (numericValue - range.min) / (range.max - range.min)))
  // Multi-stop interpolation qua toàn bộ palette
  const stops = palette.length - 1
  const segment = Math.min(Math.floor(normalized * stops), stops - 1)
  const t = (normalized * stops) - segment
  return interpolateColor(palette[segment], palette[segment + 1], t)
}

function polygonToGeoJSON(polygon) {
  if (!polygon?.length) return null
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [polygon] },
    properties: {},
  }
}

function buildGridGeoJSON(features, opportunityRange, palette) {
  return {
    type: 'FeatureCollection',
    features: features.map((item) => {
      const step5Score = item.opportunityScore
      const color = getMetricFillColor(step5Score, opportunityRange, palette)
      return {
        type: 'Feature',
        geometry: item.geometry,
        properties: {
          gridId: item.gridId,
          color: color,
          opportunityScore: step5Score ?? 0,
          cafeCount: item.cafeCount ?? 0,
          totalReviews: item.totalReviews ?? 0,
          ntlMean: item.ntlMean ?? 0,
          poiDensity: item.poiDensity ?? 0,
          avgSentiment: item.avgSentiment ?? 0,
          avgRating: item.avgRating ?? 0,
          opportunityScoreSource: item.opportunityScoreSource ?? null,
          predictionLabelName: item.predictionLabelName ?? null,
          city: item.city ?? '',
          lat: item.lat,
          lng: item.lng,
        },
      }
    }),
  }
}

function buildPointsGeoJSON(features, opportunityRange, palette) {
  return {
    type: 'FeatureCollection',
    features: features
      .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
      .map((item) => {
        const step5Score = item.opportunityScore
        const color = getMetricFillColor(step5Score, opportunityRange, palette)
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number(item.lng), Number(item.lat)] },
          properties: {
            gridId: item.gridId,
            color: color,
            opportunityScore: step5Score ?? 0,
            cafeCount: item.cafeCount ?? 0,
            totalReviews: item.totalReviews ?? 0,
            ntlMean: item.ntlMean ?? 0,
            poiDensity: item.poiDensity ?? 0,
            avgSentiment: item.avgSentiment ?? 0,
            avgRating: item.avgRating ?? 0,
            opportunityScoreSource: item.opportunityScoreSource ?? null,
            predictionLabelName: item.predictionLabelName ?? null,
            city: item.city ?? '',
            lat: item.lat,
            lng: item.lng,
          },
        }
      }),
  }
}

function buildPageItems(totalPages, currentPage) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const compact = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) compact.push('ellipsis')
    compact.push(sorted[i])
  }
  return compact
}

function buildPopupHTML(props) {
  const lat = formatVal(props.lat, 5)
  const lng = formatVal(props.lng, 5)
  const scoreDisplay = formatVal(props.opportunityScore, 1)
  const source = props.opportunityScoreSource ? String(props.opportunityScoreSource) : '-'
  return (
    '<div style="min-width:240px;padding:14px;font-family:inherit;">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">'
    + '<div>'
    + '<span style="font-size:0.72rem;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">To\u0323a \u0111\u1ed9</span>'
    + '<h3 style="margin:4px 0 0;font-size:0.95rem;font-family:monospace;color:#0f172a;">' + lat + ', ' + lng + '</h3>'
    + '</div>'
    + '<span class="prediction-popup-badge">' + getCityDisplayName(props.city) + '</span>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
    + '<div class="prediction-popup-score-card"><span>S\u1ed1 qu\u00e1n</span><strong>' + formatVal(props.cafeCount) + '</strong></div>'
    + '<div class="prediction-popup-score-card"><span>L\u01b0\u1ee3t \u0111\u00e1nh gi\u00e1</span><strong>' + formatVal(props.totalReviews) + '</strong></div>'
    + '<div class="prediction-popup-score-card"><span>\u0110i\u1ec3m ti\u1ec1m n\u0103ng</span><strong>' + scoreDisplay + '</strong></div>'
    + '<div class="prediction-popup-score-card"><span>NTL</span><strong>' + formatVal(props.ntlMean, 2) + '</strong></div>'
    + '</div>'
    + '<div style="margin-top:8px;font-size:0.75rem;color:#64748b;">Ngu\u1ed3n \u0111i\u1ec3m: ' + source + '</div>'
    + '</div>'
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AIMapPage({ onSelectCity }) {
  const [mapCity, setMapCity] = useState('DaNang')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedWard, setSelectedWard] = useState('')

  const [features, setFeatures] = useState([])
  const [loadedLayerKey, setLoadedLayerKey] = useState('')
  const [loadError, setLoadError] = useState('')

  const [minCafeCount, setMinCafeCount] = useState('')
  const [maxCafeCount, setMaxCafeCount] = useState('')
  const [sortField, setSortField] = useState('cafeCount')
  const [sortDirection, setSortDirection] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Chế độ bản đồ: 'density' (grid ô vuông) hoặc 'points' (điểm tọa độ)
  const [mapMode, setMapMode] = useState('density')

  // Population density layer — controlled from header panel
  const [popDensityVisible, setPopDensityVisible] = useState(false)
  const [popDensityMode, setPopDensityMode] = useState('choropleth')
  // Map city code từ bản đồ thị trường → population API
  const popDensityCity = useMemo(() => {
    const map = { HCM: 'hcm', HaNoi: 'hn', DaNang: 'danang' }
    return map[mapCity] ?? 'hcm'
  }, [mapCity])

  const mapInstanceRef = useRef(null)
  const popupRef = useRef(null)
  const gridLayersAdded = useRef(false)
  const pointLayersAdded = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapInstance, setMapInstance] = useState(null)

  const layerType = 'full'
  const currentLayerKey = `${mapCity}-${layerType}`
  const loading = loadedLayerKey !== currentLayerKey

  // ── Derived data ─────────────────────────────────────────────────────────

  const districts = useMemo(() => getDistrictsByCity(mapCity), [mapCity])
  const wards = useMemo(
    () => (selectedDistrict ? getWardsByDistrict(mapCity, selectedDistrict) : []),
    [mapCity, selectedDistrict]
  )

  const processedFeatures = useMemo(
    () => features.filter(hasProcessedSignal),
    [features]
  )

  const visibleFeatures = useMemo(() => {
    const minCafe = minCafeCount === '' ? null : Math.max(0, asNumber(minCafeCount, 0))
    const maxCafe = maxCafeCount === '' ? null : Math.max(0, asNumber(maxCafeCount, 0))
    return processedFeatures.filter((item) => {
      if (minCafe !== null && asNumber(item.cafeCount, 0) < minCafe) return false
      if (maxCafe !== null && asNumber(item.cafeCount, 0) > maxCafe) return false
      return true
    })
  }, [maxCafeCount, minCafeCount, processedFeatures])

  const sortedFeatures = useMemo(() => {
    const rows = [...visibleFeatures]
    const isAsc = sortDirection === 'asc'
    rows.sort((a, b) => {
      let base
      if (sortField === 'gridId') {
        base = String(a.gridId).localeCompare(String(b.gridId))
      } else {
        const valA = sortField === 'opportunityScore'
          ? asNumber(a?.opportunityScore, 0)
          : asNumber(a?.[sortField], 0)
        const valB = sortField === 'opportunityScore'
          ? asNumber(b?.opportunityScore, 0)
          : asNumber(b?.[sortField], 0)
        base = valA - valB
      }
      const cmp = isAsc ? base : base * -1
      return cmp !== 0 ? cmp : String(a.gridId).localeCompare(String(b.gridId))
    })
    return rows
  }, [sortDirection, sortField, visibleFeatures])

  const opportunityRange = useMemo(() => metricRange(sortedFeatures, 'opportunityScore'), [sortedFeatures])
  const mapFeatures = useMemo(() => sortedFeatures.slice(0, MAX_MAP_FEATURES), [sortedFeatures])
  const isMapRenderLimited = sortedFeatures.length > MAX_MAP_FEATURES

  const totalItems = sortedFeatures.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))

  // safePage: clamp currentPage vào [1, totalPages] — đặt trước pageItems/pagedFeatures
  const safePage = Math.max(1, Math.min(currentPage, totalPages))

  const pageItems = useMemo(() => buildPageItems(totalPages, safePage), [totalPages, safePage])
  const pagedFeatures = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE
    return sortedFeatures.slice(start, start + ITEMS_PER_PAGE)
  }, [safePage, sortedFeatures])

  const citySummary = useMemo(() => {
    if (!sortedFeatures.length) return { cafeCount: 0, reviews: 0, avgNtl: 0, avgPoi: 0 }
    const t = sortedFeatures.reduce(
      (a, item) => {
        a.cafeCount += Number(item.cafeCount) || 0
        a.reviews += Number(item.totalReviews) || 0
        a.ntl += Number(item.ntlMean) || 0
        a.poi += Number(item.poiDensity) || 0
        return a
      },
      { cafeCount: 0, reviews: 0, ntl: 0, poi: 0 }
    )
    return { cafeCount: t.cafeCount, reviews: t.reviews, avgNtl: t.ntl / sortedFeatures.length, avgPoi: t.poi / sortedFeatures.length }
  }, [sortedFeatures])

  const activeFilterChips = useMemo(() => {
    const sel = SORT_FIELDS.find((i) => i.value === sortField)
    const chips = [`Sắp xếp: ${sel?.label || 'Số quán'} (${sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'})`]
    if (minCafeCount !== '') chips.push(`Số quán >= ${formatVal(minCafeCount, 0)}`)
    if (maxCafeCount !== '') chips.push(`Số quán <= ${formatVal(maxCafeCount, 0)}`)
    const di = districts.find((d) => d.code === selectedDistrict)
    if (di) chips.push(`Quận: ${di.name}`)
    const wi = wards.find((w) => w.code === selectedWard)
    if (wi) chips.push(`Phường: ${wi.name}`)
    return chips
  }, [maxCafeCount, minCafeCount, sortDirection, sortField, districts, selectedDistrict, wards, selectedWard])

  const summaryCards = [
    { label: 'Thành phố', value: getCityDisplayName(mapCity) },
    { label: 'Ô lưới có dữ liệu', value: numberFmt.format(sortedFeatures.length) },
    { label: 'Tổng review', value: formatVal(citySummary.reviews) },
  ]

  // ── Load city grid data ──────────────────────────────────────────────────

  useEffect(() => {
    let m = true
    loadCitySpatialLayer(mapCity, layerType)
      .then((data) => {
        if (!m) return
        setFeatures(data)
        setLoadError('')
        setLoadedLayerKey(currentLayerKey)
      })
      .catch(() => {
        if (!m) return
        setFeatures([])
        setLoadError(`Không tải được dữ liệu cho ${getCityDisplayName(mapCity)}.`)
        setLoadedLayerKey(currentLayerKey)
      })
    return () => { m = false }
  }, [mapCity, currentLayerKey])

  // ── Update map layers (density hoặc points) ──────────────────────────────
  // Khi mode thay đổi: ẩn layer không dùng, hiện layer đang dùng

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady) return

    if (mapMode === 'density') {
      // Ẩn point layers
      if (map.getLayer('points-circle')) map.setLayoutProperty('points-circle', 'visibility', 'none')
      if (map.getLayer('points-circle-stroke')) map.setLayoutProperty('points-circle-stroke', 'visibility', 'none')
      // Hiện density layers
      if (map.getLayer('grid-fill')) map.setLayoutProperty('grid-fill', 'visibility', 'visible')
      if (map.getLayer('grid-outline')) map.setLayoutProperty('grid-outline', 'visibility', 'visible')
    } else {
      // Ẩn density layers
      if (map.getLayer('grid-fill')) map.setLayoutProperty('grid-fill', 'visibility', 'none')
      if (map.getLayer('grid-outline')) map.setLayoutProperty('grid-outline', 'visibility', 'none')
      // Hiện point layers
      if (map.getLayer('points-circle')) map.setLayoutProperty('points-circle', 'visibility', 'visible')
      if (map.getLayer('points-circle-stroke')) map.setLayoutProperty('points-circle-stroke', 'visibility', 'visible')
    }
  }, [mapMode, mapReady])

  // ── Sync density grid layer ───────────────────────────────────────────────

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady || !mapFeatures.length) return

    const geojson = buildGridGeoJSON(mapFeatures, opportunityRange, OPPORTUNITY_PALETTE)
    setGeoJSONSource(map, 'grid-data', geojson)

    if (!gridLayersAdded.current) {
      map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid-data',
        layout: { visibility: mapMode === 'density' ? 'visible' : 'none' },
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.72 },
      })
      map.addLayer({
        id: 'grid-outline',
        type: 'line',
        source: 'grid-data',
        layout: { visibility: mapMode === 'density' ? 'visible' : 'none' },
        paint: { 'line-color': 'rgba(15, 23, 42, 0.12)', 'line-width': 0.3 },
      })

      map.on('click', 'grid-fill', (e) => {
        if (!e.features?.length) return
        const props = e.features[0].properties
        const goongjs = window.goongjs
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
        popupRef.current = new goongjs.Popup({ maxWidth: '380px', closeOnClick: true })
          .setLngLat(e.lngLat)
          .setHTML(buildPopupHTML(props))
          .addTo(map)
      })

      map.on('mouseenter', 'grid-fill', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'grid-fill', () => { map.getCanvas().style.cursor = '' })

      gridLayersAdded.current = true
    }
  }, [mapFeatures, opportunityRange, mapReady, mapMode])

  // ── Sync points layer ─────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !mapReady || !mapFeatures.length) return

    const geojson = buildPointsGeoJSON(mapFeatures, opportunityRange, OPPORTUNITY_PALETTE)
    setGeoJSONSource(map, 'points-data', geojson)

    if (!pointLayersAdded.current) {
      // Vòng ngoài (stroke) để điểm nổi bật trên nền bản đồ
      map.addLayer({
        id: 'points-circle-stroke',
        type: 'circle',
        source: 'points-data',
        layout: { visibility: mapMode === 'points' ? 'visible' : 'none' },
        paint: {
          'circle-radius': 7,
          'circle-color': '#ffffff',
          'circle-opacity': 0.85,
        },
      })
      // Điểm chính màu theo tiềm năng
      map.addLayer({
        id: 'points-circle',
        type: 'circle',
        source: 'points-data',
        layout: { visibility: mapMode === 'points' ? 'visible' : 'none' },
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.92,
        },
      })

      map.on('click', 'points-circle', (e) => {
        if (!e.features?.length) return
        const props = e.features[0].properties
        const goongjs = window.goongjs
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
        popupRef.current = new goongjs.Popup({ maxWidth: '380px', closeOnClick: true })
          .setLngLat(e.lngLat)
          .setHTML(buildPopupHTML(props))
          .addTo(map)
      })

      map.on('mouseenter', 'points-circle', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'points-circle', () => { map.getCanvas().style.cursor = '' })

      pointLayersAdded.current = true
    }
  }, [mapFeatures, opportunityRange, mapReady, mapMode])

  // ── Administrative area fly/highlight ──────────────────────────────────────

  const handleFlyToArea = useCallback((polygon, center, zoomLevel) => {
    const map = mapInstanceRef.current
    if (!map) return

    removeSourceAndLayers(map, 'area-boundary', ['area-boundary-fill', 'area-boundary-fill-outline'])

    if (polygon) {
      const geo = polygonToGeoJSON(polygon)
      if (geo) {
        setGeoJSONSource(map, 'area-boundary', geo)
        addBoundaryLayer(map, 'area-boundary', 'area-boundary-fill', '#0f766e', 0.12)
      }
    }

    if (center) {
      flyToCenter(map, [center[1], center[0]], zoomLevel ?? 13, 1200)
    }
  }, [])

  function handleCityChange(nextCity) {
    setSelectedDistrict('')
    setSelectedWard('')
    setLoadError('')
    setMapCity(nextCity)
      onSelectCity?.(nextCity)

    // Remove all map layers so they get re-added for new city data
    const map = mapInstanceRef.current
    if (map) {
      removeSourceAndLayers(map, 'grid-data', ['grid-fill', 'grid-outline'])
      removeSourceAndLayers(map, 'points-data', ['points-circle-stroke', 'points-circle'])
      removeSourceAndLayers(map, 'area-boundary', ['area-boundary-fill', 'area-boundary-fill-outline'])
      gridLayersAdded.current = false
      pointLayersAdded.current = false
    }

    const cityInfo = CITIES.find((c) => c.code === nextCity)
    if (cityInfo) handleFlyToArea(null, cityInfo.center, 12)
  }

  function handleDistrictChange(districtCode) {
    setSelectedDistrict(districtCode)
    setSelectedWard('')
    if (!districtCode) {
      const cityInfo = CITIES.find((c) => c.code === mapCity)
      if (cityInfo) handleFlyToArea(null, cityInfo.center, 12)
      return
    }
    const district = districts.find((d) => d.code === districtCode)
    if (district) handleFlyToArea(district.polygon, district.center, 14)
  }

  function handleWardChange(wardCode) {
    setSelectedWard(wardCode)
    if (!wardCode) {
      const district = districts.find((d) => d.code === selectedDistrict)
      if (district) handleFlyToArea(district.polygon, district.center, 14)
      return
    }
    const ward = wards.find((w) => w.code === wardCode)
    if (ward) handleFlyToArea(ward.polygon, ward.center, 16)
  }

  function handleListItemClick(item) {
    const map = mapInstanceRef.current
    if (!map) return
    const lat = Number(item.lat), lng = Number(item.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    flyToCenter(map, [lng, lat], 16, 800)
    const goongjs = window.goongjs
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
    popupRef.current = new goongjs.Popup({ maxWidth: '380px' })
      .setLngLat([lng, lat])
      .setHTML(buildPopupHTML(item))
      .addTo(map)
  }

  // ── Map ready ─────────────────────────────────────────────────────────────

  const handleMapReady = useCallback((map) => {
    mapInstanceRef.current = map
    const cityInfo = CITIES.find((c) => c.code === 'DaNang')
    if (cityInfo) flyToCenter(map, [cityInfo.center[1], cityInfo.center[0]], 12, 0)
    setMapInstance(map)
    setMapReady(true)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="prediction-page">
      {/* Header */}
      <section className="glass-panel prediction-header-panel">
        <div className="prediction-header-row">
          <div>
            <h3 className="panel-title">Bản đồ thị trường</h3>
            <p className="panel-subtitle">Chọn khu vực để khám phá · Goong Maps Việt Nam</p>
            {/* Toggle chế độ bản đồ */}
            <div className="map-mode-toggle" style={{ marginTop: 12 }}>
              {MAP_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={`map-mode-btn${mapMode === mode.value ? ' active' : ''}`}
                  title={mode.title}
                  onClick={() => setMapMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className="prediction-summary-strip">
            {summaryCards.map((item) => (
              <div key={item.label} className="prediction-summary-card">
                <span className="prediction-summary-label">{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Location dropdowns: City → District → Ward */}
        <div className="prediction-controls" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="prediction-control-group">
            <span className="prediction-control-label">Thành phố</span>
            <select className="ai-select" value={mapCity} onChange={(e) => handleCityChange(e.target.value)}>
              {CITIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="prediction-control-group">
            <span className="prediction-control-label">Quận / Huyện</span>
            <select className="ai-select" value={selectedDistrict} onChange={(e) => handleDistrictChange(e.target.value)}>
              <option value="">— Tất cả quận —</option>
              {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </div>
          <div className="prediction-control-group">
            <span className="prediction-control-label">Phường / Xã</span>
            <select className="ai-select" value={selectedWard} onChange={(e) => handleWardChange(e.target.value)} disabled={!selectedDistrict || !wards.length}>
              <option value="">{!selectedDistrict ? '— Chọn quận trước —' : wards.length === 0 ? '— Chưa có dữ liệu —' : '— Tất cả phường —'}</option>
              {wards.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div className="prediction-active-filters">
          {activeFilterChips.map((chip) => <span key={chip} className="prediction-active-chip">{chip}</span>)}
        </div>

        {/* Population density controls */}
        <div className="pop-density-header-row">
          <button
            type="button"
            className={`population-toggle-btn${popDensityVisible ? ' active' : ''}`}
            onClick={() => setPopDensityVisible((v) => !v)}
          >
            <span className="population-toggle-icon">👥</span>
            <span className="population-toggle-label">Mật độ dân số</span>
            <span className={`population-toggle-badge${popDensityVisible ? ' on' : ''}`}>
              {popDensityVisible ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {popDensityVisible && (
            <div className="map-mode-toggle pop-density-mode-toggle">
              <button
                type="button"
                className={`map-mode-btn${popDensityMode === 'choropleth' ? ' active' : ''}`}
                onClick={() => setPopDensityMode('choropleth')}
              >
                Ranh giới
              </button>
              <button
                type="button"
                className={`map-mode-btn${popDensityMode === 'heatmap' ? ' active' : ''}`}
                onClick={() => setPopDensityMode('heatmap')}
              >
                Nhiệt độ
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Map */}
      <section className="glass-panel prediction-map-panel">
        {(loading || loadError) && (
          <div className="ai-map-loading">{loading ? 'Đang tải dữ liệu bản đồ...' : loadError}</div>
        )}
        {isMapRenderLimited && (
          <div className="prediction-map-note">
            Đang hiển thị {numberFmt.format(MAX_MAP_FEATURES)} / {numberFmt.format(sortedFeatures.length)} ô trên bản đồ.
          </div>
        )}
        <GoongMap center={[108.2022, 16.0544]} zoom={12} className="prediction-map" onMapReady={handleMapReady} />
        <PopulationDensityLayer
          mapInstance={mapInstance}
          mapReady={mapReady}
          visible={popDensityVisible}
          city={popDensityCity}
          viewMode={popDensityMode}
        />
      </section>

      {/* List */}
      <section className="glass-panel prediction-list-panel">
        <div className="panel-header">
          <h3 className="panel-title">Tổng quan khu vực</h3>
          <p className="panel-subtitle">Thông tin khu vực và các ô nổi bật</p>
        </div>

        <div className="overview-mini-grid">
          <div className="overview-mini-card"><div className="overview-mini-label">Ô lưới có dữ liệu</div><div className="overview-mini-value">{numberFmt.format(sortedFeatures.length)}</div></div>
          <div className="overview-mini-card"><div className="overview-mini-label">Số quán</div><div className="overview-mini-value">{formatVal(citySummary.cafeCount)}</div></div>
          <div className="overview-mini-card"><div className="overview-mini-label">Tổng đánh giá</div><div className="overview-mini-value">{formatVal(citySummary.reviews)}</div></div>
          <div className="overview-mini-card"><div className="overview-mini-label">NTL trung bình</div><div className="overview-mini-value">{formatVal(citySummary.avgNtl, 2)}</div></div>
        </div>

        <div className="overview-city-ranking">
          <div className="chart-bar-meta" style={{ marginTop: 20 }}>
            <span>Thang màu tiềm năng (dùng chung cho cả 2 chế độ bản đồ)</span>
            <strong>{formatVal(opportunityRange.min, 1)} &#8594; {formatVal(opportunityRange.max, 1)}</strong>
          </div>
          {/* Legend gradient 5 màu */}
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                height: 10,
                borderRadius: 6,
                background: `linear-gradient(90deg, ${OPPORTUNITY_PALETTE.join(', ')})`,
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              {['Rất thấp', 'Thấp', 'Trung bình', 'Tốt', 'Rất tốt'].map((label, i) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === 4 ? 'flex-end' : 'center', gap: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: OPPORTUNITY_PALETTE[i], border: '1.5px solid rgba(0,0,0,0.12)' }} />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8, marginBottom: 0 }}>
            {mapMode === 'density'
              ? '▦ Chế độ Mật độ: ô lưới tô liền kề, dễ nhìn vùng tiềm năng cao/thấp'
              : '● Chế độ Điểm: mỗi ô hiện 1 điểm tại tọa độ tâm, cùng thang màu'}
          </p>
          <p style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: 6, marginBottom: 0 }}>
            Điểm hiển thị lấy trực tiếp từ Step 5 (artifact prediction), không dùng điểm hiệu chỉnh UI.
          </p>
        </div>

        <div className="prediction-filter-tools" style={{ marginTop: 24 }}>
          <div className="prediction-filter-item">
            <span className="prediction-control-label">Bộ lọc</span>
            <div className="prediction-sort-controls">
              <select className="ai-select" value={sortField} onChange={(e) => setSortField(e.target.value)}>
                {SORT_FIELDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" className="sort-direction-btn" onClick={() => setSortDirection((c) => (c === 'asc' ? 'desc' : 'asc'))} title={sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'}>
                <span className={`sort-direction-icon ${sortDirection}`} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="prediction-filter-item">
            <span className="prediction-control-label">Số quán tối thiểu</span>
            <input className="ai-select" type="number" min="0" placeholder="Ví dụ: 3" value={minCafeCount} onChange={(e) => setMinCafeCount(e.target.value)} />
          </div>
          <div className="prediction-filter-item">
            <span className="prediction-control-label">Số quán tối đa</span>
            <input className="ai-select" type="number" min="0" placeholder="Ví dụ: 15" value={maxCafeCount} onChange={(e) => setMaxCafeCount(e.target.value)} />
          </div>
        </div>

        <div className="pagination-controls" style={{ marginTop: 16, justifyContent: 'space-between' }}>
          <span className="prediction-control-label" style={{ marginBottom: 0 }}>
            Hiển thị {totalItems === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safePage * ITEMS_PER_PAGE, totalItems)} / {totalItems}
          </span>
          <div className="pagination-pages">
            <button type="button" className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Trước</button>
            {pageItems.map((item, i) =>
              item === 'ellipsis'
                ? <span key={`e${i}`} className="pagination-ellipsis">...</span>
                : <button key={item} type="button" className={`pagination-page ${safePage === item ? 'active' : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
            )}
            <button type="button" className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Sau</button>
          </div>
        </div>

        <div className="prediction-list-scroll" style={{ marginTop: 24 }}>
          {pagedFeatures.length === 0 ? (
            <div className="prediction-empty-state">Không có địa điểm nào phù hợp bộ lọc hiện tại.</div>
          ) : (
            <div className="prediction-location-list">
              {pagedFeatures.map((item, index) => (
                <button key={item.gridId} type="button" className="prediction-location-card" onClick={() => handleListItemClick(item)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                  <div className="prediction-location-head">
                    <div>
                      <span className="prediction-location-rank">#{(safePage - 1) * ITEMS_PER_PAGE + index + 1}</span>
                      <h4>{item.gridId}</h4>
                      <p>{getCityDisplayName(item.city)}</p>
                    </div>
                    <div className="prediction-location-score"><span>Điểm quán</span><strong>{formatVal(item.cafeCount, 0)}</strong></div>
                  </div>
                  <div className="prediction-location-meta">
                    <span>Số quán {formatVal(item.cafeCount)}</span>
                    <span>Đánh giá {formatVal(item.totalReviews)}</span>
                    <span>NTL {formatVal(item.ntlMean, 1)}</span>
                    <span>Mật độ POI {formatVal(item.poiDensity, 1)}</span>
                  </div>
                  <div className="prediction-location-stats">
                    <div><span>Điểm tiềm năng</span><strong>{formatVal(item.opportunityScore, 1)}</strong></div>
                    <div><span>Thành phố</span><strong>{getCityDisplayName(item.city)}</strong></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
