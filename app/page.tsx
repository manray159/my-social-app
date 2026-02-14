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
    if (error) alert("Ошибка: " + error.message)
    else setUser(data.user)
    setLoading(false)
  }

  async function createPost() {
    if (!postText && !file) return alert("Введите текст или выберите фото")
    setLoading(true)
    let imageUrl = ''

    try {
      if (file) {
        // Заменяем русское имя файла на цифры, чтобы избежать ошибки Invalid Key
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`; 

        const { data, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file)

        if (uploadError) throw uploadError
        if (data) {
          imageUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
        }
      }

      const { error: insertError } = await supabase.from('posts').insert([
        { text: postText, author_email: user.email, image_url: imageUrl }
      ])
      if (insertError) throw insertError

      setPostText(''); setFile(null); loadPosts();
    } catch (err: any) {
      alert("Ошибка: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendMsg() {
    if (!msgText || !chatWith) return
    const { error } = await supabase.from('messages').insert([
      { sender_email: user.email, receiver_email: chatWith, content: msgText }
    ])
    if (!error) { setMsgText(''); loadMessages(); }
  }

  const containerStyle = { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: '-apple-system, sans-serif' }
  const cardStyle = { background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '24px' }
  const inputStyle = { width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none' }
  const btnPrimary = { background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: '600', cursor: 'pointer' }

  if (!user) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...cardStyle, width: '350px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '24px', letterSpacing: '-1px' }}>#HASHTAG</h1>
          <input placeholder="Email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} />
          <div style={{ height: '10px' }} />
          <input type="password" placeholder="Пароль" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ height: '20px' }} />
          <button onClick={() => handleAuth('login')} style={{ ...btnPrimary, width: '100%', marginBottom: '12px' }}>ВОЙТИ</button>
          <button onClick={() => handleAuth('signup')} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}>Регистрация</button>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <nav style={{ borderBottom: '1px solid #333', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: '#000' }}>
        <h2 style={{ margin: 0 }}>#HASHTAG</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span onClick={() => {setView('feed'); loadPosts()}} style={{ cursor: 'pointer', color: view==='feed'?'#fff':'#888' }}>Лента</span>
          <span onClick={() => {setView('chat'); loadMessages()}} style={{ cursor: 'pointer', color: view==='chat'?'#fff':'#888' }}>Чаты</span>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}>Выход</button>
        </div>
      </nav>

      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
        {view === 'feed' ? (
          <>
            <div style={{ ...cardStyle, marginBottom: '24px' }}>
              <textarea placeholder="Что нового?" style={{ ...inputStyle, height: '100px', resize: 'none', border: 'none', padding: 0 }} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #333' }}>
                <label style={{ cursor: 'pointer', color: '#888', fontSize: '14px' }}>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  🖼️ {file ? file.name.substring(0, 15) + '...' : 'Добавить фото'}
                </label>
                <button onClick={createPost} disabled={loading} style={{ ...btnPrimary, padding: '8px 16px' }}>{loading ? '...' : 'Опубликовать'}</button>
              </div>
            </div>
            {posts.map(post => (
              <div key={post.id} style={{ ...cardStyle, marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{post.author_email}</div>
                {post.text && <p style={{ fontSize: '16px', margin: '0 0 16px 0' }}>{post.text}</p>}
                {post.image_url && <img src={post.image_url} alt="post" style={{ width: '100%', borderRadius: '8px', border: '1px solid #333' }} />}
              </div>
            ))}
          </>
        ) : (
          <div style={{ ...cardStyle, height: '70vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
              <input placeholder="Email собеседника" style={inputStyle} value={chatWith} onChange={e => setChatWith(e.target.value)} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.filter(m => m.sender_email === chatWith || m.receiver_email === chatWith).map(m => (
                <div key={m.id} style={{ 
                  alignSelf: m.sender_email === user.email ? 'flex-end' : 'flex-start',
                  background: m.sender_email === user.email ? '#fff' : '#333',
                  color: m.sender_email === user.email ? '#000' : '#fff',
                  padding: '10px 16px', borderRadius: '18px', maxWidth: '80%', fontSize: '14px'
                }}>
                  {m.content}
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid #333', display: 'flex', gap: '12px' }}>
              <input placeholder="Сообщение..." style={inputStyle} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              <button onClick={sendMsg} style={{ ...btnPrimary, padding: '0 20px' }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}