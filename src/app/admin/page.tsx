'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminStats, fetchAdminUsers } from '../../store/slices/adminSlice';
import { fetchNews } from '../../store/slices/newsSlice';
import { useLocale } from '../../i18n/LocaleContext';
import { Users, FileText, Tag, BarChart2, Eye, Loader2 } from 'lucide-react';
import type { AdminStats } from '../../types';

function StatsCard({ label, value, icon: Icon, color }: {
  label: string; value: number | undefined; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">
        {value !== undefined ? value.toLocaleString() : '—'}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { t } = useLocale();
  const { stats, users, loading } = useAppSelector((s) => s.admin);
  const { articles } = useAppSelector((s) => s.news);

  useEffect(() => {
    dispatch(fetchAdminStats());
    dispatch(fetchAdminUsers({ limit: 5 }));
    dispatch(fetchNews({ limit: 5 }));
  }, [dispatch]);

  const statCards: { key: keyof AdminStats; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'users',      label: t('admin.stats.users'),       icon: Users,     color: 'bg-blue-500' },
    { key: 'articles',   label: t('admin.stats.articles'),    icon: FileText,  color: 'bg-green-500' },
    { key: 'categories', label: t('admin.stats.categories'),  icon: Tag,       color: 'bg-purple-500' },
    { key: 'stocks',     label: t('admin.stats.stocks'),      icon: BarChart2, color: 'bg-orange-500' },
    { key: 'totalViews', label: t('admin.stats.total_views'), icon: Eye,       color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t('admin.dashboard')}</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map(({ key, label, icon, color }) => (
          <StatsCard key={key} label={label} value={stats?.[key]} icon={icon} color={color} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-green-400" size={28} />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white text-sm">{t('admin.recent_users')}</h2>
              <Link href="/admin/users" className="text-xs text-green-400 hover:text-green-300">{t('admin.actions.view_all')}</Link>
            </div>
            <div className="divide-y divide-gray-800">
              {users.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-white">{u.full_name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-400'
                    : u.role === 'editor' ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-gray-700 text-gray-400'
                  }`}>{u.role}</span>
                </div>
              ))}
              {users.length === 0 && <p className="text-center text-gray-500 text-sm py-6">{t('admin.no_users')}</p>}
            </div>
          </div>

          {/* Recent Posts */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white text-sm">{t('admin.recent_posts')}</h2>
              <Link href="/admin/posts" className="text-xs text-green-400 hover:text-green-300">{t('admin.actions.view_all')}</Link>
            </div>
            <div className="divide-y divide-gray-800">
              {articles.slice(0, 5).map((a) => {
                const ds = (a.doc_status ?? 0) as 0 | 1 | 2;
                const label = ['Draft', 'Published', 'Archived'][ds];
                const color = ds === 1 ? 'bg-green-500/20 text-green-400' : ds === 0 ? 'bg-gray-700 text-gray-400' : 'bg-yellow-500/20 text-yellow-400';
                return (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm text-white line-clamp-1 flex-1 mr-3">{a.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${color}`}>{label}</span>
                  </div>
                );
              })}
              {articles.length === 0 && <p className="text-center text-gray-500 text-sm py-6">{t('admin.no_posts')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
