'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── TYPES ──
type Profile = { id: string; username: string; avatar_url: string | null; bio: string | null }
type Post = { id: string; created_at: string; text: string; username: string; image_url: string | null; likes_count: number; user_id: string; views_count: number; liked?: boolean; saved?: boolean }
type Message = { id: string; text: string; from_id: string; to_id: string; from_username: string; created_at: string }
type Story = { id: number; user_id: string; username: string; avatar_url: string | null; image_url: string; created_at: string; expires_at: string }
type Notification = { id: string; receiver_id: string; sender_name: string; type: string; post_id: string | null; is_read: boolean; created_at: string }
type AuthUser = { id: string; email: string }

// ── ICONS ──
const IC = {
  Home: ({ a }: { a?: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 22V12h6v10"/></svg>,
  Search: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Msg: ({ a }: { a?: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Bell: ({ a }: { a?: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Users: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  Music: ({ a }: { a?: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  User: ({ a }: { a?: boolean }) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Heart: ({ f }: { f?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={f?'#e05b8d':'none'} stroke={f?'#e05b8d':'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Bookmark: ({ f }: { f?: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={f?'#5b8dee':'none'} stroke={f?'#5b8dee':'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  Comment: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  Hash: ({ s=16 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  Send: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Img: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Video: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Back: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Play: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Pause: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Eye: ({ off }: { off?: boolean }) => off
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  UserPlus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
}

// ── HELPERS ──
const COLORS = ['#5b8dee','#e05b8d','#5be0c4','#e0b45b','#c45bee','#5beea0','#ee875b']
const colorFor = (s: string) => COLORS[(s?.charCodeAt(0) ?? 0) % COLORS.length]
const initials = (n: string) => (n ?? '??').slice(0,2).toUpperCase()
const timeAgo = (ts: string) => {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (d < 60) return `${d}с`; if (d < 3600) return `${Math.floor(d/60)}м`
  if (d < 86400) return `${Math.floor(d/3600)}ч`; return `${Math.floor(d/86400)}д`
}

function Ava({ name, url, size=40, ring }: { name: string; url?: string|null; size?: number; ring?: string }) {
  const c = colorFor(name)
  const style: React.CSSProperties = { width: size, height: size, borderRadius: '50%', objectFit: 'cover' as const, flexShrink: 0, border: ring ? `2px solid ${ring}` : `1.5px solid ${c}44` }
  if (url) return <img src={url} alt={name} style={style} />
  return <div style={{ ...style, background: `linear-gradient(135deg,${c}22,${c}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size*0.3, fontWeight: 700, color: c }}>{initials(name)}</div>
}

function Spinner() {
  return <div style={{ width: 28, height: 28, border: '2.5px solid #1f2937', borderTop: '2.5px solid #5b8dee', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: '12px 20px', color: '#f1f5f9', fontSize: 14, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 8px 32px #000a' }}>{msg}</div>
}

// ── AUTH PAGE ──
function AuthPage({ onAuth }: { onAuth: (u: AuthUser, p: Profile) => void }) {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const F = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handle = async () => {
    setErr(''); setLoading(true)
    try {
      if (mode === 'register') {
        if (!form.username.trim()) { setErr('Введи имя пользователя'); setLoading(false); return }
        const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { username: form.username } } })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, username: form.username, bio: '' })
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          onAuth({ id: data.user.id, email: data.user.email! }, p ?? { id: data.user.id, username: form.username, avatar_url: null, bio: null })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        if (data.user) {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          onAuth({ id: data.user.id, email: data.user.email! }, p ?? { id: data.user.id, username: form.email.split('@')[0], avatar_url: null, bio: null })
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка'
      setErr(msg.includes('Invalid login') ? 'Неверный email или пароль' : msg)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 32px #5b8dee44' }}><IC.Hash s={28} /></div>
          <h1 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>Hashtag</h1>
          <p style={{ color: '#4b5563', fontSize: 14, marginTop: 6 }}>Социальная сеть нового поколения</p>
        </div>
        <div style={{ background: '#111827', borderRadius: 20, border: '1px solid #1f2937', padding: 28 }}>
          <div style={{ display: 'flex', background: '#0a0f1a', borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 }}>
            {(['login','register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErr('') }} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', background: mode===m?'#1f2937':'transparent', color: mode===m?'#f1f5f9':'#4b5563', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
                {m==='login'?'Войти':'Регистрация'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode==='register' && (
              <div>
                <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Имя пользователя</label>
                <input value={form.username} onChange={e => F('username', e.target.value)} placeholder="например: alex123" style={{ width: '100%', padding: '12px 14px', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 11, color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            <div>
              <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
              <input value={form.email} onChange={e => F('email', e.target.value)} placeholder="example@mail.com" type="email" style={{ width: '100%', padding: '12px 14px', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 11, color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Пароль</label>
              <div style={{ position: 'relative' }}>
                <input value={form.password} onChange={e => F('password', e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} placeholder="Минимум 6 символов" type={showPw?'text':'password'} style={{ width: '100%', padding: '12px 44px 12px 14px', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 11, color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2 }}><IC.Eye off={!showPw} /></button>
              </div>
            </div>
            {err && <p style={{ color: '#e05b5b', fontSize: 13, margin: 0, padding: '8px 12px', background: '#e05b5b11', borderRadius: 8, textAlign: 'center' }}>{err}</p>}
            <button onClick={handle} disabled={loading} style={{ width: '100%', padding: '13px', marginTop: 4, background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 15, fontFamily: 'inherit', fontWeight: 700, cursor: loading?'default':'pointer', opacity: loading?0.7:1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <Spinner /> : (mode==='login'?'Войти':'Создать аккаунт')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STORIES BAR ──
function StoriesBar({ user, profile }: { user: AuthUser; profile: Profile }) {
  const [stories, setStories] = useState<Story[]>([])
  const [viewing, setViewing] = useState<Story|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('stories').select('*').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
      .then(({ data }) => setStories(data ?? []))
  }, [])

  const addStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const path = `stories/${user.id}/${Date.now()}.${f.name.split('.').pop()}`
    const { error } = await supabase.storage.from('stories').upload(path, f)
    if (!error) {
      const { data: u } = supabase.storage.from('stories').getPublicUrl(path)
      const expires = new Date(Date.now() + 24*60*60*1000).toISOString()
      const { data } = await supabase.from('stories').insert({ user_id: user.id, username: profile.username, avatar_url: profile.avatar_url, image_url: u.publicUrl, expires_at: expires }).select().single()
      if (data) setStories(s => [data, ...s])
    }
  }

  const myStory = stories.find(s => s.user_id === user.id)

  return (
    <>
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: 'fixed', inset: 0, background: '#000d', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
            <img src={viewing.image_url} alt="" style={{ width: '100%', maxHeight: '80vh', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ava name={viewing.username} url={viewing.avatar_url} size={36} ring="#fff" />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px #000' }}>{viewing.username}</div>
                <div style={{ color: '#ffffff99', fontSize: 11 }}>{timeAgo(viewing.created_at)}</div>
              </div>
            </div>
            <button onClick={() => setViewing(null)} style={{ position: 'absolute', top: 16, right: 16, background: '#000a', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><IC.X /></button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 0 12px', marginBottom: 4 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={addStory} />
        {/* Add story button */}
        <div onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Ava name={profile.username} url={profile.avatar_url} size={60} ring={myStory ? '#5b8dee' : '#1f2937'} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: '2px solid #0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>+</div>
          </div>
          <span style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Моя</span>
        </div>
        {stories.map(s => (
          <div key={s.id} onClick={() => setViewing(s)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ padding: 2, borderRadius: '50%', background: s.user_id===user.id ? 'linear-gradient(135deg,#5b8dee,#3a6bc7)' : 'linear-gradient(135deg,#e05b8d,#c45bee)' }}>
              <Ava name={s.username} url={s.avatar_url} size={56} ring="#0a0f1a" />
            </div>
            <span style={{ color: '#64748b', fontSize: 11, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── POST CARD ──
function PostCard({ post, currentUser, onLike, onSave, onDelete }: { post: Post; currentUser: AuthUser; onLike: (p: Post) => void; onSave: (p: Post) => void; onDelete: (id: string) => void }) {
  const [showComments, setShowComments] = useState(false)
  // comments table uses 'content' column (not 'text')
  const [comments, setComments] = useState<{id:string;content:string;username:string;created_at:string}[]>([])
  const [commentText, setCommentText] = useState('')

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return }
    const { data } = await supabase.from('comments').select('id,content,username,created_at').eq('post_id', post.id).order('created_at')
    setComments(data ?? [])
    setShowComments(true)
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    const { data: p } = await supabase.from('profiles').select('username').eq('id', currentUser.id).single()
    // comments uses 'content' column
    const { data } = await supabase.from('comments').insert({ post_id: post.id, user_id: currentUser.id, username: p?.username ?? 'user', content: commentText.trim() }).select('id,content,username,created_at').single()
    if (data) setComments(c => [...c, data])
    setCommentText('')
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ text: post.text, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
    }
  }

  return (
    <div style={{ background: '#111827', borderRadius: 16, marginBottom: 10, border: '1px solid #1f2937', overflow: 'hidden' }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Ava name={post.username} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{post.username}</div>
            <div style={{ color: '#374151', fontSize: 11, marginTop: 1 }}>{timeAgo(post.created_at)}</div>
          </div>
          {post.user_id===currentUser.id && (
            <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 6, borderRadius: 8, transition: 'color 0.15s' }} onMouseEnter={e=>(e.currentTarget.style.color='#e05b5b')} onMouseLeave={e=>(e.currentTarget.style.color='#374151')}><IC.Trash /></button>
          )}
        </div>
        {post.text && <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: '0 0 12px' }}>{post.text}</p>}
      </div>
      {post.image_url && <div style={{ width: '100%', maxHeight: 400, overflow: 'hidden' }}><img src={post.image_url} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block' }} /></div>}
      <div style={{ display: 'flex', padding: '4px 8px', marginTop: 4 }}>
        <button onClick={() => onLike(post)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: post.liked?'#e05b8d':'#4b5563', fontSize: 13, padding: '8px 0', borderRadius: 8, fontFamily: 'inherit', transition: 'color 0.15s' }}>
          <IC.Heart f={post.liked} /><span style={{ fontWeight: 500 }}>{post.likes_count}</span>
        </button>
        <button onClick={loadComments} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: showComments?'#5b8dee':'#4b5563', fontSize: 13, padding: '8px 0', borderRadius: 8, fontFamily: 'inherit', transition: 'color 0.15s' }}>
          <IC.Comment /><span style={{ fontWeight: 500 }}>{comments.length}</span>
        </button>
        <button onClick={() => onSave(post)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: post.saved?'#5b8dee':'#4b5563', fontSize: 13, padding: '8px 0', borderRadius: 8, fontFamily: 'inherit', transition: 'color 0.15s' }}>
          <IC.Bookmark f={post.saved} />
        </button>
        <button onClick={share} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 13, padding: '8px 0', borderRadius: 8, fontFamily: 'inherit' }}>
          <IC.Share />
        </button>
      </div>
      {showComments && (
        <div style={{ borderTop: '1px solid #1f2937', padding: '12px 16px', background: '#0d1520' }}>
          {comments.length===0 && <p style={{ color: '#374151', fontSize: 13, textAlign: 'center', margin: '8px 0' }}>Нет комментариев</p>}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 9, marginBottom: 10 }}>
              <Ava name={c.username} size={30} />
              <div style={{ background: '#111827', borderRadius: 10, padding: '8px 12px', flex: 1 }}>
                <div style={{ color: '#5b8dee', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{c.username}</div>
                <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>{c.content}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Ava name={currentUser.email} size={30} />
            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key==='Enter' && submitComment()} placeholder="Написать комментарий..." style={{ flex: 1, background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={submitComment} style={{ background: '#5b8dee22', border: 'none', borderRadius: 10, padding: '0 12px', color: '#5b8dee', cursor: 'pointer' }}><IC.Send /></button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CREATE POST ──
function CreatePost({ user, profile, onPost }: { user: AuthUser; profile: Profile; onPost: (p: Post) => void }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File|null>(null)
  const [preview, setPreview] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  const handlePost = async () => {
    if (!text.trim() && !file) return
    setLoading(true)
    try {
      let imageUrl: string|null = null
      if (file) {
        const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`
        const { error } = await supabase.storage.from('posts').upload(path, file)
        if (!error) { const { data: u } = supabase.storage.from('posts').getPublicUrl(path); imageUrl = u.publicUrl }
      }
      const { data, error } = await supabase.from('posts').insert({ text: text.trim(), user_id: user.id, username: profile.username, image_url: imageUrl, likes_count: 0, views_count: 0 }).select().single()
      if (!error && data) { onPost(data); setText(''); setFile(null); setPreview(null) }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div style={{ background: '#111827', borderRadius: 16, border: '1px solid #1f2937', padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Ava name={profile.username} url={profile.avatar_url} size={42} />
        <div style={{ flex: 1 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Что у тебя нового?" style={{ width: '100%', minHeight: 72, background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 15, fontFamily: 'inherit', resize: 'none', lineHeight: 1.65 }} />
          {preview && (
            <div style={{ position: 'relative', marginBottom: 10, borderRadius: 10, overflow: 'hidden' }}>
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block', borderRadius: 10 }} />
              <button onClick={() => { setFile(null); setPreview(null) }} style={{ position: 'absolute', top: 8, right: 8, background: '#000a', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><IC.X /></button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1f2937', paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
              {[{ icon: <IC.Img />, label: 'Фото' },{ icon: <IC.Video />, label: 'Видео' }].map(b => (
                <button key={b.label} onClick={() => fileRef.current?.click()} title={b.label} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }} onMouseEnter={e=>(e.currentTarget.style.color='#5b8dee')} onMouseLeave={e=>(e.currentTarget.style.color='#4b5563')}>{b.icon}</button>
              ))}
            </div>
            <button onClick={handlePost} disabled={loading||(!text.trim()&&!file)} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', opacity: (!text.trim()&&!file)?0.4:1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {loading ? <Spinner /> : 'Опубликовать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FEED PAGE ──
function FeedPage({ user, profile }: { user: AuthUser; profile: Profile }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50)
    if (data) {
      const [{ data: likes }, { data: saved }] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
      ])
      const likedIds = new Set(likes?.map(l => l.post_id))
      const savedIds = new Set(saved?.map(s => s.post_id))
      setPosts(data.map(p => ({ ...p, liked: likedIds.has(p.id), saved: savedIds.has(p.id) })))
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const handleLike = async (post: Post) => {
    if (post.liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.from('posts').update({ likes_count: Math.max(0, post.likes_count-1) }).eq('id', post.id)
      setPosts(p => p.map(x => x.id===post.id ? { ...x, liked: false, likes_count: Math.max(0, x.likes_count-1) } : x))
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.from('posts').update({ likes_count: post.likes_count+1 }).eq('id', post.id)
      setPosts(p => p.map(x => x.id===post.id ? { ...x, liked: true, likes_count: x.likes_count+1 } : x))
    }
  }

  const handleSave = async (post: Post) => {
    if (post.saved) {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id)
      setPosts(p => p.map(x => x.id===post.id ? { ...x, saved: false } : x))
      setToast('Убрано из сохранённых')
    } else {
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: user.id })
      setPosts(p => p.map(x => x.id===post.id ? { ...x, saved: true } : x))
      setToast('Сохранено ✓')
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('posts').delete().eq('id', id)
    setPosts(p => p.filter(x => x.id!==id))
    setToast('Пост удалён')
  }

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <StoriesBar user={user} profile={profile} />
      <CreatePost user={user} profile={profile} onPost={p => setPosts(prev => [{ ...p, liked: false, saved: false }, ...prev])} />
      {loading ? <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        : posts.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Постов пока нет. Будь первым! 🚀</div>
        : posts.map(p => <PostCard key={p.id} post={p} currentUser={user} onLike={handleLike} onSave={handleSave} onDelete={handleDelete} />)}
    </div>
  )
}

// ── NOTIFICATIONS PAGE ──
function NotificationsPage({ user }: { user: AuthUser }) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('notifications').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { setNotifs(data ?? []); setLoading(false) })
    // mark all as read
    supabase.from('notifications').update({ is_read: true }).eq('receiver_id', user.id).eq('is_read', false).then(() => {})
  }, [user.id])

  const icons: Record<string, React.ReactNode> = {
    like: <IC.Heart f />,
    comment: <IC.Comment />,
    follow: <IC.UserPlus />,
    friend_request: <IC.Users />,
  }

  const labels: Record<string, string> = {
    like: 'лайкнул ваш пост',
    comment: 'прокомментировал пост',
    follow: 'начал читать вас',
    friend_request: 'хочет дружить',
  }

  return (
    <div>
      {loading ? <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        : notifs.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Уведомлений нет 🔔</div>
        : notifs.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827', opacity: n.is_read ? 0.6 : 1 }}>
            <div style={{ position: 'relative' }}>
              <Ava name={n.sender_name} size={46} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#111827', border: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: n.type==='like'?'#e05b8d':'#5b8dee', fontSize: 10 }}>
                {icons[n.type] ?? <IC.Bell />}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{n.sender_name} </span>
              <span style={{ color: '#64748b', fontSize: 14 }}>{labels[n.type] ?? n.type}</span>
            </div>
            <div style={{ color: '#374151', fontSize: 11 }}>{timeAgo(n.created_at)}</div>
            {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5b8dee', flexShrink: 0 }} />}
          </div>
        ))
      }
    </div>
  )
}

// ── FRIENDS PAGE ──
function FriendsPage({ user }: { user: AuthUser }) {
  const [tab, setTab] = useState<'friends'|'requests'|'find'>('friends')
  // friends table: user_email, friend_email
  const [friends, setFriends] = useState<{id:string;user_email:string;friend_email:string}[]>([])
  // friendships table: requester_id, receiver_id, status
  const [requests, setRequests] = useState<{id:number;requester_id:string;receiver_id:string;status:string;created_at:string;username?:string}[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  // follows table: follower_id, following_id
  const [following, setFollowing] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('friends').select('*').or(`user_email.eq.${user.email},friend_email.eq.${user.email}`).then(({ data }) => setFriends(data ?? []))
    // incoming requests
    supabase.from('friendships').select('*').eq('receiver_id', user.id).eq('status', 'pending').then(async ({ data }) => {
      if (!data) return
      const profiles = await Promise.all(data.map(r => supabase.from('profiles').select('username').eq('id', r.requester_id).single()))
      setRequests(data.map((r, i) => ({ ...r, username: profiles[i].data?.username ?? r.requester_id })))
    })
    supabase.from('follows').select('following_id').eq('follower_id', user.id).then(({ data }) => {
      setFollowing(new Set(data?.map(f => f.following_id)))
    })
  }, [user.id, user.email])

  const searchUsers = async () => {
    if (!search.trim()) return
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${search}%`).neq('id', user.id).limit(10)
    setResults(data ?? []); setLoading(false)
  }

  const addFriend = async (p: Profile) => {
    await supabase.from('friends').insert({ user_email: user.email, friend_email: p.username })
    // also create friendship record
    await supabase.from('friendships').insert({ requester_id: user.id, receiver_id: p.id, status: 'pending' })
    setToast(`Запрос отправлен ${p.username}`)
  }

  const follow = async (p: Profile) => {
    if (following.has(p.id)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', p.id)
      setFollowing(f => { const n = new Set(f); n.delete(p.id); return n })
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: p.id })
      setFollowing(f => new Set([...f, p.id]))
    }
  }

  const acceptRequest = async (r: typeof requests[0]) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', r.id)
    setRequests(prev => prev.filter(x => x.id!==r.id))
    setToast('Запрос принят!')
  }

  const friendNames = friends.map(f => f.user_email===user.email ? f.friend_email : f.user_email)

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div style={{ display: 'flex', background: '#111827', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        {(['friends','requests','find'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', background: tab===t?'#1f2937':'transparent', color: tab===t?'#f1f5f9':'#4b5563', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
            {t==='friends'?`Друзья (${friendNames.length})`:t==='requests'?`Запросы${requests.length>0?' ('+requests.length+')':''}`:'Найти'}
          </button>
        ))}
      </div>

      {tab==='friends' && (
        friendNames.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Пока нет друзей 👥</div>
        : friendNames.map((name, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827' }}>
            <Ava name={name} size={48} />
            <div style={{ flex: 1 }}><div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{name}</div></div>
            <button style={{ background: 'transparent', border: '1px solid #1e3a5f', borderRadius: 9, padding: '7px 14px', color: '#5b8dee', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Написать</button>
          </div>
        ))
      )}

      {tab==='requests' && (
        requests.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Нет входящих запросов</div>
        : requests.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827' }}>
            <Ava name={r.username??'user'} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{r.username}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>хочет дружить · {timeAgo(r.created_at)}</div>
            </div>
            <button onClick={() => acceptRequest(r)} style={{ background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 9, padding: '7px 14px', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><IC.Check /> Принять</button>
          </div>
        ))
      )}

      {tab==='find' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && searchUsers()} placeholder="Поиск по имени..." style={{ flex: 1, background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={searchUsers} style={{ background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 12, padding: '0 16px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Найти</button>
          </div>
          {loading && <Spinner />}
          {results.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827' }}>
              <Ava name={p.username} url={p.avatar_url} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{p.username}</div>
                {p.bio && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{p.bio}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => follow(p)} style={{ background: following.has(p.id)?'#1f2937':'transparent', border: `1px solid ${following.has(p.id)?'#374151':'#1e3a5f'}`, borderRadius: 9, padding: '7px 10px', color: following.has(p.id)?'#64748b':'#5b8dee', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  {following.has(p.id)?'Читаю':'Читать'}
                </button>
                <button onClick={() => addFriend(p)} style={{ background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 9, padding: '7px 10px', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><IC.UserPlus /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MESSAGES PAGE ──
function MessagesPage({ user, profile }: { user: AuthUser; profile: Profile }) {
  const [chats, setChats] = useState<{userId:string;username:string;lastMsg:string;time:string}[]>([])
  const [active, setActive] = useState<{userId:string;username:string}|null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [showNew, setShowNew] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const loadChats = async () => {
      const { data } = await supabase.from('messages').select('*').or(`from_id.eq.${user.id},to_id.eq.${user.id}`).order('created_at', { ascending: false })
      if (!data) return
      const seen = new Set<string>(); const c: typeof chats = []
      for (const m of data) {
        const otherId = m.from_id===user.id ? m.to_id : m.from_id
        const otherName = m.from_id===user.id ? (m.to_username ?? otherId) : m.from_username
        if (!seen.has(otherId)) { seen.add(otherId); c.push({ userId: otherId, username: otherName, lastMsg: m.text, time: timeAgo(m.created_at) }) }
      }
      setChats(c)
    }
    loadChats()
  }, [user.id])

  // realtime subscription
  useEffect(() => {
    if (!active) return
    const ch = supabase.channel('messages_rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const m = payload.new as Message
      if ((m.from_id===user.id && m.to_id===active.userId) || (m.from_id===active.userId && m.to_id===user.id)) {
        setMessages(prev => [...prev, m])
      }
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active, user.id])

  const openChat = async (userId: string, username: string) => {
    setActive({ userId, username })
    const { data } = await supabase.from('messages').select('*').or(`and(from_id.eq.${user.id},to_id.eq.${userId}),and(from_id.eq.${userId},to_id.eq.${user.id})`).order('created_at')
    setMessages(data ?? [])
  }

  const sendMsg = async () => {
    if (!msgText.trim() || !active) return
    const txt = msgText.trim()
    setMsgText('')
    const { data } = await supabase.from('messages').insert({ from_id: user.id, to_id: active.userId, text: txt, from_username: profile.username }).select().single()
    if (data) setMessages(m => [...m, data])
  }

  if (showNew) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b8dee', padding: 4 }}><IC.Back /></button>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>Новое сообщение</span>
      </div>
      {allProfiles.map(p => (
        <div key={p.id} onClick={() => { openChat(p.id, p.username); setShowNew(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827', cursor: 'pointer' }}>
          <Ava name={p.username} url={p.avatar_url} size={46} />
          <div><div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{p.username}</div>{p.bio && <div style={{ color: '#64748b', fontSize: 12 }}>{p.bio}</div>}</div>
        </div>
      ))}
    </div>
  )

  if (active) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: '1px solid #1f2937', marginBottom: 12 }}>
        <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5b8dee', padding: 4 }}><IC.Back /></button>
        <Ava name={active.username} size={38} />
        <div><div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{active.username}</div><div style={{ color: '#22c55e', fontSize: 11 }}>В сети</div></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
        {messages.length===0 && <p style={{ textAlign: 'center', color: '#374151', marginTop: 40 }}>Начни разговор 👋</p>}
        {messages.map(m => {
          const isMe = m.from_id===user.id
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMe?'flex-end':'flex-start', gap: 8 }}>
              {!isMe && <Ava name={m.from_username} size={28} />}
              <div style={{ maxWidth: '72%', background: isMe?'linear-gradient(135deg,#5b8dee,#3a6bc7)':'#111827', border: isMe?'none':'1px solid #1f2937', borderRadius: isMe?'16px 16px 4px 16px':'16px 16px 16px 4px', padding: '10px 14px' }}>
                <div style={{ color: '#f1f5f9', fontSize: 14, lineHeight: 1.5 }}>{m.text}</div>
                <div style={{ color: isMe?'#ffffff77':'#374151', fontSize: 10, marginTop: 4, textAlign: 'right' }}>{timeAgo(m.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #1f2937' }}>
        <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMsg()} placeholder="Сообщение..." style={{ flex: 1, background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={sendMsg} style={{ background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 12, padding: '0 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><IC.Send /></button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Сообщения</span>
        <button onClick={async () => { const { data } = await supabase.from('profiles').select('*').neq('id', user.id).limit(20); setAllProfiles(data ?? []); setShowNew(true) }} style={{ background: '#5b8dee22', border: '1px solid #1e3a5f', borderRadius: 9, padding: '6px 14px', color: '#5b8dee', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <IC.Plus /> Написать
        </button>
      </div>
      {chats.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Нет сообщений 💬</div>
        : chats.map(c => (
          <div key={c.userId} onClick={() => openChat(c.userId, c.username)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827', cursor: 'pointer' }}>
            <div style={{ position: 'relative' }}>
              <Ava name={c.username} size={50} />
              <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22c55e', border: '2px solid #0a0f1a' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{c.username}</span>
                <span style={{ color: '#374151', fontSize: 11 }}>{c.time}</span>
              </div>
              <div style={{ color: '#4b5563', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMsg}</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── MUSIC PAGE ──
function MusicPage({ user }: { user: AuthUser }) {
  const [tracks, setTracks] = useState<{id:string;created_at:string;title:string;artist:string;url:string;user_id:string}[]>([])
  const [playing, setPlaying] = useState<string|null>(null)
  const [progress, setProgress] = useState<Record<string,number>>({})
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [newTrack, setNewTrack] = useState({ title: '', artist: '' })
  const [audioFile, setAudioFile] = useState<File|null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement|null>(null)
  const CL = ['#e05b8d','#5b8dee','#5be0c4','#c45bee','#e0b45b']

  useEffect(() => {
    supabase.from('music').select('*').order('created_at', { ascending: false }).then(({ data }) => { setTracks(data ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!playing) { audioRef.current?.pause(); return }
    const track = tracks.find(t => t.id===playing)
    if (track?.url && audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.play().catch(()=>{})
    }
  }, [playing, tracks])

  const uploadTrack = async () => {
    if (!audioFile || !newTrack.title.trim()) return
    setUploading(true)
    const path = `music/${user.id}/${Date.now()}.${audioFile.name.split('.').pop()}`
    const { error } = await supabase.storage.from('music').upload(path, audioFile)
    if (!error) {
      const { data: u } = supabase.storage.from('music').getPublicUrl(path)
      const { data } = await supabase.from('music').insert({ title: newTrack.title, artist: newTrack.artist || 'Unknown', url: u.publicUrl, user_id: user.id }).select().single()
      if (data) setTracks(t => [data, ...t])
    }
    setUploading(false); setShowUpload(false); setNewTrack({ title:'', artist:'' }); setAudioFile(null)
  }

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} onTimeUpdate={() => {
        if (audioRef.current && playing) {
          const pct = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100
          setProgress(p => ({ ...p, [playing]: pct }))
        }
      }} />
      <div style={{ background: 'linear-gradient(135deg,#0c1830,#1a2d4a)', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #1e3a5f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#5b8dee', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Сейчас популярно</div>
          <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800 }}>Музыка Hashtag 🎵</div>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} style={{ background: '#5b8dee22', border: '1px solid #1e3a5f', borderRadius: 10, padding: '8px 14px', color: '#5b8dee', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IC.Plus /> Добавить
        </button>
      </div>

      {showUpload && (
        <div style={{ background: '#111827', borderRadius: 14, border: '1px solid #1f2937', padding: 16, marginBottom: 16 }}>
          <input value={newTrack.title} onChange={e => setNewTrack(n => ({ ...n, title: e.target.value }))} placeholder="Название трека *" style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 9, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
          <input value={newTrack.artist} onChange={e => setNewTrack(n => ({ ...n, artist: e.target.value }))} placeholder="Исполнитель" style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 9, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => setAudioFile(e.target.files?.[0] ?? null)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 9, padding: '10px', color: audioFile?'#5b8dee':'#4b5563', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              {audioFile ? `✓ ${audioFile.name.slice(0,20)}...` : '🎵 Выбрать файл'}
            </button>
            <button onClick={uploadTrack} disabled={uploading} style={{ background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 9, padding: '10px 16px', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, opacity: uploading?0.7:1 }}>
              {uploading ? '...' : 'Загрузить'}
            </button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : tracks.length===0
        ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Треков пока нет</div>
        : tracks.map((t, i) => {
          const color = CL[i%CL.length]; const isP = playing===t.id
          return (
            <div key={t.id} onClick={() => setPlaying(isP?null:t.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, background: isP?'#111827':'transparent', border: `1px solid ${isP?'#1f2937':'transparent'}`, cursor: 'pointer', transition: 'all 0.15s', marginBottom: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg,${color}33,${color}77)`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                {isP ? <IC.Pause /> : <IC.Play />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>{t.title}</div>
                <div style={{ color: '#4b5563', fontSize: 12, marginTop: 2 }}>{t.artist}</div>
                {isP && <div style={{ marginTop: 6, background: '#1f2937', borderRadius: 4, height: 3 }}><div style={{ height: '100%', width: `${progress[t.id]??0}%`, background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: 4, transition: 'width 0.1s' }} /></div>}
              </div>
              {t.user_id===user.id && (
                <button onClick={async e => { e.stopPropagation(); await supabase.from('music').delete().eq('id', t.id); setTracks(prev => prev.filter(x => x.id!==t.id)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4, borderRadius: 6, transition: 'color 0.15s' }} onMouseEnter={e=>(e.currentTarget.style.color='#e05b5b')} onMouseLeave={e=>(e.currentTarget.style.color='#374151')}><IC.Trash /></button>
              )}
            </div>
          )
        })
      }
    </div>
  )
}

// ── SEARCH PAGE ──
function SearchPage({ user }: { user: AuthUser }) {
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'posts'|'people'>('posts')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    const [{ data: p }, { data: u }] = await Promise.all([
      supabase.from('posts').select('*').ilike('text', `%${query}%`).limit(20),
      supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(20)
    ])
    setPosts(p ?? []); setProfiles(u ?? []); setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && search()} placeholder="Поиск постов и людей..." style={{ flex: 1, background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={search} style={{ background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 12, padding: '0 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><IC.Search /></button>
      </div>
      {(posts.length>0||profiles.length>0) && (
        <div style={{ display: 'flex', background: '#111827', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 }}>
          {(['posts','people'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', background: tab===t?'#1f2937':'transparent', color: tab===t?'#f1f5f9':'#4b5563', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {t==='posts'?`Посты (${posts.length})`:`Люди (${profiles.length})`}
            </button>
          ))}
        </div>
      )}
      {loading && <Spinner />}
      {tab==='posts' && posts.map(p => <PostCard key={p.id} post={p} currentUser={user} onLike={()=>{}} onSave={()=>{}} onDelete={()=>{}} />)}
      {tab==='people' && profiles.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #111827' }}>
          <Ava name={p.username} url={p.avatar_url} size={46} />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700 }}>{p.username}</div>
            {p.bio && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{p.bio}</div>}
          </div>
        </div>
      ))}
      {!loading && posts.length===0 && profiles.length===0 && query && <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Ничего не найдено</div>}
    </div>
  )
}

// ── PROFILE PAGE ──
function ProfilePage({ user, profile, setProfile, onLogout }: { user: AuthUser; profile: Profile; setProfile: (p: Profile) => void; onLogout: () => void }) {
  const [tab, setTab] = useState<'posts'|'media'|'saved'>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: profile.username, bio: profile.bio ?? '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setPosts(data ?? []))
    supabase.from('saved_posts').select('post_id').eq('user_id', user.id).then(async ({ data }) => {
      if (!data?.length) return
      const ids = data.map(s => s.post_id)
      const { data: ps } = await supabase.from('posts').select('*').in('id', ids)
      setSavedPosts(ps ?? [])
    })
  }, [user.id])

  const saveProfile = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').update({ username: form.username, bio: form.bio }).eq('id', user.id).select().single()
    if (data) { setProfile(data); setEditing(false); setToast('Профиль обновлён!') }
    setLoading(false)
  }

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const path = `avatars/${user.id}.${f.name.split('.').pop()}`
    await supabase.storage.from('avatars').upload(path, f, { upsert: true })
    const { data: u } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: u.publicUrl }).eq('id', user.id)
    setProfile({ ...profile, avatar_url: u.publicUrl }); setToast('Аватар обновлён!')
  }

  const color = colorFor(profile.username)
  const mediaPosts = posts.filter(p => p.image_url)

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}
      <div style={{ height: 110, borderRadius: 16, marginBottom: -36, background: `linear-gradient(135deg,${color}11,${color}22,#0c2040)`, border: '1px solid #1f2937', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 15, right: 20, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle,${color}0d,transparent)` }} />
      </div>
      <div style={{ paddingLeft: 16, marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Ava name={profile.username} url={profile.avatar_url} size={76} ring={color} />
          <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#5b8dee', border: '2px solid #0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 14 }}>+</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
        </div>
      </div>
      <div style={{ padding: '0 16px 20px', borderBottom: '1px solid #1f2937' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Расскажи о себе..." rows={3} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveProfile} disabled={loading} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>{loading?'...':'Сохранить'}</button>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1f2937', borderRadius: 10, color: '#94a3b8', fontFamily: 'inherit', cursor: 'pointer' }}>Отмена</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ color: '#f1f5f9', fontSize: 19, fontWeight: 800 }}>{profile.username}</div>
                <div style={{ color: '#374151', fontSize: 13, marginTop: 2 }}>@{profile.username}</div>
              </div>
              <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: '1px solid #1f2937', borderRadius: 10, padding: '7px 16px', color: '#94a3b8', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>Редактировать</button>
            </div>
            {profile.bio && <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{profile.bio}</p>}
          </>
        )}
        <div style={{ display: 'flex', gap: 28 }}>
          {[[posts.length.toString(),'постов'],[savedPosts.length.toString(),'сохранено'],['0','читателей']].map(([n,l]) => (
            <div key={l}><div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 18 }}>{n}</div><div style={{ color: '#374151', fontSize: 11 }}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
        {(['posts','media','saved'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: tab===t?'#5b8dee':'#374151', fontFamily: 'inherit', borderBottom: tab===t?'2px solid #5b8dee':'2px solid transparent', fontWeight: tab===t?700:400, transition: 'all 0.15s' }}>
            {{ posts:'Посты', media:'Медиа', saved:'Сохранённые' }[t]}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: 12 }}>
        {tab==='posts' && (posts.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Нет постов</div>
          : posts.map(p => <PostCard key={p.id} post={p} currentUser={user} onLike={()=>{}} onSave={()=>{}} onDelete={async id => { await supabase.from('posts').delete().eq('id', id); setPosts(prev => prev.filter(x => x.id!==id)) }} />)
        )}
        {tab==='media' && (mediaPosts.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Нет медиа</div>
          : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginTop: 4 }}>
            {mediaPosts.map(p => <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 4 }}><img src={p.image_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>)}
          </div>
        )}
        {tab==='saved' && (savedPosts.length===0 ? <div style={{ textAlign: 'center', color: '#374151', padding: 40 }}>Нет сохранённых постов</div>
          : savedPosts.map(p => <PostCard key={p.id} post={{ ...p, saved: true }} currentUser={user} onLike={()=>{}} onSave={()=>{}} onDelete={()=>{}} />)
        )}
      </div>
      <div style={{ marginTop: 24, paddingBottom: 40 }}>
        <button onClick={onLogout} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #3f1f1f', borderRadius: 12, color: '#e05b5b', fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <IC.Logout /> Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}

// ── MAIN APP ──
const NAV = [
  { id: 'feed', label: 'Лента', Icon: IC.Home },
  { id: 'search', label: 'Поиск', Icon: IC.Search },
  { id: 'create', label: '', Icon: IC.Plus },
  { id: 'messages', label: 'Чаты', Icon: IC.Msg },
  { id: 'profile', label: 'Я', Icon: IC.User },
]
const SIDEBAR = [
  { id: 'feed', label: 'Лента', Icon: IC.Home },
  { id: 'search', label: 'Поиск', Icon: IC.Search },
  { id: 'friends', label: 'Друзья', Icon: IC.Users },
  { id: 'messages', label: 'Сообщения', Icon: IC.Msg },
  { id: 'notifications', label: 'Уведомления', Icon: IC.Bell },
  { id: 'music', label: 'Музыка', Icon: IC.Music },
  { id: 'profile', label: 'Профиль', Icon: IC.User },
]

export default function Page() {
  const [authUser, setAuthUser] = useState<AuthUser|null>(null)
  const [profile, setProfile] = useState<Profile|null>(null)
  const [tab, setTab] = useState('feed')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const u = data.session.user
        const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
        setAuthUser({ id: u.id, email: u.email! })
        setProfile(p ?? { id: u.id, username: u.email!.split('@')[0], avatar_url: null, bio: null })
      }
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event==='SIGNED_OUT') { setAuthUser(null); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // count unread notifications
  useEffect(() => {
    if (!authUser) return
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('receiver_id', authUser.id).eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [authUser, tab])

  const logout = async () => { await supabase.auth.signOut(); setAuthUser(null); setProfile(null) }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 32px #5b8dee44' }}><IC.Hash s={24} /></div>
        <Spinner />
      </div>
    </div>
  )

  if (!authUser || !profile) return <AuthPage onAuth={(u, p) => { setAuthUser(u); setProfile(p) }} />

  const titles: Record<string,string> = { feed:'Hashtag', search:'Поиск', friends:'Друзья', messages:'Сообщения', notifications:'Уведомления', music:'Музыка', profile:'Профиль' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{background:#0a0f1a;color:#f1f5f9;font-family:'Manrope',sans-serif}
        ::-webkit-scrollbar{display:none}
        input,textarea,button{font-family:'Manrope',sans-serif}
        input::placeholder,textarea::placeholder{color:#374151}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .pane{animation:fadeUp 0.2s ease}
        @media(min-width:768px){.sidebar{display:flex!important}.bottomnav{display:none!important}}
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', background: '#0a0f1a' }}>

        {/* ─── SIDEBAR ─── */}
        <div className="sidebar" style={{ display: 'none', flexDirection: 'column', gap: 2, padding: '24px 12px', width: 230, flexShrink: 0, borderRight: '1px solid #111827', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IC.Hash s={16} /></div>
            <span style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Hashtag</span>
          </div>
          {SIDEBAR.map(t => {
            const active = tab===t.id
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setShowCreate(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: 'none', background: active?'#111827':'transparent', color: active?'#5b8dee':'#4b5563', cursor: 'pointer', fontSize: 15, fontWeight: active?700:400, fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s', position: 'relative' }}>
                <t.Icon a={active} />
                {t.label}
                {t.id==='notifications' && unreadCount>0 && <span style={{ marginLeft: 'auto', background: '#e05b8d', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{unreadCount}</span>}
              </button>
            )
          })}
          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <button onClick={() => setShowCreate(true)} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IC.Plus /> Создать пост
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 12px', marginTop: 12, borderTop: '1px solid #111827' }}>
            <Ava name={profile.username} url={profile.avatar_url} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.username}</div>
              <div style={{ color: '#374151', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser.email}</div>
            </div>
            <button onClick={logout} title="Выйти" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4 }}><IC.Logout /></button>
          </div>
        </div>

        {/* ─── MAIN ─── */}
        <div style={{ flex: 1, maxWidth: 600, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0a0f1acc', backdropFilter: 'blur(16px)', padding: '16px 16px 13px', borderBottom: '1px solid #111827' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {tab==='feed' && !showCreate && <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#5b8dee,#3a6bc7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IC.Hash s={14} /></div>}
                <h1 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>{showCreate?'Новый пост':titles[tab]}</h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => { setTab('notifications'); setShowCreate(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: unreadCount>0?'#5b8dee':'#374151', padding: 4, position: 'relative' }}>
                  <IC.Bell />
                  {unreadCount>0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#e05b8d', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</span>}
                </button>
                <Ava name={profile.username} url={profile.avatar_url} size={32} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pane" key={showCreate?'create':tab} style={{ flex: 1, padding: '16px 16px 90px', overflowY: 'auto' }}>
            {showCreate
              ? <CreatePost user={authUser} profile={profile} onPost={() => { setShowCreate(false); setTab('feed') }} />
              : tab==='feed' ? <FeedPage user={authUser} profile={profile} />
              : tab==='search' ? <SearchPage user={authUser} />
              : tab==='friends' ? <FriendsPage user={authUser} />
              : tab==='messages' ? <MessagesPage user={authUser} profile={profile} />
              : tab==='notifications' ? <NotificationsPage user={authUser} />
              : tab==='music' ? <MusicPage user={authUser} />
              : tab==='profile' ? <ProfilePage user={authUser} profile={profile} setProfile={setProfile} onLogout={logout} />
              : null}
          </div>

          {/* Bottom nav */}
          <div className="bottomnav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0f1af0', backdropFilter: 'blur(20px)', borderTop: '1px solid #111827', display: 'flex', padding: '8px 0 14px', zIndex: 20 }}>
            {NAV.map(t => {
              const active = !showCreate && tab===t.id
              return (
                <button key={t.id} onClick={() => { if (t.id==='create') { setShowCreate(true); return }; setTab(t.id); setShowCreate(false) }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: active?'#5b8dee':'#374151', padding: '4px 0', transition: 'color 0.15s', fontFamily: 'inherit' }}>
                  {t.id==='create'
                    ? <div style={{ width: 42, height: 42, borderRadius: 13, marginTop: -10, background: showCreate?'#3a6bc7':'linear-gradient(135deg,#5b8dee,#3a6bc7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 20px #5b8dee44' }}><t.Icon /></div>
                    : <><t.Icon a={active} /><span style={{ fontSize: 10, fontWeight: active?700:400 }}>{t.label}</span></>
                  }
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
