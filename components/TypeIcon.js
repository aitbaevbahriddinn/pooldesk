'use client'

// Пиктограммы объектов. Один стиль: линия 1.7, скруглённые концы, сетка 24×24.
const P = {
  lounger: 'M5 15h14M6 15v3M18 15v3M6 12l12-4M6 12h12',
  lounger2: 'M3 15h18M4 15v3M20 15v3M4 12h16M4 12l3-3M20 12l-3-3',
  daybed: 'M4 9h16v9H4zM4 13h16M9 9V6h6v3',
  sofa: 'M3 11v6h18v-6M6 11V8h12v3M3 17v2M21 17v2',
  table: 'M12 6a6 6 0 100 12 6 6 0 100-12zM12 3v2M12 19v2M3 12h2M19 12h2',
  cabin: 'M4 20V9l8-5 8 5v11zM10 20v-6h4v6',
  gazebo: 'M3 10l9-6 9 6M5 10v10M19 10v10M5 20h14M8 10v10M16 10v10',
  bungalow: 'M3 11l9-6 9 6M5 11v9h14v-9M10 20v-5h4v5M2 11h20',
  vip: 'M5 8l3 8h8l3-8-4 3-3-5-3 5zM6 19h12',
  pool: 'M3 9c2-1.5 3.5-1.5 5.5 0S12 10.5 14 9s3.5-1.5 5.5 0M3 14c2-1.5 3.5-1.5 5.5 0S12 15.5 14 14s3.5-1.5 5.5 0M3 19c2-1.5 3.5-1.5 5.5 0',
  kidspool: 'M4 12c2-1.5 3-1.5 5 0s3 1.5 5 0 3-1.5 5 0M4 17c2-1.5 3-1.5 5 0s3 1.5 5 0M9 7l1.5 2M15 6l-1 2',
  jacuzzi: 'M4 13h16v4a3 3 0 01-3 3H7a3 3 0 01-3-3zM8 9V7M12 9V6M16 9V7M8 4v1M16 4v1',
  kids: 'M12 5a3 3 0 100 6 3 3 0 100-6zM7 20c0-3 2-5 5-5s5 2 5 5M4 9l2 1M20 9l-2 1',
  stage: 'M4 16h16v3H4zM7 16V9M17 16V9M7 9h10M12 4v5M9 6l3-2 3 2',
  terrace: 'M3 6h18v12H3zM3 10h18M3 14h18M9 6v12M15 6v12',
  lawn: 'M4 18c1-3 2-4 3-6M9 18c0-4 1-5 2-7M14 18c0-3 1-5 2-6M19 18c0-3-1-4-2-5M3 20h18',
  sand: 'M3 15c3-2 5 2 8 0s5-2 8 0M4 19h16M8 11h.01M14 9h.01M17 12h.01',
  bar: 'M5 5h14l-6 7v5M13 17h3M10 17h3M8 8h8',
  kitchen: 'M4 5h16v14H4zM4 11h16M8 5v6M7 15h4M16 14a2 2 0 100 4 2 2 0 100-4z',
  bbq: 'M5 9h14l-2 7H7zM8 20l1-4M16 20l-1-4M9 6c0-1 1-1 1-2M13 6c0-1 1-1 1-2',
  reception: 'M4 12h16v7H4zM4 16h16M7 12V8h10v4M10 8V6h4v2',
  cashier: 'M4 7h16v10H4zM4 11h16M8 15h3M16 8v2',
  locker: 'M5 4h6v16H5zM13 4h6v16h-6zM8 11h.01M16 11h.01M5 12h6M13 12h6',
  shower: 'M12 4v3M7 10a5 5 0 0110 0zM9 14v2M12 15v2.5M15 14v2M12 19.5v.5',
  toilet: 'M7 4v7a5 5 0 0010 0V4M7 8h10M12 16v4M9 20h6',
  massage: 'M4 13h16v3a2 2 0 01-2 2H6a2 2 0 01-2-2zM8 13V9a2 2 0 012-2h4a2 2 0 012 2v4M12 4v2',
  umbrella: 'M12 4v16M12 20a2 2 0 004 0M3 12a9 9 0 0118 0c-2-1.5-3.5-1.5-5 0-1.5-1.5-3.5-1.5-5 0-1.5-1.5-3-1.5-5 0z',
  tree: 'M12 20v-6M12 14a5 5 0 01-4-8 4 4 0 018 0 5 5 0 01-4 8zM9 20h6',
  plant: 'M12 20v-7M12 13c-3 0-4-2-4-4 3 0 4 2 4 4zM12 13c3 0 4-2 4-4-3 0-4 2-4 4zM9 20h6',
  lifeguard: 'M12 3l2 5h-4zM12 8v6M7 21l5-7 5 7M4 12h3M17 12h3',
  slide: 'M6 20V8a3 3 0 016 0v6a3 3 0 006 0M4 20h4M16 20h4M6 8h6',
  ladder: 'M7 4v16M17 4v16M7 8h10M7 12h10M7 16h10',
  path: 'M4 18c3 0 3-4 6-4s3 4 6 4M4 8h16M4 12h4M12 12h8',
  entrance: 'M6 20V5h9v15M15 12h5M18 9l3 3-3 3M6 20h6',
  rect: 'M5 6h14v12H5z',
}

export default function TypeIcon({ name, size = 18, stroke = 1.7 }) {
  const d = P[name] || P.rect
  return (
    <svg
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
