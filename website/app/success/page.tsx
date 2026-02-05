"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Download,
  ArrowRight,
  ExternalLink,
  Key,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Suspense, useEffect, useState, useCallback } from "react";

interface LicenseData {
  success: boolean;
  license_key: string;
  display_key: string;
  status: string;
  expires_at: string | null;
  activation_limit: number | null;
  activations_used: number;
}

function LicenseKeyDisplay({
  licenseKey,
  expiresAt,
  activationLimit,
}: {
  licenseKey: string;
  expiresAt: string | null;
  activationLimit: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-gradient-to-r from-green-500/10 to-primary/10 border border-green-500/30 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold text-green-400">Your License Key</h3>
      </div>

      {/* License Key Box */}
      <div className="bg-black/40 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <code className="text-lg md:text-xl font-mono text-white break-all select-all">
            {licenseKey}
          </code>
          <button
            onClick={copyToClipboard}
            className="shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-muted-foreground hover:text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Key Details */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {expiresAt && (
          <span>
            Valid until: <span className="text-white">{formatDate(expiresAt)}</span>
          </span>
        )}
        {activationLimit && (
          <span>
            Activations: <span className="text-white">up to {activationLimit} devices</span>
          </span>
        )}
      </div>

      {/* Copy Confirmation */}
      {copied && (
        <p className="mt-3 text-sm text-green-400 flex items-center gap-1">
          <Check className="w-4 h-4" />
          Copied to clipboard!
        </p>
      )}
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkout_id");

  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchLicenseKey = useCallback(async () => {
    if (!checkoutId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/license/fetch?checkout_id=${checkoutId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setLicenseData(data);
        setError(null);
      } else if (response.status === 404 && data.message) {
        // License key still generating
        setError(data.message);
      } else {
        setError(data.error || "Failed to fetch license key");
      }
    } catch (err) {
      console.error("Error fetching license:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [checkoutId]);

  useEffect(() => {
    fetchLicenseKey();
  }, [fetchLicenseKey, retryCount]);

  // Auto-retry if license key is still generating
  useEffect(() => {
    if (error && error.includes("still be generating") && retryCount < 5) {
      const timer = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
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
          Thank you for your purchase. Your license key is ready!
        </p>

        {/* License Key Section */}
        {loading ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 mb-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Fetching your license key...</p>
          </div>
        ) : licenseData ? (
          <LicenseKeyDisplay
            licenseKey={licenseData.license_key}
            expiresAt={licenseData.expires_at}
            activationLimit={licenseData.activation_limit}
          />
        ) : error ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <p className="text-yellow-400 font-medium">License Key Pending</p>
            </div>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : null}

        {/* Getting Started Box */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-left">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Getting Started
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-bold">1.</span>
              {licenseData
                ? "Copy your license key above"
                : "Your license key will appear above (or check your email)"}
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
            You can always access your license key from your account:
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
            Order ID:{" "}
            <code className="bg-white/10 px-2 py-1 rounded">{checkoutId}</code>
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/download"
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
        <p className="mt-12 text-xs text-muted-foreground flex items-center justify-center gap-1">
          Need help? Contact us on{" "}
          <a
            href="https://x.com/dk_r017"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @dk_r017
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
