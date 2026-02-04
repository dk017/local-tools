import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import { Navbar } from "@/components/Navbar";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://localtools.pro"),
  title: {
    default: "Local Tools - AI-Powered Privacy Toolkit",
    template: "%s | Local Tools",
  },
  description: "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device. 50+ tools, 100% offline, zero cloud uploads.",
  keywords: [
    "offline PDF tools",
    "PDF editor offline",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF to Word",
    "image background remover",
    "privacy PDF tools",
    "local PDF processing",
    "no upload PDF tools",
  ],
  authors: [{ name: "Local Tools" }],
  creator: "Local Tools",
  publisher: "Local Tools",
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
    description: "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device. 50+ tools, 100% offline.",
    url: "https://localtools.pro",
    siteName: "Local Tools",
    type: "website",
    locale: "en_US",
    // TODO: Add OG image when created
    // Place og-image.png (1200x630) in website/public/ then uncomment:
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Local Tools - Offline PDF & Image Processing Toolkit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Tools - AI-Powered Privacy Toolkit",
    description: "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device.",
    // TODO: Add Twitter image when OG image is created
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // TODO: Add verification codes when setting up Search Console
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
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
