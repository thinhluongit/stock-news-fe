'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocale, LOCALES } from '../../i18n/LocaleContext';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = LOCALES.find((l) => l.code === locale)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch language"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-100 border border-gray-300 hover:border-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600 transition-colors"
      >
        <span className={`fi fi-${current.countryCode} text-base`} style={{ width: '1.25rem', height: '0.9375rem', display: 'inline-block', borderRadius: '2px' }} />
        <ChevronDown
          size={12}
          className={`text-gray-500 dark:text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors ${
                locale === l.code
                  ? 'text-green-400 bg-green-500/10 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`fi fi-${l.countryCode}`} style={{ width: '1.25rem', height: '0.9375rem', display: 'inline-block', borderRadius: '2px', flexShrink: 0 }} />
              <span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
