"""
AiInsightService.py
Computes city-wide benchmark metrics, builds an English analytical prompt,
calls any OpenAI-compatible LLM API, returns Vietnamese JSON insight.

Supported providers (via environment variables):
  ┌──────────────┬────────────────────────────────────────────┬──────────────────────┐
  │ Provider     │ LLM_API_BASE                               │ LLM_API_KEY          │
  ├──────────────┼────────────────────────────────────────────┼──────────────────────┤
  │ OpenAI       │ (leave empty, default)                     │ sk-...               │
  │ Groq         │ https://api.groq.com/openai/v1             │ gsk_...              │
  │ Together     │ https://api.together.xyz/v1                │ tog_...              │
  │ OpenRouter   │ https://openrouter.ai/api/v1               │ sk-or-...            │
  │ Ollama local │ http://localhost:11434/v1                   │ ollama (any string)  │
  │ LM Studio    │ http://localhost:1234/v1                    │ lm-studio            │
  │ Any other    │ https://your-provider.com/v1                │ your-key             │
  └──────────────┴────────────────────────────────────────────┴──────────────────────┘

Legacy env vars (OPENAI_API_KEY, OPENAI_MODEL) still work as fallback.
"""
import json
import os
import logging
from typing import Optional

from backend.models.schemas import (
    AiInsightResponse,
    BenchmarkMetrics,
    ZoneAnalysis,
)
from backend.services.DataLoaderService import load_cafe_data, load_poi_data

logger = logging.getLogger(__name__)

# ── Benchmark computation ─────────────────────────────────────────────────────

def compute_benchmark() -> BenchmarkMetrics:
    """Compute city-wide averages from the full dataset as benchmark."""
    cafe_df = load_cafe_data()
    poi_gdf = load_poi_data()

    total_cafes = len(cafe_df)
    if total_cafes == 0:
        return BenchmarkMetrics(total_zones_compared=0)

    avg_rating = round(float(cafe_df['rating'].mean()), 3)
    avg_sentiment = round(float(cafe_df['sentiment_score_final'].mean()), 3)
    avg_review_density = round(float(cafe_df['reviews_count'].mean()), 1)

    # Competition score: normalised density (cafes per 1000 POIs as proxy)
    total_poi = len(poi_gdf)
    competition_score = round((total_cafes / max(total_poi, 1)) * 100, 1)

    return BenchmarkMetrics(
        avg_rating=avg_rating,
        avg_sentiment=avg_sentiment,
        competition_score=competition_score,
        avg_review_density=avg_review_density,
        total_zones_compared=total_cafes,
    )


# ── Prompt builder (English reasoning) ───────────────────────────────────────

def _build_analysis_prompt(zone: ZoneAnalysis, benchmark: BenchmarkMetrics) -> str:
    cs = zone.cafe_stats
    poi = zone.poi_breakdown.model_dump()
    poi_str = ", ".join(f"{k}: {v}" for k, v in poi.items() if v > 0)

    return f"""You are an Elite Spatial Data Analyst and Site Selection Strategist for Commercial Real Estate, F&B, and Retail.
Your core skill is synthesizing cleaned geographical metrics and comparing them against market benchmarks to identify hidden commercial opportunities, saturation risks, and optimal business models.

The user has selected a specific geographic bounding box. Below are the exact, calculated metrics for this Target Zone, along with Benchmark Data (city averages) for relative comparison.

### 📊 INPUT DATA SETS:

1. TARGET ZONE METRICS (The selected area):
- Total Venues: {cs.total_cafes}
- Average Rating: {cs.avg_rating}/5.0
- Sentiment Index: {cs.avg_sentiment} (scale 0-1, customer satisfaction level)
- Competition Level: {zone.competition_level}
- High-rated venues (≥4.5★): {cs.high_rated_count}
- Review Density: {cs.review_density} reviews/venue
- Average Reviews per venue: {cs.avg_reviews}
- Total POI: {zone.total_poi}
- Dominant POI Category: {zone.dominant_poi_category}
- POI Distribution: {poi_str}

2. BENCHMARK METRICS (City-wide averages for comparative analysis):
- City Average Rating: {benchmark.avg_rating}
- City Average Sentiment: {benchmark.avg_sentiment}
- City Average Review Density: {benchmark.avg_review_density}
- City Competition Score: {benchmark.competition_score}
- Total venues in dataset: {benchmark.total_zones_compared}

### 🛑 STRICT ANALYTICAL DIRECTIVES:

1. NO RAW DATA REGURGITATION: The user already sees the exact numbers on their dashboard charts. DO NOT simply repeat the stats (e.g., Never say "This area has 50 venues and a 4.2 rating").
2. COMPARATIVE REASONING: You MUST use the Benchmark Metrics to evaluate the Target Zone. Is the sentiment unusually low compared to the city average despite high competition? This indicates a severe quality gap.
3. CROSS-CORRELATION: Connect the POI Distribution with the performance metrics. (Example: "A high concentration of Office POIs combined with low sentiment in F&B suggests current offerings fail to meet the standards of corporate workers").
4. TARGET PERSONA: Explicitly name the core customer demographic based on the POI data.
5. VIETNAMESE OUTPUT: Your reasoning can be internal in English, but the final generated JSON content MUST be strictly in highly professional, natural Vietnamese.

### 📋 REQUIRED OUTPUT FORMAT (STRICT JSON):
Respond ONLY with a valid JSON object matching the exact structure below. Do not wrap it in markdown block quotes (like ```json), no preamble, no conversational text.

{{
  "headline": "Một câu nhận định sắc bén, bao quát tình trạng thị trường của khu vực này dựa trên sự chênh lệch so với benchmark.",
  "bullets": [
    "Phân tích tệp khách hàng trọng tâm (Demographic) dựa trên tỷ lệ POI.",
    "Chỉ ra sự bất thường hoặc cơ hội (Market Gap) bằng cách so sánh chỉ số của khu vực (Cạnh tranh, Rating, Sentiment) với Benchmark.",
    "Đề xuất 1-2 mô hình kinh doanh hoặc chiến lược định vị ngách (Niche) có khả năng thắng cao nhất tại tọa độ này."
  ],
  "verdict": "Kết luận điều hành (Executive Summary): Có nên thâm nhập khu vực này không? Nêu rõ rủi ro cốt lõi và yếu tố then chốt để thành công (Key Success Factor)."
}}"""


