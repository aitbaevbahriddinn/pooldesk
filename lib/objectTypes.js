// Каталог объектов карты. Размеры — в условных единицах карты (≈ сантиметры).
// bookable определяет, можно ли посадить на объект гостя.

export const OBJECT_TYPES = {
  lounger: { label: 'Лежак', w: 56, h: 130, shape: 'rounded', bookable: true, group: 'seating' },
  daybed: { label: 'Тапчан', w: 150, h: 150, shape: 'rounded', bookable: true, group: 'seating' },
  table: { label: 'Стол', w: 96, h: 96, shape: 'circle', bookable: true, seats: 4, group: 'seating' },
  cabin: { label: 'Кабинка', w: 140, h: 120, shape: 'rounded', bookable: true, group: 'seating' },
  umbrella: { label: 'Зонтик', w: 76, h: 76, shape: 'circle', bookable: false, group: 'decor' },
  pool: { label: 'Бассейн', w: 520, h: 300, shape: 'water', bookable: false, group: 'zone' },
  kids: { label: 'Детская зона', w: 260, h: 200, shape: 'rounded', bookable: false, group: 'zone' },
  stage: { label: 'Сцена', w: 260, h: 140, shape: 'rect', bookable: false, group: 'zone' },
  bar: { label: 'Бар', w: 230, h: 80, shape: 'rect', bookable: false, group: 'service' },
  cashier: { label: 'Касса', w: 120, h: 84, shape: 'rect', bookable: false, group: 'service' },
  shower: { label: 'Душ', w: 92, h: 92, shape: 'rect', bookable: false, group: 'service' },
  toilet: { label: 'Туалет', w: 120, h: 92, shape: 'rect', bookable: false, group: 'service' },
}

export const PALETTE_GROUPS = [
  { id: 'seating', title: 'Места для гостей' },
  { id: 'zone', title: 'Зоны' },
  { id: 'service', title: 'Сервис' },
  { id: 'decor', title: 'Прочее' },
]

export function typeOf(type) {
  return OBJECT_TYPES[type] || { label: type, w: 100, h: 100, shape: 'rect', bookable: false }
}

// Полное имя объекта — без сокращений: «Лежак 12», «Стол 4 (6 мест)»
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
