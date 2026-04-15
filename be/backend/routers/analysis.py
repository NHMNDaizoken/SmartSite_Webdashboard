from fastapi import APIRouter, HTTPException
from backend.models.schemas import BoundingBox, ZoneAnalysis, AiInsightRequest, AiInsightResponse
from backend.services.LocationApiService import analyze_zone
from backend.services.AiInsightService import generate_ai_insight

router = APIRouter(prefix='/api', tags=['analysis'])


@router.post('/analyze-zone', response_model=ZoneAnalysis)
def analyze_zone_endpoint(bbox: BoundingBox) -> ZoneAnalysis:
    if bbox.min_lat >= bbox.max_lat or bbox.min_lng >= bbox.max_lng:
        raise HTTPException(status_code=400, detail='Invalid bounding box: min values must be less than max values')
    return analyze_zone(bbox)


@router.post('/ai-insight', response_model=AiInsightResponse)
def ai_insight_endpoint(request: AiInsightRequest) -> AiInsightResponse:
    """Generate AI-powered zone insight with benchmark comparison.
    Attempts OpenAI LLM first; falls back to enhanced rule-based if unavailable.
    """
    try:
        return generate_ai_insight(request.zone_analysis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Insight generation failed: {str(e)}')
