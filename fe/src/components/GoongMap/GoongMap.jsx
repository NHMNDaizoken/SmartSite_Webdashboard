/**
 * GoongMap.jsx
 * React wrapper component for Goong JS (WebGL vector map for Vietnam).
 * Replaces Leaflet with native Vietnamese map tiles, labels, and styling.
 *
 * Usage:
 *   <GoongMap center={[lng, lat]} zoom={12} onMapReady={(map) => {...}} />
 */
import { useEffect, useRef } from 'react'

// Maptiles key — set in .env as VITE_GOONG_MAPTILES_KEY
// Get your free key at https://account.goong.io
const GOONG_MAPTILES_KEY = import.meta.env.VITE_GOONG_MAPTILES_KEY || ''
const GOONG_STYLE_URL = 'https://tiles.goong.io/assets/goong_map_web.json'

/**
 * Initialize goongjs once. We load it from CDN via index.html,
 * so it's available as window.goongjs.
 */
function getGoongJS() {
  const gjs = window.goongjs
  if (!gjs) {
    console.error('goongjs not found on window. Make sure the CDN script is loaded in index.html.')
    return null
  }
  if (!GOONG_MAPTILES_KEY) {
    console.error(
      'VITE_GOONG_MAPTILES_KEY is not set!\n' +
      'Create a .env file in the fe/ folder with:\n' +
      '  VITE_GOONG_MAPTILES_KEY=your_key_here\n' +
      'Get your free key at https://account.goong.io'
    )
    return null
  }
  if (!gjs._accessTokenSet) {
    gjs.accessToken = GOONG_MAPTILES_KEY
    gjs._accessTokenSet = true
  }
  return gjs
}

export default function GoongMap({
  center = [108.2022, 16.0544],  // [lng, lat] — Da Nang default
  zoom = 12,
  style: mapStyle,
  className = '',
  onMapReady,
  onMapClick,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const onMapReadyRef = useRef(onMapReady)
  const onMapClickRef = useRef(onMapClick)

  // Keep refs up to date
  onMapReadyRef.current = onMapReady
  onMapClickRef.current = onMapClick

  useEffect(() => {
    const goongjs = getGoongJS()
    if (!goongjs || !containerRef.current) return

    const map = new goongjs.Map({
      container: containerRef.current,
      style: mapStyle || GOONG_STYLE_URL,
      center: center,
      zoom: zoom,
      attributionControl: true,
      preserveDrawingBuffer: true,
    })

    map.addControl(new goongjs.NavigationControl(), 'top-right')

    map.on('load', () => {
      mapRef.current = map
      onMapReadyRef.current?.(map)
    })

    map.on('click', (e) => {
      onMapClickRef.current?.(e)
    })

    return () => {
      mapRef.current = null
      map.remove()
    }
    // Only re-create map if center/zoom fundamentally change identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show a helpful message if key is missing
  if (!GOONG_MAPTILES_KEY) {
    return (
      <div
        className={`goong-map-container ${className}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          borderRadius: '12px',
          flexDirection: 'column',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '2.5rem' }}>🗺️</span>
        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Chưa cấu hình Goong Maps API Key</strong>
        <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
          Tạo file <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>.env</code> trong thư mục <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>fe/</code> với nội dung:
        </p>
        <code style={{ background: '#0f172a', color: '#38bdf8', padding: '10px 16px', borderRadius: 8, fontSize: '0.85rem' }}>
          VITE_GOONG_MAPTILES_KEY=your_maptiles_key
        </code>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
          Đăng ký miễn phí tại{' '}
          <a href="https://account.goong.io" target="_blank" rel="noopener noreferrer" style={{ color: '#0f766e', fontWeight: 600 }}>
            account.goong.io
          </a>
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`goong-map-container ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}

