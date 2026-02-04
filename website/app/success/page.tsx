"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Download, Mail, ArrowRight, ExternalLink, Key } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Payment Successful! 🎉
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-lg mb-8">
          Thank you for your purchase. Your license key has been sent to your email.
        </p>

        {/* Info Box */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-left">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Getting Started
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-bold">1.</span>
              Check your email for your license key (check spam folder too)
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">2.</span>
              Download and install the desktop app
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">3.</span>
              Open the app and enter your license key to activate
            </li>
          </ol>
        </div>

        {/* Polar Customer Portal Link */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8">
          <p className="text-sm text-muted-foreground mb-3">
            Can&apos;t find your email? Access your license key anytime:
          </p>
          <a
            href="https://polar.sh/purchases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on Polar Customer Portal
          </a>
        </div>

        {/* Checkout ID */}
        {checkoutId && (
          <p className="text-xs text-muted-foreground mb-8">
            Order ID: <code className="bg-white/10 px-2 py-1 rounded">{checkoutId}</code>
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/#download"
            className="px-6 py-3 bg-primary text-black rounded-xl font-semibold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download App
          </Link>
          <Link
            href="/tools"
            className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            Browse Tools
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Support */}
        <p className="mt-12 text-xs text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@localtools.pro" className="text-primary hover:underline">
            support@localtools.pro
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
