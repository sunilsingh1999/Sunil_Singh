import { BadgeCheck, Crown } from 'lucide-react';

interface SunilGlowingBadgeProps {
  compact?: boolean;
  variant?: 'default' | 'hero' | 'shell';
  className?: string;
}

export function SunilGlowingBadge({
  compact = false,
  variant = 'default',
  className = '',
}: SunilGlowingBadgeProps) {
  if (variant === 'shell') {
    return (
      <div
        className={`rounded-full p-[1.5px] royal-metallic-gold-border shadow-[0_0_24px_rgba(251,191,36,0.42),0_0_18px_rgba(34,211,238,0.28)] shrink-0 ${className}`}
      >
        <div className="royal-light-sweep rounded-full bg-gradient-to-r from-[#120e07]/95 via-[#0b0b16]/95 to-[#100919]/95 backdrop-blur-2xl px-3 sm:px-3.5 py-1 flex items-center gap-1.5 border border-amber-300/30">
          <Crown
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] shrink-0"
            aria-hidden="true"
          />
          <span className="font-display text-[11px] sm:text-xs font-extrabold tracking-wide royal-gold-text drop-shadow-[0_0_10px_rgba(251,191,36,0.35)] whitespace-nowrap">
            Sunil Singh • 1999
          </span>
          <BadgeCheck
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)] shrink-0"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div
        className={`rounded-2xl p-[1.5px] royal-metallic-gold-border shadow-[0_0_32px_rgba(251,191,36,0.34),0_0_24px_rgba(34,211,238,0.24)] shrink-0 ${className}`}
      >
        <div className="royal-light-sweep rounded-[14.5px] bg-[#0a0a13]/92 backdrop-blur-2xl px-4 py-2.5 flex items-center gap-3 border border-amber-300/25">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300/30 via-amber-500/25 to-purple-600/25 border border-amber-300/50 flex items-center justify-center shadow-[0_0_18px_rgba(251,191,36,0.45)] shrink-0">
            <Crown className="w-4 h-4 text-amber-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm sm:text-base font-extrabold tracking-tight royal-gold-text whitespace-nowrap">
                Sunil Singh • 1999
              </span>
              <BadgeCheck
                className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)] shrink-0"
                aria-hidden="true"
              />
            </div>
            <div className="text-[11px] font-medium text-amber-200/85 tracking-wide whitespace-nowrap">
              Royal Creator Edition
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full p-[1.5px] royal-metallic-gold-border shadow-[0_0_20px_rgba(251,191,36,0.3),0_0_14px_rgba(34,211,238,0.22)] shrink-0 ${className}`}
    >
      <div
        className={`royal-light-sweep rounded-full bg-[#090912]/92 backdrop-blur-xl flex items-center gap-1.5 border border-amber-200/20 ${
          compact ? 'px-2.5 py-0.5' : 'px-3 py-1'
        }`}
      >
        <Crown
          className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.85)] shrink-0`}
          aria-hidden="true"
        />
        <span
          className={`font-display font-extrabold royal-gold-text whitespace-nowrap ${
            compact ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'
          }`}
        >
          Sunil Singh • 1999
        </span>
        <BadgeCheck
          className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)] shrink-0`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
