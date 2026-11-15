import { useEffect, useState } from 'react';
import { Car, Crosshair, Gamepad2, Volume2, VolumeX, X } from 'lucide-react';
import { gameAudio } from '../utils/gameAudio';
import { SunilGlowingBadge } from './SunilGlowingBadge';
import { BeachBuggyGame } from './games/BeachBuggyGame';
import { FireBattleGame } from './games/FireBattleGame';

interface GamesZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveGameId = 'fire-battle' | 'beach-buggy';

export function GamesZoneModal({ isOpen, onClose }: GamesZoneModalProps) {
  const [activeGame, setActiveGame] = useState<ActiveGameId>('fire-battle');
  const [muted, setMuted] = useState<boolean>(gameAudio.muted);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function toggleMute() {
    const next = !muted;
    gameAudio.muted = next;
    setMuted(next);
  }

  return (
    <div
      className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="games-zone-title"
    >
      <div className="w-full max-w-5xl max-h-full flex flex-col rounded-xl border border-zinc-800 bg-[#0d0d12] shadow-2xl overflow-hidden">
        {/* Games Zone Header */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-zinc-800/90 bg-[#111116] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="games-zone-title"
                className="font-display text-base font-semibold text-zinc-100"
              >
                Games Zone
              </h2>
              <p className="text-xs text-zinc-400">
                Built-in 60fps HTML5 Canvas arcade · Web Audio FX · Saved High Scores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SunilGlowingBadge compact />
            {/* Game Switcher */}
            <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveGame('fire-battle')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeGame === 'fire-battle'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                Fire Battle Survival
              </button>
              <button
                type="button"
                onClick={() => setActiveGame('beach-buggy')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeGame === 'beach-buggy'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-sky-400" />
                Beach Buggy Kart Race
              </button>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              title={muted ? 'Unmute game sound' : 'Mute game sound'}
              aria-label={muted ? 'Unmute game sound' : 'Mute game sound'}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Close Games Zone"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Game Stage */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#09090b]">
          {activeGame === 'fire-battle' ? (
            <FireBattleGame key="fire-battle" />
          ) : (
            <BeachBuggyGame key="beach-buggy" />
          )}
        </div>
      </div>
    </div>
  );
}
