import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import { Navbar } from "@/components/Navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Local Tools - AI-Powered Privacy Toolkit",
  description: "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Local Tools - AI-Powered Privacy Toolkit",
    description: "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device.",
    siteName: "Local Tools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Tools - AI-Powered Privacy Toolkit",
    description: "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device.",
  },
};

import ActivationWrapper from "@/components/ActivationWrapper";

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark scroll-smooth">
      <head>
        {/* Plausible Analytics - Privacy-friendly, no cookies */}
        <Script
          defer
          data-domain="localtools.pro"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen selection:bg-cyan-500/30`}>
        <NextIntlClientProvider messages={messages}>
          <ActivationWrapper>
            <div className="neural-grid min-h-screen">
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
            </div>
          </ActivationWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
