'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Инициализация клиента Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Проверка сессии при загрузке
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  // Функция входа и регистрации
  async function handleAuth(type: 'login' | 'signup') {
    if (!email || !password) return alert("Введите email и пароль!")
    setLoading(true)
    
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    
    if (error) {
      alert("Ошибка: " + error.message)
    } else {
      setUser(data.user)
      if (type === 'signup') alert("Регистрация начата! Проверьте почту или используйте SQL для входа.")
    }
    setLoading(false)
  }

  // Стили для полей: Белый фон и ЧЕРНЫЙ текст
  const inputStyle = {
    width: '100%',
    padding: '14px',
    marginBottom: '10px',
    borderRadius: '10px',
    border: '2px solid #0070f3',
    backgroundColor: '#ffffff', // Белый фон
    color: '#000000',           // Черный текст
    fontSize: '16px',
    fontWeight: 'bold',
    outline: 'none'
  }

  // Экран входа
  if (!user) {
    return (
      <div style={{ padding: '50px 20px', textAlign: 'center', backgroundColor: '#000', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#0070f3', fontSize: '32px', marginBottom: '20px' }}>#HASHTAG</h1>
        
        <div style={{ maxWidth: '400px', margin: '0 auto', background: '#1a1a1a', padding: '30px', borderRadius: '20px', border: '1px solid #333' }}>
          <p style={{ color: '#fff', marginBottom: '20px' }}>Вход в аккаунт</p>
          
          <input 
            placeholder="EMAIL" 
            style={inputStyle} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          
          <input 
            type="password" 
            placeholder="ПАРОЛЬ" 
            style={inputStyle} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          
          <button 
            onClick={() => handleAuth('login')} 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}
          >
            {loading ? 'Загрузка...' : 'ВОЙТИ'}
          </button>
          
          <button 
            onClick={() => handleAuth('signup')} 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: '#333', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            РЕГИСТРАЦИЯ
          </button>
        </div>
      </div>
    )
  }

  // Экран после входа
  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fff', minHeight: '100vh', color: '#000', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0070f3' }}>🎉 Вы успешно вошли!</h1>
      <div style={{ background: '#f0f2f5', padding: '20px', borderRadius: '15px', display: 'inline-block', marginTop: '20px' }}>
        <p>Ваш профиль: <strong>{user.email}</strong></p>
        <button 
          onClick={() => supabase.auth.signOut().then(() => setUser(null))}
          style={{ padding: '10px 20px', background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '10px' }}
        >
          Выйти из системы
        </button>
      </div>
    </div>
  )
}