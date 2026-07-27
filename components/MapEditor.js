'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapObject from './MapObject'
import TypeIcon from './TypeIcon'
import IconButton from './ui/IconButton'
import Button from './ui/Button'
import {
  OBJECT_TYPES,
  PALETTE_GROUPS,
  SHAPES,
  newId,
  nextNumber,
  objectName,
  shapeOf,
  typeOf,
} from '../lib/objectTypes'

const GRID = 10
const GUIDE_TOL = 7
const MIN_SIZE = 24
const HISTORY_LIMIT = 60

const snapTo = (v) => Math.round(v / GRID) * GRID
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function MapEditor({
  poolId,
  objects,
  setObjects,
  onSave,
  saveState,
  fullscreen = false,
  onToggleFullscreen,
}) {
  const [selection, setSelection] = useState([])
  const [tool, setTool] = useState(null)
  const [view, setView] = useState({ x: 40, y: 40, zoom: 0.75 })
  const [showGrid, setShowGrid] = useState(true)
  const [snapOn, setSnapOn] = useState(true)
  const [guides, setGuides] = useState([])
  const [marquee, setMarquee] = useState(null)
  const [mobilePanel, setMobilePanel] = useState(null) // null | 'palette' | 'inspector' — только для узких экранов
  const [isDragging, setIsDragging] = useState(false)

  const past = useRef([])
  const future = useRef([])
  const gesture = useRef(null)
  const viewportRef = useRef(null)
  const spaceRef = useRef(false)
  const objectsRef = useRef(objects)
  objectsRef.current = objects
  const touchPoints = useRef(new Map())

  const selected = useMemo(
    () => objects.filter((o) => selection.includes(o.id)),
    [objects, selection]
  )
  const single = selected.length === 1 ? selected[0] : null
  const numberClash =
    !!single && objects.some((o) => o.id !== single.id && o.type === single.type && o.number === single.number)

  /* ── История ───────────────────────────────────────── */
  const commit = useCallback(
    (next) => {
      past.current = [...past.current.slice(-HISTORY_LIMIT), objects]
      future.current = []
      setObjects(next)
    },
    [objects, setObjects]
  )

  const undo = useCallback(() => {
    if (!past.current.length) return
    const prev = past.current[past.current.length - 1]
    past.current = past.current.slice(0, -1)
    future.current = [objects, ...future.current]
    setObjects(prev)
  }, [objects, setObjects])

  const redo = useCallback(() => {
    if (!future.current.length) return
    const next = future.current[0]
    future.current = future.current.slice(1)
    past.current = [...past.current, objects]
    setObjects(next)
  }, [objects, setObjects])

  /* ── Координаты ────────────────────────────────────── */
  const toWorld = useCallback(
    (e) => {
      const r = viewportRef.current.getBoundingClientRect()
      return {
        x: (e.clientX - r.left - view.x) / view.zoom,
        y: (e.clientY - r.top - view.y) / view.zoom,
      }
    },
    [view]
  )

  /* ── Добавление объекта ────────────────────────────── */
  const place = useCallback(
    (type, at) => {
      const t = typeOf(type)
      const obj = {
        id: newId(),
        pool_id: poolId,
        type,
        number: nextNumber(objects, type),
        label: null,
        shape: null,
        seats: t.seats ?? null,
        x: snapTo(at.x - t.w / 2),
        y: snapTo(at.y - t.h / 2),
        width: t.w,
        height: t.h,
        rotation: 0,
        is_bookable: t.bookable,
        is_available: true,
        locked: false,
        note: null,
      }
      commit([...objects, obj])
      setSelection([obj.id])
    },
    [objects, poolId, commit]
  )

  const patch = useCallback(
    (ids, fields) => {
      commit(objects.map((o) => (ids.includes(o.id) ? { ...o, ...fields } : o)))
    },
    [objects, commit]
  )

  const removeSelected = useCallback(() => {
    if (!selection.length) return
    commit(objects.filter((o) => !selection.includes(o.id) || o.locked))
    setSelection([])
  }, [objects, selection, commit])

  const duplicateSelected = useCallback(() => {
    if (!selection.length) return
    const copies = selected.map((o) => ({
      ...o,
      id: newId(),
      number: nextNumber(objects, o.type) + selected.filter((s) => s.type === o.type).indexOf(o),
      x: o.x + 20,
      y: o.y + 20,
      locked: false,
    }))
    commit([...objects, ...copies])
    setSelection(copies.map((c) => c.id))
  }, [objects, selected, selection, commit])

  /* ── Направляющие ──────────────────────────────────── */
  const computeGuides = useCallback(
    (movingIds, box) => {
      const others = objects.filter((o) => !movingIds.includes(o.id))
      const lines = []
      let dx = 0
      let dy = 0
      let bestX = GUIDE_TOL / view.zoom
      let bestY = GUIDE_TOL / view.zoom

      const vx = [box.x, box.x + box.w / 2, box.x + box.w]
      const vy = [box.y, box.y + box.h / 2, box.y + box.h]

      for (const o of others) {
        const ox = [o.x, o.x + o.width / 2, o.x + o.width]
        const oy = [o.y, o.y + o.height / 2, o.y + o.height]
        for (const a of vx)
          for (const b of ox) {
            const d = b - a
            if (Math.abs(d) < bestX) {
              bestX = Math.abs(d)
              dx = d
            }
          }
        for (const a of vy)
          for (const b of oy) {
            const d = b - a
            if (Math.abs(d) < bestY) {
              bestY = Math.abs(d)
              dy = d
            }
          }
      }

      if (dx !== 0) lines.push({ axis: 'x', at: box.x + dx })
      if (dy !== 0) lines.push({ axis: 'y', at: box.y + dy })
      return { dx, dy, lines }
    },
    [objects, view.zoom]
  )

  /* ── Жесты ─────────────────────────────────────────── */
  // Тач-жесты (пинч-зум, панорама одним пальцем по пустому холсту) —
  // добавляются поверх мышиной логики ниже, не изменяя её: мышь и перо
  // всегда попадают в button===1/spaceRef ветку или в существующую
  // marquee-ветку, как и раньше.
  function onViewportPointerDown(e) {
    if (e.pointerType === 'touch') {
      touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touchPoints.current.size === 2) {
        const r = viewportRef.current.getBoundingClientRect()
        const pts = [...touchPoints.current.values()]
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        gesture.current = {
          kind: 'pinch',
          startDist: dist || 1,
          startZoom: view.zoom,
          startMid: { x: (pts[0].x + pts[1].x) / 2 - r.left, y: (pts[0].y + pts[1].y) / 2 - r.top },
          startView: { x: view.x, y: view.y },
        }
        setMarquee(null)
        try {
          viewportRef.current.setPointerCapture(e.pointerId)
        } catch {}
        return
      }
      if (
        touchPoints.current.size === 1 &&
        !tool &&
        !e.target.closest('.mo') &&
        !e.target.closest('.handle')
      ) {
        gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
        viewportRef.current.setPointerCapture(e.pointerId)
        return
      }
    }

    if (e.button === 1 || spaceRef.current) {
      gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
      viewportRef.current.setPointerCapture(e.pointerId)
      return
    }
    if (e.target.closest('.mo') || e.target.closest('.handle')) return

    const w = toWorld(e)
    if (tool) {
      place(tool, w)
      if (!e.shiftKey) setTool(null)
      return
    }
    gesture.current = { kind: 'marquee', ox: w.x, oy: w.y, additive: e.shiftKey }
    setMarquee({ x: w.x, y: w.y, w: 0, h: 0 })
    if (!e.shiftKey) setSelection([])
    viewportRef.current.setPointerCapture(e.pointerId)
  }

  function onObjectPointerDown(e, obj) {
    if (tool) return
    e.stopPropagation()
    if (obj.locked) {
      setSelection([obj.id])
      return
    }
    let ids
    if (e.shiftKey) {
      ids = selection.includes(obj.id)
        ? selection.filter((i) => i !== obj.id)
        : [...selection, obj.id]
    } else {
      ids = selection.includes(obj.id) ? selection : [obj.id]
    }
    setSelection(ids)

    const w = toWorld(e)
    gesture.current = {
      kind: 'move',
      ox: w.x,
      oy: w.y,
      ids,
      start: objects.filter((o) => ids.includes(o.id)).map((o) => ({ id: o.id, x: o.x, y: o.y })),
      moved: false,
    }
    viewportRef.current.setPointerCapture(e.pointerId)
  }

  // Стабильная ссылка для .mo onPointerDown — без неё React.memo(MapObject)
  // не помогает, т.к. инлайн-стрелка `(e) => onObjectPointerDown(e, o)`
  // создавалась бы заново на каждый рендер для каждого объекта.
  // Сама логика onObjectPointerDown не меняется, меняется только то,
  // как обработчик получает объект (по data-id вместо замыкания).
  const objectPointerDownRef = useRef(onObjectPointerDown)
  objectPointerDownRef.current = onObjectPointerDown
  const handleObjectPointerDown = useCallback((e) => {
    const id = e.currentTarget.getAttribute('data-id')
    const obj = objectsRef.current.find((o) => o.id === id)
    if (obj) objectPointerDownRef.current(e, obj)
  }, [])

  function onHandlePointerDown(e, dir) {
    e.stopPropagation()
    if (!single || single.locked) return
    const w = toWorld(e)
    gesture.current = {
      kind: dir === 'rot' ? 'rotate' : 'resize',
      dir,
      ox: w.x,
      oy: w.y,
      start: { ...single },
      moved: false,
    }
    viewportRef.current.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch' && touchPoints.current.has(e.pointerId)) {
      touchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    const g = gesture.current
    if (!g) return

    if (g.kind === 'pinch') {
      const pts = [...touchPoints.current.values()]
      if (pts.length < 2) return
      const r = viewportRef.current.getBoundingClientRect()
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const mid = { x: (pts[0].x + pts[1].x) / 2 - r.left, y: (pts[0].y + pts[1].y) / 2 - r.top }
      const zoom = clamp(g.startZoom * (dist / g.startDist), 0.15, 3)
      const k = zoom / g.startZoom
      setView({
        zoom,
        x: g.startMid.x - (g.startMid.x - g.startView.x) * k + (mid.x - g.startMid.x),
        y: g.startMid.y - (g.startMid.y - g.startView.y) * k + (mid.y - g.startMid.y),
      })
      return
    }

    const w = toWorld(e)

    if (g.kind === 'pan') {
      setView((v) => ({ ...v, x: g.ox + (e.clientX - g.sx), y: g.oy + (e.clientY - g.sy) }))
      return
    }

    if (g.kind === 'marquee') {
      setMarquee({
        x: Math.min(g.ox, w.x),
        y: Math.min(g.oy, w.y),
        w: Math.abs(w.x - g.ox),
        h: Math.abs(w.y - g.oy),
      })
      return
    }

    if (g.kind === 'move') {
      let dx = w.x - g.ox
      let dy = w.y - g.oy
      if (snapOn) {
        dx = snapTo(dx)
        dy = snapTo(dy)
      }
      const lead = g.start[0]
      const leadObj = objects.find((o) => o.id === lead.id)
      let gl = []
      if (snapOn && leadObj) {
        const box = { x: lead.x + dx, y: lead.y + dy, w: leadObj.width, h: leadObj.height }
        const res = computeGuides(g.ids, box)
        dx += res.dx
        dy += res.dy
        gl = res.lines
      }
      setGuides(gl)
      if (!g.moved) setIsDragging(true)
      g.moved = true
      setObjects(
        objects.map((o) => {
          const s = g.start.find((p) => p.id === o.id)
          return s ? { ...o, x: s.x + dx, y: s.y + dy } : o
        })
      )
      return
    }

    if (g.kind === 'resize') {
      const s = g.start
      let { x, y, width, height } = s
      let dx = w.x - g.ox
      let dy = w.y - g.oy
      if (snapOn) {
        dx = snapTo(dx)
        dy = snapTo(dy)
      }
      if (g.dir.includes('e')) width = Math.max(MIN_SIZE, s.width + dx)
      if (g.dir.includes('s')) height = Math.max(MIN_SIZE, s.height + dy)
      if (g.dir.includes('w')) {
        width = Math.max(MIN_SIZE, s.width - dx)
        x = s.x + (s.width - width)
      }
      if (g.dir.includes('n')) {
        height = Math.max(MIN_SIZE, s.height - dy)
        y = s.y + (s.height - height)
      }
      g.moved = true
      setObjects(objects.map((o) => (o.id === s.id ? { ...o, x, y, width, height } : o)))
      return
    }

    if (g.kind === 'rotate') {
      const s = g.start
      const cx = s.x + s.width / 2
      const cy = s.y + s.height / 2
      let deg = (Math.atan2(w.y - cy, w.x - cx) * 180) / Math.PI + 90
      if (snapOn || e.shiftKey) deg = Math.round(deg / 15) * 15
      g.moved = true
      setObjects(objects.map((o) => (o.id === s.id ? { ...o, rotation: Math.round(deg) } : o)))
    }
  }

  function onPointerUp(e) {
    touchPoints.current.delete(e.pointerId)
    const g = gesture.current
    gesture.current = null
    setGuides([])
    setIsDragging(false)
    if (!g) return
    try {
      viewportRef.current.releasePointerCapture(e.pointerId)
    } catch {}

    if (g.kind === 'marquee' && marquee) {
      const hits = objects
        .filter(
          (o) =>
            !o.locked &&
            o.x < marquee.x + marquee.w &&
            o.x + o.width > marquee.x &&
            o.y < marquee.y + marquee.h &&
            o.y + o.height > marquee.y
        )
        .map((o) => o.id)
      setSelection(g.additive ? [...new Set([...selection, ...hits])] : hits)
      setMarquee(null)
      return
    }

    if (g.moved) {
      past.current = [...past.current.slice(-HISTORY_LIMIT), restoreFrom(g)]
      future.current = []
      onSave()
    }
  }

  function restoreFrom(g) {
    if (g.kind === 'move') {
      return objects.map((o) => {
        const s = g.start.find((p) => p.id === o.id)
        return s ? { ...o, x: s.x, y: s.y } : o
      })
    }
    return objects.map((o) => (o.id === g.start.id ? { ...g.start } : o))
  }

  /* ── Колесо: зум ───────────────────────────────────── */
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left
      const py = e.clientY - r.top
      setView((v) => {
        const z = clamp(v.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.15, 3)
        const k = z / v.zoom
        return { zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* ── Клавиатура ────────────────────────────────────── */
  useEffect(() => {
    const down = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (e.code === 'Space' && !typing) {
        spaceRef.current = true
        return
      }
      if (typing) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeSelected()
      } else if (e.key === 'Escape') {
        setTool(null)
        setSelection([])
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!selection.length) return
        e.preventDefault()
        const step = e.shiftKey ? GRID * 5 : GRID
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        commit(
          objects.map((o) =>
            selection.includes(o.id) && !o.locked ? { ...o, x: o.x + dx, y: o.y + dy } : o
          )
        )
        onSave()
      }
    }
    const up = (e) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [undo, redo, duplicateSelected, removeSelected, objects, selection, commit, onSave])

  const bookableCount = objects.filter((o) => typeOf(o.type).bookable).length

  return (
    <div className="editor">
      {/* ── Затемнение и переключатели для мобильных панелей ── */}
      {mobilePanel && (
        <div className="mobile-backdrop" onClick={() => setMobilePanel(null)} />
      )}
      <div className="mobile-toggles">
        <Button
          variant={mobilePanel === 'palette' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMobilePanel((p) => (p === 'palette' ? null : 'palette'))}
        >
          <TypeIcon name="rect" size={15} /> Объекты
        </Button>
        <Button
          variant={mobilePanel === 'inspector' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMobilePanel((p) => (p === 'inspector' ? null : 'inspector'))}
        >
          Свойства{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </div>

      {/* ── Палитра ── */}
      <aside className={`palette chrome mobile-drawer ${mobilePanel === 'palette' ? 'mobile-open' : ''}`}>
        <div className="drawer-handle mobile-only" />
        <div className="pal-head">
          <span className="eyebrow">Добавить объект</span>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            Выберите тип, затем щёлкните по карте. Shift — ставить подряд.
          </p>
        </div>
        <div className="pal-scroll">
          {PALETTE_GROUPS.map((g) => {
            const items = Object.entries(OBJECT_TYPES).filter(([, t]) => t.group === g.id)
            if (!items.length) return null
            return (
              <div key={g.id} className="pal-group">
                <span className="pal-title">{g.title}</span>
                {items.map(([key, t]) => (
                  <button
                    key={key}
                    className={`pal-item ${tool === key ? 'on' : ''}`}
                    onClick={() => setTool(tool === key ? null : key)}
                  >
                    <span className="pico">
                      <TypeIcon name={t.icon} size={17} />
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ── Холст ── */}
      <div
        ref={viewportRef}
        className={`viewport ${tool ? 'placing' : ''}`}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="world"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            backgroundSize: showGrid ? `${GRID * 5}px ${GRID * 5}px` : '0 0',
          }}
        >
          {objects.map((o) => (
            <MapObject
              key={o.id}
              obj={o}
              zoom={view.zoom}
              selected={selection.includes(o.id)}
              dragging={isDragging && selection.includes(o.id)}
              onPointerDown={handleObjectPointerDown}
            />
          ))}

          {guides.map((g, i) => (
            <div
              key={i}
              className={`guide ${g.axis}`}
              style={
                g.axis === 'x'
                  ? { left: g.at, borderLeftWidth: 1 / view.zoom }
                  : { top: g.at, borderTopWidth: 1 / view.zoom }
              }
            />
          ))}

          {marquee && (
            <div
              className="marquee"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.w,
                height: marquee.h,
                borderWidth: 1 / view.zoom,
              }}
            />
          )}

          {single && !single.locked && (
            <Handles obj={single} zoom={view.zoom} onDown={onHandlePointerDown} />
          )}
        </div>

        <div className="statusbar chrome">
          <label className="chk">
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            Сетка
          </label>
          <label className="chk">
            <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
            Привязка
          </label>
          <span className="sep" />
          <IconButton icon="undo" label="Отменить (Ctrl+Z)" onClick={undo} />
          <IconButton icon="redo" label="Повторить (Ctrl+Shift+Z)" onClick={redo} />
          <span className="sep" />
          <span className="tiny muted count-label">
            Мест для гостей: <b>{bookableCount}</b> · объектов: {objects.length}
          </span>
          <span className="grow" />
          <span className={`save ${saveState}`} role="status" aria-live="polite">
            {saveState === 'saving' ? 'Сохраняем…' : saveState === 'error' ? 'Ошибка сохранения' : 'Сохранено'}
          </span>
          <span className="sep" />
          <IconButton
            icon="minus"
            size={15}
            label="Уменьшить масштаб"
            onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 0.85, 0.15, 3) }))}
          />
          <span className="tiny muted" style={{ minWidth: 42, textAlign: 'center' }}>
            {Math.round(view.zoom * 100)}%
          </span>
          <IconButton
            icon="plus"
            size={15}
            label="Увеличить масштаб"
            onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 1.18, 0.15, 3) }))}
          />
          {onToggleFullscreen && (
            <>
              <span className="sep" />
              <IconButton
                icon={fullscreen ? 'collapse' : 'expand'}
                label={fullscreen ? 'Свернуть карту' : 'Открыть карту полностью'}
                onClick={onToggleFullscreen}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Инспектор ── */}
      <aside className={`inspector chrome mobile-drawer ${mobilePanel === 'inspector' ? 'mobile-open' : ''}`}>
        <div className="drawer-handle mobile-only" />
        {!selected.length && (
          <div className="insp-empty">
            <span className="eyebrow">Свойства</span>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Выберите объект на карте, чтобы изменить номер, размер или заблокировать его.
            </p>
            <ul className="hints tiny muted">
              <li>Пробел + перетаскивание — двигать карту</li>
              <li>Колесо мыши — масштаб</li>
              <li>Shift + клик — выбрать несколько</li>
              <li>Ctrl + D — дублировать</li>
              <li>Стрелки — сдвинуть на шаг сетки</li>
            </ul>
          </div>
        )}

        {selected.length > 1 && (
          <div className="insp-body">
            <span className="eyebrow">Выбрано объектов: {selected.length}</span>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={duplicateSelected}>
                Дублировать
              </button>
              <button className="btn btn-ghost danger" onClick={removeSelected}>
                Удалить
              </button>
            </div>
          </div>
        )}

        {single && (
          <div className="insp-body">
            <span className="eyebrow">{typeOf(single.type).label}</span>
            <h3 style={{ margin: '6px 0 18px' }}>{objectName(single)}</h3>

            <div className="field">
              <label htmlFor="obj-number">Номер</label>
              <input
                id="obj-number"
                className="input"
                type="number"
                value={single.number}
                aria-invalid={numberClash || undefined}
                aria-describedby={numberClash ? 'obj-number-err' : undefined}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (Number.isNaN(n)) return
                  const clash = objects.some(
                    (o) => o.id !== single.id && o.type === single.type && o.number === n
                  )
                  if (clash) return
                  patch([single.id], { number: n })
                  onSave()
                }}
              />
              {numberClash && (
                <p className="tiny err" id="obj-number-err" role="alert">
                  Такой номер уже занят
                </p>
              )}
            </div>

            <div className="field">
              <label>Своё название (необязательно)</label>
              <input
                className="input"
                placeholder={`${typeOf(single.type).label} ${single.number}`}
                value={single.label || ''}
                onChange={(e) => patch([single.id], { label: e.target.value || null })}
                onBlur={onSave}
              />
            </div>

            {single.type === 'table' && (
              <div className="field">
                <label>Количество мест</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={single.seats || 1}
                  onChange={(e) =>
                    patch([single.id], { seats: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  onBlur={onSave}
                />
              </div>
            )}

            <div className="two">
              <div className="field">
                <label>Ширина</label>
                <input
                  className="input"
                  type="number"
                  value={Math.round(single.width)}
                  onChange={(e) =>
                    patch([single.id], { width: Math.max(MIN_SIZE, +e.target.value || MIN_SIZE) })
                  }
                  onBlur={onSave}
                />
              </div>
              <div className="field">
                <label>Высота</label>
                <input
                  className="input"
                  type="number"
                  value={Math.round(single.height)}
                  onChange={(e) =>
                    patch([single.id], { height: Math.max(MIN_SIZE, +e.target.value || MIN_SIZE) })
                  }
                  onBlur={onSave}
                />
              </div>
            </div>

            <div className="field">
              <label>Форма</label>
              <div className="shapes">
                {SHAPES.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    title={sh.label}
                    className={`shp sp-${sh.id} ${shapeOf(single) === sh.id ? 'on' : ''}`}
                    onClick={() => {
                      patch([single.id], { shape: sh.id })
                      onSave()
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="field">
              <label>Поворот, °</label>
              <input
                className="input"
                type="number"
                value={Math.round(single.rotation)}
                onChange={(e) => patch([single.id], { rotation: +e.target.value || 0 })}
                onBlur={onSave}
              />
            </div>

            <div className="field">
              <label>Заметка</label>
              <input
                className="input"
                placeholder="Например: у самой воды"
                value={single.note || ''}
                onChange={(e) => patch([single.id], { note: e.target.value || null })}
                onBlur={onSave}
              />
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={!single.is_available}
                onChange={(e) => {
                  patch([single.id], { is_available: !e.target.checked })
                  onSave()
                }}
              />
              Выведен из использования
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={single.locked}
                onChange={(e) => {
                  patch([single.id], { locked: e.target.checked })
                  onSave()
                }}
              />
              Заблокировать от перемещения
            </label>

            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={duplicateSelected}>
                Дублировать
              </button>
              <button className="btn btn-ghost danger" onClick={removeSelected}>
                Удалить
              </button>
            </div>
          </div>
        )}
      </aside>

      <style jsx>{`
        .editor {
          display: grid;
          grid-template-columns: 216px 1fr 268px;
          height: 100%;
          min-height: 0;
        }
        .palette,
        .inspector {
          background: var(--surface);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .palette {
          border-right: 1px solid #0a1920;
        }
        .inspector {
          border-left: 1px solid #0a1920;
          overflow-y: auto;
        }
        .pal-head {
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--line);
        }
        .pal-scroll {
          overflow-y: auto;
          padding: 12px 10px 20px;
        }
        .pal-group {
          margin-bottom: 16px;
        }
        .pal-title {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--ink-3);
          padding: 0 6px 6px;
        }
        .pal-item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8px 8px;
          font: inherit;
          font-weight: 500;
          color: var(--ink);
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--r-sm);
          cursor: pointer;
          text-align: left;
        }
        .pal-item:hover {
          background: var(--surface-2);
        }
        .pal-item.on {
          background: var(--water-wash);
          border-color: var(--water);
          color: var(--water-deep);
          font-weight: 600;
        }
        .pico {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          flex: none;
          color: var(--ink-2);
          background: rgba(232, 239, 242, 0.07);
          border: 1px solid var(--line);
          border-radius: 7px;
        }
        .pal-item.on .pico {
          color: var(--water);
          background: var(--water-wash);
          border-color: var(--water);
        }

        .viewport {
          position: relative;
          overflow: hidden;
          background: radial-gradient(120% 90% at 50% 0%, #f0f4f6 0%, #dde5e9 100%);
          touch-action: none;
          cursor: default;
        }
        .viewport.placing {
          cursor: crosshair;
        }
        .world {
          position: absolute;
          top: 0;
          left: 0;
          width: 4000px;
          height: 3000px;
          transform-origin: 0 0;
          background-color: var(--paper);
          background-image: linear-gradient(to right, #e6ecee 1px, transparent 1px),
            linear-gradient(to bottom, #e6ecee 1px, transparent 1px);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(6, 18, 24, 0.16);
        }
        .guide {
          position: absolute;
          border: 0 dashed var(--water);
          pointer-events: none;
        }
        .guide.x {
          top: 0;
          height: 100%;
          border-left-style: dashed;
        }
        .guide.y {
          left: 0;
          width: 100%;
          border-top-style: dashed;
        }
        .marquee {
          position: absolute;
          border: 0 solid var(--water);
          background: rgba(11, 110, 140, 0.08);
          pointer-events: none;
        }

        .statusbar {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          box-shadow: var(--shadow-2);
          font-size: 12px;
        }
        .chk {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--ink-2);
          cursor: pointer;
          padding: 0 4px;
        }
        .sep {
          width: 1px;
          align-self: stretch;
          background: var(--line);
          margin: 0 4px;
        }
        .grow {
          flex: 1;
        }
        .save {
          font-size: 12px;
          color: var(--ink-3);
        }
        .save.saving {
          color: var(--water);
        }
        .save.error {
          color: var(--busy);
          font-weight: 600;
        }

        .insp-empty,
        .insp-body {
          padding: 18px 16px;
        }
        .hints {
          margin: 16px 0 0;
          padding-left: 16px;
          line-height: 1.9;
        }
        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .row {
          display: flex;
          gap: 8px;
        }
        .row :global(.btn) {
          flex: 1;
        }
        .shapes {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .shp {
          aspect-ratio: 1;
          background: rgba(232, 239, 242, 0.1);
          border: 1.5px solid var(--line-strong);
          cursor: pointer;
          padding: 0;
        }
        .shp:hover {
          border-color: var(--ink-3);
        }
        .shp.on {
          background: var(--water-wash);
          border-color: var(--water);
        }
        .sp-rect {
          border-radius: 2px;
        }
        .sp-rounded {
          border-radius: 7px;
        }
        .sp-pill {
          border-radius: 999px;
        }
        .sp-circle,
        .sp-oval {
          border-radius: 50%;
        }
        .sp-water {
          border-radius: 44% 56% 48% 52% / 54% 46% 54% 46%;
        }
        .sp-hex {
          clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        }
        .sp-octa {
          clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
        }
        .sp-diamond {
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }
        .toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--ink-2);
          margin-bottom: 10px;
          cursor: pointer;
        }
        .err {
          color: var(--busy);
          margin-top: 4px;
        }
        :global(.btn-ghost.danger) {
          color: var(--busy);
        }
        :global(.btn-ghost.danger:hover) {
          background: #fdeaea;
          border-color: var(--busy);
        }

        /* ── Мобильные версии палитры/инспектора: выдвижные
             панели снизу вместо полного скрытия. Правила ниже
             действуют только под медиа-запросом — десктоп не
             затрагивается. ── */
        .mobile-toggles,
        .mobile-backdrop {
          display: none;
        }
        .drawer-handle.mobile-only {
          display: none;
        }
        @media (max-width: 1024px) {
          .editor {
            grid-template-columns: 1fr;
          }
          .mobile-toggles {
            display: flex;
            gap: 8px;
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 64px;
            z-index: 42;
            justify-content: center;
          }
          .statusbar {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .mobile-toggles :global(.btn) {
            flex: 1;
            max-width: 220px;
          }
          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(13, 27, 33, 0.32);
            z-index: 40;
          }
          .palette,
          .inspector {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            max-height: 75vh;
            border-radius: var(--r-lg) var(--r-lg) 0 0;
            box-shadow: var(--shadow-3);
            transform: translateY(100%);
            transition: transform var(--dur-base) var(--ease);
            z-index: 41;
            border: none !important;
          }
          .palette.mobile-open,
          .inspector.mobile-open {
            transform: translateY(0);
          }
          .drawer-handle.mobile-only {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}

/* ── Ручки трансформации ─────────────────────────────── */
function Handles({ obj, zoom, onDown }) {
  const s = 9 / zoom
  const dirs = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  const pos = {
    nw: [0, 0],
    n: [0.5, 0],
    ne: [1, 0],
    e: [1, 0.5],
    se: [1, 1],
    s: [0.5, 1],
    sw: [0, 1],
    w: [0, 0.5],
  }
  return (
    <div
      className="handles"
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
      }}
    >
      {!obj.rotation &&
        dirs.map((d) => (
          <span
            key={d}
            className="handle"
            onPointerDown={(e) => onDown(e, d)}
            style={{
              left: `calc(${pos[d][0] * 100}% - ${s / 2}px)`,
              top: `calc(${pos[d][1] * 100}% - ${s / 2}px)`,
              width: s,
              height: s,
              borderWidth: 1.5 / zoom,
            }}
          />
        ))}
      <span
        className="handle rot"
        onPointerDown={(e) => onDown(e, 'rot')}
        style={{
          left: `calc(50% - ${s / 2}px)`,
          top: -22 / zoom,
          width: s,
          height: s,
          borderWidth: 1.5 / zoom,
        }}
      />
      <style jsx>{`
        .handles {
          position: absolute;
          transform-origin: center;
          pointer-events: none;
        }
        .handle {
          position: absolute;
          background: #fff;
          border: 0 solid var(--water);
          border-radius: 2px;
          pointer-events: auto;
          cursor: pointer;
          box-sizing: border-box;
        }
        .rot {
          border-radius: 50%;
          background: var(--water);
        }
        /* На тач-устройствах видимый размер ручек не меняем (точность
           для мыши важнее), но расширяем область попадания невидимым
           псевдоэлементом — иначе 9px слишком мелко для пальца. */
        @media (pointer: coarse) {
          .handle::before {
            content: '';
            position: absolute;
            inset: -11px;
          }
        }
      `}</style>
    </div>
  )
}
