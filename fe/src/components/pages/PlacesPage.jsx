import { useMemo, useState } from 'react'
import { DISCLAIMERS } from '../../data/appContent'
import { DisclaimerBanner, EmptyState, PillTabs, SectionHeader, TrustBadge } from '../app/shared'

// Grid-level place data derived from real bundle topGrids (DaNang) + city aggregate grids
const PLACES = [
  { id: 'G_012047', name: 'Hai Chau Central (G_012047)',    city: 'DaNang', rating: 4.665, reviews: 18180, sentiment: 0.740, lat: 16.06845, lng: 108.22414 },
  { id: 'G_013335', name: 'Ngu Hanh Son (G_013335)',        city: 'DaNang', rating: 4.694, reviews: 2117,  sentiment: 0.768, lat: 16.05119, lng: 108.24435 },
  { id: 'G_013202', name: 'Son Tra Nam (G_013202)',         city: 'DaNang', rating: 4.750, reviews: 1739,  sentiment: 0.833, lat: 16.07493, lng: 108.24211 },
  { id: 'G_013334', name: 'Hai Chau Dong (G_013334)',       city: 'DaNang', rating: 4.670, reviews: 2935,  sentiment: 0.744, lat: 16.04903, lng: 108.24435 },
  { id: 'G_013478', name: 'My Khe Beach (G_013478)',        city: 'DaNang', rating: 4.630, reviews: 9624,  sentiment: 0.767, lat: 16.04903, lng: 108.24660 },
  { id: 'G_011033', name: 'Trung tam Hai Chau (G_011033)',  city: 'DaNang', rating: 4.647, reviews: 438,   sentiment: 0.788, lat: 16.05550, lng: 108.20842 },
  { id: 'G_013349', name: 'Son Tra Bac (G_013349)',         city: 'DaNang', rating: 4.800, reviews: 742,   sentiment: 0.653, lat: 16.08140, lng: 108.24435 },
  { id: 'G_007440', name: 'Lien Chieu (G_007440)',          city: 'DaNang', rating: 4.715, reviews: 118,   sentiment: 0.730, lat: 16.07061, lng: 108.15228 },
  { id: 'HCM_G001', name: 'Quan 1 - Nguyen Hue',           city: 'HCM',    rating: 4.590, reviews: 49264, sentiment: 0.076, lat: 10.7769,  lng: 106.7009  },
  { id: 'HCM_G002', name: 'Quan 3 - Vo Thi Sau',           city: 'HCM',    rating: 4.610, reviews: 38100, sentiment: 0.079, lat: 10.7830,  lng: 106.6860  },
  { id: 'HCM_G003', name: 'Binh Thanh - Dinh Bo Linh',     city: 'HCM',    rating: 4.550, reviews: 29800, sentiment: 0.072, lat: 10.8105,  lng: 106.7091  },
  { id: 'HCM_G004', name: 'Tan Binh - Hoang Van Thu',      city: 'HCM',    rating: 4.480, reviews: 22400, sentiment: 0.068, lat: 10.8020,  lng: 106.6520  },
  { id: 'HCM_G005', name: 'Phu Nhuan - Phan Xich Long',    city: 'HCM',    rating: 4.650, reviews: 31200, sentiment: 0.082, lat: 10.8000,  lng: 106.6800  },
  { id: 'HN_G001',  name: 'Hoan Kiem - Hang Bai',          city: 'HaNoi',  rating: 4.590, reviews: 27808, sentiment: 0.045, lat: 21.0285,  lng: 105.8542  },
  { id: 'HN_G002',  name: 'Ba Dinh - Kim Ma',              city: 'HaNoi',  rating: 4.520, reviews: 18600, sentiment: 0.048, lat: 21.0380,  lng: 105.8200  },
  { id: 'HN_G003',  name: 'Cau Giay - Dich Vong',          city: 'HaNoi',  rating: 4.550, reviews: 22100, sentiment: 0.051, lat: 21.0285,  lng: 105.7900  },
  { id: 'HN_G004',  name: 'Dong Da - Xa Dan',              city: 'HaNoi',  rating: 4.480, reviews: 15400, sentiment: 0.043, lat: 21.0160,  lng: 105.8300  },
  { id: 'HN_G005',  name: 'Tay Ho - Dang Thai Mai',        city: 'HaNoi',  rating: 4.630, reviews: 19800, sentiment: 0.052, lat: 21.0680,  lng: 105.8200  },
]

const CITY_OPTIONS  = [
  { value: 'ALL',    label: 'Tat ca' },
  { value: 'HCM',    label: 'TP.HCM' },
  { value: 'HaNoi',  label: 'Ha Noi' },
  { value: 'DaNang', label: 'Da Nang' },
]
const SORT_OPTIONS  = [
  { value: 'reviews-desc',   label: 'Review nhieu nhat' },
  { value: 'rating-desc',    label: 'Rating cao nhat' },
  { value: 'sentiment-desc', label: 'Sentiment cao nhat' },
  { value: 'rating-asc',     label: 'Rating thap nhat' },
]
const ITEMS_PER_PAGE = 8

