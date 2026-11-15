import { useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  ChevronRight,
  ExternalLink,
  Layers,
  Mic,
  Search,
  Wallet,
} from 'lucide-react';
import { AdsterraLiveBanner } from './AdsterraLiveBanner';
import {
  PLAY_STORE_APPS,
  renderPlayStoreIconGlyph,
} from './PlayStoreAppIcons';
import { PWAInstallButton } from './PWAInstallButton';
import { SunilGlowingBadge } from './SunilGlowingBadge';
import type { TurboSearchLaunchPayload } from './TurboSearchApp';

export type LauncherAppId =
  | 'turbo-search'
  | 'ai-builder'
  | 'chargpt'
  | 'ai-studio'
  | 'ai-music'
  | 'ai-video'
  | 'wallet'
  | 'fire-battle'
  | 'beach-buggy'
  | 'refer-earn'
  | 'owner-panel'
  | 'ad-settings';

export interface LauncherAppMeta {
  id: LauncherAppId;
  name: string;
  subtitle: string;
  iconBgClass: string;
}

export const LAUNCHER_APPS: LauncherAppMeta[] = [
  {
    id: 'turbo-search',
    name: 'Turbo AI Search',
    subtitle: '10x Live Search',
    iconBgClass: 'bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-700',
  },
  {
    id: 'ai-builder',
    name: 'AI App Builder',
    subtitle: '1 Free · ₹299/Mo',
    iconBgClass: 'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800',
  },
  {
    id: 'chargpt',
    name: 'Chargpt',
    subtitle: 'Hindi/EN AI & Voice',
    iconBgClass: 'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-500',
  },
  {
    id: 'ai-studio',
    name: 'AI Studio',
    subtitle: 'Prompt playground',
    iconBgClass: 'bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-800',
  },
  {
    id: 'ai-music',
    name: 'AI Music Studio',
    subtitle: '2 Free · ₹500/Mo',
    iconBgClass: 'bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500',
  },
  {
    id: 'ai-video',
    name: 'AI Video Studio',
    subtitle: '3 Free · ₹500/Mo',
    iconBgClass: 'bg-gradient-to-br from-violet-500 via-fuchsia-600 to-rose-600',
  },
  {
    id: 'wallet',
    name: 'Payments & UPI',
    subtitle: 'Razorpay · 9541441025',
    iconBgClass: 'bg-gradient-to-br from-emerald-400 via-teal-600 to-cyan-800',
  },
  {
    id: 'fire-battle',
    name: 'Fire Battle',
    subtitle: 'Play inside app',
    iconBgClass: 'bg-gradient-to-br from-orange-500 via-red-600 to-rose-800',
  },
  {
    id: 'beach-buggy',
    name: 'Beach Buggy',
    subtitle: 'Play inside app',
    iconBgClass: 'bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-700',
  },
  {
    id: 'refer-earn',
    name: 'Refer & Earn',
    subtitle: 'Free AI Credits',
    iconBgClass: 'bg-gradient-to-br from-amber-400 via-orange-500 to-pink-600',
  },
  {
    id: 'owner-panel',
    name: 'Owner Suite',
    subtitle: 'Analytics · Owner VIP',
    iconBgClass: 'bg-gradient-to-br from-amber-500 via-yellow-600 to-emerald-700',
  },
  {
    id: 'ad-settings',
    name: 'Ad Settings',
    subtitle: 'Multi-Ad Revenue Hub',
    iconBgClass: 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600',
  },
];

