import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veritas Analyst Console',
  description: 'Internal review and verification interface for Veritas procurement analysts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
