'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Общая обёртка модальных окон: раньше единственный диалог в приложении
// (VisitDialog) собирал backdrop/sheet вручную, без focus-trap и без
// возврата фокуса на триггер. Логика подтверждения/отправки формы остаётся
// снаружи — этот компонент отвечает только за открытие/закрытие/фокус.
export default function Modal({
  open = true,
  onClose,
  labelledBy,
  fullScreenOnMobile = true,
  maxWidth = 470,
  position = 'center', // 'center' | 'right'
  children,
}) {
  const sheetRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement

    const first = sheetRef.current?.querySelector(FOCUSABLE)
    first?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const nodes = sheetRef.current.querySelectorAll(FOCUSABLE)
      if (!nodes.length) return
      const list = Array.from(nodes)
      const idx = list.indexOf(document.activeElement)
      if (e.shiftKey && (idx <= 0 || document.activeElement === sheetRef.current)) {
        e.preventDefault()
        list[list.length - 1].focus()
      } else if (!e.shiftKey && idx === list.length - 1) {
        e.preventDefault()
        list[0].focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`modal-backdrop ${position === 'right' ? 'position-right' : ''} ${fullScreenOnMobile ? 'full-screen-sm' : ''}`}
      onPointerDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={sheetRef}
        className={`modal-sheet card ${position === 'right' ? 'position-right' : ''} ${fullScreenOnMobile ? 'full-screen-sm' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={position === 'right' ? undefined : { maxWidth }}
      >
        {children}
      </div>
    </div>
  )
}
