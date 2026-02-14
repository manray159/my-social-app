'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [posts, setPosts] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [friendsList, setFriendsList] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'friends' | 'music'>('feed')
  
  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')
  
  // Поля для музыки
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUser(session.user)
        loadProfile(session.user.email.split('@')[0])
      }
    })
    loadPosts()
    if (view === 'people') loadAllUsers()
    if (view === 'friends') loadFriends()
    if (view === 'music') loadMusic()
    
    const interval = setInterval(() => { if(view === 'chat') loadMessages() }, 3000)
    return () => clearInterval(interval)
  }, [view, chatWith])

  async function loadProfile(nick: string) {
    const { data } = await supabase.from('profiles').select('*').eq('username', nick).maybeSingle()
    if (data) { setMyBio(data.bio || ''); setMyAvatar(data.avatar_url || '') }
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if (data) setAllUsers(data.filter(u => u.id !== user?.id))
  }

  async function loadFriends() {
    if (!user) return
    const { data: frData } = await supabase.from('friends').select('friend_id').eq('user_id', user.id)
    if (frData) {
      const ids = frData.map(f => f.friend_id)
      const { data: prData } = await supabase.from('profiles').select('*').in('id', ids)
      if (prData) setFriendsList(prData)
    }
  }

  // --- ЛОГИКА МУЗЫКИ ---
  async function loadMusic() {
    const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function uploadMusic() {
    if (!file || !songTitle || !user) return alert("Выберите MP3 файл и укажите название")
    setLoading(true)
    const fileName = `music/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('images').upload(fileName, file)
    
    if (error) {
        alert("Ошибка загрузки: " + error.message)
    } else if (data) {
      const songUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
      await supabase.from('music').insert([{ 
        title: songTitle, 
        artist: songArtist || 'Неизвестен', 
        url: songUrl, 
        user_id: user.id 
      }])
      setSongTitle(''); setSongArtist(''); setFile(null); loadMusic()
      alert("Песня добавлена!")
    }
    setLoading(false)
  }

  async function handleLike(postId: string) {
    if (!user) return
    const { data: ex } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
    if (ex) return alert("Уже лайкнуто")
    await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }])
    const { data: p } = await supabase.from('posts').select('likes_count').eq('id', postId).single()
    await supabase.from('posts').update({ likes_count: (p?.likes_count || 0) + 1 }).eq('id', postId)
    loadPosts()
  }

  async function handleAuth(type: 'login' | 'signup') {
    setLoading(true)
    const email = `${username}@app.com`
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else {
      setUser(data.user)
      if (type === 'signup') await supabase.from('profiles').insert([{ id: data.user?.id, username }])
    }
    setLoading(false)
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
    await supabase.from('posts').insert([{ text: postText, username: user.email.split('@')[0], image_url: img }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false)
  }

  async function loadMessages() {
    if (!user || !chatWith) return
    const me = user.email.split('@')[0]
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq.${me},receiver_name.eq.${chatWith}),and(sender_name.eq.${chatWith},receiver_name.eq.${me})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMsg() {
    if (!user || !msgText) return
    await supabase.from('messages').insert([{ sender_name: user.email.split('@')[0], receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages()
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 15px', fontWeight: 'bold', cursor: 'pointer' },
    nav: { borderBottom: '1px solid #333', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: '#000', zIndex: 10 }
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, width: '300px' }}>
        <h2 style={{ textAlign: 'center' }}>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{ ...s.input, marginTop: '10px' }} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{ ...s.btn, width: '100%', marginTop: '20px' }}>ВОЙТИ</button>
        <p onClick={() => handleAuth('signup')} style={{ color: '#888', textAlign: 'center', cursor: 'pointer', marginTop: '15px' }}>Создать аккаунт</p>
      </div>
    </div>
  )

  const myNick = user?.email?.split('@')[0] || ''

  return (
    <div style={s.bg}>
      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span onClick={() => setView('feed')} style={{ cursor: 'pointer', color: view==='feed'?'#fff':'#888' }}>Лента</span>
          <span onClick={() => setView('people')} style={{ cursor: 'pointer', color: view==='people'?'#fff':'#888' }}>Люди</span>
          <span onClick={() => setView('music')} style={{ cursor: 'pointer', color: view==='music'?'#fff':'#888' }}>Музыка</span>
          <span onClick={() => setView('profile')} style={{ cursor: 'pointer', color: view==='profile'?'#fff':'#888' }}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={{ ...s.input, border: 'none' }} value={postText} onChange={e => setPostText(e.target.value)} />
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '12px', marginTop: '10px' }} />
              <button onClick={createPost} style={{ ...s.btn, float: 'right' }}>Пост</button>
              <div style={{ clear: 'both' }}></div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{ color: '#0070f3' }}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '8px' }} />}
                <button onClick={() => handleLike(p.id)} style={{ background: 'none', border: '1px solid #444', color: '#fff', borderRadius: '20px', padding: '5px 15px', marginTop: '10px' }}>❤️ {p.likes_count || 0}</button>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <h3>Загрузить музыку</h3>
              <input placeholder="Название песни" style={s.input} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
              <input placeholder="Исполнитель" style={{ ...s.input, marginTop: '10px' }} value={songArtist} onChange={e => setSongArtist(e.target.value)} />
              <input type="file" accept="audio/mp3" onChange={e => setFile(e.target.files?.[0] || null)} style={{ marginTop: '15px' }} />
              <button onClick={uploadMusic} disabled={loading} style={{ ...s.btn, width: '100%', marginTop: '15px' }}>{loading ? 'Загрузка...' : 'Добавить в плейлист'}</button>
            </div>
            {songs.map(sng => (
              <div key={sng.id} style={s.card}>
                <div style={{ marginBottom: '10px' }}>
                  <b>{sng.title}</b> — <span style={{ color: '#888' }}>{sng.artist}</span>
                </div>
                <audio controls src={sng.url} style={{ width: '100%' }} />
              </div>
            ))}
          </>
        )}

        {view === 'profile' && (
          <div style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#333', margin: '0 auto 10px', overflow: 'hidden' }}>
              {myAvatar && <img src={myAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <h3>@{myNick}</h3>
            <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ ...s.btn, background: 'red', color: '#fff' }}>Выйти</button>
          </div>
        )}

        {view === 'chat' && (
          <div style={{ ...s.card, height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map(m => (
                <div key={m.id} style={{ textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '10px 0' }}>
                  <div style={{ background: m.sender_name === myNick ? '#fff' : '#333', color: m.sender_name === myNick ? '#000' : '#fff', padding: '8px 12px', borderRadius: '12px', display: 'inline-block' }}>{m.content}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key==='Enter' && sendMsg()} />
              <button onClick={sendMsg} style={s.btn}>→</button>
            </div>
          </div>
        )}

        {view === 'people' && (
          allUsers.map(u => (
            <div key={u.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>@{u.username}</b>
              <button onClick={() => { setChatWith(u.username); setView('chat'); }} style={s.btn}>Чат</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}