import { DISCLAIMERS } from '../../data/appContent'
import { DisclaimerBanner, PillTabs, SectionHeader, TrustBadge } from './shared'

// ═══════════════════════════════════════════════════════════════════
// MarketOverviewModule — Tổng quan thị trường (thay thế section EDA)
// ═══════════════════════════════════════════════════════════════════

const CORRELATION_DATA = [
  { feature: 'Ánh sáng đêm (NTL)',   key: 'ntl',    r: 0.14 },
  { feature: 'Văn phòng',             key: 'office', r: 0.12 },
  { feature: 'Giáo dục',              key: 'edu',    r: 0.10 },
  { feature: 'Khu dân cư',            key: 'res',    r: 0.07 },
]

const CITY_MACRO = {
  HCM:    { cafes: '4.000+', penetration: '10.2%', competition: '0.8%', model: 'Phân tán rộng',       color: '#2563eb' },
  HaNoi:  { cafes: '3.500+', penetration: '6.6%',  competition: '2.6%', model: 'Cụm thương mại tập trung', color: '#dc2626' },
  DaNang: { cafes: '<1.000',  penetration: '14.4%', competition: '1.2%', model: 'Trải đều diện rộng',   color: '#16a34a' },
}

function CorrelationBar({ label, value, maxValue = 0.15 }) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <span style={{ width: 140, fontSize: '0.84rem', color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.05)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: '#0f766e', transition: 'width 0.4s' }} />
      </div>
      <span style={{ width: 40, fontSize: '0.82rem', fontWeight: 600, textAlign: 'right', color: 'var(--text-primary)' }}>r={value}</span>
    </div>
  )
}

