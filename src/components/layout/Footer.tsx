'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';

export default function Footer() {
  const { t } = useLocale();

  const NAV_LINKS: [string, string][] = [
    ['/', t('nav.home')],
    ['/news', t('nav.news')],
    ['/stocks', t('nav.stocks')],
    ['/news?category=analysis', t('nav.analysis')],
  ];

  const TOPICS: [string, string][] = [
    ['market-news', t('footer.topics_list.market_news')],
    ['analysis',    t('footer.topics_list.analysis')],
    ['forex',       t('footer.topics_list.forex')],
    ['crypto',      t('footer.topics_list.crypto')],
    ['ipo',         t('footer.topics_list.ipo')],
  ];

  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white">
                ThanhDang<span className="text-green-400">Bullish</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t('footer.navigation')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {NAV_LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-green-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t('footer.topics')}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {TOPICS.map(([slug, label]) => (
                <li key={slug}>
                  <Link href={`/news?category=${slug}`} className="hover:text-green-400 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} ThanhDangBullish. {t('footer.all_rights')}</p>
          <p className="text-xs text-gray-600">{t('footer.disclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
