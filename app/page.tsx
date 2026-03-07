import { useState } from "react";

const POSTS = [
  {
    id: 1,
    user: { name: "Алина Ковалёва", handle: "alina_k", avatar: "АК", color: "#5b8dee" },
    time: "2м",
    text: "Закат над городом — лучшее что есть в этом мире 🌇",
    image: null,
    likes: 128,
    comments: 14,
    reposts: 6,
    tags: ["фото", "город"],
    liked: false,
  },
  {
    id: 2,
    user: { name: "Макс Орлов", handle: "max_orl", avatar: "МО", color: "#e05b8d" },
    time: "15м",
    text: "Только что вышел новый альбом от @midnight_wave — слушаю на повторе уже третий час подряд. Рекомендую всем.",
    image: null,
    likes: 84,
    comments: 32,
    reposts: 19,
    tags: ["музыка"],
    liked: true,
  },
  {
    id: 3,
    user: { name: "Лера Синицина", handle: "lera.s", avatar: "ЛС", color: "#5be0c4" },
    time: "1ч",
    text: "Пишу диплом и параллельно изучаю Rust. Продуктивность = 0. Хаос = 100. Но как-то справляюсь 🤙",
    image: null,
    likes: 211,
    comments: 47,
    reposts: 23,
    tags: ["жизнь", "код"],
    liked: false,
  },
  {
    id: 4,
    user: { name: "Иван Дробот", handle: "drobot_iv", avatar: "ИД", color: "#e0b45b" },
    time: "3ч",
    text: "Опубликовал новую статью про архитектуру микросервисов. Ссылка в профиле. Буду рад фидбеку.",
    image: null,
    likes: 56,
    comments: 8,
    reposts: 11,
    tags: ["разработка"],
    liked: false,
  },
];

const STORIES = [
  { id: 1, name: "Ты", avatar: "Я", color: "#5b8dee", isOwn: true },
  { id: 2, name: "alina_k", avatar: "АК", color: "#5b8dee", active: true },
  { id: 3, name: "max_orl", avatar: "МО", color: "#e05b8d", active: true },
  { id: 4, name: "lera.s", avatar: "ЛС", color: "#5be0c4", active: false },
  { id: 5, name: "drobot", avatar: "ИД", color: "#e0b45b", active: true },
  { id: 6, name: "katya_v", avatar: "КВ", color: "#c45bee", active: false },
];

const TABS = [
  { id: "feed", icon: HomeIcon, label: "Лента" },
  { id: "search", icon: SearchIcon, label: "Поиск" },
  { id: "create", icon: PlusIcon, label: "Создать" },
  { id: "notif", icon: BellIcon, label: "Уведомления" },
  { id: "profile", icon: UserIcon, label: "Профиль" },
];

