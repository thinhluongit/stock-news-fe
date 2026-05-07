'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStocks } from '../../store/slices/stockSlice';
import { TrendingUp, TrendingDown, Search, Loader2, AlertCircle } from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useLocale } from '../../i18n/LocaleContext';
import { useMarketData } from '../../hooks/useMarketData';
import PriceCell from '../../components/stocks/PriceCell';

export default function StocksPage() {
  const dispatch = useAppDispatch();
  const { stocks, loading, marketDataError, lastFetched } = useAppSelector((s) => s.stocks);
  const { t } = useLocale();
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchStocks());
  }, [dispatch]);

  const tickers = useMemo(() => stocks.map((s) => s.symbol), [stocks]);
  const marketData = useMarketData(tickers);

  const filtered = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const lastUpdatedTime = lastFetched ? new Date(lastFetched).toLocaleTimeString() : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('stocks.title')}</h1>
              {lastFetched && !marketDataError && (
                <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  {t('stocks.live_badge')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('stocks.subtitle')}
              {lastUpdatedTime && !marketDataError && (
                <span className="ml-2 text-gray-500">· {t('stocks.last_updated')} {lastUpdatedTime}</span>
              )}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('stocks.search_placeholder')}
              className="w-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {marketDataError && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3 mb-6">
            <AlertCircle size={16} className="shrink-0" />
            {t('stocks.market_unavailable')}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-green-400" size={32} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {filtered.slice(0, 4).map((s) => {
                const live = marketData[s.symbol];
                const isUp = live ? live.changePct >= 0 : Number(s.price_change_pct) >= 0;
                return (
                  <div key={s.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{s.symbol}</span>
                      {isUp
                        ? <TrendingUp size={16} className="text-green-400" />
                        : <TrendingDown size={16} className="text-red-400" />}
                    </div>
                    {live ? (
                      <PriceCell price={live.price} change={live.change} changePct={live.changePct} />
                    ) : (
                      <>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(s.current_price)}</p>
                        <p className={`text-xs mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? '+' : ''}{Number(s.price_change_pct).toFixed(2)}%
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('stocks.table.symbol')}</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('stocks.table.company')}</th>
                      <th className="hidden sm:table-cell px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('stocks.table.exchange')}</th>
                      <th className="hidden md:table-cell px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('stocks.table.sector')}</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-right">{t('stocks.table.price')}</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-right">{t('stocks.table.change')}</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('stocks.table.news')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((stock) => {
                      const live = marketData[stock.symbol];
                      const staticChangePct = Number(stock.price_change_pct);
                      const changePct = live ? live.changePct : staticChangePct;
                      const isUp = changePct >= 0;
                      return (
                        <tr key={stock.id} className="border-b border-gray-200/80 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-4"><span className="font-mono font-bold text-green-400">{stock.symbol}</span></td>
                          <td className="px-5 py-4 text-gray-700 dark:text-gray-300">{stock.company_name}</td>
                          <td className="hidden sm:table-cell px-5 py-4 text-gray-600 dark:text-gray-400">{stock.exchange}</td>
                          <td className="hidden md:table-cell px-5 py-4 text-gray-600 dark:text-gray-400">{stock.sector}</td>
                          <td className="px-5 py-4 text-right">
                            {live ? (
                              <PriceCell
                                price={live.price}
                                change={live.change}
                                changePct={live.changePct}
                                size="sm"
                                className="text-right"
                              />
                            ) : (
                              <span className="font-medium text-gray-900 dark:text-white">{formatPrice(stock.current_price)}</span>
                            )}
                          </td>
                          <td className={`px-5 py-4 text-right font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {live ? (
                              <span className="text-gray-500 text-xs">—</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {isUp ? '+' : ''}{staticChangePct.toFixed(2)}%
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <Link href={`/news?search=${stock.symbol}`} className="text-xs text-green-400 hover:underline">{t('stocks.table.view_news')}</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-12 text-gray-600 dark:text-gray-400">{t('stocks.table.no_stocks')}</div>}
              </div>
              <p className="sm:hidden text-xs text-gray-500 text-center py-2 border-t border-gray-200/80 dark:border-gray-800/50">
                {t('stocks.scroll_hint')}
              </p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
