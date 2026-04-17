'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchCategories } from '../../../../store/slices/newsSlice';
import { createPost } from '../../../../store/slices/postsSlice';
import { stockApi } from '../../../../services/api';
import type { Stock } from '../../../../types';
import type { EditorBlockRef } from '../../../../components/editor/EditorBlock';
import { ChevronLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EditorBlock = dynamic(() => import('../../../../components/editor/EditorBlock'), { ssr: false });

export default function NewPostPage() {
  const dispatch    = useAppDispatch();
  const router      = useRouter();
  const { categories } = useAppSelector((s) => s.news);
  const { saving, error } = useAppSelector((s) => s.posts);
  const editorRef   = useRef<EditorBlockRef>(null);

  const [title, setTitle]         = useState('');
  const [summary, setSummary]     = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [stockIds, setStockIds]   = useState<string[]>([]);
  const [stocks, setStocks]       = useState<Stock[]>([]);

  useEffect(() => {
    dispatch(fetchCategories());
    stockApi.getAll().then((res) => {
      const data = (res.data as { data: Stock[] }).data;
      setStocks(data ?? []);
    }).catch(() => {});
  }, [dispatch]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      const outputData = editorRef.current ? await editorRef.current.save() : null;
      const result = await dispatch(createPost({
        title,
        summary,
        thumbnail_url: thumbnail || undefined,
        category_id:  categoryId || undefined,
        is_featured:  isFeatured,
        stock_ids:    stockIds.length ? stockIds : undefined,
        content:      outputData ? JSON.stringify(outputData) : '',
        doc_status:   0,
      }));
      if (createPost.fulfilled.match(result)) {
        toast.success('Draft saved!');
        router.push(`/dashboard/posts/${result.payload.id}/edit`);
      } else {
        toast.error((result.payload as string) ?? 'Failed to create post');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const toggleStock = (id: string) => {
    setStockIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/posts')}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Post</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title…"
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Summary</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description of the article…"
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Thumbnail URL</label>
          <input
            type="text"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://…"
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Category + Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-500"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5">
            <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
            <button
              type="button"
              onClick={() => setIsFeatured((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isFeatured ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isFeatured ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Stock tags */}
        {stocks.length > 0 && (
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">Related Stocks</label>
            <div className="flex flex-wrap gap-2">
              {stocks.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStock(s.id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    stockIds.includes(s.id)
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {s.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content editor */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Content</label>
          <EditorBlock ref={editorRef} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push('/dashboard/posts')}
          className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save as Draft
        </button>
      </div>
    </div>
  );
}
