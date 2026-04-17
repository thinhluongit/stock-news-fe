'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchPosts } from '../../../store/slices/postsSlice';
import { postsApi } from '../../../services/api';
import { DOC_STATUS_LABEL, DOC_STATUS_COLORS } from '../../../types';
import { Pencil, Plus, Loader2, Archive } from 'lucide-react';

export default function DashboardPostsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { posts, loading, error } = useAppSelector((s) => s.posts);

  const load = useCallback(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  const handleArchiveAndEdit = async (id: string) => {
    try {
      await postsApi.updateStatus(id, 2);
      router.push(`/dashboard/posts/${id}/edit`);
    } catch { /* handled */ }
  };

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Posts</h1>
        <button
          onClick={() => router.push('/dashboard/posts/new')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Post
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

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
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {posts.map((post) => {
                  const ds = post.doc_status as 0 | 1 | 2;
                  return (
                    <tr key={post.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-white font-medium line-clamp-1 max-w-sm">{post.title}</p>
                        <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded-full font-medium sm:hidden ${DOC_STATUS_COLORS[ds]}`}>
                          {DOC_STATUS_LABEL[ds]}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${DOC_STATUS_COLORS[ds]}`}>
                          {DOC_STATUS_LABEL[ds]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs hidden lg:table-cell">
                        {formatDate(post.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {ds === 1 ? (
                            <button
                              onClick={() => handleArchiveAndEdit(post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-yellow-400 hover:text-white bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg transition-colors"
                            >
                              <Archive size={12} />
                              Archive &amp; Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/dashboard/posts/${post.id}/edit`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-10 text-sm">
                      No posts yet.{' '}
                      <button
                        onClick={() => router.push('/dashboard/posts/new')}
                        className="text-green-400 hover:underline"
                      >
                        Create your first post
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
