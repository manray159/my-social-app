'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'music' | 'friends' | 'notifs'>('feed')
  const [loading, setLoading] = useState(false)
  
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [postText, setPostText] = useState('')
  const [userSearch, setUserSearch] = useState('')   
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

  // Плеер и Громкость
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Запись (Голосовые и Кружки)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)

  const myNick = user?.email?.split('@')[0] || ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const views: Record<string, () => void> = {
      feed: loadPosts, people: loadAllUsers, friends: loadFriends,
      music: loadMusic, profile: () => loadProfile(user.id),
      notifs: loadNotifications, chat: loadMessages
    }
    views[view]?.()
  }, [user, view, chatWith, userSearch])

  // --- ФУНКЦИИ ЛОГИКИ ---

  async function loadNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false })
    if (data) setNotifications(data)
  }

  async function loadProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (data) { setMyBio(data.bio || ''); setMyAvatar(data.avatar_url || '') }
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function handleLike(post: any) {
    const { data: ex } = await supabase.from('post_likes').select('*').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
    if (ex) return alert("Уже лайкнуто")
    await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
    await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    // Уведомление автору
    await supabase.from('notifications').insert([{ receiver_id: post.user_id, content: `@${myNick} лайкнул ваш пост` }])
    loadPosts() 
  }

  // --- ГОЛОСОВЫЕ И КРУЖКИ ---

  async function startRecording(type: 'audio' | 'video') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    if (type === 'video') setVideoStream(stream)
    
    const recorder = new MediaRecorder(stream)
    mediaRecorder.current = recorder
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: type === 'audio' ? 'audio/ogg' : 'video/mp4' })
      const fileName = `${Date.now()}.${type === 'audio' ? 'ogg' : 'mp4'}`
      const bucket = type === 'audio' ? 'voice_msgs' : 'video_notes'
      
      const { data } = await supabase.storage.from('images').upload(`${bucket}/${fileName}`, blob)
      if (data) {
        const url = supabase.storage.from('images').getPublicUrl(`${bucket}/${fileName}`).data.publicUrl
        await supabase.from('messages').insert([{ 
          sender_name: myNick, receiver_name: chatWith, 
          content: type === 'audio' ? '[Голосовое сообщение]' : '[Видео-кружок]',
          media_url: url, media_type: type 
        }])
        loadMessages()
      }
      stream.getTracks().forEach(t => t.stop())
      setVideoStream(null)
    }
    recorder.start()
    setIsRecording(true)
  }

  const stopRecording = () => { mediaRecorder.current?.stop(); setIsRecording(false) }

  // --- РЕНДЕР ---

  const s = {
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff' },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: '#0a0a0a', zIndex: 10 },
    circle: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' as any, border: '2px solid #3b82f6' }
  }

  // (Остальные функции loadMusic, loadFriends, loadMessages, loadAllUsers, sendMsg, createPost из предыдущих версий...)
  async function loadFriends() {
    const { data } = await supabase.from('friends').select('friend_id').eq('user_id', user.id)
    if (data) {
      const ids = data.map(f => f.friend_id)
      const { data: fData } = await supabase.from('profiles').select('*').in('id', ids)
      if (fData) setFriends(fData)
    }
  }

  async function loadAllUsers() {
    let q = supabase.from('profiles').select('*')
    if (userSearch) q = q.ilike('username', `%${userSearch}%`)
    const { data } = await q
    if (data) setAllUsers(data.filter(u => u.id !== user?.id))
  }

  async function loadMusic() {
    const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false })
    if (data) setSongs(data)
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

  if (!user) return <div style={{...s.bg, display:'flex', justifyContent:'center', alignItems:'center'}}><h2>#HASHTAG</h2></div>

  return (
    <div style={s.bg}>
      <audio ref={audioRef} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} />
      
      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
          <span onClick={() => setView('feed')}>Лента</span>
          <span onClick={() => setView('music')}>Музыка</span>
          <span onClick={() => setView('people')}>Люди</span>
          <span onClick={() => setView('friends')}>Друзья</span>
          <span onClick={() => setView('notifs')}>🔔</span>
          <span onClick={() => setView('profile')}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        
        {view === 'notifs' && notifications.map(n => (
          <div key={n.id} style={s.card}>{n.content}</div>
        ))}

        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={{...s.input, border:'none', background:'transparent'}} value={postText} onChange={e => setPostText(e.target.value)} />
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
              <button onClick={() => {}} style={{...s.btn, marginTop:'10px'}}>Пост</button>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width:'100%', borderRadius:'12px'}} />}
                <button onClick={() => handleLike(p)}>❤️ {p.likes_count}</button>
              </div>
            ))}
          </>
        )}

        {view === 'chat' && (
          <div style={{...s.card, height: '80vh', display: 'flex', flexDirection: 'column'}}>
            <div style={{flex: 1, overflowY: 'auto'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '10px 0'}}>
                  {m.media_type === 'audio' && <audio src={m.media_url} controls style={{height:'30px'}} />}
                  {m.media_type === 'video' && <video src={m.media_url} style={s.circle} controls />}
                  {!m.media_type && <span style={{background: m.sender_name === myNick ? '#3b82f6' : '#262626', padding: '8px 12px', borderRadius: '12px', display: 'inline-block'}}>{m.content}</span>}
                </div>
              ))}
            </div>
            
            {videoStream && <video ref={videoPreviewRef} autoPlay muted style={{...s.circle, alignSelf:'center', marginBottom:'10px'}} />}
            
            <div style={{display: 'flex', gap: '5px', alignItems:'center'}}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Сообщение..." />
              {!isRecording ? (
                <>
                  <button onClick={() => startRecording('audio')} style={s.btn}>🎤</button>
                  <button onClick={() => startRecording('video')} style={s.btn}>🎥</button>
                  <button onClick={sendMsg} style={s.btn}>→</button>
                </>
              ) : (
                <button onClick={stopRecording} style={{...s.btn, background:'red', color:'#fff'}}>STOP</button>
              )}
            </div>
          </div>
        )}

        {/* Остальные вкладки (music, profile, people, friends) — логика идентична предыдущему коду */}
      </div>
    </div>
  )
}