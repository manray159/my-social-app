'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [posts, setPosts] = useState<any[]>([])
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function sendPost() {
    if (!text && !file) return
    setLoading(true)

    let uploadedImageUrl = ""

    if (file) {
      const fileName = `${Date.now()}-${file.name}`
      const { data } = await supabase.storage.from('images').upload(fileName, file)
      if (data) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
        uploadedImageUrl = urlData.publicUrl
      }
    }

    await supabase.from('posts').insert([{ 
      content: text, 
      image_url: uploadedImageUrl,
      author: 'Я создатель' 
    }])

    setText('')
    setFile(null)
    setLoading(false)
    fetchPosts()
  }

  return (
    <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#000000' }}>
      <h1 style={{ color: '#0070f3', textAlign: 'center' }}>#HASHTAG</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', padding: '20px', background: '#f0f2f5', borderRadius: '15px', border: '1px solid #ddd' }}>
        <textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="Что нового?"
          style={{ 
            padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '100px',
            color: '#000000', backgroundColor: '#ffffff', fontSize: '16px' // Явно задаем черный текст на белом фоне
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', padding: '8px 12px', background: '#e4e6eb', borderRadius: '8px', color: '#000' }}>
                {file ? '✅ Фото выбрано' : '📎 Прикрепить фото'}
                <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <button 
              onClick={sendPost} 
              disabled={loading}
              style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {loading ? 'Публикуем...' : 'Опубликовать'}
            </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {posts.map(post => (
          <div key={post.id} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '15px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#65676b', fontSize: '14px', marginBottom: '8px' }}>{post.author || 'Аноним'}</div>
            <p style={{ fontSize: '16px', color: '#050505', margin: '0 0 10px 0' }}>{post.content}</p>
            {post.image_url && (
              <img src={post.image_url} alt="Пост" style={{ width: '100%', borderRadius: '10px' }} />
            )}
          </div>
        ))}
      </div>
    </main>
  )
}