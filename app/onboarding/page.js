'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabaseClient'

export default function OnboardingPage() {
  const [tab, setTab] = useState('create')
  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('organization_id')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.organization_id) router.replace('/')
        else setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const { error } =
      tab === 'create'
        ? await supabase.rpc('create_organization', {
            org_name: orgName.trim(),
            owner_name: fullName.trim(),
          })
        : await supabase.rpc('join_organization', {
            code: code.trim(),
            member_name: fullName.trim(),
          })

    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  if (checking) {
    return (
      <div className="wrap">
        <p className="muted">Загрузка…</p>
        <style jsx>{`
          .wrap {
            min-height: 100vh;
            display: grid;
            place-items: center;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="panel card">
        <span className="eyebrow">Шаг 1 из 2</span>
        <h1 style={{ margin: '8px 0 6px' }}>Подключите бассейн</h1>
        <p className="muted" style={{ marginBottom: 22, fontSize: 13 }}>
          Создайте организацию, если вы владелец. Если вас пригласил
          управляющий — введите код, который он передал.
        </p>

        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'create'}
            className={tab === 'create' ? 'on' : ''}
            onClick={() => {
              setTab('create')
              setError('')
            }}
          >
            Я владелец
          </button>
          <button
            role="tab"
            aria-selected={tab === 'join'}
            className={tab === 'join' ? 'on' : ''}
            onClick={() => {
              setTab('join')
              setError('')
            }}
          >
            У меня есть код
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="fullName">Ваше имя</label>
            <input
              id="fullName"
              className="input"
              placeholder="Бахриддин"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {tab === 'create' ? (
            <div className="field">
              <label htmlFor="orgName">Название организации</label>
              <input
                id="orgName"
                className="input"
                placeholder="Royal Pool Group"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="code">Код приглашения</label>
              <input
                id="code"
                className="input code"
                placeholder="a1b2c3d4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="notice notice-error">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Подождите…' : tab === 'create' ? 'Создать организацию' : 'Присоединиться'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .panel {
          width: 100%;
          max-width: 420px;
          padding: 30px;
        }
        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          margin-bottom: 20px;
        }
        .tabs button {
          padding: 8px;
          font: inherit;
          font-weight: 600;
          font-size: 13px;
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
      `}</style>
    </div>
  )
}
