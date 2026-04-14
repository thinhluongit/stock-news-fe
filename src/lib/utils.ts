import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export function formatDateRelative(date: string | Date | undefined | null): string {
  if (!date) return '';
  const now  = new Date();
  const d    = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3_600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3_600)}h ago`;
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`;
  return formatDate(date);
}

export function formatNumber(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function formatPrice(price: number | undefined | null): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}
