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
    if (!postText && !file) return alert("Введите текст или выберите фото")
    setLoading(true)
    let imageUrl = ''

    if (file) {
      const fileName = `${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from('images').upload(fileName, file)
      if (data) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('posts').insert([
      { text: postText, author_email: user.email, image_url: imageUrl }
    ])
    
    if (!error) {
      setPostText(''); setFile(null); loadPosts();
    }
    setLoading(false)
  }

  async function sendMsg() {
    if (!msgText || !chatWith) return
    await supabase.from('messages').insert([
      { sender_email: user.email, receiver_email: chatWith, content: msgText }
    ])
    setMsgText(''); loadMessages();
  }

  if (!user) {
    return (
      <div style={{ background: '#f0f2f5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '20px', width: '350px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h1 style={{ color: '#0088cc', marginBottom: '20px' }}>#HASHTAG</h1>
          <input placeholder="Email" style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '10px', border: '1px solid #ddd', color: '#000' }} value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Пароль" style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '1px solid #ddd', color: '#000' }} value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={() => handleAuth('login')} style={{ width: '100%', padding: '12px', background: '#0088cc', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>ВОЙТИ</button>
          <button onClick={() => handleAuth('signup')} style={{ width: '100%', padding: '12px', background: '#fff', color: '#0088cc', border: '1px solid #0088cc', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>РЕГИСТРАЦИЯ</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#e7ebf0', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#0088cc', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <h2 style={{ margin: 0 }}>#HASHTAG</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => {setView('feed'); loadPosts()}} style={{ background: 'transparent', color: '#fff', border: 'none', fontWeight: view==='feed'?'bold':'normal', cursor: 'pointer' }}>Лента</button>
          <button onClick={() => {setView('chat'); loadMessages()}} style={{ background: 'transparent', color: '#fff', border: 'none', fontWeight: view==='chat'?'bold':'normal', cursor: 'pointer' }}>Чаты</button>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ background: '#ff4d4d', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Выход</button>
        </div>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' ? (
          <>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <textarea placeholder="Что нового?" style={{ width: '100%', height: '80px', border: 'none', outline: 'none', fontSize: '16px', resize: 'none', color: '#000' }} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
                <button onClick={createPost} disabled={loading} style={{ background: '#0088cc', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Публикация...' : 'Опубликовать'}</button>
              </div>
            </div>

            {posts.map(post => (
              <div key={post.id} style={{ background: '#fff', padding: '15px', borderRadius: '15px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <div style={{ color: '#0088cc', fontWeight: 'bold', marginBottom: '10px' }}>{post.author_email}</div>
                {post.text && <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#000' }}>{post.text}</p>}
                {post.image_url && <img src={post.image_url} style={{ width: '100%', borderRadius: '10px', display: 'block' }} />}
                <div style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>{new Date(post.created_at).toLocaleString()}</div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ background: '#fff', borderRadius: '15px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
              <input placeholder="Кому пишем? (email)" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #eee', color: '#000' }} value={chatWith} onChange={e => setChatWith(e.target.value)} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', background: '#f5f5f5' }}>
              {messages.filter(m => m.sender_email === chatWith || m.receiver_email === chatWith).map(m => (
                <div key={m.id} style={{ alignSelf: m.sender_email === user.email ? 'flex-end' : 'flex-start', background: m.sender_email === user.email ? '#efffde' : '#fff', color: '#000', padding: '10px 15px', borderRadius: '15px', marginBottom: '8px', maxWidth: '80%', marginLeft: m.sender_email === user.email ? 'auto' : '0', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  {m.content}
                </div>
              ))}
            </div>
            <div style={{ padding: '15px', display: 'flex', gap: '10px', borderTop: '1px solid #eee' }}>
              <input placeholder="Сообщение..." style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', color: '#000' }} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              <button onClick={sendMsg} style={{ background: '#0088cc', color: '#fff', border: 'none', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px' }}>➤</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}