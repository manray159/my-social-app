'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'music' | 'profile'>('feed')
  const [posts, setPosts] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [profile, setProfile] = useState({ username: '', avatar_url: '', bio: '' })
  
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
    })
  }, [])

  useEffect(() => { if (user) loadData() }, [user, view])

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile(data)
    else setProfile({ ...profile, username: user?.email?.split('@')[0] })
  }

  async function loadData() {
    if (view === 'feed') {
      const { data } = await supabase.from('posts').select('*, comments(*), post_likes(user_id)').order('created_at', { ascending: false })
      setPosts(data || [])
    }
    if (view === 'music') {
      const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false })
      setSongs(data || [])
    }
  }

  // --- УНИКАЛЬНЫЕ ЛАЙКИ ---
  async function handleLike(post: any) {
    const myLike = post.post_likes?.find((l: any) => l.user_id === user.id)
    if (myLike) {
      await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: user.id })
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
      await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    }
    loadData()
  }

  // --- КОММЕНТАРИИ С АВТОРОМ ---
  async function addComment(postId: string) {
    const text = commentInputs[postId]
    if (!text?.trim()) return
    await supabase.from('comments').insert([{ 
      post_id: postId, 
      text, 
      username: profile.username || 'User', 
      user_id: user.id 
    }])
    setCommentInputs({ ...commentInputs, [postId]: '' })
    loadData()
  }

  // --- ПУБЛИКАЦИЯ С ФОТО ---
  async function handlePublish() {
    if (!postText.trim() && !selectedFile) return
    setUploading(true)
    let imageUrl = ''
    if (selectedFile) {
      const name = `${Date.now()}_${selectedFile.name}`
      await supabase.storage.from('images').upload(name, selectedFile)
      imageUrl = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('posts').insert([{ 
      text: postText, image_url: imageUrl, 
      username: profile.username, user_id: user.id 
    }])
    setPostText(''); setSelectedFile(null); setUploading(false); loadData()
  }

  // --- СОХРАНЕНИЕ ПРОФИЛЯ ---
  async function saveProfile() {
    await supabase.from('profiles').upsert({ id: user.id, ...profile })
    alert("Saved!")
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '15px', borderBottom: '1px solid #222' },
    card: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px', border: '1px solid #222' },
    btn: { background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '10px' }
  }

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        <span onClick={() => setView('feed')} style={{cursor:'pointer', opacity: view==='feed'?1:0.5}}>Лента</span>
        <span onClick={() => setView('music')} style={{cursor:'pointer', opacity: view==='music'?1:0.5}}>Музыка</span>
        <span onClick={() => setView('profile')} style={{cursor:'pointer', opacity: view==='profile'?1:0.5}}>Профиль</span>
      </header>

      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={s.input} value={postText} onChange={e => setPostText(e.target.value)} />
              <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{marginBottom: '10px'}} />
              <button style={s.btn} onClick={handlePublish} disabled={uploading}>Пост</button>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color: '#0070f3'}}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width: '100%', borderRadius: '15px'}} />}
                <button onClick={() => handleLike(p)} style={{marginTop: '10px', background: p.post_likes?.some((l:any)=>l.user_id===user.id)?'#ff4b4b':'none', color:'#fff', border:'1px solid #333', padding:'5px 10px', borderRadius:'10px'}}>
                  ❤️ {p.likes_count || 0}
                </button>
                <div style={{marginTop: '10px', borderTop: '1px solid #222'}}>
                  {p.comments?.map((c: any) => (
                    <div key={c.id} style={{fontSize: '13px', marginTop: '5px'}}>
                      <b style={{color: '#888'}}>@{c.username}:</b> {c.text}
                    </div>
                  ))}
                  <input placeholder="Коммент..." style={{...s.input, marginTop: '10px'}} onKeyDown={e => e.key === 'Enter' && addComment(p.id)} value={commentInputs[p.id] || ''} onChange={e => setCommentInputs({...commentInputs, [p.id]: e.target.value})} />
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <div style={s.card}>
            <h2>Музыка</h2>
            {songs.map(s => <div key={s.id} style={{marginBottom: '10px'}}>{s.title} - {s.artist} <audio src={s.url} controls /></div>)}
          </div>
        )}

        {view === 'profile' && (
          <div style={s.card}>
            <img src={profile.avatar_url || 'https://via.placeholder.com/100'} style={{width: '100px', borderRadius: '50%'}} />
            <input style={s.input} placeholder="Avatar URL" value={profile.avatar_url} onChange={e => setProfile({...profile, avatar_url: e.target.value})} />
            <input style={s.input} placeholder="Username" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} />
            <textarea style={s.input} placeholder="Bio" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
            <button style={s.btn} onClick={saveProfile}>Save</button>
          </div>
        )}
      </main>
    </div>
  )
}