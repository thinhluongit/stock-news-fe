'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStocks } from '../../store/slices/stockSlice';
import { TrendingUp, TrendingDown, Search, Loader2 } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export default function StocksPage() {
  const dispatch = useAppDispatch();
  const { stocks, loading } = useAppSelector((s) => s.stocks);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchStocks());
  }, [dispatch]);

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Stock Market</h1>
            <p className="text-sm text-gray-400 mt-1">Track your favourite stocks</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or company..."
              className="w-full bg-gray-800 text-sm text-gray-100 pl-9 pr-4 py-2.5 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-green-400" size={32} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {filtered.slice(0, 4).map((s) => {
                const isUp = Number(s.price_change_pct) >= 0;
                return (
                  <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white font-mono">{s.symbol}</span>
                      {isUp
                        ? <TrendingUp size={16} className="text-green-400" />
                        : <TrendingDown size={16} className="text-red-400" />}
                    </div>
                    <p className="text-lg font-bold text-white">{formatPrice(s.current_price)}</p>
                    <p className={`text-xs mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{Number(s.price_change_pct).toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Symbol</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Exchange</th>
                      <th className="hidden md:table-cell px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sector</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Price</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Change</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">News</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((stock) => {
                      const isUp = Number(stock.price_change_pct) >= 0;
                      return (
                        <tr key={stock.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-4"><span className="font-mono font-bold text-green-400">{stock.symbol}</span></td>
                          <td className="px-5 py-4 text-gray-300">{stock.company_name}</td>
                          <td className="hidden sm:table-cell px-5 py-4 text-gray-400">{stock.exchange}</td>
                          <td className="hidden md:table-cell px-5 py-4 text-gray-400">{stock.sector}</td>
                          <td className="px-5 py-4 text-right font-medium text-white">{formatPrice(stock.current_price)}</td>
                          <td className={`px-5 py-4 text-right font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                              {isUp ? '+' : ''}{Number(stock.price_change_pct).toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Link href={`/news?search=${stock.symbol}`} className="text-xs text-green-400 hover:underline">View news</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No stocks found.</div>}
              </div>
              <p className="sm:hidden text-xs text-gray-600 text-center py-2 border-t border-gray-800/50">
                Scroll horizontally to see more →
              </p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
