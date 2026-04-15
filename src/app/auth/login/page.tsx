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

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { loading, error } = useAppSelector((s) => s.auth);
  const [form, setForm] = useState<LoginCredentials>({ email: '', password: '' });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back!');
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              ThanhDang<span className="text-green-400">Bullish</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-6 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400">Sign in to your account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Email" id="email" name="email" type="email"
              value={form.email} onChange={handleChange}
              placeholder="you@example.com" required autoComplete="email" />
            <Input label="Password" id="password" name="password" type="password"
              value={form.password} onChange={handleChange}
              placeholder="••••••••" required autoComplete="current-password" />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-green-400 hover:text-green-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
