'use client'

const LABELS = {
  booked: 'Забронировано',
  arrived: 'Гости на месте',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не пришли',
}

// Единый чип статуса визита — раньше .chip/.chip.booked/... был продублирован
// с одинаковым смыслом, но чуть разными rgba-значениями в Row и VisitPanel
// (оба в MapBoard.js). Теперь оба места используют этот компонент и токены
// из globals.css (--*-chip-bg/--*-chip-fg).
export default function StatusChip({ status, children }) {
  return <span className={`status-chip ${status}`}>{children ?? LABELS[status] ?? status}</span>
}
