'use client'

import { useState } from "react";

/* ─── DATA ─── */
const POSTS_DATA = [
  {
    id: 1,
    user: { name: "Алина Ковалёва", handle: "alina_k", avatar: "АК", color: "#5b8dee" },
    time: "2м",
    text: "Закат над городом — лучшее что есть в этом мире 🌇",
    likes: 128, comments: 14, reposts: 6,
    tags: ["фото", "город"], liked: false,
  },
  {
    id: 2,
    user: { name: "Макс Орлов", handle: "max_orl", avatar: "МО", color: "#e05b8d" },
    time: "15м",
    text: "Только что вышел новый альбом от @midnight_wave — слушаю на повторе уже третий час. Рекомендую всем 🎵",
    likes: 84, comments: 32, reposts: 19,
    tags: ["музыка"], liked: true,
  },
  {
    id: 3,
    user: { name: "Лера Синицина", handle: "lera.s", avatar: "ЛС", color: "#5be0c4" },
    time: "1ч",
    text: "Пишу диплом и параллельно изучаю Rust. Продуктивность = 0. Хаос = 100. Но как-то справляюсь 🤙",
    likes: 211, comments: 47, reposts: 23,
    tags: ["жизнь", "код"], liked: false,
  },
  {
    id: 4,
    user: { name: "Иван Дробот", handle: "drobot_iv", avatar: "ИД", color: "#e0b45b" },
    time: "3ч",
    text: "Опубликовал новую статью про архитектуру микросервисов. Ссылка в профиле. Буду рад фидбеку 🚀",
    likes: 56, comments: 8, reposts: 11,
    tags: ["разработка"], liked: false,
  },
];

const STORIES_DATA = [
  { id: 1, name: "Моя", avatar: "+", color: "#5b8dee", isOwn: true },
  { id: 2, name: "alina_k", avatar: "АК", color: "#5b8dee", active: true },
  { id: 3, name: "max_orl", avatar: "МО", color: "#e05b8d", active: true },
  { id: 4, name: "lera.s", avatar: "ЛС", color: "#5be0c4", active: false },
  { id: 5, name: "drobot", avatar: "ИД", color: "#e0b45b", active: true },
  { id: 6, name: "katya_v", avatar: "КВ", color: "#c45bee", active: false },
];

const NOTIFS = [
  { id: 1, user: POSTS_DATA[0].user, action: "лайкнул твой пост", time: "2м", icon: "❤️" },
  { id: 2, user: POSTS_DATA[1].user, action: "начал читать тебя", time: "10м", icon: "👤" },
  { id: 3, user: POSTS_DATA[2].user, action: "ответил на твой пост", time: "1ч", icon: "💬" },
  { id: 4, user: POSTS_DATA[3].user, action: "упомянул тебя", time: "3ч", icon: "🔖" },
];

const TRENDING = ["дизайн", "разработка", "музыка", "фото", "путешествия", "код"];

