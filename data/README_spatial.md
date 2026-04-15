# SmartSite spatial artifacts

Generated from `Step 3_ Spatial_Grid/Spatial_Grid_Tabular.csv` and merged with Step 5 predictions from `ai_workspace/web_dashboard/data/grid_predictions.csv`.

## Files
- `spatial/index.json`: manifest for lazy-loading per-city layers
- `spatial/full/<City>.geojson`: full per-city grid polygons
- `spatial/hotspots/<City>.geojson`: top 1200 within-city cells by `opportunityScore` for fast web overlays
- `city_bounds.json`: per-city extents for viewport fitting or fallback boundaries

## Opportunity score source
- Source: Step 5 score (`city_opportunity_score`, scaled to 0-100) joined by (`Grid_ID`, `City`).
- Strict mode is enabled: export fails if Step 5 predictions are missing or partial.
- Property `opportunityScoreSource` remains available for compatibility and should be `step5` for all rows in strict mode.

## Why split by city?
- Avoid shipping one monolithic ~57MB GeoJSON to the browser upfront
- Load only the city the user is currently exploring
- Keep a truthful path to the full geometry while offering a lighter hotspot layer for interactive use

## Geometry quality
- Grid polygons are reconstructed from center coordinates plus `row_idx` / `col_idx`.
- This is spatially meaningful and much better than centroid circles or raw bbox-only rendering.
- `city_bounds.json` is **not** an official admin boundary dataset.
- `hotspots/*.geojson` is a ranked subset for UI performance, not the full city grid.

## Web integration
The React dashboard should lazy-load `/spatial/index.json`, then fetch only the selected city's hotspot file when the overlay is enabled.
