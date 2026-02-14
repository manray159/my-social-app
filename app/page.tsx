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
  
  // Состояния для форм
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
    await supabase.from('messages').insert([{ 
      sender_email: user.email, 
      receiver_email: msgTarget, 
      content: msgText 
    }])
    setMsgText('')
    alert('Сообщение отправлено!')
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

  if (!user) {
    return (
      <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', color: '#000', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#0070f3' }}>#HASHTAG</h1>
        <input placeholder="Email" style={{ width: '100%', padding: '10px', marginBottom: '10px', color: '#000' }} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{ width: '100%', padding: '10px', marginBottom: '10px', color: '#000' }} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{ width: '100%', padding: '10px', background: '#0070f3', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: '5px' }}>Войти</button>
        <button onClick={() => handleAuth('signup')} style={{ width: '100%', padding: '10px', background: '#eee', border: 'none', cursor: 'pointer' }}>Регистрация</button>
      </div>
    )
  }

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ color: '#0070f3', margin: 0 }}>#HASHTAG</h2>
        <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Выход</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('feed')} style={{ flex: 1, padding: '10px', background: activeTab === 'feed' ? '#0070f3' : '#eee', color: activeTab === 'feed' ? '#fff' : '#000', border: 'none', borderRadius: '5px' }}>Лента</button>
        <button onClick={() => setActiveTab('friends')} style={{ flex: 1, padding: '10px', background: activeTab === 'friends' ? '#0070f3' : '#eee', color: activeTab === 'friends' ? '#fff' : '#000', border: 'none', borderRadius: '5px' }}>Друзья</button>
        <button onClick={() => setActiveTab('messages')} style={{ flex: 1, padding: '10px', background: activeTab === 'messages' ? '#0070f3' : '#eee', color: activeTab === 'messages' ? '#fff' : '#000', border: 'none', borderRadius: '5px' }}>Чат</button>
      </div>

      {activeTab === 'feed' && (
        <div>
          <div style={{ background: '#f0f2f5', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Что нового?" style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '5px', color: '#000' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
              <button onClick={sendPost} style={{ background: '#0070f3', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '5px' }}>Пост</button>
            </div>
          </div>
          {posts.map(p => (
            <div key={p.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', color: '#0070f3', cursor: 'pointer' }} onClick={() => { setMsgTarget(p.author); setActiveTab('messages'); }}>@{p.author} (Написать)</div>
              <button onClick={() => addFriend(p.author)} style={{ fontSize: '10px', background: '#eee', border: 'none', marginTop: '5px', cursor: 'pointer' }}>+ В друзья</button>
              <p>{p.content}</p>
              {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '10px' }} />}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'friends' && (
        <div>
          <h3>Мои друзья</h3>
          {myFriends.length === 0 && <p>У вас пока нет друзей</p>}
          {myFriends.map(f => <div key={f.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>👤 {f.friend_email}</div>)}
        </div>
      )}

      {activeTab === 'messages' && (
        <div>
          <h3>Личные сообщения</h3>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '5px' }}>
            <input placeholder="Кому (email)" value={msgTarget} onChange={e => setMsgTarget(e.target.value)} style={{ flex: 1, padding: '5px', color: '#000' }} />
            <input placeholder="Текст..." value={msgText} onChange={e => setMsgText(e.target.value)} style={{ flex: 2, padding: '5px', color: '#000' }} />
            <button onClick={sendMessage} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '5px 10px' }}>Send</button>
          </div>
          {myMessages.map(m => (
            <div key={m.id} style={{ padding: '10px', background: m.sender_email === user.email ? '#e3f2fd' : '#f5f5f5', marginBottom: '5px', borderRadius: '5px' }}>
              <small>{m.sender_email === user.email ? 'Вы' : m.sender_email}:</small>
              <div>{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}