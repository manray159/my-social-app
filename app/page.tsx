'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'music' | 'notifs'>('feed')
  const [loading, setLoading] = useState(false)
  
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [postText, setPostText] = useState('')
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

  // ПЛЕЕР СОСТОЯНИЯ
  const [currentSong, setCurrentSong] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const myNick = user?.email?.split('@')[0] || ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.email?.split('@')[0] || '')
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    loadPosts(); loadNotifications(); loadAllUsers()
    if (view === 'music') loadMusic()
    
    const channel = supabase.channel('online-users', { config: { presence: { key: myNick } } })
    channel.on('presence', { event: 'sync' }, () => {
      setOnlineUsers(Object.keys(channel.presenceState()))
    }).subscribe(async (s) => { if (s === 'SUBSCRIBED') await channel.track({ online_at: new Date() }) })

    let interval: any
    if (view === 'chat' && chatWith) { loadMessages(); interval = setInterval(loadMessages, 3000) }
    return () => { channel.unsubscribe(); clearInterval(interval) }
  }, [user, view, searchQuery, chatWith])

  // ЛОГИКА ПЛЕЕРА
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false))
      else audioRef.current.pause()
    }
  }, [isPlaying, currentSong])

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }
  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }
  const formatTime = (time: number) => {
    const min = Math.floor(time / 60)
    const sec = Math.floor(time % 60)
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }
  const handleSeek = (e: any) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  // ФУНКЦИИ БАЗЫ
  async function loadProfile(nick: string) {
    const { data } = await supabase.from('profiles').select('*').eq('username', nick).maybeSingle()
    if (data) { setMyBio(data.bio || ''); setMyAvatar(data.avatar_url || '') }
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*, comments(*)').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function createPost() {
    if (!user) return alert("Войдите в аккаунт")
    setLoading(true)
    try {
      let img = ''
      if (file) {
        const path = `posts/${Date.now()}.png`
        const { data, error: upError } = await supabase.storage.from('images').upload(path, file)
        if (upError) throw upError
        img = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      }
      const { error: insError } = await supabase.from('posts').insert([{ 
        text: postText, 
        username: myNick, 
        image_url: img, 
        user_id: user.id 
      }])
      if (insError) throw insError
      setPostText(''); setFile(null); loadPosts()
    } catch (e: any) {
      alert("Ошибка публикации: " + e.message)
      console.error(e)
    }
    setLoading(false)
  }

  async function handleLike(post: any) {
    const { data: ex } = await supabase.from('post_likes').select('*').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
    if (ex) return
    await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
    await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    await createNotif(post.user_id, 'like', post.id)
    loadPosts()
  }

  async function addComment(post: any) {
    const txt = commentText[post.id]; if (!txt) return
    await supabase.from('comments').insert([{ post_id: post.id, user_id: user.id, username: myNick, content: txt }])
    await createNotif(post.user_id, 'comment', post.id)
    setCommentText({ ...commentText, [post.id]: '' }); loadPosts()
  }

  async function createNotif(revId: string, type: string, pId: string) {
    if (user.id === revId) return
    await supabase.from('notifications').insert([{ receiver_id: revId, sender_name: myNick, type, post_id: pId }])
  }

  async function loadNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false })
    if (data) setNotifications(data)
  }

  async function loadMusic() {
    let q = supabase.from('music').select('*')
    if (searchQuery) q = q.ilike('title', `%${searchQuery}%`)
    const { data } = await q.order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function uploadMusic() {
    if (!file || !songTitle) return alert("Файл и название обязательны")
    setLoading(true)
    const path = `music/${Date.now()}_${file.name}`
    const { data } = await supabase.storage.from('images').upload(path, file)
    if (data) {
      const url = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      await supabase.from('music').insert([{ title: songTitle, artist: songArtist || 'Неизвестен', url, user_id: user.id }])
      setSongTitle(''); setSongArtist(''); setFile(null); loadMusic()
    }
    setLoading(false)
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if (data) setAllUsers(data.filter(u => u.id !== user?.id))
  }

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*').or(`and(sender_name.eq.${myNick},receiver_name.eq.${chatWith}),and(sender_name.eq.${chatWith},receiver_name.eq.${myNick})`).order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMsg() {
    if (!msgText) return
    await supabase.from('messages').insert([{ sender_name: myNick, receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages()
  }

  async function handleAuth(type: 'login' | 'signup') {
    setLoading(true)
    const email = `${username}@app.com`
    const { data, error } = type === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else { setUser(data.user); if (type === 'signup') await supabase.from('profiles').insert([{ id: data.user?.id, username }]) }
    setLoading(false)
  }

  const s = {
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 15px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: 'rgba(10,10,10,0.9)', zIndex: 10 },
    player: { position: 'fixed' as any, bottom: 0, left: 0, right: 0, background: '#161616', borderTop: '1px solid #262626', padding: '15px', zIndex: 100, display: 'flex', flexDirection: 'column' as any, gap: '10px' }
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{...s.card, width: '300px'}}>
        <h2 style={{textAlign:'center'}}>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{...s.input, marginTop:'10px'}} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{...s.btn, width: '100%', marginTop:'20px'}}>Войти</button>
        <p onClick={() => handleAuth('signup')} style={{textAlign:'center', fontSize:'12px', marginTop:'15px', cursor:'pointer', color:'#888'}}>Создать аккаунт</p>
      </div>
    </div>
  )

  return (
    <div style={s.bg}>
      {/* СКРЫТЫЙ АУДИО ТЕГ */}
      <audio 
        ref={audioRef} 
        src={currentSong?.url} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata} 
        onEnded={() => setIsPlaying(false)}
      />

      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
          <span onClick={() => setView('feed')} style={{ color: view==='feed'?'#fff':'#888', cursor:'pointer' }}>Лента</span>
          <span onClick={() => setView('music')} style={{ color: view==='music'?'#fff':'#888', cursor:'pointer' }}>Музыка</span>
          <span onClick={() => setView('people')} style={{ color: view==='people'?'#fff':'#888', cursor:'pointer' }}>Люди</span>
          <span onClick={() => setView('notifs')} style={{ color: view==='notifs'?'#fff':'#888', cursor:'pointer' }}>Уведомления ({notifications.filter(n=>!n.is_read).length})</span>
          <span onClick={() => setView('profile')} style={{ color: view==='profile'?'#fff':'#888', cursor:'pointer' }}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px', paddingBottom: currentSong ? '120px' : '20px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={{...s.input, border:'none', resize:'none' as any}} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{fontSize:'12px'}} />
                <button onClick={createPost} disabled={loading} style={s.btn}>{loading ? '...' : 'Опубликовать'}</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color:'#3b82f6'}}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width:'100%', borderRadius:'12px', marginBottom:'10px'}} />}
                <button onClick={() => handleLike(p)} style={{background:'none', border:'1px solid #333', color:'#fff', borderRadius:'20px', padding:'5px 12px'}}>❤️ {p.likes_count || 0}</button>
                <div style={{marginTop:'15px', borderTop:'1px solid #262626', paddingTop:'10px'}}>
                  {p.comments?.map((c: any) => (
                    <div key={c.id} style={{fontSize:'13px', marginBottom:'5px'}}><b style={{color:'#888'}}>@{c.username}:</b> {c.content}</div>
                  ))}
                  <input placeholder="Комментировать..." style={{...s.input, padding:'5px', marginTop:'5px'}} value={commentText[p.id] || ''} onChange={e => setCommentText({...commentText, [p.id]: e.target.value})} onKeyPress={e => e.key==='Enter' && addComment(p)} />
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <h3>Загрузить трек</h3>
              <input placeholder="Название" style={s.input} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
              <input placeholder="Артист" style={{...s.input, marginTop:'10px'}} value={songArtist} onChange={e => setSongArtist(e.target.value)} />
              <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{marginTop:'10px'}} />
              <button onClick={uploadMusic} disabled={loading} style={{...s.btn, width:'100%', marginTop:'15px'}}>Загрузить MP3</button>
            </div>
            <input placeholder="Поиск музыки..." style={{...s.input, marginBottom:'15px'}} onChange={e => setSearchQuery(e.target.value)} />
            {songs.map(sng => (
              <div key={sng.id} onClick={() => { setCurrentSong(sng); setIsPlaying(true); }} style={{...s.card, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', border: currentSong?.id === sng.id ? '1px solid #3b82f6' : '1px solid #262626'}}>
                <div>
                    <div style={{fontWeight:'bold'}}>{sng.title}</div>
                    <div style={{color:'#888', fontSize:'12px'}}>{sng.artist}</div>
                </div>
                <div style={{color:'#3b82f6'}}>{currentSong?.id === sng.id && isPlaying ? '⏸' : '▶️'}</div>
              </div>
            ))}
          </>
        )}

        {/* ПАНЕЛЬ ПЛЕЕРА */}
        {currentSong && (
          <div style={s.player}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                    <b style={{fontSize:'14px'}}>{currentSong.title}</b>
                    <div style={{fontSize:'12px', color:'#888'}}>{currentSong.artist}</div>
                </div>
                <button onClick={() => setIsPlaying(!isPlaying)} style={{...s.btn, borderRadius:'50%', width:'40px', height:'40px', padding:0}}>
                    {isPlaying ? 'Ⅱ' : '▶'}
                </button>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{fontSize:'10px', minWidth:'30px'}}>{formatTime(currentTime)}</span>
                <input 
                    type="range" 
                    min="0" 
                    max={duration || 0} 
                    value={currentTime} 
                    onChange={handleSeek}
                    style={{flex:1, accentColor:'#3b82f6', cursor:'pointer'}} 
                />
                <span style={{fontSize:'10px', minWidth:'30px'}}>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Другие вью (People, Notifs, Profile) остаются такими же... */}
        {view === 'people' && allUsers.map(u => (
          <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <b>@{u.username}</b>
            <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
          </div>
        ))}
      </div>
    </div>
  )
}