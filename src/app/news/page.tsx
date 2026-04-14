'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Sidebar from '../../components/layout/Sidebar';
import NewsList from '../../components/news/NewsList';
import type { NewsParams } from '../../types';

function NewsContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category') ?? undefined;
  const search   = searchParams.get('search') ?? undefined;
  const featured = searchParams.get('featured') ?? undefined;

  const params: NewsParams = {};
  if (category) params.category = category;
  if (search)   params.search   = search;
  if (featured) params.featured = featured;

  const title = search
    ? `Search: "${search}"`
    : category
      ? category.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
      : 'All News';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
          <NewsList params={params} />
        </div>
        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>
    </main>
  );
}

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <Suspense fallback={<div className="flex justify-center items-center py-20 text-green-400">Loading...</div>}>
        <NewsContent />
      </Suspense>
      <Footer />
    </div>
  );
}
