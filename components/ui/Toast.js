'use client'

import Icon from './Icon'

// Плавающее уведомление поверх карты — раньше в MapBoard.js был собственный
// .toast только для ошибок (свой, третий по счёту, набор красных оттенков);
// .notice-ok при этом был определён в globals.css, но нигде не использовался.
// Теперь один компонент для error/success с aria-live, чтобы событие
// озвучивалось скринридером, а не терялось при появлении/исчезновении.
export default function Toast({ variant = 'error', onClose, children }) {
  return (
    <div className={`toast-pop ${variant}`} role="status" aria-live={variant === 'error' ? 'assertive' : 'polite'}>
      {variant === 'success' ? <Icon name="check" size={16} /> : <Icon name="alertTriangle" size={16} />}
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Закрыть">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}
