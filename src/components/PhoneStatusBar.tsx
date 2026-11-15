import { useEffect, useState } from 'react';
import { BatteryFull, Signal, Wallet, Wifi } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface PhoneStatusBarProps {
  walletBalance: number;
  onOpenWallet: () => void;
  onGoHome: () => void;
}

function formatClock(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function PhoneStatusBar({
  walletBalance,
  onOpenWallet,
  onGoHome,
}: PhoneStatusBarProps) {
  const [timeText, setTimeText] = useState<string>(formatClock);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeText(formatClock());
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      aria-label="Global persistent platform header"
      className="fixed top-0 left-0 right-0 z-[100] h-12 shrink-0 border-b border-amber-300/30 bg-[#070710]/85 backdrop-blur-2xl px-2.5 sm:px-5 flex items-center justify-between gap-2 sm:gap-3 shadow-[0_6px_28px_rgba(0,0,0,0.65),0_1px_18px_rgba(251,191,36,0.14),inset_0_-1px_0_rgba(34,211,238,0.16)]"
    >
      {/* Left: Time + Brand */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span className="font-mono text-xs font-semibold text-zinc-100 tabular-nums shrink-0">
          {timeText}
        </span>

        <span className="hidden sm:inline-block h-3.5 w-px bg-white/15 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={onGoHome}
          className="hidden md:inline font-display text-xs sm:text-sm font-bold tracking-tight text-zinc-100 hover:text-amber-300 transition-colors whitespace-nowrap truncate"
        >
          AI1999
        </button>
      </div>

      {/* Center: Permanent Global Luxury Metallic Gold & Neon Glowing "Sunil Singh • 1999" Signature */}
      <button
        type="button"
        onClick={onGoHome}
        className="flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full transition-transform active:scale-95"
        title="Sunil Singh • 1999 — Tap to return Home"
      >
        <SunilGlowingBadge variant="shell" />
      </button>

      {/* Right: Live Wallet Balance + Install + OS Signal/Battery */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenWallet}
          className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-emerald-400/40 backdrop-blur-md text-[11px] sm:text-xs font-medium text-zinc-100 transition-all whitespace-nowrap shrink-0 active:scale-95"
          title="Razorpay & UPI Payments · 9541441025"
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono tabular-nums">
            {walletBalance > 0
              ? `₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
              : 'UPI Pay'}
          </span>
        </button>

        <div className="hidden sm:block">
          <PWAInstallButton />
        </div>

        <div
          className="hidden xs:flex sm:flex items-center gap-1.5 text-zinc-200 shrink-0"
          aria-label="Network and battery status"
        >
          <Signal className="w-3.5 h-3.5 text-cyan-300" />
          <Wifi className="w-3.5 h-3.5 text-cyan-300" />
          <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-zinc-200">
            <BatteryFull className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">100%</span>
          </div>
        </div>
      </div>
    </header>
  );
}
