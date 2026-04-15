'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchCategories } from '../../../store/slices/newsSlice';
import { useLocale } from '../../../i18n/LocaleContext';
import { categoryApi } from '../../../services/api';
import { Pencil, Trash2, Check, X, Plus, Loader2 } from 'lucide-react';
import type { Category } from '../../../types';

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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const dispatch = useAppDispatch();
  const { t } = useLocale();
  const { categories } = useAppSelector((s) => s.news);

  const [loading, setLoading]         = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  // Add form
  const [addName, setAddName]         = useState('');
  const [addDesc, setAddDesc]         = useState('');
  const [addColor, setAddColor]       = useState('#10b981');
  const [adding, setAdding]           = useState(false);
  const [addError, setAddError]       = useState('');

  // Inline edit
  const [editId, setEditId]           = useState<string | null>(null);
  const [editName, setEditName]       = useState('');
  const [editDesc, setEditDesc]       = useState('');
  const [editColor, setEditColor]     = useState('#10b981');
  const [editSaving, setEditSaving]   = useState(false);

  const reload = () => dispatch(fetchCategories());

  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      await categoryApi.create({ name: addName.trim(), description: addDesc.trim() || undefined, color: addColor });
      setAddName('');
      setAddDesc('');
      setAddColor('#10b981');
      reload();
    } catch {
      setAddError(t('admin.error_load'));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description ?? '');
    setEditColor(cat.color ?? '#10b981');
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id: string) => {
    setEditSaving(true);
    try {
      await categoryApi.update(id, { name: editName.trim(), description: editDesc.trim() || undefined, color: editColor });
      setEditId(null);
      reload();
    } catch { /* handled */ }
    finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await categoryApi.remove(deleteId);
      setDeleteId(null);
      reload();
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {deleteId && (
        <ConfirmDialog
          message={t('admin.actions.confirm_delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <h1 className="text-xl font-bold text-white">{t('admin.categories')}</h1>

      {/* Add form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">{t('admin.category.add_new')}</h2>
        {addError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">{addError}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('admin.category.name')}</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Category name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
            {addName && (
              <p className="text-xs text-gray-500 mt-1">Slug: <span className="text-gray-400">{slugify(addName)}</span></p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('admin.category.description')}</label>
            <input
              type="text"
              value={addDesc}
              onChange={(e) => setAddDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">{t('admin.category.color')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={addColor}
                onChange={(e) => setAddColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5"
              />
              <span className="text-xs text-gray-400 font-mono">{addColor}</span>
            </div>
          </div>
          <div className="flex-1 flex justify-end items-end">
            <button
              onClick={handleAdd}
              disabled={!addName.trim() || adding}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {t('admin.actions.add')}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('admin.category.name')}</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">{t('admin.category.slug')}</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">{t('admin.category.color')}</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">{t('admin.category.article_count')}</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-800/40 transition-colors">
                  {editId === cat.id ? (
                    <>
                      <td className="px-4 py-2.5" colSpan={3}>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                          />
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Description"
                            className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                          />
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-9 h-9 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-gray-500">{cat.news_count ?? 0}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => saveEdit(cat.id)}
                            disabled={editSaving}
                            className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                          >
                            {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{cat.name}</span>
                        {cat.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{cat.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{cat.slug}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-gray-400 font-mono text-xs hidden lg:inline">{cat.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{cat.news_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title={t('admin.actions.edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(cat.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t('admin.actions.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-8 text-sm">{t('admin.no_categories')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
