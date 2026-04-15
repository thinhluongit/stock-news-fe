'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useLocale } from '../../i18n/LocaleContext';
import { TrendingUp, Search, Menu, X, LogOut } from 'lucide-react';

export default function Header() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { user }  = useAppSelector((s) => s.auth);
  const { t, locale, setLocale } = useLocale();
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
    <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white hidden sm:block">
              ThanhDang<span className="text-green-400">Bullish</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
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
                className="bg-gray-800 text-sm text-gray-100 pl-9 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500 w-52 transition-colors"
              />
            </div>
          </form>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
              aria-label="Switch language"
            >
              {locale === 'en' ? 'VI' : 'EN'}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm text-gray-300">{user.full_name}</span>
                <button
                  onClick={() => dispatch(logout())}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:block">{t('nav.logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                  {t('nav.login')}
                </Link>
                <Link href="/auth/register" className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors font-medium">
                  {t('nav.signup')}
                </Link>
              </div>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-400 hover:text-white">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-gray-800">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search_placeholder')}
                  className="w-full bg-gray-800 text-sm text-gray-100 pl-9 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-green-500"
                />
              </div>
            </form>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
