/**
 * insightService.js
 * Rule-based text insights derived from a ZoneAnalysis response.
 * No ML — purely deterministic signal interpretation.
 */

const COMPETITION_LABELS = {
  low:       { label: 'Cạnh tranh thấp',       color: '#10b981', emoji: '🟢' },
  moderate:  { label: 'Cạnh tranh vừa phải',   color: '#f59e0b', emoji: '🟡' },
  high:      { label: 'Cạnh tranh cao',         color: '#f97316', emoji: '🟠' },
  very_high: { label: 'Cạnh tranh rất cao',     color: '#ef4444', emoji: '🔴' },
}

/**
 * Derive a structured insight summary from a ZoneAnalysis payload.
 * @param {object} analysis  ZoneAnalysis from the API
 * @returns {{ headline: string, bullets: string[], verdict: string, competitionMeta: object }}
 */
export function deriveInsights(analysis) {
  if (!analysis) return null

  const { cafe_stats, poi_breakdown, total_poi, competition_level, dominant_poi_category } = analysis
  const competitionMeta = COMPETITION_LABELS[competition_level] ?? COMPETITION_LABELS.moderate

  // ── Headline ────────────────────────────────────────────────────────────────
  const headline = buildHeadline(cafe_stats, competition_level)

  // ── Bullet points ────────────────────────────────────────────────────────────
  const bullets = []

  // Cafe volume signal
  if (cafe_stats.total_cafes === 0) {
    bullets.push('Không tìm thấy quán cà phê trong vùng này — có thể là cơ hội tiên phong hoặc thiếu dữ liệu.')
  } else {
    bullets.push(
      `Phát hiện ${cafe_stats.total_cafes} quán cà phê trong khu vực đã chọn.`
    )
  }

  // Rating signal
  if (cafe_stats.avg_rating != null) {
    const ratingStr = cafe_stats.avg_rating.toFixed(2)
    if (cafe_stats.avg_rating >= 4.5) {
      bullets.push(`Đánh giá trung bình cao (${ratingStr} ★) — các quán hiện tại đặt tiêu chuẩn chất lượng cao.`)
    } else if (cafe_stats.avg_rating >= 4.0) {
      bullets.push(`Đánh giá trung bình khá (${ratingStr} ★) — cạnh tranh nhưng vẫn có thể gia nhập bằng chất lượng.`)
    } else {
      bullets.push(`Đánh giá trung bình thấp (${ratingStr} ★) — có khoảng trống cho định vị chất lượng cao hơn.`)
    }
  }

  // Sentiment signal
  if (cafe_stats.avg_sentiment != null) {
    const s = cafe_stats.avg_sentiment
    if (s >= 0.6) {
      bullets.push(`Cảm xúc khách hàng tích cực (${s.toFixed(3)}) — khách hàng nhìn chung hài lòng.`)
    } else if (s >= 0.3) {
      bullets.push(`Cảm xúc trung tính (${s.toFixed(3)}) — có cơ hội tạo sự khác biệt về trải nghiệm.`)
    } else {
      bullets.push(`Cảm xúc tiêu cực (${s.toFixed(3)}) — các quán hiện tại có thể chưa đáp ứng nhu cầu.`)
    }
  }

  // Review density signal
  if (cafe_stats.review_density != null && cafe_stats.total_cafes > 0) {
    const rd = cafe_stats.review_density
    if (rd >= 200) {
      bullets.push(`Mật độ đánh giá cao (${rd.toFixed(0)} đánh giá/quán) — lượng khách hàng tích cực và gắn bó.`)
    } else if (rd >= 50) {
      bullets.push(`Mật độ đánh giá vừa phải (${rd.toFixed(0)} đánh giá/quán) — thị trường có khách quen.`)
    } else {
      bullets.push(`Mật độ đánh giá thấp (${rd.toFixed(0)} đánh giá/quán) — tín hiệu hoạt động trực tuyến hạn chế.`)
    }
  }

  // High-rated count
  if (cafe_stats.high_rated_count > 0 && cafe_stats.total_cafes > 0) {
    const pct = Math.round((cafe_stats.high_rated_count / cafe_stats.total_cafes) * 100)
    bullets.push(
      `${cafe_stats.high_rated_count} quán đánh giá ≥ 4.5 ★ (${pct}% trong vùng) — tiêu chuẩn chất lượng đã được thiết lập.`
    )
  }

  // POI context
  if (total_poi > 0) {
    bullets.push(
      `${total_poi} điểm POI trong vùng — danh mục chủ đạo: ${dominant_poi_category}.`
    )
    const poiInsight = buildPoiInsight(poi_breakdown, dominant_poi_category)
    if (poiInsight) bullets.push(poiInsight)
  } else {
    bullets.push('Không có dữ liệu POI cho vùng này — tín hiệu chỉ giới hạn ở dữ liệu quán cà phê.')
  }

  // ── Verdict ──────────────────────────────────────────────────────────────────
  const verdict = buildVerdict(cafe_stats, competition_level, total_poi, dominant_poi_category)

  return { headline, bullets, verdict, competitionMeta }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildHeadline(cafeStats, competitionLevel) {
  if (cafeStats.total_cafes === 0) {
    return 'Vùng thưa thớt — không phát hiện quán cà phê'
  }
  switch (competitionLevel) {
    case 'low':
      return `Vùng cạnh tranh thấp với ${cafeStats.total_cafes} quán cà phê`
    case 'moderate':
      return `Thị trường vừa phải với ${cafeStats.total_cafes} quán đang hoạt động`
    case 'high':
      return `Vùng cạnh tranh — ${cafeStats.total_cafes} quán hiện diện`
    case 'very_high':
      return `Vùng bão hòa — phát hiện ${cafeStats.total_cafes} quán cà phê`
    default:
      return `Vùng chứa ${cafeStats.total_cafes} quán cà phê`
  }
}

function buildPoiInsight(poiBreakdown, dominant) {
  const footTrafficCategories = ['Food', 'Commercial', 'Leisure', 'Transport']
  const residentialCategories = ['Residential', 'Education']

  if (footTrafficCategories.includes(dominant)) {
    return `Điểm neo lưu lượng người đi bộ mạnh (${dominant}) — hỗ trợ nhu cầu cà phê vào ban ngày.`
  }
  if (residentialCategories.includes(dominant)) {
    return `Khu dân cư/Giáo dục chiếm ưu thế (${dominant}) — tiềm năng lưu lượng sáng/chiều.`
  }
  if (dominant === 'Office') {
    return 'Vùng tập trung văn phòng — tiềm năng nhu cầu cà phê ngày thường.'
  }
  return null
}

function buildVerdict(cafeStats, competitionLevel, totalPoi, dominant) {
  const lowCompetition = competitionLevel === 'low' || competitionLevel === 'moderate'
  const goodPoi = totalPoi > 0 && ['Food', 'Commercial', 'Leisure', 'Transport', 'Office'].includes(dominant)
  const poorSentiment = cafeStats.avg_sentiment != null && cafeStats.avg_sentiment < 0.3
  const lowRating = cafeStats.avg_rating != null && cafeStats.avg_rating < 4.0

  if (cafeStats.total_cafes === 0 && goodPoi) {
    return '⚠ Tín hiệu tiên phong: môi trường POI hoạt động nhưng chưa có quán cà phê — cần xác minh thực địa trước khi hành động.'
  }
  if (lowCompetition && goodPoi) {
    return '✅ Tín hiệu quan sát cho thấy thị trường tương đối mở với các điểm neo lưu lượng. Khuyến nghị xác minh thực địa.'
  }
  if (lowCompetition && !goodPoi) {
    return '🟡 Cạnh tranh thấp nhưng hỗ trợ POI hạn chế — nhu cầu có thể bị giới hạn. Cần nghiên cứu thêm.'
  }
  if (!lowCompetition && (poorSentiment || lowRating)) {
    return '🟡 Vùng cạnh tranh với tín hiệu chất lượng yếu — định vị khác biệt có thể tạo lợi thế.'
  }
  if (!lowCompetition) {
    return '🔴 Phát hiện cạnh tranh cao. Gia nhập cần có sự khác biệt rõ ràng. Không phải dự báo — cần xác minh thực địa.'
  }
  return '📊 Đã phân tích vùng. Hãy xem xét tất cả tín hiệu ở trên trước khi đưa ra kết luận.'
}