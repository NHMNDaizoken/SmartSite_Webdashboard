import { useMemo, useState } from 'react'
import { DISCLAIMERS, OPPORTUNITY_TAGS } from '../../data/appContent'
import { DisclaimerBanner, EmptyState, PillTabs, SectionHeader, TrustBadge } from '../app/shared'

const CITY_OPTIONS = [
  { value: 'ALL',    label: 'Tất cả' },
  { value: 'DaNang', label: 'Đà Nẵng' },
  { value: 'HCM',    label: 'TP.HCM' },
  { value: 'HaNoi',  label: 'Hà Nội' },
]

const LABEL_OPTIONS = [
  { value: 'ALL',                      label: 'Tất cả nhãn' },
  { value: 'high_observed_vitality',   label: 'Sức sống cao' },
  { value: 'medium_or_emerging',       label: 'Trung bình / Nổi' },
  { value: 'low_potential',            label: 'Tiềm năng thấp' },
]

const ITEMS_PER_PAGE = 10

const TAG_COLOR = {
  emerald: { background: 'rgba(16,185,129,0.1)',  color: '#065f46' },
  blue:    { background: 'rgba(59,130,246,0.1)',  color: '#1e40af' },
  violet:  { background: 'rgba(139,92,246,0.1)',  color: '#4c1d95' },
  amber:   { background: 'rgba(245,158,11,0.1)',  color: '#78350f' },
  slate:   { background: 'rgba(100,116,139,0.1)', color: '#1e293b' },
}

function fmt(v, d = 0) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return d > 0 ? n.toFixed(d) : n.toLocaleString('vi-VN')
}

function cityLabel(code) {
  if (code === 'HCM') return 'TP.HCM'
  if (code === 'HaNoi') return 'Hà Nội'
  if (code === 'DaNang') return 'Đà Nẵng'
  return code
}

function labelMeta(label) {
  const l = (label ?? '').toLowerCase().replace(/ /g, '_')
  if (l.includes('high'))   return { text: 'Sức sống cao',     cls: 'label-high',   icon: '▲' }
  if (l.includes('medium') || l.includes('emerging')) return { text: 'Trung bình / Nổi', cls: 'label-medium', icon: '◆' }
  return                           { text: 'Tiềm năng thấp',   cls: 'label-low',    icon: '▽' }
}

function reasonTags(grid) {
  const tags = []
  if ((grid.ntlNeighbor ?? 0) > 30 && (grid.cafeCount ?? 0) === 0) tags.push('high_ntl_low_cafe')
  if ((grid.eNeighbor ?? 0) > 0.75)                                 tags.push('high_poi')
  if ((grid.reviews ?? 0) > 1000)                                   tags.push('high_activity')
  if ((grid.sentiment ?? 0) > 0.7)                                  tags.push('positive_sentiment')
  if (tags.length === 0)                                             tags.push('mixed_evidence')
  return tags
}

function TagList({ grid }) {
  const tags = reasonTags(grid)
  return (
    <div className="opp-tags">
      {tags.map(t => {
        const tagDef = OPPORTUNITY_TAGS.find(x => x.key === t)
        const style  = TAG_COLOR[tagDef?.color ?? 'slate']
        return <span key={t} className="opp-tag" style={style}>{tagDef?.label ?? t}</span>
      })}
    </div>
  )
}

