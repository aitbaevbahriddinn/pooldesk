'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabaseClient'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [org, setOrg] = useState(null)
  const [pools, setPools] = useState([])
  const [members, setMembers] = useState([])
  const [newPool, setNewPool] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, full_name, role, organization_id')
      .maybeSingle()

    if (!prof?.organization_id) {
      router.replace('/onboarding')
      return
    }

    const [{ data: orgRow }, { data: poolRows }, { data: memberRows }] = await Promise.all([
      supabase.from('organizations').select('id, name, invite_code').maybeSingle(),
      supabase.from('pools').select('id, name, created_at').order('created_at'),
      supabase.rpc('org_members'),
    ])

    setProfile(prof)
    setOrg(orgRow)
    setPools(poolRows || [])
    setMembers(memberRows || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addPool(e) {
    e.preventDefault()
    const name = newPool.trim()
    if (!name) return
    setAdding(true)
    setError('')

    const { data, error } = await supabase
      .from('pools')
      .insert({ name, organization_id: profile.organization_id })
      .select('id')
      .single()

    setAdding(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push(`/pool/${data.id}`)
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(org.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Не удалось скопировать. Выделите код вручную.')
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="center">
        <p className="muted">Загрузка…</p>
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
    <div className="page">
      <header className="top chrome">
        <div className="top-inner">
          <div>
            <span className="eyebrow">Организация</span>
            <h1>{org?.name}</h1>
          </div>
          <div className="who">
            <span className="tiny muted">
              {profile.full_name} · {profile.role === 'owner' ? 'владелец' : 'администратор'}
            </span>
            <button className="btn btn-quiet" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="content">
      <section className="block">
        <div className="spread" style={{ marginBottom: 14 }}>
          <h2>Бассейны</h2>
          <span className="tiny muted">{pools.length} всего</span>
        </div>

        {pools.length === 0 ? (
          <div className="card empty">
            <h3 style={{ marginBottom: 6 }}>Здесь пока пусто</h3>
            <p className="muted tiny" style={{ marginBottom: 18 }}>
              Добавьте первый бассейн — затем нарисуете его карту и начнёте принимать брони.
            </p>
          </div>
        ) : (
          <div className="grid">
            {pools.map((p) => (
              <button key={p.id} className="card pool" onClick={() => router.push(`/pool/${p.id}`)}>
                <span className="pool-name">{p.name}</span>
                <span className="tiny muted">Открыть карту →</span>
              </button>
            ))}
          </div>
        )}

        <form className="add card" onSubmit={addPool}>
          <input
            className="input"
            placeholder="Название бассейна, например «VIP Pool»"
            value={newPool}
            onChange={(e) => setNewPool(e.target.value)}
          />
          <button className="btn btn-primary" disabled={adding || !newPool.trim()}>
            {adding ? 'Добавляем…' : 'Добавить бассейн'}
          </button>
        </form>

        {error && (
          <div className="notice notice-error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
      </section>

      <section className="block">
        <h2 style={{ marginBottom: 14 }}>Сотрудники</h2>
        <div className="card team">
          <ul className="members">
            {members.map((m) => (
              <li key={m.id}>
                <span>{m.full_name || 'Без имени'}</span>
                <span className="tiny muted">
                  {m.role === 'owner' ? 'владелец' : 'администратор'}
                </span>
              </li>
            ))}
          </ul>

          <div className="invite">
            <span className="eyebrow">Код приглашения</span>
            <div className="invite-row">
              <span className="code">{org?.invite_code}</span>
              <button className="btn btn-ghost" onClick={copyCode} type="button">
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Передайте код администратору — он введёт его при регистрации и получит доступ
              к вашим бассейнам.
            </p>
          </div>
        </div>
      </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
        }
        .top {
          padding: 30px 24px 26px;
        }
        .top-inner {
          max-width: 940px;
          margin: 0 auto;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }
        .content {
          max-width: 940px;
          margin: 0 auto;
          padding: 34px 24px 80px;
        }
        .who {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .block {
          margin-bottom: 40px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }
        .pool {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 18px;
          text-align: left;
          font: inherit;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .pool:hover {
          border-color: var(--water);
          box-shadow: var(--shadow-2);
          transform: translateY(-1px);
        }
        .pool-name {
          font-family: var(--font-display), sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: var(--ink);
        }
        .empty {
          padding: 30px;
          text-align: center;
          margin-bottom: 14px;
        }
        .add {
          display: flex;
          gap: 10px;
          padding: 12px;
        }
        .team {
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 1px 1fr;
          gap: 22px;
          align-items: start;
        }
        .team::before {
          content: '';
          grid-column: 2;
          align-self: stretch;
          background: var(--line);
        }
        .members {
          list-style: none;
          margin: 0;
          padding: 0;
          grid-column: 1;
        }
        .members li {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--line);
        }
        .members li:last-child {
          border-bottom: none;
        }
        .invite {
          grid-column: 3;
        }
        .invite-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
        }
        @media (max-width: 720px) {
          .add {
            flex-direction: column;
          }
          .team {
            grid-template-columns: 1fr;
          }
          .team::before {
            display: none;
          }
          .members,
          .invite {
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  )
}
