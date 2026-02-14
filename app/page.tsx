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
  
  // Состояния для контента
  const [posts, setPosts] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [view, setView] = useState<'feed' | 'chat'>('feed')
  
  // Для новых данных
  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    loadPosts()
  }, [])

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function loadMessages() {
    if (!user) return
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`sender_email.eq.${user.email},receiver_email.eq.${user.email}`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function handleAuth(type: 'login' | 'signup') {
    setLoading(true)
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else setUser(data.user)
    setLoading(false)
  }

  async function createPost() {
    if (!postText) return
    const { error } = await supabase.from('posts').insert([
      { text: postText, author_email: user.email }
    ])
    if (!error) { setPostText(''); loadPosts(); }
  }

  async function sendMsg() {
    if (!msgText || !chatWith) return
    await supabase.from('messages').insert([
      { sender_email: user.email, receiver_email: chatWith, content: msgText }
    ])
    setMsgText(''); loadMessages();
  }

  // --- СТИЛИ ---
  const btnStyle = { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }
  const inputStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', color: '#000' }

  if (!user) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#111', padding: '40px', borderRadius: '20px', width: '350px', textAlign: 'center' }}>
          <h1 style={{ color: '#0070f3' }}>#HASHTAG</h1>
          <input placeholder="EMAIL" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="ПАРОЛЬ" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={() => handleAuth('login')} style={{ ...btnStyle, width: '100%', background: '#0070f3', color: '#fff', marginBottom: '10px' }}>ВОЙТИ</button>
          <button onClick={() => handleAuth('signup')} style={{ ...btnStyle, width: '100%', background: '#333', color: '#fff' }}>РЕГИСТРАЦИЯ</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2 style={{ color: '#0070f3' }}>#HASHTAG</h2>
        <div>
          <button onClick={() => {setView('feed'); loadPosts()}} style={{...btnStyle, background: view==='feed'?'#0070f3':'#eee', color: view==='feed'?'#fff':'#000', marginRight: '5px'}}>Лента</button>
          <button onClick={() => {setView('chat'); loadMessages()}} style={{...btnStyle, background: view==='chat'?'#0070f3':'#eee', color: view==='chat'?'#fff':'#000'}}>Чаты</button>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{...btnStyle, marginLeft: '10px', background: '#ff4d4d', color: '#fff'}}>Выход</button>
        </div>
      </header>

      {view === 'feed' ? (
        <div style={{ marginTop: '20px' }}>
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
            <textarea placeholder="Что нового?" style={{...inputStyle, height: '80px', resize: 'none'}} value={postText} onChange={e => setPostText(e.target.value)} />
            <button onClick={createPost} style={{...btnStyle, background: '#0070f3', color: '#fff', width: '100%'}}>ОПУБЛИКОВАТЬ</button>
          </div>
          {posts.map(post => (
            <div key={post.id} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
              <small style={{ color: '#0070f3', fontWeight: 'bold' }}>{post.author_email}</small>
              <p style={{ fontSize: '18px', margin: '10px 0' }}>{post.text}</p>
              <small style={{ color: '#999' }}>{new Date(post.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <input placeholder="Email собеседника" style={inputStyle} value={chatWith} onChange={e => setChatWith(e.target.value)} />
          <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '10px', marginBottom: '10px', display: 'flex', flexDirection: 'column' }}>
            {messages.filter(m => m.sender_email === chatWith || m.receiver_email === chatWith).map(m => (
              <div key={m.id} style={{ 
                alignSelf: m.sender_email === user.email ? 'flex-end' : 'flex-start',
                background: m.sender_email === user.email ? '#0070f3' : '#eee',
                color: m.sender_email === user.email ? '#fff' : '#000',
                padding: '8px 12px', borderRadius: '12px', marginBottom: '5px', maxWidth: '80%'
              }}>
                {m.content}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input placeholder="Сообщение..." style={{...inputStyle, marginBottom: 0}} value={msgText} onChange={e => setMsgText(e.target.value)} />
            <button onClick={sendMsg} style={{...btnStyle, background: '#0070f3', color: '#fff'}}>Отправить</button>
          </div>
        </div>
      )}
    </div>
  )
}