import { NAV_ITEMS, VIEW_SUBTITLES, VIEW_TITLES } from '../../data/appContent'

export default function AppShell({ view, onViewChange, lastUpdated, dashboardData, children }) {
  const counts = dashboardData?.topMetrics ?? []
  const cityCount  = counts.find(m => m.label === 'Cities covered')?.value ?? '3'
  const gridCount  = counts.find(m => m.label === 'Spatial grids')?.value ?? '—'
  const placeCount = counts.find(m => m.label === 'Processed points')?.value ?? '—'

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo">S</div>
          <div>
            <h1 className="brand-name">SmartSite</h1>
            <p className="brand-sub">Market Explorer</p>
          </div>
        </div>

        <div className="sidebar-meta">
          <div className="sidebar-meta-item"><span>{cityCount}</span><label>Thành phố</label></div>
          <div className="sidebar-meta-item"><span>{gridCount}</span><label>Ô lưới</label></div>
          <div className="sidebar-meta-item"><span>{placeCount}</span><label>Địa điểm</label></div>
        </div>

        <nav className="nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              className={`nav-item ${view === item.value ? 'active' : ''}`}
              onClick={() => onViewChange(item.value)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Đồng bộ: {lastUpdated}</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div className="page-header-text">
            <h2 className="page-title">{VIEW_TITLES[view] ?? VIEW_TITLES.overview}</h2>
            <p className="page-subtitle">{VIEW_SUBTITLES[view] ?? ''}</p>
          </div>
          <div className="header-trust-note">
            SmartSite hiển thị <em>tín hiệu quan sát</em> và <em>xếp hạng tương đối</em>.
            Không phải dự báo doanh thu.
          </div>
        </header>
        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  )
}
