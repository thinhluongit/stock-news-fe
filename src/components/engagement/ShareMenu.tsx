'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';
import { engagementApi } from '../../services/api';

interface Props {
  articleId: string;
  title: string;
  url: string;
}

const PLATFORMS = [
  {
    id: 'facebook',
    label: 'Facebook',
    color: 'hover:text-blue-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
  },
  {
    id: 'zalo',
    label: 'Zalo',
    color: 'hover:text-blue-400',
    icon: (
      <svg viewBox="0 0 40 40" fill="currentColor" className="w-4 h-4">
        <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm9.375 28.438c-.313.312-.782.468-1.25.468a1.72 1.72 0 01-.938-.313l-4.062-2.812a1.56 1.56 0 00-.938-.313c-.156 0-.312.047-.469.094L17.5 27.5l-.781-3.594 4.687-1.562a.93.93 0 00.469-.313c.156-.156.156-.469 0-.625l-2.188-2.344c-.312-.312-.312-.781 0-1.094l2.344-2.187c.313-.313.782-.313 1.094 0l5.625 5.625c.469.468.469 1.25 0 1.718l-2.5 2.5c-.156.157-.156.469 0 .625l2.5 2.5c.313.313.313.782 0 1.188zm-9.844-8.282c0 .469-.156.938-.469 1.25-.625.625-1.562.625-2.187 0l-5.625-5.625c-.469-.469-.469-1.25 0-1.719l2.5-2.5c.156-.156.156-.469 0-.625l-2.5-2.5c-.313-.312-.313-.781 0-1.093.313-.313.782-.469 1.25-.469.469 0 .938.156 1.25.469l4.063 2.812c.312.156.625.313.937.313.157 0 .313-.047.469-.094l4.219-1.875.781 3.594-4.687 1.562a.906.906 0 00-.469.313c-.156.156-.156.469 0 .625l2.188 2.343c.312.313.312.782.28 1.22z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://zalo.me/share/sharer.php?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    color: 'hover:text-gray-900 dark:hover:text-white',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: 'hover:text-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    getUrl: (url: string, title: string) =>
      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
] as const;

export default function ShareMenu({ articleId, title, url }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const share = (platform: string, shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
    engagementApi.trackShare(articleId, platform).catch(() => null);
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      engagementApi.trackShare(articleId, 'copy').catch(() => null);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Share2 size={15} />
        Share
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50">
          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Share via</p>

          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => share(p.id, p.getUrl(url, title))}
              className={`flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${p.color}`}
            >
              {p.icon}
              {p.label}
            </button>
          ))}

          <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
            <button
              onClick={copyLink}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <LinkIcon size={15} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
