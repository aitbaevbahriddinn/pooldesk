'use client'

// Единый сегментированный таб-переключатель — раньше один и тот же визуальный
// паттерн (заливка активной кнопки + тень) был написан заново в трёх местах
// (онбординг, шапка карты, панель инструментов редактора), и только один из
// них имел ARIA role="tablist"/"tab". Теперь семантика и стили общие.
export default function Tabs({ items, value, onChange, block = false, className = '' }) {
  return (
    <div className={`tabs-seg ${block ? 'block' : ''} ${className}`} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
