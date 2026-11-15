import { ChevronLeft, Circle, Square, X } from 'lucide-react';
import {
  LAUNCHER_APPS,
  renderLauncherIcon,
  type LauncherAppId,
} from './PhoneHomeScreen';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface PhoneNavBarProps {
  activeApp: LauncherAppId | null;
  recentApps: LauncherAppId[];
  showRecents: boolean;
  onBack: () => void;
  onHome: () => void;
  onToggleRecents: () => void;
  onSelectRecent: (appId: LauncherAppId) => void;
  onCloseRecent: (appId: LauncherAppId) => void;
}

export function PhoneNavBar({
  activeApp,
  recentApps,
  showRecents,
  onBack,
  onHome,
  onToggleRecents,
  onSelectRecent,
  onCloseRecent,
}: PhoneNavBarProps) {
  return (
    <>
      {/* Recent Apps Task Switcher Overlay */}
      {showRecents && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-40 bg-black/65 backdrop-blur-xl flex flex-col justify-end px-4 py-4"
          role="dialog"
          aria-modal="true"
          aria-label="Recent Apps"
        >
          <div className="max-w-3xl mx-auto w-full space-y-4 overflow-y-auto py-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-base font-semibold text-zinc-100">
                  Recent Apps ({recentApps.length})
                </h2>
                <SunilGlowingBadge compact />
              </div>
              <button
                type="button"
                onClick={onToggleRecents}
                className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
              >
                Close
              </button>
            </div>

            {recentApps.length === 0 ? (
              <div className="glass-panel rounded-3xl p-8 text-center text-xs text-zinc-300">
                No recent apps open yet. Tap any app icon on the home screen to launch it.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recentApps.map((appId) => {
                  const meta = LAUNCHER_APPS.find((a) => a.id === appId);
                  if (!meta) return null;
                  const isCurrent = activeApp === appId;
                  return (
                    <div
                      key={appId}
                      className={`glass-panel rounded-3xl p-4 flex flex-col justify-between gap-4 transition-all ${
                        isCurrent ? 'border-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.2)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`app-icon-3d w-10 h-10 rounded-xl ${meta.iconBgClass} flex items-center justify-center shrink-0`}
                          >
                            <div className="relative z-10 flex items-center justify-center">
                              {renderLauncherIcon(appId, 'w-5 h-5 text-white')}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-100 truncate">
                              {meta.name}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {isCurrent ? 'Active now' : meta.subtitle}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCloseRecent(appId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                          aria-label={`Close ${meta.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectRecent(appId)}
                        className="w-full py-2 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.15] text-xs font-semibold text-zinc-100 transition-colors active:scale-95"
                      >
                        Switch to {meta.name}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom Mobile Navigation Bar (Frosted Glass Dock Controls) */}
      <nav
        aria-label="Mobile system navigation"
        className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-[#06060d]/75 backdrop-blur-2xl border-t border-white/15 px-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        <div className="max-w-lg mx-auto h-full grid grid-cols-3 items-center">
          <button
            type="button"
            onClick={onBack}
            disabled={!activeApp && !showRecents}
            className="h-full min-h-[44px] flex items-center justify-center gap-1.5 text-zinc-300 hover:text-cyan-300 disabled:opacity-35 disabled:pointer-events-none active:scale-90 transition-all"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xs font-medium">Back</span>
          </button>

          <button
            type="button"
            onClick={onHome}
            className="h-full min-h-[44px] flex items-center justify-center gap-1.5 text-zinc-100 hover:text-amber-300 active:scale-90 transition-all"
            aria-label="Home"
          >
            <Circle className="w-4 h-4 fill-current opacity-90" />
            <span className="text-xs font-semibold">Home</span>
          </button>

          <button
            type="button"
            onClick={onToggleRecents}
            className={`h-full min-h-[44px] flex items-center justify-center gap-1.5 active:scale-90 transition-all ${
              showRecents ? 'text-cyan-300' : 'text-zinc-300 hover:text-cyan-300'
            }`}
            aria-label="Recent Apps"
          >
            <Square className="w-4 h-4" />
            <span className="text-xs font-medium">Recent</span>
          </button>
        </div>
      </nav>
    </>
  );
}
