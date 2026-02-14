'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'music' | 'friends'>('feed')
  const [loading, setLoading] = useState(false)
  
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])

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
    if (view === 'people') loadAllUsers()
    if (view === 'friends') loadFriends()
    if (view === 'music') loadMusic()
    if (view === 'profile') loadProfile(user.id)
    if (view === 'chat' && chatWith) loadMessages()
  }, [user, view, chatWith, userSearch])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

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
    loadPosts() 
  }

  async function createPost() {
    if (!user || !postText) return
    setLoading(true)
    let img = ''
    if (file) {
      const path = `posts/${Date.now()}.png`
      const { data, error } = await supabase.storage.from('images').upload(path, file)
      if (error) console.error(error)
      else img = supabase.storage.from('images').getPublicUrl(path).data.publicUrl
    }
    await supabase.from('posts').insert([{ text: postText, username: myNick, image_url: img, user_id: user.id, likes_count: 0 }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false)
  }

  async function addFriend(friendId: string) {
    await supabase.from('friends').insert([{ user_id: user.id, friend_id: friendId }])
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
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '8px 12px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: 'rgba(10,10,10,0.9)', zIndex: 10 },
    ava: { width: '40px', height: '40px', borderRadius: '50%', background: '#333', objectFit: 'cover' as any }
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={s.card}>
        <h2>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{...s.input, marginTop:'10px'}} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => {
          const email = `${username}@app.com`
          supabase.auth.signInWithPassword({ email, password }).then(({data, error}) => {
            if (error) alert(error.message)
            else setUser(data.user)
          })
        }} style={{...s.btn, width:'100%', marginTop:'20px'}}>Войти</button>
      </div>
    </div>
  )

  return (
    <div style={s.bg}>
      <audio ref={audioRef} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setPlayingId(null)} />
      
      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
          <span onClick={() => setView('feed')} style={{ color: view==='feed'?'#fff':'#888', cursor:'pointer' }}>Лента</span>
          <span onClick={() => setView('music')} style={{ color: view==='music'?'#fff':'#888', cursor:'pointer' }}>Музыка</span>
          <span onClick={() => setView('people')} style={{ color: view==='people'?'#fff':'#888', cursor:'pointer' }}>Люди</span>
          <span onClick={() => setView('friends')} style={{ color: view==='friends'?'#fff':'#888', cursor:'pointer' }}>Друзья</span>
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
                {p.image_url && <img src={p.image_url} style={{width:'100%', borderRadius:'12px', marginBottom: '10px'}} />}
                <button onClick={() => handleLike(p)} style={{background: 'none', border: '1px solid #333', color: '#fff', padding: '5px 12px', borderRadius: '20px'}}>
                    ❤️ {p.likes_count || 0}
                </button>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <input placeholder="Название..." style={s.input} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
              <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{marginTop:'10px'}} />
              <button onClick={uploadMusic} style={{...s.btn, width:'100%', marginTop:'10px'}}>Загрузить</button>
            </div>
            {songs.map(sng => (
              <div key={sng.id} style={{...s.card, border: playingId === sng.id ? '1px solid #3b82f6' : '1px solid #262626'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                    <b>{sng.title}</b>
                    <button onClick={() => {
                        if (playingId === sng.id) {
                            if (audioRef.current?.paused) audioRef.current.play()
                            else audioRef.current?.pause()
                        } else {
                            setPlayingId(sng.id); if (audioRef.current) { audioRef.current.src = sng.url; audioRef.current.play() }
                        }
                    }} style={s.btn}>{playingId === sng.id && !audioRef.current?.paused ? '⏸' : '▶'}</button>
                </div>
                {playingId === sng.id && (
                  <div style={{marginTop:'10px'}}>
                    <input type="range" style={{width:'100%'}} min="0" max={duration} value={currentTime} onChange={e => { if(audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value) }} />
                    <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'5px'}}>
                        <span style={{fontSize:'10px'}}>🔊</span>
                        <input type="range" style={{flex:1}} min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {view === 'people' && (
          <>
            <input placeholder="Поиск..." style={{...s.input, marginBottom:'15px'}} onChange={e => setUserSearch(e.target.value)} />
            {allUsers.map(u => (
              <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <img src={u.avatar_url || 'https://via.placeholder.com/40'} style={s.ava} />
                    <b>@{u.username}</b>
                </div>
                <div style={{display:'flex', gap:'5px'}}>
                    <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
                    <button onClick={() => addFriend(u.id)} style={{...s.btn, background: '#3b82f6', color: '#fff'}}>+</button>
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'friends' && (
          friends.map(u => (
            <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <img src={u.avatar_url || 'https://via.placeholder.com/40'} style={s.ava} />
                  <b>@{u.username}</b>
              </div>
              <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
            </div>
          ))
        )}

        {view === 'profile' && (
           <div style={{...s.card, textAlign: 'center'}}>
             <div style={{width:'80px', height:'80px', borderRadius:'50%', background:'#262626', margin:'0 auto 15px', overflow:'hidden'}}>
               {myAvatar && <img src={myAvatar} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
             </div>
             <h3>@{myNick}</h3>
             <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{...s.btn, background: 'red', color: '#fff', width: '100%', marginTop: '20px'}}>Выход</button>
           </div>
        )}

        {view === 'chat' && (
          <div style={{...s.card, height: '70vh', display: 'flex', flexDirection: 'column'}}>
            <div style={{flex: 1, overflowY: 'auto'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '10px 0'}}>
                  <span style={{background: m.sender_name === myNick ? '#3b82f6' : '#262626', padding: '8px 12px', borderRadius: '12px', display: 'inline-block'}}>{m.content}</span>
                </div>
              ))}
            </div>
            <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              <button onClick={sendMsg} style={s.btn}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}