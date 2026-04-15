from functools import lru_cache
from pathlib import Path

import geopandas as gpd
import pandas as pd

SERVICE_DIR = Path(__file__).resolve().parent
REPO_ROOT = SERVICE_DIR.parents[4]
DATA_DIR = REPO_ROOT / 'Step 2_ Data Processing'
GGMAP_CSV = DATA_DIR / 'Coffee_Tea_Data_GGMap.csv'
POI_GEOJSON = DATA_DIR / 'Coffee_Tea_Data_POI.geojson'


@lru_cache(maxsize=1)
def load_cafe_data() -> pd.DataFrame:
    df = pd.read_csv(GGMAP_CSV, encoding='utf-8-sig')
    df['reviews_count'] = pd.to_numeric(df['reviews_count'], errors='coerce').fillna(0).astype(int)
    df['rating'] = pd.to_numeric(df['rating'], errors='coerce')
    df['sentiment_score_final'] = pd.to_numeric(df['sentiment_score_final'], errors='coerce').fillna(0.0)
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    df['lng'] = pd.to_numeric(df['lng'], errors='coerce')
    df = df.dropna(subset=['lat', 'lng'])
    return df


@lru_cache(maxsize=1)
def load_poi_data() -> gpd.GeoDataFrame:
    gdf = gpd.read_file(POI_GEOJSON)
    if gdf.crs is None or gdf.crs.to_epsg() != 4326:
        gdf = gdf.set_crs('EPSG:4326', allow_override=True)
    return gdf
