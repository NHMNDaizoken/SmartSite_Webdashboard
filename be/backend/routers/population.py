"""
population.py
=============
FastAPI router for population density data.

Endpoints
---------
GET /api/population/density?city=hcm|hn|danang
    Returns GeoJSON FeatureCollection with ward-level population density.
    Reads from: ai_workspace/web_dashboard/data/population/{city}_population.geojson
    Returns 404 if city not found or file missing.
"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/population", tags=["population"])

# Resolve path relative to this file:
#   .../be/backend/routers/population.py  → .../data/population/
_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "population"

VALID_CITIES = {"hcm", "hn", "danang"}


def _geojson_path(city: str) -> Path:
    return _DATA_DIR / f"{city}_population.geojson"


@router.get("/density")
def get_population_density(city: str):
    """
    Return ward-level population density as a GeoJSON FeatureCollection.

    Parameters
    ----------
    city : str
        One of: hcm, hn, danang
    """
    city_lower = city.lower().strip()
    if city_lower not in VALID_CITIES:
        raise HTTPException(
            status_code=404,
            detail=f"City '{city}' not found. Valid values: {sorted(VALID_CITIES)}",
        )

    path = _geojson_path(city_lower)
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"Population data file for city '{city_lower}' not found at {path}. "
                "Run scripts/crawl_population_density.py to generate artifacts."
            ),
        )

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read population data: {exc}",
        ) from exc

    return JSONResponse(content=data)
