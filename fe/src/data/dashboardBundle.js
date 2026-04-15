const DASHBOARD_DATA_URL = `${import.meta.env.BASE_URL}dashboard_data_bundle.json`

const numberFormatter = new Intl.NumberFormat('en-US')
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const pipelineCatalog = [
  {
    step: '01',
    title: 'Extract',
    status: 'Stable',
    summary:
      'Google Maps, POI geojson, and VIIRS night-light sources are listed in lineage metadata for the 3 target cities.',
    inputs: ['GGMap CSV', 'POI GeoJSON', 'VIIRS raster'],
    outputs: ['Raw crawl results', 'History logs'],
  },
  {
    step: '02',
    title: 'Data Processing',
    status: 'Stable',
    summary:
      'Processed point dataset is present in freshness metadata and acts as the bridge between raw extraction and spatial aggregation.',
    inputs: ['Raw point files', 'Review text signals'],
    outputs: ['Coffee_Tea_Data_GGMap.csv', 'Processed point features'],
  },
  {
    step: '03',
    title: 'Spatial Grid',
    status: 'Ready',
    summary:
      'Grid summary bundle is real and currently powers city coverage, market signal, and review-volume views in this dashboard.',
    inputs: ['Processed point data', 'Spatial layers'],
    outputs: ['grid_summary.csv', 'Spatial_Grid_Tabular.csv'],
  },
  {
    step: '04',
    title: 'EDA / Market Analysis',
    status: 'Partial',
    summary:
      'EDA is still notebook-heavy, so the dashboard highlights derived aggregates and exposes provenance instead of over-claiming insight certainty.',
    inputs: ['Spatial grids', 'Processed points'],
    outputs: ['Notebook visuals', 'Derived leaderboard views'],
  },
  {
    step: '05',
    title: 'Wide & Deep Model',
    status: 'Needs verification',
    summary:
      'Model runs are wired from the bundle, but parsed notebook metrics are still distinct from a fully exported reproducible inference pipeline.',
    inputs: ['Tabular features', 'Spatial tensors'],
    outputs: ['model_runs.csv', 'dashboard_data_bundle.json'],
  },
  {
    step: '06',
    title: 'Prediction Layer',
    status: 'Ready',
    summary:
      'Grid-level prediction summaries are exposed so we can inspect ranked cells directly instead of stopping at experiment metrics.',
    inputs: ['grid_predictions.csv', 'DeepStore notebook logic'],
    outputs: ['prediction summary', 'top ranked grids by city'],
  },
]

export async function loadDashboardBundle() {
  const response = await fetch(`${DASHBOARD_DATA_URL}?v=${Date.now()}`)
  if (!response.ok) {
    throw new Error(`Failed to load dashboard data bundle: ${response.status}`)
  }
  return response.json()
}

function formatInt(value) {
  return typeof value === 'number' ? numberFormatter.format(Math.round(value)) : '—'
}

function formatDecimal(value, digits = 2) {
  return typeof value === 'number' ? value.toFixed(digits) : '—'
}

function formatPercent(value, digits = 1) {
  return typeof value === 'number' ? `${(value * 100).toFixed(digits)}%` : '—'
}

function formatDate(value) {
  if (!value) return 'Unknown refresh'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed)
}

function normalizeCityName(value) {
  if (!value) return 'Unknown city'
  if (value === 'HaNoi') return 'Hà Nội'
  if (value === 'DaNang') return 'Đà Nẵng'
  if (value === 'HCM') return 'HCM'
  return value
}

function formatLabelName(value) {
  if (value === 'high_observed_vitality') return 'High observed vitality'
  if (value === 'medium_or_emerging') return 'Medium or emerging'
  if (value === 'low_potential') return 'Low potential'
  return value ?? 'Unknown label'
}

function scoreOpportunity(city) {
  const ntl = city.marketSignals?.ntlMean ?? 0
  const poi = city.marketSignals?.poiDensityMean ?? 0
  const sentiment = city.marketSignals?.avgSentimentMean ?? 0
  const cafeMean = city.coverage?.cafeCountMean ?? 0

  const raw = ntl * 5 + poi * 25 + sentiment * 140 - cafeMean * 80
  return Math.max(0, Math.min(100, Math.round(raw)))
}

