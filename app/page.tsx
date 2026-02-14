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
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file)

      if (data) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
        uploadedImageUrl = urlData.publicUrl
      } else {
        console.error("Ошибка загрузки:", error)
      }
    }

    await supabase.from('posts').insert([{ 
      content: text, 
      image_url: uploadedImageUrl 
    }])

    setText('')
    setFile(null)
    setLoading(false)
    fetchPosts()
  }

  return (
    <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ color: '#0070f3', textAlign: 'center' }}>#HASHTAG</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="Что происходит?"
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ cursor: 'pointer', padding: '8px 12px', background: '#eee', borderRadius: '6px', fontSize: '14px' }}>
                {file ? '✅ Фото выбрано' : '📎 Прикрепить фото'}
                <input 
                type="file" 
                accept="image/*" 
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
            </label>
            {file && <button onClick={() => setFile(null)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Удалить</button>}
        </div>
        <button 
          onClick={sendPost} 
          disabled={loading}
          style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Публикация...' : 'Опубликовать пост'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {posts.map(post => (
          <div key={post.id} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '15px', background: 'white' }}>
            <p style={{ fontSize: '16px', margin: '0 0 10px 0' }}>{post.content}</p>
            {post.image_url && (
              <img src={post.image_url} alt="post" style={{ width: '100%', borderRadius: '10px', display: 'block' }} />
            )}
          </div>
        ))}
      </div>
    </main>
  )
}