export function renderLauncherIcon(
  id: LauncherAppId,
  className = 'w-8 h-8 text-white'
) {
  const dropClass = `${className} drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`;
  switch (id) {
    case 'turbo-search':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <circle
            cx="14"
            cy="14"
            r="8.5"
            fill="rgba(34,211,238,0.22)"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path
            d="m15.2 9.2-3.6 5.2h3.1l-1 4.4 3.8-5.4h-3.1l.8-4.2Z"
            fill="#fde047"
          />
          <path
            d="m20.5 20.5 6.5 6.5"
            stroke="#67e8f9"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'ai-builder':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <path
            d="M16 4.5 27 10.5 16 16.5 5 10.5 16 4.5Z"
            fill="rgba(255,255,255,0.28)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M5 16l11 6 11-6"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 21.5l11 6 11-6"
            stroke="#fde047"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'chargpt':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <rect
            x="5.5"
            y="8"
            width="21"
            height="16.5"
            rx="6"
            fill="rgba(255,255,255,0.16)"
            stroke="currentColor"
            strokeWidth="2.1"
          />
          <path
            d="M16 4v4M12 16h.01M20 16h.01"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="11.8" cy="15.5" r="1.7" fill="#67e8f9" />
          <circle cx="20.2" cy="15.5" r="1.7" fill="#fde047" />
          <path
            d="M12.5 20c1 .9 2.2 1.3 3.5 1.3s2.5-.4 3.5-1.3"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'ai-studio':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <rect
            x="8"
            y="8"
            width="16"
            height="16"
            rx="4"
            fill="rgba(255,255,255,0.16)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16 11.2 17.5 14.5 20.8 16 17.5 17.5 16 20.8 14.5 17.5 11.2 16 14.5 14.5 16 11.2Z"
            fill="#67e8f9"
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path
            d="M12 4v4M20 4v4M12 24v4M20 24v4M4 12h4M4 20h4M24 12h4M24 20h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'ai-music':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <circle
            cx="10.5"
            cy="22.5"
            r="3.8"
            fill="rgba(253,224,71,0.35)"
            stroke="#fde047"
            strokeWidth="2"
          />
          <circle
            cx="22.5"
            cy="20"
            r="3.8"
            fill="rgba(255,255,255,0.22)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M14.3 22.5V9.2l12-3V20M14.3 13.5l12-3"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'ai-video':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <rect
            x="4.5"
            y="7"
            width="23"
            height="18"
            rx="4.5"
            fill="rgba(255,255,255,0.16)"
            stroke="currentColor"
            strokeWidth="2.1"
          />
          <path
            d="M4.5 12h23"
            stroke="#fde047"
            strokeWidth="2"
          />
          <path
            d="M10 7l2.5 5M17 7l2.5 5M23 7l2 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M13.5 15.2l7 3.6-7 3.6v-7.2Z"
            fill="#67e8f9"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <rect
            x="4.5"
            y="8"
            width="23"
            height="17"
            rx="4.5"
            fill="rgba(255,255,255,0.16)"
            stroke="currentColor"
            strokeWidth="2.1"
          />
          <path
            d="M7 8l13.5-3.2a2 2 0 0 1 2.4 1.5L23.3 8"
            stroke="#fde047"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="19.5"
            y="14"
            width="8"
            height="5"
            rx="2.2"
            fill="rgba(255,255,255,0.24)"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="22.8" cy="16.5" r="1" fill="#fde047" />
        </svg>
      );
    case 'fire-battle':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="9.5" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="16" cy="16" r="4" fill="rgba(253,224,71,0.35)" stroke="#fde047" strokeWidth="2" />
          <path
            d="M16 3.5v4.5M16 24v4.5M3.5 16H8M24 16h4.5"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'beach-buggy':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <path
            d="M6.5 18.5 9.2 11a3 3 0 0 1 2.8-2h8a3 3 0 0 1 2.8 2l2.7 7.5"
            fill="rgba(255,255,255,0.18)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect
            x="4.5"
            y="17.5"
            width="23"
            height="6.5"
            rx="3"
            fill="rgba(255,255,255,0.22)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="9.5" cy="24.5" r="2.8" fill="#09090b" stroke="#fde047" strokeWidth="2" />
          <circle cx="22.5" cy="24.5" r="2.8" fill="#09090b" stroke="#fde047" strokeWidth="2" />
        </svg>
      );
    case 'refer-earn':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <rect
            x="5.5"
            y="12"
            width="21"
            height="14.5"
            rx="3.5"
            fill="rgba(255,255,255,0.18)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4.5 12h23v4H4.5z"
            fill="rgba(253,224,71,0.3)"
            stroke="#fde047"
            strokeWidth="1.8"
          />
          <path
            d="M16 12v14.5M16 12c-1.8-3.5-5.5-3.8-6.2-1.5-.6 2 2.4 2.5 6.2 1.5ZM16 12c1.8-3.5 5.5-3.8 6.2-1.5.6 2-2.4 2.5-6.2 1.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'owner-panel':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <path
            d="M5.5 23.5h21"
            stroke="#fde047"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <rect x="7" y="15" width="4" height="6.5" rx="1.2" fill="#67e8f9" />
          <rect x="14" y="10.5" width="4" height="11" rx="1.2" fill="#fde047" />
          <rect x="21" y="6.5" width="4" height="15" rx="1.2" fill="#ffffff" />
        </svg>
      );
    case 'ad-settings':
      return (
        <svg viewBox="0 0 32 32" className={dropClass} fill="none" aria-hidden="true">
          <path
            d="M6 14.5v3a2.5 2.5 0 0 0 2.5 2.5H12l9.5 4.8a1.2 1.2 0 0 0 1.7-1.1V8.3a1.2 1.2 0 0 0-1.7-1.1L12 12H8.5A2.5 2.5 0 0 0 6 14.5Z"
            fill="rgba(255,255,255,0.22)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M25.5 12.5c1.5 1.8 1.5 5.2 0 7M10.5 20l1.6 5.5"
            stroke="#fde047"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

interface PhoneHomeScreenProps {
  walletBalance: number;
  activeProjectTitle: string;
  projectCount: number;
  onOpenApp: (appId: LauncherAppId) => void;
  onLaunchTurboSearch: (payload?: Omit<TurboSearchLaunchPayload, 'nonce'>) => void;
}

export function PhoneHomeScreen({
  walletBalance,
  activeProjectTitle,
  projectCount,
  onOpenApp,
  onLaunchTurboSearch,
}: PhoneHomeScreenProps) {
  const [homeQuery, setHomeQuery] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  function handleHomeSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = homeQuery.trim();
    onLaunchTurboSearch(trimmed ? { query: trimmed } : {});
  }

  function handleHomeImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        onLaunchTurboSearch({ imageDataUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-transparent px-4 sm:px-6 pt-4 pb-4">
      <div className="max-w-4xl mx-auto w-full space-y-5">
        {/* Prominent 3D Frosted-Glass "Turbo AI Search" Pill Widget right under Top Header */}
        <form
          onSubmit={handleHomeSearchSubmit}
          aria-label="Turbo AI Search home widget"
          className="relative"
        >
          <div className="rounded-full p-[1.5px] royal-metallic-gold-border shadow-[0_12px_36px_rgba(0,0,0,0.65),0_0_28px_rgba(34,211,238,0.28),0_0_18px_rgba(251,191,36,0.2)]">
            <div className="royal-light-sweep rounded-full bg-[#090914]/80 backdrop-blur-2xl px-2.5 sm:px-3.5 py-1.5 flex items-center gap-1.5 sm:gap-2.5 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]">
              <button
                type="button"
                onClick={() => onLaunchTurboSearch(homeQuery.trim() ? { query: homeQuery.trim() } : {})}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/25 via-blue-500/25 to-purple-500/25 border border-cyan-300/45 flex items-center justify-center text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.45)] hover:scale-105 active:scale-95 transition-transform shrink-0"
                title="Open Turbo AI Search"
                aria-label="Open Turbo AI Search"
              >
                <Search className="w-4 h-4 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              </button>

              <input
                type="text"
                value={homeQuery}
                onChange={(e) => setHomeQuery(e.target.value)}
                placeholder="Search on AI1999..."
                aria-label="Search on AI1999"
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-zinc-50 placeholder:text-zinc-300/80 focus:outline-none py-2 px-1"
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleHomeImageUpload}
                className="hidden"
                aria-label="Visual image search upload"
              />

              <button
                type="button"
                onClick={() => onLaunchTurboSearch({ autoVoice: true })}
                title="Voice Search (Turbo AI)"
                aria-label="Voice Search"
                className="w-9 h-9 rounded-full flex items-center justify-center text-cyan-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
              >
                <Mic className="w-4 h-4 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
              </button>

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                title="Camera / Image Visual Search"
                aria-label="Camera and image search"
                className="w-9 h-9 rounded-full flex items-center justify-center text-amber-200 hover:text-amber-100 hover:bg-white/10 active:scale-95 transition-all shrink-0"
              >
                <Camera className="w-4 h-4 drop-shadow-[0_0_6px_rgba(251,191,36,0.65)]" />
              </button>

              <button
                type="submit"
                className="h-9 px-3 sm:px-4 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:brightness-110 active:scale-95 text-[11px] sm:text-xs font-bold text-white inline-flex items-center gap-1 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-all shrink-0 whitespace-nowrap"
                title="Search with Turbo AI (Live Google Search)"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Royal Signature Header & Hero Identity */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-cyan-300/85 tracking-wide">
              {todayFormatted}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50 text-balance">
              AI1999
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300">
              Built by{' '}
              <span className="font-display font-bold text-amber-300">
                Sunil Singh
              </span>
              <span className="mx-2 text-zinc-600" aria-hidden="true">
                ·
              </span>
              <span className="text-zinc-300">
                Flagship AI OS · App, Music &amp; Video Studio
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <SunilGlowingBadge variant="hero" />
            <div className="sm:hidden">
              <PWAInstallButton />
            </div>
          </div>
        </div>

        {/* Frosted Glass Summary Widgets Row (Workspace + Wallet) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            type="button"
            onClick={() => onOpenApp('ai-builder')}
            className="glass-panel glass-panel-interactive group flex items-center justify-between gap-3 p-4 rounded-3xl text-left min-h-[72px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="app-icon-3d w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-white relative z-10" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-cyan-300/90">
                  Active AI Workspace
                </div>
                <div className="font-display text-sm sm:text-base font-bold text-zinc-50 truncate">
                  {activeProjectTitle}
                </div>
                <div className="text-[11px] text-zinc-400 tabular-nums">
                  {projectCount} saved project{projectCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('wallet')}
            className="glass-panel glass-panel-interactive group flex items-center justify-between gap-3 p-4 rounded-3xl text-left min-h-[72px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="app-icon-3d w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-600 to-cyan-800 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-white relative z-10" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-emerald-300/90">
                  Razorpay &amp; UPI Pay
                </div>
                <div className="font-mono text-lg font-extrabold text-zinc-50 tabular-nums">
                  {walletBalance > 0
                    ? `₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '9541441025'}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  Official Merchant: Sunil Singh · GPay, PhonePe &amp; Paytm
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>

        {/* Permanent Live Adsterra Banner */}
        <AdsterraLiveBanner />

        {/* Built-in Launcher Apps & Playable HTML5 Games */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
            <span className="font-display font-semibold tracking-tight text-zinc-100">
              AI1999 Apps &amp; Playable Games
            </span>
            <span className="text-[11px] text-zinc-400">
              Instant launch inside OS
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-2 sm:gap-x-3 gap-y-5">
            {LAUNCHER_APPS.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => onOpenApp(app.id)}
                className="group flex flex-col items-center gap-2.5 p-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-h-[44px]"
              >
                <div
                  className={`app-icon-3d w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-[18px] sm:rounded-[20px] ${app.iconBgClass} flex items-center justify-center`}
                >
                  <div className="relative z-10 flex items-center justify-center">
                    {renderLauncherIcon(app.id, 'w-7 h-7 sm:w-8 sm:h-8 text-white')}
                  </div>
                </div>
                <div className="text-center space-y-0.5 max-w-[84px] sm:max-w-[98px]">
                  <div className="text-[11px] sm:text-xs font-semibold text-zinc-100 leading-tight truncate group-hover:text-amber-200 transition-colors">
                    {app.name}
                  </div>
                  <div className="hidden sm:block text-[10px] text-zinc-400 truncate">
                    {app.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 12 Direct Google Play Store App Shortcuts (3D Glossy Vector Icons) */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-300">
            <span className="font-display font-semibold tracking-tight text-zinc-100">
              Play Store Apps
            </span>
            <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1">
              <span>Social, UPI, Shopping &amp; PUBG</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5">
            {PLAY_STORE_APPS.map((app) => (
              <a
                key={app.id}
                href={app.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 p-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-h-[44px]"
                title={`Open ${app.name} on Google Play Store`}
              >
                <div
                  className={`app-icon-3d w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] sm:rounded-[20px] ${app.iconBgClass} flex items-center justify-center`}
                >
                  <div className="relative z-10 flex items-center justify-center">
                    {renderPlayStoreIconGlyph(app.id)}
                  </div>
                </div>
                <div className="text-center space-y-0.5 max-w-[84px]">
                  <div className="text-[11px] sm:text-xs font-semibold text-zinc-100 leading-tight truncate group-hover:text-cyan-200 transition-colors">
                    {app.name}
                  </div>
                  <div className="hidden sm:block text-[10px] text-zinc-400 truncate">
                    Play Store
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Frosted Glass Quick-Access Dock */}
      <div className="max-w-lg mx-auto w-full pt-7 pb-6">
        <div
          className="rounded-[28px] border border-white/20 bg-white/[0.06] backdrop-blur-2xl px-2.5 sm:px-3.5 py-2.5 flex items-center justify-around gap-1.5 sm:gap-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.28)]"
          aria-label="Quick-access dock"
        >
          {LAUNCHER_APPS.filter(
            (a) =>
              a.id !== 'ad-settings' &&
              a.id !== 'beach-buggy' &&
              a.id !== 'turbo-search' &&
              a.id !== 'refer-earn' &&
              a.id !== 'owner-panel' &&
              a.id !== 'ai-studio'
          ).map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenApp(app.id)}
              title={app.name}
              aria-label={`Launch ${app.name}`}
              className="group p-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <div
                className={`app-icon-3d w-11 h-11 sm:w-12 sm:h-12 rounded-[15px] ${app.iconBgClass} flex items-center justify-center`}
              >
                <div className="relative z-10 flex items-center justify-center">
                  {renderLauncherIcon(app.id, 'w-5 h-5 sm:w-6 sm:h-6 text-white')}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
