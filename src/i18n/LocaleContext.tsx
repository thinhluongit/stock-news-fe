'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import en from './locales/en.json';
import vi from './locales/vi.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';

export type Locale = 'en' | 'vi' | 'fr' | 'zh' | 'ko' | 'ja';

export const LOCALES: { code: Locale; countryCode: string; name: string }[] = [
  { code: 'en', countryCode: 'us', name: 'English' },
  { code: 'vi', countryCode: 'vn', name: 'Tiếng Việt' },
  { code: 'fr', countryCode: 'fr', name: 'Français' },
  { code: 'zh', countryCode: 'cn', name: '中文' },
  { code: 'ko', countryCode: 'kr', name: '한국어' },
  { code: 'ja', countryCode: 'jp', name: '日本語' },
];

const VALID_LOCALES = LOCALES.map((l) => l.code);

const messages: Record<Locale, Record<string, unknown>> = { en, vi, fr, zh, ko, ja };

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
      if (saved && VALID_LOCALES.includes(saved)) setLocaleState(saved);
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
