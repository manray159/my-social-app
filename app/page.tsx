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
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [songTitle, setSongTitle] = useState('')

  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)

  const myNick = user?.email?.split('@')[0] || ''

  // ИСПРАВЛЕННАЯ СТРОКА 43: Теперь сообщения прилетают мгновенно
  useEffect(() => {
    if (!user || view !== 'chat' || !chatWith) return
    const channel = supabase.channel('chat_room')
      .on('postgres_changes' as any, { 
        event: 'INSERT', 
        table: 'messages', 
        schema: 'public' 
      }, () => {
        loadMessages()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, view, chatWith])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user) }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    if (view === 'feed') loadPosts()
    if (view === 'people') loadAllUsers()
    if (view === 'music') loadMusic()
    if (view === 'chat' && chatWith) loadMessages()
  }, [user, view, chatWith])

  // --- ФУНКЦИИ ---
  async function handleAuth() {
    setLoading(true)
    const email = `${username.trim().toLowerCase()}@app.com`
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) alert(error.message)
      else {
        await supabase.from('profiles').insert([{ id: data.user?.id, username: username.trim() }])
        alert('Регистрация прошла! Войдите.')
        setIsSignUp(false)
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message); else setUser(data.user)
    }
    setLoading(false)
  }

  async function uploadMusic() {
    if (!file || !songTitle) return alert("Выбери файл и введи название!")
    setLoading(true)
    const path = `music/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('images').upload(path, file)
    if (error) { alert(error.message); setLoading(false); return }
    const url = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
    await supabase.from('music').insert([{ title: songTitle, artist: myNick, url, user_id: user.id }])
    setSongTitle(''); setFile(null); loadMusic(); setLoading(false)
  }

  async function startRecording(type: 'audio' | 'video') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    const recorder = new MediaRecorder(stream)
    mediaRecorder.current = recorder
    const chunks: any[] = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: type === 'audio' ? 'audio/ogg' : 'video/mp4' })
      const path = `media/${Date.now()}.${type === 'audio' ? 'ogg' : 'mp4'}`
      const { data } = await supabase.storage.from('images').upload(path, blob)
      if (data) {
        const url = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
        await supabase.from('messages').insert([{ sender_name: myNick, receiver_name: chatWith, content: `[${type}]`, media_url: url, media_type: type }])
        loadMessages()
      }
      stream.getTracks().forEach(t => t.stop())
    }
    recorder.start(); setIsRecording(true)
  }

  // ИСПРАВЛЕННЫЙ ЗАГРУЗЧИК СООБЩЕНИЙ: Теперь видит и тебя, и друга
  async function loadMessages() {
    if (!chatWith) return
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq."${myNick}",receiver_name.eq."${chatWith}"),and(sender_name.eq."${chatWith}",receiver_name.eq."${myNick}")`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMsg() {
    if (!msgText.trim()) return
    await supabase.from('messages').insert([{ sender_name: myNick, receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages()
  }

  async function loadPosts() { const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }); if (data) setPosts(data) }
  async function loadMusic() { const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false }); if (data) setSongs(data) }
  async function loadAllUsers() { const { data } = await supabase.from('profiles').select('*'); if (data) setAllUsers(data.filter(u => u.username !== myNick)) }

  const s = {
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#fff' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff' },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: '#0a0a0a', zIndex: 100 }
  }

  if (!user) return (
    <div style={{...s.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{...s.card, width:'300px', textAlign:'center'}}>
        <h2>#HASHTAG</h2>
        <input placeholder="Никнейм" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{...s.input, marginTop:'10px'}} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleAuth} style={{...s.btn, width:'100%', marginTop:'20px'}}>{isSignUp ? 'Создать' : 'Войти'}</button>
        <p onClick={() => setIsSignUp(!isSignUp)} style={{fontSize:'12px', marginTop:'15px', color:'#3b82f6', cursor:'pointer'}}>{isSignUp ? 'Войти' : 'Регистрация'}</p>
      </div>
    </div>
  )

  return (
    <div style={s.bg}>
      <audio ref={audioRef} />
      <nav style={s.nav}>
        <b onClick={() => setView('feed')} style={{cursor:'pointer'}}>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span onClick={() => setView('feed')}>Лента</span>
          <span onClick={() => setView('music')}>Музыка</span>
          <span onClick={() => setView('people')}>Люди</span>
          <span onClick={() => setView('profile')}>👤</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px 100px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={{...s.input, border:'none', background:'transparent', resize:'none' as any}} value={postText} onChange={e => setPostText(e.target.value)} />
              <button onClick={() => {}} style={s.btn}>Пост</button>
            </div>
            {posts.map(p => <div key={p.id} style={s.card}><b>@{p.username}</b><p>{p.text}</p></div>)}
          </>
        )}

        {view === 'chat' && (
          <div style={{...s.card, height:'75vh', display:'flex', flexDirection:'column'}}>
            <div style={{flex:1, overflowY:'auto'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin:'10px 0'}}>
                  <div style={{display:'inline-block', background: m.sender_name === myNick ? '#3b82f6' : '#262626', padding:'8px 12px', borderRadius:'15px'}}>
                    {m.media_type === 'audio' && <audio src={m.media_url} controls style={{height:'35px'}} />}
                    {m.media_type === 'video' && <video src={m.media_url} controls style={{width:'150px', borderRadius:'50%'}} />}
                    {!m.media_type && m.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:'5px', paddingTop:'10px'}}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              {!isRecording ? (
                <><button onClick={() => startRecording('audio')} style={s.btn}>🎤</button><button onClick={() => startRecording('video')} style={s.btn}>🎥</button><button onClick={sendMsg} style={s.btn}>→</button></>
              ) : (
                <button onClick={() => {mediaRecorder.current?.stop(); setIsRecording(false)}} style={{...s.btn, background:'red'}}>⏹</button>
              )}
            </div>
          </div>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <input placeholder="Название" style={s.input} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
              <button onClick={uploadMusic} style={{...s.btn, width:'100%', marginTop:'10px'}}>Загрузить</button>
            </div>
            {songs.map(sng => (
              <div key={sng.id} style={s.card}>
                <b>{sng.title}</b>
                <button onClick={() => { if(audioRef.current){audioRef.current.src=sng.url; audioRef.current.play(); setPlayingId(sng.id)} }} style={s.btn}>{playingId === sng.id ? '⏸' : '▶'}</button>
              </div>
            ))}
          </>
        )}

        {view === 'people' && allUsers.map(u => (
          <div key={u.id} style={s.card}>
            <b>@{u.username}</b>
            <button onClick={() => {setChatWith(u.username); setView('chat')}} style={{...s.btn, float:'right'}}>Чат</button>
          </div>
        ))}

        {view === 'profile' && (
          <div style={{...s.card, textAlign:'center'}}>
            <h3>@{myNick}</h3>
            <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{...s.btn, background:'red', color:'#fff', marginTop:'20px'}}>Выйти</button>
          </div>
        )}
      </div>
    </div>
  )
}