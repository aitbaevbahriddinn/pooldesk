'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MapEditor from '../../../components/MapEditor'
import MapBoard from '../../../components/MapBoard'
import { createClient } from '../../../lib/supabaseClient'


const COLUMNS =
  'id, pool_id, type, number, label, seats, x, y, width, height, rotation, is_bookable, is_available, locked, note'

export default function PoolPage({ params }) {
  const poolId = params.id
  const [pool, setPool] = useState(null)
  const [objects, setObjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('editor')
  const [saveState, setSaveState] = useState('saved')
  const [fatal, setFatal] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const objectsRef = useRef([])
  const savedRef = useRef(new Map())
  const timer = useRef(null)

  useEffect(() => {
    objectsRef.current = objects
  }, [objects])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: p, error: pe }, { data: objs, error: oe }] = await Promise.all([
        supabase.from('pools').select('id, name').eq('id', poolId).maybeSingle(),
        supabase.from('pool_objects').select(COLUMNS).eq('pool_id', poolId).order('created_at'),
      ])
      if (cancelled) return
      if (pe || oe) {
        setFatal((pe || oe).message)
        setLoading(false)
        return
      }
      if (!p) {
        router.replace('/')
        return
      }
      const list = (objs || []).map(normalize)
      setPool(p)
      setObjects(list)
      savedRef.current = new Map(list.map((o) => [o.id, JSON.stringify(o)]))
      setMode(list.length ? 'board' : 'editor')
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [poolId])

  const doSave = useCallback(async () => {
    const current = objectsRef.current
    const currentIds = new Set(current.map((o) => o.id))

    const toUpsert = current
      .map(serialize)
      .filter((o) => savedRef.current.get(o.id) !== JSON.stringify(normalize(o)))
    const toDelete = [...savedRef.current.keys()].filter((id) => !currentIds.has(id))

    if (!toUpsert.length && !toDelete.length) {
      setSaveState('saved')
      return
    }

    setSaveState('saving')
    try {
      if (toDelete.length) {
        const { error } = await supabase.from('pool_objects').delete().in('id', toDelete)
        if (error) throw error
      }
      if (toUpsert.length) {
        const { error } = await supabase.from('pool_objects').upsert(toUpsert, { onConflict: 'id' })
        if (error) throw error
      }
      savedRef.current = new Map(current.map((o) => [o.id, JSON.stringify(o)]))
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setFatal(
        e.message?.includes('duplicate')
          ? 'Такой номер объекта уже существует. Измените номер и попробуйте снова.'
          : e.message
      )
    }
  }, [])

  const requestSave = useCallback(() => {
    setSaveState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(doSave, 700)
  }, [doSave])

  useEffect(() => () => clearTimeout(timer.current), [])

  if (loading) {
    return (
      <div className="center">
        <p className="muted">Загрузка карты…</p>
        <style jsx>{`
          .center {
            min-height: 100vh;
            display: grid;
            place-items: center;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="bar chrome">
        <div className="left">
          <Link href="/" className="back">
            ← Бассейны
          </Link>
          <span className="divider" />
          <h2>{pool?.name}</h2>
        </div>

        <div className="tabs">
          <button className={mode === 'board' ? 'on' : ''} onClick={() => setMode('board')}>
            Карта
          </button>
          <button className={mode === 'editor' ? 'on' : ''} onClick={() => setMode('editor')}>
            Редактор
          </button>
        </div>

        <div className="right">
          {fatal && <span className="fatal tiny">{fatal}</span>}
        </div>
      </header>

      <main className="body">
        {mode === 'editor' ? (
          <MapEditor
            poolId={poolId}
            objects={objects}
            setObjects={setObjects}
            onSave={requestSave}
            saveState={saveState}
          />
        ) : (
          <MapBoard poolId={poolId} objects={objects} onEdit={() => setMode('editor')} />
        )}
      </main>

      <style jsx>{`
        .shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }
        .bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 14px;
          height: 54px;
          flex: none;
          border-bottom: 1px solid #0a1920;
        }
        .left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .back {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }
        .back:hover {
          color: var(--water);
        }
        .divider {
          width: 1px;
          height: 20px;
          background: var(--line);
        }
        .tabs {
          display: flex;
          gap: 3px;
          padding: 3px;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
        }
        .tabs button {
          padding: 6px 18px;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          background: transparent;
          border: none;
          border-radius: var(--r-sm);
          cursor: pointer;
        }
        .tabs button.on {
          background: var(--surface);
          color: var(--ink);
          box-shadow: var(--shadow-1);
        }
        .right {
          flex: 1;
          display: flex;
          justify-content: flex-end;
        }
        .fatal {
          color: var(--busy);
          font-weight: 600;
        }
        .body {
          flex: 1;
          min-height: 0;
        }
      `}</style>
    </div>
  )
}

function normalize(o) {
  return {
    id: o.id,
    pool_id: o.pool_id,
    type: o.type,
    number: o.number,
    label: o.label ?? null,
    seats: o.seats ?? null,
    x: Number(o.x),
    y: Number(o.y),
    width: Number(o.width),
    height: Number(o.height),
    rotation: Number(o.rotation) || 0,
    is_bookable: !!o.is_bookable,
    is_available: o.is_available !== false,
    locked: !!o.locked,
    note: o.note ?? null,
  }
}

function serialize(o) {
  return {
    id: o.id,
    pool_id: o.pool_id,
    type: o.type,
    number: o.number,
    label: o.label,
    seats: o.seats,
    x: Math.round(o.x),
    y: Math.round(o.y),
    width: Math.round(o.width),
    height: Math.round(o.height),
    rotation: Math.round(o.rotation),
    is_bookable: o.is_bookable,
    is_available: o.is_available,
    locked: o.locked,
    note: o.note,
  }
}
