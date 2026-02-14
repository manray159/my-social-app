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
  const [view, setView] = useState<'feed' | 'chat' | 'profile'>('feed')
  
  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

  // ИСПРАВЛЕННЫЙ EFFECT: убирает красную ошибку в строке 32
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUser(session.user)
        const nick = session.user.email.split('@')[0]
        loadProfile(nick)
      }
    })
    loadPosts()
    const interval = setInterval(() => { if(view === 'chat') loadMessages() }, 3000)
    return () => clearInterval(interval)
  }, [view, chatWith])

  // ИСПРАВЛЕННЫЙ LOADPROFILE: теперь не падает с ошибкой
  async function loadProfile(nick: string) {
    if (!nick) return
    const { data } = await supabase.from('profiles').select('*').eq('username', nick).maybeSingle()
    if (data) {
      setMyBio(data.bio || '')
      setMyAvatar(data.avatar_url || '')
    }
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function loadMessages() {
    if (!user || !chatWith) return
    const myNick = user.email.split('@')[0]
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq.${myNick},receiver_name.eq.${chatWith}),and(sender_name.eq.${chatWith},receiver_name.eq.${myNick})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function handleAuth(type: 'login' | 'signup') {
    setLoading(true)
    const fakeEmail = `${username}@app.com`
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email: fakeEmail, password })
      : await supabase.auth.signUp({ email: fakeEmail, password })
    
    if (error) alert(error.message)
    else {
        setUser(data.user)
        if (type === 'signup') {
            await supabase.from('profiles').insert([{ id: data.user?.id, username: username }])
        }
    }
    setLoading(false)
  }

  async function updateProfile() {
    setLoading(true)
    const myNick = user.email.split('@')[0]
    let avatarUrl = myAvatar

    if (file) {
      const fileName = `avatars/${Date.now()}.png`
      const { data } = await supabase.storage.from('images').upload(fileName, file)
      if (data) avatarUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
    }

    await supabase.from('profiles').upsert({ 
        id: user.id, 
        username: myNick, 
        bio: myBio, 
        avatar_url: avatarUrl 
    })
    setMyAvatar(avatarUrl)
    setFile(null)
    setLoading(false)
    alert("Профиль обновлен!")
  }

  async function addFriend(friendNick: string) {
    const myNick = user.email.split('@')[0]
    if (myNick === friendNick) return
    await supabase.from('friends').insert([{ user_name: myNick, friend_name: friendNick }])
    alert(`@${friendNick} добавлен в друзья!`)
  }

  async function handleLike(postId: string, currentLikes: number) {
    await supabase.from('posts').update({ likes_count: (currentLikes || 0) + 1 }).eq('id', postId)
    loadPosts()
  }

  async function createPost() {
    if (!postText && !file) return
    setLoading(true)
    let imageUrl = ''
    if (file) {
      const fileName = `${Date.now()}.png`
      const { data } = await supabase.storage.from('images').upload(fileName, file)
      if (data) imageUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
    }
    await supabase.from('posts').insert([{ text: postText, username: user.email.split('@')[0], image_url: imageUrl }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false);
  }

  async function sendMsg() {
    if (!msgText || !chatWith) return
    const myNick = user.email.split('@')[0]
    await supabase.from('messages').insert([{ sender_name: myNick, receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages();
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '20px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }
  }

  if (!user) {
    return (
      <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...s.card, width: '320px', textAlign: 'center' }}>
          <h1>#HASHTAG</h1>
          <input placeholder="Ник" style={s.input} value={username} onChange={e => setUsername(e.target.value)} />
          <div style={{ height: '10px' }} />
          <input type="password" placeholder="Пароль" style={s.input} value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ height: '20px' }} />
          <button onClick={() => handleAuth('login')} style={{ ...s.btn, width: '100%' }}>ВОЙТИ</button>
          <p onClick={() => handleAuth('signup')} style={{ color: '#888', fontSize: '12px', cursor: 'pointer', marginTop: '15px' }}>Создать аккаунт</p>
        </div>
      </div>
    )
  }

  const myNick = user.email.split('@')[0]

  return (
    <div style={s.bg}>
      <nav style={{ borderBottom: '1px solid #333', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span onClick={() => setView('feed')} style={{ cursor: 'pointer', color: view==='feed'?'#fff':'#888' }}>Лента</span>
          <span onClick={() => setView('chat')} style={{ cursor: 'pointer', color: view==='chat'?'#fff':'#888' }}>Чаты</span>
          <span onClick={() => setView('profile')} style={{ cursor: 'pointer', color: view==='profile'?'#fff':'#888' }}>Профиль</span>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ background: '#222', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px' }}>Выход</button>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '30px auto', padding: '0 15px' }}>
        {view === 'feed' && (
          <>
            <div style={{ ...s.card, marginBottom: '20px' }}>
              <textarea placeholder="Что нового?" style={{ ...s.input, height: '70px', border: 'none' }} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <label style={{ color: '#888', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  🖼️ Фото
                </label>
                <button onClick={createPost} disabled={loading} style={s.btn}>Поделиться</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={{ ...s.card, marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#0070f3', fontWeight: 'bold' }}>@{p.username}</div>
                    <button onClick={() => addFriend(p.username)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px' }}>+ в друзья</button>
                </div>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '8px' }} alt="" />}
                <button onClick={() => handleLike(p.id, p.likes_count)} style={{ background: 'none', border: '1px solid #333', color: '#fff', borderRadius: '20px', padding: '5px 10px', marginTop: '10px' }}>❤️ {p.likes_count || 0}</button>
              </div>
            ))}
          </>
        )}

        {view === 'profile' && (
          <div style={s.card}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#333', margin: '0 auto 15px', overflow: 'hidden', border: '2px solid #fff' }}>
                    {myAvatar ? <img src={myAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : null}
                </div>
                <h3>@{myNick}</h3>
            </div>
            <label style={{ fontSize: '12px', color: '#888' }}>О себе:</label>
            <textarea style={{ ...s.input, height: '80px', marginTop: '5px' }} value={myBio} onChange={e => setMyBio(e.target.value)} />
            <div style={{ marginTop: '15px' }}>
                <label style={{ ...s.btn, display: 'inline-block', marginRight: '10px', cursor: 'pointer' }}>
                    Изменить фото
                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
                <button onClick={updateProfile} disabled={loading} style={s.btn}>Сохранить</button>
            </div>
          </div>
        )}

        {view === 'chat' && (
            <div style={{ ...s.card, height: '70vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #333' }}>
                    <input placeholder="Ник собеседника" style={s.input} value={chatWith} onChange={e => setChatWith(e.target.value)} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {messages.map(m => (
                        <div key={m.id} style={{ 
                            alignSelf: m.sender_name === myNick ? 'flex-end' : 'flex-start',
                            background: m.sender_name === myNick ? '#fff' : '#222',
                            color: m.sender_name === myNick ? '#000' : '#fff',
                            padding: '8px 14px', borderRadius: '15px', maxWidth: '80%', fontSize: '14px'
                        }}>
                            {m.content}
                            <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', padding: '15px', borderTop: '1px solid #333', gap: '10px' }}>
                    <input placeholder="Текст..." style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
                    <button onClick={sendMsg} style={s.btn}>→</button>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}