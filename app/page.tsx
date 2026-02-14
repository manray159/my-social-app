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
  const [view, setView] = useState<'feed' | 'chat' | 'profile' | 'people' | 'friends'>('feed')
  
  const [postText, setPostText] = useState('')
  const [chatWith, setChatWith] = useState('')
  const [msgText, setMsgText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [myBio, setMyBio] = useState('')
  const [myAvatar, setMyAvatar] = useState('')

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
    const interval = setInterval(() => { if(view === 'chat') loadMessages() }, 3000)
    return () => clearInterval(interval)
  }, [view, chatWith])

  async function loadProfile(nick: string) {
    if (!nick) return
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

  async function handleLike(postId: string) {
    if (!user) return
    const { data: existing } = await supabase.from('post_likes').select('*').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
    if (existing) return alert("Вы уже поставили лайк!")

    await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }])
    const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).single()
    await supabase.from('posts').update({ likes_count: (post?.likes_count || 0) + 1 }).eq('id', postId)
    loadPosts()
  }

  async function addFriend(friendId: string) {
    if (!user) return
    await supabase.from('friends').upsert([{ user_id: user.id, friend_id: friendId }])
    alert("Добавлен в друзья!")
  }

  async function openChat(nick: string) {
    setChatWith(nick)
    setView('chat')
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
      if (type === 'signup') await supabase.from('profiles').insert([{ id: data.user?.id, username: username }])
    }
    setLoading(false)
  }

  async function createPost() {
    if (!user || (!postText && !file)) return
    setLoading(true)
    let imageUrl = ''
    if (file) {
      const fileName = `posts/${Date.now()}.png`
      const { data } = await supabase.storage.from('images').upload(fileName, file)
      if (data) imageUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
    }
    await supabase.from('posts').insert([{ text: postText, username: user.email.split('@')[0], image_url: imageUrl }])
    setPostText(''); setFile(null); loadPosts(); setLoading(false)
  }

  async function updateProfile() {
    if (!user) return
    setLoading(true)
    let avatarUrl = myAvatar
    if (file) {
      const fileName = `avatars/${user.id}.png`
      const { data } = await supabase.storage.from('images').upload(fileName, file, { upsert: true })
      if (data) avatarUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl
    }
    await supabase.from('profiles').update({ bio: myBio, avatar_url: avatarUrl }).eq('id', user.id)
    setMyAvatar(avatarUrl); setFile(null); setLoading(false); alert("Обновлено!")
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

  async function sendMsg() {
    if (!user || !msgText || !chatWith) return
    const myNick = user.email.split('@')[0]
    await supabase.from('messages').insert([{ sender_name: myNick, receiver_name: chatWith, content: msgText }])
    setMsgText(''); loadMessages()
  }

  const s = {
    bg: { background: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    card: { background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '15px' },
    input: { width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' as any },
    btn: { background: '#fff', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 15px', fontWeight: 'bold', cursor: 'pointer' },
    navItem: (active: boolean) => ({ cursor: 'pointer', color: active ? '#fff' : '#888', fontSize: '14px' })
  }

  if (!user) return (
    <div style={{ ...s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...s.card, width: '300px', textAlign: 'center' }}>
        <h2>#HASHTAG</h2>
        <input placeholder="Ник" style={s.input} value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Пароль" style={{ ...s.input, marginTop: '10px' }} value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={() => handleAuth('login')} style={{ ...s.btn, width: '100%', marginTop: '20px' }}>ВОЙТИ</button>
        <p onClick={() => handleAuth('signup')} style={{ color: '#888', fontSize: '11px', marginTop: '15px', cursor: 'pointer' }}>Создать аккаунт</p>
      </div>
    </div>
  )

  const UserList = ({ list }: { list: any[] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {list.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>Тут пусто</p>}
      {list.map(u => (
        <div key={u.id} style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', overflow: 'hidden' }}>
              {u.avatar_url && <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
            </div>
            <b>@{u.username}</b>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => addFriend(u.id)} style={{ ...s.btn, padding: '5px 10px', fontSize: '12px' }}>+ Друг</button>
            <button onClick={() => openChat(u.username)} style={{ ...s.btn, background: '#222', color: '#fff', padding: '5px 10px', fontSize: '12px' }}>💬</button>
          </div>
        </div>
      ))}
    </div>
  )

  const myNick = user?.email?.split('@')[0] || ''

  return (
    <div style={s.bg}>
      <nav style={{ borderBottom: '1px solid #333', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#000', zIndex: 10 }}>
        <b>#HASHTAG</b>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span onClick={() => setView('feed')} style={s.navItem(view==='feed')}>Лента</span>
          <span onClick={() => setView('people')} style={s.navItem(view==='people')}>Люди</span>
          <span onClick={() => setView('friends')} style={s.navItem(view==='friends')}>Друзья</span>
          <span onClick={() => setView('profile')} style={s.navItem(view==='profile')}>Профиль</span>
        </div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '20px auto', padding: '0 10px' }}>
        {view === 'feed' && (
          <>
            <div style={{ ...s.card, marginBottom: '20px' }}>
              <textarea placeholder="Что нового?" style={{ ...s.input, height: '60px', border: 'none' }} value={postText} onChange={e => setPostText(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ fontSize: '12px' }} />
                <button onClick={createPost} disabled={loading} style={s.btn}>Пост</button>
              </div>
            </div>
            {posts.map(p => (
              <div key={p.id} style={{ ...s.card, marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold', color: '#0070f3', marginBottom: '10px' }}>@{p.username}</div>
                <p>{p.text}</p>
                {p.image_url && <img src={p.image_url} style={{ width: '100%', borderRadius: '8px' }} alt="" />}
                <button onClick={() => handleLike(p.id)} style={{ background: 'none', border: '1px solid #333', color: '#fff', borderRadius: '20px', padding: '5px 15px', marginTop: '10px' }}>❤️ {p.likes_count || 0}</button>
              </div>
            ))}
          </>
        )}

        {view === 'people' && <UserList list={allUsers} />}
        {view === 'friends' && <UserList list={friendsList} />}
        
        {view === 'profile' && (
          <div style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#333', margin: '0 auto 10px', overflow: 'hidden', border: '2px solid #fff' }}>
              {myAvatar && <img src={myAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
            </div>
            <h3>@{myNick}</h3>
            <textarea style={s.input} value={myBio} onChange={e => setMyBio(e.target.value)} placeholder="О себе..." />
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ marginTop: '15px', fontSize: '12px' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={updateProfile} disabled={loading} style={{ ...s.btn, flex: 1 }}>Сохранить</button>
              <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} style={{ ...s.btn, background: 'red', color: '#fff' }}>Выйти</button>
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div style={{ ...s.card, height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Чат с <b>@{chatWith}</b></div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ textAlign: m.sender_name === myNick ? 'right' : 'left', margin: '5px 0' }}>
                  <div style={{ display: 'inline-block', background: m.sender_name === myNick ? '#fff' : '#333', color: m.sender_name === myNick ? '#000' : '#fff', padding: '8px 12px', borderRadius: '12px', fontSize: '14px' }}>{m.content}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
              <input style={s.input} value={msgText} onChange={e => setMsgText(e.target.value)} onKeyPress={e => e.key==='Enter' && sendMsg()} />
              <button onClick={sendMsg} style={s.btn}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}