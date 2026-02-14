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
  
  // Состояния для постов
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})

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
      const { data } = await supabase
        .from('posts')
        .select('*, comments(*)')
        .order('created_at', { ascending: false })
      setPosts(data || [])
    }
    if (view === 'music') {
      const { data } = await supabase.from('music').select('*')
      setSongs(data || [])
    }
  }

  // --- ЛОГИКА ЛАЙКОВ (БЕЗ НАКРУТКИ) ---
  async function handleLike(post: any) {
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', post.id)
      .eq('username', myNick)
      .maybeSingle()

    if (existingLike) {
      await supabase.from('post_likes').delete().eq('id', existingLike.id)
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert([{ post_id: post.id, username: myNick }])
      await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    }
    loadData()
  }

  // --- КОММЕНТАРИИ ---
  async function addComment(postId: string) {
    const text = commentInputs[postId]
    if (!text?.trim()) return
    await supabase.from('comments').insert([{ post_id: postId, username: myNick, text: text }])
    setCommentInputs({ ...commentInputs, [postId]: '' })
    loadData()
  }

  // --- ЗАГРУЗКА ФОТО ---
  async function uploadToStorage(file: File) {
    const fileName = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('images').upload(fileName, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName)
    return publicUrl
  }

  async function handlePublish() {
    if (!postText.trim() && !selectedFile) return
    setUploading(true)
    try {
      let imageUrl = ''
      if (selectedFile) imageUrl = await uploadToStorage(selectedFile)
      await supabase.from('posts').insert([{ text: postText, image_url: imageUrl, username: myNick, user_id: user.id }])
      setPostText(''); setSelectedFile(null); loadData()
    } catch (e) { alert("Ошибка загрузки") } finally { setUploading(false) }
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '15px', borderBottom: '1px solid #222', sticky: 'top', background: '#000', zIndex: 100 },
    card: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px', border: '1px solid #222' },
    btn: { background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '10px' }
  }

  if (!user) return (
    <div style={{...s.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <h1 style={{fontSize: '50px', letterSpacing: '-2px'}}>#HASHTAG</h1>
      <button style={s.btn} onClick={() => {
        const nick = prompt("Твой ник:")
        if (nick) setUser({ email: `${nick}@app.com`, id: 'temp' })
      }}>Войти</button>
    </div>
  )

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        {['feed', 'music', 'profile'].map((v: any) => (
          <span key={v} onClick={() => setView(v)} style={{cursor: 'pointer', opacity: view === v ? 1 : 0.5, fontWeight: 'bold', textTransform: 'capitalize'}}>
            {v === 'feed' ? 'Лента' : v === 'music' ? 'Музыка' : 'Профиль'}
          </span>
        ))}
      </header>

      <main style={{ maxWidth: '550px', margin: '0 auto', padding: '20px' }}>
        
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={s.input} value={postText} onChange={e => setPostText(e.target.value)} />
              {selectedFile && <img src={URL.createObjectURL(selectedFile)} style={{width: '100%', borderRadius: '15px', marginBottom: '10px'}} />}
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label style={{cursor: 'pointer', color: '#0070f3'}}>
                  📷 Фото <input type="file" hidden accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </label>
                <button style={s.btn} onClick={handlePublish} disabled={uploading}>{uploading ? '...' : 'Пост'}</button>
              </div>
            </div>

            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color: '#0070f3', fontSize: '18px'}}>@{p.username}</b>
                <p style={{margin: '10px 0', fontSize: '17px'}}>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width: '100%', borderRadius: '15px'}} alt="post" />}
                
                <div style={{marginTop: '15px'}}>
                  <button onClick={() => handleLike(p)} style={{background: 'none', border: '1px solid #333', color: '#fff', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer'}}>
                    ❤️ {p.likes_count || 0}
                  </button>
                </div>

                <div style={{marginTop: '15px', borderTop: '1px solid #222', paddingTop: '10px'}}>
                  {p.comments?.map((c: any) => (
                    <div key={c.id} style={{fontSize: '14px', marginBottom: '5px'}}>
                      <b style={{color: '#888'}}>@{c.username}:</b> {c.text}
                    </div>
                  ))}
                  <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                    <input 
                      placeholder="Коммент..." 
                      style={{...s.input, marginBottom: 0, padding: '8px'}} 
                      value={commentInputs[p.id] || ''}
                      onChange={e => setCommentInputs({...commentInputs, [p.id]: e.target.value})}
                    />
                    <button style={{...s.btn, padding: '5px 10px'}} onClick={() => addComment(p.id)}>OK</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <div style={s.card}>
            <h2 style={{marginBottom: '20px'}}>Плейлист</h2>
            {songs.map(song => (
              <div key={song.id} style={{padding: '15px', background: '#0a0a0a', borderRadius: '15px', marginBottom: '10px', border: '1px solid #222'}}>
                <div style={{fontWeight: 'bold'}}>{song.title}</div>
                <div style={{color: '#666', fontSize: '14px', marginBottom: '10px'}}>{song.artist}</div>
                <audio controls style={{width: '100%', height: '35px'}}>
                  <source src={song.url} type="audio/mpeg" />
                </audio>
              </div>
            ))}
          </div>
        )}

        {view === 'profile' && (
          <div style={{...s.card, textAlign: 'center'}}>
            <div style={{width: '80px', height: '80px', background: '#0070f3', borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px'}}>
              {myNick[0]?.toUpperCase()}
            </div>
            <h2>@{myNick}</h2>
            <button style={{...s.btn, background: 'red', color: '#fff', width: '100%', marginTop: '20px'}} onClick={() => setUser(null)}>Выйти</button>
          </div>
        )}
      </main>
    </div>
  )
}