'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';
import Sidebar from '../../../components/layout/Sidebar';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchNewsArticle, clearCurrentArticle } from '../../../store/slices/newsSlice';
import { formatDate } from '../../../lib/utils';
import { Clock, Eye, User, ArrowLeft, Loader2 } from 'lucide-react';

export default function ArticlePage() {
  const { id: slug } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentArticle: article, loading, error } = useAppSelector((s) => s.news);

  useEffect(() => {
    if (slug) dispatch(fetchNewsArticle(slug));
    return () => { dispatch(clearCurrentArticle()); };
  }, [slug, dispatch]);

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Link href="/news" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-green-400 mb-6 transition-colors">
              <ArrowLeft size={16} /> Back to News
            </Link>

            {loading && (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-green-400" size={32} />
              </div>
            )}

            {error && <div className="text-center py-20 text-red-400">{error}</div>}

            {article && !loading && (
              <article>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {article.category && (
                    <Link href={`/news?category=${article.category.slug}`}>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                        style={{ backgroundColor: article.category.color }}>
                        {article.category.name}
                      </span>
                    </Link>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />{formatDate(article.published_at)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye size={12} />{article.views ?? 0} views
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                  {article.title}
                </h1>

                {article.summary && (
                  <p className="text-lg text-gray-300 mb-6 leading-relaxed border-l-4 border-green-500 pl-4">
                    {article.summary}
                  </p>
                )}

                {article.author && (
                  <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-800">
                    <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <User size={16} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{article.author.full_name}</p>
                      <p className="text-xs text-gray-500">Author</p>
                    </div>
                  </div>
                )}

                {article.thumbnail_url && (
                  <div className="relative w-full h-72 sm:h-96 rounded-xl overflow-hidden mb-8 bg-gray-800">
                    <Image src={article.thumbnail_url} alt={article.title} fill className="object-cover" />
                  </div>
                )}

                {(article.stocks?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-xs text-gray-500">Related stocks:</span>
                    {article.stocks!.map((s) => (
                      <Link key={s.id} href={`/stocks?symbol=${s.symbol}`}
                        className="text-xs bg-gray-800 border border-gray-700 text-green-400 hover:border-green-500 px-2 py-1 rounded font-mono transition-colors">
                        {s.symbol}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="article-content"
                  dangerouslySetInnerHTML={{ __html: article.content ?? '' }} />
              </article>
            )}
          </div>
          <div className="lg:col-span-1">
            <Sidebar />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
