'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useLocale } from '../../i18n/LocaleContext';
import { TrendingUp, Search, Menu, X, LogOut, Sun, Moon } from 'lucide-react';

export default function Header() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { user }  = useAppSelector((s) => s.auth);
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const NAV_LINKS = [
    { href: '/',                          label: t('nav.home') },
    { href: '/news',                      label: t('nav.news') },
    { href: '/stocks',                    label: t('nav.stocks') },
    { href: '/news?category=market-news', label: t('nav.markets') },
    { href: '/news?category=analysis',    label: t('nav.analysis') },
  ];

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/news?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b border-gray-200 dark:bg-gray-900/95 dark:border-gray-800 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block">
              ThanhDang<span className="text-green-400">Bullish</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 rounded-lg transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.search_placeholder')}
                className="bg-gray-100 text-sm text-gray-900 pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-green-500 w-52 transition-colors dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              />
            </div>
          </form>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600 transition-colors"
              aria-label="Switch language"
            >
              {locale === 'en' ? 'VI' : 'EN'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
            >
              {mounted && (theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />)}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm text-gray-700 dark:text-gray-300">{user.full_name}</span>
                <button
                  onClick={() => dispatch(logout())}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-gray-800 transition-colors px-2 py-1.5 rounded-lg"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:block">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors">
                  {t('nav.login')}
                </Link>
                <Link href="/auth/register" className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors font-medium">
                  {t('nav.signup')}
                </Link>
              </div>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-gray-200 dark:border-gray-800">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search_placeholder')}
                  className="w-full bg-gray-100 text-sm text-gray-900 pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-green-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                />
              </div>
            </form>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 rounded-lg">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
