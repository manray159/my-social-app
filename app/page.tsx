'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'messages'>('feed')
  const [posts, setPosts] = useState<any[]>([])
  const [myFriends, setMyFriends] = useState<any[]>([])
  const [myMessages, setMyMessages] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msgTarget, setMsgTarget] = useState('')
  const [msgText, setMsgText] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchData()
  }, [user, activeTab])

  async function fetchData() {
    const { data: p } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (p) setPosts(p)
    if (user) {
      const { data: f } = await supabase.from('friends').select('*').eq('user_email', user.email)
      if (f) setMyFriends(f)
      const { data: m } = await supabase.from('messages').select('*')
        .or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`)
        .order('created_at', { ascending: false })
      if (m) setMyMessages(m)
    }
  }

  async function handleAuth(type: 'login' | 'signup') {
    if (!email || !password) return alert("Заполните поля!")
    setLoading(true)
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else setUser(data.user)
    setLoading(false)
  }

  // СТИЛЬ ДЛЯ БЕЛЫХ ПОЛЕЙ
  const whiteInputStyle = {
    width: '100%',
    padding: '14px',
    marginBottom: '12px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#ffffff', // Чисто белый фон
    color: '#000000',           // Черный текст
    fontSize: '16px',
    fontWeight: '500'
  }

  if (!user) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#0070f3', fontSize: '32px', marginBottom: '30px' }}>#HASHTAG</h1>
        <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '20px' }}>
          <input 
            placeholder="Ваш Email" 
            style={whiteInputStyle} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            style={whiteInputStyle} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button onClick={() => handleAuth('login')} style={{ width: '100%', padding: '14px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>Войти</button>
          <button onClick={() => handleAuth('signup')} style={{ width: '100%', padding: '14px', background: '#333', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Создать аккаунт</button>
        </div>
      </div>
    )
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '100vh', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#0070f3', margin: 0 }}>#HASHTAG</h2>
        <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Выход</button>
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        {['feed', 'friends', 'messages'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t as any)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: activeTab === t ? '#0070f3' : '#f0f2f5', color: activeTab === t ? '#fff' : '#000' }}>
            {t === 'feed' ? 'Лента' : t === 'friends' ? 'Друзья' : 'Чат'}
          </button>
        ))}
      </div>

      {activeTab === 'feed' && (
        <div>
          <div style={{ background: '#f0f2f5', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Что нового?" style={{ ...whiteInputStyle, minHeight: '100px', border: '1px solid #ddd' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
              <button onClick={() => {}} style={{ background: '#0070f3', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px' }}>Пост</button>
            </div>
          </div>
        </div>
      )}
      
      <p style={{textAlign: 'center', color: '#666', fontSize: '12px'}}>Вы вошли как: {user.email}</p>
    </main>
  )
}