import { DISCLAIMERS } from '../../data/appContent'
import { DisclaimerBanner, SectionHeader, TrustBadge } from '../app/shared'

function FreshnessCard({ label, value, sub, ok }) {
  return (
    <div className={'freshness-card ' + (ok ? 'freshness-ok' : 'freshness-warn')}>
      <div className="freshness-dot" />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  )
}

function PipelineStep({ step, title, status, summary, inputs, outputs }) {
  const statusCls = {
    'Stable': 'pipe-stable',
    'Ready': 'pipe-ready',
    'Partial': 'pipe-partial',
    'Needs verification': 'pipe-needs-verify',
  }[status] || 'pipe-neutral'

  return (
    <div className="pipe-card">
      <div className="pipe-card-head">
        <div className="pipe-num">{step}</div>
        <div className="pipe-title">
          <strong>{title}</strong>
          <span className={'pipe-status ' + statusCls}>{status}</span>
        </div>
      </div>
      <p className="pipe-summary">{summary}</p>
      <div className="pipe-io">
        <div className="pipe-io-block">
          <span>Inputs</span>
          <ul>{(inputs ?? []).map(i => <li key={i}>{i}</li>)}</ul>
        </div>
        <div className="pipe-io-arrow">&#8594;</div>
        <div className="pipe-io-block">
          <span>Outputs</span>
          <ul>{(outputs ?? []).map(o => <li key={o}>{o}</li>)}</ul>
        </div>
      </div>
    </div>
  )
}

export default function LineagePage({ dashboardData }) {
  const trust         = dashboardData?.trustSnapshot ?? {}
  const inventory     = dashboardData?.dataInventory ?? []
  const pipelineSteps = dashboardData?.pipelineSteps ?? []
  const warnings      = dashboardData?.provenance?.warnings ?? []
  const provenance    = dashboardData?.provenance ?? {}

  const freshnessItems = [
    { label: 'Processed point data',  value: trust.processedPointsLastModified || 'Unknown', sub: trust.processedPointsSha256 ? 'SHA256: ' + trust.processedPointsSha256.slice(0, 16) + '...' : null, ok: !!trust.processedPointsLastModified },
    { label: 'Spatial grid artifact', value: trust.spatialGridLastModified || 'Unknown',     sub: trust.spatialGridSha256 ? 'SHA256: ' + trust.spatialGridSha256.slice(0, 16) + '...' : null,     ok: !!trust.spatialGridLastModified },
    { label: 'Bundle generated at',   value: trust.bundleGeneratedAt || 'Unknown',           sub: 'Version: ' + (trust.bundleVersion || 'unknown'),                                                ok: !!trust.bundleGeneratedAt },
    { label: 'Export script',         value: trust.exportScript || 'Unknown',                sub: 'Run to refresh after upstream changes',                                                         ok: trust.exportScript !== 'unknown' },
  ]

  return (
    <div className="page-content">
      <DisclaimerBanner text={DISCLAIMERS.freshness} />

      <section className="card">
        <SectionHeader title="Artifact freshness" subtitle="Thoi diem cap nhat gan nhat cua cac tap du lieu" />
        <div className="freshness-grid">
          {freshnessItems.map(f => <FreshnessCard key={f.label} {...f} />)}
        </div>
      </section>

      <div className="two-col-grid">
        <section className="card">
          <SectionHeader title="Provenance summary" subtitle="Nguon goc va trang thai artifact" />
          <div className="provenance-list">
            {[
              { label: 'Artifact version',     value: provenance.artifactVersion || '—',          badge: 'Verified' },
              { label: 'Bundle version',        value: trust.bundleVersion || '—',                 badge: 'Verified' },
              { label: 'Export script',         value: provenance.exportScript || '—',             badge: 'Verified' },
              { label: 'Raw source count',      value: provenance.rawSourceCount || '—',           badge: 'Observed' },
              { label: 'Processed sources',     value: provenance.processedSourceCount || '—',     badge: 'Observed' },
              { label: 'Model sources',         value: provenance.modelSourceCount || '—',         badge: 'Parsed' },
              { label: 'Verification risk',     value: provenance.hasVerificationRisk ? 'Yes - check warnings' : 'None detected', badge: provenance.hasVerificationRisk ? 'Parsed' : 'Verified' },
            ].map(p => (
              <div key={p.label} className="prov-row">
                <span className="prov-label">{p.label}</span>
                <div className="prov-right">
                  <strong>{String(p.value)}</strong>
                  <TrustBadge type={p.badge} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <SectionHeader title="Known warnings" subtitle="Cac van de can chu y truoc khi bao cao" />
          {warnings.length === 0
            ? <div className="note-text">Khong co canh bao nao trong bundle hien tai.</div>
            : (
              <div className="warn-list">
                {warnings.map((w, i) => (
                  <div key={i} className="warn-item">
                    <span className="warn-icon">!</span>
                    <p>{w}</p>
                  </div>
                ))}
              </div>
            )
          }
        </section>
      </div>

      <section className="card">
        <SectionHeader title="Data inventory" subtitle="Tat ca tap du lieu va artifact dang duoc dashboard su dung" />
        <div className="inventory-list">
          {inventory.map(item => (
            <div key={item.name} className="inventory-row">
              <div className="inventory-left">
                <span className={'inventory-dot ' + (item.state === 'Available' ? 'dot-ok' : 'dot-warn')} />
                <div className="inventory-info">
                  <strong>{item.name}</strong>
                  <code>{item.file}</code>
                  <span>{item.note}</span>
                </div>
              </div>
              <span className={'status-chip ' + (item.state === 'Available' ? 'chip-ok' : 'chip-warn')}>
                {item.state}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <SectionHeader title="Pipeline steps" subtitle="Cac buoc xu ly tu raw data den dashboard artifact" />
        <div className="pipeline-grid">
          {pipelineSteps.map(step => <PipelineStep key={step.step} {...step} />)}
        </div>
      </section>

      <section className="card">
        <SectionHeader title="Raw source lineage" subtitle="Luong du lieu tu raw den dashboard" />
        <div className="lineage-flow">
          <div className="lineage-col">
            <h4>Raw sources</h4>
            {['*_GGMap.csv (3 cities)', '*_POI_Points.geojson', '*_VIIRS.tif'].map(s => (
              <div key={s} className="lineage-file lineage-file--raw">{s}</div>
            ))}
          </div>
          <div className="lineage-arrow">&#8594;</div>
          <div className="lineage-col">
            <h4>Processed</h4>
            {['Coffee_Tea_Data_GGMap.csv', 'Spatial_Grid_Tabular.csv', 'Spatial_Tensors.npz'].map(s => (
              <div key={s} className="lineage-file lineage-file--processed">{s}</div>
            ))}
          </div>
          <div className="lineage-arrow">&#8594;</div>
          <div className="lineage-col">
            <h4>Artifacts</h4>
            {['model_runs.csv', 'grid_predictions.csv', 'grid_summary.csv', 'kpi_summary.json', 'dashboard_data_bundle.json'].map(s => (
              <div key={s} className="lineage-file lineage-file--artifact">{s}</div>
            ))}
          </div>
          <div className="lineage-arrow">&#8594;</div>
          <div className="lineage-col">
            <h4>Dashboard</h4>
            <div className="lineage-file lineage-file--dashboard">SmartSite Web Dashboard</div>
          </div>
        </div>
      </section>
    </div>
  )
}