'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapObject from './MapObject'
import VisitDialog from './VisitDialog'
import usePinchZoom from '../lib/usePinchZoom'
import { createClient } from '../lib/supabaseClient'
import { objectName, typeOf } from '../lib/objectTypes'

const VISIT_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#ea580c',
  '#0891b2',
  '#db2777',
  '#4d7c0f',
  '#b45309',
  '#0f766e',
]

const VISIT_FIELDS =
  'id, visit_date, status, guest_name, phone, arrival_time, hold_minutes, comment, color, arrived_at, created_at, visit_objects(id, object_id, is_active)'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function MapBoard({ poolId, objects, onEdit }) {
  const supabase = createClient()
  const [date, setDate] = useState(todayStr)
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [error, setError] = useState('')
  const [, tick] = useState(0)
  const [view, setView] = useState({ x: 40, y: 40, zoom: 0.6 })
  const [panelOpen, setPanelOpen] = useState(true)

  const viewportRef = useRef(null)
  const pan = useRef(null)
  const fitted = useRef(false)

  const pinchActive = usePinchZoom(viewportRef, view, setView, pan, 0.15, 2.5)

  /* Живые таймеры удержания */
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 20000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('visits')
      .select(VISIT_FIELDS)
      .eq('pool_id', poolId)
      .eq('visit_date', date)
      .order('created_at')
    if (error) setError(error.message)
    else setVisits(data || [])
    setLoading(false)
  }, [poolId, date])

  useEffect(() => {
    setLoading(true)
    setSelection([])
    setActiveId(null)
    load()
  }, [load])

  /* Вписать карту в экран при первом показе */
  useEffect(() => {
    if (fitted.current || !objects.length || !viewportRef.current) return
    fitted.current = true
    const minX = Math.min(...objects.map((o) => o.x)) - 60
    const minY = Math.min(...objects.map((o) => o.y)) - 60
    const maxX = Math.max(...objects.map((o) => o.x + o.width)) + 60
    const maxY = Math.max(...objects.map((o) => o.y + o.height)) + 60
    const r = viewportRef.current.getBoundingClientRect()
    const z = clamp(Math.min(r.width / (maxX - minX), r.height / (maxY - minY)), 0.15, 1.4)
    setView({ zoom: z, x: -minX * z + (r.width - (maxX - minX) * z) / 2, y: -minY * z + 24 })
  }, [objects])

  /* ── Производные данные ────────────────────────────── */
  const active = visits.filter((v) => v.status === 'booked' || v.status === 'arrived')

  const byObject = useMemo(() => {
    const m = new Map()
    for (const v of active)
      for (const vo of v.visit_objects || []) if (vo.is_active) m.set(vo.object_id, v)
    return m
  }, [visits])

  const objectById = useMemo(() => new Map(objects.map((o) => [o.id, o])), [objects])
  const seats = objects.filter((o) => typeOf(o.type).bookable)

  const counts = useMemo(() => {
    let free = 0,
      booked = 0,
      busy = 0,
      off = 0
    for (const o of seats) {
      if (!o.is_available) off++
      else {
        const v = byObject.get(o.id)
        if (!v) free++
        else if (v.status === 'arrived') busy++
        else booked++
      }
    }
    return { free, booked, busy, off, total: seats.length }
  }, [seats, byObject])

  const activeVisit = visits.find((v) => v.id === activeId) || null

  function statusOf(o) {
    if (!typeOf(o.type).bookable) return null
    if (!o.is_available) return 'off'
    const v = byObject.get(o.id)
    if (!v) return 'free'
    return v.status === 'arrived' ? 'busy' : 'booked'
  }

  /* ── Взаимодействие с картой ───────────────────────── */
  function clickObject(e, o) {
    e.stopPropagation()
    if (pinchActive.current) return
    if (!typeOf(o.type).bookable || !o.is_available) return
    const v = byObject.get(o.id)
    if (v) {
      setActiveId(v.id)
      setSelection([])
      setPanelOpen(true)
      return
    }
    setActiveId(null)
    setSelection((s) => (s.includes(o.id) ? s.filter((i) => i !== o.id) : [...s, o.id]))
  }

  function startPan(e) {
    if (pinchActive.current) return
    if (e.target.closest('.mo')) return
    setSelection([])
    setActiveId(null)
    pan.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
    viewportRef.current.setPointerCapture(e.pointerId)
  }

  function movePan(e) {
    if (!pan.current) return
    const p = pan.current
    setView((v) => ({ ...v, x: p.ox + (e.clientX - p.sx), y: p.oy + (e.clientY - p.sy) }))
  }

  function endPan(e) {
    pan.current = null
    try {
      viewportRef.current.releasePointerCapture(e.pointerId)
    } catch {}
  }

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left
      const py = e.clientY - r.top
      setView((v) => {
        const z = clamp(v.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.15, 2.5)
        const k = z / v.zoom
        return { zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* ── Операции ──────────────────────────────────────── */
  async function createVisit(form, status) {
    const color = VISIT_COLORS[visits.length % VISIT_COLORS.length]
    const { error } = await supabase.rpc('create_visit', {
      p_pool: poolId,
      p_date: date,
      p_status: status,
      p_objects: selection,
      p_guest: form.guest_name,
      p_phone: form.phone,
      p_arrival: status === 'arrived' ? null : form.arrival_time,
      p_hold: form.hold_minutes,
      p_comment: form.comment,
      p_color: color,
    })
    if (error) throw new Error(error.message)
    setDialog(null)
    setSelection([])
    await load()
  }

  async function saveVisit(form) {
    const { error } = await supabase
      .from('visits')
      .update({
        guest_name: form.guest_name || null,
        phone: form.phone || null,
        arrival_time: form.arrival_time,
        hold_minutes: form.hold_minutes,
        comment: form.comment || null,
      })
      .eq('id', activeVisit.id)
    if (error) throw new Error(error.message)
    setDialog(null)
    await load()
  }

  async function setStatus(visit, status) {
    const patch = { status }
    if (status === 'arrived') patch.arrived_at = new Date().toISOString()
    if (['completed', 'cancelled', 'no_show'].includes(status))
      patch.closed_at = new Date().toISOString()
    const { error } = await supabase.from('visits').update(patch).eq('id', visit.id)
    if (error) return setError(error.message)
    if (status !== 'arrived') setActiveId(null)
    await load()
  }

  async function addSeats() {
    setError('')
    for (const objectId of selection) {
      const { error } = await supabase.rpc('add_visit_object', {
        p_visit: activeVisit.id,
        p_object: objectId,
      })
      if (error) {
        setError(error.message)
        break
      }
    }
    setSelection([])
    await load()
  }

  async function removeSeat(voId) {
    const { error } = await supabase.from('visit_objects').delete().eq('id', voId)
    if (error) return setError(error.message)
    await load()
  }

  const selectedNames = selection.map((id) => objectName(objectById.get(id) || {}))

  return (
    <div className="board">
      {/* ── Шапка дня ── */}
      <div className="daybar chrome">
        <div className="dates">
          <button className="btn btn-quiet" onClick={() => setDate(shift(date, -1))} aria-label="Предыдущий день">
            ‹
          </button>
          <input
            className="dateinput"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button className="btn btn-quiet" onClick={() => setDate(shift(date, 1))} aria-label="Следующий день">
            ›
          </button>
          <span className="human">{humanDate(date)}</span>
          {date !== todayStr() && (
            <button className="btn btn-ghost sm" onClick={() => setDate(todayStr())}>
              Сегодня
            </button>
          )}
        </div>

        <Gauge counts={counts} />
      </div>

      {/* ── Карта ── */}
      <div className={`main ${panelOpen ? '' : 'collapsed'}`}>
        <div
          ref={viewportRef}
          className="viewport"
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          <div
            className="world"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
          >
            {objects.map((o) => {
              const v = byObject.get(o.id)
              return (
                <MapObject
                  key={o.id}
                  obj={o}
                  zoom={view.zoom}
                  status={statusOf(o)}
                  ringColor={v?.color || null}
                  selected={selection.includes(o.id)}
                  dimmed={!!activeVisit && v?.id !== activeVisit.id && typeOf(o.type).bookable}
                  onPointerDown={(e) => clickObject(e, o)}
                />
              )
            })}
          </div>

          <div className="zoombar chrome">
            <button className="btn btn-quiet" onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 0.85, 0.15, 2.5) }))}>
              −
            </button>
            <span className="tiny muted">{Math.round(view.zoom * 100)}%</span>
            <button className="btn btn-quiet" onClick={() => setView((v) => ({ ...v, zoom: clamp(v.zoom * 1.18, 0.15, 2.5) }))}>
              +
            </button>
          </div>

          {!objects.length && (
            <div className="nomap">
              <div className="card box">
                <h3 style={{ marginBottom: 6 }}>Карта ещё не нарисована</h3>
                <p className="muted tiny" style={{ marginBottom: 18 }}>
                  Расставьте лежаки и столы в редакторе — после этого здесь появится план смены.
                </p>
                <button className="btn btn-primary" onClick={onEdit}>
                  Открыть редактор
                </button>
              </div>
            </div>
          )}

          {/* Свёрнутая панель: узкая плашка, чтобы вернуть её на место */}
          {!panelOpen && (
            <button className="reopen chrome" onClick={() => setPanelOpen(true)}>
              <span className="dotcount">{active.length}</span>
              Визиты дня
              <span className="chev">‹</span>
            </button>
          )}
        </div>

        {/* ── Панель справа / нижний лист на мобильном ── */}
        {panelOpen && (
        <aside className="side chrome">
          <div className="side-toolbar">
            <span className="tiny muted">
              {activeVisit ? 'Карточка визита' : `Визиты дня · ${active.length} активных`}
            </span>
            <button
              className="btn btn-quiet iconbtn"
              onClick={() => setPanelOpen(false)}
              aria-label="Свернуть панель"
              title="Свернуть панель"
            >
              ✕
            </button>
          </div>
          <div className="side-scroll">
          {activeVisit ? (
            <VisitPanel
              visit={activeVisit}
              objectById={objectById}
              date={date}
              onBack={() => setActiveId(null)}
              onStatus={setStatus}
              onEdit={() => setDialog({ mode: 'edit' })}
              onRemoveSeat={removeSeat}
            />
          ) : (
            <VisitList
              visits={visits}
              loading={loading}
              date={date}
              objectById={objectById}
              onOpen={(id) => {
                setActiveId(id)
                setSelection([])
              }}
            />
          )}
          </div>
        </aside>
        )}
      </div>

      {/* ── Нижняя панель действий ── */}
      {selection.length > 0 && (
        <div className="actionbar chrome">
          <div className="sel-info">
            <b>{selection.length}</b> {plural(selection.length, 'место', 'места', 'мест')}
            <span className="tiny muted names">{selectedNames.join(' · ')}</span>
          </div>
          <div className="acts">
            <button className="btn btn-quiet" onClick={() => setSelection([])}>
              Сбросить
            </button>
            {activeVisit ? (
              <button className="btn btn-primary" onClick={addSeats}>
                Добавить к брони
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => setDialog({ mode: 'book' })}>
                  Забронировать
                </button>
                <button className="btn btn-primary" onClick={() => setDialog({ mode: 'seat' })}>
                  Посадить сейчас
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="toast">
          {error}
          <button onClick={() => setError('')} aria-label="Закрыть">
            ✕
          </button>
        </div>
      )}

      {dialog && (
        <VisitDialog
          mode={dialog.mode}
          initial={dialog.mode === 'edit' ? activeVisit : null}
          seatNames={
            dialog.mode === 'edit'
              ? (activeVisit.visit_objects || [])
                  .filter((vo) => vo.is_active)
                  .map((vo) => objectName(objectById.get(vo.object_id) || {}))
              : selectedNames
          }
          onCancel={() => setDialog(null)}
          onSubmit={(form) =>
            dialog.mode === 'edit'
              ? saveVisit(form)
              : createVisit(form, dialog.mode === 'seat' ? 'arrived' : 'booked')
          }
        />
      )}

      <style jsx>{`
        .board {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          position: relative;
        }
        .daybar {
          flex: none;
          border-bottom-color: #0a1920 !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 8px 14px;
          background: var(--surface);
          border-bottom: 1px solid var(--line);
        }
        .dates {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dateinput {
          font: inherit;
          font-weight: 600;
          padding: 5px 8px;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--line-strong);
          border-radius: var(--r-sm);
        }
        .human {
          font-size: 13px;
          color: var(--ink-2);
          margin-left: 4px;
        }
        @media (max-width: 560px) {
          .daybar {
            gap: 10px;
            padding: 8px 10px;
          }
          .dates {
            gap: 2px;
          }
          .human {
            display: none;
          }
        }
        :global(.btn.sm) {
          padding: 5px 10px;
          font-size: 12px;
        }
        .main {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 1fr 288px;
          position: relative;
        }
        .main.collapsed {
          grid-template-columns: 1fr;
        }
        .viewport {
          position: relative;
          overflow: hidden;
          background: radial-gradient(120% 90% at 50% 0%, #f0f4f6 0%, #dde5e9 100%);
          touch-action: none;
          cursor: grab;
        }
        .reopen {
          position: absolute;
          right: 12px;
          top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink);
          border: 1px solid var(--line);
          border-radius: 999px;
          cursor: pointer;
          box-shadow: var(--shadow-2);
        }
        .dotcount {
          display: grid;
          place-items: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          font-size: 11px;
          background: var(--water);
          color: #06222b;
          border-radius: 999px;
        }
        .chev {
          font-size: 15px;
          color: var(--ink-3);
        }
        .world {
          position: absolute;
          top: 0;
          left: 0;
          width: 4000px;
          height: 3000px;
          transform-origin: 0 0;
          background: var(--paper);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(6, 18, 24, 0.16);
        }
        .zoombar {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          box-shadow: var(--shadow-1);
        }
        .nomap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .box {
          padding: 30px;
          max-width: 400px;
          text-align: center;
        }
        .side {
          border-left: 1px solid #0a1920;
          background: var(--surface);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .side-toolbar {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 6px 10px 14px;
          border-bottom: 1px solid var(--line);
        }
        .iconbtn {
          padding: 6px 10px;
          font-size: 13px;
          line-height: 1;
        }
        .side-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .actionbar {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 10px 12px 10px 18px;
          background: var(--surface);
          border: 1px solid var(--line-strong);
          border-radius: 999px;
          box-shadow: 0 18px 44px rgba(6, 18, 24, 0.45);
          max-width: calc(100% - 320px);
          z-index: 30;
        }
        .sel-info {
          display: flex;
          align-items: baseline;
          gap: 10px;
          font-size: 13px;
          min-width: 0;
        }
        .names {
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .acts {
          display: flex;
          gap: 6px;
        }
        .toast {
          position: absolute;
          left: 50%;
          top: 14px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px 10px 16px;
          background: #fdeaea;
          color: #971b1b;
          border: 1px solid #f3c9c9;
          border-radius: var(--r-md);
          box-shadow: var(--shadow-2);
          font-size: 13px;
          z-index: 30;
          max-width: 560px;
        }
        .toast button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 14px;
        }
        @media (max-width: 980px) {
          .main,
          .main.collapsed {
            grid-template-columns: 1fr;
          }
          .side {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            max-height: 46vh;
            border-left: none;
            border-top: 1px solid var(--line);
            border-radius: 16px 16px 0 0;
            box-shadow: 0 -12px 30px rgba(6, 18, 24, 0.35);
            z-index: 20;
          }
          .reopen {
            left: 50%;
            right: auto;
            top: auto;
            bottom: 14px;
            transform: translateX(-50%);
          }
          .actionbar {
            max-width: calc(100% - 24px);
          }
        }
      `}</style>
    </div>
  )
}

