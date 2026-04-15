from pydantic import BaseModel, Field
from typing import Optional, List


class BoundingBox(BaseModel):
    min_lat: float = Field(..., description="Southern latitude boundary")
    max_lat: float = Field(..., description="Northern latitude boundary")
    min_lng: float = Field(..., description="Western longitude boundary")
    max_lng: float = Field(..., description="Eastern longitude boundary")


class PoiCategoryBreakdown(BaseModel):
    Food: int
    Education: int
    Office: int
    Residential: int
    Commercial: int
    Leisure: int
    Transport: int
    Other: int


class CafeStats(BaseModel):
    total_cafes: int
    avg_rating: Optional[float]
    avg_sentiment: Optional[float]
    avg_reviews: Optional[float]
    high_rated_count: int  # rating >= 4.5
    review_density: Optional[float]  # total reviews / total cafes


class ZoneAnalysis(BaseModel):
    bbox: BoundingBox
    cafe_stats: CafeStats
    poi_breakdown: PoiCategoryBreakdown
    total_poi: int
    competition_level: str  # "low" | "moderate" | "high" | "very_high"
    dominant_poi_category: str


class BenchmarkMetrics(BaseModel):
    avg_rating: Optional[float] = None
    avg_sentiment: Optional[float] = None
    competition_score: Optional[float] = None
    avg_review_density: Optional[float] = None
    total_zones_compared: int = 0


class AiInsightRequest(BaseModel):
    zone_analysis: ZoneAnalysis


class AiInsightResponse(BaseModel):
    headline: str
    bullets: List[str]
    verdict: str
    benchmark: BenchmarkMetrics
    model_used: str = "rule-based"
    fallback_reason: Optional[str] = None
    language: str = "vi"