function deriveSpatialSignals(city) {
  if (!city) {
    return [
      { label: 'POI density', value: 0, color: 'cyan' },
      { label: 'Night-light intensity', value: 0, color: 'violet' },
      { label: 'Avg sentiment', value: 0, color: 'emerald' },
      { label: 'Weighted rating', value: 0, color: 'amber' },
      { label: 'Competitive saturation', value: 0, color: 'rose' },
    ]
  }

  const maxNtl = 12
  const maxPoi = 2
  const maxSentiment = 0.12
  const maxWeightedRating = 5
  const maxCafeMean = 0.2

  return [
    {
      label: 'POI density',
      value: Math.min(100, Math.round(((city.marketSignals?.poiDensityMean ?? 0) / maxPoi) * 100)),
      color: 'cyan',
    },
    {
      label: 'Night-light intensity',
      value: Math.min(100, Math.round(((city.marketSignals?.ntlMean ?? 0) / maxNtl) * 100)),
      color: 'violet',
    },
    {
      label: 'Avg sentiment',
      value: Math.min(100, Math.round(((city.marketSignals?.avgSentimentMean ?? 0) / maxSentiment) * 100)),
      color: 'emerald',
    },
    {
      label: 'Weighted rating',
      value: Math.min(100, Math.round(((city.marketSignals?.avgWeightedRatingMean ?? 0) / maxWeightedRating) * 100)),
      color: 'amber',
    },
    {
      label: 'Competitive saturation',
      value: Math.min(100, Math.round(((city.coverage?.cafeCountMean ?? 0) / maxCafeMean) * 100)),
      color: 'rose',
    },
  ]
}

function normalizePredictionCity(city) {
  return {
    city: normalizeCityName(city.city),
    sourceCity: city.city,
    counts: {
      highObservedVitality: city.counts?.highObservedVitality ?? 0,
      mediumOrEmerging: city.counts?.mediumOrEmerging ?? 0,
      lowPotential: city.counts?.lowPotential ?? 0,
    },
    topGrids:
      city.topGrids?.map((item) => ({
        gridId: item.gridId,
        label: formatLabelName(item.prediction?.labelName),
        observedStatus: item.prediction?.observedStatus ?? 'unknown',
        cityOpportunity: item.scores?.cityOpportunity ?? null,
        globalOpportunity: item.scores?.globalOpportunity ?? null,
        cityRank: item.scores?.cityRank ?? null,
        globalRank: item.scores?.globalRank ?? null,
        cafeCount: item.signals?.cafeCount ?? null,
        reviews: item.signals?.reviews ?? null,
        weightedRating: item.signals?.weightedRating ?? null,
        ntlNeighbor: item.signals?.ntlNeighbor ?? null,
        eNeighbor: item.signals?.eNeighbor ?? null,
        vRaw: item.signals?.vRaw ?? null,
        sentiment: item.signals?.sentiment ?? null,
        center: item.center ?? null,
      })) ?? [],
  }
}

