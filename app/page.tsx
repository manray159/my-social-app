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
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([
    { id: 1, title: 'Back In Black', artist: 'AC/DC', url: '#' },
    { id: 2, title: 'Starboy', artist: 'The Weeknd', url: '#' }
  ])

  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [myBio, setMyBio] = useState('Frontend Developer & Creator')

  const myNick = user?.email?.split('@')[0] || ''

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    if (view === 'feed') loadPosts()
    if (view === 'people') loadAllUsers()
    if (view === 'chat' && chatWith) loadMessages()
    if (view === 'notifs') loadNotifications()
  }, [user, view, chatWith])

  // --- ФУНКЦИИ (Твой оригинал) ---
  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if (data) setAllUsers(data.filter(u => u.username !== myNick))
  }

  async function handleLike(post: any) {
    const { error } = await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    if (!error) loadPosts()
  }

  async function loadMessages() {
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

  async function loadNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id)
    if (data) setNotifications(data)
  }

  // --- ДИЗАЙНЕРСКИЕ СТИЛИ ---
  const s = {
    bg: { background: '#050505', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    nav: { 
      display: 'flex', justifyContent: 'space-around', padding: '20px', 
      background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(15px)',
      borderBottom: '1px solid #222', position: 'sticky' as any, top: 0, zIndex: 10 
    },
    card: { 
      background: '#111', padding: '20px', borderRadius: '20px', 
      marginBottom: '15px', border: '1px solid #222', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' 
    },
    btn: { 
      background: 'linear-gradient(135deg, #fff 0%, #ddd 100%)', color: '#000', 
      padding: '10px 20px', borderRadius: '12px', fontWeight: '700', 
      border: 'none', cursor: 'pointer', transition: '0.2s'
    },
    input: { 
      width: '100%', padding: '14px', background: '#1a1a1a', 
      border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '10px',
      outline: 'none'
    },
    navItem: (active: boolean) => ({
      color: active ? '#fff' : '#666',
      fontSize: '18px',
      fontWeight: active ? '700' : '400',
      cursor: 'pointer',
      transition: '0.3s'
    })
  }

  if (!user) return (
    <div style={{...s.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
      <h1 style={{fontSize: '48px', marginBottom: '20px', letterSpacing: '-2px'}}>#HASHTAG</h1>
      <button style={{...s.btn, padding: '15px 40px'}} onClick={() => {
        const nick = prompt("Введите ваш ник:")
        if (nick) setUser({ email: `${nick}@app.com`, id: 'temp-id' })
      }}>Войти в систему</button>
    </div>
  )

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        <span style={s.navItem(view === 'feed')} onClick={() => setView('feed')}>Лента</span>
        <span style={s.navItem(view === 'people')} onClick={() => setView('people')}>Люди</span>
        <span style={s.navItem(view === 'music')} onClick={() => setView('music')}>Музыка</span>
        <span style={s.navItem(view === 'notifs')} onClick={() => setView('notifs')}>🔔</span>
        <span style={s.navItem(view === 'profile')} onClick={() => setView('profile')}>Профиль</span>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' && (
          <>
            <div style={{...s.card, background: 'linear-gradient(to right, #111, #1a1a1a)'}}>
              <textarea 
                placeholder="Поделитесь мыслями..." 
                style={{...s.input, minHeight: '100px', resize: 'none'}} 
                value={postText} 
                onChange={e => setPostText(e.target.value)} 
              />
              <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <button style={s.btn} onClick={async () => {
                  await supabase.from('posts').insert([{ text: postText, username: myNick, user_id: user.id }])
                  setPostText(''); loadPosts()
                }}>Опубликовать</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                  <div style={{width: '40px', height: '40px', borderRadius: '50%', background: '#333', marginRight: '10px'}}></div>
                  <b style={{color: '#fff', fontSize: '16px'}}>@{p.username}</b>
                </div>
                <p style={{fontSize: '18px', lineHeight: '1.5', color: '#ccc'}}>{p.text}</p>
                <button 
                  onClick={() => handleLike(p)} 
                  style={{background: '#222', border: 'none', color: '#fff', borderRadius: '20px', padding: '8px 16px', marginTop: '10px', cursor: 'pointer'}}
                >
                  ❤️ {p.likes_count || 0}
                </button>
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <div style={s.card}>
            <h2 style={{marginBottom: '20px'}}>Плейлист</h2>
            {songs.map(sng => (
              <div key={sng.id} style={{padding: '15px', background: '#1a1a1a', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{fontWeight: '700'}}>{sng.title}</div>
                  <div style={{color: '#666', fontSize: '14px'}}>{sng.artist}</div>
                </div>
                <button style={{background: '#fff', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer'}}>▶️</button>
              </div>
            ))}
          </div>
        )}

        {view === 'people' && (
          <div>
            <h2 style={{marginBottom: '20px'}}>Люди в Hashtag</h2>
            {allUsers.map(u => (
              <div key={u.id} style={{...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{width: '45px', height: '45px', borderRadius: '50%', background: '#333', marginRight: '15px'}}></div>
                  <b>@{u.username}</b>
                </div>
                <button style={s.btn} onClick={() => { setChatWith(u.username); setView('chat') }}>Написать</button>
              </div>
            ))}
          </div>
        )}

        {view === 'chat' && (
          <div style={{...s.card, height: '80vh', display: 'flex', flexDirection: 'column', padding: '0'}}>
            <div style={{padding: '20px', borderBottom: '1px solid #222'}}>
              <h4 style={{margin: 0}}>Чат с @{chatWith}</h4>
            </div>
            <div style={{flex: 1, overflowY: 'auto', padding: '20px'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '12px 0'}}>
                  <span style={{
                    background: m.sender_name === myNick ? '#fff' : '#222', 
                    color: m.sender_name === myNick ? '#000' : '#fff', 
                    padding: '10px 16px', borderRadius: '18px', display: 'inline-block', maxWidth: '80%'
                  }}>
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
            <div style={{padding: '20px', background: '#0a0a0a', borderTop: '1px solid #222', display: 'flex', gap: '10px'}}>
              <input 
                style={{...s.input, marginBottom: 0}} 
                placeholder="Сообщение..."
                value={msgText} 
                onChange={e => setMsgText(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && sendMsg()} 
              />
              <button style={{...s.btn, borderRadius: '50%', width: '50px', height: '50px', padding: 0}} onClick={sendMsg}>🚀</button>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div style={{textAlign: 'center'}}>
            <div style={{...s.card, paddingTop: '40px'}}>
              <div style={{width: '120px', height: '120px', background: 'linear-gradient(45deg, #333, #666)', borderRadius: '50%', margin: '0 auto 20px', border: '4px solid #222'}}></div>
              <h2 style={{margin: '0'}}>@{myNick}</h2>
              <p style={{color: '#666', marginBottom: '30px'}}>{myBio}</p>
              <div style={{display: 'flex', gap: '10px'}}>
                <button style={{...s.btn, flex: 1}}>Редактировать</button>
                <button style={{...s.btn, flex: 1, background: '#ff4b4b', color: '#fff'}} onClick={() => supabase.auth.signOut().then(() => setUser(null))}>Выйти</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 