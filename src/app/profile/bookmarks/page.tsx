'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Loader2, ArrowLeft } from 'lucide-react';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import NewsCard from '../../../components/news/NewsCard';
import { useAppSelector } from '../../../store/hooks';
import { engagementApi } from '../../../services/api';
import type { Article, Pagination } from '../../../types';

export default function BookmarksPage() {
  const router   = useRouter();
  const { user, initialized } = useAppSelector(s => s.auth);

  const [articles,   setArticles]   = useState<Article[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);

  useEffect(() => {
    if (initialized && !user) router.replace('/auth/login');
  }, [initialized, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    engagementApi.getBookmarks({ page, limit: 12 })
      .then(res => {
        const d = res.data as { data: Article[]; pagination: Pagination };
        setArticles(d.data);
        setPagination(d.pagination);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [user, page]);

  if (!initialized || !user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-400 transition-colors mb-4">
            <ArrowLeft size={15} /> Back to home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Bookmark size={18} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Saved Articles</h1>
              {pagination && (
                <p className="text-sm text-gray-400">{pagination.total} article{pagination.total !== 1 ? 's' : ''} saved</p>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-green-400" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark size={40} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 mb-4">No saved articles yet.</p>
            <Link href="/news" className="text-green-400 hover:text-green-300 text-sm font-medium">
              Browse news →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(a => <NewsCard key={a.id} article={a} />)}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:border-green-500 transition-colors"
                >
                  Prev
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  {page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:border-green-500 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