# ── LLM provider config ───────────────────────────────────────────────────────

def _get_llm_config() -> tuple[Optional[str], Optional[str], str, Optional[str]]:
    """
    Resolve LLM connection config from environment variables.
    Priority: LLM_* vars > OPENAI_* vars (backward compatible).

    Returns: (api_key, base_url, model, provider_name)
    """
    # New unified env vars (recommended)
    api_key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("LLM_API_BASE") or os.environ.get("OPENAI_API_BASE")
    model = os.environ.get("LLM_MODEL") or os.environ.get("OPENAI_MODEL") or "gpt-4o-mini"

    # Auto-detect provider name for logging
    provider = "openai"
    if base_url:
        if "groq" in base_url:
            provider = "groq"
        elif "together" in base_url:
            provider = "together"
        elif "openrouter" in base_url:
            provider = "openrouter"
        elif "localhost" in base_url or "127.0.0.1" in base_url:
            provider = "local"
        else:
            provider = "custom"

    return api_key, base_url, model, provider


# ── LLM call (any OpenAI-compatible provider) ─────────────────────────────────

def _call_llm(prompt: str) -> tuple[Optional[dict], str, Optional[str]]:
    """
    Call any OpenAI-compatible LLM API.
    Returns (parsed_dict_or_None, model_name_used, fallback_reason).
    """
    api_key, base_url, model, provider = _get_llm_config()

    if not api_key:
        reason = "Thiếu LLM_API_KEY/OPENAI_API_KEY trong runtime backend"
        logger.warning("No LLM API key set (LLM_API_KEY or OPENAI_API_KEY) — falling back to rule-based")
        return None, "rule-based", reason

    try:
        from openai import OpenAI

        # Build client — base_url=None means default OpenAI endpoint
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = OpenAI(**client_kwargs)

        logger.info("Calling LLM: provider=%s model=%s base_url=%s", provider, model, base_url or "(default)")

        # Build request — some providers don't support response_format
        request_kwargs = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a spatial data analyst. Always respond with valid JSON only. No markdown, no preamble."
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.4,
            "max_tokens": 1200,
        }

        # response_format is supported by OpenAI, Groq, Together, OpenRouter
        # Skip for local providers that might not support it
        use_json_mode = os.environ.get("LLM_JSON_MODE", "true").lower() != "false"
        if use_json_mode:
            request_kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**request_kwargs)

        raw = response.choices[0].message.content.strip()

        # Some models wrap JSON in ```json ... ``` — strip it
        if raw.startswith("```"):
            lines = raw.split("\n")
            # Remove first and last lines (```json and ```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw = "\n".join(lines).strip()

        parsed = json.loads(raw)
        model_label = f"{model} ({provider})" if provider != "openai" else model
        return parsed, model_label, None

    except ImportError:
        reason = "Thiếu package `openai` trong Python environment đang chạy backend"
        logger.warning("openai package not installed — falling back to rule-based")
        return None, "rule-based", reason
    except json.JSONDecodeError as e:
        reason = (
            "LLM trả về JSON không hợp lệ; thử tắt `LLM_JSON_MODE` nếu provider/model "
            "không hỗ trợ `response_format=json_object`"
        )
        logger.error("LLM returned invalid JSON: %s", e)
        return None, "rule-based", reason
    except Exception as e:
        reason = f"LLM call failed ({provider}/{model}): {str(e)}"
        logger.error("LLM call failed (%s/%s): %s", provider, model, e)
        return None, "rule-based", reason


