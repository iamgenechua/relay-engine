import type { Metadata } from "next";
import { DM_Sans, Source_Sans_3, JetBrains_Mono } from 'next/font/google'
import { Nav } from '@/components/nav'
import RelayEngine from '@/components/relay-engine/relay-engine'
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: "OrderFlow — Relay Engine Demo",
  description: "Demo app for Relay Engine hackathon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </main>
        <RelayEngine />
      </body>
    </html>
  );
}
