import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: { default: 'ThanhDangBullish — Stock Market News', template: '%s | ThanhDangBullish' },
  description: 'Your trusted source for stock market news, analysis, and insights.',
  keywords: ['stock market', 'financial news', 'investing', 'stocks', 'trading'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
