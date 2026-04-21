import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Sidebar from '../components/layout/Sidebar';
import FeaturedNews from '../components/news/FeaturedNews';
import NewsList from '../components/news/NewsList';
import LatestNewsHeading from '../components/home/LatestNewsHeading';
import type { Article } from '../types';

const TICKERS = [
  'AAPL +1.2%', 'MSFT +0.8%', 'NVDA +3.1%', 'TSLA -1.5%',
  'GOOGL +0.5%', 'META +2.3%', 'AMZN +0.9%', 'BRK.B +0.4%',
];

async function getFeaturedNews(): Promise<Article[]> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
    const res = await fetch(`${base}/news?featured=true&limit=5`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as Article[]) ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredNews = await getFeaturedNews();

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
        <FeaturedNews initialData={featuredNews} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <LatestNewsHeading />
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
