import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import StoreProvider from "./StoreProvider";
import SidebarLayout from "@/components/sidebar/SidebarLayout";

const inter = Inter({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-playfair',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

import { APP_METADATA } from "@/lib/cohnreznick-metadata";

export const metadata: Metadata = {
  title: APP_METADATA.title,
  description: APP_METADATA.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <StoreProvider><SidebarLayout>{children}</SidebarLayout></StoreProvider>
      </body>
    </html>
  );
}
