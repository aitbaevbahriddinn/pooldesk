'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '../../../lib/supabaseClient'
import Tabs from '../../../components/ui/Tabs'
import Icon from '../../../components/ui/Icon'
import LoadingScreen from '../../../components/ui/LoadingScreen'

// Редактор и рабочий режим показываются по одному за раз (переключатель
// «Карта/Редактор» ниже) — грузим каждый только при первом обращении,
// а не оба сразу при заходе на страницу.
const MapEditor = dynamic(() => import('../../../components/MapEditor'), {
  ssr: false,
  loading: () => <LoadingScreen label="Загрузка редактора…" />,
})
const MapBoard = dynamic(() => import('../../../components/MapBoard'), {
  ssr: false,
  loading: () => <LoadingScreen label="Загрузка карты…" />,
})


const COLUMNS =
  'id, pool_id, type, number, label, shape, seats, x, y, width, height, rotation, is_bookable, is_available, locked, note'

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
    return <LoadingScreen label="Загрузка карты…" />
  }

  return (
    <div className="shell">
      <header className="bar chrome">
        <div className="left">
          <Link href="/" className="back">
            <Icon name="arrowLeft" size={16} />
            <span className="back-label">Бассейны</span>
          </Link>
          <span className="divider" />
          <h2>{pool?.name}</h2>
        </div>

        <Tabs
          items={[
            { value: 'board', label: 'Карта' },
            { value: 'editor', label: 'Редактор' },
          ]}
          value={mode}
          onChange={setMode}
        />

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
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--ink-2);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: color var(--dur-fast);
        }
        .back:hover {
          color: var(--water);
        }
        .divider {
          width: 1px;
          height: 20px;
          background: var(--line);
          flex: none;
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
        h2 {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .bar {
            gap: 10px;
            padding: 0 10px;
          }
          .back-label {
            display: none;
          }
          .divider {
            display: none;
          }
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
    shape: o.shape ?? null,
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
    shape: o.shape,
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
