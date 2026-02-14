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
  const [songs, setSongs] = useState<any[]>([])
  
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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
      // Загружаем музыку из твоей таблицы music в Supabase
      const { data } = await supabase.from('music').select('*')
      setSongs(data || [])
    }
  }

  async function uploadToStorage(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file)
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName)
    return publicUrl
  }

  async function handlePublish() {
    if (!postText.trim() && !selectedFile) return
    try {
      setUploading(true)
      let imageUrl = ''
      if (selectedFile) imageUrl = await uploadToStorage(selectedFile)
      await supabase.from('posts').insert([{ text: postText, image_url: imageUrl, username: myNick, user_id: user.id }])
      setPostText(''); setSelectedFile(null); loadData()
    } catch (e) { alert("Ошибка!") } finally { setUploading(false) }
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '20px', borderBottom: '1px solid #222', sticky: 'top', background: '#000', zIndex: 10 },
    card: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px', border: '1px solid #222' },
    btn: { background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '10px' }
  }

  if (!user) return (
    <div style={{...s.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <h1>#HASHTAG</h1>
      <button style={s.btn} onClick={() => {
        const nick = prompt("Ник:")
        if (nick) setUser({ email: `${nick}@app.com`, id: 'temp' })
      }}>Войти</button>
    </div>
  )

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        <span onClick={() => setView('feed')} style={{cursor:'pointer'}}>Лента</span>
        <span onClick={() => setView('music')} style={{cursor:'pointer'}}>Музыка</span>
        <span onClick={() => setView('profile')} style={{cursor:'pointer'}}>Профиль</span>
      </header>

      <main style={{ maxWidth: '550px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={s.input} value={postText} onChange={e => setPostText(e.target.value)} />
              {selectedFile && <img src={URL.createObjectURL(selectedFile)} style={{width: '100%', borderRadius: '10px', marginBottom: '10px'}} />}
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <label style={{cursor: 'pointer', color: '#0070f3'}}>📷 Фото <input type="file" hidden accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} /></label>
                <button style={s.btn} onClick={handlePublish} disabled={uploading}>{uploading ? '...' : 'Пост'}</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color: '#0070f3'}}>@{p.username}</b>
                <p style={{margin: '10px 0'}}>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width: '100%', borderRadius: '15px'}} alt="post" />}
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <div style={s.card}>
            <h2 style={{marginBottom: '20px'}}>Плейлист</h2>
            {songs.length === 0 && <p style={{color: '#666'}}>Музыка не найдена. Добавь URL в таблицу music.</p>}
            {songs.map(song => (
              <div key={song.id} style={{padding: '15px', background: '#0a0a0a', borderRadius: '15px', marginBottom: '10px', border: '1px solid #222'}}>
                <div style={{marginBottom: '10px'}}>
                  <div style={{fontWeight: 'bold', fontSize: '18px'}}>{song.title}</div>
                  <div style={{color: '#666'}}>{song.artist}</div>
                </div>
                
                {/* ТОТ САМЫЙ ПОЛЗУНОК (АУДИОПЛЕЕР) */}
                <audio controls style={{width: '100%', height: '35px'}}>
                  <source src={song.url} type="audio/mpeg" />
                  Ваш браузер не поддерживает элемент audio.
                </audio>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}