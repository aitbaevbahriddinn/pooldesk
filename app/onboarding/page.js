'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabaseClient'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import LoadingScreen from '../../components/ui/LoadingScreen'

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
    return <LoadingScreen />
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

        <Tabs
          block
          className="tabs"
          items={[
            { value: 'create', label: 'Я владелец' },
            { value: 'join', label: 'У меня есть код' },
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v)
            setError('')
          }}
        />

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

          <Button variant="primary" block loading={busy} loadingText="Подождите…">
            {tab === 'create' ? 'Создать организацию' : 'Присоединиться'}
          </Button>
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
        :global(.tabs) {
          margin-bottom: 20px;
          width: 100%;
        }
      `}</style>
    </div>
  )
}
