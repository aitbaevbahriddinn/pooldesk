'use client'

// Служебные иконки интерфейса («хром»): та же стилистика, что у TypeIcon —
// линия 1.7, скруглённые концы, сетка 24×24. Раньше эти места занимали
// текстовые символы (‹ › − + ✕ ↺ ↻), из-за чего не было единого рисунка/размера.
const PATHS = {
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-2',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  magnet: 'M6 4h4v9a2 2 0 004 0V4h4v9a6 6 0 01-12 0z',
  logOut: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  copy: 'M9 9h10v10H9zM5 15V5a1 1 0 011-1h10',
  check: 'M5 12l5 5L20 7',
  alertTriangle: 'M12 3l10 18H2zM12 10v4M12 17.5v.01',
  panel: 'M4 5h16v14H4zM14 5v14',
  expand: 'M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5',
  collapse: 'M4 9h5V4M15 4v5h5M4 15h5v5M20 15h-5v5',
  calendar: 'M4 5h16v15H4zM4 9h16M8 3v4M16 3v4',
  users: 'M8 12a3 3 0 100-6 3 3 0 100 6zM2 20c0-3.5 2.5-6 6-6s6 2.5 6 6M16 8a2.6 2.6 0 010 5M18 14c2 .5 3.5 2.3 3.5 6',
}

export default function Icon({ name, size = 18, stroke = 1.8, className }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
