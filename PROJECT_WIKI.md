# SmartSite — Project Wiki

> Single canonical reference for the entire SmartSite workspace.  
> Replaces: `README.md`, `AGENT_HANDOFF.md`, `DATA_DICTIONARY.md`,
> `MODEL_VALIDITY_REVIEW.md`, `OBSERVABILITY_SPEC.md`,
> `WEB_DATA_LINEAGE_AND_OPPORTUNITY_FORMULA.md`,
> `ai_workspace/README.md`, `ai_workspace/web_dashboard/README.md`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Layout](#2-repository-layout)
3. [Quick-Start Commands](#3-quick-start-commands)
4. [Data Pipeline & Lineage](#4-data-pipeline--lineage)
5. [Data Dictionary](#5-data-dictionary)
6. [Opportunity Score Formula](#6-opportunity-score-formula)
7. [Model Validity & Claims](#7-model-validity--claims)
8. [Observability & Artifact Spec](#8-observability--artifact-spec)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Backend Architecture](#10-backend-architecture)
11. [Location Intelligence Module (Step 3)](#11-location-intelligence-module-step-3)
12. [Artifact Refresh Workflow](#12-artifact-refresh-workflow)
13. [Agent Handoff State](#13-agent-handoff-state)
14. [Guardrails & Wording Guide](#14-guardrails--wording-guide)
15. [Population Density Feature](#15-population-density-feature-2026-04-13)

---

## 1. Project Overview

**SmartSite** is a market-analysis and site-selection research workspace built on:

- Web-extracted Google Maps place data (café / tea shops) for Hà Nội, Đà Nẵng, TP.HCM
- OpenStreetMap POI data + VIIRS night-light raster
- Spatial 500 m × 500 m grid features
- Engineered vitality scores and pseudo-labelled opportunity classes
- A React + Vite dashboard for exploring spatial signals
- A FastAPI backend for live bounding-box zone analysis

**What it is:** an exploratory tool for ranking zones by *observed* F&B signals.  
**What it is not:** a revenue forecast, a deployment-ready recommendation engine, or a ground-truth demand predictor.

---

## 2. Repository Layout

```
SmartSite/
├── Step 1_ Extract/               Raw crawl notebooks + CSVs + GeoJSON + VIIRS
├── Step 2_ Data Processing/       Cleaned place data + POI GeoJSON
├── Step 3_ Spatial_Grid/          Grid tabular CSV + spatial tensors
├── Step 4_ EDA_Market_Analysis/   EDA notebooks
├── Step 5_ Wide&Deep Model/       Model training notebooks
├── artifacts/                     Legacy snapshots (non-runtime reference)
├── scripts/                       Export + sync scripts
├── backend/                       FastAPI zone-analysis service
├── ai_workspace/
│   ├── web_dashboard/             React + Vite frontend  ← you are here
│   │   ├── fe/                    Frontend source (src/ + config)
│   │   ├── be/                    Backend source mirror / reference
│   │   ├── data/                  Canonical public runtime data assets
│   │   └── PROJECT_WIKI.md        This file
│   └── ...
└── memory/                        Short-lived working context
```

### web_dashboard internal structure (after reorganisation)

```
web_dashboard/
├── fe/
│   ├── src/
│   │   ├── components/
│   │   │   ├── app/               AppShell, OverviewTab, FigureModal, shared
│   │   │   ├── LocationModule/    MapPanel, StatsPanel, InsightPanel, LocationModule
│   │   │   ├── pages/             OpportunityPage, PlacesPage, ModelPage, LineagePage
│   │   │   ├── PopulationLayer/   PopulationDensityLayer ← NEW
│   │   │   └── predictions/       AIMapPage
│   │   ├── data/                  dashboardBundle.js, appContent.js, administrativeData.js
│   │   ├── hooks/                 useLocationIntelligence.js
│   │   ├── services/              locationApiService.js, insightService.js, mapService.js, cityBoundaryService.js, populationService.js ← NEW
│   │   ├── App.jsx / App.css
│   │   ├── LocationModule.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── public/                    → legacy copy, no longer needed for GitHub-ready layout
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── be/
│   └── (backend source reference — canonical copy lives in /backend/)
├── data/
│   ├── dashboard_data_bundle.json
│   ├── dashboard_data_spec.json
│   ├── spatial/
│   │   ├── index.json
│   │   ├── full/   DaNang.geojson  HaNoi.geojson  HCM.geojson
│   │   └── hotspots/  DaNang.geojson  HaNoi.geojson  HCM.geojson
│   ├── boundaries/  da-nang.geojson  ha-noi.geojson  tp-hcm.geojson
│   ├── population/  hcm_population.geojson  hn_population.geojson  danang_population.geojson  index.json ← NEW
│   ├── city_bounds.json
│   ├── grid_map.geojson
│   └── vn.json
└── PROJECT_WIKI.md
```

---

## 3. Quick-Start Commands

### Frontend dev server
```powershell
cd ai_workspace/web_dashboard/fe
npm install
npm run dev          # http://localhost:5173
```

### Frontend quality checks
```powershell
cd ai_workspace/web_dashboard/fe
npm run lint         # must pass with 0 errors
npm run build        # must produce dist/ cleanly
```

### Backend (FastAPI)
```powershell
python -m uvicorn backend.main:app --reload --port 8000
# Health: http://localhost:8000/health
# Docs:   http://localhost:8000/docs
```

### Artifact pipeline
```powershell
# 1. Export canonical artifacts from notebooks + CSV
python scripts/export_dashboard_artifacts.py

# 2. Build verified prediction artifacts (rule Step 5 v5-1)
python scripts/build_verified_artifacts.py

# 3. Sync prediction layer into dashboard bundle
node scripts/sync_prediction_bundle.mjs

# 4. (Optional) Re-export spatial GeoJSON
python scripts/export_spatial_geojson.py
```

### Common runtime issues (updated 2026-04-08)

1. `WinError 10013` when starting backend on port `8000`

Cause:
- A stale Python/uvicorn process is already listening on `127.0.0.1:8000`.

Checks and fix:

```powershell
# Identify current listener on port 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess

# Stop stale process (replace PID)
Stop-Process -Id <PID> -Force
```

Restart backend:

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

2. Frontend error `Unexpected token '<', "<!doctype ..." is not valid JSON`

Cause:
- A JSON/GeoJSON fetch URL is wrong, so the dev server returns HTML fallback.

In this workspace, Vite serves static files from `ai_workspace/web_dashboard/data` via `publicDir = ../data`.
Use root static paths such as:
- `/dashboard_data_bundle.json`
- `/spatial/index.json`
- `/spatial/hotspots/<City>.geojson`
- `/boundaries/<city>.geojson`

Do not prepend `/data/` for these fetch URLs.

### ai_workspace cleanup policy (current)

- Safe to remove first (doc-only, not runtime):
  - `ai_workspace/dashboard`
  - `ai_workspace/data_map`
  - `ai_workspace/notes`
- Runtime artifacts are canonicalized under `ai_workspace/web_dashboard/data`.
- `ai_workspace/artifacts_web` is no longer required by the current export/sync scripts.

---

## 4. Data Pipeline & Lineage

```
Step 1 — Extract
  Google Maps scraper → *_GGMap.csv  (DaNang 1 763 rows, HCM 7 641, HaNoi 7 534)
  OSM POI → *_POI_Points.geojson
  VIIRS satellite → *_VIIRS.tif
        ↓
Step 2 — Data Processing
  Coffee_Tea_Data_GGMap.csv   (8 647 rows · 9 cols · place grain)
  Coffee_Tea_Data_POI.geojson (POI point layer · EPSG:4326)
        ↓
Step 3 — Spatial Grid
  Spatial_Grid_Tabular.csv    (73 974 rows · 22 cols · grid grain · 500 m cells)
  Spatial_Tensors.npz         (11 × 11 × 11 neighbourhood tensors per grid)
        ↓
Step 4 — EDA
  Market analysis notebooks + EDA chart PNGs
        ↓
Step 5 — Wide & Deep Model
  Training notebooks v1–v6
        ↓
ai_workspace/web_dashboard/data/
  model_runs.csv              experiment tracker
  grid_summary.csv            city-level aggregates
  kpi_summary.json            top-level KPIs + freshness + warnings
  grid_predictions.csv/.json  opportunity labels per grid (rule v5-1)
        ↓
  dashboard_data_bundle.json  normalised shell bundle for React
  spatial/*.geojson           map runtime layers served to browser
```

### Key join keys

| Grain | Key |
|-------|-----|
| Place (point) | `place_id` |
| Grid | `Grid_ID` |
| City | `City` (`DaNang` \| `HaNoi` \| `HCM`) |

> **Never** join point and grid rows in the same KPI table without labelling grain explicitly.

---

## 5. Data Dictionary

### 5.1 Raw Google Maps schema (`Step 1_ Extract/Results_CSV/*_GGMap.csv`)

| Column | Type | Notes |
|--------|------|-------|
| `name` | text | place name |
| `address` | text | scraped address |
| `category` | text | e.g. `Coffee shop` |
| `rating` | float | Google Maps star rating |
| `reviews_count` | int | number of reviews |
| `lat` / `lng` | float | coordinates |
| `place_id` | text | unique Google Maps key |
| `sample_reviews` | text | concatenated review samples — upstream input for sentiment |
| `google_url` | text | Maps URL |

### 5.2 Processed place schema (`Step 2_ Data Processing/Coffee_Tea_Data_GGMap.csv`)

| Column | Layer | Notes |
|--------|-------|-------|
| `place_id` | raw key | join key |
| `name` | raw | — |
| `City` | engineered | normalised: `DaNang` / `HaNoi` / `HCM` |
| `lat` / `lng` | raw | — |
| `rating` | raw | — |
| `reviews_count` | raw | — |
| `sentiment_score_final` | engineered | derived from `sample_reviews` |
| `valid_review_count` | engineered | reviews eligible for sentiment |

### 5.3 Spatial grid schema (`Step 3_ Spatial_Grid/Spatial_Grid_Tabular.csv`)

| Column | Layer | Dashboard | Model | Notes |
|--------|-------|-----------|-------|-------|
| `Grid_ID` | key | ✓ | ✓ | — |
| `City` | engineered | ✓ | ✓ | — |
| `Center_Lat` / `Center_Lng` | engineered | ✓ | ✓ | grid centroid |
| `POI_*` (8 categories) | engineered | ✓ | ✓ | count per category |
| `Cafe_Count` | engineered | ✓ | ⚠ leakage | part of target formula |
| `Total_Reviews` | engineered | ✓ | ⚠ leakage | part of target formula |
| `Avg_Rating` | engineered | ✓ | EDA only | — |
| `Avg_Weighted_Rating` | engineered | ✓ | ⚠ leakage | part of target formula |
| `Avg_Sentiment` | engineered | ✓ | ⚠ leakage | part of target formula |
| `NTL_Mean` | raster-derived | ✓ | ✓ | night-light proxy |
| `POI_Density` | engineered | ✓ | ✓ | — |
| `POI_Entropy` | engineered | ✓ | ✓ | diversity index |

### 5.4 Engineered model columns (Step 5 notebooks only)

| Column | Formula / meaning |
|--------|-------------------|
| `Scale_Factor` | `log1p(Cafe_Count)` |
| `Traffic_Factor` | `log1p(Total_Reviews)` |
| `Quality_Factor` | `((Avg_Weighted_Rating/5) + Avg_Sentiment) / 2` |
| `NTL_Neighbor` | mean NTL of 3×3 neighbourhood (excluding centre) |
| `E_neighbor` | `0.5 + NTL_Neighbor / max(NTL_Neighbor)` |
| `V_raw` | `Scale_Factor × Traffic_Factor × Quality_Factor × E_neighbor` |
| `Target_Score` | MinMax(log1p(V_raw)) → 0–100 |
| `Target_Class` / `Label` | 3-class pseudo-label (0 / 1 / 2) |

### 5.5 Spatial tensor artifact (`Spatial_Tensors.npz`)

Shape per grid: **11 × 11 × 11**  
11 channels: `POI_Education`, `POI_Office`, `POI_Residential`, `POI_Food`,
`POI_Transport`, `POI_Commercial`, `POI_Leisure`, `POI_Other`,
`NTL_Mean`, `POI_Density`, `POI_Entropy`.  
Centre cell = target grid. Used by multimodal Wide & Deep model only.

---

## 6. Opportunity Score Formula

### Primary (Step 5 rule — v5-1, used in `ai_workspace/web_dashboard/data/grid_predictions.csv`)

```
Scale_Factor   = log1p(Cafe_Count)
Traffic_Factor = log1p(Total_Reviews)
Quality_Factor = ((Avg_Weighted_Rating / 5.0) + Avg_Sentiment) / 2.0
E_neighbor     = 0.5 + (NTL_Neighbor / max(NTL_Neighbor))
V_raw          = Scale_Factor × Traffic_Factor × Quality_Factor × E_neighbor

If Cafe_Count > 0:
  city_opportunity_score = percentile_rank_within_city(V_raw)
If Cafe_Count == 0:
  city_opportunity_score = percentile_rank_within_city(NTL_Neighbor)

Labels:
  high_observed_vitality  → active grid, V_raw > median(active grids)
  medium_or_emerging      → active but V_raw ≤ median, OR empty but NTL_Neighbor ≥ q85(empty)
  low_potential           → empty grid, NTL_Neighbor < q85(empty)
```

### Fallback (Step 3 heuristic — legacy only)

```
opportunityScore = (
  0.32 × norm(POI_Density)
+ 0.24 × norm(NTL_Mean)
+ 0.18 × norm(Avg_Sentiment)
+ 0.16 × norm(Avg_Weighted_Rating)
+ 0.10 × (1 − norm(Cafe_Count))
) × 100

Tiers: Low 0–40 · Moderate 40–65 · High 65–82 · Hotspot 82–100
```

> ⚠ Both formulas are **engineered proxies** — not ground-truth demand.
>
> Current export pipeline runs in strict mode: spatial export fails if Step 5 prediction artifact is missing or has partial grid coverage. It will not silently downgrade to Step 3.

### Frontend score display (AIMapPage, updated 2026-04-09)

`AIMapPage` displays a single Step 5 score (`opportunityScore`) across map fill, list, and popup.

Current behavior:
- no adjusted-vs-raw dual score text
- no evidence-strength display field
- score source is expected to be `step5` for all rows in strict export mode

---

## 7. Model Validity & Claims

### Bottom line

All models in this repo learn an **engineered pseudo-label**, not a real business outcome.  
The target is built from the same data being modelled → circular by design.  
No external validation (revenue, footfall, survival rate) exists in the repo.

### Model versions & metrics

| Version | Task | Best metric | Split | Notes |
|---------|------|-------------|-------|-------|
| Baseline regression | predict `Target_Score` 0–100 | MAE 9.17 · R² 0.07 | random | weak predictive power |
| v3 multimodal regression | same + spatial tensor | GBDT R² 0.16 | random | slight improvement |
| v1–v2 classification | 3-class on active grids only | Macro F1 ~0.50 | random | near-random on 3 classes |
| v4 classification | pseudo-potential full grid | GBDT Macro F1 0.61 | random | learns heuristic rule |
| v5-1 | same · cross-city holdout | GBDT Macro F1 0.72 | HCM+HaNoi→DaNang | harder split |
| v5-2 | same · per-city random | GBDT Macro F1 0.85 | random per city | easy split — inflated |
| v6-2 | DeepStore multimodal | Macro F1 0.76 | random | best model in repo |

### Why high F1 ≠ predictive truth

1. **Label is self-referential** — high F1 means the model learned to reproduce the rule that created the label.
2. **No external ground truth** — no revenue, footfall, or new-site outcome data.
3. **Class 0 dominates** — accuracy is easy to inflate; Macro F1 is the only honest metric.
4. **Split strategy matters** — v5-2 random split is much easier than v5-1 city holdout; do not compare them directly.

### Valid claims

- Pipeline from raw web + spatial data to grid-level scoring works end-to-end.
- Spatial features (POI, NTL, density, entropy) carry useful signal for ranking zones by *observed* F&B activity.
- Dashboard is suitable for **exploratory zone shortlisting** and **relative comparison**.

### Invalid claims

- Revenue forecast · success probability · guaranteed best location  
- Ground-truth demand · ROI prediction · market share projection

---

## 8. Observability & Artifact Spec

### Canonical artifact files

| File | Grain | Purpose |
|------|-------|---------|
| `ai_workspace/web_dashboard/data/model_runs.csv` | 1 row = 1 notebook run | experiment tracker |
| `ai_workspace/web_dashboard/data/grid_summary.csv` | 1 row = city aggregate | spatial KPI overview |
| `ai_workspace/web_dashboard/data/kpi_summary.json` | top-level JSON | freshness · lineage · warnings |
| `ai_workspace/web_dashboard/data/grid_predictions.csv` | 1 row = grid | opportunity label + scores |

### `model_runs.csv` key columns

`run_id` · `model_version` · `source_notebook` · `source_last_modified` · `target_name` ·  
`feature_set` · `split_strategy` · `mae` · `rmse` · `r2` · `status` · `notes`

**`status` values:**  
`verified` → directly exported from notebook; safe to report.  
`parsed` → heuristically extracted; use with warning badge.  
`template_only` → notebook found but no output readable.

### `kpi_summary.json` required keys

`generated_at` · `project` · `artifact_version` · `freshness` · `lineage` · `kpis` · `warnings`

### Freshness rule

Each artifact must answer:  
1. Which source file produced it?  
2. When was that source last modified? (ISO 8601 UTC)  
3. What script/notebook produced it?

### Dashboard consumption rules

- If artifact missing → show warning card, do not crash.
- If `status != verified` → show `parsed` badge.
- If source checksum changed but artifact is old → flag `stale_artifact = true`.

---

## 9. Frontend Architecture

### Stack

| Package | Version | Role |
|---------|---------|------|
| React | 19 | UI framework |
| Vite | 8 | build + dev server |
| Goong Maps JS (`@goongmaps/goong-js`) | 1.0.9 | interactive vector map (replaced Leaflet Apr 2026) |
| recharts | 2 | charts |
| axios | 1.7 | HTTP client |
| eslint + react-hooks + react-refresh | latest | lint |

### Views

| Route key | Component | Data source |
|-----------|-----------|-------------|
| `overview` | `OverviewTab` | `dashboard_data_bundle.json` |
| `map` | `AIMapPage` | `spatial/full/*.geojson` — Goong Maps, density/points mode toggle |
| `location` | `LocationModule` | FastAPI `/api/analyze-zone` (live) |

### Data flow

```
App.jsx
 └─ loadDashboardBundle()          ← /dashboard_data_bundle.json
 └─ deriveDashboardView(bundle)    ← src/data/dashboardBundle.js
 └─ AppShell                       renders sidebar + header
     ├─ OverviewTab                city KPIs, EDA figures, quick nav
     ├─ AIMapPage                  lazy spatial layers via mapService.js
     └─ LocationModule             live bbox → useLocationIntelligence hook
         ├─ MapPanel               Goong Maps 2-click bbox draw
         ├─ StatsPanel             Recharts BarChart + RadarChart
         └─ InsightPanel           rule-based insight bubbles + AI insight (lazy)
                                  └─ AiInsightSection   benchmark + LLM/rule-enhanced analysis
```

### Key source files

| File | Purpose |
|------|---------|
| `src/data/dashboardBundle.js` | fetch + normalise dashboard bundle |
| `src/data/appContent.js` | nav items, view titles, EDA library, map layers |
| `src/services/mapService.js` | load + normalise spatial GeoJSON |
| `src/services/locationApiService.js` | POST `/api/analyze-zone` |
| `src/services/insightService.js` | rule-based text from ZoneAnalysis JSON |
| `src/services/populationService.js` | `fetchPopulationDensity(city)` — GET `/api/population/density`, in-memory cache per city |
| `src/hooks/useLocationIntelligence.js` | bbox → fetch → analysis + insights state |
| `src/components/GoongMap/GoongMap.jsx` | Goong Maps React wrapper |
| `src/components/GoongMap/goongMapUtils.js` | map utilities: flyTo, setGeoJSONSource, removeSourceAndLayers, addBoundaryLayer |
| `src/components/predictions/AIMapPage.jsx` | market map — density/points mode toggle, popup, paginated list |
| `src/components/PopulationLayer/PopulationDensityLayer.jsx` | choropleth overlay — population density (YlOrRd, 5-quantile), toggle + city selector + legend |
| `src/components/LocationModule/MapPanel.jsx` | Goong Maps bbox draw UI |
| `src/components/LocationModule/StatsPanel.jsx` | Recharts visualisations |
| `src/components/LocationModule/InsightPanel.jsx` | insight chat-style UI |
| `src/LocationModule.css` | container-query scoped styles |

### AIMapPage — display modes

`AIMapPage` supports 2 map display modes toggled via a button group in the header panel:

| Mode | Layer | Description |
|------|-------|-------------|
| `density` (default) | `grid-fill` + `grid-outline` | Filled grid polygons tiled edge-to-edge, colour by calibrated display score (`opportunityScoreAdjusted`) |
| `points` | `points-circle-stroke` + `points-circle` | Circle at each grid centroid, same colour palette, white stroke for contrast |

**Shared colour palette (5-stop, low to high):**
`#dc2626` (red) → `#f97316` (orange) → `#facc15` (yellow) → `#4ade80` (green) → `#0f766e` (teal)

**Popup on click (both modes):**
Shows: Toa do (lat, lng as monospace) · City badge · 4 metric cards (So quan, Luot danh gia, Diem tiem nang, NTL).
For `Diem tiem nang`, popup now shows calibrated display score and raw score when they differ.
Does **not** show: grid ID, POI density, sentiment, rating — kept minimal.

**Layer management:**
- On city change: all layers (`grid-data`, `points-data`, `area-boundary`) are removed and re-added for the new city.
- Mode toggle uses `setLayoutProperty('visibility', ...)` — no layer recreation needed.
- Map utilities are in `goongMapUtils.js` (separate from `GoongMap.jsx`) to satisfy `react-refresh/only-export-components`.

### Build status (current)

| Check | Status |
|-------|--------|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ passes (chunk-size warning is informational) |

---

## 10. Backend Architecture

### Stack

FastAPI · Pydantic · pandas · geopandas · shapely · uvicorn

### Running

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

CORS origins allowed: `http://localhost:5173`, `http://localhost:3000`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | liveness check |
| POST | `/api/analyze-zone` | bbox → ZoneAnalysis |
| POST | `/api/ai-insight` | ZoneAnalysis → AI-powered insight with benchmark |
| GET | `/api/population/density?city=hcm\|hn\|danang` | Ward-level population density GeoJSON (2019 census seed data) |

### POST `/api/analyze-zone`

**Request body (`BoundingBox`):**
```json
{ "min_lat": 16.02, "max_lat": 16.07, "min_lng": 108.18, "max_lng": 108.23 }
```

**Response (`ZoneAnalysis`):**
```json
{
  "bbox": { ... },
  "cafe_stats": {
    "total_cafes": 12,
    "avg_rating": 4.21,
    "avg_sentiment": 0.612,
    "avg_reviews": 143.5,
    "high_rated_count": 4,
    "review_density": 172.0
  },
  "poi_breakdown": {
    "Food": 8, "Education": 3, "Office": 5,
    "Residential": 12, "Commercial": 7, "Leisure": 4,
    "Transport": 6, "Other": 2
  },
  "total_poi": 47,
  "competition_level": "moderate",
  "dominant_poi_category": "Residential"
}
```

**Competition thresholds:**

| Level | Café count |
|-------|-----------|
| `low` | 0–9 |
| `moderate` | 10–29 |
| `high` | 30–59 |
| `very_high` | 60+ |

### POST `/api/ai-insight`

**Request body (`AiInsightRequest`):**
```json
{
  "zone_analysis": { ... }  // full ZoneAnalysis object from /api/analyze-zone
}
```

**Response (`AiInsightResponse`):**
```json
{
  "headline": "Nhận định sắc bén về thị trường khu vực...",
  "bullets": [
    "Phân tích tệp khách hàng...",
    "Khoảng trống thị trường...",
    "Đề xuất mô hình kinh doanh..."
  ],
  "verdict": "Kết luận điều hành...",
  "benchmark": {
    "avg_rating": 4.15,
    "avg_sentiment": 0.542,
    "competition_score": 12.3,
    "avg_review_density": 87.5,
    "total_zones_compared": 8647
  },
  "model_used": "gpt-4o-mini",
  "language": "vi"
}
```

**Strategy:** Tries any OpenAI-compatible LLM first (English reasoning → Vietnamese output). Falls back to enhanced rule-based with benchmark comparison if no API key is set or call fails.

**Environment variables — loaded from `be/.env` (via `python-dotenv`) or set directly in shell:**

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `LLM_API_KEY` | yes (for LLM) | `sk-...` / `gsk_...` / `tog_...` | Any provider's key |
| `LLM_API_BASE` | no | `https://api.groq.com/openai/v1` | Omit for OpenAI default |
| `LLM_MODEL` | no | `llama-3.1-70b-versatile` | Defaults to `gpt-4o-mini` |
| `LLM_JSON_MODE` | no | `false` | Set `false` if provider doesn't support `response_format` |

**`be/.env` file (recommended — created at `ai_workspace/web_dashboard/be/.env`):**

```ini
# Groq (current — free tier, fast)
LLM_API_KEY=gsk_...your-groq-key...
LLM_API_BASE=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.1-70b-versatile

# OpenAI (alternative — no LLM_API_BASE needed)
# LLM_API_KEY=sk-...your-openai-key...
# LLM_MODEL=gpt-4o-mini

# Other providers — also set LLM_API_BASE to provider endpoint
# LLM_JSON_MODE=false   # add if provider doesn't support response_format
```

`python-dotenv` is installed via `requirements.txt` and `load_dotenv(Path(__file__).parent.parent / ".env")` is called at the top of `main.py` with an explicit path — ensures `.env` is found regardless of where uvicorn is launched from. Legacy shell env vars still work as fallback.

**Provider examples:**

```powershell
# OpenAI (default)
$env:LLM_API_KEY="sk-proj-..."

# Groq (free tier, fast)
$env:LLM_API_KEY="gsk_..."
$env:LLM_API_BASE="https://api.groq.com/openai/v1"
$env:LLM_MODEL="llama-3.1-70b-versatile"

# Together AI
$env:LLM_API_KEY="tog_..."
$env:LLM_API_BASE="https://api.together.xyz/v1"
$env:LLM_MODEL="meta-llama/Llama-3-70b-chat-hf"

# OpenRouter
$env:LLM_API_KEY="sk-or-..."
$env:LLM_API_BASE="https://openrouter.ai/api/v1"
$env:LLM_MODEL="anthropic/claude-3.5-sonnet"

# Ollama local (free, no key needed but field required)
$env:LLM_API_KEY="ollama"
$env:LLM_API_BASE="http://localhost:11434/v1"
$env:LLM_MODEL="llama3.1"
$env:LLM_JSON_MODE="false"

# LM Studio local
$env:LLM_API_KEY="lm-studio"
$env:LLM_API_BASE="http://localhost:1234/v1"
$env:LLM_MODEL="local-model"
$env:LLM_JSON_MODE="false"
```

### Source files

| File | Role |
|------|------|
| `backend/main.py` | FastAPI app + CORS + startup preload + `load_dotenv()` |
| `backend/routers/analysis.py` | `/api/analyze-zone` + `/api/ai-insight` router |
| `backend/routers/population.py` | `/api/population/density` router — reads GeoJSON from `data/population/` |
| `backend/models/schemas.py` | Pydantic models: BoundingBox, CafeStats, ZoneAnalysis, AiInsightRequest/Response, BenchmarkMetrics |
| `backend/services/LocationApiService.py` | bbox filter + stat aggregation |
| `backend/services/AiInsightService.py` | benchmark computation + LLM prompt + rule-based fallback |
| `backend/services/DataLoaderService.py` | cached CSV/GeoJSON loader |
| `be/.env` | LLM credentials — `LLM_API_KEY`, `LLM_API_BASE`, `LLM_MODEL`, `LLM_JSON_MODE` |

### Data sources loaded at startup

| File | Purpose |
|------|---------|
| `Step 2_ Data Processing/Coffee_Tea_Data_GGMap.csv` | café point data |
| `Step 2_ Data Processing/Coffee_Tea_Data_POI.geojson` | POI polygons/points |

---

## 11. Location Intelligence Module (Step 3)

The `LocationModule` is the live-query zone analysis feature built in Step 3 of the frontend work.

### Files created

| File | Purpose |
|------|---------|
| `fe/src/services/locationApiService.js` | `analyzeZone(bbox)` — POST to FastAPI |
| `fe/src/services/insightService.js` | `deriveInsights(analysis)` — pure rule-based text (fast, instant) |
| `fe/src/services/aiInsightService.js` | `fetchAiInsight(analysis)` — POST to `/api/ai-insight` (async, lazy) |
| `fe/src/hooks/useLocationIntelligence.js` | `useReducer` state machine: bbox → fetch → rule-based insights + AI insights |
| `fe/src/components/LocationModule/MapPanel.jsx` | Goong Maps 2-click bbox draw |
| `fe/src/components/LocationModule/StatsPanel.jsx` | Recharts BarChart (POI) + RadarChart (café signals) |
| `fe/src/components/LocationModule/InsightPanel.jsx` | Chat-style insight UI |
| `fe/src/components/LocationModule/LocationModule.jsx` | Root container, layout, reset via `key={resetCount}` |
| `fe/src/LocationModule.css` | Scoped styles using `@container` queries |

### User flow

1. Navigate to **Location Intel (◎)** in the sidebar.
2. Click **✏ Draw zone** — cursor becomes crosshair.
3. Click first map corner, then opposite corner.
4. Click **Analyze zone** — POST fires to `/api/analyze-zone`.
5. `StatsPanel` renders bar + radar charts from response JSON.
6. `InsightPanel` renders rule-based headline, signal bullets, verdict (instant).
7. AI Insight section loads asynchronously below — shows benchmark comparison, persona analysis, market gap, and strategic recommendations.
8. Click **↺ Reset** to clear and start over.

### insightService rules summary

| Signal | Condition | Insight |
|--------|-----------|---------|
| Café count | 0 | "Pioneer opportunity or data gap" |
| Avg rating | ≥ 4.5 | "Strong quality bar set by existing venues" |
| Avg rating | < 4.0 | "Gap for higher-quality positioning" |
| Sentiment | ≥ 0.6 | "Customers are generally satisfied" |
| Sentiment | < 0.3 | "Unmet demand signal" |
| Review density | ≥ 200 | "Active, engaged customer base" |
| Dominant POI | Food/Commercial/Leisure/Transport | "Strong foot-traffic anchor" |
| Dominant POI | Office | "Weekday daytime demand potential" |

---

## 12. Artifact Refresh Workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. export_dashboard_artifacts.py                    │
│    Reads: Step 2 CSV, Step 3 CSV, Step 5 notebooks  │
│    Writes: ai_workspace/web_dashboard/data/         │
│             model_runs.csv                          │
│             grid_summary.csv                        │
│             kpi_summary.json                        │
└──────────────────────────┬──────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│ 2. build_verified_artifacts.py                      │
│    Reads: Step 3 CSV + rule v5-1                    │
│    Writes: ai_workspace/web_dashboard/data/         │
│             grid_predictions.csv                    │
│             grid_predictions.json                   │
└──────────────────────────┬──────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│ 3. sync_prediction_bundle.mjs                       │
│    Reads: ai_workspace/web_dashboard/data/          │
│           grid_predictions.json                     │
│    Writes: ai_workspace/web_dashboard/data/         │
│           dashboard_data_bundle.json                │
└──────────────────────────┬──────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│ 4. (Optional) export_spatial_geojson.py             │
│    Writes: ai_workspace/web_dashboard/data/         │
│            spatial/full/*.geojson                   │
│            spatial/hotspots/*.geojson               │
│            city_bounds.json                         │
└─────────────────────────────────────────────────────┘
```

---

## 13. Agent Handoff State

### Current verified status

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ passes |
| Backend `/health` | ✅ when uvicorn running |
| Active views | `overview`, `map`, `location` |
| Population density layer | ✅ embedded in Map view (toggle off by default) |

### Known non-issues (informational only)

- **Chunk size warning** from Vite build: expected — Goong JS + Recharts are large. No action needed unless performance degrades.
- **`PlacesPage`, `ModelPage`, `LineagePage`, `OpportunityPage`** exist in `src/components/pages/` but are not wired to nav. They contain stale/hardcoded data and are kept for future reference only.

### If data contracts change

1. Update `src/data/dashboardBundle.js` (`deriveDashboardView`)
2. Update `scripts/sync_prediction_bundle.mjs`
3. Update `ai_workspace/web_dashboard/data/kpi_summary.json` schema if new top-level keys added
4. Re-run full artifact pipeline (Section 12 above)
5. Update this wiki

### If backend schema changes

1. Update `backend/models/schemas.py`
2. Update `src/services/locationApiService.js` call signature
3. Update `src/services/insightService.js` field references
4. Update `src/components/LocationModule/StatsPanel.jsx` field references

---

## 14. Guardrails & Wording Guide

### Always use

| ✅ Use | ❌ Avoid |
|--------|---------|
| Observed café density | Ground-truth demand |
| Observed review activity | Revenue forecast |
| Engineered vitality score | Success probability |
| Model-estimated relative potential | ROI prediction |
| Pseudo-labelled opportunity class | Best location guaranteed |
| Candidate zone for further research | Confirmed investment site |
| Exploratory site-selection support | Market share projection |

### Trust badge colours (used in UI)

| Badge | Meaning |
|-------|---------|
| `Observed` (green) | directly measured from data |
| `Engineered` (amber) | derived / computed feature |
| `Estimated` (indigo) | model output or score |
| `Pseudo-label` (red-light) | heuristic label, not ground truth |
| `Parsed` (orange) | metric extracted from notebook output |
| `Verified` (blue) | directly exported from a controlled script |

### One-sentence disclaimer (safe to use anywhere)

> Scores and labels in SmartSite are engineered from observed web data and spatial heuristics for exploratory analysis; they are not ground-truth demand signals or revenue forecasts.

---

## 15. Population Density Feature (2026-04-13)

### Overview

Ward-level population density choropleth overlay for the **Bản đồ thị trường** (Map) view.
Implemented as an independent toggle widget — does not interfere with existing grid/hotspot layers.

### Architecture

```
scripts/crawl_population_density.py
  └─ Generates: data/population/{hcm,hn,danang}_population.geojson
                data/population/index.json

be/backend/routers/population.py
  └─ GET /api/population/density?city=hcm|hn|danang
     Reads GeoJSON files from data/population/ and returns them as-is.

fe/src/services/populationService.js
  └─ fetchPopulationDensity(city) — GET /api/population/density
     Simple in-memory cache per city (clears on module reload / HMR).

fe/src/components/PopulationLayer/PopulationDensityLayer.jsx
  └─ Choropleth layer widget embedded inside AIMapPage.
     • Toggle button (default: OFF)
     • City selector: HCM / HN / Đà Nẵng
     • 5-class quantile breaks, ColorBrewer YlOrRd palette
     • Legend with density ranges + colour swatches
     • Popup on ward click: ward name, district, population, density, area
     • Loading / error states
```

### Data artifacts

| File | Description |
|------|-------------|
| `data/population/hcm_population.geojson` | HCM wards — 74 features |
| `data/population/hn_population.geojson` | Hà Nội wards — 58 features |
| `data/population/danang_population.geojson` | Đà Nẵng wards — 45 features |
| `data/population/index.json` | Metadata index (source, year, city counts) |

Each GeoJSON Feature has properties:
`ward_name`, `district_name`, `city`, `population`, `area_km2`, `density_per_km2`

### Data source note

**MVP seed data:** Vietnam 2019 Census (General Statistics Office) approximate district-to-ward distribution. Geometry is synthetic (tiled rectangles within district bounding boxes) because live boundary download from adminvsrm/GADM was unavailable during generation. To upgrade to real ward boundaries, run `scripts/crawl_population_density.py` with network access — it automatically tries live sources first.

### Refresh

```powershell
python scripts/crawl_population_density.py
```

### Build status after this feature

| Check | Status |
|-------|--------|
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ passes |
| Existing map layers untouched | ✅ |
| dashboard_data_bundle.json unchanged | ✅ |
