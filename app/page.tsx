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
    if (!email || !password) {
      alert("Введите email и пароль!");
      return;
    }
    setLoading(true)
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) alert("Ошибка: " + error.message)
    else setUser(data.user)
    setLoading(false)
  }

  async function addFriend(friendEmail: string) {
    if (friendEmail === user.email) return
    await supabase.from('friends').insert([{ user_email: user.email, friend_email: friendEmail }])
    alert('Добавлен в друзья!')
    fetchData()
  }

  async function sendMessage() {
    if (!msgText || !msgTarget) return
    await supabase.from('messages').insert([{ sender_email: user.email, receiver_email: msgTarget, content: msgText }])
    setMsgText('')
    alert('Отправлено!')
    fetchData()
  }

  async function sendPost() {
    if (!text && !file) return
    setLoading(true)
    let url = ""
    if (file) {
      const name = `${Date.now()}-${file.name}`
      const { data } = await supabase.storage.from('images').upload(name, file)
      if (data) url = supabase.storage.from('images').getPublicUrl(data.path).data.publicUrl
    }
    await supabase.from('posts').insert([{ content: text, image_url: url, author: user.email }])
    setText(''); setFile(null); setLoading(false); fetchData()
  }

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    color: '#000000', // Явно черный текст
    backgroundColor: '#f9f9f9', // Светло-серый фон
    fontSize: '16px'
  }

  if (!user) {
    return (
      <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#0070f3' }}>#HASHTAG</h1>
        <p style={{ color: '#666' }}>Введите данные для входа</p>
        <input placeholder="Ваш Email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Пароль" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{ width: '100%', padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>Войти</button>
        <button onClick={() => handleAuth('signup')} style={{ width: '100%', padding: '12px', background: '#e4e6eb', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Регистрация</button>
      </div>
    )
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#0070f3', margin: 0 }}>#HASHTAG</h2>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>Выйти</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        {['feed', 'friends', 'messages'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t as any)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === t ? '#0070f3' : '#f0f2f5', color: activeTab === t ? '#fff' : '#000' }}>
            {t === 'feed' ? 'Лента' : t === 'friends' ? 'Друзья' : 'Чат'}
          </button>
        ))}
      </div>

      {activeTab === 'feed' && (
        <div>
          <div style={{ background: '#f0f2f5', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Что нового?" style={{ ...inputStyle, minHeight: '100px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
              <button onClick={sendPost} style={{ background: '#0070f3', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Опубликовать</button>
            </div>
          </div>
          {posts.map(p => (
            <div key={p.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
              <div style={{ color: '#0070f3', fontWeight: 'bold', marginBottom: '5px' }}>{p.author}</div>
              <p style={{ color: '#000', margin: '10px 0' }}>{p.content}</p>
              {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '8px' }} />}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => { setMsgTarget(p.author); setActiveTab('messages'); }} style={{ fontSize: '12px', color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer' }}>✉ Сообщение</button>
                <button onClick={() => addFriend(p.author)} style={{ fontSize: '12px', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>+ В друзья</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'friends' && (
        <div>
          <h3>Мои друзья</h3>
          {myFriends.length === 0 && <p style={{ color: '#999' }}>Список пуст</p>}
          {myFriends.map(f => <div key={f.id} style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#000' }}>👤 {f.friend_email}</div>)}
        </div>
      )}

      {activeTab === 'messages' && (
        <div>
          <h3>Чат</h3>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
            <input placeholder="Кому (Email)" value={msgTarget} onChange={e => setMsgTarget(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
            <input placeholder="Сообщение..." value={msgText} onChange={e => setMsgText(e.target.value)} style={{ ...inputStyle, flex: 2, marginBottom: 0 }} />
            <button onClick={sendMessage} style={{ background: '#0070f3', color: '#fff', padding: '0 15px', border: 'none', borderRadius: '8px' }}>🚀</button>
          </div>
          {myMessages.map(m => (
            <div key={m.id} style={{ padding: '10px', background: m.sender_email === user.email ? '#e3f2fd' : '#f5f5f5', marginBottom: '8px', borderRadius: '10px', color: '#000' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>{m.sender_email === user.email ? 'Вы' : m.sender_email}</div>
              <div>{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}