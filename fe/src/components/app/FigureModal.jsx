import { useEffect } from 'react'

export default function FigureModal({ figure, onClose }) {
  useEffect(() => {
    if (!figure) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [figure, onClose])

  if (!figure) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">&times;</button>
        <div className="modal-img-wrap">
          <img src={figure.src} alt={figure.title} />
        </div>
        <div className="modal-footer">
          <h3>{figure.title}</h3>
          {figure.insight && <p className="modal-insight">{figure.insight}</p>}
          <p className="modal-note">Biểu đồ từ Step 4 EDA notebook · dữ liệu quan sát</p>
        </div>
      </div>
    </div>
  )
}
