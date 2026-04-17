'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchCategories } from '../../../../store/slices/newsSlice';
import { useLocale } from '../../../../i18n/LocaleContext';
import { postsApi } from '../../../../services/api';
import { DOC_STATUS_LABEL } from '../../../../types';
import { ChevronLeft, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { Article } from '../../../../types';

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-gray-900 dark:text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
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
  const [docStatus, setDocStatus]   = useState<0 | 1 | 2>(0);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    dispatch(fetchCategories());
    postsApi.getById(id!)
      .then((res) => {
        const data = (res.data as { data: Article }).data;
        setArticle(data);
        setTitle(data.title ?? '');
        setSummary(data.summary ?? '');
        setContent(data.content ?? '');
        setThumbnail(data.thumbnail_url ?? '');
        setCategoryId(data.category?.id ?? '');
        setDocStatus((data.doc_status ?? 0) as 0 | 1 | 2);
        setIsFeatured(!!data.is_featured);
      })
      .catch(() => setError(t('admin.error_load')))
      .finally(() => setFetching(false));
  }, [id, dispatch, t]);

  const isPublished = docStatus === 1;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await postsApi.update(id!, {
        title,
        summary,
        content,
        thumbnail_url: thumbnail,
        category_id: categoryId || undefined,
        is_featured: isFeatured,
      });
      setSaved(true);
    } catch {
      setError(t('admin.error_load'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: 0 | 1 | 2) => {
    setSaving(true);
    setError('');
    try {
      const res = await postsApi.updateStatus(id!, newStatus);
      const updated = (res.data as { data: Article }).data;
      setDocStatus((updated.doc_status ?? newStatus) as 0 | 1 | 2);
      setSaved(true);
    } catch {
      setError(t('admin.error_load'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await postsApi.remove(id!);
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
    return <p className="text-gray-600 dark:text-gray-400 text-sm">Post not found.</p>;
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
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 flex-1">{article?.title}</h1>
        <span className="text-xs text-gray-600 dark:text-gray-400">{DOC_STATUS_LABEL[docStatus]}</span>
      </div>

      {/* Published warning */}
      {isPublished && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-300">
            This post is published. Archive it before editing content.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}
      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">{t('admin.save_success')}</div>
      )}

      {/* Status action bar */}
      <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">Status</span>
        {docStatus === 0 && (
          <button
            onClick={() => handleStatusChange(1)}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
          >
            Publish
          </button>
        )}
        {docStatus === 1 && (
          <button
            onClick={() => handleStatusChange(2)}
            disabled={saving}
            className="px-3 py-1.5 text-sm text-yellow-400 hover:text-white bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            Archive
          </button>
        )}
        {docStatus === 2 && (
          <>
            <button
              onClick={() => handleStatusChange(0)}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Revert to Draft
            </button>
            <button
              onClick={() => handleStatusChange(1)}
              disabled={saving}
              className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
            >
              Republish
            </button>
          </>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.title')}</label>
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
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.summary')}</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            disabled={isPublished}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.content')}</label>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPublished}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y font-mono text-xs leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Thumbnail URL */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.thumbnail')}</label>
          <input
            type="text"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            disabled={isPublished}
            placeholder="https://..."
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.category')}</label>
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

        {/* Featured toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-900 dark:text-white">{t('admin.post.is_featured')}</p>
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
            className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('admin.actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isPublished}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {t('admin.actions.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