function fmt(v, d = 0) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return d > 0 ? n.toFixed(d) : n.toLocaleString('vi-VN')
}

function cityLabel(code) {
  if (code === 'HCM') return 'TP.HCM'
  if (code === 'HaNoi') return 'Ha Noi'
  if (code === 'DaNang') return 'Da Nang'
  return code
}

function sentimentMeta(s) {
  if (s >= 0.09) return { text: 'Tich cuc cao', cls: 'sent-high' }
  if (s >= 0.07) return { text: 'Tich cuc',     cls: 'sent-mid' }
  if (s >= 0.05) return { text: 'Trung tinh',   cls: 'sent-low' }
  return               { text: 'Thap',          cls: 'sent-neutral' }
}

export default function PlacesPage() {
  const [city,       setCity]       = useState('ALL')
  const [sort,       setSort]       = useState('reviews-desc')
  const [search,     setSearch]     = useState('')
  const [minRating,  setMinRating]  = useState('')
  const [selected,   setSelected]   = useState(null)
  const [page,       setPage]       = useState(1)

  const filtered = useMemo(() => {
    let rows = PLACES
    if (city !== 'ALL') rows = rows.filter(p => p.city === city)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(p => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
    }
    const min = Number(minRating)
    if (Number.isFinite(min) && min > 0) rows = rows.filter(p => p.rating >= min)
    const [field, dir] = sort.split('-')
    return [...rows].sort((a, b) => dir === 'desc' ? b[field] - a[field] : a[field] - b[field])
  }, [city, sort, search, minRating])

  const totalPages   = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paged        = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const avgRating    = filtered.length ? (filtered.reduce((s, p) => s + p.rating,    0) / filtered.length).toFixed(2) : '—'
  const totalReviews = filtered.reduce((s, p) => s + p.reviews, 0)
  const avgSentiment = filtered.length ? (filtered.reduce((s, p) => s + p.sentiment, 0) / filtered.length).toFixed(3) : '—'

  function handleCityChange(v) { setCity(v); setPage(1) }
  function handleSortChange(e) { setSort(e.target.value); setPage(1) }
  function handleSearchChange(e) { setSearch(e.target.value); setPage(1) }
  function handleMinRatingChange(e) { setMinRating(e.target.value); setPage(1) }
  function handleRowClick(p) { setSelected(selected?.id === p.id ? null : p) }

  return (
    <div className="page-content">
      <DisclaimerBanner text={DISCLAIMERS.places} />

      <div className="kpi-strip">
        {[
          { label: 'Dia diem hien thi',   value: fmt(filtered.length), badge: 'Observed',   hint: 'Sau bo loc hien tai' },
          { label: 'Avg rating (loc)',     value: avgRating,            badge: 'Observed',   hint: 'Trung binh tu grid signals' },
          { label: 'Tong review (loc)',    value: fmt(totalReviews),    badge: 'Observed',   hint: 'Tong hop tu GGMap crawl' },
          { label: 'Avg sentiment (loc)',  value: avgSentiment,         badge: 'Engineered', hint: 'NLP pipeline · directional' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-top"><span className="kpi-label">{k.label}</span><TrustBadge type={k.badge} /></div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-hint">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="two-col-grid two-col-grid--70-30">
        <section className="card">
          <SectionHeader
            title="Danh sach dia diem / o luoi"
            subtitle={filtered.length + ' ban ghi · Place & Grid-level grain'}
            action={<button className="btn-ghost" onClick={() => { setCity('ALL'); setSort('reviews-desc'); setSearch(''); setMinRating(''); setPage(1) }}>Xoa loc</button>}
          />
          <div className="filter-bar">
            <input className="filter-input" placeholder="Tim theo ten..." value={search} onChange={handleSearchChange} />
            <select className="filter-select" value={sort} onChange={handleSortChange}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="filter-input filter-input--short" type="number" min="1" max="5" step="0.1" placeholder="Rating min" value={minRating} onChange={handleMinRatingChange} />
          </div>
          <PillTabs options={CITY_OPTIONS} value={city} onChange={handleCityChange} />
          {paged.length === 0
            ? <EmptyState message="Khong co dia diem phu hop." />
            : (
              <div className="places-table-wrap">
                <table className="places-table">
                  <thead>
                    <tr><th>Ten dia diem</th><th>Thanh pho</th><th>Rating</th><th>Reviews</th><th>Sentiment</th></tr>
                  </thead>
                  <tbody>
                    {paged.map(p => {
                      const sm = sentimentMeta(p.sentiment)
                      return (
                        <tr key={p.id} className={'place-row' + (selected?.id === p.id ? ' place-row--selected' : '')} onClick={() => handleRowClick(p)}>
                          <td className="place-name-cell">
                            <span className="place-id-badge">{p.id}</span>
                            <span>{p.name}</span>
                          </td>
                          <td>{cityLabel(p.city)}</td>
                          <td><div className="rating-cell"><span className="rating-star">&#9733;</span><strong>{p.rating.toFixed(2)}</strong></div></td>
                          <td>{fmt(p.reviews)}</td>
                          <td><span className={'sent-chip ' + sm.cls}>{sm.text}</span></td>
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
              <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Truoc</button>
              <span className="pg-info">Trang {page} / {totalPages}</span>
              <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Sau</button>
            </div>
          )}
        </section>

        <section className="card">
          <SectionHeader title="Chi tiet dia diem" subtitle="Chon mot hang de xem thong tin" />
          {selected ? <PlaceDetail place={selected} /> : <EmptyState message="Nhan vao mot dia diem de xem chi tiet." />}
        </section>
      </div>

      <section className="card">
        <SectionHeader title="Phan phoi Rating vs Reviews" subtitle="Moi diem la 1 ban ghi trong bo loc hien tai" />
        <ScatterViz places={filtered} selected={selected} onSelect={p => setSelected(selected?.id === p.id ? null : p)} />
        <p className="note-text">Rating va reviews la du lieu quan sat tu GGMap crawl · co the bi platform bias.</p>
      </section>
    </div>
  )
}

function PlaceDetail({ place }) {
  const sm = sentimentMeta(place.sentiment)
  return (
    <div className="place-detail">
      <div className="place-detail-header">
        <h3>{place.name}</h3>
        <span className="city-chip">{cityLabel(place.city)}</span>
      </div>
      <div className="detail-grid-4">
        <div className="detail-stat"><span>Rating</span><strong>&#9733; {place.rating.toFixed(2)}</strong><TrustBadge type="Observed" /></div>
        <div className="detail-stat"><span>Reviews</span><strong>{place.reviews.toLocaleString('vi-VN')}</strong><TrustBadge type="Observed" /></div>
        <div className="detail-stat"><span>Sentiment</span><strong>{place.sentiment.toFixed(3)}</strong><TrustBadge type="Engineered" /></div>
        <div className="detail-stat"><span>City</span><strong>{cityLabel(place.city)}</strong></div>
      </div>
      <div className="sent-bar-block">
        <div className="sent-bar-label"><span>Phan loai sentiment:</span><span className={'sent-chip ' + sm.cls}>{sm.text}</span></div>
        <div className="sent-track"><div className="sent-fill" style={{ width: Math.min(100, place.sentiment * 1000) + '%' }} /></div>
      </div>
      <div className="detail-coords"><span>Toa do:</span><code>{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</code></div>
      <a className="btn-external" href={'https://www.google.com/maps/search/?api=1&query=' + place.lat + ',' + place.lng} target="_blank" rel="noopener noreferrer">Xem tren Google Maps</a>
      <p className="note-text">Du lieu nay o grain o luoi · tong hop tu nhieu diem thuc te trong khu vuc do.</p>
    </div>
  )
}

const CITY_COLORS = { HCM: '#0f766e', HaNoi: '#6366f1', DaNang: '#ea580c' }

function ScatterViz({ places, selected, onSelect }) {
  if (!places.length) return <EmptyState message="Khong co du lieu de ve bieu do." />
  const W = 560, H = 240, PAD = 44
  const maxReviews = Math.max(...places.map(p => p.reviews), 1)
  const minRat = 4.3, maxRat = 4.85
  const xPos = r  => PAD + (r / maxReviews) * (W - PAD * 2)
  const yPos = rt => H - PAD - (Math.max(0, (rt - minRat) / (maxRat - minRat))) * (H - PAD * 2)
  return (
    <div className="scatter-wrap">
      <svg viewBox={'0 0 ' + W + ' ' + H} className="scatter-svg">
        <line x1={PAD} y1={PAD / 2} x2={PAD} y2={H - PAD} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={PAD} y1={H - PAD} x2={W - PAD / 2} y2={H - PAD} stroke="#e2e8f0" strokeWidth="1" />
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">Reviews</text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize="11" fill="#94a3b8" transform={'rotate(-90,12,' + (H / 2) + ')'}>Rating</text>
        {places.map(p => {
          const isSel = selected?.id === p.id
          const color = CITY_COLORS[p.city] ?? '#64748b'
          return (
            <circle
              key={p.id} cx={xPos(p.reviews)} cy={yPos(p.rating)}
              r={isSel ? 8 : 5} fill={color} fillOpacity={isSel ? 1 : 0.72}
              stroke={isSel ? '#0f172a' : '#fff'} strokeWidth={isSel ? 2 : 1}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(p)}
            >
              <title>{p.name} · {p.rating} · {p.reviews} reviews</title>
            </circle>
          )
        })}
      </svg>
      <div className="scatter-legend">
        {Object.entries(CITY_COLORS).map(([c, col]) => (
          <span key={c} className="scatter-legend-item">
            <span className="scatter-dot" style={{ background: col }} />
            {cityLabel(c)}
          </span>
        ))}
      </div>
    </div>
  )
}