'use client'

// Единая карточка пустого состояния — раньше свёрстана заново в каждом месте
// (пустой список бассейнов, ненарисованная карта) с одинаковой структурой.
export default function EmptyState({ title, description, action, className = '' }) {
  return (
    <div className={`card empty-state ${className}`}>
      {title && <h3 style={{ marginBottom: 6 }}>{title}</h3>}
      {description && (
        <p className="muted tiny" style={{ marginBottom: action ? 18 : 0 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
