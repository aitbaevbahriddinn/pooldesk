'use client'

// Единый полноэкранный экран загрузки — раньше один и тот же паттерн
// (min-height:100vh; grid; place-items:center) был скопирован дословно
// в трёх файлах под разными именами классов (.center/.wrap).
export default function LoadingScreen({ label = 'Загрузка…' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="muted tiny">{label}</p>
    </div>
  )
}
