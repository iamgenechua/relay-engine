import type { Metadata } from "next";
import { DM_Sans, Source_Sans_3, JetBrains_Mono } from 'next/font/google'
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
        {children}
      </body>
    </html>
  );
}
