'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type View = 'feed' | 'music' | 'profile' | 'messages'
type Post = {
  id: string
  text: string
  image_url: string
  username: string
  user_id: string
  likes_count: number
  created_at: string
  comments: Comment[]
  post_likes: { user_id: string }[]
}
type Comment = { id: string; text: string; username: string; user_id: string }
type Song = { id: string; title: string; artist: string; url: string }
type Profile = { username: string; avatar_url: string; bio: string }
type Message = { id: string; text: string; from_id: string; to_id: string; created_at: string; from_username: string }

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [view, setView] = useState<View>('feed')
  const [posts, setPosts] = useState<Post[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [profile, setProfile] = useState<Profile>({ username: '', avatar_url: '', bio: '' })
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({})
  const [openComments, setOpenComments] = useState<{ [key: string]: boolean }>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [contacts, setContacts] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── AUTH ───────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleAuth() {
    setAuthError('')
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthError(error.message)
      else setAuthError('Проверь почту для подтверждения!')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  // ─── PROFILE ─────────────────────────────────────────
  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile(data)
  }

  async function saveProfile() {
    await supabase.from('profiles').upsert({ id: user.id, ...profile })
  }

  async function handleAvatarUpload(file: File) {
    const name = `avatars/${user.id}_${Date.now()}`
    await supabase.storage.from('images').upload(name, file, { upsert: true })
    const url = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
    setProfile(p => ({ ...p, avatar_url: url }))
  }

  // ─── DATA LOADING ─────────────────────────────────────
  useEffect(() => {
    if (user) loadData()
  }, [user, view])

  async function loadData() {
    if (view === 'feed') {
      const { data } = await supabase
        .from('posts')
        .select('*, comments(*), post_likes(user_id)')
        .order('created_at', { ascending: false })
      setPosts((data as Post[]) || [])
    }
    if (view === 'music') {
      const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false })
      setSongs((data as Song[]) || [])
    }
    if (view === 'messages') {
      loadContacts()
    }
  }

  // ─── POSTS ───────────────────────────────────────────
  async function handlePublish() {
    if (!postText.trim() && !selectedFile) return
    setUploading(true)
    let imageUrl = ''
    if (selectedFile) {
      const name = `posts/${Date.now()}_${selectedFile.name}`
      await supabase.storage.from('images').upload(name, selectedFile)
      imageUrl = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
    }
    await supabase.from('posts').insert([{
      text: postText,
      image_url: imageUrl,
      username: profile.username || user.email?.split('@')[0],
      user_id: user.id
    }])
    setPostText('')
    setSelectedFile(null)
    setUploading(false)
    loadData()
  }

  async function handleLike(post: Post) {
    const myLike = post.post_likes?.find(l => l.user_id === user.id)
    if (myLike) {
      await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: user.id })
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
      await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
    }
    loadData()
  }

  async function addComment(postId: string) {
    const text = commentInputs[postId]
    if (!text?.trim()) return
    await supabase.from('comments').insert([{
      post_id: postId,
      text,
      username: profile.username || 'User',
      user_id: user.id
    }])
    setCommentInputs(c => ({ ...c, [postId]: '' }))
    loadData()
  }

  async function deletePost(postId: string) {
    await supabase.from('post_likes').delete().eq('post_id', postId)
    await supabase.from('comments').delete().eq('post_id', postId)
    await supabase.from('posts').delete().eq('id', postId)
    loadData()
  }

  // ─── MESSAGES ────────────────────────────────────────
  async function loadContacts() {
    const { data } = await supabase.from('profiles').select('*').neq('id', user.id)
    setContacts(data || [])
  }

  async function loadMessages(contactId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(from_id.eq.${user.id},to_id.eq.${contactId}),and(from_id.eq.${contactId},to_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function sendMessage() {
    if (!msgText.trim() || !activeChat) return
    await supabase.from('messages').insert([{
      text: msgText,
      from_id: user.id,
      to_id: activeChat.id,
      from_username: profile.username || user.email?.split('@')[0]
    }])
    setMsgText('')
    loadMessages(activeChat.id)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })
  }

  // ─── AUTH SCREEN ──────────────────────────────────────
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0e1621',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'SF Pro Display', -apple-system, sans-serif"
      }}>
        <div style={{
          background: '#17212b',
          borderRadius: '20px',
          padding: '48px 40px',
          width: '360px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '72px', height: '72px',
              background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px'
            }}>✈️</div>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: 0 }}>Hashtag</h1>
            <p style={{ color: '#708499', fontSize: '14px', marginTop: '6px' }}>
              {authMode === 'login' ? 'Войди в свой аккаунт' : 'Создай аккаунт'}
            </p>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{ ...inputStyle, marginBottom: '20px' }}
          />

          {authError && (
            <p style={{ color: authError.includes('почту') ? '#4ade80' : '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>
              {authError}
            </p>
          )}

          <button onClick={handleAuth} style={primaryBtnStyle}>
            {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>

          <p style={{ color: '#708499', textAlign: 'center', fontSize: '14px', marginTop: '16px' }}>
            {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <span
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}
              style={{ color: '#2ea6ff', cursor: 'pointer' }}
            >
              {authMode === 'login' ? 'Регистрация' : 'Войти'}
            </span>
          </p>
        </div>
      </div>
    )
  }

  // ─── MAIN APP ─────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e1621',
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      color: '#fff'
    }}>

      {/* Sidebar */}
      <div style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: '260px',
        background: '#17212b',
        borderRight: '1px solid #0d1b29',
        display: 'flex', flexDirection: 'column',
        zIndex: 100
      }}>
        {/* User info */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid #0d1b29',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: '700'
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.username?.[0] || user.email?.[0] || '?').toUpperCase()
            }
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: '600', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.username || user.email?.split('@')[0]}
            </div>
            <div style={{ color: '#4ade80', fontSize: '12px' }}>● онлайн</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {([
            { id: 'feed', icon: '📰', label: 'Лента' },
            { id: 'messages', icon: '💬', label: 'Сообщения' },
            { id: 'music', icon: '🎵', label: 'Музыка' },
            { id: 'profile', icon: '👤', label: 'Профиль' },
          ] as { id: View; icon: string; label: string }[]).map(item => (
            <div
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                cursor: 'pointer',
                borderRadius: '8px',
                margin: '2px 8px',
                background: view === item.id ? 'rgba(46,166,255,0.15)' : 'transparent',
                color: view === item.id ? '#2ea6ff' : '#aab8c2',
                transition: 'all 0.15s',
                fontSize: '15px'
              }}
            >
              <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '10px',
            background: 'rgba(248,113,113,0.1)',
            color: '#f87171',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '10px',
            cursor: 'pointer', fontSize: '14px', fontWeight: '600'
          }}>
            Выйти
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: '260px', minHeight: '100vh' }}>

        {/* ── FEED ── */}
        {view === 'feed' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>

            {/* Post composer */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={avatarSmall}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile.username?.[0] || '?').toUpperCase()
                  }
                </div>
                <textarea
                  placeholder="Что у тебя нового?"
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  rows={3}
                  style={{
                    flex: 1, background: '#0e1621', border: '1px solid #2b3d4f',
                    color: '#fff', borderRadius: '12px', padding: '12px',
                    fontSize: '15px', resize: 'none', outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: '#708499', fontSize: '14px', cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '20px' }}>📎</span>
                  <span>{selectedFile ? selectedFile.name : 'Прикрепить фото'}</span>
                  <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
                <button
                  onClick={handlePublish}
                  disabled={uploading}
                  style={{ ...primaryBtnStyle, padding: '8px 20px', width: 'auto' }}
                >
                  {uploading ? '...' : 'Опубликовать'}
                </button>
              </div>
            </div>

            {/* Posts */}
            {posts.map(post => {
              const liked = post.post_likes?.some(l => l.user_id === user.id)
              const commentsOpen = openComments[post.id]
              return (
                <div key={post.id} style={cardStyle}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={avatarSmall}>
                        {(post.username?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '15px' }}>@{post.username}</div>
                        <div style={{ color: '#708499', fontSize: '12px' }}>{formatDate(post.created_at)}</div>
                      </div>
                    </div>
                    {post.user_id === user.id && (
                      <button
                        onClick={() => deletePost(post.id)}
                        style={{ background: 'none', border: 'none', color: '#708499', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                      >🗑</button>
                    )}
                  </div>

                  {/* Content */}
                  {post.text && <p style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '12px', color: '#e8f0f7' }}>{post.text}</p>}
                  {post.image_url && (
                    <img src={post.image_url} style={{
                      width: '100%', borderRadius: '12px', marginBottom: '12px',
                      maxHeight: '400px', objectFit: 'cover'
                    }} />
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #1e2d3d' }}>
                    <button
                      onClick={() => handleLike(post)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: liked ? '#f87171' : '#708499',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '14px', padding: '4px 8px', borderRadius: '8px',
                        transition: 'all 0.15s'
                      }}
                    >
                      {liked ? '❤️' : '🤍'} {post.likes_count || 0}
                    </button>
                    <button
                      onClick={() => setOpenComments(c => ({ ...c, [post.id]: !c[post.id] }))}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#708499', display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '14px', padding: '4px 8px', borderRadius: '8px'
                      }}
                    >
                      💬 {post.comments?.length || 0}
                    </button>
                  </div>

                  {/* Comments */}
                  {commentsOpen && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #1e2d3d', paddingTop: '12px' }}>
                      {post.comments?.map(c => (
                        <div key={c.id} style={{
                          display: 'flex', gap: '8px', marginBottom: '8px',
                          background: '#1e2d3d', borderRadius: '10px', padding: '8px 12px'
                        }}>
                          <span style={{ color: '#2ea6ff', fontWeight: '600', fontSize: '13px' }}>@{c.username}</span>
                          <span style={{ color: '#c8d8e8', fontSize: '14px' }}>{c.text}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          placeholder="Написать комментарий..."
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(c => ({ ...c, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addComment(post.id)}
                          style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: '14px', padding: '8px 12px' }}
                        />
                        <button
                          onClick={() => addComment(post.id)}
                          style={{ ...primaryBtnStyle, padding: '8px 16px', width: 'auto' }}
                        >→</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── MESSAGES ── */}
        {view === 'messages' && (
          <div style={{ display: 'flex', height: '100vh' }}>
            {/* Contact list */}
            <div style={{
              width: '280px', borderRight: '1px solid #1e2d3d',
              background: '#17212b', overflowY: 'auto'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #1e2d3d' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Сообщения</h2>
              </div>
              {contacts.length === 0 && (
                <p style={{ color: '#708499', padding: '20px', textAlign: 'center', fontSize: '14px' }}>
                  Нет других пользователей
                </p>
              )}
              {contacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => { setActiveChat(contact); loadMessages(contact.id) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', cursor: 'pointer',
                    background: activeChat?.id === contact.id ? 'rgba(46,166,255,0.1)' : 'transparent',
                    borderLeft: activeChat?.id === contact.id ? '3px solid #2ea6ff' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ ...avatarSmall, flexShrink: 0 }}>
                    {contact.avatar_url
                      ? <img src={contact.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (contact.username?.[0] || '?').toUpperCase()
                    }
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {contact.username || 'Пользователь'}
                    </div>
                    <div style={{ color: '#708499', fontSize: '12px' }}>{contact.bio || 'нет статуса'}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!activeChat ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#708499', fontSize: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                    <p>Выбери чат, чтобы начать общение</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div style={{
                    padding: '16px 20px', borderBottom: '1px solid #1e2d3d',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#17212b'
                  }}>
                    <div style={avatarSmall}>
                      {activeChat.avatar_url
                        ? <img src={activeChat.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (activeChat.username?.[0] || '?').toUpperCase()
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px' }}>{activeChat.username || 'Пользователь'}</div>
                      <div style={{ color: '#4ade80', fontSize: '12px' }}>● онлайн</div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {messages.map(msg => {
                      const mine = msg.from_id === user.id
                      return (
                        <div key={msg.id} style={{
                          display: 'flex',
                          justifyContent: mine ? 'flex-end' : 'flex-start',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            maxWidth: '70%',
                            background: mine ? 'linear-gradient(135deg, #2ea6ff, #1a8fd1)' : '#17212b',
                            color: '#fff',
                            borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            padding: '10px 14px',
                            fontSize: '15px',
                            lineHeight: '1.4',
                            border: mine ? 'none' : '1px solid #2b3d4f'
                          }}>
                            <p style={{ margin: 0 }}>{msg.text}</p>
                            <p style={{
                              margin: '4px 0 0',
                              fontSize: '11px',
                              opacity: 0.7,
                              textAlign: 'right'
                            }}>{formatTime(msg.created_at)}</p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message input */}
                  <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #1e2d3d',
                    background: '#17212b',
                    display: 'flex', gap: '10px', alignItems: 'center'
                  }}>
                    <input
                      placeholder="Написать сообщение..."
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                    <button onClick={sendMessage} style={{
                      width: '44px', height: '44px',
                      background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)',
                      border: 'none', borderRadius: '50%',
                      color: '#fff', fontSize: '18px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>➤</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── MUSIC ── */}
        {view === 'music' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>🎵 Музыка</h2>
            {songs.length === 0 && (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#708499' }}>
                Треков пока нет
              </div>
            )}
            {songs.map((song, i) => (
              <div key={song.id} style={{
                ...cardStyle,
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: `linear-gradient(135deg, hsl(${i * 60}, 70%, 40%), hsl(${i * 60 + 40}, 70%, 30%))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', flexShrink: 0
                  }}>🎵</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title}
                    </div>
                    <div style={{ color: '#708499', fontSize: '13px' }}>{song.artist}</div>
                  </div>
                </div>
                {song.url && (
                  <audio
                    controls
                    src={song.url}
                    style={{ width: '100%', height: '36px', accentColor: '#2ea6ff' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PROFILE ── */}
        {view === 'profile' && (
          <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px' }}>👤 Профиль</h2>
            <div style={cardStyle}>
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '100px', height: '100px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '40px', fontWeight: '700', marginBottom: '12px',
                  border: '3px solid #2ea6ff'
                }}>
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (profile.username?.[0] || user.email?.[0] || '?').toUpperCase()
                  }
                </div>
                <label style={{
                  color: '#2ea6ff', fontSize: '14px', cursor: 'pointer',
                  padding: '6px 14px', border: '1px solid #2ea6ff',
                  borderRadius: '20px'
                }}>
                  Изменить фото
                  <input
                    type="file" accept="image/*"
                    onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <label style={labelStyle}>Имя пользователя</label>
              <input
                placeholder="@username"
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                style={inputStyle}
              />

              <label style={labelStyle}>О себе</label>
              <textarea
                placeholder="Расскажи о себе..."
                value={profile.bio}
                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'none', fontFamily: 'inherit'
                }}
              />

              <label style={labelStyle}>Email</label>
              <input
                value={user.email}
                disabled
                style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
              />

              <button onClick={saveProfile} style={{ ...primaryBtnStyle, marginTop: '8px' }}>
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SHARED STYLES ─────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: '#0e1621',
  border: '1px solid #2b3d4f',
  color: '#fff',
  borderRadius: '12px',
  marginBottom: '12px',
  fontSize: '15px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '700',
  fontSize: '15px',
  cursor: 'pointer',
  fontFamily: 'inherit'
}

const cardStyle: React.CSSProperties = {
  background: '#17212b',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '12px',
  border: '1px solid #1e2d3d'
}

const avatarSmall: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  fontWeight: '700',
  overflow: 'hidden',
  flexShrink: 0
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#708499',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px'
}
