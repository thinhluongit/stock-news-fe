'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNews } from '../../store/slices/newsSlice';
import NewsCard from './NewsCard';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { NewsParams } from '../../types';
import { useLocale } from '../../i18n/LocaleContext';

interface NewsListProps {
  params?: NewsParams;
}

export default function NewsList({ params = {} }: NewsListProps) {
  const dispatch = useAppDispatch();
  const { articles, pagination, loading, error } = useAppSelector((s) => s.news);
  const { t } = useLocale();

  useEffect(() => {
    dispatch(fetchNews({ limit: 12, ...params }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, JSON.stringify(params)]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-green-400" size={32} />
      </div>
    );
  }

  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;

  if (!articles.length) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">📭</p>
        <p className="text-gray-400">{t('news_list.no_articles')}</p>
      </div>
    );
  }

  const handlePage = (newPage: number) => {
    dispatch(fetchNews({ limit: 12, ...params, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {articles.map((article) => <NewsCard key={article.id} article={article} />)}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page === 1}
            className="flex items-center gap-1 px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
            <ChevronLeft size={16} /> {t('news_list.prev')}
          </button>

          {Array.from({ length: pagination.pages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - pagination.page) <= 2)
            .map((p) => (
              <button key={p} onClick={() => handlePage(p)}
                className={`w-10 h-10 text-sm rounded-lg border transition-colors ${
                  p === pagination.page
                    ? 'bg-green-500 border-green-500 text-white font-semibold'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}>
                {p}
              </button>
            ))}

          <button onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page === pagination.pages}
            className="flex items-center gap-1 px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
            {t('news_list.next')} <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
