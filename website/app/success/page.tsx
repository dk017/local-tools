"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Download, Mail, ArrowRight } from "lucide-react";
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
          Thank you for your purchase. Your license key will be sent to your email shortly.
        </p>

        {/* Info Box */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            What happens next?
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-bold">1.</span>
              Check your email for the license key (within 5 minutes)
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">2.</span>
              Download the desktop app if you haven&apos;t already
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">3.</span>
              Open the app and enter your license key to activate
            </li>
          </ol>
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
            href="/"
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