export function deriveDashboardView(bundle) {
  const counts = bundle?.overview?.counts ?? {}
  const cities = bundle?.citySummaries ?? []
  const runs = bundle?.leaderboards?.modelRunsByLowestRmse ?? bundle?.modelRuns ?? []
  const bestRun = bundle?.leaderboards?.bestAvailableRun ?? null
  const predictions = bundle?.predictions ?? {}
  const defaultCityName = bundle?.frontendHints?.defaultCity
  const selectedCity = cities.find((item) => item.city === defaultCityName) ?? cities[0] ?? null
  const parsedWarnings = bundle?.warnings ?? []
  const hasVerificationRisk = parsedWarnings.length > 0 || runs.some((run) => run.status !== 'verified')

  const cityCoverage = cities.map((city) => ({
    city: normalizeCityName(city.city),
    sourceCity: city.city,
    points: city.coverage?.cafeCountSum ?? null,
    grids: city.coverage?.gridCount ?? null,
    reviews: city.coverage?.totalReviewsSum ?? null,
    avgRating: city.marketSignals?.avgWeightedRatingMean ?? null,
    opportunity: scoreOpportunity(city),
    datasetPath: city.datasetPath,
    datasetLastModified: city.datasetLastModified,
  }))

  const opportunityCards = cities
    .map((city) => ({
      title: normalizeCityName(city.city),
      score: scoreOpportunity(city),
      detail: `${formatInt(city.coverage?.gridCount)} grids · ${formatInt(city.coverage?.cafeCountSum)} cafes · ${formatPercent(city.marketSignals?.avgSentimentMean, 1)} avg sentiment · ${formatDecimal(city.marketSignals?.avgWeightedRatingMean, 2)} weighted rating`,
      note:
        city.coverage?.cafeCountMean && city.coverage.cafeCountMean > 0.15
          ? 'Higher local competition intensity in the current snapshot.'
          : 'Lower observed cafe saturation relative to bundle city peers.',
    }))
    .sort((a, b) => b.score - a.score)

  const predictionCities = (predictions.citySummaries ?? []).map(normalizePredictionCity)
  const predictionSelectedCity =
    predictionCities.find((city) => city.sourceCity === defaultCityName) ?? predictionCities[0] ?? null
  const processedFreshness = bundle?.freshness?.processed_points ?? null
  const spatialFreshness = bundle?.freshness?.spatial_grid ?? null

  return {
    projectMeta: {
      title: `${bundle?.overview?.project ?? 'SmartSite'} Web Dashboard`,
      subtitle:
        'Real artifact snapshot wired into React. Metrics with parsed or inferred provenance stay visibly flagged until upstream verification is complete.',
      lastUpdated: formatDate(bundle?.meta?.generatedAt),
      generatedAt: bundle?.meta?.generatedAt,
      source: 'ai_workspace/web_dashboard/data/dashboard_data_bundle.json',
      bundleVersion: bundle?.meta?.bundleVersion ?? 'unknown',
    },
    provenance: {
      artifactVersion: bundle?.overview?.artifactVersion ?? 'unknown',
      exportScript: bundle?.lineage?.export_script ?? 'unknown',
      defaultCity: normalizeCityName(defaultCityName),
      modelSort: bundle?.frontendHints?.defaultModelSort ?? 'unknown',
      hasVerificationRisk,
      warnings: parsedWarnings,
      rawSourceCount: bundle?.lineage?.raw_sources?.length ?? 0,
      processedSourceCount: bundle?.lineage?.processed_sources?.length ?? 0,
      modelSourceCount: bundle?.lineage?.model_sources?.length ?? 0,
    },
    topMetrics: [
      { label: 'Cities covered', value: formatInt(counts.city_count_grid), hint: 'Bundle city summaries' },
      { label: 'Processed points', value: formatInt(counts.processed_point_count), hint: 'overview.counts.processed_point_count' },
      { label: 'Spatial grids', value: formatInt(counts.grid_count), hint: 'overview.counts.grid_count' },
      { label: 'Model notebooks', value: formatInt(counts.model_notebook_count), hint: 'Scanned notebook sources' },
    ],
    cityCoverage,
    pipelineSteps: pipelineCatalog,
    dataInventory: [
      {
        name: 'Dashboard data bundle',
        file: 'ai_workspace/web_dashboard/data/dashboard_data_bundle.json',
        state: 'Available',
        note: `Snapshot ${bundle?.meta?.bundleVersion ?? 'unknown'} · ${formatDate(bundle?.meta?.generatedAt)}`,
      },
      {
        name: 'Processed point dataset',
        file: bundle?.freshness?.processed_points?.path ?? 'Step 2_ Data Processing/Coffee_Tea_Data_GGMap.csv',
        state: 'Available',
        note: `${formatInt(counts.processed_point_count)} rows · ${formatDate(bundle?.freshness?.processed_points?.last_modified)}`,
      },
      {
        name: 'Spatial grid dataset',
        file: bundle?.freshness?.spatial_grid?.path ?? 'Step 3_ Spatial_Grid/Spatial_Grid_Tabular.csv',
        state: 'Available',
        note: `${formatInt(counts.grid_count)} rows · ${formatDate(bundle?.freshness?.spatial_grid?.last_modified)}`,
      },
      {
        name: 'Grid predictions',
        file: bundle?.meta?.sourceArtifacts?.gridPredictionsCsv ?? 'ai_workspace/web_dashboard/data/grid_predictions.csv',
        state: predictions?.status === 'available' ? 'Available' : 'Warning',
        note: `${predictions?.modelVersion ?? 'Prediction layer'} · ${predictions?.predictionType ?? 'unknown provenance'}`,
      },
      {
        name: 'Model tracker',
        file: bundle?.meta?.sourceArtifacts?.modelRunsCsv ?? 'ai_workspace/web_dashboard/data/model_runs.csv',
        state: hasVerificationRisk ? 'Warning' : 'Available',
        note: `${formatInt(counts.parsed_model_run_count)} parsed runs · verification still required`,
      },
      {
        name: 'KPI summary',
        file: bundle?.meta?.sourceArtifacts?.kpiSummaryJson ?? 'ai_workspace/web_dashboard/data/kpi_summary.json',
        state: 'Available',
        note: 'Counts and best_model payload copied through without semantic reinterpretation',
      },
      {
        name: 'Export freshness metadata',
        file: bundle?.lineage?.export_script ?? 'scripts/export_dashboard_artifacts.py',
        state: 'Available',
        note: 'Refresh bundle after upstream data changes',
      },
    ],
    spatialSignals: deriveSpatialSignals(selectedCity),
    heatmapLegend: [
      { tone: 'Low', hex: '#1e293b' },
      { tone: 'Moderate', hex: '#1d4ed8' },
      { tone: 'High', hex: '#7c3aed' },
      { tone: 'Hotspot', hex: '#22c55e' },
    ],
    selectedCity: selectedCity
      ? {
          label: normalizeCityName(selectedCity.city),
          source: selectedCity.datasetPath,
          refreshedAt: formatDate(selectedCity.datasetLastModified),
          sha256: selectedCity.datasetSha256 ?? spatialFreshness?.sha256 ?? null,
          grids: formatInt(selectedCity.coverage?.gridCount),
          cafes: formatInt(selectedCity.coverage?.cafeCountSum),
          reviews: formatInt(selectedCity.coverage?.totalReviewsSum),
        }
      : null,
    trustSnapshot: {
      bundleVersion: bundle?.meta?.bundleVersion ?? 'unknown',
      bundleGeneratedAt: formatDate(bundle?.meta?.generatedAt),
      exportScript: bundle?.lineage?.export_script ?? 'unknown',
      processedPointsLastModified: formatDate(processedFreshness?.last_modified),
      processedPointsSha256: processedFreshness?.sha256 ?? null,
      spatialGridLastModified: formatDate(spatialFreshness?.last_modified),
      spatialGridSha256: spatialFreshness?.sha256 ?? null,
    },
    modelRuns: runs.map((run) => ({
      version: run.modelVersion ?? run.runId ?? 'Unknown run',
      featureSet: run.featureTags?.length ? run.featureTags.join(', ') : run.featureSetRaw ?? '—',
      rmse: run.metrics?.rmse,
      mae: run.metrics?.mae,
      r2: run.metrics?.r2,
      status: run.status ?? run.metrics?.metricStatus ?? 'unknown',
      metricStatus: run.metrics?.metricStatus ?? 'missing',
      sourceNotebook: run.sourceNotebook,
      notes: run.notes,
    })),
    modelSummary: {
      bestRun: bestRun
        ? {
            version: bestRun.modelVersion ?? bestRun.runId,
            rmse: formatDecimal(bestRun.metrics?.rmse, 4),
            mae: formatDecimal(bestRun.metrics?.mae, 4),
            r2: formatDecimal(bestRun.metrics?.r2, 4),
            sourceNotebook: bestRun.sourceNotebook,
            status: bestRun.status,
          }
        : null,
      readyCount: runs.filter((run) => run.metrics?.metricStatus === 'ready').length,
      parsedCount: runs.length,
    },
    predictionSummary: {
      modelVersion: predictions?.modelVersion ?? 'Unavailable',
      predictionType: predictions?.predictionType ?? 'missing',
      verificationLevel: predictions?.verificationLevel ?? 'unknown',
      note: predictions?.note ?? 'No prediction note available.',
      sourceArtifact: predictions?.sourceArtifact ?? null,
      citySummaries: predictionCities,
      selectedCity: predictionSelectedCity,
      topGlobal:
        predictions?.topGlobal?.map((item) => ({
          gridId: item.gridId,
          city: normalizeCityName(item.city),
          label: formatLabelName(item.prediction?.labelName),
          globalOpportunity: item.scores?.globalOpportunity ?? null,
          globalRank: item.scores?.globalRank ?? null,
          cityRank: item.scores?.cityRank ?? null,
        })) ?? [],
    },
    opportunityCards,
    recommendations: [
      'Keep model metrics marked as parsed/inferred until notebook exports are manually verified.',
      'Refresh ai_workspace/web_dashboard/data/dashboard_data_bundle.json after upstream data changes to keep frontend runtime artifacts in sync.',
      'Current prediction layer comes from grid_predictions.csv and should still be presented as exploratory until model weights are exported independently.',
      'Expose residual plots and split metadata once the training notebooks export stable chart-ready files.',
    ],
  }
}
