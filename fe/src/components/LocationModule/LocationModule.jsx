/**
 * LocationModule.jsx
 * Root container for the Location Intelligence feature.
 * Layout: full-width map on top, stats + insight panels side-by-side below.
 * All state lives in useLocationIntelligence — panels are pure display.
 */
import { useLocationIntelligence } from '../../hooks/useLocationIntelligence'
import InsightPanel from './InsightPanel'
import MapPanel from './MapPanel'
import StatsPanel from './StatsPanel'
import '../../LocationModule.css'

export default function LocationModule() {
  const {
    analysis,
    insights,
    aiInsight,
    aiLoading,
    aiError,
    loading,
    error,
    bbox,
    submitBbox,
    reset,
    resetCount,
  } = useLocationIntelligence()

  return (
    <div className="lm-root">
      {/* Page header */}
      <div className="lm-page-header">
        <div className="lm-page-header-text">
          <h3 className="lm-page-title">Phân tích vị trí thông minh</h3>
          <p className="lm-page-subtitle">
            Vẽ vùng chọn trên bản đồ để truy vấn tín hiệu quán cà phê &amp; POI
            từ hệ thống phân tích.
          </p>
        </div>

        {(analysis || error) && (
          <button
            type="button"
            className="lm-btn lm-btn--ghost lm-reset-btn"
            onClick={reset}
            disabled={loading}
          >
            ↺ Đặt lại
          </button>
        )}
      </div>

      {/* Trust note */}
      <div className="lm-trust-banner">
        <span>ℹ</span>
        Kết quả hiển thị <em>tín hiệu quan sát</em> từ dữ liệu hiện có.
        Không phải dự báo doanh thu hay khuyến nghị địa điểm chắc chắn.
      </div>

      {/* Map — full width */}
      <div className="lm-map-row">
        <MapPanel
          key={resetCount}
          onBboxSubmit={submitBbox}
          loading={loading}
          confirmedBbox={bbox}
        />
      </div>

      {/* Bottom row: stats | insights */}
      <div className="lm-bottom-row">
        <div className="lm-stats-col">
          <StatsPanel analysis={analysis} />
        </div>
        <div className="lm-insight-col">
          <InsightPanel
            insights={insights}
            aiInsight={aiInsight}
            aiLoading={aiLoading}
            aiError={aiError}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  )
}