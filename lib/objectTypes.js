// Каталог объектов карты. Размеры — в условных единицах (≈ сантиметры).
// bookable определяет, можно ли посадить на объект гостя.

export const OBJECT_TYPES = {
  /* ── Места для гостей ─────────────────────────── */
  lounger:  { label: 'Лежак',        w: 56,  h: 130, shape: 'rounded', icon: 'lounger',  bookable: true, group: 'seating' },
  lounger2: { label: 'Двойной лежак',w: 120, h: 130, shape: 'rounded', icon: 'lounger2', bookable: true, group: 'seating' },
  daybed:   { label: 'Тапчан',       w: 160, h: 160, shape: 'rounded', icon: 'daybed',   bookable: true, group: 'seating' },
  sofa:     { label: 'Диван',        w: 190, h: 80,  shape: 'rounded', icon: 'sofa',     bookable: true, group: 'seating' },
  table:    { label: 'Стол',         w: 96,  h: 96,  shape: 'circle',  icon: 'table',    bookable: true, seats: 4, group: 'seating' },
  cabin:    { label: 'Кабинка',      w: 140, h: 120, shape: 'rounded', icon: 'cabin',    bookable: true, group: 'seating' },
  gazebo:   { label: 'Беседка',      w: 200, h: 200, shape: 'octa',    icon: 'gazebo',   bookable: true, group: 'seating' },
  bungalow: { label: 'Бунгало',      w: 240, h: 180, shape: 'rounded', icon: 'bungalow', bookable: true, group: 'seating' },
  vip:      { label: 'VIP-зона',     w: 280, h: 200, shape: 'rounded', icon: 'vip',      bookable: true, group: 'seating' },

  /* ── Зоны ─────────────────────────────────────── */
  pool:      { label: 'Бассейн',        w: 560, h: 300, shape: 'water',   icon: 'pool',     bookable: false, group: 'zone' },
  kidspool:  { label: 'Детский бассейн',w: 260, h: 180, shape: 'water',   icon: 'kidspool', bookable: false, group: 'zone' },
  jacuzzi:   { label: 'Джакузи',        w: 160, h: 160, shape: 'circle',  icon: 'jacuzzi',  bookable: false, group: 'zone' },
  kids:      { label: 'Детская зона',   w: 280, h: 200, shape: 'rounded', icon: 'kids',     bookable: false, group: 'zone' },
  stage:     { label: 'Сцена',          w: 280, h: 140, shape: 'rounded', icon: 'stage',    bookable: false, group: 'zone' },
  terrace:   { label: 'Терраса',        w: 360, h: 200, shape: 'rect',    icon: 'terrace',  bookable: false, group: 'zone' },
  lawn:      { label: 'Газон',          w: 360, h: 240, shape: 'rounded', icon: 'lawn',     bookable: false, group: 'zone' },
  sand:      { label: 'Песок',          w: 360, h: 240, shape: 'water',   icon: 'sand',     bookable: false, group: 'zone' },

  /* ── Сервис ───────────────────────────────────── */
  bar:       { label: 'Бар',            w: 240, h: 90,  shape: 'rounded', icon: 'bar',       bookable: false, group: 'service' },
  kitchen:   { label: 'Кухня',          w: 220, h: 160, shape: 'rect',    icon: 'kitchen',   bookable: false, group: 'service' },
  bbq:       { label: 'Мангал',         w: 140, h: 90,  shape: 'rounded', icon: 'bbq',       bookable: false, group: 'service' },
  reception: { label: 'Ресепшн',        w: 200, h: 100, shape: 'pill',    icon: 'reception', bookable: false, group: 'service' },
  cashier:   { label: 'Касса',          w: 130, h: 90,  shape: 'rect',    icon: 'cashier',   bookable: false, group: 'service' },
  locker:    { label: 'Раздевалка',     w: 180, h: 130, shape: 'rect',    icon: 'locker',    bookable: false, group: 'service' },
  shower:    { label: 'Душ',            w: 100, h: 100, shape: 'rect',    icon: 'shower',    bookable: false, group: 'service' },
  toilet:    { label: 'Туалет',         w: 130, h: 100, shape: 'rect',    icon: 'toilet',    bookable: false, group: 'service' },
  massage:   { label: 'Массаж',         w: 160, h: 110, shape: 'rounded', icon: 'massage',   bookable: false, group: 'service' },

  /* ── Прочее ───────────────────────────────────── */
  umbrella:  { label: 'Зонтик',      w: 80,  h: 80,  shape: 'circle',  icon: 'umbrella',  bookable: false, group: 'decor' },
  tree:      { label: 'Дерево',      w: 90,  h: 90,  shape: 'circle',  icon: 'tree',      bookable: false, group: 'decor' },
  plant:     { label: 'Растение',    w: 60,  h: 60,  shape: 'circle',  icon: 'plant',     bookable: false, group: 'decor' },
  lifeguard: { label: 'Пост спасателя', w: 100, h: 100, shape: 'diamond', icon: 'lifeguard', bookable: false, group: 'decor' },
  slide:     { label: 'Горка',       w: 160, h: 220, shape: 'rounded', icon: 'slide',     bookable: false, group: 'decor' },
  ladder:    { label: 'Лестница',    w: 90,  h: 60,  shape: 'rect',    icon: 'ladder',    bookable: false, group: 'decor' },
  path:      { label: 'Дорожка',     w: 400, h: 70,  shape: 'pill',    icon: 'path',      bookable: false, group: 'decor' },
  entrance:  { label: 'Вход',        w: 130, h: 70,  shape: 'pill',    icon: 'entrance',  bookable: false, group: 'decor' },
}

export const PALETTE_GROUPS = [
  { id: 'seating', title: 'Места для гостей' },
  { id: 'zone', title: 'Зоны' },
  { id: 'service', title: 'Сервис' },
  { id: 'decor', title: 'Прочее' },
]

export const SHAPES = [
  { id: 'rect', label: 'Прямоугольник' },
  { id: 'rounded', label: 'Скруглённый' },
  { id: 'pill', label: 'Капсула' },
  { id: 'circle', label: 'Круг' },
  { id: 'oval', label: 'Овал' },
  { id: 'hex', label: 'Шестигранник' },
  { id: 'octa', label: 'Восьмигранник' },
  { id: 'diamond', label: 'Ромб' },
  { id: 'water', label: 'Свободная' },
]

export function typeOf(type) {
  return (
    OBJECT_TYPES[type] || {
      label: type,
      w: 100,
      h: 100,
      shape: 'rect',
      icon: 'rect',
      bookable: false,
      group: 'decor',
    }
  )
}

export function shapeOf(obj) {
  return obj.shape || typeOf(obj.type).shape || 'rect'
}

// Полное имя объекта, без сокращений: «Лежак 12», «Стол 4 (6 мест)»
export function objectName(obj) {
  const t = typeOf(obj.type)
  const base = obj.label?.trim() ? obj.label.trim() : `${t.label} ${obj.number}`
  if (obj.type === 'table' && obj.seats) return `${base} (${obj.seats} мест)`
  return base
}

export function nextNumber(objects, type) {
  const used = objects.filter((o) => o.type === type).map((o) => o.number)
  return used.length ? Math.max(...used) + 1 : 1
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
