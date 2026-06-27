import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Mono, Source_Serif_4, IBM_Plex_Sans_Condensed } from 'next/font/google';
import "./globals.css";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-next',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono-next',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body-next',
});

const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-ui-next',
});

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
    <html lang="en" className={`${playfairDisplay.variable} ${ibmPlexMono.variable} ${sourceSerif4.variable} ${ibmPlexSansCondensed.variable}`}>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <div style={{ flex: '1 0 auto' }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
