'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';
import { TrendingUp, FileText, Plus, ExternalLink, Shield, Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, initialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!initialized) return;
    if (!user)               { router.replace('/auth/login'); return; }
    if (user.role === 'user') { router.replace('/'); }
  }, [initialized, user, router]);

  if (!initialized || !user || user.role === 'user') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-green-400" size={32} />
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard/posts',     label: 'My Posts', icon: FileText },
    { href: '/dashboard/posts/new', label: 'New Post',  icon: Plus     },
  ];

  const isActive = (href: string) =>
    href === '/dashboard/posts'
      ? pathname === '/dashboard/posts'
      : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
            <TrendingUp size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
            ThanhDang<span className="text-green-400">Bullish</span>
            <span className="block text-xs text-gray-500 font-normal">Dashboard</span>
          </span>
        </div>

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

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {user.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Shield size={16} />
              Admin Panel
            </Link>
          )}
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ExternalLink size={16} />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 flex-shrink-0">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {user.full_name}{' '}
            <span className="text-gray-400 dark:text-gray-600">·</span>{' '}
            <span className="text-xs text-green-400 uppercase">{user.role}</span>
          </span>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
