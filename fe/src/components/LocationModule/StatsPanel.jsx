/**
 * StatsPanel.jsx
 * Visualises ZoneAnalysis stats with:
 *  - a horizontal bar chart for POI category breakdown
 *  - a radar chart for normalised café quality signals
 * Both use Recharts. No numbers are presented as forecasts.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// ── POI bar chart ─────────────────────────────────────────────────────────────
const POI_COLORS = {
  Food:        '#0f766e',
  Commercial:  '#0284c7',
  Leisure:     '#7c3aed',
  Transport:   '#0891b2',
  Office:      '#1d4ed8',
  Residential: '#ca8a04',
  Education:   '#16a34a',
  Other:       '#94a3b8',
}

function buildPoiRows(poiBreakdown) {
  return Object.entries(poiBreakdown)
    .map(([name, value]) => ({ name, value: value ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
}

function PoiBarChart({ poiBreakdown }) {
  const rows = buildPoiRows(poiBreakdown)

  if (rows.length === 0) {
    return <div className="lm-empty-state">Không có dữ liệu POI trong vùng này.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={88}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(15,118,110,0.06)' }}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            fontSize: 12,
          }}
          formatter={(value) => [value, 'Số lượng']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {rows.map((r) => (
            <Cell key={r.name} fill={POI_COLORS[r.name] ?? '#94a3b8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Café quality radar ────────────────────────────────────────────────────────
// Normalise each signal to a 0-100 scale for comparability on radar axes.
function buildRadarRows(cafeStats) {
  if (cafeStats.total_cafes === 0) return []

  return [
    {
      subject: 'Rating',
      // 0-5 → 0-100
      value: cafeStats.avg_rating != null ? Math.round((cafeStats.avg_rating / 5) * 100) : 0,
    },
    {
      subject: 'Sentiment',
      // -1..1 → 0-100 (API returns 0-1 range from the data)
      value: cafeStats.avg_sentiment != null ? Math.round(Math.max(0, cafeStats.avg_sentiment) * 100) : 0,
    },
    {
      subject: 'Top-rated\nvenues',
      // high_rated_count / total as %
      value:
        cafeStats.high_rated_count > 0
          ? Math.round((cafeStats.high_rated_count / cafeStats.total_cafes) * 100)
          : 0,
    },
    {
      subject: 'Review\ndensity',
      // Cap at 500 reviews/café → 100%
      value:
        cafeStats.review_density != null
          ? Math.min(100, Math.round((cafeStats.review_density / 500) * 100))
          : 0,
    },
    {
      subject: 'Avg\nreviews',
      // Cap at 300 avg reviews per café → 100%
      value:
        cafeStats.avg_reviews != null
          ? Math.min(100, Math.round((cafeStats.avg_reviews / 300) * 100))
          : 0,
    },
  ]
}

function CafeRadarChart({ cafeStats }) {
  const rows = buildRadarRows(cafeStats)

  if (cafeStats.total_cafes === 0) {
    return <div className="lm-empty-state">Không có dữ liệu quán cà phê để hiển thị.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart cx="50%" cy="50%" outerRadius={80} data={rows}>
        <PolarGrid stroke="rgba(0,0,0,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: '#64748b', whiteSpace: 'pre' }}
        />
        <Radar
          name="Zone signals"
          dataKey="value"
          stroke="#0f766e"
          fill="#0f766e"
          fillOpacity={0.22}
          dot={{ r: 3, fill: '#0f766e' }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            fontSize: 12,
          }}
          formatter={(value) => [`${value} / 100`, 'Tín hiệu chuẩn hóa']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ── Stat row helper ───────────────────────────────────────────────────────────
function StatRow({ label, value, hint }) {
  return (
    <div className="lm-stat-row">
      <span className="lm-stat-label">{label}</span>
      <span className="lm-stat-value">
        {value ?? <span className="lm-stat-na">n/a</span>}
        {hint && <span className="lm-stat-hint">{hint}</span>}
      </span>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function StatsPanel({ analysis }) {
  if (!analysis) {
    return (
      <div className="lm-stats-panel lm-stats-panel--empty">
        <div className="lm-empty-state">
          <span className="lm-empty-icon">📊</span>
          <p>Vẽ và xác nhận vùng trên bản đồ để xem thống kê.</p>
        </div>
      </div>
    )
  }

  const { cafe_stats, poi_breakdown, total_poi, competition_level, dominant_poi_category } = analysis

  return (
    <div className="lm-stats-panel">
      {/* ── Café KPIs ── */}
      <section className="lm-stats-section">
        <h4 className="lm-stats-section-title">☕ Tín hiệu quán cà phê</h4>
        <div className="lm-kpi-row">
          <div className="lm-kpi-card">
            <span>Tổng số quán</span>
            <strong>{cafe_stats.total_cafes}</strong>
          </div>
          <div className="lm-kpi-card">
            <span>Đánh giá TB</span>
            <strong>{cafe_stats.avg_rating != null ? `${cafe_stats.avg_rating.toFixed(2)} ★` : '—'}</strong>
          </div>
          <div className="lm-kpi-card">
            <span>Đánh giá cao ≥ 4.5 ★</span>
            <strong>{cafe_stats.high_rated_count}</strong>
          </div>
          <div className="lm-kpi-card">
            <span>Cảm xúc TB</span>
            <strong>{cafe_stats.avg_sentiment != null ? cafe_stats.avg_sentiment.toFixed(3) : '—'}</strong>
          </div>
        </div>

        <div className="lm-stats-detail">
          <StatRow
            label="Đánh giá TB / quán"
            value={cafe_stats.avg_reviews != null ? cafe_stats.avg_reviews.toFixed(1) : null}
          />
          <StatRow
            label="Mật độ đánh giá"
            value={cafe_stats.review_density != null ? `${cafe_stats.review_density.toFixed(1)} đánh giá/quán` : null}
          />
          <StatRow
            label="Mức cạnh tranh"
            value={<span className={`lm-comp-badge lm-comp-${competition_level}`}>{competition_level.replace('_', ' ')}</span>}
          />
        </div>
      </section>

      {/* ── Radar ── */}
      <section className="lm-stats-section">
        <h4 className="lm-stats-section-title">Tín hiệu chất lượng chuẩn hóa</h4>
        <p className="lm-stats-note">Mỗi trục được chuẩn hóa 0–100 so với giá trị tham chiếu tối đa. Không phải điểm số.</p>
        <CafeRadarChart cafeStats={cafe_stats} />
      </section>

      {/* ── POI KPIs ── */}
      <section className="lm-stats-section">
        <h4 className="lm-stats-section-title">📍 Ngữ cảnh POI</h4>
        <div className="lm-stats-detail">
          <StatRow label="Tổng POI" value={total_poi} />
          <StatRow label="Danh mục chủ đạo" value={dominant_poi_category} />
        </div>
      </section>

      {/* ── POI bar chart ── */}
      <section className="lm-stats-section">
        <h4 className="lm-stats-section-title">Phân bổ danh mục POI</h4>
        <PoiBarChart poiBreakdown={poi_breakdown} />
      </section>
    </div>
  )
}