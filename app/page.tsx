'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  async function handleAuth(type: 'login' | 'signup') {
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    
    if (error) {
      alert("Ошибка: " + error.message)
      if (error.message.includes('schema')) window.location.reload()
    } else {
      setUser(data.user)
    }
  }

  const whiteInput = {
    width: '100%', padding: '15px', marginBottom: '10px', borderRadius: '10px',
    border: '2px solid #0070f3', backgroundColor: '#ffffff', color: '#000000',
    fontSize: '18px', fontWeight: 'bold'
  }

  if (!user) {
    return (
      <div style={{ padding: '50px 20px', textAlign: 'center', backgroundColor: '#000', minHeight: '100vh' }}>
        <h1 style={{ color: '#0070f3' }}>#HASHTAG</h1>
        <div style={{ maxWidth: '350px', margin: '0 auto', background: '#111', padding: '25px', borderRadius: '20px' }}>
          <input placeholder="EMAIL" style={whiteInput} value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="ПАРОЛЬ" style={whiteInput} value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={() => handleAuth('login')} style={{ width: '100%', padding: '15px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>ВОЙТИ</button>
          <button onClick={() => handleAuth('signup')} style={{ width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>РЕГИСТРАЦИЯ</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '50px', textAlign: 'center', backgroundColor: '#fff', minHeight: '100vh' }}>
      <h1>🎉 Ура! Ты в системе!</h1>
      <p>Твой email: {user.email}</p>
      <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{padding: '10px', background: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Выйти</button>
    </div>
  )
}