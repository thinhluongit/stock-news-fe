'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchCategories } from '../../../../store/slices/newsSlice';
import { useLocale } from '../../../../i18n/LocaleContext';
import { postsApi } from '../../../../services/api';
import { DOC_STATUS_LABEL } from '../../../../types';
import { ChevronLeft, Loader2, Trash2, AlertTriangle, Upload, X, Plus, Video, ImageIcon } from 'lucide-react';
import type { Article, MediaItem } from '../../../../types';
import type { OutputData } from '@editorjs/editorjs';
import type { EditorBlockRef } from '../../../../components/editor/EditorBlock';

const EditorBlock = dynamic(() => import('../../../../components/editor/EditorBlock'), { ssr: false });

const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

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

  const [article, setArticle]         = useState<Article | null>(null);
  const [fetching, setFetching]       = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  const editorRef = useRef<EditorBlockRef>(null);
  const [editorData, setEditorData]   = useState<OutputData | undefined>(undefined);
  const [editorReady, setEditorReady] = useState(false);

  const [title, setTitle]           = useState('');
  const [summary, setSummary]       = useState('');
  const [thumbnail, setThumbnail]   = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [docStatus, setDocStatus]   = useState<0 | 1 | 2>(0);
  const [isFeatured, setIsFeatured] = useState(false);

  const [keptMedia, setKeptMedia]       = useState<MediaItem[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [mediaWasTouched, setMediaWasTouched] = useState(false);

  useEffect(() => {
    if (!thumbnailFile) return;
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    if (!thumbnailFile) setThumbnailPreviewUrl(thumbnail);
  }, [thumbnail, thumbnailFile]);

  useEffect(() => {
    dispatch(fetchCategories());
    postsApi.getById(id!)
      .then((res) => {
        const data = (res.data as { data: Article }).data;
        setArticle(data);
        setTitle(data.title ?? '');
        setSummary(data.summary ?? '');
        try {
          const parsed: OutputData | undefined = data.content ? JSON.parse(data.content) : undefined;
          setEditorData(parsed);
        } catch {
          setEditorData(undefined);
        }
        setEditorReady(true);
        setThumbnail(data.thumbnail_url ?? '');
        setCategoryId(data.category?.id ?? '');
        setDocStatus((data.doc_status ?? 0) as 0 | 1 | 2);
        setIsFeatured(!!data.is_featured);
        setKeptMedia(data.media ?? []);
      })
      .catch(() => setError(t('admin.error_load')))
      .finally(() => setFetching(false));
  }, [id, dispatch, t]);

  const isPublished = docStatus === 1;

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnail('');
    setThumbnailPreviewUrl('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const outputData: OutputData | null = editorRef.current ? await editorRef.current.save() : null;
      const form = new FormData();
      form.append('title', title);
      if (summary) form.append('summary', summary);
      form.append('content', outputData ? JSON.stringify(outputData) : '');
      if (categoryId) form.append('category_id', categoryId);
      form.append('is_featured', String(isFeatured));

      if (thumbnailFile) {
        form.append('thumbnail', thumbnailFile);
      } else if (thumbnail) {
        form.append('thumbnail_url', thumbnail);
      }

      if (mediaWasTouched) {
        form.append('existing_media_ids', JSON.stringify(keptMedia.map(m => m.id)));
        for (const file of newMediaFiles) form.append('media', file);
      }

      const res = await postsApi.update(id!, form);
      const updated = (res.data as { data: Article }).data;
      setArticle(updated);
      setThumbnail(updated.thumbnail_url ?? '');
      setThumbnailFile(null);
      setKeptMedia(updated.media ?? []);
      setNewMediaFiles([]);
      setMediaWasTouched(false);
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
          <button onClick={() => handleStatusChange(1)} disabled={saving} className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50">
            Publish
          </button>
        )}
        {docStatus === 1 && (
          <button onClick={() => handleStatusChange(2)} disabled={saving} className="px-3 py-1.5 text-sm text-yellow-400 hover:text-white bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg transition-colors disabled:opacity-50">
            Archive
          </button>
        )}
        {docStatus === 2 && (
          <>
            <button onClick={() => handleStatusChange(0)} disabled={saving} className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
              Revert to Draft
            </button>
            <button onClick={() => handleStatusChange(1)} disabled={saving} className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50">
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
        {editorReady && (
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.content')}</label>
            <EditorBlock ref={editorRef} data={editorData} readOnly={isPublished} />
          </div>
        )}

        {/* Thumbnail */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.thumbnail')}</label>
          {thumbnailPreviewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-gray-800 mb-2 max-h-48">
              <img src={thumbnailPreviewUrl} alt="" className="w-full h-full object-cover" />
              {!isPublished && (
                <button
                  type="button"
                  onClick={clearThumbnail}
                  className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          {!isPublished && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shrink-0">
                <Upload size={14} />
                {t('admin.post.thumbnail_upload')}
                <input
                  type="file"
                  accept={MEDIA_ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file) { setThumbnailFile(file); setThumbnail(''); }
                    e.target.value = '';
                  }}
                />
              </label>
              <span className="text-gray-500 dark:text-gray-500 text-xs shrink-0">{t('admin.post.or_url')}</span>
              <input
                type="text"
                value={thumbnailFile ? '' : thumbnail}
                onChange={(e) => { setThumbnail(e.target.value); setThumbnailFile(null); }}
                disabled={!!thumbnailFile}
                placeholder="https://..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          )}
          {thumbnailFile && !isPublished && (
            <p className="mt-1 text-xs text-gray-500 truncate">{thumbnailFile.name}</p>
          )}
        </div>

        {/* Media Gallery */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.post.media_gallery')}</label>

          {(keptMedia.length > 0 || newMediaFiles.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {keptMedia.map((item) => (
                <div key={item.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center">
                  {item.media_type === 'image' ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Video size={20} className="text-gray-400" />
                  )}
                  {!isPublished && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeptMedia(prev => prev.filter(m => m.id !== item.id));
                        setMediaWasTouched(true);
                      }}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              {newMediaFiles.map((file, i) => (
                <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden bg-green-900/20 border border-green-700/40 flex flex-col items-center justify-center gap-1 px-1">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon size={18} className="text-green-400" />
                  ) : (
                    <Video size={18} className="text-green-400" />
                  )}
                  <p className="text-xs text-green-300 text-center leading-none truncate w-full px-1">{file.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMediaFiles(prev => prev.filter((_, j) => j !== i));
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!isPublished && (
            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer w-fit bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Plus size={14} />
              {t('admin.post.add_media')}
              <input
                type="file"
                accept={MEDIA_ACCEPT}
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) {
                    setNewMediaFiles(prev => [...prev, ...files]);
                    setMediaWasTouched(true);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          )}
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed ${isFeatured ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
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
