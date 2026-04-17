'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { loginUser, clearError } from '../../../store/slices/authSlice';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { LoginCredentials } from '../../../types';
import { useLocale } from '../../../i18n/LocaleContext';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { loading, error } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [form, setForm] = useState<LoginCredentials>({ email: '', password: '' });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      toast.success(t('auth.login.toast_success'));
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              ThanhDang<span className="text-green-400">Bullish</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-1">{t('auth.login.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.login.subtitle')}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label={t('auth.login.email')} id="email" name="email" type="email"
              value={form.email} onChange={handleChange}
              placeholder="you@example.com" required autoComplete="email" />
            <Input label={t('auth.login.password')} id="password" name="password" type="password"
              value={form.password} onChange={handleChange}
              placeholder="••••••••" required autoComplete="current-password" />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {t('auth.login.submit')}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          {t('auth.login.no_account')}{' '}
          <Link href="/auth/register" className="text-green-400 hover:text-green-300 font-medium transition-colors">
            {t('auth.login.signup_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
