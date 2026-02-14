'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'music'>('feed')
  const [posts, setPosts] = useState<any[]>([])
  
  // Состояния профиля
  const [profile, setProfile] = useState({
    username: '',
    avatar_url: '',
    bio: ''
  })

  // Состояния для постов
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user, view])

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile({ username: data.username, avatar_url: data.avatar_url, bio: data.bio })
    else setProfile({ ...profile, username: user?.email?.split('@')[0] })
  }

  async function loadData() {
    if (view === 'feed') {
      // Загружаем посты вместе с комментами и лайками для проверки
      const { data } = await supabase
        .from('posts')
        .select('*, comments(*), post_likes(user_id)')
        .order('created_at', { ascending: false })
      setPosts(data || [])
    }
  }

  // --- УНИКАЛЬНЫЕ ЛАЙКИ ---
  async function handleLike(post: any) {
    // Проверяем, есть ли уже лайк от этого юзера в массиве post_likes
    const myLike = post.post_likes?.find((l: any) => l.user_id === user.id)

    if (myLike) {
      // Убираем лайк
      await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: user.id })
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post.id)
    } else {
      // Ставим лайк (теперь запись уникальна по user_id + post_id)
      await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
      await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    }
    loadData()
  }

  // --- ОБНОВЛЕНИЕ ПРОФИЛЯ ---
  async function saveProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      bio: profile.bio
    })
    if (!error) alert("Профиль обновлен!")
  }

  // --- КОММЕНТАРИИ ---
  async function addComment(postId: string) {
    const text = commentInputs[postId]
    if (!text?.trim()) return
    // Сохраняем коммент с текущим именем из профиля
    await supabase.from('comments').insert([{ 
      post_id: postId, 
      username: profile.username || 'Аноним', 
      text: text,
      user_id: user.id 
    }])
    setCommentInputs({ ...commentInputs, [postId]: '' })
    loadData()
  }

  async function handlePublish() {
    if (!postText.trim() && !selectedFile) return
    setUploading(true)
    try {
      let imageUrl = ''
      if (selectedFile) {
        const fileName = `${Date.now()}_${selectedFile.name}`
        await supabase.storage.from('images').upload(fileName, selectedFile)
        imageUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
      }
      await supabase.from('posts').insert([{ 
        text: postText, 
        image_url: imageUrl, 
        username: profile.username, 
        user_id: user.id 
      }])
      setPostText(''); setSelectedFile(null); loadData()
    } catch (e) { alert("Ошибка") } finally { setUploading(false) }
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '15px', borderBottom: '1px solid #222', sticky: 'top', background: '#000' },
    card: { background: '#111', padding: '20px', borderRadius: '20px', marginBottom: '15px', border: '1px solid #222' },
    btn: { background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '10px' },
    avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' as 'cover', marginBottom: '10px' }
  }

  if (!user) return <div style={s.bg}>Загрузка...</div>

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        {['feed', 'profile'].map((v: any) => (
          <span key={v} onClick={() => setView(v)} style={{cursor: 'pointer', opacity: view === v ? 1 : 0.5}}>
            {v === 'feed' ? 'Лента' : 'Профиль'}
          </span>
        ))}
      </header>

      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={s.input} value={postText} onChange={e => setPostText(e.target.value)} />
              <button style={s.btn} onClick={handlePublish} disabled={uploading}>Опубликовать</button>
            </div>

            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color: '#0070f3'}}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width: '100%', borderRadius: '15px'}} />}
                
                <button 
                  onClick={() => handleLike(p)} 
                  style={{marginTop: '10px', background: p.post_likes?.some((l:any) => l.user_id === user.id) ? '#ff4b4b' : 'none', color: '#fff', border: '1px solid #333', borderRadius: '10px', padding: '5px 10px'}}
                >
                  ❤️ {p.likes_count || 0}
                </button>

                <div style={{marginTop: '15px', borderTop: '1px solid #222', paddingTop: '10px'}}>
                  {p.comments?.map((c: any) => (
                    <div key={c.id} style={{fontSize: '14px', marginBottom: '8px'}}>
                      <span style={{color: '#aaa', fontWeight: 'bold'}}>@{c.username}:</span> {c.text}
                    </div>
                  ))}
                  <input 
                    placeholder="Написать комментарий..." 
                    style={{...s.input, fontSize: '13px'}} 
                    value={commentInputs[p.id] || ''}
                    onChange={e => setCommentInputs({...commentInputs, [p.id]: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && addComment(p.id)}
                  />
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'profile' && (
          <div style={{...s.card, textAlign: 'center'}}>
            <img src={profile.avatar_url || 'https://via.placeholder.com/80'} style={s.avatar} />
            <input style={s.input} placeholder="URL аватарки" value={profile.avatar_url} onChange={e => setProfile({...profile, avatar_url: e.target.value})} />
            <input style={s.input} placeholder="Никнейм" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} />
            <textarea style={s.input} placeholder="О себе" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
            <button style={{...s.btn, width: '100%'}} onClick={saveProfile}>Сохранить профиль</button>
            <button style={{background: 'none', color: 'red', border: 'none', marginTop: '20px', cursor: 'pointer'}} onClick={() => supabase.auth.signOut()}>Выйти</button>
          </div>
        )}
      </main>
    </div>
  )
}