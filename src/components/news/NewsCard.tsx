import Link from 'next/link';
import Image from 'next/image';
import { Eye, Clock } from 'lucide-react';
import { formatDateRelative } from '../../lib/utils';
import type { Article } from '../../types';

interface NewsCardProps {
  article: Article;
  size?: 'sm' | 'md' | 'lg';
}

export default function NewsCard({ article, size = 'md' }: NewsCardProps) {
  const isLg = size === 'lg';

  return (
    <Link href={`/news/${article.slug}`} className="group block">
      <article className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-all hover:shadow-lg hover:shadow-black/30">
        <div className={`relative overflow-hidden ${isLg ? 'h-56' : 'h-40'} bg-gray-800`}>
          {article.thumbnail_url ? (
            <Image src={article.thumbnail_url} alt={article.title} fill
              className="object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <span className="text-4xl">📈</span>
            </div>
          )}
          {article.category && (
            <span className="absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: article.category.color }}>
              {article.category.name}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className={`font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2 mb-2 ${isLg ? 'text-lg' : 'text-sm'}`}>
            {article.title}
          </h3>

          {article.summary && (
            <p className="text-xs text-gray-400 line-clamp-2 mb-3">{article.summary}</p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {article.author && (
                <span className="text-gray-400 font-medium">{article.author.full_name}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />{formatDateRelative(article.published_at)}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Eye size={11} />{article.views ?? 0}
            </span>
          </div>

          {(article.stocks?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {article.stocks!.slice(0, 3).map((s) => (
                <span key={s.id} className="text-xs bg-gray-800 text-green-400 border border-gray-700 px-1.5 py-0.5 rounded font-mono">
                  {s.symbol}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
