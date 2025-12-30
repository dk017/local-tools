import { useState } from 'react';
import { X, Zap, Clock } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgrade?: () => void;
}

export function TrialBanner({ daysRemaining, onUpgrade }: TrialBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || daysRemaining <= 0) {
    return null;
  }

  const urgencyLevel =
    daysRemaining <= 2 ? 'high' :
    daysRemaining <= 5 ? 'medium' :
    'low';

  const bgColor = {
    high: 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20',
    medium: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20',
    low: 'bg-gradient-to-r from-blue-500/10 to-primary/10 border-primary/20'
  }[urgencyLevel];

  const handleUpgrade = () => {
    // Open pricing page in browser
    openUrl('https://yourdomain.com/#pricing');
    onUpgrade?.();
  };

  return (
    <div className={`sticky top-0 z-50 ${bgColor} border-b backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-semibold text-white">
                {daysRemaining === 1 ? 'Last day' : `${daysRemaining} days`} of free trial
              </span>
            </div>
            <span className="text-sm text-white/70">
              Unlock unlimited access for $59/year
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="px-6 py-2 bg-primary hover:bg-cyan-400 text-black font-bold rounded-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
