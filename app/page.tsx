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
  const [posts, setPosts] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [view, setView] = useState<'feed' | 'chat'>('feed')
  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)

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
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
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
    if (!postText && !file) return alert("Напишите текст или выберите фото")
    setLoading(true)
    let imageUrl = ''

    try {
      if (file) {
        // Убираем ошибку "Invalid key" заменяя имя файла на цифры
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { data, error: upErr } = await supabase.storage.from('images').upload(fileName, file)
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
      }

      const { error: insErr } = await supabase.from('posts').insert([
        { text: postText, author_email: user.email, image_url: imageUrl }
      ])
      if (insErr) throw insErr

      setPostText(''); setFile(null); loadPosts();
    } catch (e: any) {
      alert("Ошибка: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendMsg() {
    if (!msgText || !chatWith) return
    await supabase.from('messages').insert([{ sender_email: user.email, receiver_email: chatWith, content: msgText }])
    setMsgText(''); loadMessages();
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '24px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' as const },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: '600', cursor: 'pointer' }
  }

  if (!user) {
    return (
      <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...s.card, width: '350px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>#HASHTAG</h1>
          <input placeholder="Email" style={s.input} value={email} onChange={e => setEmail(e.target.value)} />
          <div style={{ height: '10px' }} />
          <input type="password" placeholder="Пароль" style={s.input} value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ height: '20px' }} />
          <button onClick={() => handleAuth('login')} style={{ ...s.btn, width: '100%' }}>ВОЙТИ</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.bg}>
      <nav style={{ borderBottom: '1px solid #333', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>#HASHTAG</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span onClick={() => {setView('feed'); loadPosts()}} style={{ cursor: 'pointer', color: view==='feed'?'#fff':'#888' }}>Лента</span>
          <span onClick={() => {setView('chat'); loadMessages()}} style={{ cursor: 'pointer', color: view==='chat'?'#fff':'#888' }}>Чаты</span>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>Выход</button>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
        {view === 'feed' ? (
          <>
            <div style={{ ...s.card, marginBottom: '24px' }}>
              <textarea placeholder="Что нового?" style={{ ...s.input, height: '80px', border: 'none' }} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
                <label style={{ cursor: 'pointer', color: '#888', fontSize: '14px' }}>
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  🖼️ {file ? 'Фото выбрано' : 'Добавить фото'}
                </label>
                <button onClick={createPost} disabled={loading} style={{ ...s.btn, padding: '8px 16px' }}>Опубликовать</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={{ ...s.card, marginBottom: '16px' }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>{p.author_email}</div>
                <p style={{ margin: '0 0 12px 0' }}>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '8px' }} />}
              </div>
            ))}
          </>
        ) : (
          <div style={{ ...s.card, height: '60vh', display: 'flex', flexDirection: 'column' }}>
            <input placeholder="Email собеседника" style={s.input} value={chatWith} onChange={e => setChatWith(e.target.value)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
               {/* Сообщения появятся здесь */}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input placeholder="Сообщение..." style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} />
              <button onClick={sendMsg} style={s.btn}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}