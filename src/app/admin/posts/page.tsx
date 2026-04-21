'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchNews } from '../../../store/slices/newsSlice';
import { useLocale } from '../../../i18n/LocaleContext';
import { newsApi, postsApi } from '../../../services/api';
import { DOC_STATUS_LABEL, DOC_STATUS_COLORS } from '../../../types';
import { Pencil, Trash2, Star, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';

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

export default function AdminPostsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t } = useLocale();
  const { articles, pagination, loading } = useAppSelector((s) => s.news);

  const [search, setSearch]         = useState('');
  const [docStatus, setDocStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    dispatch(fetchNews({
      page,
      limit: 20,
      search: searchDebounce || undefined,
      doc_status: docStatus !== '' ? parseInt(docStatus) : undefined,
    }));
  }, [dispatch, page, searchDebounce, docStatus]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [searchDebounce, docStatus]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await newsApi.remove(deleteId);
      setDeleteId(null);
      load();
    } catch { /* handled */ }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await newsApi.update(id, { is_featured: !current });
      load();
    } catch { /* handled */ }
  };

  const handleStatusChange = async (id: string, newDocStatus: number) => {
    try {
      await postsApi.updateStatus(id, newDocStatus as 0 | 1 | 2);
      load();
    } catch { /* handled */ }
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-5">
      {deleteId && (
        <ConfirmDialog
          message={t('admin.actions.confirm_delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.posts')}</h1>
        <button
          onClick={() => router.push('/admin/posts/create')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
        >
          <Plus size={14} />
          {t('admin.post.new_post')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('admin.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
        />
        <select
          value={docStatus}
          onChange={(e) => setDocStatus(e.target.value)}
          className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-500"
        >
          <option value="">{t('admin.all_statuses')}</option>
          <option value="0">{t('admin.post.status_draft')}</option>
          <option value="1">{t('admin.post.status_published')}</option>
          <option value="2">{t('admin.post.status_archived')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-green-400" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('admin.post.title')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden md:table-cell">{t('admin.post.author')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">{t('admin.post.status')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden lg:table-cell">{t('admin.post.featured')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden xl:table-cell">{t('admin.post.views')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden xl:table-cell">{t('admin.post.date')}</th>
                  <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {articles.map((a) => {
                  const ds = (a.doc_status ?? 0) as 0 | 1 | 2;
                  return (
                    <tr key={a.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-white font-medium line-clamp-1 max-w-xs">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 sm:hidden">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DOC_STATUS_COLORS[ds]}`}>
                            {DOC_STATUS_LABEL[ds]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{a.author?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <select
                          value={ds}
                          onChange={(e) => handleStatusChange(a.id, parseInt(e.target.value))}
                          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-green-500"
                        >
                          <option value={0}>{t('admin.post.status_draft')}</option>
                          <option value={1}>{t('admin.post.status_published')}</option>
                          <option value={2}>{t('admin.post.status_archived')}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <button
                          onClick={() => handleToggleFeatured(a.id, !!a.is_featured)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            a.is_featured
                              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                              : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                          title={a.is_featured ? t('admin.post.yes') : t('admin.post.no')}
                        >
                          <Star size={14} fill={a.is_featured ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden xl:table-cell">{(a.views ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs hidden xl:table-cell">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/posts/${a.id}`)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title={t('admin.actions.edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(a.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t('admin.actions.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {articles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-8 text-sm">{t('admin.no_posts')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {pagination.total} posts · page {page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> {t('news_list.prev')}
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('news_list.next')} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
