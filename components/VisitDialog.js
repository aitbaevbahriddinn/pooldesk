'use client'

import { useEffect, useState } from 'react'

export default function VisitDialog({ mode, seatNames, initial, onCancel, onSubmit }) {
  const [guest, setGuest] = useState(initial?.guest_name || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [arrival, setArrival] = useState((initial?.arrival_time || '').slice(0, 5))
  const [hold, setHold] = useState(initial?.hold_minutes ?? 30)
  const [comment, setComment] = useState(initial?.comment || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const seating = mode === 'seat'

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCancel])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit({
        guest_name: guest,
        phone,
        arrival_time: arrival || null,
        hold_minutes: Number(hold) || 30,
        comment,
      })
    } catch (err) {
      setError(err.message || 'Не удалось сохранить')
      setBusy(false)
    }
  }

  return (
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet card" role="dialog" aria-modal="true">
        <span className="eyebrow">
          {mode === 'edit' ? 'Изменить бронь' : seating ? 'Посадить гостей' : 'Новая бронь'}
        </span>
        <h2 style={{ margin: '6px 0 4px' }}>
          {seatNames.length} {plural(seatNames.length, 'место', 'места', 'мест')}
        </h2>
        <p className="tiny muted seats">{seatNames.join(' · ')}</p>

        <form onSubmit={submit}>
          <div className="two">
            <div className="field">
              <label htmlFor="g">Имя гостя</label>
              <input
                id="g"
                className="input"
                autoFocus
                placeholder="Азиз"
                value={guest}
                onChange={(e) => setGuest(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="p">Телефон</label>
              <input
                id="p"
                className="input"
                inputMode="tel"
                placeholder="+998 90 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {!seating && (
            <div className="two">
              <div className="field">
                <label htmlFor="t">Во сколько придут</label>
                <input
                  id="t"
                  className="input"
                  type="time"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="h">Держим, мин</label>
                <input
                  id="h"
                  className="input"
                  type="number"
                  min={5}
                  step={5}
                  value={hold}
                  onChange={(e) => setHold(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="c">Комментарий</label>
            <input
              id="c"
              className="input"
              placeholder="Например: день рождения, нужен детский стул"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <div className="notice notice-error">{error}</div>}

          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Отмена
            </button>
            <button className="btn btn-primary" disabled={busy}>
              {busy
                ? 'Сохраняем…'
                : mode === 'edit'
                  ? 'Сохранить'
                  : seating
                    ? 'Посадить'
                    : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(13, 27, 33, 0.42);
          backdrop-filter: blur(2px);
        }
        .sheet {
          width: 100%;
          max-width: 470px;
          padding: 26px;
          box-shadow: var(--shadow-3);
        }
        .seats {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--line);
        }
        .two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
        @media (max-width: 520px) {
          .two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
