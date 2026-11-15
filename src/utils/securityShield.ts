// Anti-Inspect, Anti-Tamper & Paywall Storage Integrity Shield for AI1999

export const SHIELD_SEAL_STORAGE_KEY = 'ai1999_shield_seal_v1';
export const OWNER_GUARD_STORAGE_KEY = 'ai1999_owner_guard_v1';
export const OWNER_SESSION_TOKEN_STORAGE_KEY = 'ai1999_owner_session_token_v1';

// Precomputed 64-bit salted hash digest — plain password is never stored or exposed in client code
const EXPECTED_OWNER_DIGEST = '90b2b58d:d30f9651';

export const LOCKED_MERCHANT = Object.freeze({
  NAME: 'Sunil Singh',
  CONTACT: '9541441025',
  UPI_ID: '9541441025@ybl',
  OFFICIAL_LABEL: 'Official Merchant: Sunil Singh (9541441025)',
});

export const LOCKED_LIVE_ADS = Object.freeze({
  ADSTERRA_BANNER_KEY: '2f2b6cdc2759ef1935795725cfd73d0f',
  HILLTOP_META_NAME: 'dffda3885d821cc56ed00e9306ceea6ab0ab1796',
  HILLTOP_PUSH_SRC:
    '//juvenilechoice.com/bzX-VLs.diG/lm0-Y/W_cR/PeBmS9vugZkUHlIkPPNTAcb2/M/jsg/1HNmj/kTtrNVzDYOy/OUDpUw3zMjwG',
  MONETAG_META_CONTENT: '76abbcd26c7fa25a76833cff645cd25f',
  MONETAG_MULTITAG_SRC: 'https://quge5.com/88/tag.min.js',
  MONETAG_ZONE_ID: '310667',
});

export const MAX_OWNER_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000;

