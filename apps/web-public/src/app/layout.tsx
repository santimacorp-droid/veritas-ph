import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Veritas — Philippines Procurement Transparency",
  description: "Open-source evidence-first procurement transparency platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
