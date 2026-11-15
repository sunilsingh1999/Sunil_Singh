import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/95 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-xl"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Offline Mode — Saved workspaces remain available locally.</span>
    </div>
  );
}
