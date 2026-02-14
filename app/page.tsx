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
  const [songTitle, setSongTitle] = useState('')
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)

  const myNick = user?.email?.split('@')[0] || ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    if (view === 'feed') loadPosts()
    if (view === 'people') loadAllUsers()
    if (view === 'friends') loadFriends()
    if (view === 'music') loadMusic()
    if (view === 'notifs') loadNotifications()
    if (view === 'chat' && chatWith) loadMessages()
    if (view === 'profile') loadProfile(user.id)
  }, [user, view, chatWith, userSearch])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // --- ЛОГИКА ---
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
    await supabase.from('notifications').insert([{ receiver_id: post.user_id, content: `@${myNick} лайкнул ваш пост` }])
    loadPosts() 
  }

  async function createPost() {
    if (!user || (!postText && !file)) return
    setLoading(true)
    let img = ''
    if (file) {
      const path = `posts/${Date.now()}.png`
      const { data } = await supabase.storage.from('images').upload(path, file)
      if (data) img = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
    }
    await supabase.from('posts').insert([{ text: postText, username: myNick, image_url: img, user_id: user.id, likes_count: 0 }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false)
  }

  async function loadMusic() {
    const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function uploadMusic() {
    if (!file || !songTitle) return
    setLoading(true)
    const path = `music/${Date.now()}_${file.name}`
    const { data } = await supabase.storage.from('images').upload(path, file)
    if (data) {
      const url = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
      await supabase.from('music').insert([{ title: songTitle, artist: myNick, url, user_id: user.id }])
      setSongTitle(''); setFile(null); loadMusic()
    }
    setLoading(false)
  }

  async function startRecording(type: 'audio' | 'video') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    const recorder = new MediaRecorder(stream)
    mediaRecorder.current = recorder
    const chunks: any[] = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: type === 'audio' ? 'audio/ogg' : 'video/mp4' })
      const path = `${type === 'audio' ? 'voice' : 'video'}/${Date.now()}`
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

  async function addFriend(friend: any) {
    await supabase.from('friends').insert([{ user_id: user.id, friend_id: friend.id }])
    await supabase.from('notifications').insert([{ receiver_id: friend.id, content: `@${myNick} добавил вас в друзья` }])
    alert("Добавлен!")
  }

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

  const s = {
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff' },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: '#0a0a0a', zIndex: 100 },
    ava: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' as any }
  }

  if (!user) return (
    <div style={{...s.bg, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={s.card}>
        <h2>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{...s.input, marginTop:'10px'}} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => {
          const email = `${username}@app.com`
          supabase.auth.signInWithPassword({ email, password }).then(({data, error}) => {
            if (error) alert(error.message); else setUser(data.user)
          })
        }} style={{...s.btn, width:'100%', marginTop:'20px'}}>Войти</button>
      </div>
    </div>
  )

  return (
    <div style={s.bg}>
      <audio ref={audioRef} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} />
      
      <nav style={s.nav}>
        <b onClick={() => setView('feed')} style={{cursor:'pointer'}}>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
          <span onClick={() => setView('feed')} style={{cursor:'pointer', color: view==='feed'?'#fff':'#888'}}>Лента</span>
          <span onClick={() => setView('music')} style={{cursor:'pointer', color: view==='music'?'#fff':'#888'}}>Музыка</span>
          <span onClick={() => setView('people')} style={{cursor:'pointer', color: view==='people'?'#fff':'#888'}}>Люди</span>
          <span onClick={() => setView('friends')} style={{cursor:'pointer', color: view==='friends'?'#fff':'#888'}}>Друзья</span>
          <span onClick={() => setView('notifs')} style={{cursor:'pointer', color: view==='notifs'?'#fff':'#888'}}>🔔</span>
          <span onClick={() => setView('profile')} style={{cursor:'pointer', color: view==='profile'?'#fff':'#888'}}>👤</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={{...s.input, border:'none', background:'transparent', resize:'none' as any}} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px'}}>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{fontSize:'12px'}} />
                <button onClick={createPost} disabled={loading} style={s.btn}>Пост</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color:'#3b82f6'}}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width:'100%', borderRadius:'12px', marginBottom: '10px'}} />}
                <button onClick={() => handleLike(p)} style={{background:'none', border:'1px solid #333', color:'#fff', padding:'5px 12px', borderRadius:'20px'}}>❤️ {p.likes_count || 0}</button>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <input placeholder="Название..." style={s.input} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
              <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{marginTop:'10px'}} />
              <button onClick={uploadMusic} disabled={loading} style={{...s.btn, width:'100%', marginTop:'10px'}}>Загрузить MP3</button>
            </div>
            {songs.map(sng => (
              <div key={sng.id} style={{...s.card, border: playingId === sng.id ? '1px solid #3b82f6' : '1px solid #262626'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <b>{sng.title}</b>
                  <button onClick={() => {
                    if (playingId === sng.id) { audioRef.current?.paused ? audioRef.current.play() : audioRef.current?.pause() }
                    else { setPlayingId(sng.id); if (audioRef.current) { audioRef.current.src = sng.url; audioRef.current.play() } }
                  }} style={s.btn}>{playingId === sng.id && !audioRef.current?.paused ? '⏸' : '▶'}</button>
                </div>
                {playingId === sng.id && (
                  <div style={{marginTop:'10px'}}>
                    <input type="range" style={{width:'100%'}} min="0" max={duration} value={currentTime} onChange={e => { if(audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value) }} />
                    <input type="range" style={{width:'100%', marginTop:'5px', height:'4px'}} min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {view === 'people' && (
          <>
            <input placeholder="Поиск людей..." style={{...s.input, marginBottom:'15px'}} onChange={e => setUserSearch(e.target.value)} />
            {allUsers.map(u => (
              <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <img src={u.avatar_url || 'https://via.placeholder.com/40'} style={s.ava} />
                  <b>@{u.username}</b>
                </div>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
                  <button onClick={() => addFriend(u)} style={{...s.btn, background:'#3b82f6', color:'#fff'}}>+</button>
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'friends' && friends.map(u => (
          <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <img src={u.avatar_url || 'https://via.placeholder.com/40'} style={s.ava} />
              <b>@{u.username}</b>
            </div>
            <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
          </div>
        ))}

        {view === 'notifs' && notifications.map(n => (
          <div key={n.id} style={s.card}>{n.content} <small style={{display:'block', color:'#555'}}>{new Date(n.created_at).toLocaleString()}</small></div>
        ))}

        {view === 'profile' && (
          <div style={{...s.card, textAlign:'center'}}>
            <img src={myAvatar || 'https://via.placeholder.com/80'} style={{width:'80px', height:'80px', borderRadius:'50%', marginBottom:'10px'}} />
            <h3>@{myNick}</h3>
            <p style={{color:'#888'}}>{myBio || 'Нет описания'}</p>
            <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{...s.btn, background:'red', color:'#fff', width:'100%', marginTop:'20px'}}>Выйти</button>
          </div>
        )}

        {view === 'chat' && (
          <div style={{...s.card, height:'75vh', display:'flex', flexDirection:'column'}}>
            <div style={{flex:1, overflowY:'auto', paddingBottom:'10px'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin:'10px 0'}}>
                  <div style={{display:'inline-block', background: m.sender_name === myNick ? '#3b82f6' : '#262626', padding:'8px 12px', borderRadius:'12px', maxWidth:'80%'}}>
                    {m.media_type === 'audio' && <audio src={m.media_url} controls style={{height:'30px', width:'200px'}} />}
                    {m.media_type === 'video' && <video src={m.media_url} controls style={{width:'200px', borderRadius:'50%'}} />}
                    {!m.media_type && m.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:'5px'}}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} placeholder="Сообщение..." />
              {!isRecording ? (
                <>
                  <button onClick={() => startRecording('audio')} style={s.btn}>🎤</button>
                  <button onClick={() => startRecording('video')} style={s.btn}>🎥</button>
                  <button onClick={sendMsg} style={s.btn}>→</button>
                </>
              ) : (
                <button onClick={() => {mediaRecorder.current?.stop(); setIsRecording(false)}} style={{...s.btn, background:'red', color:'#fff'}}>⏹</button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}