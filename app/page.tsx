'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function toEmail(u: string) { return `${u.toLowerCase().trim()}@hashtag.app` }

type View = 'feed' | 'people' | 'friends' | 'profile' | 'notifications' | 'search' | 'music' | 'saved'
type Post = { id: string; text: string; image_url: string; username: string; user_id: string; likes_count: number; views_count: number; created_at: string; comments: Comment[]; post_likes: { user_id: string }[]; saved_posts?: { user_id: string }[] }
type Comment = { id: string; text: string; username: string; user_id: string }
type Song = { id: string; title: string; artist: string; url: string }
type Profile = { id?: string; username: string; avatar_url: string; bio: string; followers_count?: number; following_count?: number }
type Message = { id: string; text: string; from_id: string; to_id: string; created_at: string; from_username: string }
type Notification = { id: string; from_username: string; type: string; message: string; is_read: boolean; created_at: string }
type Story = { id: string; user_id: string; username: string; avatar_url: string; image_url: string; created_at: string }
type Friendship = { id: string; requester_id: string; receiver_id: string; status: string }

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
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
  const [activeChat, setActiveChat] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [stories, setStories] = useState<Story[]>([])
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ posts: Post[]; users: Profile[] }>({ posts: [], users: [] })
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ─── AUTH ───────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user.id) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user.id) }
      else setUser(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleAuth() {
    setAuthError('')
    const trimmed = username.toLowerCase().trim()
    if (!trimmed || !password) { setAuthError('Введи логин и пароль'); return }
    if (password.length < 6) { setAuthError('Пароль минимум 6 символов'); return }
    const fakeEmail = toEmail(trimmed)
    if (authMode === 'register') {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', trimmed).single()
      if (existing) { setAuthError('Этот логин уже занят'); return }
      const { data, error } = await supabase.auth.signUp({ email: fakeEmail, password })
      if (error) { setAuthError('Ошибка: ' + error.message); return }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, username: trimmed, avatar_url: '', bio: '' })
        setProfile({ username: trimmed, avatar_url: '', bio: '' })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password })
      if (error) { setAuthError('Неверный логин или пароль'); return }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null); setUsername(''); setPassword('')
  }

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) setProfile(data)
  }

  async function saveProfile() {
    await supabase.from('profiles').upsert({ id: user.id, ...profile }); alert('Сохранено!')
  }

  async function handleAvatarUpload(file: File) {
    const name = `avatars/${user.id}_${Date.now()}`
    await supabase.storage.from('images').upload(name, file, { upsert: true })
    const url = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
    setProfile(p => ({ ...p, avatar_url: url }))
  }

  useEffect(() => { if (user) loadData() }, [user, view])

  async function loadData() {
    if (view === 'feed') { await loadFeed(); await loadStories(); await loadFollowing() }
    if (view === 'music') { const { data } = await supabase.from('music').select('*').order('created_at', { ascending: false }); setSongs(data || []) }
    if (view === 'notifications') loadNotifications()
    if (view === 'saved') loadSavedPosts()
    if (view === 'profile') { await loadFollowing(); await fetchProfile(user.id) }
    if (view === 'people') { await loadAllUsers(); await loadFriendships() }
    if (view === 'friends') { await loadFriendships(); await loadFriends() }
  }

  async function loadFeed() {
    const { data } = await supabase.from('posts').select('*, comments(*), post_likes(user_id), saved_posts(user_id)').order('created_at', { ascending: false })
    setPosts((data as Post[]) || [])
  }

  async function loadStories() {
    const { data } = await supabase.from('stories').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
    setStories(data || [])
  }

  async function loadFollowing() {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    setFollowingIds((data || []).map((f: any) => f.following_id))
  }

  async function loadNotifications() {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setNotifications(data || [])
    setUnreadCount(0)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  }

  async function loadSavedPosts() {
    const { data } = await supabase.from('saved_posts').select('post_id, posts(*, comments(*), post_likes(user_id))').eq('user_id', user.id)
    setSavedPosts((data || []).map((s: any) => s.posts).filter(Boolean))
  }

  async function loadAllUsers() {
    const { data } = await supabase.from('profiles').select('*').neq('id', user.id)
    setAllUsers(data || [])
  }

  async function loadFriendships() {
    const { data } = await supabase.from('friendships').select('*').or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    setFriendships((data as Friendship[]) || [])
  }

  async function loadFriends() {
    const { data } = await supabase.from('friendships').select('*').or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`).eq('status', 'accepted')
    if (!data) return
    const friendIds = data.map((f: Friendship) => f.requester_id === user.id ? f.receiver_id : f.requester_id)
    if (friendIds.length === 0) { setFriends([]); return }
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds)
    setFriends(profiles || [])
  }

  async function loadMessages(contactId: string) {
    const { data } = await supabase.from('messages').select('*').or(`and(from_id.eq.${user.id},to_id.eq.${contactId}),and(from_id.eq.${contactId},to_id.eq.${user.id})`).order('created_at', { ascending: true })
    setMessages((data as Message[]) || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => setUnreadCount(n => n + 1))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  // ─── FRIENDSHIP HELPERS ──────────────────────────────
  function getFriendshipStatus(targetId: string): 'none' | 'pending_sent' | 'pending_received' | 'accepted' {
    const f = friendships.find(fr => (fr.requester_id === user.id && fr.receiver_id === targetId) || (fr.requester_id === targetId && fr.receiver_id === user.id))
    if (!f) return 'none'
    if (f.status === 'accepted') return 'accepted'
    if (f.requester_id === user.id) return 'pending_sent'
    return 'pending_received'
  }

  async function sendFriendRequest(targetId: string, targetUsername: string) {
    await supabase.from('friendships').insert([{ requester_id: user.id, receiver_id: targetId, status: 'pending' }])
    await supabase.from('notifications').insert([{ user_id: targetId, from_user_id: user.id, from_username: profile.username, type: 'friend_request', message: `${profile.username} хочет добавить тебя в друзья` }])
    await loadFriendships()
  }

  async function acceptFriendRequest(requesterId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).match({ requester_id: requesterId, receiver_id: user.id })
    await supabase.from('notifications').insert([{ user_id: requesterId, from_user_id: user.id, from_username: profile.username, type: 'friend_accepted', message: `${profile.username} принял твою заявку в друзья` }])
    await loadFriendships(); await loadFriends()
  }

  async function removeFriend(targetId: string) {
    await supabase.from('friendships').delete().or(`and(requester_id.eq.${user.id},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${user.id})`)
    await loadFriendships(); await loadFriends()
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
    await supabase.from('posts').insert([{ text: postText, image_url: imageUrl, username: profile.username, user_id: user.id }])
    setPostText(''); setSelectedFile(null); setUploading(false); loadFeed()
  }

  async function handleLike(post: Post) {
    const myLike = post.post_likes?.find(l => l.user_id === user.id)
    if (myLike) {
      await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: user.id })
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post.id)
    } else {
      await supabase.from('post_likes').insert([{ post_id: post.id, user_id: user.id }])
      await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post.id)
      if (post.user_id !== user.id) await supabase.from('notifications').insert([{ user_id: post.user_id, from_user_id: user.id, from_username: profile.username, type: 'like', post_id: post.id, message: `${profile.username} лайкнул твой пост` }])
    }
    loadFeed()
  }

  async function handleSave(post: Post) {
    const saved = post.saved_posts?.some(s => s.user_id === user.id)
    if (saved) await supabase.from('saved_posts').delete().match({ post_id: post.id, user_id: user.id })
    else await supabase.from('saved_posts').insert([{ post_id: post.id, user_id: user.id }])
    loadFeed()
  }

  async function addComment(postId: string) {
    const text = commentInputs[postId]
    if (!text?.trim()) return
    const post = posts.find(p => p.id === postId)
    await supabase.from('comments').insert([{ post_id: postId, text, username: profile.username, user_id: user.id }])
    if (post && post.user_id !== user.id) await supabase.from('notifications').insert([{ user_id: post.user_id, from_user_id: user.id, from_username: profile.username, type: 'comment', post_id: postId, message: `${profile.username} прокомментировал твой пост` }])
    setCommentInputs(c => ({ ...c, [postId]: '' })); loadFeed()
  }

  async function deletePost(postId: string) {
    await supabase.from('post_likes').delete().eq('post_id', postId)
    await supabase.from('comments').delete().eq('post_id', postId)
    await supabase.from('saved_posts').delete().eq('post_id', postId)
    await supabase.from('posts').delete().eq('id', postId)
    loadFeed()
  }

  async function uploadStory(file: File) {
    const name = `stories/${user.id}_${Date.now()}`
    await supabase.storage.from('images').upload(name, file)
    const url = supabase.storage.from('images').getPublicUrl(name).data.publicUrl
    await supabase.from('stories').insert([{ user_id: user.id, username: profile.username, avatar_url: profile.avatar_url, image_url: url }])
    loadStories()
  }

  async function sendMessage() {
    if (!msgText.trim() || !activeChat) return
    await supabase.from('messages').insert([{ text: msgText, from_id: user.id, to_id: activeChat.id, from_username: profile.username }])
    setMsgText(''); loadMessages(activeChat.id)
  }

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults({ posts: [], users: [] }); return }
    const [{ data: fp }, { data: fu }] = await Promise.all([
      supabase.from('posts').select('*, comments(*), post_likes(user_id)').ilike('text', `%${q}%`).limit(10),
      supabase.from('profiles').select('*').ilike('username', `%${q}%`).limit(10)
    ])
    setSearchResults({ posts: (fp as Post[]) || [], users: (fu as Profile[]) || [] })
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) }
  function formatDate(iso: string) { return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short' }) }
  function getAvatar(uname: string, avatar_url?: string) {
    if (avatar_url) return <img src={avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    return (uname?.[0] || '?').toUpperCase()
  }

  // ─── FRIEND BUTTON ───────────────────────────────────
  function FriendButton({ targetId, targetUsername }: { targetId: string; targetUsername: string }) {
    const status = getFriendshipStatus(targetId)
    if (status === 'accepted') return (
      <button onClick={() => removeFriend(targetId)} style={{ ...friendBtnStyle, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>✓ Друзья</button>
    )
    if (status === 'pending_sent') return (
      <button style={{ ...friendBtnStyle, background: 'rgba(46,166,255,0.1)', color: '#708499', border: '1px solid #2b3d4f', cursor: 'default' }}>⏳ Заявка</button>
    )
    if (status === 'pending_received') return (
      <button onClick={() => acceptFriendRequest(targetId)} style={{ ...friendBtnStyle, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>✅ Принять</button>
    )
    return (
      <button onClick={() => sendFriendRequest(targetId, targetUsername)} style={{ ...friendBtnStyle, background: 'rgba(46,166,255,0.9)', color: '#fff', border: 'none' }}>+ Добавить</button>
    )
  }

  function PostCard({ post }: { post: Post }) {
    const liked = post.post_likes?.some(l => l.user_id === user.id)
    const isSaved = post.saved_posts?.some(s => s.user_id === user.id)
    const commentsOpen = openComments[post.id]
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={avatarSmall}>{getAvatar(post.username)}</div>
            <div>
              <span style={{ fontWeight: '600', fontSize: '15px' }}>@{post.username}</span>
              <div style={{ color: '#708499', fontSize: '12px' }}>{formatDate(post.created_at)}</div>
            </div>
          </div>
          {post.user_id === user.id && <button onClick={() => deletePost(post.id)} style={{ background: 'none', border: 'none', color: '#708499', cursor: 'pointer', fontSize: '18px' }}>🗑</button>}
        </div>
        {post.text && <p style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '12px', color: '#e8f0f7' }}>{post.text}</p>}
        {post.image_url && <img src={post.image_url} style={{ width: '100%', borderRadius: '12px', marginBottom: '12px', maxHeight: '400px', objectFit: 'cover' }} />}
        <div style={{ display: 'flex', gap: '4px', paddingTop: '12px', borderTop: '1px solid #1e2d3d', alignItems: 'center' }}>
          <button onClick={() => handleLike(post)} style={{ ...actionBtn, color: liked ? '#f87171' : '#708499' }}>{liked ? '❤️' : '🤍'} {post.likes_count || 0}</button>
          <button onClick={() => setOpenComments(c => ({ ...c, [post.id]: !c[post.id] }))} style={{ ...actionBtn, color: '#708499' }}>💬 {post.comments?.length || 0}</button>
          <button onClick={() => handleSave(post)} style={{ ...actionBtn, color: isSaved ? '#fbbf24' : '#708499' }}>{isSaved ? '🔖' : '📌'}</button>
          <span style={{ marginLeft: 'auto', color: '#708499', fontSize: '12px' }}>👁 {post.views_count || 0}</span>
        </div>
        {commentsOpen && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #1e2d3d', paddingTop: '12px' }}>
            {post.comments?.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', background: '#1e2d3d', borderRadius: '10px', padding: '8px 12px' }}>
                <span style={{ color: '#2ea6ff', fontWeight: '600', fontSize: '13px' }}>@{c.username}</span>
                <span style={{ color: '#c8d8e8', fontSize: '14px' }}>{c.text}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input placeholder="Комментарий..." value={commentInputs[post.id] || ''} onChange={e => setCommentInputs(c => ({ ...c, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addComment(post.id)} style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: '14px', padding: '8px 12px' }} />
              <button onClick={() => addComment(post.id)} style={{ ...primaryBtnStyle, padding: '8px 16px', width: 'auto' }}>→</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── AUTH ─────────────────────────────────────────────
  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0e1621', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'SF Pro Display', -apple-system, sans-serif", padding: '20px' }}>
      <div style={{ background: '#17212b', borderRadius: '20px', padding: isMobile ? '32px 24px' : '48px 40px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '32px' }}>✈️</div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: 0 }}>Hashtag</h1>
          <p style={{ color: '#708499', fontSize: '14px', marginTop: '6px' }}>{authMode === 'login' ? 'Войди в свой аккаунт' : 'Создай аккаунт'}</p>
        </div>
        <label style={labelStyle}>Логин</label>
        <input placeholder="например: durov" value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} style={inputStyle} autoCapitalize="none" />
        <label style={labelStyle}>Пароль</label>
        <input type="password" placeholder="минимум 6 символов" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} style={{ ...inputStyle, marginBottom: '20px' }} />
        {authError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{authError}</p>}
        <button onClick={handleAuth} style={primaryBtnStyle}>{authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
        <p style={{ color: '#708499', textAlign: 'center', fontSize: '14px', marginTop: '16px' }}>
          {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }} style={{ color: '#2ea6ff', cursor: 'pointer' }}>
            {authMode === 'login' ? 'Регистрация' : 'Войти'}
          </span>
        </p>
      </div>
    </div>
  )

  const mobileNavItems = [
    { id: 'feed', icon: '📰', label: 'Лента' },
    { id: 'people', icon: '🌍', label: 'Люди' },
    { id: 'friends', icon: '🤝', label: 'Друзья' },
    { id: 'notifications', icon: '🔔', label: 'Уведом.', badge: unreadCount },
    { id: 'profile', icon: '👤', label: 'Профиль' },
  ]

  const sideNavItems = [
    { id: 'feed', icon: '📰', label: 'Лента' },
    { id: 'search', icon: '🔍', label: 'Поиск' },
    { id: 'people', icon: '🌍', label: 'Люди' },
    { id: 'friends', icon: '🤝', label: 'Друзья' },
    { id: 'notifications', icon: '🔔', label: 'Уведомления', badge: unreadCount },
    { id: 'saved', icon: '🔖', label: 'Сохранённые' },
    { id: 'music', icon: '🎵', label: 'Музыка' },
    { id: 'profile', icon: '👤', label: 'Профиль' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0e1621', fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: '#fff' }}>

      {/* Story viewer */}
      {activeStory && (
        <div onClick={() => setActiveStory(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={avatarSmall}>{getAvatar(activeStory.username, activeStory.avatar_url)}</div>
            <span style={{ fontWeight: '600' }}>@{activeStory.username}</span>
          </div>
          <button onClick={() => setActiveStory(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer' }}>✕</button>
          <img src={activeStory.image_url} style={{ maxHeight: '85vh', maxWidth: isMobile ? '100vw' : '500px', borderRadius: '16px', objectFit: 'contain' }} />
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', background: '#17212b', borderRight: '1px solid #0d1b29', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #0d1b29', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700' }}>
              {getAvatar(profile.username, profile.avatar_url)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: '600', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{profile.username}</div>
              <div style={{ color: '#4ade80', fontSize: '12px' }}>● онлайн</div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
            {sideNavItems.map((item: any) => (
              <div key={item.id} onClick={() => setView(item.id as View)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderRadius: '8px', margin: '2px 8px', background: view === item.id ? 'rgba(46,166,255,0.15)' : 'transparent', color: view === item.id ? '#2ea6ff' : '#aab8c2', transition: 'all 0.15s' }}>
                <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && <span style={{ background: '#f87171', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' }}>{item.badge}</span>}
              </div>
            ))}
          </nav>
          <div style={{ padding: '16px' }}>
            <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Выйти</button>
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: '#17212b', borderBottom: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}>
              {getAvatar(profile.username, profile.avatar_url)}
            </div>
            <span style={{ fontWeight: '700', fontSize: '17px' }}>Hashtag</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Выйти</button>
        </div>
      )}

      {/* Main */}
      <div style={{ marginLeft: isMobile ? 0 : '240px', paddingTop: isMobile ? '56px' : 0, paddingBottom: isMobile ? '70px' : 0, minHeight: '100vh' }}>

        {/* ── FEED ── */}
        {view === 'feed' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <label style={{ cursor: 'pointer' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(46,166,255,0.2)', border: '2px dashed #2ea6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 4px' }}>+</div>
                  <span style={{ fontSize: '10px', color: '#708499' }}>История</span>
                  <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadStory(f) }} style={{ display: 'none' }} />
                </label>
              </div>
              {stories.map(story => (
                <div key={story.id} onClick={() => setActiveStory(story)} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid #2ea6ff', overflow: 'hidden', margin: '0 auto 4px' }}>
                    <img src={story.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#aab8c2' }}>@{story.username?.slice(0, 7)}</span>
                </div>
              ))}
            </div>
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={avatarSmall}>{getAvatar(profile.username, profile.avatar_url)}</div>
                <textarea placeholder="Что у тебя нового?" value={postText} onChange={e => setPostText(e.target.value)} rows={2} style={{ flex: 1, background: '#0e1621', border: '1px solid #2b3d4f', color: '#fff', borderRadius: '12px', padding: '10px 12px', fontSize: '15px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#708499', fontSize: '13px', cursor: 'pointer' }}>
                  <span>📎</span><span>{selectedFile ? selectedFile.name.slice(0, 15) : 'Фото'}</span>
                  <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
                <button onClick={handlePublish} disabled={uploading} style={{ ...primaryBtnStyle, padding: '8px 18px', width: 'auto', fontSize: '14px' }}>{uploading ? '...' : 'Пост'}</button>
              </div>
            </div>
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {/* ── PEOPLE ── */}
        {view === 'people' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>🌍 Все пользователи</h2>
            {allUsers.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', color: '#708499' }}>Пока нет других пользователей</div>}
            {allUsers.map(u => (
              <div key={u.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...avatarSmall, width: '48px', height: '48px', fontSize: '20px' }}>{getAvatar(u.username, u.avatar_url)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>@{u.username}</div>
                  <div style={{ color: '#708499', fontSize: '13px', marginTop: '2px' }}>{u.bio || 'нет статуса'}</div>
                  {getFriendshipStatus(u.id!) === 'accepted' && (
                    <div style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>🤝 Друзья</div>
                  )}
                </div>
                <FriendButton targetId={u.id!} targetUsername={u.username} />
              </div>
            ))}
          </div>
        )}

        {/* ── FRIENDS ── */}
        {view === 'friends' && (
          <div style={{ display: 'flex', height: isMobile ? 'calc(100vh - 126px)' : '100vh' }}>
            {/* Friends list */}
            {(!isMobile || !activeChat) && (
              <div style={{ width: isMobile ? '100%' : '280px', borderRight: isMobile ? 'none' : '1px solid #1e2d3d', background: '#17212b', overflowY: 'auto' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #1e2d3d' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>🤝 Друзья</h2>
                  <p style={{ color: '#708499', fontSize: '13px' }}>{friends.length} друзей</p>
                </div>

                {/* Pending requests */}
                {friendships.filter(f => f.receiver_id === user.id && f.status === 'pending').length > 0 && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d3d' }}>
                    <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Заявки в друзья</div>
                    {friendships.filter(f => f.receiver_id === user.id && f.status === 'pending').map(f => {
                      const requester = allUsers.find(u => u.id === f.requester_id)
                      if (!requester) return null
                      return (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <div style={avatarSmall}>{getAvatar(requester.username, requester.avatar_url)}</div>
                          <div style={{ flex: 1 }}><div style={{ fontWeight: '600', fontSize: '14px' }}>@{requester.username}</div></div>
                          <button onClick={() => acceptFriendRequest(requester.id!)} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>✓</button>
                          <button onClick={() => removeFriend(requester.id!)} style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {friends.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#708499' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🤝</div>
                    <p style={{ fontSize: '14px' }}>Друзей пока нет</p>
                    <button onClick={() => setView('people')} style={{ marginTop: '12px', background: '#2ea6ff', color: '#fff', border: 'none', borderRadius: '12px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Найти друзей</button>
                  </div>
                )}

                {friends.map(friend => (
                  <div key={friend.id} onClick={() => { setActiveChat(friend); loadMessages(friend.id!) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', background: activeChat?.id === friend.id ? 'rgba(46,166,255,0.1)' : 'transparent', borderLeft: activeChat?.id === friend.id ? '3px solid #2ea6ff' : '3px solid transparent', transition: 'all 0.15s' }}>
                    <div style={{ ...avatarSmall, flexShrink: 0 }}>{getAvatar(friend.username, friend.avatar_url)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>@{friend.username}</div>
                      <div style={{ color: '#708499', fontSize: '12px' }}>{friend.bio || 'нет статуса'}</div>
                    </div>
                    <span style={{ fontSize: '18px' }}>💬</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chat with friend */}
            {(!isMobile || activeChat) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!activeChat ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#708499' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '52px', marginBottom: '16px' }}>🤝</div>
                      <p style={{ fontSize: '16px' }}>Выбери друга для чата</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', gap: '12px', background: '#17212b' }}>
                      {isMobile && <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: '#2ea6ff', cursor: 'pointer', fontSize: '20px' }}>←</button>}
                      <div style={avatarSmall}>{getAvatar(activeChat.username, activeChat.avatar_url)}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>@{activeChat.username}</div>
                        <div style={{ color: '#4ade80', fontSize: '12px' }}>🤝 Друг · онлайн</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      {messages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#708499', padding: '40px' }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
                          <p>Начни общение с @{activeChat.username}</p>
                        </div>
                      )}
                      {messages.map(msg => {
                        const mine = msg.from_id === user.id
                        return (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                            <div style={{ maxWidth: '75%', background: mine ? 'linear-gradient(135deg, #2ea6ff, #1a8fd1)' : '#17212b', color: '#fff', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: '15px', border: mine ? 'none' : '1px solid #2b3d4f' }}>
                              <p style={{ margin: 0 }}>{msg.text}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7, textAlign: 'right' }}>{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d3d', background: '#17212b', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input placeholder="Сообщение другу..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                      <button onClick={sendMessage} style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SEARCH ── */}
        {view === 'search' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
            <input autoFocus placeholder="🔍 Поиск..." value={searchQuery} onChange={e => handleSearch(e.target.value)} style={{ ...inputStyle, fontSize: '16px', padding: '14px 16px', marginBottom: '20px' }} />
            {searchResults.users.length > 0 && (
              <>
                <h3 style={{ color: '#708499', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Пользователи</h3>
                {searchResults.users.map(u => (
                  <div key={u.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={avatarSmall}>{getAvatar(u.username, u.avatar_url)}</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: '600' }}>@{u.username}</div><div style={{ color: '#708499', fontSize: '13px' }}>{u.bio || 'нет статуса'}</div></div>
                    {u.id !== user.id && <FriendButton targetId={u.id!} targetUsername={u.username} />}
                  </div>
                ))}
              </>
            )}
            {searchResults.posts.length > 0 && (
              <>
                <h3 style={{ color: '#708499', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', margin: '20px 0 12px' }}>Посты</h3>
                {searchResults.posts.map(post => <PostCard key={post.id} post={post} />)}
              </>
            )}
            {searchQuery && searchResults.users.length === 0 && searchResults.posts.length === 0 && (
              <div style={{ textAlign: 'center', color: '#708499', padding: '40px' }}>Ничего не найдено</div>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {view === 'notifications' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>🔔 Уведомления</h2>
            {notifications.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', color: '#708499' }}>Уведомлений пока нет</div>}
            {notifications.map(n => (
              <div key={n.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px', opacity: n.is_read ? 0.6 : 1, borderLeft: n.is_read ? '3px solid transparent' : '3px solid #2ea6ff' }}>
                <span style={{ fontSize: '22px' }}>{n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'friend_request' ? '🤝' : n.type === 'friend_accepted' ? '✅' : '👤'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px' }}>{n.message}</div>
                  <div style={{ color: '#708499', fontSize: '12px', marginTop: '4px' }}>{formatDate(n.created_at)}</div>
                </div>
                {n.type === 'friend_request' && (
                  <button onClick={() => { setView('friends'); loadFriendships() }} style={{ background: '#2ea6ff', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Принять</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── SAVED ── */}
        {view === 'saved' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>🔖 Сохранённые</h2>
            {savedPosts.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', color: '#708499' }}>Нет сохранённых постов</div>}
            {savedPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {/* ── MUSIC ── */}
        {view === 'music' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>🎵 Музыка</h2>
            {songs.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', color: '#708499' }}>Треков пока нет</div>}
            {songs.map((song, i) => (
              <div key={song.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `linear-gradient(135deg, hsl(${i * 60}, 70%, 40%), hsl(${i * 60 + 40}, 70%, 30%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎵</div>
                  <div><div style={{ fontWeight: '600' }}>{song.title}</div><div style={{ color: '#708499', fontSize: '13px' }}>{song.artist}</div></div>
                </div>
                {song.url && <audio controls src={song.url} style={{ width: '100%', height: '36px', accentColor: '#2ea6ff' }} />}
              </div>
            ))}
          </div>
        )}

        {/* ── PROFILE ── */}
        {view === 'profile' && (
          <div style={{ maxWidth: '500px', margin: '0 auto', padding: isMobile ? '16px 12px' : '24px 16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>👤 Профиль</h2>
            <div style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '700', marginBottom: '12px', border: '3px solid #2ea6ff' }}>
                  {getAvatar(profile.username, profile.avatar_url)}
                </div>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', fontSize: '20px' }}>{friends.length}</div><div style={{ color: '#708499', fontSize: '12px' }}>друзей</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', fontSize: '20px' }}>{profile.followers_count || 0}</div><div style={{ color: '#708499', fontSize: '12px' }}>подписчиков</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: '700', fontSize: '20px' }}>{followingIds.length}</div><div style={{ color: '#708499', fontSize: '12px' }}>подписок</div></div>
                </div>
                <label style={{ color: '#2ea6ff', fontSize: '14px', cursor: 'pointer', padding: '6px 14px', border: '1px solid #2ea6ff', borderRadius: '20px' }}>
                  Изменить фото
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} style={{ display: 'none' }} />
                </label>
              </div>
              {isMobile && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[{ v: 'saved', label: '🔖 Сохранённые' }, { v: 'music', label: '🎵 Музыка' }, { v: 'people', label: '🌍 Люди' }].map(item => (
                    <button key={item.v} onClick={() => setView(item.v as View)} style={{ flex: 1, minWidth: '100px', padding: '8px', background: '#1e2d3d', border: 'none', borderRadius: '10px', color: '#aab8c2', cursor: 'pointer', fontSize: '12px' }}>{item.label}</button>
                  ))}
                </div>
              )}
              <label style={labelStyle}>Логин</label>
              <input value={`@${profile.username}`} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
              <label style={labelStyle}>О себе</label>
              <textarea placeholder="Расскажи о себе..." value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              <button onClick={saveProfile} style={{ ...primaryBtnStyle, marginTop: '8px' }}>Сохранить</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', background: '#17212b', borderTop: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 100 }}>
          {mobileNavItems.map((item: any) => (
            <button key={item.id} onClick={() => setView(item.id as View)} style={{ background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '6px 10px', position: 'relative', opacity: view === item.id ? 1 : 0.5 }}>
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', color: view === item.id ? '#2ea6ff' : '#708499', fontWeight: view === item.id ? '700' : '400' }}>{item.label}</span>
              {item.badge > 0 && <span style={{ position: 'absolute', top: '2px', right: '4px', background: '#f87171', color: '#fff', borderRadius: '10px', padding: '0 5px', fontSize: '10px', fontWeight: '700' }}>{item.badge}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', background: '#0e1621', border: '1px solid #2b3d4f', color: '#fff', borderRadius: '12px', marginBottom: '12px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }
const cardStyle: React.CSSProperties = { background: '#17212b', borderRadius: '16px', padding: '16px', marginBottom: '12px', border: '1px solid #1e2d3d' }
const avatarSmall: React.CSSProperties = { width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #2ea6ff, #1a8fd1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', overflow: 'hidden', flexShrink: 0 }
const actionBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: '4px 8px', borderRadius: '8px', fontFamily: 'inherit' }
const labelStyle: React.CSSProperties = { display: 'block', color: '#708499', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '6px' }
const friendBtnStyle: React.CSSProperties = { padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }
