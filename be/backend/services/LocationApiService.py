import pandas as pd
from shapely.geometry import box
from backend.models.schemas import BoundingBox, CafeStats, PoiCategoryBreakdown, ZoneAnalysis
from backend.services.DataLoaderService import load_cafe_data, load_poi_data

POI_CATEGORIES = ['Food', 'Education', 'Office', 'Residential', 'Commercial', 'Leisure', 'Transport', 'Other']

COMPETITION_THRESHOLDS = {
    'low':       (0,  10),
    'moderate':  (10, 30),
    'high':      (30, 60),
    'very_high': (60, float('inf')),
}


def _filter_cafes_by_bbox(df: pd.DataFrame, bbox: BoundingBox) -> pd.DataFrame:
    return df[
        (df['lat'] >= bbox.min_lat) & (df['lat'] <= bbox.max_lat) &
        (df['lng'] >= bbox.min_lng) & (df['lng'] <= bbox.max_lng)
    ]


def _filter_poi_by_bbox(gdf, bbox: BoundingBox):
    bbox_geom = box(bbox.min_lng, bbox.min_lat, bbox.max_lng, bbox.max_lat)
    return gdf[gdf.geometry.within(bbox_geom)]


def _classify_competition(total_cafes: int) -> str:
    for level, (low, high) in COMPETITION_THRESHOLDS.items():
        if low <= total_cafes < high:
            return level
    return 'very_high'


def _build_cafe_stats(cafes: pd.DataFrame) -> CafeStats:
    total = len(cafes)
    if total == 0:
        return CafeStats(
            total_cafes=0,
            avg_rating=None,
            avg_sentiment=None,
            avg_reviews=None,
            high_rated_count=0,
            review_density=None,
        )
    return CafeStats(
        total_cafes=total,
        avg_rating=round(float(cafes['rating'].mean()), 3),
        avg_sentiment=round(float(cafes['sentiment_score_final'].mean()), 3),
        avg_reviews=round(float(cafes['reviews_count'].mean()), 1),
        high_rated_count=int((cafes['rating'] >= 4.5).sum()),
        review_density=round(float(cafes['reviews_count'].sum()) / total, 1),
    )


def _build_poi_breakdown(poi_in_zone) -> PoiCategoryBreakdown:
    counts = poi_in_zone['Category_Clean'].value_counts().to_dict() if len(poi_in_zone) > 0 else {}
    return PoiCategoryBreakdown(
        **{cat: int(counts.get(cat, 0)) for cat in POI_CATEGORIES}
    )


def _dominant_category(breakdown: PoiCategoryBreakdown) -> str:
    return max(breakdown.model_dump(), key=lambda k: breakdown.model_dump()[k])


def analyze_zone(bbox: BoundingBox) -> ZoneAnalysis:
    cafe_df   = load_cafe_data()
    poi_gdf   = load_poi_data()

    cafes_in_zone = _filter_cafes_by_bbox(cafe_df, bbox)
    poi_in_zone   = _filter_poi_by_bbox(poi_gdf, bbox)

    cafe_stats    = _build_cafe_stats(cafes_in_zone)
    poi_breakdown = _build_poi_breakdown(poi_in_zone)

    return ZoneAnalysis(
        bbox=bbox,
        cafe_stats=cafe_stats,
        poi_breakdown=poi_breakdown,
        total_poi=len(poi_in_zone),
        competition_level=_classify_competition(cafe_stats.total_cafes),
        dominant_poi_category=_dominant_category(poi_breakdown),
    )
