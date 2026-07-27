'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabaseClient'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
      }
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <main style={{ padding: 40 }}>Загрузка...</main>
  if (!user) return null

  return (
    <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>PoolDesk</h1>
      <p>Добро пожаловать, {user.email}!</p>
      <button onClick={handleLogout}>Выйти</button>
    </main>
  )
}
