import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Payment Successful | Local Tools",
  description: "Your payment was successful. Your license key is ready.",
  robots: {
    index: false, // Don't index success pages
    follow: false,
  },
};

export default function SuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${inter.className} bg-background text-foreground antialiased min-h-screen selection:bg-cyan-500/30`}
      >
        <div className="neural-grid min-h-screen">{children}</div>
      </body>
    </html>
  );
}
