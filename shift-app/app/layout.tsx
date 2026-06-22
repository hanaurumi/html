import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '5西勤務表作成',
  description: '5西病棟 勤務表自動生成システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
