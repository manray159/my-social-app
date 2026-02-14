'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'music'>('feed')
  const [posts, setPosts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  
  // Поля ввода для постов
  const [postText, setPostText] = useState('')
  const [postImg, setPostImg] = useState('')
  
  // Поля ввода для музыки
  const [songs, setSongs] = useState([
    { id: 1, title: 'Back In Black', artist: 'AC/DC' },
    { id: 2, title: 'Starboy', artist: 'The Weeknd' }
  ])
  const [newSongTitle, setNewSongTitle] = useState('')
  const [newSongArtist, setNewSongArtist] = useState('')

  // Поля для чата
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')

  const myNick = user?.email?.split('@')[0] || 'Аноним'

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
  }, [user, view, chatWith])

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*')
    if (data) setAllUsers(data.filter(u => u.username !== myNick))
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

  const addSong = () => {
    if (!newSongTitle || !newSongArtist) return
    const newSong = { id: Date.now(), title: newSongTitle, artist: newSongArtist }
    setSongs([...songs, newSong])
    setNewSongTitle(''); setNewSongArtist('')
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '15px', borderBottom: '1px solid #222', sticky: 'top', background: '#000', cursor: 'pointer' },
    card: { background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #222' },
    btn: { background: '#fff', color: '#000', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' },
    input: { width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginBottom: '10px' }
  }

  if (!user) return (
    <div style={{...s.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <h1 style={{fontSize: '50px', marginBottom: '20px'}}>#HASHTAG</h1>
      <button style={s.btn} onClick={() => {
        const nick = prompt("Твой ник:")
        if (nick) setUser({ email: `${nick}@app.com` })
      }}>Войти</button>
    </div>
  )

  return (
    <div style={s.bg}>
      <header style={s.nav}>
        <span onClick={() => setView('feed')}>Лента</span>
        <span onClick={() => setView('people')}>Люди</span>
        <span onClick={() => setView('music')}>Музыка</span>
        <span onClick={() => setView('profile')}>Профиль</span>
      </header>

      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
        {view === 'feed' && (
          <>
            <div style={s.card}>
              <textarea placeholder="Что нового?" style={s.input} value={postText} onChange={e => setPostText(e.target.value)} />
              <input placeholder="Ссылка на фото" style={s.input} value={postImg} onChange={e => setPostImg(e.target.value)} />
              <button style={s.btn} onClick={async () => {
                await supabase.from('posts').insert([{ text: postText, image_url: postImg, username: myNick }])
                setPostText(''); setPostImg(''); loadPosts()
              }}>Опубликовать</button>
            </div>
            {posts.map(p => (
              <div key={p.id} style={s.card}>
                <b style={{color: '#0070f3'}}>@{p.username}</b>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{width: '100%', borderRadius: '10px', marginTop: '10px'}} />}
              </div>
            ))}
          </>
        )}

        {view === 'music' && (
          <>
            <div style={s.card}>
              <h4>Добавить музыку</h4>
              <input placeholder="Название трека" style={s.input} value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} />
              <input placeholder="Исполнитель" style={s.input} value={newSongArtist} onChange={e => setNewSongArtist(e.target.value)} />
              <button style={s.btn} onClick={addSong}>Добавить в список</button>
            </div>
            <div style={s.card}>
              <h3>Твой плейлист</h3>
              {songs.map(song => (
                <div key={song.id} style={{padding: '10px 0', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between'}}>
                  <span>{song.title} — {song.artist}</span>
                  <button style={{background: 'none', border: 'none', color: '#0070f3'}}>▶️</button>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'people' && allUsers.map(u => (
          <div key={u.id} style={{...s.card, display: 'flex', justifyContent: 'space-between'}}>
            <b>@{u.username}</b>
            <button style={s.btn} onClick={() => { setChatWith(u.username); setView('chat') }}>Чат</button>
          </div>
        ))}

        {view === 'chat' && (
          <div style={{...s.card, height: '70vh', display: 'flex', flexDirection: 'column'}}>
            <h4>Чат с {chatWith}</h4>
            <div style={{flex: 1, overflowY: 'auto'}}>
              {messages.map(m => (
                <div key={m.id} style={{textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '10px 0'}}>
                  <span style={{background: m.sender_name === myNick ? '#0070f3' : '#333', padding: '8px 12px', borderRadius: '15px'}}>
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
            <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
              <input style={{...s.input, marginBottom: 0}} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMsg()} />
              <button style={s.btn} onClick={sendMsg}>→</button>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div style={{...s.card, textAlign: 'center'}}>
            <h2>@{myNick}</h2>
            <button style={{...s.btn, background: 'red', color: '#fff', width: '100%', marginTop: '20px'}} onClick={() => setUser(null)}>Выйти</button>
          </div>
        )}
      </main>
    </div>
  )
}