# ── Enhanced rule-based fallback ──────────────────────────────────────────────

def _rule_based_insight(zone: ZoneAnalysis, benchmark: BenchmarkMetrics) -> dict:
    """Enhanced rule-based fallback with benchmark comparison — Vietnamese output."""
    cs = zone.cafe_stats
    bm = benchmark

    # ── Headline with benchmark comparison ──
    if cs.total_cafes == 0:
        headline = "Vùng trắng chiến lược — không phát hiện đối thủ, nhưng cần xác minh nhu cầu thực tế"
    elif bm.avg_rating and cs.avg_rating and cs.avg_rating < bm.avg_rating - 0.3:
        headline = f"Khoảng trống chất lượng rõ rệt — rating khu vực thấp hơn trung bình thành phố {abs(cs.avg_rating - bm.avg_rating):.2f} điểm"
    elif zone.competition_level in ('high', 'very_high') and bm.avg_sentiment and cs.avg_sentiment and cs.avg_sentiment < bm.avg_sentiment:
        headline = "Thị trường bão hòa với mức hài lòng dưới trung bình — cơ hội cho định vị khác biệt"
    elif zone.competition_level in ('low', 'moderate') and zone.total_poi > 20:
        headline = "Thị trường tương đối mở với hạ tầng POI hỗ trợ — tín hiệu gia nhập tích cực"
    else:
        headline = f"Khu vực cạnh tranh {zone.competition_level} với {cs.total_cafes} đối thủ đang hoạt động"

    # ── Bullets with cross-correlation ──
    bullets = []

    # Persona from POI
    dominant = zone.dominant_poi_category
    persona_map = {
        'Office': 'nhân viên văn phòng, freelancer — nhu cầu cà phê nhanh, ổn định ngày thường',
        'Residential': 'cư dân địa phương, gia đình — nhu cầu quán quen, không gian thoải mái',
        'Education': 'sinh viên, giảng viên — nhạy giá, cần wifi và không gian học tập',
        'Commercial': 'người mua sắm, khách vãng lai — nhu cầu nghỉ chân, grab-and-go',
        'Food': 'thực khách khu ẩm thực — cơ hội cross-selling, vị trí đắc địa footfall',
        'Leisure': 'khách giải trí, du khách — nhu cầu trải nghiệm, sẵn sàng chi tiêu cao hơn',
        'Transport': 'hành khách, người di chuyển — nhu cầu take-away nhanh, tiện lợi',
    }
    persona = persona_map.get(dominant, 'đa dạng — cần khảo sát thêm hành vi tại chỗ')
    bullets.append(f"Tệp khách hàng trọng tâm: {persona} (POI chủ đạo: {dominant}).")

    # Market gap — benchmark comparison
    if bm.avg_rating and cs.avg_rating:
        diff = cs.avg_rating - bm.avg_rating
        if diff < -0.2:
            bullets.append(
                f"Khoảng trống chất lượng: rating khu vực ({cs.avg_rating:.2f}★) thấp hơn "
                f"benchmark thành phố ({bm.avg_rating:.2f}★) — cơ hội vượt trội bằng chất lượng dịch vụ."
            )
        elif diff > 0.2:
            bullets.append(
                f"Chất lượng vượt benchmark: rating khu vực ({cs.avg_rating:.2f}★) cao hơn "
                f"trung bình ({bm.avg_rating:.2f}★) — rào cản gia nhập cao, cần sản phẩm xuất sắc."
            )
        else:
            bullets.append(
                f"Rating khu vực ({cs.avg_rating:.2f}★) tương đương benchmark ({bm.avg_rating:.2f}★) "
                f"— thị trường cân bằng, cần yếu tố khác biệt ngoài chất lượng cơ bản."
            )

    if bm.avg_sentiment and cs.avg_sentiment:
        sent_diff = cs.avg_sentiment - bm.avg_sentiment
        if sent_diff < -0.1:
            bullets.append(
                f"Cảm xúc khách hàng ({cs.avg_sentiment:.3f}) thấp hơn trung bình thành phố "
                f"({bm.avg_sentiment:.3f}) — dấu hiệu khách hàng chưa hài lòng với lựa chọn hiện tại."
            )

    # Niche recommendation
    if zone.competition_level == 'low' and dominant in ('Office', 'Commercial'):
        bullets.append(
            "Đề xuất: mô hình specialty coffee / co-working café nhắm vào dân văn phòng — "
            "ít cạnh tranh, nhu cầu ổn định."
        )
    elif zone.competition_level in ('high', 'very_high') and cs.avg_rating and cs.avg_rating < 4.2:
        bullets.append(
            "Đề xuất: định vị premium boutique café với trải nghiệm vượt trội — "
            "lấp khoảng trống chất lượng trong thị trường đông đúc."
        )
    elif dominant == 'Education':
        bullets.append(
            "Đề xuất: mô hình café giá sinh viên kết hợp không gian study/cowork — "
            "phù hợp tệp khách nhạy giá nhưng trung thành."
        )
    elif dominant == 'Residential':
        bullets.append(
            "Đề xuất: quán café cộng đồng / neighborhood café tập trung vào không gian "
            "gia đình và khách quen — xây dựng loyalty dài hạn."
        )
    else:
        bullets.append(
            "Đề xuất: nghiên cứu thêm hành vi tiêu dùng tại chỗ trước khi chọn mô hình — "
            "POI mix chưa đủ rõ ràng để xác định ngách tối ưu."
        )

    # ── Verdict ──
    if cs.total_cafes == 0 and zone.total_poi > 10:
        verdict = (
            "⚠ Vùng trắng có hạ tầng POI — tín hiệu tiên phong nhưng rủi ro cao. "
            "Yếu tố then chốt: khảo sát footfall thực tế và kiểm tra lý do vắng đối thủ "
            "(có thể do quy hoạch, mặt bằng, hoặc thật sự thiếu nhu cầu)."
        )
    elif zone.competition_level in ('low', 'moderate') and zone.total_poi > 20:
        verdict = (
            "✅ Tín hiệu tích cực để thâm nhập. Cạnh tranh vừa phải, hạ tầng POI hỗ trợ. "
            f"Rủi ro cốt lõi: dữ liệu chưa phản ánh footfall thực tế. "
            f"Key Success Factor: chọn đúng mô hình phù hợp tệp {dominant} và kiểm soát chi phí mặt bằng."
        )
    elif zone.competition_level in ('high', 'very_high'):
        if bm.avg_rating and cs.avg_rating and cs.avg_rating < bm.avg_rating:
            verdict = (
                "🟡 Thị trường đông đúc nhưng chất lượng dưới benchmark — cửa sổ cơ hội hẹp cho "
                "người chơi chất lượng cao. Rủi ro: chi phí mặt bằng cao trong vùng cạnh tranh. "
                "KSF: sản phẩm vượt trội + branding mạnh để chiếm thị phần nhanh."
            )
        else:
            verdict = (
                "🔴 Cạnh tranh cao với chất lượng đã tốt — rào cản gia nhập rất lớn. "
                "Chỉ nên thâm nhập nếu có lợi thế khác biệt rõ ràng (thương hiệu, vị trí góc, concept độc đáo). "
                "Nếu không, cân nhắc khu vực lân cận ít bão hòa hơn."
            )
    else:
        verdict = (
            "📊 Cần thu thập thêm dữ liệu thực địa trước khi ra quyết định. "
            "Các chỉ số hiện tại là tín hiệu tham khảo, không thay thế khảo sát mặt bằng."
        )

    return {
        "headline": headline,
        "bullets": bullets,
        "verdict": verdict,
    }


