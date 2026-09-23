import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '归途 · 我的旅行地图',
  description: '把去过的地方、喜欢的照片和沿途故事，轻轻钉在地图上。',
  openGraph: {
    title: '归途 · 我的旅行地图',
    description: '把去过的地方、喜欢的照片和沿途故事，轻轻钉在地图上。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '归途 · 我的旅行地图',
    description: '把去过的地方、喜欢的照片和沿途故事，轻轻钉在地图上。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
