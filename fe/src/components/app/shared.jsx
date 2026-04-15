// ─── PillTabs ────────────────────────────────────────────────────────────────
export function PillTabs({ value, options, onChange }) {
  if (!options?.length) return null
  return (
    <div className="pill-tabs">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`pill-chip ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── TrustBadge ──────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  Observed:    'badge-observed',
  Engineered:  'badge-engineered',
  Estimated:   'badge-estimated',
  'Pseudo-labeled': 'badge-pseudo',
  Parsed:      'badge-parsed',
  Verified:    'badge-verified',
  'Quan sát':  'badge-observed',
  'Ước tính':  'badge-estimated',
  'Xử lý':     'badge-engineered',
  'Đã xác minh': 'badge-verified',
}
export function TrustBadge({ type }) {
  if (!type) return null
  return <span className={`trust-badge ${BADGE_STYLES[type] ?? 'badge-default'}`}>{type}</span>
}

// ─── SectionHeader ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  )
}

// ─── DisclaimerBanner ────────────────────────────────────────────────────────
export function DisclaimerBanner({ text, variant = 'info' }) {
  if (!text) return null
  return (
    <div className={`disclaimer-banner disclaimer-${variant}`}>
      <span className="disclaimer-icon">{variant === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>{text}</span>
    </div>
  )
}