export default function OpportunityPage({ dashboardData }) {
  const [cityFilter,  setCityFilter]  = useState('ALL')
  const [labelFilter, setLabelFilter] = useState('ALL')
  const [page,        setPage]        = useState(1)
  const [compareList, setCompareList] = useState([])

  const allGrids = useMemo(() => {
    const summaries = dashboardData?.predictionSummary?.citySummaries ?? []
    return summaries.flatMap(city =>
      (city.topGrids ?? []).map(g => ({ ...g, cityCode: city.sourceCity }))
    )
  }, [dashboardData])

  const cityCounts = useMemo(() => {
    const summaries = dashboardData?.predictionSummary?.citySummaries ?? []
    return Object.fromEntries(summaries.map(c => [c.sourceCity, c.counts ?? {}]))
  }, [dashboardData])

  const filtered = useMemo(() => {
    let rows = allGrids
    if (cityFilter !== 'ALL') rows = rows.filter(g => g.cityCode === cityFilter)
    if (labelFilter !== 'ALL') {
      rows = rows.filter(g =>
        (g.label ?? '').toLowerCase().replace(/ /g, '_').includes(labelFilter.replace(/_/g, ' ').split(' ')[0])
      )
    }
    return rows
  }, [allGrids, cityFilter, labelFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const topGlobal = useMemo(() =>
    [...allGrids]
      .filter(g => Number.isFinite(g.globalOpportunity))
      .sort((a, b) => b.globalOpportunity - a.globalOpportunity)
      .slice(0, 5)
  , [allGrids])

  const underserved = useMemo(() =>
    [...allGrids]
      .filter(g => Number(g.cafeCount) === 0 && Number(g.ntlNeighbor) > 30)
      .sort((a, b) => b.ntlNeighbor - a.ntlNeighbor)
      .slice(0, 5)
  , [allGrids])

  function toggleCompare(grid) {
    setCompareList(prev => {
      if (prev.find(g => g.gridId === grid.gridId)) return prev.filter(g => g.gridId !== grid.gridId)
      if (prev.length >= 3) return prev
      return [...prev, grid]
    })
  }

  if (!allGrids.length) return (
    <div className="page-content">
      <EmptyState message="Chưa có dữ liệu prediction. Vui lòng chạy export_dashboard_artifacts.py để cập nhật." />
    </div>
  )

  return (
    <div className="page-content">
      <DisclaimerBanner text={DISCLAIMERS.opportunity} variant="warning" />

      <div className="kpi-strip">
        {Object.entries(cityCounts).map(([code, counts]) => (
          <div key={code} className="kpi-card">
            <div className="kpi-top"><span className="kpi-label">{cityLabel(code)}</span><TrustBadge type="Estimated" /></div>
            <div className="kpi-value">{fmt((counts.highObservedVitality ?? 0) + (counts.mediumOrEmerging ?? 0))}</div>
            <div className="kpi-hint">▲ {fmt(counts.highObservedVitality)} cao · ◆ {fmt(counts.mediumOrEmerging)} nổi</div>
          </div>
        ))}
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Tổng ô ứng viên</span><TrustBadge type="Estimated" /></div>
          <div className="kpi-value">{fmt(allGrids.length)}</div>
          <div className="kpi-hint">Từ predictions bundle</div>
        </div>
      </div>

      <div className="two-col-grid">
        <section className="card">
          <SectionHeader title="Top 5 ô lưới toàn cục" subtitle="Xếp hạng theo globalOpportunity score" />
          <div className="top-grid-list">
            {topGlobal.map((g, i) => {
              const lm = labelMeta(g.label)
              const isCompared = !!compareList.find(c => c.gridId === g.gridId)
              return (
                <div key={g.gridId} className="opp-card">
                  <div className="opp-card-head">
                    <div className="opp-rank">#{i + 1}</div>
                    <div className="opp-info">
                      <strong>{g.gridId}</strong>
                      <span>{cityLabel(g.cityCode)}</span>
                    </div>
                    <span className={`label-chip ${lm.cls}`}>{lm.icon} {lm.text}</span>
                  </div>
                  <div className="opp-scores">
                    <div className="opp-score-item"><span>Global score</span><strong>{fmt(g.globalOpportunity, 3)}</strong></div>
                    <div className="opp-score-item"><span>City rank</span><strong>#{fmt(g.cityRank)}</strong></div>
                    <div className="opp-score-item"><span>Quán</span><strong>{fmt(g.cafeCount)}</strong></div>
                    <div className="opp-score-item"><span>Reviews</span><strong>{fmt(g.reviews)}</strong></div>
                  </div>
                  <TagList grid={g} />
                  <button
                    className={`btn-compare ${isCompared ? 'btn-compare--active' : ''}`}
                    onClick={() => toggleCompare(g)}
                    disabled={!isCompared && compareList.length >= 3}
                  >
                    {isCompared ? '✓ Đang so sánh' : '+ So sánh'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card">
          <SectionHeader title="Vùng underserved" subtitle="Ô trống (0 quán) · NTL lân cận cao · cần kiểm tra thực địa" />
          {underserved.length === 0
            ? <EmptyState message="Không tìm thấy vùng underserved." />
            : (
              <div className="underserved-list">
                {underserved.map((g, i) => (
                  <div key={g.gridId} className="underserved-row">
                    <div className="underserved-rank">#{i + 1}</div>
                    <div className="underserved-info">
                      <strong>{g.gridId}</strong>
                      <span>{cityLabel(g.cityCode)}</span>
                    </div>
                    <div className="underserved-signals">
                      <div><span>NTL lân cận</span><strong>{fmt(g.ntlNeighbor, 1)}</strong></div>
                      <div><span>Entropy</span><strong>{fmt(g.eNeighbor, 3)}</strong></div>
                    </div>
                    <span className="opp-tag" style={TAG_COLOR.emerald}>NTL cao · quán thấp</span>
                  </div>
                ))}
              </div>
            )
          }
          <p className="note-text">Các vùng này dựa trên NTL lân cận · chưa tính hạ tầng thực địa.</p>
        </section>
      </div>

      <section className="card">
        <SectionHeader title="Danh sách ô ứng viên" subtitle={`${filtered.length} ô · lọc theo thành phố và nhãn`} />
        <div className="filter-bar">
          <PillTabs options={CITY_OPTIONS}  value={cityFilter}  onChange={v => { setCityFilter(v);  setPage(1) }} />
          <PillTabs options={LABEL_OPTIONS} value={labelFilter} onChange={v => { setLabelFilter(v); setPage(1) }} />
        </div>
        {paged.length === 0
          ? <EmptyState message="Không có ô lưới phù hợp." />
          : (
            <div className="opp-table-wrap">
              <table className="opp-table">
                <thead>
                  <tr>
                    <th>Grid ID</th><th>Thành phố</th><th>Nhãn</th>
                    <th>Global score</th><th>City rank</th><th>Quán</th>
                    <th>Reviews</th><th>NTL lân cận</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(g => {
                    const lm = labelMeta(g.label)
                    const isCompared = !!compareList.find(c => c.gridId === g.gridId)
                    return (
                      <tr key={g.gridId} className={isCompared ? 'row-compared' : ''}>
                        <td className="mono-cell">{g.gridId}</td>
                        <td>{cityLabel(g.cityCode)}</td>
                        <td><span className={`label-chip label-chip--sm ${lm.cls}`}>{lm.icon} {lm.text}</span></td>
                        <td>{fmt(g.globalOpportunity, 3)}</td>
                        <td>#{fmt(g.cityRank)}</td>
                        <td>{fmt(g.cafeCount)}</td>
                        <td>{fmt(g.reviews)}</td>
                        <td>{fmt(g.ntlNeighbor, 1)}</td>
                        <td>
                          <button
                            className={`btn-compare btn-compare--sm ${isCompared ? 'btn-compare--active' : ''}`}
                            onClick={() => toggleCompare(g)}
                            disabled={!isCompared && compareList.length >= 3}
                          >{isCompared ? '✓' : '+'}</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Trước</button>
            <span className="pg-info">Trang {page} / {totalPages}</span>
            <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Sau ›</button>
          </div>
        )}
      </section>

      {compareList.length > 0 && (
        <section className="card card--compare">
          <SectionHeader
            title={`So sánh ${compareList.length} ô lưới`}
            subtitle="Tối đa 3 ô · nhấn ✕ để xóa"
            action={<button className="btn-ghost" onClick={() => setCompareList([])}>Xóa tất cả</button>}
          />
          <DisclaimerBanner text="Opportunity labels are exploratory and should be validated with field checks." variant="warning" />
          <div className="compare-grid">
            {compareList.map(g => {
              const lm = labelMeta(g.label)
              return (
                <div key={g.gridId} className="compare-card">
                  <div className="compare-card-head">
                    <strong>{g.gridId}</strong>
                    <span>{cityLabel(g.cityCode)}</span>
                    <button className="btn-remove" onClick={() => toggleCompare(g)}>✕</button>
                  </div>
                  <span className={`label-chip ${lm.cls}`}>{lm.icon} {lm.text}</span>
                  <div className="compare-stat-list">
                    {[
                      { label: 'Global score',  value: fmt(g.globalOpportunity, 3), badge: 'Estimated' },
                      { label: 'City rank',      value: `#${fmt(g.cityRank)}`,       badge: 'Estimated' },
                      { label: 'Quán quan sát', value: fmt(g.cafeCount),             badge: 'Observed' },
                      { label: 'Reviews',        value: fmt(g.reviews),              badge: 'Observed' },
                      { label: 'Rating TB',      value: fmt(g.weightedRating, 2),    badge: 'Observed' },
                      { label: 'Sentiment',      value: fmt(g.sentiment, 3),         badge: 'Engineered' },
                      { label: 'NTL lân cận',   value: fmt(g.ntlNeighbor, 1),       badge: 'Observed' },
                      { label: 'POI entropy',   value: fmt(g.eNeighbor, 3),         badge: 'Engineered' },
                    ].map(s => (
                      <div key={s.label} className="compare-stat-row">
                        <span>{s.label}</span>
                        <div className="compare-stat-right">
                          <strong>{s.value}</strong>
                          <TrustBadge type={s.badge} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <TagList grid={g} />
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}