/* ─── ICONS ─── */
const Icon = {
  Home: ({ active }: { active?: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1z" /><path d="M9 22V12h6v10" />
    </svg>
  ),
  Search: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Plus: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Bell: ({ active }: { active?: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  User: ({ active }: { active?: boolean }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Heart: ({ filled }: { filled?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "#e05b8d" : "none"} stroke={filled ? "#e05b8d" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  Comment: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  Share: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  Hash: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
};

/* ─── TYPES ─── */
type UserType = { name: string; handle: string; avatar: string; color: string };
type PostType = { id: number; user: UserType; time: string; text: string; likes: number; comments: number; reposts: number; tags: string[]; liked: boolean };

/* ─── COMPONENTS ─── */
function Avatar({ user, size = 40 }: { user: UserType; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${user.color}33, ${user.color}77)`,
      border: `1.5px solid ${user.color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.3, fontWeight: 700, color: user.color,
      flexShrink: 0, letterSpacing: "-0.5px",
    }}>
      {user.avatar}
    </div>
  );
}

function PostCard({ post, onLike }: { post: PostType; onLike: (id: number) => void }) {
  return (
    <div style={{
      background: "#111827", borderRadius: 16, padding: 16, marginBottom: 10,
      border: "1px solid #1f2937", transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar user={post.user} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{post.user.name}</span>
            <span style={{ color: "#374151", fontSize: 12 }}>@{post.user.handle}</span>
          </div>
          <div style={{ color: "#374151", fontSize: 11, marginTop: 1 }}>{post.time} назад</div>
        </div>
        <div style={{ color: "#374151", fontSize: 18, cursor: "pointer", padding: "0 4px", letterSpacing: 1 }}>···</div>
      </div>

      <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.65, margin: "0 0 12px 0" }}>
        {post.text}
      </p>

      {post.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 14 }}>
          {post.tags.map(tag => (
            <span key={tag} style={{
              background: "#0f172a", color: "#5b8dee", fontSize: 11,
              padding: "3px 9px", borderRadius: 6, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 3,
              border: "1px solid #1e3a5f",
            }}>
              <Icon.Hash size={10} />#{tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", borderTop: "1px solid #1f2937", paddingTop: 12, gap: 4 }}>
        {[
          { icon: <Icon.Heart filled={post.liked} />, count: post.likes, action: () => onLike(post.id), active: post.liked },
          { icon: <Icon.Comment />, count: post.comments, action: () => {} },
          { icon: <Icon.Share />, count: post.reposts, action: () => {} },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, background: "none", border: "none", cursor: "pointer",
            color: item.active ? "#e05b8d" : "#4b5563", fontSize: 13,
            padding: "4px 0", borderRadius: 8, transition: "color 0.15s",
            fontFamily: "inherit",
          }}>
            {item.icon}
            <span style={{ fontWeight: 500 }}>{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── PAGES ─── */
function FeedPage({ posts, onLike }: { posts: PostType[]; onLike: (id: number) => void }) {
  return (
    <div>
      {/* Stories */}
      <div style={{ display: "flex", gap: 14, overflowX: "auto" as const, padding: "4px 0 20px", scrollbarWidth: "none" as const }}>
        {STORIES_DATA.map(s => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 5, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ position: "relative" as const, width: 58, height: 58 }}>
              {s.active && (
                <div style={{
                  position: "absolute" as const, inset: -2, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${s.color}, ${s.color}44)`,
                }} />
              )}
              <div style={{ position: "absolute" as const, inset: s.active ? 2 : 0, borderRadius: "50%", background: "#0a0f1a" }} />
              <div style={{
                position: "absolute" as const, inset: s.active ? 4 : 0, borderRadius: "50%",
                background: `linear-gradient(135deg, ${s.color}22, ${s.color}55)`,
                border: `1.5px solid ${s.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: s.isOwn ? 22 : 14, fontWeight: 700, color: s.color,
              }}>
                {s.avatar}
              </div>
            </div>
            <span style={{
              fontSize: 10, color: s.active ? "#94a3b8" : "#374151",
              maxWidth: 58, textOverflow: "ellipsis", overflow: "hidden",
              whiteSpace: "nowrap" as const, textAlign: "center" as const,
            }}>{s.name}</span>
          </div>
        ))}
      </div>
      {posts.map(p => <PostCard key={p.id} post={p} onLike={onLike} />)}
    </div>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  return (
    <div>
      <div style={{ position: "relative" as const, marginBottom: 24 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по Hashtag..."
          style={{
            width: "100%", padding: "13px 16px 13px 44px",
            background: "#111827", border: "1px solid #1f2937",
            borderRadius: 12, color: "#f1f5f9", fontSize: 14,
            fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
          }}
        />
        <div style={{ position: "absolute" as const, left: 14, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }}>
          <Icon.Search />
        </div>
      </div>

      <p style={{ color: "#374151", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 12px" }}>Популярные теги</p>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 28 }}>
        {TRENDING.map(tag => (
          <div key={tag} style={{
            background: "#111827", border: "1px solid #1f2937", borderRadius: 10,
            padding: "8px 14px", color: "#64748b", fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Icon.Hash size={12} />{tag}
          </div>
        ))}
      </div>

      <p style={{ color: "#374151", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 12px" }}>Кого читать</p>
      {POSTS_DATA.map(p => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #111827" }}>
          <Avatar user={p.user} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>{p.user.name}</div>
            <div style={{ color: "#374151", fontSize: 12 }}>@{p.user.handle}</div>
          </div>
          <button style={{
            background: "transparent", border: "1px solid #1e3a5f", borderRadius: 9,
            padding: "6px 16px", color: "#5b8dee", fontSize: 12, cursor: "pointer",
            fontFamily: "inherit", fontWeight: 600,
          }}>Читать</button>
        </div>
      ))}
    </div>
  );
}

function CreatePage() {
  const [text, setText] = useState("");
  return (
    <div style={{ background: "#111827", borderRadius: 16, border: "1px solid #1f2937", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Avatar user={{ name: "Я", handle: "me", avatar: "Я", color: "#5b8dee" }} size={44} />
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Что у тебя нового?"
          style={{
            flex: 1, minHeight: 120, background: "transparent",
            border: "none", outline: "none", color: "#f1f5f9",
            fontSize: 15, fontFamily: "inherit", resize: "none" as const, lineHeight: 1.65,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1f2937", paddingTop: 14 }}>
        <div style={{ display: "flex", gap: 16 }}>
          {["📷", "🎵", "📍"].map(ic => (
            <button key={ic} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 4, borderRadius: 6 }}>{ic}</button>
          ))}
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#5b8dee", padding: 4 }}><Icon.Hash size={18} /></button>
        </div>
        <button style={{
          background: text.length > 0 ? "linear-gradient(135deg, #5b8dee, #3a6bc7)" : "#1f2937",
          border: "none", borderRadius: 10, padding: "10px 24px",
          color: text.length > 0 ? "#fff" : "#374151", fontSize: 14,
          fontFamily: "inherit", fontWeight: 600, cursor: text.length > 0 ? "pointer" : "default",
          transition: "all 0.2s",
        }}>Опубликовать</button>
      </div>
    </div>
  );
}

function NotifPage() {
  return (
    <div>
      <p style={{ color: "#374151", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 16px" }}>Последние</p>
      {NOTIFS.map(n => (
        <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid #111827" }}>
          <div style={{ position: "relative" as const }}>
            <Avatar user={n.user} size={44} />
            <div style={{ position: "absolute" as const, bottom: -2, right: -2, fontSize: 14 }}>{n.icon}</div>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{n.user.name}</span>
            <span style={{ color: "#94a3b8", fontSize: 13 }}> {n.action}</span>
            <div style={{ color: "#374151", fontSize: 11, marginTop: 3 }}>{n.time} назад</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfilePage() {
  const [tab, setTab] = useState("posts");
  const me: UserType = { name: "Мой профиль", handle: "my_profile", avatar: "Я", color: "#5b8dee" };
  return (
    <div>
      <div style={{
        height: 100, borderRadius: 16, marginBottom: -32,
        background: "linear-gradient(135deg, #0c1830, #1a2d4a, #0c2040)",
        border: "1px solid #1f2937", position: "relative" as const, overflow: "hidden" as const,
      }}>
        <div style={{ position: "absolute" as const, top: 15, right: 20, width: 90, height: 90, borderRadius: "50%", background: "radial-gradient(circle, #5b8dee0d, transparent)", border: "1px solid #5b8dee11" }} />
      </div>
      <div style={{ paddingLeft: 16, marginBottom: 12, position: "relative" as const, zIndex: 1 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: `linear-gradient(135deg, ${me.color}33, ${me.color}77)`,
          border: `3px solid #0a0f1a`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 22, fontWeight: 700, color: me.color,
          boxShadow: `0 0 0 1.5px ${me.color}33`,
        }}>{me.avatar}</div>
      </div>
      <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1f2937" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>{me.name}</div>
            <div style={{ color: "#374151", fontSize: 13, marginTop: 2 }}>@{me.handle}</div>
          </div>
          <button style={{ background: "transparent", border: "1px solid #1f2937", borderRadius: 10, padding: "7px 16px", color: "#94a3b8", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            Редактировать
          </button>
        </div>
        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, margin: "12px 0" }}>
          Просто живу и иногда пишу сюда. Люблю код, музыку и хорошие идеи ✨
        </p>
        <div style={{ display: "flex", gap: 28 }}>
          {[["348", "постов"], ["1.2K", "читателей"], ["280", "читает"]].map(([n, l]) => (
            <div key={l}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 17 }}>{n}</div>
              <div style={{ color: "#374151", fontSize: 11 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #1f2937" }}>
        {["posts", "media", "likes"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "12px 0", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: tab === t ? "#5b8dee" : "#374151", fontFamily: "inherit",
            borderBottom: tab === t ? "2px solid #5b8dee" : "2px solid transparent",
            fontWeight: tab === t ? 600 : 400, transition: "all 0.15s",
          }}>
            {{ posts: "Посты", media: "Медиа", likes: "Лайки" }[t]}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: 12 }}>
        {POSTS_DATA.slice(0, 2).map(p => <PostCard key={p.id} post={p} onLike={() => {}} />)}
      </div>
    </div>
  );
}

/* ─── NAV ─── */
const TABS = [
  { id: "feed", label: "Лента", Icon: Icon.Home },
  { id: "search", label: "Поиск", Icon: Icon.Search },
  { id: "create", label: "Создать", Icon: Icon.Plus },
  { id: "notif", label: "Уведомления", Icon: Icon.Bell },
  { id: "profile", label: "Профиль", Icon: Icon.User },
];

/* ─── APP ─── */
export default function Page() {
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState<PostType[]>(POSTS_DATA);

  const handleLike = (id: number) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const titles: Record<string, string> = { feed: "Hashtag", search: "Поиск", create: "Новый пост", notif: "Уведомления", profile: "Профиль" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0a0f1a; color: #f1f5f9; font-family: 'Manrope', sans-serif; }
        ::-webkit-scrollbar { display: none; }
        input, textarea, button { font-family: 'Manrope', sans-serif; }
        input::placeholder, textarea::placeholder { color: #374151; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .page-content { animation: fadeUp 0.25s ease; }
        @media (min-width: 768px) {
          .sidebar { display: flex !important; }
          .bottom-nav { display: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", justifyContent: "center", background: "#0a0f1a" }}>

        {/* Sidebar (desktop) */}
        <div className="sidebar" style={{
          display: "none", flexDirection: "column" as const, gap: 2,
          padding: "24px 12px", width: 220, flexShrink: 0,
          borderRight: "1px solid #111827", position: "sticky" as const,
          top: 0, height: "100vh",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #5b8dee, #3a6bc7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon.Hash size={16} />
            </div>
            <span style={{ color: "#f1f5f9", fontSize: 19, fontWeight: 800, letterSpacing: "-0.5px" }}>Hashtag</span>
          </div>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12, border: "none",
                background: active ? "#111827" : "transparent",
                color: active ? "#5b8dee" : "#4b5563",
                cursor: "pointer", fontSize: 15, fontWeight: active ? 600 : 400,
                fontFamily: "inherit", textAlign: "left" as const, transition: "all 0.15s",
              }}>
                <t.Icon active={active} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main */}
        <div style={{ flex: 1, maxWidth: 600, display: "flex", flexDirection: "column" as const, minHeight: "100vh" }}>

          {/* Header */}
          <div style={{
            position: "sticky" as const, top: 0, zIndex: 10,
            background: "#0a0f1acc", backdropFilter: "blur(16px)",
            padding: "16px 16px 13px", borderBottom: "1px solid #111827",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {tab === "feed" && (
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #5b8dee, #3a6bc7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon.Hash size={14} />
                  </div>
                )}
                <h1 style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>
                  {titles[tab]}
                </h1>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#111827", border: "1px solid #1f2937", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", cursor: "pointer", fontSize: 16 }}>
                ⚙
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="page-content" key={tab} style={{ flex: 1, padding: "16px 16px 90px", overflowY: "auto" as const }}>
            {tab === "feed" && <FeedPage posts={posts} onLike={handleLike} />}
            {tab === "search" && <SearchPage />}
            {tab === "create" && <CreatePage />}
            {tab === "notif" && <NotifPage />}
            {tab === "profile" && <ProfilePage />}
          </div>

          {/* Bottom nav (mobile) */}
          <div className="bottom-nav" style={{
            position: "fixed" as const, bottom: 0, left: 0, right: 0,
            background: "#0a0f1af0", backdropFilter: "blur(20px)",
            borderTop: "1px solid #111827", display: "flex",
            padding: "8px 0 14px", zIndex: 20,
          }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, display: "flex", flexDirection: "column" as const,
                  alignItems: "center", gap: 3, background: "none", border: "none",
                  cursor: "pointer", color: active ? "#5b8dee" : "#374151",
                  padding: "4px 0", transition: "color 0.15s", fontFamily: "inherit",
                }}>
                  {t.id === "create" ? (
                    <div style={{
                      width: 42, height: 42, borderRadius: 13, marginTop: -10,
                      background: "linear-gradient(135deg, #5b8dee, #3a6bc7)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", boxShadow: "0 4px 20px #5b8dee44",
                    }}>
                      <t.Icon />
                    </div>
                  ) : (
                    <>
                      <t.Icon active={active} />
                      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{t.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
