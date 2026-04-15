/**
 * InsightPanel.jsx
 * Displays rule-based insights derived from ZoneAnalysis.
 * Presented as a structured "chat-style" card feed — not a generative AI output.
 */

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ type, children }) {
  return (
    <div className={`lm-bubble lm-bubble--${type}`}>
      {children}
    </div>
  )
}

// ── Competition badge ─────────────────────────────────────────────────────────
function CompBadge({ meta }) {
  return (
    <span
      className="lm-comp-pill"
      style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}33` }}
    >
      {meta.emoji} {meta.label}
    </span>
  )
}

// ── AI Insight section ────────────────────────────────────────────────────────
function AiInsightSection({ aiInsight, aiLoading, aiError }) {
  if (aiLoading) {
    return (
      <div className="lm-ai-section">
        <div className="lm-ai-header">
          <span className="lm-ai-badge">✨ AI</span>
          <span>Đang phân tích nâng cao…</span>
        </div>
        <div className="lm-insight-loading">
          <span className="lm-dot-pulse" />
          <span className="lm-dot-pulse lm-dot-pulse--2" />
          <span className="lm-dot-pulse lm-dot-pulse--3" />
          <span className="lm-insight-loading-text">Đang gọi hệ thống AI…</span>
        </div>
      </div>
    )
  }

  if (aiError) {
    return (
      <div className="lm-ai-section lm-ai-section--error">
        <div className="lm-ai-header">
          <span className="lm-ai-badge lm-ai-badge--warn">⚠ AI</span>
          <span>Không thể tải phân tích AI</span>
        </div>
        <p className="lm-ai-error-text">{aiError}</p>
      </div>
    )
  }

  if (!aiInsight) return null

  const { headline, bullets, verdict, benchmark, model_used, fallback_reason } = aiInsight

  return (
    <div className="lm-ai-section">
      <div className="lm-ai-header">
        <span className="lm-ai-badge">✨ AI</span>
        <span>Phân tích chuyên sâu</span>
        <span className="lm-ai-model-tag">{model_used}</span>
      </div>

      {/* AI Headline */}
      <MessageBubble type="ai-headline">
        <p className="lm-bubble-headline">{headline}</p>
      </MessageBubble>

      {/* AI Bullets */}
      <MessageBubble type="ai-signals">
        <p className="lm-bubble-label">Phân tích so sánh benchmark</p>
        <ul className="lm-signal-list">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </MessageBubble>

      {/* AI Verdict */}
      <MessageBubble type="ai-verdict">
        <p className="lm-bubble-label">Nhận định chiến lược</p>
        <p className="lm-verdict-text">{verdict}</p>
      </MessageBubble>

      {/* Benchmark reference */}
      {benchmark && (
        <div className="lm-ai-benchmark">
          <p className="lm-bubble-label">📊 Benchmark thành phố</p>
          <div className="lm-benchmark-grid">
            {benchmark.avg_rating != null && (
              <span>Rating TB: <strong>{benchmark.avg_rating.toFixed(2)}★</strong></span>
            )}
            {benchmark.avg_sentiment != null && (
              <span>Sentiment TB: <strong>{benchmark.avg_sentiment.toFixed(3)}</strong></span>
            )}
            {benchmark.avg_review_density != null && (
              <span>Review density TB: <strong>{benchmark.avg_review_density.toFixed(1)}</strong></span>
            )}
            {benchmark.total_zones_compared > 0 && (
              <span>Tổng quán trong dataset: <strong>{benchmark.total_zones_compared}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* AI disclaimer */}
      <div className="lm-insight-footer lm-ai-footer">
        <span className="lm-insight-footer-icon">🤖</span>
        Nhận định được tạo bởi {model_used === 'rule-based' ? 'hệ thống quy tắc nâng cao' : `mô hình ${model_used}`} với
        benchmark toàn thành phố. Kết quả mang tính tham khảo — cần xác minh thực địa.
      </div>
      {model_used === 'rule-based' && fallback_reason && (
        <div className="lm-insight-footer lm-ai-footer">
          <span className="lm-insight-footer-icon">🛠</span>
          Lý do fallback: {fallback_reason}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InsightPanel({ insights, aiInsight, aiLoading, aiError, loading, error }) {
  // Loading state
  if (loading) {
    return (
      <div className="lm-insight-panel">
        <div className="lm-insight-header">
          <span className="lm-insight-avatar">🔍</span>
          <div>
            <strong>Phân tích vùng</strong>
            <p>Đang phân tích khu vực đã chọn…</p>
          </div>
        </div>
        <div className="lm-insight-loading">
          <span className="lm-dot-pulse" />
          <span className="lm-dot-pulse lm-dot-pulse--2" />
          <span className="lm-dot-pulse lm-dot-pulse--3" />
          <span className="lm-insight-loading-text">Đang truy vấn hệ thống…</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="lm-insight-panel">
        <div className="lm-insight-header">
          <span className="lm-insight-avatar">⚠</span>
          <div>
            <strong>Phân tích thất bại</strong>
            <p>Không thể kết nối hệ thống</p>
          </div>
        </div>
        <MessageBubble type="error">
          <p>{error}</p>
          <p className="lm-bubble-hint">Hãy đảm bảo FastAPI backend đang chạy trên cổng 8000.</p>
        </MessageBubble>
      </div>
    )
  }

  // Empty state — no analysis yet
  if (!insights) {
    return (
      <div className="lm-insight-panel lm-insight-panel--idle">
        <div className="lm-insight-header">
          <span className="lm-insight-avatar">💡</span>
          <div>
            <strong>Phân tích vị trí thông minh</strong>
            <p>Vẽ vùng trên bản đồ để bắt đầu</p>
          </div>
        </div>
        <div className="lm-insight-idle">
          <ol className="lm-insight-steps">
            <li>Nhấn <strong>Vẽ vùng</strong> trên bản đồ</li>
            <li>Nhấn hai góc để xác định khu vực</li>
            <li>Nhấn <strong>Phân tích vùng</strong> để gửi yêu cầu</li>
          </ol>
          <p className="lm-insight-disclaimer">
            Kết quả chỉ phản ánh <em>tín hiệu quan sát</em>.
            Không phải dự báo doanh thu hay đảm bảo địa điểm.
          </p>
        </div>
      </div>
    )
  }

  const { headline, bullets, verdict, competitionMeta } = insights

  return (
    <div className="lm-insight-panel">
      {/* Header */}
      <div className="lm-insight-header">
        <span className="lm-insight-avatar">🗺</span>
        <div>
          <strong>Phân tích khu vực</strong>
          <p>Tóm tắt tín hiệu dựa trên quy tắc</p>
        </div>
        <CompBadge meta={competitionMeta} />
      </div>

      {/* Headline bubble */}
      <MessageBubble type="headline">
        <p className="lm-bubble-headline">{headline}</p>
      </MessageBubble>

      {/* Signal bullets */}
      <MessageBubble type="signals">
        <p className="lm-bubble-label">Tín hiệu quan sát</p>
        <ul className="lm-signal-list">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </MessageBubble>

      {/* Verdict */}
      <MessageBubble type="verdict">
        <p className="lm-bubble-label">Nhận định</p>
        <p className="lm-verdict-text">{verdict}</p>
      </MessageBubble>

      {/* Disclaimer */}
      <div className="lm-insight-footer">
        <span className="lm-insight-footer-icon">ℹ</span>
        Nhận định được tạo từ quy tắc tóm tắt dữ liệu quan sát.
        Không sử dụng mô hình ML hay dự báo doanh thu.
      </div>

      {/* ── AI Insight Section (lazy loaded) ── */}
      <div className="lm-ai-divider">
        <span>Phân tích nâng cao</span>
      </div>
      <AiInsightSection
        aiInsight={aiInsight}
        aiLoading={aiLoading}
        aiError={aiError}
      />
    </div>
  )
}