export function hashOwnerSecret(input: string): string {
  const salted = `AI1999::SHIELD::${input.trim()}::${LOCKED_MERCHANT.CONTACT}`;
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x9e3779b9 >>> 0;
  for (let i = 0; i < salted.length; i++) {
    const c = salted.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + i * 31;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}:${h2.toString(16).padStart(8, '0')}`;
}

export function verifyOwnerPasswordDigest(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  return hashOwnerSecret(trimmed) === EXPECTED_OWNER_DIGEST;
}

function signStorageFlags(visitorId: string, flagsCsv: string): string {
  const salted = `SEAL::${visitorId}::${flagsCsv}::${LOCKED_MERCHANT.CONTACT}::${EXPECTED_OWNER_DIGEST}`;
  let a = 0x517cc1b7 >>> 0;
  let b = 0x27220a95 >>> 0;
  for (let i = 0; i < salted.length; i++) {
    const c = salted.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + i * 17), 0x85ebca6b) >>> 0;
  }
  return `${a.toString(16).padStart(8, '0')}.${b.toString(16).padStart(8, '0')}`;
}

const PROTECTED_UNLOCK_KEYS = [
  'sunil_owner_unlimited_v1',
  'ai1999_super_vip_unlocked_v1',
  'sunil_builder_pro_unlocked_v1',
  'sunil_music_vip_unlocked_v1',
  'ai1999_video_vip_unlocked_v1',
] as const;

export type ProtectedUnlockKey = (typeof PROTECTED_UNLOCK_KEYS)[number];

function getVisitorSeed(): string {
  try {
    return localStorage.getItem('ai1999_visitor_id_v1') || 'device_seed';
  } catch {
    return 'device_seed';
  }
}

function buildFlagsCsv(): string {
  try {
    return PROTECTED_UNLOCK_KEYS.map((k) =>
      localStorage.getItem(k) === 'true' ? '1' : '0'
    ).join('');
  } catch {
    return '00000';
  }
}

export function refreshUnlockIntegritySeal(): void {
  try {
    const csv = buildFlagsCsv();
    const seal = signStorageFlags(getVisitorSeed(), csv);
    localStorage.setItem(SHIELD_SEAL_STORAGE_KEY, seal);
  } catch {
    // Ignore storage quota errors
  }
}

export function grantVerifiedUnlockStorage(keys: ProtectedUnlockKey[]): void {
  try {
    for (const k of keys) {
      localStorage.setItem(k, 'true');
    }
    refreshUnlockIntegritySeal();
  } catch {
    // Ignore
  }
}

export function revokeUnlockStorageForTesting(keys: ProtectedUnlockKey[]): void {
  try {
    for (const k of keys) {
      localStorage.removeItem(k);
    }
    refreshUnlockIntegritySeal();
  } catch {
    // Ignore
  }
}

export function isVerifiedUnlockFlag(key: ProtectedUnlockKey): boolean {
  try {
    if (localStorage.getItem(key) !== 'true') return false;
    const storedSeal = localStorage.getItem(SHIELD_SEAL_STORAGE_KEY);
    const expectedSeal = signStorageFlags(getVisitorSeed(), buildFlagsCsv());
    if (!storedSeal || storedSeal !== expectedSeal) {
      // Tampering detected in localStorage: clear forged unlock keys immediately
      for (const k of PROTECTED_UNLOCK_KEYS) {
        localStorage.removeItem(k);
      }
      localStorage.removeItem(SHIELD_SEAL_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface OwnerGuardState {
  failedAttempts: number;
  lockedUntil: number;
  isLocked: boolean;
  attemptsLeft: number;
  remainingMs: number;
  remainingLabel: string;
}

interface StoredGuardRecord {
  f: number;
  l: number;
  s: string;
}

function signGuardRecord(failed: number, lockedUntil: number): string {
  return signStorageFlags(getVisitorSeed(), `G:${failed}:${lockedUntil}`);
}

function formatRemainingDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function getOwnerGuardState(): OwnerGuardState {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(OWNER_GUARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredGuardRecord>;
      const f = typeof parsed.f === 'number' && parsed.f >= 0 ? Math.floor(parsed.f) : 0;
      const l = typeof parsed.l === 'number' && parsed.l >= 0 ? parsed.l : 0;
      const expected = signGuardRecord(f, l);
      if (parsed.s !== expected) {
        // Forged guard record -> trigger 24h protective lockout
        const forcedLock = now + LOCKOUT_DURATION_MS;
        saveOwnerGuardRecord(MAX_OWNER_ATTEMPTS, forcedLock);
        return {
          failedAttempts: MAX_OWNER_ATTEMPTS,
          lockedUntil: forcedLock,
          isLocked: true,
          attemptsLeft: 0,
          remainingMs: LOCKOUT_DURATION_MS,
          remainingLabel: formatRemainingDuration(LOCKOUT_DURATION_MS),
        };
      }
      if (l > now) {
        const rem = l - now;
        return {
          failedAttempts: MAX_OWNER_ATTEMPTS,
          lockedUntil: l,
          isLocked: true,
          attemptsLeft: 0,
          remainingMs: rem,
          remainingLabel: formatRemainingDuration(rem),
        };
      }
      // Lock expired cleanly
      if (l > 0 && l <= now) {
        saveOwnerGuardRecord(0, 0);
        return {
          failedAttempts: 0,
          lockedUntil: 0,
          isLocked: false,
          attemptsLeft: MAX_OWNER_ATTEMPTS,
          remainingMs: 0,
          remainingLabel: '',
        };
      }
      return {
        failedAttempts: f,
        lockedUntil: 0,
        isLocked: false,
        attemptsLeft: Math.max(0, MAX_OWNER_ATTEMPTS - f),
        remainingMs: 0,
        remainingLabel: '',
      };
    }
  } catch {
    // Fallback clean state
  }
  return {
    failedAttempts: 0,
    lockedUntil: 0,
    isLocked: false,
    attemptsLeft: MAX_OWNER_ATTEMPTS,
    remainingMs: 0,
    remainingLabel: '',
  };
}

function saveOwnerGuardRecord(failed: number, lockedUntil: number): void {
  try {
    const rec: StoredGuardRecord = {
      f: failed,
      l: lockedUntil,
      s: signGuardRecord(failed, lockedUntil),
    };
    localStorage.setItem(OWNER_GUARD_STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // Ignore quota error
  }
}

export function resetOwnerGuardOnSuccess(): void {
  saveOwnerGuardRecord(0, 0);
}

export function recordOwnerFailedAttempt(serverLockedUntil?: number): OwnerGuardState {
  const current = getOwnerGuardState();
  if (current.isLocked) return current;
  const nextFailed = Math.min(MAX_OWNER_ATTEMPTS, current.failedAttempts + 1);
  const nextLockedUntil =
    serverLockedUntil && serverLockedUntil > Date.now()
      ? serverLockedUntil
      : nextFailed >= MAX_OWNER_ATTEMPTS
        ? Date.now() + LOCKOUT_DURATION_MS
        : 0;
  saveOwnerGuardRecord(nextFailed, nextLockedUntil);
  return getOwnerGuardState();
}

export function enforceOwnerLockoutFromServer(lockedUntil?: number): OwnerGuardState {
  const targetUntil =
    lockedUntil && lockedUntil > Date.now()
      ? lockedUntil
      : Date.now() + LOCKOUT_DURATION_MS;
  saveOwnerGuardRecord(MAX_OWNER_ATTEMPTS, targetUntil);
  return getOwnerGuardState();
}

export function saveOwnerSessionToken(token: string): void {
  try {
    sessionStorage.setItem(OWNER_SESSION_TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem('ai1999_owner_panel_unlocked_v1', 'true');
  } catch {
    // Ignore
  }
}

export function loadOwnerSessionToken(): string {
  try {
    return sessionStorage.getItem(OWNER_SESSION_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function verifyAllProtectedStorage(): void {
  for (const k of PROTECTED_UNLOCK_KEYS) {
    isVerifiedUnlockFlag(k);
  }
}

let shieldInstalled = false;

export function installAntiInspectShield(): void {
  if (shieldInstalled || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  shieldInstalled = true;

  // 1. Disable right-click context menu globally
  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true }
  );

  // 2. Block DevTools & View-Source shortcuts (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Cmd+Opt+I/J/C, Cmd+U)
  document.addEventListener(
    'keydown',
    (e) => {
      const key = (e.key || '').toUpperCase();
      const isF12 = e.key === 'F12' || e.keyCode === 123;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isInspectCombo =
        isCtrlOrCmd &&
        e.shiftKey &&
        (key === 'I' || key === 'J' || key === 'C' || key === 'K');
      const isMacInspectCombo =
        e.metaKey &&
        e.altKey &&
        (key === 'I' || key === 'J' || key === 'C' || key === 'U');
      const isViewSourceOrSave =
        isCtrlOrCmd && !e.shiftKey && (key === 'U' || key === 'S');

      if (isF12 || isInspectCombo || isMacInspectCombo || isViewSourceOrSave) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  // 3. Re-verify storage integrity whenever localStorage is modified externally
  window.addEventListener('storage', () => {
    verifyAllProtectedStorage();
  });

  // Initial storage integrity check on boot
  verifyAllProtectedStorage();
}
