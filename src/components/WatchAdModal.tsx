import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  ExternalLink,
  Gift,
  Megaphone,
  Play,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import {
  addBonusCredits,
  trackAnalyticsEvent,
} from '../config/merchant';
import {
  collectEnabledDirectLinks,
  type AdConfigState,
} from './AdSettingsApp';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface WatchAdModalProps {
  isOpen: boolean;
  rewardTarget: 'builder' | 'music';
  adConfig?: AdConfigState;
  onClose: () => void;
  onRewardGranted: () => void;
}

const AD_DURATION_SECONDS = 8;

export function WatchAdModal({
  isOpen,
  rewardTarget,
  adConfig,
  onClose,
  onRewardGranted,
}: WatchAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(AD_DURATION_SECONDS);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(AD_DURATION_SECONDS);
    setClaimed(false);

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, rewardTarget]);

  if (!isOpen) return null;

  const isCompleted = secondsLeft === 0;
  const targetLabel =
    rewardTarget === 'builder' ? 'AI App Builder Build' : 'AI Music Studio Song';
  const directLinks = collectEnabledDirectLinks(adConfig);
  const hasSponsorNetwork = Boolean(
    adConfig?.adsterraEnabled ||
      adConfig?.hilltopEnabled ||
      adConfig?.monetagEnabled ||
      adConfig?.clickaduEnabled ||
      adConfig?.admavenEnabled ||
      adConfig?.adsenseEnabled
  );

  function handleClaimFreeCredit() {
    if (!isCompleted || claimed) return;
    setClaimed(true);
    addBonusCredits(rewardTarget, 1);
    trackAnalyticsEvent('ad_watch', {
      label: `Sponsor Ad completed (+1 Free ${targetLabel})`,
      amountInr: 2.5,
      plan: rewardTarget,
    });
    onRewardGranted();
    onClose();
  }

  const progressDashoffset = Math.round(
    (secondsLeft / AD_DURATION_SECONDS) * 175.9
  );

  return (
    <div
      className="fixed inset-x-0 top-12 bottom-14 z-[75] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Watch Sponsor Ad for Free Credit"
    >
      <div className="w-full max-w-md rounded-3xl p-[1.5px] royal-metallic-gold-border shadow-2xl my-auto">
        <div className="rounded-[22px] bg-[#0c0c14] p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <SunilGlowingBadge compact />
            <button
              type="button"
              onClick={onClose}
              disabled={!isCompleted}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors"
              aria-label="Close ad window"
              title={
                isCompleted
                  ? 'Close'
                  : `Wait ${secondsLeft}s before closing`
              }
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Countdown Ring & Title */}
          <div className="text-center space-y-2.5">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={isCompleted ? '#10b981' : '#fbbf24'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="175.9"
                  strokeDashoffset={progressDashoffset}
                  className="transition-all duration-700 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : (
                  <span className="font-mono text-lg font-extrabold text-amber-300 tabular-nums">
                    {secondsLeft}s
                  </span>
                )}
              </div>
            </div>

            <h3 className="font-display text-lg sm:text-xl font-extrabold text-zinc-100">
              {isCompleted
                ? 'Sponsor Ad Complete! Reward Ready'
                : 'Sponsor Spotlight · Unlock 1 Free Use'}
            </h3>
            <p className="text-xs text-zinc-400">
              {isCompleted
                ? `Claim +1 Free ${targetLabel} credit instantly.`
                : `Watch for ${secondsLeft} more second${secondsLeft === 1 ? '' : 's'} to unlock 1 Free ${targetLabel}.`}
            </p>
          </div>

          {/* Interactive Adsterra / Sponsor Ad Showcase Box */}
          <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-[#131322] via-[#10101c] to-[#1a1026] p-4 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                <Megaphone className="w-3.5 h-3.5" />
                {hasSponsorNetwork ? 'Adsterra / Sponsor Partner' : 'AI1999 Sponsor Partner'}
              </span>
              <span className="font-mono text-zinc-400 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {isCompleted ? 'Verified' : `${secondsLeft}s`}
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                <Crown className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="font-display text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="truncate">AI1999 All-Access Super VIP Pass</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Get Unlimited App Builder + Unlimited AI Music Studio together for ₹999/Month via Razorpay &amp; UPI (9541441025).
                </p>
              </div>
            </div>

            {directLinks.length > 0 && (
              <a
                href={directLinks[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl border border-cyan-400/35 bg-cyan-500/15 hover:bg-cyan-500/25 text-[11px] font-semibold text-cyan-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open Sponsor Offer ({directLinks[0].network})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {adConfig?.adsterraEnabled && adConfig.adsterraBannerCode.trim() ? (
              <div className="text-[10px] font-mono text-emerald-300/90 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Live Multi-Ad Network Monetization Active</span>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                <Play className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>Sponsored by Sunil Singh • 1999 Ad Network</span>
              </div>
            )}
          </div>

          {/* Claim Button */}
          <button
            type="button"
            disabled={!isCompleted || claimed}
            onClick={handleClaimFreeCredit}
            className={`w-full py-3.5 px-5 rounded-2xl font-display text-sm font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-zinc-950 hover:brightness-110 shadow-lg shadow-emerald-600/30'
                : 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <Gift className="w-4 h-4" />
            {isCompleted
              ? `Claim +1 Free ${rewardTarget === 'builder' ? 'Builder Build' : 'AI Song'}`
              : `Sponsor Ad Playing (${secondsLeft}s)...`}
          </button>
        </div>
      </div>
    </div>
  );
}