function MarketOverviewModule({ dashboardData, selectedCity }) {
  const cities = dashboardData.cityCoverage ?? []

  return (
    <>
      {/* Card 1: Tổng quan vĩ mô */}
      <section className="card">
        <SectionHeader
          title="Tổng quan vĩ mô thị trường"
          subtitle="So sánh quy mô, tỷ lệ phủ sóng và mô hình phân bổ không gian giữa 3 thành phố"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 12 }}>
          {Object.entries(CITY_MACRO).map(([code, info]) => (
            <div key={code} style={{
              padding: '16px 18px', borderRadius: 14,
              border: `1.5px solid ${selectedCity === code ? info.color + '44' : 'rgba(0,0,0,0.06)'}`,
              background: selectedCity === code ? info.color + '08' : '#fff',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: '1rem', color: info.color }}>
                  {code === 'HaNoi' ? 'Hà Nội' : code === 'DaNang' ? 'Đà Nẵng' : 'TP.HCM'}
                </strong>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                  background: info.color + '14', color: info.color,
                }}>{info.model}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Số quán</span><br/><strong style={{ fontSize: '1.05rem' }}>{info.cafes}</strong></div>
                <div><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phủ sóng</span><br/><strong style={{ fontSize: '1.05rem' }}>{info.penetration}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cạnh tranh khốc liệt (≥4 quán/ô)</span><br/><strong style={{ fontSize: '1.05rem' }}>{info.competition}</strong></div>
              </div>
            </div>
          ))}
        </div>
        <p className="note-text" style={{ marginTop: 12 }}>
          ~80% khu vực kinh doanh ở cả 3 thành phố ở trạng thái "1 quán/ô lưới" — mô hình "Độc quyền cục bộ" chiếm ưu thế
        </p>
      </section>

      {/* Card 2: Ma trận tương quan rút gọn */}
      <section className="card">
        <SectionHeader
          title="Động lực phân bổ quán Coffee & Tea"
          subtitle="Tương quan Pearson (r) giữa mật độ quán cà phê và các đặc trưng không gian"
        />
        <div style={{ maxWidth: 480, marginTop: 8 }}>
          {CORRELATION_DATA.map(item => (
            <CorrelationBar key={item.key} label={item.feature} value={item.r} />
          ))}
        </div>
        <p className="note-text" style={{ marginTop: 12 }}>
          NTL (ánh sáng vệ tinh) là proxy mạnh nhất — xác nhận tính hiệu lực của dữ liệu viễn thám VIIRS. Quán cà phê bám sát luồng thương mại hơn khu dân cư.
        </p>
      </section>

      {/* Card 3: Khoảng trống thị trường */}
      <section className="card">
        <SectionHeader
          title="Khoảng trống thị trường"
          subtitle="Ô lưới có lực cầu (Demand Index > 0) nhưng chưa có quán cà phê — phân theo thành phố"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 12 }}>
          {cities.map(c => {
            const code = c.sourceCity
            const totalG = Number(c.grids) || 0
            const withCafe = Number(c.points) || 0
            const gapEstimate = Math.max(0, totalG - Math.round(totalG * (parseFloat(CITY_MACRO[code]?.penetration) / 100 || 0.1)))
            return (
              <div key={code} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', background: '#fafbfc' }}>
                <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: 8 }}>
                  {code === 'HaNoi' ? 'Hà Nội' : code === 'DaNang' ? 'Đà Nẵng' : 'TP.HCM'}
                </strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Tổng ô lưới</span><strong style={{ color: 'var(--text-primary)' }}>{fmt(totalG)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Ô có quán</span><strong style={{ color: 'var(--text-primary)' }}>{fmt(withCafe)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#d97706', fontWeight: 600 }}>
                  <span>Ô trống tiềm năng</span><strong>{fmt(gapEstimate)}</strong>
                </div>
              </div>
            )
          })}
        </div>
        <p className="note-text" style={{ marginTop: 12 }}>
          "Ô trống tiềm năng" = ô có hoạt động kinh tế (NTL, POI) nhưng chưa có quán — cần xác minh thực địa trước khi kết luận
        </p>
      </section>

      {/* Card 4: Chất lượng dữ liệu */}
      <section className="card">
        <SectionHeader
          title="Chất lượng & độ tin cậy dữ liệu"
          subtitle="Tóm tắt các phát hiện quan trọng về thiên lệch dữ liệu và kiểm định tín hiệu"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 12 }}>
          <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.12)', background: 'rgba(254,242,242,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ fontSize: '0.92rem', color: '#991b1b' }}>Thiên kiến tích cực (Positive Bias)</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.55, margin: 0 }}>
              Rating trên Google Maps tập trung lệch ở 4.0–5.0 sao. Mô hình bắt buộc phải tích hợp trọng số Sentiment để lọc nhiễu thay vì chỉ dựa vào số sao.
            </p>
          </div>
          <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(16,185,129,0.15)', background: 'rgba(236,253,245,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <strong style={{ fontSize: '0.92rem', color: '#065f46' }}>Xác nhận VIIRS Night-Light</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#064e3b', lineHeight: 1.55, margin: 0 }}>
              Cường độ ánh sáng đêm đồng biến theo cấp số nhân với mật độ kinh tế. Vùng Q4 (sáng rực) có mật độ POI cao gấp 10x so với Q1 — xác nhận NTL là proxy đáng tin cậy.
            </p>
          </div>
          <div style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(245,158,11,0.15)', background: 'rgba(255,251,235,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🔍</span>
              <strong style={{ fontSize: '0.92rem', color: '#78350f' }}>Hiệu ứng cạnh tranh phi tuyến</strong>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#713f12', lineHeight: 1.55, margin: 0 }}>
              Sentiment giảm khi có 2–3 đối thủ (so sánh), nhưng phục hồi ở ≥4 quán với độ biến thiên cực lớn — phản ánh mô hình "Rủi ro cao, Lợi nhuận cao".
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

const fmt = (v, d = 0) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return v ?? '—'
  return d > 0 ? n.toFixed(d) : n.toLocaleString('vi-VN')
}

function cityLabel(code) {
  if (code === 'HaNoi') return 'Hà Nội'
  if (code === 'DaNang') return 'Đà Nẵng'
  if (code === 'HCM') return 'TP.HCM'
  return code
}

export default function OverviewTab({ dashboardData, selectedCity, onSelectCity, onNavigate }) {
  const mm = Object.fromEntries(dashboardData.topMetrics.map(m => [m.label, m.value]))
  const city  = dashboardData.cityCoverage.find(c => c.sourceCity === selectedCity) ?? dashboardData.cityCoverage[0]
  const ranked = [...dashboardData.cityCoverage].sort((a, b) => (b.opportunity ?? 0) - (a.opportunity ?? 0))
  const kpis = [
    { label: 'Thành phố phủ sóng',       value: mm['Cities covered']   ?? '3',   badge: 'Quan sát',   hint: 'HCM · Hà Nội · Đà Nẵng' },
    { label: 'Địa điểm quan sát',         value: mm['Processed points'] ?? '—',   badge: 'Quan sát',   hint: 'Từ Coffee_Tea_Data_GGMap.csv' },
    { label: 'Ô lưới không gian',          value: mm['Spatial grids']    ?? '—',   badge: 'Quan sát',   hint: 'Spatial_Grid_Tabular.csv' },
    ]

  return (
    <div className="page-content">
      <DisclaimerBanner text={DISCLAIMERS.global} />

      {/* KPI Strip */}
      <div className="kpi-strip">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{k.label}</span>
              <TrustBadge type={k.badge} />
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-hint">{k.hint}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <SectionHeader
          title="So sánh thành phố"
          subtitle="Điểm tiềm năng tương đối được tính từ NTL · POI · Sentiment · Mật độ quán"
        />
        <PillTabs
          options={dashboardData.cityCoverage.map(c => ({ label: cityLabel(c.sourceCity), value: c.sourceCity }))}
          value={selectedCity}
          onChange={onSelectCity}
        />
        {city && (
          <>
            <div className="mini-kpi-row">
              <div className="mini-kpi"><span>Quán quan sát</span><strong>{fmt(city.points)}</strong></div>
              <div className="mini-kpi"><span>Ô lưới</span><strong>{fmt(city.grids)}</strong></div>
              <div className="mini-kpi"><span>Tổng review</span><strong>{fmt(city.reviews)}</strong></div>
              <div className="mini-kpi"><span>Đánh giá TB</span><strong>{fmt(city.avgRating, 2)}</strong></div>
            </div>
            <div className="bar-chart">
              {ranked.map(c => (
                <div key={c.sourceCity} className="bar-row">
                  <div className="bar-meta">
                    <span>{cityLabel(c.sourceCity)}</span>
                    <strong>{c.opportunity ?? 0}/100</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${c.sourceCity === selectedCity ? 'bar-fill--active' : ''}`}
                      style={{ width: `${c.opportunity ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="note-text">Điểm tham khảo · không phải xếp hạng đầu tư</p>
          </>
        )}
      </section>

      {/* ── Tổng quan thị trường (thay thế EDA) ── */}
      <MarketOverviewModule dashboardData={dashboardData} selectedCity={selectedCity} />

      {/* Quick nav */}
      <section className="card">
        <SectionHeader title="Khám phá tiếp theo" subtitle="Tiếp tục phân tích trên bản đồ thị trường hoặc phân tích vị trí" />
        <div className="quick-nav-grid">
          {[
            { view: 'map',      icon: '◉', title: 'Bản đồ thị trường',    desc: 'Bản đồ nhiệt theo ô lưới · chuyển đổi lớp · tín hiệu không gian' },
            { view: 'location', icon: '◎', title: 'Phân tích vị trí',      desc: 'Vẽ vùng · truy vấn tín hiệu quán cà phê & POI' },
          ].map(item => (
            <button key={item.view} className="quick-nav-card" onClick={() => onNavigate?.(item.view)}>
              <span className="quick-nav-icon">{item.icon}</span>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
