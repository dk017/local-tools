'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const licenseKey = searchParams.get('license_key') || searchParams.get('order_id');
  const [copied, setCopied] = useState(false);

  const copyLicenseKey = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            🎉 Payment Successful!
          </h1>
          <p className="text-muted-foreground text-lg">
            Thank you for purchasing Local Tools Desktop
          </p>
        </div>

        {/* License Key */}
        {licenseKey && (
          <div className="mb-8">
            <div className="bg-black/40 rounded-lg p-6 border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Your License Key:
                </h2>
                <button
                  onClick={copyLicenseKey}
                  className="flex items-center gap-2 px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-black/60 rounded p-4 font-mono text-sm md:text-base text-primary text-center break-all select-all">
                {licenseKey}
              </div>
              <p className="text-xs text-amber-500/80 mt-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>Save this key - you'll need it to activate the app</span>
              </p>
            </div>
          </div>
        )}

        {/* Download Button */}
        <div className="mb-8">
          <Link
            href="/download"
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,243,255,0.3)]"
          >
            <Download className="w-6 h-6" />
            Download Desktop App
          </Link>
        </div>

        {/* What's Next */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            📖 What's Next?
          </h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="text-muted-foreground">
                Download the app for your operating system (Windows, macOS, or Linux)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span className="text-muted-foreground">
                Install and open Local Tools Desktop
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span className="text-muted-foreground">
                Enter your license key when prompted
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span className="text-muted-foreground">
                Click "Activate" to unlock all features
              </span>
            </li>
          </ol>
        </div>

        {/* Email Confirmation */}
        <div className="text-center mt-8 pt-6 border-t border-white/10">
          <p className="text-sm text-muted-foreground mb-2">
            📧 A confirmation email with your license key and download links has been sent to your email.
          </p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Need help?{' '}
            <a
              href="https://x.com/dk_r017"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
