import { useEffect, useState } from 'react'
import './App.css'
import { deriveDashboardView, loadDashboardBundle } from './data/dashboardBundle'
import AppShell from './components/app/AppShell'
import OverviewTab from './components/app/OverviewTab'

import AIMapPage from './components/predictions/AIMapPage'
import LocationModule from './components/LocationModule/LocationModule'

export default function App() {
  const [view, setView] = useState('overview')
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedCity, setSelectedCity] = useState('DaNang')
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let isMounted = true
    loadDashboardBundle()
      .then((bundle) => {
        if (!isMounted) return
        const derived = deriveDashboardView(bundle)
        setDashboardData(derived)
        const defaultSource = derived.cityCoverage.find(
          (c) => c.city === derived.provenance?.defaultCity
        )?.sourceCity
        if (defaultSource) setSelectedCity(defaultSource)
      })
      .catch((err) => {
        if (isMounted) setLoadError(err.message)
      })
    return () => { isMounted = false }
  }, [])

  if (loadError) {
    return (
      <div className="boot-screen boot-error">
        <div className="boot-card">
          <div className="boot-icon">⚠</div>
          <h2>Lỗi tải dữ liệu</h2>
          <p>{loadError}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Thử lại</button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <div className="boot-spinner" />
          <p>Đang khởi tạo môi trường phân tích…</p>
        </div>
      </div>
    )
  }

  const lastUpdated = dashboardData.projectMeta.lastUpdated

  return (
    <>
      <AppShell view={view} onViewChange={setView} lastUpdated={lastUpdated} dashboardData={dashboardData}>
        {view === 'overview' && (
          <OverviewTab
            dashboardData={dashboardData}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            onNavigate={setView}
          />
        )}
        {view === 'map' && (
          <div className="page-wrapper">
            <AIMapPage selectedCity={selectedCity} onSelectCity={setSelectedCity} />
          </div>
        )}
        {view === 'location' && (
          <div className="page-wrapper">
            <LocationModule />
          </div>
        )}
      </AppShell>
    </>
  )
}
