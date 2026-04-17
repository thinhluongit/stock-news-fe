'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { fetchAdminUser, updateAdminUser, deleteAdminUser } from '../../../../store/slices/adminSlice';
import { useLocale } from '../../../../i18n/LocaleContext';
import { ChevronLeft, Loader2, AlertTriangle, Trash2 } from 'lucide-react';

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

export default function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t } = useLocale();
  const { currentUser, loading, error } = useAppSelector((s) => s.admin);

  const [fullName, setFullName]   = useState('');
  const [role, setRole]           = useState<'user' | 'editor'>('user');
  const [isActive, setIsActive]   = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchAdminUser(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name);
      setRole(currentUser.role === 'admin' ? 'user' : (currentUser.role as 'user' | 'editor'));
      setIsActive(currentUser.is_active);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaved(false);
    const result = await dispatch(updateAdminUser({ id: currentUser.id, data: { full_name: fullName, role, is_active: isActive } }));
    if (updateAdminUser.fulfilled.match(result)) setSaved(true);
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    const result = await dispatch(deleteAdminUser(currentUser.id));
    if (deleteAdminUser.fulfilled.match(result)) router.push('/admin/users');
  };

  if (loading && !currentUser) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-green-400" size={28} />
      </div>
    );
  }

  if (!loading && !currentUser) {
    return <p className="text-gray-600 dark:text-gray-400 text-sm">User not found.</p>;
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="max-w-lg space-y-5">
      {showConfirm && (
        <ConfirmDialog
          message={t('admin.actions.confirm_delete')}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/admin/users')}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.user.name')}: {currentUser?.full_name}</h1>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-400 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {t('admin.user.admin_readonly')}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}
      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">{t('admin.save_success')}</div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        {/* Email (read-only) */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.user.email')}</label>
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2.5">{currentUser?.email}</p>
        </div>

        {/* Full name */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.user.name')}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isAdmin}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.user.role')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'editor')}
            disabled={isAdmin}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="user">{t('admin.user.role_user')}</option>
            <option value="editor">{t('admin.user.role_editor')}</option>
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900 dark:text-white">{t('admin.user.status')}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isActive ? t('admin.user.active') : t('admin.user.inactive')}
            </p>
          </div>
          <button
            type="button"
            disabled={isAdmin}
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {!isAdmin && (
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
              onClick={() => router.push('/admin/users')}
              className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('admin.actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {t('admin.actions.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
