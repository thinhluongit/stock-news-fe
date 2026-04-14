import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: { default: 'ThanhDangBullish — Stock Market News', template: '%s | ThanhDangBullish' },
  description: 'Your trusted source for stock market news, analysis, and insights.',
  keywords: ['stock market', 'financial news', 'investing', 'stocks', 'trading'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