# ── Main entry point ─────────────────────────────────────────────────────────

def generate_ai_insight(zone: ZoneAnalysis) -> AiInsightResponse:
    """
    Generate AI-powered insight for a zone.
    Strategy:
    1. Compute city-wide benchmark
    2. Build English analytical prompt
    3. Try OpenAI call → Vietnamese JSON output
    4. Fall back to enhanced rule-based if LLM unavailable
    """
    benchmark = compute_benchmark()
    model_used = "rule-based"
    fallback_reason = None

    # Try LLM first (any OpenAI-compatible provider)
    prompt = _build_analysis_prompt(zone, benchmark)
    llm_result, model_label, llm_fallback_reason = _call_llm(prompt)

    if llm_result and "headline" in llm_result and "bullets" in llm_result and "verdict" in llm_result:
        model_used = model_label
        insight_data = llm_result
    else:
        # Enhanced rule-based fallback
        fallback_reason = llm_fallback_reason or "LLM response thiếu các field bắt buộc: headline, bullets, verdict"
        insight_data = _rule_based_insight(zone, benchmark)

    return AiInsightResponse(
        headline=insight_data["headline"],
        bullets=insight_data["bullets"],
        verdict=insight_data["verdict"],
        benchmark=benchmark,
        model_used=model_used,
        fallback_reason=fallback_reason,
        language="vi",
    )
