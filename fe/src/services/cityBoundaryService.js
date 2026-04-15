const CITY_ID_MAP = {
  'da-nang': 'da-nang',
  danang: 'da-nang',
  DaNang: 'da-nang',
  'ha-noi': 'ha-noi',
  hanoi: 'ha-noi',
  HaNoi: 'ha-noi',
  'tp-hcm': 'tp-hcm',
  tphcm: 'tp-hcm',
  hcm: 'tp-hcm',
  HCM: 'tp-hcm',
}

const boundaryCache = new Map()

function normalizeCityId(rawCityId) {
  if (!rawCityId) return null
  return CITY_ID_MAP[rawCityId] || CITY_ID_MAP[String(rawCityId).trim()] || CITY_ID_MAP[String(rawCityId).trim().toLowerCase()] || null
}

function validateBoundaryGeoJSON(data) {
  const features = data?.type === 'FeatureCollection' ? data.features : data?.type === 'Feature' ? [data] : []

  if (!features.length) {
    throw new Error('Boundary GeoJSON has no features.')
  }

  const hasSupportedGeometry = features.some((feature) => {
    const type = feature?.geometry?.type
    return type === 'Polygon' || type === 'MultiPolygon'
  })

  if (!hasSupportedGeometry) {
    throw new Error('Boundary GeoJSON must include Polygon or MultiPolygon geometry.')
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function resolveCityId(cityId) {
  const normalized = normalizeCityId(cityId)
  if (!normalized) {
    throw new Error(`Unsupported city id: ${cityId}`)
  }
  return normalized
}

export async function loadCityBoundaryGeoJSON(cityId) {
  const normalizedCityId = resolveCityId(cityId)

  if (boundaryCache.has(normalizedCityId)) {
    return boundaryCache.get(normalizedCityId)
  }

  const url = `${import.meta.env.BASE_URL}boundaries/${normalizedCityId}.geojson`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load city boundary for ${normalizedCityId}: ${response.status}`)
  }

  const json = await response.json()
  const validated = validateBoundaryGeoJSON(json)
  boundaryCache.set(normalizedCityId, validated)
  return validated
}
