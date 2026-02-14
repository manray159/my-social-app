'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'music'>('feed')
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  
  const [postText, setPostText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')

  const myNick = user?.email?.split('@')[0] || 'User'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user, view])

  async function loadData() {
    if (view === 'feed') {
      const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
      setPosts(data || [])
    }
    if (view === 'music') {
      const { data } = await supabase.from('music').select('*')
      setSongs(data || [])
    }
    if (view === 'people') {
      const { data } = await supabase.from('profiles').select('*')
      setAllUsers(data?.filter(u => u.username !== myNick) || [])
    }
  }

  // --- ЗАГРУЗКА ФОТО В SUPABASE STORAGE ---
  async function uploadImage(file: File) {
    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      alert('Ошибка загрузки!')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function createPost(e: any) {
    const file = e.target.files?.[0]
    let imageUrl = ''
    if (file) imageUrl = await uploadImage(file) || ''
    
    await supabase.from('posts').insert([{ 
      text: postText, 
      image_url: imageUrl, 
      username: myNick,
      user_id: user.id 
    }])
    setPostText('')
    loadData()
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '20px', borderBottom: '1px solid #222', sticky: 'top', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' },
    card: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px', border: '1px solid #222' },
    btn: { background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '10px' }
  }

  if (!user) return (
    <div style={{...s.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <h1 style={{fontSize: '50px', fontWeight: '900', letterSpacing: '-2px'}}>#HASHTAG</h1>
      <button style={s.btn} onClick={() => {
        const nick = prompt("Ник для входа:")
        if (nick) setUser({ email: `${nick}@app.com`, id: 'temp' })
      }}>Войти в систему</button>
    </div>
  )

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        <span onClick={() => setView('feed')}>Лента</span>
        <span onClick={() => setView('people')}>Люди</span>
        <span onClick={() => setView('music')}>Музыка</span>
        <span onClick={() => setView('profile')}>Профиль</span>
      </header>

      <main style={{ maxWidth: '550px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="О чем думаешь?" style={s.input} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label style={{cursor: 'pointer', color: '#0070f3'}}>
                  📷 {uploading ? 'Загрузка...' : 'Добавить фото'}
                  <input type="file" hidden accept="image/*" onChange={createPost} disabled={uploading} />
                </label>
                <button style={s.btn} onClick={() => createPost({target: {}})}>Пост</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{fontSize: '17px'}}>@{p.username}</b>
                <p style={{margin: '10px 0', fontSize: '18px'}}>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width: '100%', borderRadius: '15px'}} alt="post" />}
                <button style={{background: 'none', border: 'none', color: '#666', marginTop: '10px'}}>❤️ {p.likes_count || 0}</button>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <div style={s.card}>
            <h3>Плейлист из базы</h3>
            {songs.length === 0 && <p style={{color: '#444'}}>В таблице music пока пусто...</p>}
            {songs.map(song => (
              <div key={song.id} style={{padding: '15px 0', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between'}}>
                <span><b>{song.title}</b> — {song.artist}</span>
                <button style={{background: 'none', border: 'none'}}>▶️</button>
              </div>
            ))}
          </div>
        )}

        {/* Остальные разделы (People, Chat, Profile) работают на твоей логике */}
      </main>
    </div>
  )
}