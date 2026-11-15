import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { OwnerGuardState } from '../utils/securityShield';

interface SecurityAlertBadgeProps {
  guard: OwnerGuardState;
}

export function SecurityAlertBadge({ guard }: SecurityAlertBadgeProps) {
  if (guard.isLocked) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-500/60 bg-red-950/60 px-3.5 py-2.5 text-left space-y-1 shadow-[0_0_24px_rgba(239,68,68,0.28)]"
      >
        <div className="flex items-center gap-2 text-xs font-extrabold text-red-200">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>Security Alert: Unauthorized Access Blocked</span>
        </div>
        <p className="text-[11px] text-red-200/85">
          3 wrong password attempts detected. Owner login is locked for 24 hours (
          {guard.remainingLabel || '24h'} remaining).
        </p>
      </div>
    );
  }

  if (guard.failedAttempts > 0 && guard.attemptsLeft > 0) {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-500/45 bg-amber-950/40 px-3 py-2 text-[11px] text-amber-200 flex items-center gap-2 text-left"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          Security Warning: {guard.attemptsLeft}{' '}
          {guard.attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining before 24-hour lockout.
        </span>
      </div>
    );
  }

  return null;
}
