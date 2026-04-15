'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStocks } from '../../store/slices/stockSlice';
import { fetchCategories } from '../../store/slices/newsSlice';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const { stocks }     = useAppSelector((s) => s.stocks);
  const { categories } = useAppSelector((s) => s.news);

  useEffect(() => {
    dispatch(fetchStocks());
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      {/* Market Overview */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Market Overview</h3>
        <div className="space-y-2">
          {stocks.slice(0, 6).map((stock) => {
            const isUp = Number(stock.price_change_pct) >= 0;
            return (
              <Link key={stock.id} href={`/stocks?symbol=${stock.symbol}`}
                className="flex items-center justify-between hover:bg-gray-800 rounded-lg p-2 transition-colors">
                <div>
                  <span className="text-sm font-semibold text-white">{stock.symbol}</span>
                  <p className="text-xs text-gray-500 truncate max-w-[100px]">{stock.company_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{formatPrice(stock.current_price)}</p>
                  <div className={`flex items-center gap-0.5 justify-end text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    <span>{isUp ? '+' : ''}{Number(stock.price_change_pct).toFixed(2)}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <Link href="/stocks" className="block text-center text-xs text-green-400 hover:text-green-300 mt-3 transition-colors">
          View all stocks →
        </Link>
      </div>

      {/* Categories */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Categories</h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/news?category=${cat.slug}`}
              className="flex items-center justify-between hover:bg-gray-800 rounded-lg px-2 py-2 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{cat.name}</span>
              </div>
              {(cat.news_count ?? 0) > 0 && (
                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{cat.news_count}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
