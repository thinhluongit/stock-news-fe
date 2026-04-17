'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { useLocale } from '../../i18n/LocaleContext';
import { TrendingUp, LayoutDashboard, Users, FileText, Tag, BarChart2, ExternalLink, Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const { user, initialized } = useAppSelector((s) => s.auth);
  const { t, locale, setLocale } = useLocale();

  useEffect(() => {
    if (!initialized) return;
    if (!user)                   { router.replace('/auth/login'); return; }
    if (user.role !== 'admin')   { router.replace('/'); }
  }, [initialized, user, router]);

  if (!initialized || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-green-400" size={32} />
      </div>
    );
  }

  const navItems = [
    { href: '/admin',            label: t('admin.dashboard'),   icon: LayoutDashboard },
    { href: '/admin/users',      label: t('admin.users'),       icon: Users },
    { href: '/admin/posts',      label: t('admin.posts'),       icon: FileText },
    { href: '/admin/categories', label: t('admin.categories'),  icon: Tag },
    { href: '/admin/stocks',     label: t('admin.stocks'),      icon: BarChart2 },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
            <TrendingUp size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
            ThanhDang<span className="text-green-400">Bullish</span>
            <span className="block text-xs text-gray-500 font-normal">{t('admin.panel')}</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(href)
                  ? 'bg-green-500/15 text-green-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ExternalLink size={16} />
            {t('admin.back_to_site')}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {user.full_name} <span className="text-gray-400 dark:text-gray-600">·</span>{' '}
            <span className="text-xs text-green-400 uppercase">{user.role}</span>
          </span>
          <button
            onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
            className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {locale === 'en' ? 'VI' : 'EN'}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
