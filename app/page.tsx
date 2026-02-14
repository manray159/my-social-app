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
  const [searchQuery, setSearchQuery] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')
  
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUser(session.user)
        const nick = session.user.email.split('@')[0]
        loadProfile(nick)
      }
    })
    loadPosts()
  }, [])

  useEffect(() => {
    if (view === 'people') loadAllUsers()
    if (view === 'friends') loadFriends()
    if (view === 'music') loadMusic()
    
    let interval: any
    if (view === 'chat' && chatWith) {
      loadMessages()
      interval = setInterval(loadMessages, 3000)
    }
    return () => clearInterval(interval)
  }, [view, chatWith, searchQuery])

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
    if (data && user) setAllUsers(data.filter(u => u.id !== user.id))
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

  async function loadMusic() {
    let q = supabase.from('music').select('*')
    if (searchQuery) q = q.ilike('title', `%${searchQuery}%`)
    const { data } = await q.order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function uploadMusic() {
    if (!file || !songTitle || !user) return alert("Нужен MP3 файл и название")
    setLoading(true)
    const name = `music/${Date.now()}_${file.name}`
    const { data } = await supabase.storage.from('images').upload(name, file)
    if (data) {
      const url = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
      await supabase.from('music').insert([{ title: songTitle, artist: songArtist || 'Неизвестен', url, user_id: user.id }])
      setSongTitle(''); setSongArtist(''); setFile(null); loadMusic()
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
    await supabase.from('posts').insert([{ text: postText, username: user.email?.split('@')[0], image_url: img }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false)
  }

  async function loadMessages() {
    if (!user || !chatWith) return
    const me = user.email?.split('@')[0]
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq.${me},receiver_name.eq.${chatWith}),and(sender_name.eq.${chatWith},receiver_name.eq.${me})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMsg() {
    if (!user || !msgText) return
    await supabase.from('messages').insert([{ sender_name: user.email?.split('@')[0], receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages()
  }

  const s = {
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '20px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '600' as any, cursor: 'pointer', transition: '0.2s' },
    nav: { borderBottom: '1px solid #262626', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky' as any, top: 0, background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, width: '340px', textAlign: 'center' }}>
        <h1 style={{ letterSpacing: '-1px', marginBottom: '25px' }}>#HASHTAG</h1>
        <input placeholder="Имя пользователя" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{ ...s.input, marginTop: '12px' }} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{ ...s.btn, width: '100%', marginTop: '24px' }}>Войти</button>
        <p onClick={() => handleAuth('signup')} style={{ color: '#888', fontSize: '13px', marginTop: '20px', cursor: 'pointer' }}>Ещё нет аккаунта? Зарегистрироваться</p>
      </div>
    </div>
  )

  const myNick = user?.email?.split('@')[0] || ''

  return (
    <div style={s.bg}>
      <nav style={s.nav}>
        <b style={{ fontSize: '20px', letterSpacing: '-1px' }}>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', fontWeight: '500' }}>
          {['feed', 'people', 'friends', 'music', 'profile'].map((item) => (
            <span key={item} onClick={() => setView(item as any)} style={{ cursor: 'pointer', color: view === item ? '#fff' : '#737373', textTransform: 'capitalize' as any }}>
              {item === 'feed' ? 'Лента' : item === 'people' ? 'Люди' : item === 'friends' ? 'Друзья' : item === 'music' ? 'Музыка' : 'Профиль'}
            </span>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: '540px', margin: '20px auto', padding: '0 15px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Поделитесь чем-то новым..." style={{ ...s.input, border: 'none', fontSize: '16px', minHeight: '80px', resize: 'none' as any }} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: '1px solid #262626', paddingTop: '15px' }}>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '12px', color: '#888' }} />
                <button onClick={createPost} style={s.btn}>Опубликовать</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{ color: '#3b82f6' }}>@{p.username}</b>
                <p style={{ lineHeight: '1.5', marginTop: '10px' }}>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '12px', marginTop: '10px' }} />}
                <div style={{ marginTop: '15px' }}>
                  <button onClick={() => handleLike(p.id)} style={{ background: '#262626', border: 'none', color: '#fff', borderRadius: '20px', padding: '6px 16px', fontSize: '13px' }}>❤️ {p.likes_count || 0}</button>
                </div>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <h3 style={{ marginTop: 0 }}>Музыка</h3>
              <input placeholder="Поиск треков..." style={s.input} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <div style={{ marginTop: '15px', padding: '15px', background: '#000', borderRadius: '12px' }}>
                <p style={{ fontSize: '13px', marginBottom: '10px' }}>Загрузить свой MP3:</p>
                <input placeholder="Название" style={{ ...s.input, marginBottom: '8px' }} value={songTitle} onChange={e => setSongTitle(e.target.value)} />
                <input placeholder="Артист" style={{ ...s.input, marginBottom: '12px' }} value={songArtist} onChange={e => setSongArtist(e.target.value)} />
                <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
                <button onClick={uploadMusic} disabled={loading} style={{ ...s.btn, width: '100%', marginTop: '15px' }}>Добавить трек</button>
              </div>
            </div>
            {songs.map(sng => (
              <div key={sng.id} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{sng.title}</div>
                  <div style={{ color: '#737373', fontSize: '13px' }}>{sng.artist}</div>
                </div>
                <audio controls src={sng.url} style={{ height: '32px', width: '180px' }} />
              </div>
            ))}
          </>
        )}

        {view === 'profile' && (
          <div style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#262626', margin: '0 auto 15px', overflow: 'hidden', border: '3px solid #3b82f6' }}>
              {myAvatar && <img src={myAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <h2 style={{ margin: '0' }}>@{myNick}</h2>
            <p style={{ color: '#888', marginTop: '5px' }}>{myBio || 'Нет описания'}</p>
            <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button style={s.btn}>Редактировать профиль</button>
              <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ ...s.btn, background: '#dc2626', color: '#fff' }}>Выйти</button>
            </div>
          </div>
        )}

        {view === 'people' && (
          allUsers.map(u => (
            <div key={u.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626' }}></div>
                <b>@{u.username}</b>
              </div>
              <button onClick={() => { setChatWith(u.username); setView('chat'); }} style={{ ...s.btn, background: '#262626', color: '#fff', fontSize: '13px' }}>Сообщение</button>
            </div>
          ))
        )}

        {view === 'chat' && (
          <div style={{ ...s.card, height: '75vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #262626', fontWeight: '600' }}>Чат с @{chatWith}</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '12px 0' }}>
                  <div style={{ background: m.sender_name === myNick ? '#3b82f6' : '#262626', color: '#fff', padding: '10px 16px', borderRadius: '18px', display: 'inline-block', maxWidth: '80%', fontSize: '15px' }}>{m.content}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '15px', borderTop: '1px solid #262626', display: 'flex', gap: '10px' }}>
              <input style={s.input} placeholder="Сообщение..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              <button onClick={sendMsg} style={{ ...s.btn, borderRadius: '50%', width: '45px', padding: '0' }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}