function HomeIcon({ size = 20, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}
function SearchIcon({ size = 20, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function PlusIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function BellIcon({ size = 20, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function UserIcon({ size = 20, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function HeartIcon({ size = 18, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#e05b8d" : "none"} stroke={filled ? "#e05b8d" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function CommentIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}
function HashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function Avatar({ user, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${user.color}44, ${user.color}99)`,
      border: `1.5px solid ${user.color}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 700, color: user.color,
      flexShrink: 0, letterSpacing: "-0.5px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {user.avatar}
    </div>
  );
}

function StoryRing({ active, color, size = 56 }) {
  if (!active) return null;
  return (
    <div style={{
      position: "absolute", inset: -3,
      borderRadius: "50%",
      background: `conic-gradient(${color} 0%, ${color}88 60%, transparent 100%)`,
      padding: 2,
    }} />
  );
}

function PostCard({ post, onLike }) {
  return (
    <div style={{
      background: "#151f2e",
      borderRadius: 16,
      padding: "16px",
      marginBottom: 12,
      border: "1px solid #1e2d42",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#2a3d58"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2d42"}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ position: "relative" }}>
          <Avatar user={post.user} size={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ color: "#e8edf5", fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
              {post.user.name}
            </span>
            <span style={{ color: "#3d5a80", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              @{post.user.handle}
            </span>
          </div>
          <div style={{ color: "#3d5a80", fontSize: 11, fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>
            {post.time} назад
          </div>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#3d5a80", cursor: "pointer",
          fontSize: 16, letterSpacing: 1,
        }}>···</div>
      </div>

      {/* Text */}
      <p style={{
        color: "#c8d6e8", fontSize: 14, lineHeight: 1.65,
        margin: "0 0 12px 0", fontFamily: "'DM Sans', sans-serif",
      }}>
        {post.text}
      </p>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {post.tags.map(tag => (
            <span key={tag} style={{
              background: "#1a2840", color: "#5b8dee",
              fontSize: 11, padding: "3px 8px", borderRadius: 6,
              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 3,
            }}>
              <HashIcon size={10} />#{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: "flex", gap: 0,
        borderTop: "1px solid #1a2840", paddingTop: 12,
      }}>
        {[
          { icon: <HeartIcon filled={post.liked} />, count: post.liked ? post.likes : post.likes, action: () => onLike(post.id), active: post.liked },
          { icon: <CommentIcon />, count: post.comments, action: () => {} },
          { icon: <ShareIcon />, count: post.reposts, action: () => {} },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, background: "none", border: "none", cursor: "pointer",
            color: item.active ? "#e05b8d" : "#3d5a80",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            padding: "4px 0", borderRadius: 8,
            transition: "color 0.15s",
          }}
            onMouseEnter={e => !item.active && (e.currentTarget.style.color = "#8aafd4")}
            onMouseLeave={e => !item.active && (e.currentTarget.style.color = "#3d5a80")}
          >
            {item.icon}
            <span style={{ fontWeight: 500 }}>{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedPage({ posts, onLike }) {
  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Stories */}
      <div style={{
        display: "flex", gap: 14, overflowX: "auto", padding: "4px 0 16px",
        scrollbarWidth: "none",
      }}>
        {STORIES.map(s => (
          <div key={s.id} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 5, cursor: "pointer", flexShrink: 0,
          }}>
            <div style={{ position: "relative", width: 56, height: 56 }}>
              {s.active && (
                <div style={{
                  position: "absolute", inset: -2, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${s.color}, ${s.color}55)`,
                  zIndex: 0,
                }} />
              )}
              <div style={{
                position: "absolute", inset: s.active ? 2 : 0,
                borderRadius: "50%", background: "#0e1621", zIndex: 1,
              }} />
              <div style={{
                position: "absolute", inset: s.active ? 4 : 0,
                borderRadius: "50%", zIndex: 2,
                background: `linear-gradient(135deg, ${s.color}33, ${s.color}77)`,
                border: `1.5px solid ${s.color}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: s.color,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {s.isOwn ? (
                  <span style={{ fontSize: 20, color: s.color, lineHeight: 1 }}>+</span>
                ) : s.avatar}
              </div>
            </div>
            <span style={{
              fontSize: 10, color: s.active ? "#8aafd4" : "#3d5a80",
              fontFamily: "'DM Sans', sans-serif", maxWidth: 56,
              textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
              textAlign: "center",
            }}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* Posts */}
      {posts.map(p => <PostCard key={p.id} post={p} onLike={onLike} />)}
    </div>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const trending = ["#дизайн", "#разработка", "#музыка", "#фото", "#путешествия", "#код"];
  return (
    <div>
      <div style={{
        position: "relative", marginBottom: 20,
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по Hashtag..."
          style={{
            width: "100%", padding: "12px 16px 12px 44px",
            background: "#151f2e", border: "1px solid #1e2d42",
            borderRadius: 12, color: "#e8edf5", fontSize: 14,
            fontFamily: "'DM Sans', sans-serif", outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "#5b8dee55"}
          onBlur={e => e.target.style.borderColor = "#1e2d42"}
        />
        <div style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          color: "#3d5a80",
        }}>
          <SearchIcon size={16} />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <h3 style={{
          color: "#5b8dee", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
          margin: "0 0 12px 0",
        }}>Популярные теги</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {trending.map(tag => (
            <div key={tag} style={{
              background: "#151f2e", border: "1px solid #1e2d42",
              borderRadius: 10, padding: "8px 14px",
              color: "#8aafd4", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#5b8dee44"; e.currentTarget.style.color = "#5b8dee"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2d42"; e.currentTarget.style.color = "#8aafd4"; }}
            >
              <HashIcon size={12} />{tag.slice(1)}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{
          color: "#5b8dee", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
          margin: "0 0 12px 0",
        }}>Кого читать</h3>
        {POSTS.map(p => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0", borderBottom: "1px solid #1a2840",
          }}>
            <Avatar user={p.user} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e8edf5", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                {p.user.name}
              </div>
              <div style={{ color: "#3d5a80", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                @{p.user.handle}
              </div>
            </div>
            <button style={{
              background: "transparent", border: "1px solid #5b8dee55",
              borderRadius: 8, padding: "6px 14px", color: "#5b8dee",
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
              fontWeight: 600, transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#5b8dee22"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              Читать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePage() {
  const [activeTab, setActiveTab] = useState("posts");
  const me = { name: "Ты", handle: "my_profile", avatar: "Я", color: "#5b8dee" };
  return (
    <div>
      {/* Cover */}
      <div style={{
        height: 100, borderRadius: 16, marginBottom: -32,
        background: "linear-gradient(135deg, #0e1e35 0%, #1a2d4a 50%, #0e2040 100%)",
        border: "1px solid #1e2d42",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 20, right: 24,
          width: 80, height: 80, borderRadius: "50%",
          background: "radial-gradient(circle, #5b8dee11, transparent)",
          border: "1px solid #5b8dee22",
        }} />
        <div style={{
          position: "absolute", top: -10, left: "40%",
          width: 120, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle, #5be0c411, transparent)",
        }} />
      </div>

      {/* Avatar */}
      <div style={{ paddingLeft: 16, marginBottom: 12, position: "relative", zIndex: 1 }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: `linear-gradient(135deg, ${me.color}44, ${me.color}99)`,
          border: `3px solid #0e1621`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: me.color,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: `0 0 0 1.5px ${me.color}44`,
        }}>
          {me.avatar}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #1a2840" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#e8edf5", fontSize: 18, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
              Мой профиль
            </div>
            <div style={{ color: "#3d5a80", fontSize: 13, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
              @{me.handle}
            </div>
          </div>
          <button style={{
            background: "transparent", border: "1px solid #2a3d58",
            borderRadius: 10, padding: "7px 16px", color: "#8aafd4",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
            fontWeight: 500,
          }}>
            Редактировать
          </button>
        </div>

        <p style={{
          color: "#8aafd4", fontSize: 13, lineHeight: 1.6,
          margin: "12px 0", fontFamily: "'DM Sans', sans-serif",
        }}>
          Просто живу и иногда пишу сюда. Люблю код, музыку и хорошие идеи ✨
        </p>

        <div style={{ display: "flex", gap: 24 }}>
          {[["348", "постов"], ["1.2K", "читателей"], ["280", "читает"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ color: "#e8edf5", fontWeight: 700, fontSize: 16, fontFamily: "'DM Sans', sans-serif" }}>{n}</div>
              <div style={{ color: "#3d5a80", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a2840" }}>
        {["posts", "media", "likes"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: "12px 0", background: "none", border: "none",
            cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
            color: activeTab === t ? "#5b8dee" : "#3d5a80",
            borderBottom: activeTab === t ? "2px solid #5b8dee" : "2px solid transparent",
            fontWeight: activeTab === t ? 600 : 400,
            transition: "all 0.15s",
          }}>
            {{ posts: "Посты", media: "Медиа", likes: "Лайки" }[t]}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 12 }}>
        {POSTS.slice(0, 2).map(p => <PostCard key={p.id} post={p} onLike={() => {}} />)}
      </div>
    </div>
  );
}

function NotifPage() {
  const notifs = [
    { id: 1, user: POSTS[0].user, action: "лайкнул твой пост", time: "2м", icon: "❤️" },
    { id: 2, user: POSTS[1].user, action: "начал читать тебя", time: "10м", icon: "👤" },
    { id: 3, user: POSTS[2].user, action: "ответил на твой пост", time: "1ч", icon: "💬" },
    { id: 4, user: POSTS[3].user, action: "упомянул тебя", time: "3ч", icon: "🔖" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{
          color: "#5b8dee", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
          margin: "0 0 12px 0",
        }}>Последние</h3>
        {notifs.map(n => (
          <div key={n.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderBottom: "1px solid #1a2840",
          }}>
            <div style={{ position: "relative" }}>
              <Avatar user={n.user} size={42} />
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                fontSize: 14, lineHeight: 1,
              }}>{n.icon}</div>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ color: "#e8edf5", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                {n.user.name}
              </span>
              <span style={{ color: "#8aafd4", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                {" "}{n.action}
              </span>
              <div style={{ color: "#3d5a80", fontSize: 11, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                {n.time} назад
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HashtagApp() {
  const [activeTab, setActiveTab] = useState("feed");
  const [posts, setPosts] = useState(POSTS);

  const handleLike = (id) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const titles = { feed: "Hashtag", search: "Поиск", create: "Новый пост", notif: "Уведомления", profile: "Профиль" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e1621",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      justifyContent: "center",
    }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        body { margin: 0; background: #0e1621; }
        input::placeholder { color: #3d5a80 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Desktop sidebar */}
      <div style={{
        display: "none",
        position: "sticky", top: 0, height: "100vh",
        flexDirection: "column", gap: 4,
        padding: "24px 16px",
        width: 240, flexShrink: 0,
        borderRight: "1px solid #1a2840",
        "@media (min-width: 768px)": { display: "flex" },
      }}
        className="desktop-sidebar"
      >
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 12px", marginBottom: 20,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #5b8dee, #3a6bc7)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <HashIcon size={18} />
          </div>
          <span style={{
            color: "#e8edf5", fontSize: 20, fontWeight: 700,
            letterSpacing: "-0.5px",
          }}>Hashtag</span>
        </div>

        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 12, border: "none",
              background: isActive ? "#151f2e" : "transparent",
              color: isActive ? "#5b8dee" : "#4a6580",
              cursor: "pointer", fontSize: 15, fontWeight: isActive ? 600 : 400,
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s", textAlign: "left",
            }}
              onMouseEnter={e => !isActive && (e.currentTarget.style.background = "#151f2e55")}
              onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={20} active={isActive} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div style={{
        flex: 1, maxWidth: 600,
        display: "flex", flexDirection: "column",
        minHeight: "100vh",
      }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "#0e1621ee",
          backdropFilter: "blur(12px)",
          padding: "16px 16px 12px",
          borderBottom: "1px solid #1a2840",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {activeTab === "feed" && (
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "linear-gradient(135deg, #5b8dee, #3a6bc7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <HashIcon size={15} />
                </div>
              )}
              <h1 style={{
                color: "#e8edf5", fontSize: 20, fontWeight: 700,
                margin: 0, letterSpacing: "-0.3px",
              }}>
                {titles[activeTab]}
              </h1>
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "#151f2e", border: "1px solid #1e2d42",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#3d5a80", cursor: "pointer", fontSize: 15,
            }}>⚙</div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, padding: "16px 16px 80px",
          animation: "fadeIn 0.25s ease",
          overflowY: "auto",
        }}>
          {activeTab === "feed" && <FeedPage posts={posts} onLike={handleLike} />}
          {activeTab === "search" && <SearchPage />}
          {activeTab === "notif" && <NotifPage />}
          {activeTab === "profile" && <ProfilePage />}
          {activeTab === "create" && (
            <div style={{
              background: "#151f2e", borderRadius: 16,
              border: "1px solid #1e2d42", padding: 20,
            }}>
              <textarea placeholder="Что у тебя нового?" style={{
                width: "100%", minHeight: 120,
                background: "transparent", border: "none", outline: "none",
                color: "#e8edf5", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                resize: "none", lineHeight: 1.65,
              }} />
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", borderTop: "1px solid #1a2840", paddingTop: 12, marginTop: 8,
              }}>
                <div style={{ display: "flex", gap: 12 }}>
                  {["📷", "🎵", "📍", "#"].map(ic => (
                    <button key={ic} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: ic === "#" ? 15 : 18, color: "#3d5a80",
                      padding: 4, borderRadius: 6,
                    }}>{ic}</button>
                  ))}
                </div>
                <button style={{
                  background: "linear-gradient(135deg, #5b8dee, #3a6bc7)",
                  border: "none", borderRadius: 10, padding: "9px 22px",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                }}>Опубликовать</button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#0e1621f0",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid #1a2840",
          display: "flex", padding: "8px 0 12px",
          zIndex: 20,
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 3,
                background: "none", border: "none", cursor: "pointer",
                color: isActive ? "#5b8dee" : "#3d5a80",
                padding: "4px 0", transition: "color 0.15s",
              }}>
                {t.id === "create" ? (
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: "linear-gradient(135deg, #5b8dee, #3a6bc7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", marginTop: -8,
                    boxShadow: "0 4px 16px #5b8dee44",
                  }}>
                    <Icon size={20} />
                  </div>
                ) : (
                  <>
                    <Icon size={22} active={isActive} />
                    <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: isActive ? 600 : 400 }}>
                      {t.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
