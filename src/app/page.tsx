'use client';

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Sidebar from '../components/layout/Sidebar';
import FeaturedNews from '../components/news/FeaturedNews';
import NewsList from '../components/news/NewsList';
import { TrendingUp } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';

const TICKERS = [
  'AAPL +1.2%', 'MSFT +0.8%', 'NVDA +3.1%', 'TSLA -1.5%',
  'GOOGL +0.5%', 'META +2.3%', 'AMZN +0.9%', 'BRK.B +0.4%',
];

export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      {/* Ticker bar */}
      <div className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-2 overflow-hidden">
        <div className="flex items-center gap-6 animate-marquee whitespace-nowrap px-4 text-xs text-gray-600 dark:text-gray-400">
          {TICKERS.map((tick) => (
            <span key={tick} className={`font-mono ${tick.includes('-') ? 'text-red-400' : 'text-green-400'}`}>{tick}</span>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <FeaturedNews />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={20} className="text-green-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('home.latest_news')}</h2>
            </div>
            <NewsList />
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
