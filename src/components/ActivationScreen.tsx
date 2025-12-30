import { useState } from "react";
import { Lock, Key, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { usePython } from "../hooks/usePython";

export default function ActivationScreen({
  onActivated,
}: {
  onActivated: () => void;
}) {
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { execute } = usePython();

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      // Using Desktop Sidecar Native Communication
      const data = await execute("licensing", "activate", {
        license_key: licenseKey.trim(),
      });

      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          onActivated();
        }, 1500);
      } else {
        setStatus("error");
        setErrorMessage(
          data.error || "Activation failed. Please check your subscription ID."
        );
      }
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setErrorMessage(e.message || "Connection error.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl">
      <div className="relative w-full max-w-md p-8 overflow-hidden bg-white/10 border border-white/20 rounded-3xl shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-6 p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-inner border border-white/10">
            <Lock className="w-10 h-10 text-white/90" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome to Offline Tools Pro
          </h2>
          <p className="text-white/60 mb-4 leading-relaxed">
            100% offline processing • Zero cloud uploads • Unlimited files
          </p>
          <div className="mb-6 px-6 py-4 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-baseline justify-center gap-2 mb-1">
              <span className="text-4xl font-bold text-white">$59</span>
              <span className="text-lg text-white/70">/year</span>
              <span className="ml-2 text-white/50 line-through text-sm">$120</span>
            </div>
            <p className="text-xs text-white/60 text-center">
              50% off launch price • Less than $5/month
            </p>
          </div>

          <div className="w-full space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-white/30 group-focus-within:text-purple-400 transition-colors" />
              </div>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter subscription ID"
                className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-black/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 sm:text-sm transition-all shadow-inner"
              />
            </div>

            {status === "error" && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-200 text-sm text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}

            {status === "success" && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-200 text-sm">
                <CheckCircle className="w-4 h-4" />
                Activation Successful! Unlocking...
              </div>
            )}

            <button
              onClick={handleActivate}
              disabled={status === "loading" || status === "success"}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white
                ${status === "success" ? "bg-green-600" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : status === "success" ? (
                "Unlocked"
              ) : (
                "Activate License"
              )}
            </button>

            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <p className="text-xs text-white/40">
                Don't have a subscription yet?
              </p>
              <button
                onClick={() => {
                  // Open pricing page in default browser
                  const { open } = require('@tauri-apps/plugin-opener');
                  open(process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL || 'https://yourdomain.com/#pricing');
                }}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium text-white transition-all"
              >
                Get Your Subscription - $59/year
              </button>
              <p className="text-xs text-white/30 text-center">
                Cancel anytime • 30-day money back guarantee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
