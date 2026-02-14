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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  async function handleLogin() {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Ошибка: " + error.message)
    else setUser(data.user)
    setLoading(false)
  }

  // Сверх-сильный стиль для белых полей
  const whiteInput = {
    width: '100%',
    padding: '15px',
    marginBottom: '15px',
    borderRadius: '10px',
    border: '2px solid #0070f3',
    backgroundColor: '#ffffff', // Чисто белый
    color: '#000000',           // Чисто черный
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'block'
  }

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#000', minHeight: '100vh' }}>
        <h1 style={{ color: '#0070f3', marginBottom: '30px', fontFamily: 'sans-serif' }}>#HASHTAG</h1>
        <div style={{ maxWidth: '350px', margin: '0 auto', background: '#111', padding: '20px', borderRadius: '20px' }}>
          <input 
            placeholder="EMAIL" 
            style={whiteInput} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="ПАРОЛЬ" 
            style={whiteInput} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button 
            onClick={handleLogin} 
            style={{ width: '100%', padding: '15px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'ВХОД...' : 'ВОЙТИ'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🎉 Успешный вход!</h1>
      <p>Вы вошли как: <b>{user.email}</b></p>
      <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{marginTop: '20px', padding: '10px 20px', cursor: 'pointer'}}>Выйти</button>
    </div>
  )
}