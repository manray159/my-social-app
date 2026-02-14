'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('Аноним');

  // 1. Загрузка постов
  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('id', { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => { fetchPosts(); }, []);

  // 2. Отправка поста
  const sendPost = async () => {
    if (!content) return;
    const { error } = await supabase
      .from('posts')
      .insert([{ author, content }]);
    
    if (!error) {
      setContent('');
      fetchPosts(); // Обновляем ленту
    } else {
      alert("Ошибка! Проверь, создал ли ты таблицу 'posts' в Supabase");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-black mb-8 text-blue-500 italic">#HASHTAG</h1>

        {/* Форма создания поста */}
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 mb-10 shadow-2xl">
          <input 
            className="bg-transparent text-blue-400 font-bold mb-2 block outline-none"
            placeholder="Твоё имя..."
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <textarea 
            className="bg-transparent w-full h-24 resize-none text-xl outline-none"
            placeholder="Что нового?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button 
            onClick={sendPost}
            className="bg-blue-600 hover:bg-blue-500 px-8 py-2 rounded-full font-bold transition-all mt-2"
          >
            Опубликовать
          </button>
        </div>

        {/* Лента */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50">
              <p className="text-blue-500 font-bold mb-2">@{post.author}</p>
              <p className="text-xl text-zinc-200">{post.content}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}