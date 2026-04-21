'use client';

import { TrendingUp } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';

export default function LatestNewsHeading() {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-2 mb-6">
      <TrendingUp size={20} className="text-green-400" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('home.latest_news')}</h2>
    </div>
  );
}
