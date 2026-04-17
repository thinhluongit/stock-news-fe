'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFeaturedNews } from '../../store/slices/newsSlice';
import { Clock, Eye, ArrowRight } from 'lucide-react';
import { formatDateRelative } from '../../lib/utils';
import { useLocale } from '../../i18n/LocaleContext';

export default function FeaturedNews() {
  const dispatch = useAppDispatch();
  const { featuredNews } = useAppSelector((s) => s.news);
  const { t } = useLocale();

  useEffect(() => {
    dispatch(fetchFeaturedNews());
  }, [dispatch]);

  if (!featuredNews.length) return null;

  const [main, ...rest] = featuredNews;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('featured.title')}</h2>
        <Link href="/news?featured=true" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">
          {t('featured.view_all')} <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Main */}
        <Link href={`/news/${main.slug}`} className="lg:col-span-3 group">
          <article className="relative rounded-xl overflow-hidden h-80 bg-gray-200 dark:bg-gray-800">
            {main.thumbnail_url ? (
              <Image src={main.thumbnail_url} alt={main.title} fill
                className="object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-900/20 to-gray-100 dark:from-green-900/40 dark:to-gray-900 flex items-center justify-center text-6xl">📈</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {main.category && (
                <span className="inline-block text-xs font-medium px-2 py-1 rounded-full text-white mb-3"
                  style={{ backgroundColor: main.category.color }}>
                  {main.category.name}
                </span>
              )}
              <h3 className="text-lg font-bold text-white group-hover:text-green-300 transition-colors line-clamp-2 mb-2">
                {main.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{main.author?.full_name}</span>
                <span className="flex items-center gap-1"><Clock size={11} />{formatDateRelative(main.published_at)}</span>
                <span className="flex items-center gap-1"><Eye size={11} />{main.views ?? 0}</span>
              </div>
            </div>
          </article>
        </Link>

        {/* Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:col-span-2 gap-3">
          {rest.map((article) => (
            <Link key={article.id} href={`/news/${article.slug}`}
              className="group flex gap-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 overflow-hidden transition-colors">
              <div className="relative w-24 h-24 flex-shrink-0 bg-gray-200 dark:bg-gray-800">
                {article.thumbnail_url ? (
                  <Image src={article.thumbnail_url} alt={article.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📊</div>
                )}
              </div>
              <div className="p-3 flex-1 min-w-0">
                {article.category && (
                  <span className="text-xs font-medium" style={{ color: article.category.color }}>{article.category.name}</span>
                )}
                <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-green-400 transition-colors line-clamp-2 mt-0.5">
                  {article.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={10} />{formatDateRelative(article.published_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
