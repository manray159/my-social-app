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

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [postText, setPostText] = useState('')
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const [songTitle, setSongTitle] = useState('')
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

  // ПЛЕЕР
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const myNick = user?.email?.split('@')[0] || ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    if (view === 'feed') loadPosts()
    if (view === 'notifs') loadNotifications()
    if (view === 'people') loadAllUsers()
    if (view === 'music') loadMusic()
    if (view === 'profile') loadProfile(user.id)
    if (view === 'chat' && chatWith) loadMessages()
  }, [user, view, searchQuery, chatWith])

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (data) { setMyBio(data.bio || ''); setMyAvatar(data.avatar_url || '') }
  }

  async function updateProfile() {
    setLoading(true)
    let url = myAvatar
    if (file) {
      const name = `avatars/${user.id}_${Date.now()}.png`
      const { data } = await supabase.storage.from('images').upload(name, file)
      if (data) url = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('profiles').update({ bio: myBio, avatar_url: url }).eq('id', user.id)
    setMyAvatar(url); setLoading(false); alert("Готово!")
  }

  const togglePlay = (sng: any) => {
    if (playingId === sng.id) {
      if (audioRef.current?.paused) audioRef.current.play()
      else audioRef.current?.pause()
    } else {
      setPlayingId(sng.id)
      if (audioRef.current) {
        audioRef.current.src = sng.url
        audioRef.current.play()
      }
    }
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*, comments(*)').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function createPost() {
    if (!user || !postText) return
    setLoading(true)
    let img = ''
    if (file) {
      const path = `posts/${Date.now()}.png`
      const { data } = await supabase.storage.from('images').upload(path, file)
      if (data) img = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
    }
    await supabase.from('posts').insert([{ text: postText, username: myNick, image_url: img, user_id: user.id }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false)
  }

  async function loadMusic() {
    let q = supabase.from('music').select('*')
    if (searchQuery) q = q.ilike('title', `%${searchQuery}%`)
    const { data } = await q.order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function uploadMusic() {
    if (!file || !songTitle) return
    setLoading(true)
    const path = `music/${Date.now()}_${file.name}`
    const { data } = await supabase.storage.from('images').upload(path, file)
    if (data) {
      const url = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      await supabase.from('music').insert([{ title: songTitle, artist: 'User', url, user_id: user.id }])
      setSongTitle(''); setFile(null); loadMusic()
    }
    setLoading(false)
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if (data) setAllUsers(data.filter(u => u.id !== user?.id))
  }

  async function loadNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false })
    if (data) setNotifications(data)
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
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: 'rgba(10,10,10,0.9)', zIndex: 10 }
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{...s.card, width: '300px'}}>
        <h2 style={{textAlign:'center'}}>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{...s.input, marginTop:'10px'}} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{...s.btn, width: '100%', marginTop:'20px'}}>Войти</button>
        <p onClick={() => handleAuth('signup')} style={{textAlign:'center', fontSize:'12px', marginTop:'15px', cursor:'pointer', color:'#888'}}>Регистрация</p>
      </div>
    </div>
  )

  return (
    <div style={s.bg}>
      <audio 
        ref={audioRef} 
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlayingId(null)}
      />

      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
          <span onClick={() => setView('feed')} style={{ color: view==='feed'?'#fff':'#888', cursor:'pointer' }}>Лента</span>
          <span onClick={() => setView('music')} style={{ color: view==='music'?'#fff':'#888', cursor:'pointer' }}>Музыка</span>
          <span onClick={() => setView('people')} style={{ color: view==='people'?'#fff':'#888', cursor:'pointer' }}>Люди</span>
          <span onClick={() => setView('profile')} style={{ color: view==='profile'?'#fff':'#888', cursor:'pointer' }}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={{...s.input, border:'none', resize:'none' as any}} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{fontSize:'12px'}} />
                <button onClick={createPost} disabled={loading} style={s.btn}>Пост</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color:'#3b82f6'}}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width:'100%', borderRadius:'12px'}} />}
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <h3>Загрузить MP3</h3>
              <input placeholder="Название" style={s.input} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
              <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{marginTop:'10px'}} />
              <button onClick={uploadMusic} style={{...s.btn, width:'100%', marginTop:'10px'}}>Опубликовать трек</button>
            </div>
            {songs.map(sng => (
              <div key={sng.id} style={{...s.card, border: playingId === sng.id ? '1px solid #3b82f6' : '1px solid #262626'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <b>{sng.title}</b>
                  <button onClick={() => togglePlay(sng)} style={{...s.btn, padding:'5px 15px'}}>
                    {playingId === sng.id && !audioRef.current?.paused ? '⏸' : '▶'}
                  </button>
                </div>
                {playingId === sng.id && (
                  <input 
                    type="range" style={{width:'100%', marginTop:'10px', accentColor:'#3b82f6'}} 
                    min="0" max={duration || 0} value={currentTime} 
                    onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value) }} 
                  />
                )}
              </div>
            ))}
          </>
        )}

        {view === 'profile' && (
          <div style={{...s.card, textAlign:'center'}}>
            <div style={{width:'80px', height:'80px', borderRadius:'50%', background:'#262626', margin:'0 auto 15px', overflow:'hidden', border:'2px solid #3b82f6'}}>
                {myAvatar ? <img src={myAvatar} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <div style={{paddingTop:'25px'}}>👤</div>}
            </div>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{fontSize:'12px', marginBottom:'10px'}} />
            <textarea placeholder="О себе..." style={s.input} value={myBio} onChange={e => setMyBio(e.target.value)} />
            <button onClick={updateProfile} disabled={loading} style={{...s.btn, width:'100%', marginTop:'10px'}}>Сохранить</button>
            <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{...s.btn, background:'red', color:'#fff', width:'100%', marginTop:'10px'}}>Выйти</button>
          </div>
        )}

        {view === 'people' && (
          allUsers.map(u => (
            <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between'}}>
              <b>@{u.username}</b>
              <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
            </div>
          ))
        )}

        {view === 'chat' && (
          <div style={{...s.card, height:'70vh', display:'flex', flexDirection:'column'}}>
            <div style={{paddingBottom:'10px', borderBottom:'1px solid #333'}}>Чат с <b>@{chatWith}</b></div>
            <div style={{flex:1, overflowY:'auto', padding:'10px 0'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin:'5px 0'}}>
                  <span style={{display:'inline-block', background: m.sender_name === myNick ? '#3b82f6' : '#262626', padding:'8px 12px', borderRadius:'12px'}}>
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:'5px'}}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              <button onClick={sendMsg} style={s.btn}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}