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
    
    if (error) alert("Ошибка: " + error.message)
    else setUser(data.user)
  }

  // СТИЛЬ: Белый фон, черный жирный текст
  const whiteInput = {
    width: '100%',
    padding: '15px',
    marginBottom: '10px',
    borderRadius: '10px',
    border: '2px solid #0070f3',
    backgroundColor: '#FFFFFF', 
    color: '#000000',           
    fontSize: '18px',
    fontWeight: 'bold'
  }

  if (!user) {
    return (
      <div style={{ padding: '50px 20px', textAlign: 'center', backgroundColor: '#000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#0070f3' }}>#HASHTAG</h1>
        <div style={{ maxWidth: '400px', margin: '0 auto', background: '#222', padding: '30px', borderRadius: '20px' }}>
          <p style={{color: '#fff', marginBottom: '20px'}}>Входи под созданным через SQL аккаунтом</p>
          <input placeholder="EMAIL" style={whiteInput} value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="ПАРОЛЬ" style={whiteInput} value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={() => handleAuth('login')} style={{ width: '100%', padding: '15px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>ВОЙТИ</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', color: '#000', backgroundColor: '#fff', minHeight: '100vh', textAlign: 'center' }}>
      <h1>🎉 Успех! Ты в системе!</h1>
      <p>Твой аккаунт подтвержден вручную.</p>
      <p style={{fontWeight: 'bold'}}>{user.email}</p>
      <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{padding: '10px 20px', background: 'red', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Выйти</button>
    </div>
  )
}