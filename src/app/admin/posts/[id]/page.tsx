'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchCategories } from '../../../../store/slices/newsSlice';
import { useLocale } from '../../../../i18n/LocaleContext';
import { newsApi } from '../../../../services/api';
import { ChevronLeft, Loader2, Trash2 } from 'lucide-react';
import type { Article } from '../../../../types';

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPostEditPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t } = useLocale();
  const { categories } = useAppSelector((s) => s.news);

  const [article, setArticle]       = useState<Article | null>(null);
  const [fetching, setFetching]     = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');

  const [title, setTitle]           = useState('');
  const [summary, setSummary]       = useState('');
  const [content, setContent]       = useState('');
  const [thumbnail, setThumbnail]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus]         = useState<'draft' | 'published' | 'archived'>('draft');
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    // Fetch article by slug/id
    newsApi.getBySlug(id!)
      .then((res) => {
        const data = (res.data as { data: Article }).data;
        setArticle(data);
        setTitle(data.title ?? '');
        setSummary(data.summary ?? '');
        setContent(data.content ?? '');
        setThumbnail(data.thumbnail_url ?? '');
        setCategoryId(data.category?.id ?? '');
        setStatus(data.status as 'draft' | 'published' | 'archived');
        setIsFeatured(!!data.is_featured);
      })
      .catch(() => setError(t('admin.error_load')))
      .finally(() => setFetching(false));
  }, [id, dispatch, t]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await newsApi.update(id!, {
        title,
        summary,
        content,
        thumbnail_url: thumbnail,
        category_id: categoryId || undefined,
        status,
        is_featured: isFeatured,
      });
      setSaved(true);
    } catch {
      setError(t('admin.error_load'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await newsApi.remove(id!);
      router.push('/admin/posts');
    } catch {
      setError(t('admin.error_load'));
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-green-400" size={28} />
      </div>
    );
  }

  if (!article && !fetching) {
    return <p className="text-gray-400 text-sm">Post not found.</p>;
  }

  return (
    <div className="max-w-2xl space-y-5">
      {showConfirm && (
        <ConfirmDialog
          message={t('admin.actions.confirm_delete')}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/posts')}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white line-clamp-1">{article?.title}</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}
      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">{t('admin.save_success')}</div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">{t('admin.post.title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">{t('admin.post.summary')}</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">{t('admin.post.content')}</label>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y font-mono text-xs leading-relaxed"
          />
        </div>

        {/* Thumbnail URL */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">{t('admin.post.thumbnail')}</label>
          <input
            type="text"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Category + Status row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('admin.post.category')}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('admin.post.status')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="draft">{t('admin.post.status_draft')}</option>
              <option value="published">{t('admin.post.status_published')}</option>
              <option value="archived">{t('admin.post.status_archived')}</option>
            </select>
          </div>
        </div>

        {/* Featured toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{t('admin.post.is_featured')}</p>
          </div>
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

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
          {t('admin.actions.delete')}
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/posts')}
            className="px-4 py-2.5 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('admin.actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {t('admin.actions.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
