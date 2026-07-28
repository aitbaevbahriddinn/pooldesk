'use client'

import { useEffect, useRef } from 'react'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// Зум и панорамирование картой двумя пальцами на сенсорных экранах.
// Слушает события на фазе capture — поэтому работает, даже если
// объект под первым пальцем останавливает всплытие события
// (stopPropagation) в своих собственных обработчиках.
export default function usePinchZoom(viewportRef, view, setView, gestureRef, min = 0.15, max = 3) {
  const viewRef = useRef(view)
  const suppressRef = useRef(false)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const pts = new Map()
    let pinch = null

    function down(e) {
      if (e.pointerType !== 'touch') return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) {
        suppressRef.current = true
        if (gestureRef) gestureRef.current = null
        const [a, b] = [...pts.values()]
        const r = el.getBoundingClientRect()
        pinch = {
          d0: Math.hypot(a.x - b.x, a.y - b.y),
          mid0: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
          view0: viewRef.current,
        }
      }
    }

    function move(e) {
      if (!pts.has(e.pointerId)) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch && pts.size === 2) {
        e.preventDefault()
        const [a, b] = [...pts.values()]
        const r = el.getBoundingClientRect()
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }
        const scale = d / pinch.d0
        const nz = clamp(pinch.view0.zoom * scale, min, max)
        const wx = (pinch.mid0.x - pinch.view0.x) / pinch.view0.zoom
        const wy = (pinch.mid0.y - pinch.view0.y) / pinch.view0.zoom
        setView({ zoom: nz, x: mid.x - wx * nz, y: mid.y - wy * nz })
      }
    }

    function up(e) {
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
      if (pts.size === 0) suppressRef.current = false
    }

    el.addEventListener('pointerdown', down, { capture: true, passive: true })
    el.addEventListener('pointermove', move, { capture: true, passive: false })
    el.addEventListener('pointerup', up, { capture: true })
    el.addEventListener('pointercancel', up, { capture: true })
    return () => {
      el.removeEventListener('pointerdown', down, { capture: true })
      el.removeEventListener('pointermove', move, { capture: true })
      el.removeEventListener('pointerup', up, { capture: true })
      el.removeEventListener('pointercancel', up, { capture: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportRef, setView, gestureRef, min, max])

  return suppressRef
}
