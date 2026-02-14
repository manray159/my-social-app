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
  
  // Данные приложения
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]) // Для статуса "В сети"

  // Вводы
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [postText, setPostText] = useState('')
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  // Профиль
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

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
    
    // Канал для статуса "В сети" (Presence)
    const channel = supabase.channel('online-users', {
      config: { presence: { key: myNick } }
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setOnlineUsers(Object.keys(state))
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() })
    })

    return () => { channel.unsubscribe() }
  }, [user, view, searchQuery])

  // --- ЛОГИКА ---
  async function loadProfile(nick: string) {
    const { data } = await supabase.from('profiles').select('*').eq('username', nick).maybeSingle()
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
    setMyAvatar(url); setLoading(false); alert("Профиль обновлен!")
  }

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*, comments(*)').order('created_at', { ascending: false })
    if (data) setPosts(data)
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
    if (!chatWith) return
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_name.eq.${myNick},receiver_name.eq.${chatWith}),and(sender_name.eq.${chatWith},receiver_name.eq.${myNick})`)
      .order('created_at', { ascending: true })
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
    bg: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#161616', border: '1px solid #262626', borderRadius: '16px', padding: '15px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #262626', borderRadius: '10px', color: '#fff', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '10px', padding: '10px 15px', fontWeight: 'bold' as any, cursor: 'pointer' },
    nav: { borderBottom: '1px solid #262626', padding: '15px', display: 'flex', justifyContent: 'space-between', position: 'sticky' as any, top: 0, background: 'rgba(10,10,10,0.9)', zIndex: 10 },
    dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginRight: '5px' }
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
      <nav style={s.nav}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px', fontSize: '14px' }}>
          <span onClick={() => setView('feed')} style={{ color: view==='feed'?'#fff':'#888', cursor:'pointer' }}>Лента</span>
          <span onClick={() => setView('people')} style={{ color: view==='people'?'#fff':'#888', cursor:'pointer' }}>Люди</span>
          <span onClick={() => setView('music')} style={{ color: view==='music'?'#fff':'#888', cursor:'pointer' }}>Музыка</span>
          <span onClick={() => setView('notifs')} style={{ color: view==='notifs'?'#fff':'#888', cursor:'pointer' }}>Уведомления ({notifications.filter(n=>!n.is_read).length})</span>
          <span onClick={() => setView('profile')} style={{ color: view==='profile'?'#fff':'#888', cursor:'pointer' }}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        {view === 'feed' && posts.map(p => (
          <div key={p.id} style={s.card}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                <b style={{color:'#3b82f6'}}>@{p.username}</b>
                {onlineUsers.includes(p.username) && <span style={s.dot}></span>}
            </div>
            <p>{p.text}</p>
            <button onClick={() => handleLike(p)} style={{background:'none', border:'1px solid #333', color:'#fff', borderRadius:'20px', padding:'5px 12px'}}>❤️ {p.likes_count || 0}</button>
            <div style={{marginTop:'15px', borderTop:'1px solid #262626', paddingTop:'10px'}}>
              {p.comments?.map((c: any) => (
                <div key={c.id} style={{fontSize:'13px', marginBottom:'5px'}}><b style={{color:'#888'}}>@{c.username}:</b> {c.content}</div>
              ))}
              <input placeholder="Комментировать..." style={{...s.input, padding:'5px', marginTop:'10px'}} value={commentText[p.id] || ''} onChange={e => setCommentText({...commentText, [p.id]: e.target.value})} onKeyPress={e => e.key==='Enter' && addComment(p)} />
            </div>
          </div>
        ))}

        {view === 'people' && allUsers.map(u => (
          <div key={u.id} style={{...s.card, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{width:'40px', height:'40px', borderRadius:'50%', background:'#262626', overflow:'hidden'}}>
                    {u.avatar_url && <img src={u.avatar_url} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
                </div>
                <b>@{u.username}</b>
                {onlineUsers.includes(u.username) && <span style={s.dot}></span>}
            </div>
            <button onClick={() => {setChatWith(u.username); setView('chat')}} style={s.btn}>Чат</button>
          </div>
        ))}

        {view === 'music' && (
          <>
            <input placeholder="Поиск музыки..." style={s.input} onChange={e => setSearchQuery(e.target.value)} />
            {songs.map(sng => (
              <div key={sng.id} style={{...s.card, display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px'}}>
                <div><b>{sng.title}</b><div style={{color:'#888', fontSize:'12px'}}>{sng.artist}</div></div>
                <audio controls src={sng.url} style={{height:'30px', width:'150px'}} />
              </div>
            ))}
          </>
        )}

        {view === 'notifs' && notifications.map(n => (
          <div key={n.id} style={{...s.card, color: n.is_read ? '#888':'#fff'}}>
            <b>@{n.sender_name}</b> {n.type === 'like' ? 'лайкнул ваш пост' : 'прокомментировал пост'}
          </div>
        ))}

        {view === 'profile' && (
          <div style={{...s.card, textAlign:'center'}}>
            <div style={{width:'100px', height:'100px', borderRadius:'50%', background:'#262626', margin:'0 auto 15px', overflow:'hidden', border:'2px solid #3b82f6'}}>
                {myAvatar && <img src={myAvatar} style={{width:'100%', height:'100%', objectFit:'cover'}} />}
            </div>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{fontSize:'12px'}} />
            <h2 style={{marginTop:'15px'}}>@{myNick}</h2>
            <textarea placeholder="О себе..." style={s.input} value={myBio} onChange={e => setMyBio(e.target.value)} />
            <button onClick={updateProfile} disabled={loading} style={{...s.btn, width:'100%', marginTop:'10px'}}>Сохранить</button>
            <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{...s.btn, background:'#ef4444', color:'#fff', width:'100%', marginTop:'10px'}}>Выход</button>
          </div>
        )}

        {view === 'chat' && (
          <div style={{...s.card, height:'70vh', display:'flex', flexDirection:'column'}}>
            <div style={{flex:1, overflowY:'auto'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin:'10px 0'}}>
                  <div style={{background: m.sender_name === myNick ? '#3b82f6' : '#262626', padding:'8px 12px', borderRadius:'12px', display:'inline-block'}}>{m.content}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key==='Enter' && sendMsg()} />
              <button onClick={sendMsg} style={s.btn}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}