/* ── Шкала занятости ───────────────────────────────── */
function Gauge({ counts }) {
  const { free, booked, busy, off, total } = counts
  const pct = (n) => (total ? (n / total) * 100 : 0)
  return (
    <div className="gauge">
      <div className="track" role="img" aria-label={`Занято ${busy} из ${total}`}>
        <span className="seg busy" style={{ width: `${pct(busy)}%` }} />
        <span className="seg booked" style={{ width: `${pct(booked)}%` }} />
        <span className="seg free" style={{ width: `${pct(free)}%` }} />
        <span className="seg off" style={{ width: `${pct(off)}%` }} />
      </div>
      <div className="keys">
        <span>
          <i className="d busy" />
          Занято {busy}
        </span>
        <span>
          <i className="d booked" />
          Бронь {booked}
        </span>
        <span>
          <i className="d free" />
          Свободно {free}
        </span>
        {off > 0 && (
          <span>
            <i className="d off" />
            Недоступно {off}
          </span>
        )}
      </div>
      <style jsx>{`
        .gauge {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .track {
          display: flex;
          width: 200px;
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--line);
        }
        .seg {
          height: 100%;
          transition: width 0.3s ease;
        }
        .keys {
          display: flex;
          gap: 14px;
          font-size: 12px;
          color: var(--ink-2);
          white-space: nowrap;
        }
        .d {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          margin-right: 5px;
        }
        .busy {
          background: var(--busy);
        }
        .booked {
          background: var(--booked);
        }
        .free {
          background: var(--free);
        }
        .off {
          background: var(--off);
        }
        @media (max-width: 1100px) {
          .keys {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

/* ── Список визитов дня ────────────────────────────── */
function VisitList({ visits, loading, date, objectById, onOpen }) {
  const live = visits.filter((v) => v.status === 'booked' || v.status === 'arrived')
  const done = visits.filter((v) => !['booked', 'arrived'].includes(v.status))

  return (
    <div className="wrap">
      <div className="head">
        <span className="eyebrow">Визиты дня</span>
        <span className="tiny muted">{live.length} активных</span>
      </div>

      {loading && <p className="tiny muted pad">Загрузка…</p>}

      {!loading && !live.length && !done.length && (
        <p className="tiny muted pad">
          На эту дату броней нет. Выберите свободные места на карте, чтобы создать первую.
        </p>
      )}

      {live.map((v) => (
        <Row key={v.id} v={v} date={date} objectById={objectById} onOpen={onOpen} />
      ))}

      {done.length > 0 && (
        <>
          <div className="head" style={{ marginTop: 10 }}>
            <span className="eyebrow">Закрытые</span>
          </div>
          {done.map((v) => (
            <Row key={v.id} v={v} date={date} objectById={objectById} onOpen={onOpen} faded />
          ))}
        </>
      )}

      <style jsx>{`
        .wrap {
          padding-bottom: 24px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 8px;
        }
        .pad {
          padding: 4px 14px 14px;
        }
      `}</style>
    </div>
  )
}

function Row({ v, date, objectById, onOpen, faded }) {
  const names = (v.visit_objects || [])
    .filter((vo) => vo.is_active)
    .map((vo) => objectName(objectById.get(vo.object_id) || {}))
  const late = isOverdue(v, date)

  return (
    <button className={`row ${faded ? 'faded' : ''} ${late ? 'late' : ''}`} onClick={() => onOpen(v.id)}>
      <span className="bar" style={{ background: v.color }} />
      <span className="body">
        <span className="line1">
          <b>{v.guest_name || 'Без имени'}</b>
          <span className={`chip ${v.status}`}>{STATUS_LABEL[v.status]}</span>
        </span>
        <span className="line2 tiny muted">
          {v.arrival_time ? v.arrival_time.slice(0, 5) + ' · ' : ''}
          {names.length ? names.join(', ') : 'без мест'}
        </span>
        {late && <span className="line3 tiny">Держим дольше срока</span>}
      </span>

      <style jsx>{`
        .row {
          display: flex;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          text-align: left;
          font: inherit;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--line);
          cursor: pointer;
        }
        .row:hover {
          background: var(--surface-2);
        }
        .faded {
          opacity: 0.55;
        }
        .late {
          background: rgba(234, 179, 8, 0.14);
        }
        .bar {
          width: 3px;
          border-radius: 2px;
          flex: none;
        }
        .body {
          min-width: 0;
          flex: 1;
        }
        .line1 {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
        }
        .line2,
        .line3 {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .line3 {
          color: #f5cf4a;
          font-weight: 600;
        }
        .chip {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .chip.booked {
          background: rgba(234, 179, 8, 0.2);
          color: #f5cf4a;
        }
        .chip.arrived {
          background: rgba(225, 29, 72, 0.22);
          color: #ff8098;
        }
        .chip.completed {
          background: rgba(16, 185, 129, 0.18);
          color: #4fd8a6;
        }
        .chip.cancelled,
        .chip.no_show {
          background: rgba(148, 163, 184, 0.18);
          color: #a3b6c0;
        }
      `}</style>
    </button>
  )
}

/* ── Карточка визита ───────────────────────────────── */
function VisitPanel({ visit, objectById, date, onBack, onStatus, onEdit, onRemoveSeat }) {
  const rows = (visit.visit_objects || []).filter((vo) => vo.is_active)
  const late = isOverdue(visit, date)

  return (
    <div className="panel">
      <button className="btn btn-quiet back" onClick={onBack}>
        ← Все визиты
      </button>

      <div className="head">
        <span className="dot" style={{ background: visit.color }} />
        <div>
          <h3>{visit.guest_name || 'Без имени'}</h3>
          <span className={`chip ${visit.status}`}>{STATUS_LABEL[visit.status]}</span>
        </div>
      </div>

      {late && (
        <div className="notice notice-error" style={{ margin: '0 14px 12px' }}>
          Срок удержания вышел. Освободите места или отметьте, что гости не пришли.
        </div>
      )}

      <dl className="meta">
        {visit.phone && (
          <>
            <dt>Телефон</dt>
            <dd>
              <a href={`tel:${visit.phone}`}>{visit.phone}</a>
            </dd>
          </>
        )}
        {visit.arrival_time && (
          <>
            <dt>Придут</dt>
            <dd>
              {visit.arrival_time.slice(0, 5)} · держим {visit.hold_minutes} мин
            </dd>
          </>
        )}
        {visit.comment && (
          <>
            <dt>Комментарий</dt>
            <dd>{visit.comment}</dd>
          </>
        )}
      </dl>

      <div className="seats">
        <span className="eyebrow">Места · {rows.length}</span>
        <ul>
          {rows.map((vo) => (
            <li key={vo.id}>
              {objectName(objectById.get(vo.object_id) || {})}
              <button onClick={() => onRemoveSeat(vo.id)} title="Убрать место">
                ✕
              </button>
            </li>
          ))}
          {!rows.length && <li className="muted tiny">Мест нет</li>}
        </ul>
        <p className="tiny muted hint">
          Чтобы пересадить гостей, выберите свободные места на карте и нажмите «Добавить к брони».
        </p>
      </div>

      <div className="ops">
        {visit.status === 'booked' && (
          <>
            <button className="btn btn-primary btn-block" onClick={() => onStatus(visit, 'arrived')}>
              Гости пришли
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => onStatus(visit, 'no_show')}>
              Не пришли
            </button>
          </>
        )}
        {visit.status === 'arrived' && (
          <button className="btn btn-primary btn-block" onClick={() => onStatus(visit, 'completed')}>
            Освободить места
          </button>
        )}
        <button className="btn btn-ghost btn-block" onClick={onEdit}>
          Изменить данные
        </button>
        {['booked', 'arrived'].includes(visit.status) && (
          <button className="btn btn-quiet btn-block danger" onClick={() => onStatus(visit, 'cancelled')}>
            Отменить бронь
          </button>
        )}
      </div>

      <style jsx>{`
        .panel {
          padding-bottom: 30px;
        }
        .back {
          margin: 10px 8px 2px;
        }
        .head {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 6px 14px 14px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          margin-top: 6px;
          flex: none;
        }
        .chip {
          display: inline-block;
          margin-top: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .chip.booked {
          background: rgba(234, 179, 8, 0.2);
          color: #f5cf4a;
        }
        .chip.arrived {
          background: rgba(225, 29, 72, 0.22);
          color: #ff8098;
        }
        .chip.completed {
          background: rgba(16, 185, 129, 0.18);
          color: #4fd8a6;
        }
        .chip.cancelled,
        .chip.no_show {
          background: rgba(148, 163, 184, 0.18);
          color: #a3b6c0;
        }
        .meta {
          margin: 0;
          padding: 0 14px 14px;
          font-size: 13px;
          border-bottom: 1px solid var(--line);
        }
        .meta dt {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--ink-3);
          margin-top: 10px;
        }
        .meta dd {
          margin: 3px 0 0;
        }
        .meta a {
          color: var(--water);
        }
        .seats {
          padding: 14px;
          border-bottom: 1px solid var(--line);
        }
        .seats ul {
          list-style: none;
          margin: 8px 0 0;
          padding: 0;
        }
        .seats li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          border-bottom: 1px solid var(--line);
        }
        .seats li:last-child {
          border: none;
        }
        .seats li button {
          background: none;
          border: none;
          color: var(--ink-3);
          cursor: pointer;
          padding: 2px 4px;
        }
        .seats li button:hover {
          color: var(--busy);
        }
        .hint {
          margin-top: 10px;
        }
        .ops {
          display: grid;
          gap: 7px;
          padding: 14px;
        }
        :global(.btn-quiet.danger) {
          color: var(--busy);
        }
      `}</style>
    </div>
  )
}

/* ── Утилиты ───────────────────────────────────────── */
const STATUS_LABEL = {
  booked: 'Забронировано',
  arrived: 'Гости на месте',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не пришли',
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function shift(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function humanDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
}

function isOverdue(v, dateStr) {
  if (v.status !== 'booked' || !v.arrival_time) return false
  const [h, m] = v.arrival_time.split(':').map(Number)
  const d = new Date(`${dateStr}T00:00:00`)
  d.setHours(h, m + (v.hold_minutes || 30), 0, 0)
  return Date.now() > d.getTime()
}

function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
