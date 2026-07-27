'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('signin')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('Проверьте почту для подтверждения регистрации')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h1>PoolDesk</h1>
      <p>{mode === 'signup' ? 'Регистрация' : 'Вход'}</p>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10 }} />
        <input type="password" placeholder="Пароль" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          style={{ display: 'block', width: '100%', padding: 10, marginBottom: 10 }} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Загрузка...' : mode === 'signup' ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
        style={{ marginTop: 10, background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
        {mode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
      </button>
    </main>
  )
}
