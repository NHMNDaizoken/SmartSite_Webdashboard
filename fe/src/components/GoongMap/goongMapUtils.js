/**
 * goongMapUtils.js
 * Utility functions for Goong Maps — tách ra khỏi GoongMap.jsx
 * để tránh lỗi react-refresh/only-export-components.
 */

/**
 * Fly the map to a bounding box [sw, ne] where each is [lng, lat].
 */
export function flyToBounds(map, bounds, options = {}) {
  if (!map || !bounds) return
  const [sw, ne] = bounds
  map.fitBounds([sw, ne], {
    padding: options.padding ?? 40,
    duration: options.duration ?? 1200,
    ...(options.maxZoom ? { maxZoom: options.maxZoom } : {}),
  })
}

/**
 * Fly to a specific center + zoom.
 */
export function flyToCenter(map, center, zoom = 14, duration = 1000) {
  if (!map) return
  map.flyTo({
    center: center,
    zoom: zoom,
    duration: duration,
  })
}

/**
 * Add or update a GeoJSON source on the map.
 */
export function setGeoJSONSource(map, sourceId, geojsonData) {
  if (!map) return
  const existing = map.getSource(sourceId)
  if (existing) {
    existing.setData(geojsonData)
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojsonData,
    })
  }
}

/**
 * Remove source and its associated layers.
 */
export function removeSourceAndLayers(map, sourceId, layerIds = []) {
  if (!map) return
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }
}

/**
 * Add a polygon boundary highlight layer.
 */
export function addBoundaryLayer(map, sourceId, layerId, color = '#0f766e', opacity = 0.15) {
  if (!map) return
  if (map.getLayer(layerId)) return // already added

  map.addLayer({
    id: layerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': color,
      'fill-opacity': opacity,
    },
  })

  map.addLayer({
    id: `${layerId}-outline`,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': color,
      'line-width': 2,
      'line-opacity': 0.8,
    },
  })
}