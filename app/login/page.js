'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabaseClient'
import Button from '../../components/ui/Button'

const MESSAGES = {
  'Invalid login credentials': 'Неверная почта или пароль',
  'User already registered': 'Аккаунт с этой почтой уже существует',
  'Password should be at least 6 characters': 'Пароль должен быть не короче 6 символов',
  'Unable to validate email address: invalid format': 'Проверьте формат почты',
}

export default function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const fn =
      mode === 'signup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password })

    const { error } = await fn

    if (error) {
      setError(MESSAGES[error.message] || error.message)
      setBusy(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <div className="mark">PoolDesk</div>
          <p className="pitch">
            Вся смена на одной карте. Кто забронировал, кто уже пришёл,
            какие лежаки свободны — видно с одного взгляда.
          </p>
        </div>
        <div className="ripple" aria-hidden="true" />
      </aside>

      <main className="auth-form">
        <div className="auth-form-inner">
          <span className="eyebrow">{mode === 'signup' ? 'Новый аккаунт' : 'Вход в систему'}</span>
          <h1 style={{ margin: '8px 0 24px' }}>
            {mode === 'signup' ? 'Создайте аккаунт' : 'С возвращением'}
          </h1>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Рабочая почта</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="admin@pool.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="notice notice-error" role="alert">
                {error}
              </div>
            )}

            <Button variant="primary" block type="submit" loading={busy} loadingText="Подождите…">
              {mode === 'signup' ? 'Создать аккаунт' : 'Войти'}
            </Button>
          </form>

          <p className="switch">
            {mode === 'signup' ? 'Уже работаете в PoolDesk?' : 'Впервые здесь?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup')
                setError('')
              }}
            >
              {mode === 'signup' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </p>
        </div>
      </main>

      <style jsx>{`
        .auth {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          min-height: 100vh;
        }
        .auth-brand {
          position: relative;
          overflow: hidden;
          background: linear-gradient(158deg, #0d87a6 0%, #0a4a5e 55%, #08202a 100%);
          color: #fff;
          display: flex;
          align-items: flex-end;
          padding: 48px;
        }
        .auth-brand-inner {
          position: relative;
          z-index: 1;
          max-width: 380px;
        }
        .mark {
          font-family: var(--font-display), sans-serif;
          font-weight: 700;
          font-size: 40px;
          letter-spacing: -0.03em;
          margin-bottom: 14px;
        }
        .pitch {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.82);
        }
        .ripple {
          position: absolute;
          inset: -40% -10% auto -10%;
          height: 120%;
          background: radial-gradient(
              46% 34% at 22% 28%,
              rgba(255, 255, 255, 0.16) 0%,
              transparent 62%
            ),
            radial-gradient(38% 30% at 74% 58%, rgba(255, 255, 255, 0.11) 0%, transparent 66%);
          animation: drift 22s ease-in-out infinite alternate;
        }
        @keyframes drift {
          from {
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            transform: translate3d(-3%, 4%, 0) scale(1.09);
          }
        }
        .auth-form {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: var(--deck);
        }
        .auth-form-inner {
          width: 100%;
          max-width: 340px;
        }
        .switch {
          margin-top: 20px;
          font-size: 13px;
          color: var(--ink-2);
        }
        .switch button {
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          font-weight: 600;
          color: var(--water);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        @media (max-width: 768px) {
          .auth {
            grid-template-columns: 1fr;
          }
          .auth-brand {
            padding: 30px 24px 26px;
            align-items: flex-start;
          }
          .mark {
            font-size: 26px;
            margin-bottom: 8px;
          }
          .pitch {
            font-size: 14px;
          }
          .auth-form {
            padding: 32px 24px 48px;
          }
        }
      `}</style>
    </div>
  )
}
