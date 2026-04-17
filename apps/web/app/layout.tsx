import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Send to Self',
  description: 'Single-user self-hosted inbox.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
