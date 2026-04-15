import { DISCLAIMERS, MODEL_INFO } from '../../data/appContent'
import { DisclaimerBanner, SectionHeader, TrustBadge } from '../app/shared'

function fmt(v, d = 2) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : String(v ?? '—')
}

function StatusBadge({ status }) {
  const map = {
    verified: { cls: 'status-ok',      text: 'Verified' },
    parsed:   { cls: 'status-warn',    text: 'Parsed' },
    ready:    { cls: 'status-ok',      text: 'Ready' },
    unknown:  { cls: 'status-neutral', text: 'Unknown' },
  }
  const m = map[(status ?? '').toLowerCase()] ?? map.unknown
  return <span className={`status-chip ${m.cls}`}>{m.text}</span>
}

export default function ModelPage({ dashboardData }) {
  const modelRuns    = dashboardData?.modelRuns ?? []
  const modelSummary = dashboardData?.modelSummary ?? {}
  const best         = modelSummary.bestRun
  const warnings     = dashboardData?.provenance?.warnings ?? []

  return (
    <div className="page-content">
      <DisclaimerBanner text={DISCLAIMERS.model} variant="warning" />

      <div className="two-col-grid">
        <section className="card card--green">
          <SectionHeader title="Mo hinh uoc tinh gi?" subtitle="Pham vi hop le cua output" />
          <p className="model-desc">{MODEL_INFO.whatItEstimates}</p>
          <div className="model-does-list">
            {[
              'Relative potential class (high / medium / low)',
              'Engineered vitality score tu proxy signals',
              'Xep hang tuong doi giua cac o luoi',
              'Nhan dien vung underserved theo NTL rule',
            ].map(item => (
              <div key={item} className="model-does-item">
                <span className="does-check">checkmark</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card card--red">
          <SectionHeader title="Mo hinh KHONG uoc tinh" subtitle="Gioi han ro rang can ghi nho" />
          <div className="model-does-list">
            {MODEL_INFO.whatItDoesNot.map(item => (
              <div key={item} className="model-does-item">
                <span className="does-cross">X</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="model-disclaimer-box">{MODEL_INFO.disclaimer}</div>
        </section>
      </div>

      {best && (
        <section className="card">
          <SectionHeader
            title="Best run hien tai"
            subtitle={best.version + ' · ' + (best.sourceNotebook ?? 'notebook Step 5')}
          />
          <div className="best-run-grid">
            {[
              { label: 'RMSE', value: best.rmse },
              { label: 'MAE',  value: best.mae },
              { label: 'R2',   value: best.r2 },
            ].map(m => (
              <div key={m.label} className="best-run-metric">
                <span>{m.label}</span>
                <strong>{m.value}</strong>
                <TrustBadge type={best.status === 'verified' ? 'Verified' : 'Parsed'} />
              </div>
            ))}
            <div className="best-run-metric">
              <span>Status</span>
              <StatusBadge status={best.status} />
            </div>
          </div>
          {best.status !== 'verified' && (
            <p className="note-text">Metrics nay duoc parse tu dong tu notebook output · chua qua xac minh thu cong.</p>
          )}
        </section>
      )}

      <section className="card">
        <SectionHeader
          title="So sanh mo hinh (F1 Macro)"
          subtitle={'Multimodal W&D v6-2 · Test F1: ' + MODEL_INFO.testResult.f1Macro + ' · Accuracy: ' + MODEL_INFO.testResult.accuracy}
        />
        <div className="model-compare-list">
          {MODEL_INFO.comparisons.map(m => (
            <div key={m.name} className={'model-compare-row' + (m.highlight ? ' model-compare-row--highlight' : '')}>
              <div className="model-compare-name">
                <span>{m.name}</span>
                {m.highlight && <TrustBadge type="Estimated" />}
              </div>
              <div className="model-compare-bar-wrap">
                <div className="model-compare-bar" style={{ width: ((m.f1Macro / 0.75) * 100) + '%' }} />
              </div>
              <strong className="model-compare-val">{m.f1Macro.toFixed(4)}</strong>
            </div>
          ))}
        </div>
        <p className="note-text">F1 Macro duoc do tren pseudo-labeled classes · khong phai ground-truth business outcome.</p>
      </section>

      <section className="card">
        <SectionHeader
          title="Experiment tracker"
          subtitle={modelRuns.length + ' runs tu ai_workspace/web_dashboard/data/model_runs.csv · ' + (modelSummary.readyCount ?? 0) + ' ready'}
        />
        {warnings.length > 0 && (
          <div className="warn-box">{warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
        )}
        {modelRuns.length === 0
          ? <p className="note-text">Chua co model run data. Chay export_dashboard_artifacts.py de cap nhat.</p>
          : (
            <div className="exp-table-wrap">
              <table className="exp-table">
                <thead>
                  <tr>
                    <th>Version</th><th>Feature set</th><th>RMSE</th>
                    <th>MAE</th><th>R2</th><th>Status</th><th>Source notebook</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRuns.map((run, i) => (
                    <tr key={i}>
                      <td className="mono-cell">{run.version}</td>
                      <td className="feature-cell">
                        {(run.featureSet ?? '').split(/[;,]/).filter(Boolean).map(f => (
                          <span key={f} className="feature-tag">{f.trim()}</span>
                        ))}
                      </td>
                      <td>{fmt(run.rmse, 4)}</td>
                      <td>{fmt(run.mae, 4)}</td>
                      <td>{fmt(run.r2, 4)}</td>
                      <td><StatusBadge status={run.status} /></td>
                      <td className="notebook-cell">{run.sourceNotebook ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </section>

      <section className="card">
        <SectionHeader title="Pipeline tom tat" subtitle="6 buoc tu raw data den model output" />
        <div className="pipeline-mini">
          {(dashboardData?.pipelineSteps ?? []).map((s, i, arr) => (
            <div key={s.step} className="pipeline-step-wrap">
              <div className={'pipeline-step pipeline-step--' + s.status.toLowerCase().replace(/ /g, '-')}>
                <div className="pipeline-step-body">
                  <strong>Step {s.step}: {s.title}</strong>
                  <p>{s.summary?.slice(0, 80)}...</p>
                </div>
                <span className="pipeline-status">{s.status}</span>
              </div>
              {i < arr.length - 1 && <div className="pipeline-arrow">&#8594;</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <SectionHeader title="Validity notes" subtitle="Nhung dieu can luu y khi doc ket qua mo hinh" />
        <div className="validity-list">
          {(dashboardData?.recommendations ?? []).map((rec, i) => (
            <div key={i} className="validity-item">
              <span className="validity-num">{i + 1}</span>
              <p>{rec}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}