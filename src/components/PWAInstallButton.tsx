import { useState } from 'react';
import { Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { SunilGlowingBadge } from './SunilGlowingBadge';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-blue-500/40 bg-blue-600/15 text-blue-300 hover:bg-blue-600/25 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Smartphone className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          Install App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#121217] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-zinc-100">
                  Install AI1999
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  aria-label="Close install instructions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-center">
                <SunilGlowingBadge compact />
              </div>
              <ol className="space-y-2.5 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs text-blue-400 mt-0.5">01.</span>
                  <span>
                    Tap the <strong className="text-zinc-100 inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 inline" /></strong> button in the Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-xs text-blue-400 mt-0.5">02.</span>
                  <span>
                    Scroll down and tap <strong className="text-zinc-100">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-zinc-800 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
