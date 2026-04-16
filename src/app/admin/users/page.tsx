'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchAdminUsers, deleteAdminUser, toggleAdminUserStatus } from '../../../store/slices/adminSlice';
import { useLocale } from '../../../i18n/LocaleContext';
import { Lock, Pencil, Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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

export default function AdminUsersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t } = useLocale();
  const { users, pagination, loading } = useAppSelector((s) => s.admin);

  const [search, setSearch]       = useState('');
  const [role, setRole]           = useState('');
  const [page, setPage]           = useState(1);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    dispatch(fetchAdminUsers({ page, limit: 20, search: searchDebounce || undefined, role: role || undefined }));
  }, [dispatch, page, searchDebounce, role]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchDebounce, role]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await dispatch(deleteAdminUser(deleteId));
    setDeleteId(null);
    load();
  };

  const handleToggle = async (id: string) => {
    await dispatch(toggleAdminUserStatus(id));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
        <h1 className="text-xl font-bold text-white">{t('admin.users')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('admin.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
        >
          <option value="">{t('admin.all_roles')}</option>
          <option value="user">{t('admin.user.role_user')}</option>
          <option value="editor">{t('admin.user.role_editor')}</option>
          <option value="admin">{t('admin.user.role_admin')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-green-400" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('admin.user.name')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">{t('admin.user.email')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('admin.user.role')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('admin.user.status')}</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">{t('admin.user.joined')}</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{u.full_name}</span>
                      <span className="block text-xs text-gray-500 md:hidden">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin'  ? 'bg-purple-500/20 text-purple-400' :
                        u.role === 'editor' ? 'bg-blue-500/20 text-blue-400' :
                                              'bg-gray-700 text-gray-400'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {u.is_active ? t('admin.user.active') : t('admin.user.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <div className="flex justify-end">
                          <span title={t('admin.user.admin_readonly')}><Lock size={14} className="text-gray-600" /></span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/users/${u.id}`)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title={t('admin.actions.edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleToggle(u.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.is_active
                                ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                            }`}
                            title={u.is_active ? t('admin.user.disable') : t('admin.user.enable')}
                          >
                            {u.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t('admin.actions.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-8 text-sm">{t('admin.no_users')}</td>
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
            {pagination.total} users · page {page} of {pagination.pages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> {t('news_list.prev')}
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('news_list.next')} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
