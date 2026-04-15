'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import en from './locales/en.json';
import vi from './locales/vi.json';

export type Locale = 'en' | 'vi';

const messages: Record<Locale, Record<string, unknown>> = { en, vi };

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

function resolve(obj: Record<string, unknown>, key: string): string {
  const value = key.split('.').reduce<unknown>((acc, k) => {
    if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : key;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('locale') as Locale | null;
      if (saved === 'en' || saved === 'vi') setLocaleState(saved);
    } catch {
      // localStorage unavailable (SSR guard)
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try { localStorage.setItem('locale', next); } catch { /* noop */ }
  }, []);

  const t = useCallback(
    (key: string) => resolve(messages[locale], key),
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within <LocaleProvider>');
  return ctx;
}
