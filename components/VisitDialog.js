'use client'

import { useState } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Icon from './ui/Icon'
import { plural } from '../lib/format'

export default function VisitDialog({ mode, seatNames, dateLabel, initial, onCancel, onSubmit }) {
  const [guest, setGuest] = useState(initial?.guest_name || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [arrival, setArrival] = useState((initial?.arrival_time || '').slice(0, 5))
  const [hold, setHold] = useState(initial?.hold_minutes ?? 30)
  const [comment, setComment] = useState(initial?.comment || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const seating = mode === 'seat'

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
    <Modal onClose={onCancel} labelledBy="visit-dialog-title" position="right">
      <div className="dialog-body">
        <span className="eyebrow">
          {mode === 'edit' ? 'Изменить бронь' : seating ? 'Посадить гостей' : 'Новая бронь'}
        </span>
        <h2 id="visit-dialog-title" style={{ margin: '6px 0 4px' }}>
          {seatNames.length} {plural(seatNames.length, 'место', 'места', 'мест')}
        </h2>
        {dateLabel && (
          <p className="tiny muted date-row">
            <Icon name="calendar" size={14} /> {dateLabel}
          </p>
        )}
        <ul className="seats">
          {seatNames.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>

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
            <Button type="button" variant="ghost" onClick={onCancel}>
              Отмена
            </Button>
            <Button
              variant="primary"
              loading={busy}
              loadingText="Сохраняем…"
            >
              {mode === 'edit' ? 'Сохранить' : seating ? 'Посадить' : 'Забронировать'}
            </Button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .dialog-body {
          padding: 26px;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }
        .date-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .seats {
          list-style: none;
          margin: 14px 0 20px;
          padding: 0;
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          overflow: hidden;
        }
        .seats li {
          padding: 8px 12px;
          font-size: 13px;
          background: var(--surface-2);
        }
        .seats li:not(:last-child) {
          border-bottom: 1px solid var(--line);
        }
        form {
          display: flex;
          flex-direction: column;
          flex: 1;
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
          margin-top: auto;
          padding-top: 16px;
        }
        @media (max-width: 640px) {
          .two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Modal>
  )
}
