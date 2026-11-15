import { useEffect, useRef } from 'react';
import { Megaphone } from 'lucide-react';
import { LOCKED_LIVE_ADS } from '../config/merchant';

interface AdsterraLiveBannerProps {
  bannerKey?: string;
}

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

export function AdsterraLiveBanner(_props: AdsterraLiveBannerProps) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const safeKey = LOCKED_LIVE_ADS.ADSTERRA_BANNER_KEY;

  useEffect(() => {
    const container = slotRef.current;
    if (!container) return;

    container.innerHTML = '';

    window.atOptions = {
      key: safeKey,
      format: 'iframe',
      height: 50,
      width: 320,
      params: {},
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://www.highperformanceformat.com/${safeKey}/invoke.js`;
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [safeKey]);

  return (
    <div
      className="glass-panel rounded-2xl px-3 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5"
      aria-label="Sponsored Adsterra Banner"
    >
      <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
        <Megaphone className="w-3.5 h-3.5 text-amber-300" />
        <span className="font-medium text-zinc-300">Sponsored</span>
        <span className="hidden md:inline font-mono text-[10px] text-zinc-500">
          Adsterra Live
        </span>
      </div>

      <div
        ref={slotRef}
        className="w-[320px] max-w-full min-h-[50px] h-[50px] rounded-xl overflow-hidden bg-black/35 border border-white/10 flex items-center justify-center shrink-0"
      />
    </div>
  );
}
