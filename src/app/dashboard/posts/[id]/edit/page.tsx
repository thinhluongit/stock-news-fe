'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks';
import { fetchCategories } from '../../../../../store/slices/newsSlice';
import { fetchPost, updatePost, changePostStatus, clearCurrentPost } from '../../../../../store/slices/postsSlice';
import { stockApi } from '../../../../../services/api';
import { DOC_STATUS_LABEL, DOC_STATUS_COLORS } from '../../../../../types';
import type { Stock } from '../../../../../types';
import type { OutputData } from '@editorjs/editorjs';
import type { EditorBlockRef } from '../../../../../components/editor/EditorBlock';
import { ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const EditorBlock = dynamic(() => import('../../../../../components/editor/EditorBlock'), { ssr: false });

export default function EditPostPage() {
  const { id }      = useParams<{ id: string }>();
  const dispatch    = useAppDispatch();
  const router      = useRouter();
  const { categories } = useAppSelector((s) => s.news);
  const { currentPost, loading, saving, error } = useAppSelector((s) => s.posts);
  const editorRef   = useRef<EditorBlockRef>(null);

  const [title, setTitle]           = useState('');
  const [summary, setSummary]       = useState('');
  const [thumbnail, setThumbnail]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [stockIds, setStockIds]     = useState<string[]>([]);
  const [stocks, setStocks]         = useState<Stock[]>([]);
  const [editorData, setEditorData] = useState<OutputData | undefined>(undefined);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchPost(id));
    stockApi.getAll().then((res) => {
      const data = (res.data as { data: Stock[] }).data;
      setStocks(data ?? []);
    }).catch(() => {});

    return () => { dispatch(clearCurrentPost()); };
  }, [dispatch, id]);

  useEffect(() => {
    if (!currentPost) return;
    setTitle(currentPost.title ?? '');
    setSummary(currentPost.summary ?? '');
    setThumbnail(currentPost.thumbnail_url ?? '');
    setCategoryId(currentPost.category?.id ?? '');
    setIsFeatured(!!currentPost.is_featured);
    setStockIds(currentPost.stocks?.map((s) => s.id) ?? []);

    try {
      const parsed: OutputData | null = currentPost.content
        ? JSON.parse(currentPost.content)
        : null;
      setEditorData(parsed ?? undefined);
    } catch {
      setEditorData(undefined);
    }
    setEditorReady(true);
  }, [currentPost]);

  const isPublished = currentPost?.doc_status === 1;

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    try {
      const outputData = editorRef.current ? await editorRef.current.save() : null;
      const result = await dispatch(updatePost({
        id,
        data: {
          title,
          summary,
          thumbnail_url: thumbnail || undefined,
          category_id:  categoryId || undefined,
          is_featured:  isFeatured,
          stock_ids:    stockIds.length ? stockIds : undefined,
          content:      outputData ? JSON.stringify(outputData) : '',
        },
      }));
      if (updatePost.fulfilled.match(result)) {
        toast.success('Saved!');
      } else {
        toast.error((result.payload as string) ?? 'Failed to save');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleStatusChange = async (newStatus: 0 | 1 | 2) => {
    const result = await dispatch(changePostStatus({ id, doc_status: newStatus }));
    if (changePostStatus.fulfilled.match(result)) {
      toast.success(`Status changed to ${DOC_STATUS_LABEL[newStatus]}`);
    } else {
      toast.error((result.payload as string) ?? 'Failed to change status');
    }
  };

  const toggleStock = (stockId: string) => {
    setStockIds((prev) =>
      prev.includes(stockId) ? prev.filter((s) => s !== stockId) : [...prev, stockId]
    );
  };

  if (loading && !currentPost) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-green-400" size={28} />
      </div>
    );
  }

  if (!loading && !currentPost) {
    return <p className="text-gray-600 dark:text-gray-400 text-sm">Post not found.</p>;
  }

  const ds = (currentPost?.doc_status ?? 0) as 0 | 1 | 2;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/posts')}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 flex-1">{currentPost?.title ?? 'Edit Post'}</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${DOC_STATUS_COLORS[ds]}`}>
          {DOC_STATUS_LABEL[ds]}
        </span>
      </div>

      {/* Published warning */}
      {isPublished && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            This post is published. Archive it first to make edits.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {/* Status action bar */}
      <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Status actions</span>
        {ds === 0 && (
          <button
            onClick={() => handleStatusChange(1)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Publish
          </button>
        )}
        {ds === 2 && (
          <>
            <button
              onClick={() => handleStatusChange(0)}
              disabled={saving}
              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Revert to Draft
            </button>
            <button
              onClick={() => handleStatusChange(1)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Republish
            </button>
          </>
        )}
        {ds === 1 && (
          <button
            onClick={() => handleStatusChange(2)}
            disabled={saving}
            className="px-3 py-2 text-sm text-yellow-400 hover:text-white bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Archive
          </button>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPublished}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Summary</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={isPublished}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Thumbnail URL</label>
          <input
            type="text"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            disabled={isPublished}
            placeholder="https://…"
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Category + Featured */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isPublished}
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={`flex items-center justify-between bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 ${isPublished ? 'opacity-50' : ''}`}>
            <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
            <button
              type="button"
              onClick={() => !isPublished && setIsFeatured((v) => !v)}
              disabled={isPublished}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
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
                  onClick={() => !isPublished && toggleStock(s.id)}
                  disabled={isPublished}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors disabled:cursor-not-allowed ${
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

        {/* Content editor — only rendered once editorData is resolved */}
        {editorReady && (
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">Content</label>
            <EditorBlock ref={editorRef} data={editorData} readOnly={isPublished} />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push('/dashboard/posts')}
          className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || isPublished}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
