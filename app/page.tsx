'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'music' | 'notifs'>('feed')
  const [loading, setLoading] = useState(false)
  
  // Данные
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])

  // Состояния ввода
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [postText, setPostText] = useState('')
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const myNick = user?.email?.split('@')[0] || ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })
  }, [])

  useEffect(() => {
    loadPosts()
    loadNotifications()
    if (view === 'people') loadAllUsers()
    if (view === 'music') loadMusic()
    
    let interval: any
    if (view === 'chat' && chatWith) {
      loadMessages()
      interval = setInterval(loadMessages, 3000)
    }
    return () => clearInterval(interval)
  }, [view, chatWith, searchQuery])

  // --- УВЕДОМЛЕНИЯ ---
  async function loadNotifications() {
    if (!user) return
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotifications(data)
  }

  async function createNotification(receiverId: string, type: 'like' | 'comment', postId: string) {
    if (!user || user.id === receiverId) return // Не уведомлять самого себя
    await supabase.from('notifications').insert([{
      receiver_id: receiverId,
      sender_name: myNick,
      type: type,
      post_id: postId
    }])
  }

  async function markNotifsRead() {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('receiver_id', user.id)
    loadNotifications()
  }

  // --- ЛЕНТА И ЛАЙКИ ---
  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*, comments(*)').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function handleLike(post: any) {
    if (!user) return
    const { data: ex } = await supabase.from('post_likes').select('*').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
    if (ex) return alert("Уже лайкнуто")
    
    await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
    await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    
    // Создаем уведомление
    await createNotification(post.user_id, 'like', post.id)
    loadPosts()
  }

  async function addComment(post: any) {
    const text = commentText[post.id]
    if (!text || !user) return
    await supabase.from('comments').insert([{ post_id: post.id, user_id: user.id, username: myNick, content: text }])
    
    // Создаем уведомление
    await createNotification(post.user_id, 'comment', post.id)
    
    setCommentText({ ...commentText, [post.id]: '' })
    loadPosts()
  }

  // --- ОСТАЛЬНЫЕ ФУНКЦИИ (Музыка, Чат, Профиль) ---
  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if (data) setAllUsers(data.filter(u => u.id !== user?.id))
  }

  async function loadMusic() {
    let q = supabase.from('music').select('*')
    if (searchQuery) q = q.ilike('title', `%${searchQuery}%`)
    const { data } = await q.order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function loadMessages() {
    if (!user || !chatWith) return
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq.${myNick},receiver_name.eq.${chatWith}),and(sender_name.eq.${chatWith},receiver_name.eq.${myNick})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  async function sendMsg() {
    if (!user || !msgText) return
    await supabase.from('messages').insert([{ sender_name: myNick, receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages()
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

  // --- СТИЛИ ---
  const s = {
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#e5e5e5', fontFamily: 'sans-serif' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 15px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 },
    badge: { background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', marginLeft: '5px' }
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, width: '320px' }}>
        <h2 style={{ textAlign: 'center' }}>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{ ...s.input, marginTop: '10px' }} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{ ...s.btn, width: '100%', marginTop: '20px' }}>Войти</button>
        <p onClick={() => handleAuth('signup')} style={{ color: '#888', textAlign: 'center', cursor: 'pointer', marginTop: '15px', fontSize: '13px' }}>Создать аккаунт</p>
      </div>
    </div>
  )

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div style={s.bg}>
      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px', fontSize: '14px' }}>
          <span onClick={() => setView('feed')} style={{ cursor: 'pointer', color: view === 'feed' ? '#fff' : '#888' }}>Лента</span>
          <span onClick={() => setView('music')} style={{ cursor: 'pointer', color: view === 'music' ? '#fff' : '#888' }}>Музыка</span>
          <span onClick={() => { setView('notifs'); markNotifsRead(); }} style={{ cursor: 'pointer', color: view === 'notifs' ? '#fff' : '#888' }}>
            Уведомления {unreadCount > 0 && <span style={s.badge}>{unreadCount}</span>}
          </span>
          <span onClick={() => setView('profile')} style={{ cursor: 'pointer', color: view === 'profile' ? '#fff' : '#888' }}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        {view === 'feed' && (
          posts.map(p => (
            <div key={p.id} style={s.card}>
              <b style={{ color: '#3b82f6' }}>@{p.username}</b>
              <p>{p.text}</p>
              <button onClick={() => handleLike(p)} style={{ background: 'none', border: '1px solid #333', color: '#fff', borderRadius: '20px', padding: '5px 12px' }}>
                ❤️ {p.likes_count || 0}
              </button>
              
              <div style={{ marginTop: '15px', borderTop: '1px solid #262626', paddingTop: '10px' }}>
                {p.comments?.map((c: any) => (
                  <div key={c.id} style={{ fontSize: '13px', marginBottom: '5px' }}>
                    <b style={{ color: '#888' }}>@{c.username}:</b> {c.content}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                  <input placeholder="Комментировать..." style={{ ...s.input, padding: '5px' }} value={commentText[p.id] || ''} onChange={e => setCommentText({ ...commentText, [p.id]: e.target.value })} />
                  <button onClick={() => addComment(p)} style={s.btn}>→</button>
                </div>
              </div>
            </div>
          ))
        )}

        {view === 'notifs' && (
          <div style={s.card}>
            <h3>Уведомления</h3>
            {notifications.length === 0 && <p style={{ color: '#555' }}>Пока пусто</p>}
            {notifications.map(n => (
              <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid #262626', color: n.is_read ? '#888' : '#fff' }}>
                <b>@{n.sender_name}</b> {n.type === 'like' ? 'лайкнул ваш пост' : 'прокомментировал ваш пост'}
                <div style={{ fontSize: '10px', color: '#555' }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'music' && (
          <>
            <input placeholder="Поиск музыки..." style={s.input} onChange={e => setSearchQuery(e.target.value)} />
            {songs.map(sng => (
              <div key={sng.id} style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <div><b>{sng.title}</b><div style={{ color: '#888', fontSize: '12px' }}>{sng.artist}</div></div>
                <audio controls src={sng.url} style={{ height: '30px', width: '150px' }} />
              </div>
            ))}
          </>
        )}

        {view === 'profile' && (
          <div style={{ ...s.card, textAlign: 'center' }}>
            <h2>@{myNick}</h2>
            <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ ...s.btn, background: '#ef4444', color: '#fff' }}>Выйти</button>
          </div>
        )}
      </div>
    </div>
  )
}