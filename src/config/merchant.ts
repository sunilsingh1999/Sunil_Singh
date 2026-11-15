import {
  LOCKED_LIVE_ADS,
  LOCKED_MERCHANT,
  OWNER_SESSION_TOKEN_STORAGE_KEY,
  type OwnerGuardState,
  enforceOwnerLockoutFromServer,
  getOwnerGuardState,
  grantVerifiedUnlockStorage,
  isVerifiedUnlockFlag,
  loadOwnerSessionToken,
  recordOwnerFailedAttempt,
  resetOwnerGuardOnSuccess,
  revokeUnlockStorageForTesting,
  saveOwnerSessionToken,
  verifyOwnerPasswordDigest,
} from '../utils/securityShield';

export {
  LOCKED_LIVE_ADS,
  LOCKED_MERCHANT,
  OWNER_SESSION_TOKEN_STORAGE_KEY,
  enforceOwnerLockoutFromServer,
  getOwnerGuardState,
  grantVerifiedUnlockStorage,
  isVerifiedUnlockFlag,
  loadOwnerSessionToken,
  recordOwnerFailedAttempt,
  resetOwnerGuardOnSuccess,
  revokeUnlockStorageForTesting,
  saveOwnerSessionToken,
  verifyOwnerPasswordDigest,
};
export type { OwnerGuardState };

export const MERCHANT_NAME = LOCKED_MERCHANT.NAME;
export const MERCHANT_CONTACT = LOCKED_MERCHANT.CONTACT;
export const MERCHANT_UPI_ID = LOCKED_MERCHANT.UPI_ID;
export const MERCHANT_OFFICIAL_LABEL = LOCKED_MERCHANT.OFFICIAL_LABEL;

export const BUILDER_SUB_PRICE_INR = 299;
export const VIDEO_SUB_PRICE_INR = 500;
export const MUSIC_SUB_PRICE_INR = 500;
export const SUPER_VIP_SUB_PRICE_INR = 999;

export const ADSTERRA_BANNER_KEY = LOCKED_LIVE_ADS.ADSTERRA_BANNER_KEY;

export const OWNER_RZP_KEY_STORAGE_KEY = 'sunil_music_rzp_key_v1';
export const OWNER_GEMINI_KEY_STORAGE_KEY = 'ai1999_owner_gemini_key_v1';
export const OWNER_VIDEO_API_KEY_STORAGE_KEY = 'ai1999_owner_video_api_key_v1';
export const OWNER_VIDEO_PROVIDER_STORAGE_KEY = 'ai1999_owner_video_provider_v1';
export const OWNER_UNLIMITED_STORAGE_KEY = 'sunil_owner_unlimited_v1';

export const BUILDER_PRO_UNLOCK_STORAGE_KEY = 'sunil_builder_pro_unlocked_v1';
export const BUILDER_FREE_USED_STORAGE_KEY = 'sunil_builder_free_used_v1';
export const BUILDER_BONUS_CREDITS_STORAGE_KEY = 'ai1999_builder_bonus_credits_v1';
export const BUILDER_FREE_TRIAL_LIMIT = 1;

export const MUSIC_VIP_UNLOCK_STORAGE_KEY = 'sunil_music_vip_unlocked_v1';
export const MUSIC_FREE_USED_STORAGE_KEY = 'sunil_music_free_used_v1';
export const MUSIC_BONUS_CREDITS_STORAGE_KEY = 'ai1999_music_bonus_credits_v1';
export const MUSIC_FREE_TRIAL_LIMIT = 2;

export const VIDEO_VIP_UNLOCK_STORAGE_KEY = 'ai1999_video_vip_unlocked_v1';
export const VIDEO_FREE_USED_STORAGE_KEY = 'ai1999_video_free_used_v1';
export const VIDEO_FREE_TRIAL_LIMIT = 3;

export const SUPER_VIP_UNLOCK_STORAGE_KEY = 'ai1999_super_vip_unlocked_v1';
export const VISITOR_ID_STORAGE_KEY = 'ai1999_visitor_id_v1';
export const REFERRAL_CODE_STORAGE_KEY = 'ai1999_referral_code_v1';
export const CLAIMED_REF_BY_STORAGE_KEY = 'ai1999_claimed_ref_by_v1';
export const REFERRAL_SHARE_COUNT_STORAGE_KEY = 'ai1999_referral_shares_v1';
export const OWNER_SESSION_UNLOCKED_STORAGE_KEY = 'ai1999_owner_panel_unlocked_v1';

export const APP_STATE_SYNC_EVENT = 'ai1999_state_sync';

export function dispatchAppStateSync(): void {
  try {
    window.dispatchEvent(new CustomEvent(APP_STATE_SYNC_EVENT));
  } catch {
    // Ignore non-browser contexts
  }
}

export function buildDirectUpiUrl(options?: {
  amount?: number;
  note?: string;
  schemePrefix?: string;
  txnRef?: string;
}): string {
  const prefix = options?.schemePrefix || 'upi://pay';
  const parts: string[] = [
    `pa=${encodeURIComponent(MERCHANT_UPI_ID)}`,
    'pn=Sunil%20Singh',
  ];

  if (typeof options?.amount === 'number' && Number.isFinite(options.amount) && options.amount > 0) {
    parts.push(`am=${options.amount.toFixed(2)}`);
    parts.push('cu=INR');
  }
  if (options?.note) {
    parts.push(`tn=${encodeURIComponent(options.note)}`);
  }
  if (options?.txnRef) {
    parts.push(`tr=${encodeURIComponent(options.txnRef)}`);
  }

  return `${prefix}?${parts.join('&')}`;
}

export function loadSavedRzpKey(): string {
  try {
    return localStorage.getItem(OWNER_RZP_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveRzpKey(cleaned: string): void {
  try {
    if (cleaned) {
      localStorage.setItem(OWNER_RZP_KEY_STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(OWNER_RZP_KEY_STORAGE_KEY);
    }
    dispatchAppStateSync();
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedGeminiKey(): string {
  try {
    return localStorage.getItem(OWNER_GEMINI_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGeminiKey(cleaned: string): void {
  try {
    if (cleaned) {
      localStorage.setItem(OWNER_GEMINI_KEY_STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(OWNER_GEMINI_KEY_STORAGE_KEY);
    }
    dispatchAppStateSync();
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedVideoApiKey(): string {
  try {
    return localStorage.getItem(OWNER_VIDEO_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveVideoApiKey(cleaned: string): void {
  try {
    if (cleaned) {
      localStorage.setItem(OWNER_VIDEO_API_KEY_STORAGE_KEY, cleaned);
    } else {
      localStorage.removeItem(OWNER_VIDEO_API_KEY_STORAGE_KEY);
    }
    dispatchAppStateSync();
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSavedVideoProvider(): string {
  try {
    return localStorage.getItem(OWNER_VIDEO_PROVIDER_STORAGE_KEY) || 'veo';
  } catch {
    return 'veo';
  }
}

export function saveVideoProvider(provider: string): void {
  try {
    localStorage.setItem(OWNER_VIDEO_PROVIDER_STORAGE_KEY, provider);
    dispatchAppStateSync();
  } catch {
    // Ignore
  }
}

export function loadOwnerUnlimited(): boolean {
  return isVerifiedUnlockFlag(OWNER_UNLIMITED_STORAGE_KEY);
}

export function loadSuperVipUnlocked(): boolean {
  return (
    loadOwnerUnlimited() ||
    isVerifiedUnlockFlag(SUPER_VIP_UNLOCK_STORAGE_KEY)
  );
}

export function loadBuilderProUnlocked(): boolean {
  return (
    loadOwnerUnlimited() ||
    loadSuperVipUnlocked() ||
    isVerifiedUnlockFlag(BUILDER_PRO_UNLOCK_STORAGE_KEY)
  );
}

export function loadMusicVipUnlocked(): boolean {
  return (
    loadOwnerUnlimited() ||
    loadSuperVipUnlocked() ||
    isVerifiedUnlockFlag(MUSIC_VIP_UNLOCK_STORAGE_KEY)
  );
}

export function loadVideoVipUnlocked(): boolean {
  return (
    loadOwnerUnlimited() ||
    loadSuperVipUnlocked() ||
    isVerifiedUnlockFlag(VIDEO_VIP_UNLOCK_STORAGE_KEY)
  );
}

export function grantBuilderProUnlocked(): void {
  grantVerifiedUnlockStorage([BUILDER_PRO_UNLOCK_STORAGE_KEY]);
  dispatchAppStateSync();
}

export function grantMusicVipUnlocked(): void {
  grantVerifiedUnlockStorage([MUSIC_VIP_UNLOCK_STORAGE_KEY]);
  dispatchAppStateSync();
}

export function grantVideoVipUnlocked(): void {
  grantVerifiedUnlockStorage([VIDEO_VIP_UNLOCK_STORAGE_KEY]);
  dispatchAppStateSync();
}

export function activateSuperVipEverywhere(): void {
  grantVerifiedUnlockStorage([
    SUPER_VIP_UNLOCK_STORAGE_KEY,
    BUILDER_PRO_UNLOCK_STORAGE_KEY,
    MUSIC_VIP_UNLOCK_STORAGE_KEY,
    VIDEO_VIP_UNLOCK_STORAGE_KEY,
  ]);
  dispatchAppStateSync();
}

export function activateOwnerUnlimitedEverywhere(): void {
  grantVerifiedUnlockStorage([
    OWNER_UNLIMITED_STORAGE_KEY,
    SUPER_VIP_UNLOCK_STORAGE_KEY,
    BUILDER_PRO_UNLOCK_STORAGE_KEY,
    MUSIC_VIP_UNLOCK_STORAGE_KEY,
    VIDEO_VIP_UNLOCK_STORAGE_KEY,
  ]);
  dispatchAppStateSync();
}

export function loadOwnerSessionUnlocked(): boolean {
  try {
    return (
      loadOwnerUnlimited() ||
      (sessionStorage.getItem(OWNER_SESSION_UNLOCKED_STORAGE_KEY) === 'true' &&
        Boolean(loadOwnerSessionToken()))
    );
  } catch {
    return false;
  }
}

export interface OwnerAuthResult {
  authenticated: boolean;
  guard: OwnerGuardState;
  error?: string;
  ownerToken?: string;
}

export async function attemptOwnerAuth(password: string): Promise<OwnerAuthResult> {
  const preGuard = getOwnerGuardState();
  if (preGuard.isLocked) {
    return {
      authenticated: false,
      guard: preGuard,
      error: 'Security Alert: Unauthorized Access Blocked',
    };
  }

  const trimmed = password.trim();
  if (!trimmed) {
    return {
      authenticated: false,
      guard: preGuard,
      error: 'Please enter your Owner Password.',
    };
  }

  try {
    const res = await fetch('/api/music/owner-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: trimmed,
        visitorId: getOrCreateVisitorId(),
      }),
    });
    const data = await res.json();

    if (res.status === 429 || data?.locked) {
      const nextGuard = enforceOwnerLockoutFromServer(data?.lockedUntil);
      dispatchAppStateSync();
      return {
        authenticated: false,
        guard: nextGuard,
        error: data?.error || 'Security Alert: Unauthorized Access Blocked',
      };
    }

    if (res.ok && data?.unlocked) {
      resetOwnerGuardOnSuccess();
      if (typeof data?.ownerToken === 'string' && data.ownerToken) {
        saveOwnerSessionToken(data.ownerToken);
      } else {
        try {
          sessionStorage.setItem(OWNER_SESSION_UNLOCKED_STORAGE_KEY, 'true');
        } catch {
          // Ignore
        }
      }
      dispatchAppStateSync();
      return {
        authenticated: true,
        guard: getOwnerGuardState(),
        ownerToken: typeof data?.ownerToken === 'string' ? data.ownerToken : undefined,
      };
    }

    const failedGuard = recordOwnerFailedAttempt(data?.lockedUntil);
    dispatchAppStateSync();
    return {
      authenticated: false,
      guard: failedGuard,
      error: failedGuard.isLocked
        ? 'Security Alert: Unauthorized Access Blocked'
        : data?.error ||
          `Incorrect Owner Password. ${failedGuard.attemptsLeft} attempt${
            failedGuard.attemptsLeft === 1 ? '' : 's'
          } remaining.`,
    };
  } catch {
    if (verifyOwnerPasswordDigest(trimmed)) {
      resetOwnerGuardOnSuccess();
      try {
        sessionStorage.setItem(OWNER_SESSION_UNLOCKED_STORAGE_KEY, 'true');
      } catch {
        // Ignore
      }
      dispatchAppStateSync();
      return {
        authenticated: true,
        guard: getOwnerGuardState(),
      };
    }
    const failedGuard = recordOwnerFailedAttempt();
    dispatchAppStateSync();
    return {
      authenticated: false,
      guard: failedGuard,
      error: failedGuard.isLocked
        ? 'Security Alert: Unauthorized Access Blocked'
        : `Incorrect Owner Password. ${failedGuard.attemptsLeft} attempt${
            failedGuard.attemptsLeft === 1 ? '' : 's'
          } remaining.`,
    };
  }
}

export function loadBonusCredits(target: 'builder' | 'music'): number {
  const key =
    target === 'builder'
      ? BUILDER_BONUS_CREDITS_STORAGE_KEY
      : MUSIC_BONUS_CREDITS_STORAGE_KEY;
  try {
    const raw = Number(localStorage.getItem(key));
    if (Number.isFinite(raw) && raw > 0) {
      return Math.floor(raw);
    }
  } catch {
    // Fallback
  }
  return 0;
}

export function addBonusCredits(
  target: 'builder' | 'music',
  amount: number
): number {
  const key =
    target === 'builder'
      ? BUILDER_BONUS_CREDITS_STORAGE_KEY
      : MUSIC_BONUS_CREDITS_STORAGE_KEY;
  const current = loadBonusCredits(target);
  const next = Math.max(0, current + Math.max(0, Math.floor(amount)));
  try {
    localStorage.setItem(key, String(next));
    dispatchAppStateSync();
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function consumeBonusCredit(target: 'builder' | 'music'): boolean {
  const key =
    target === 'builder'
      ? BUILDER_BONUS_CREDITS_STORAGE_KEY
      : MUSIC_BONUS_CREDITS_STORAGE_KEY;
  const current = loadBonusCredits(target);
  if (current <= 0) return false;
  try {
    localStorage.setItem(key, String(current - 1));
    dispatchAppStateSync();
  } catch {
    // Ignore storage quota errors
  }
  return true;
}

export function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existing && existing.length >= 6) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `u_${crypto.randomUUID().slice(0, 12)}`
        : `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(VISITOR_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `u_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getOrCreateReferralCode(): string {
  try {
    const existing = localStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
    if (existing && existing.length >= 6) return existing;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `AI99${suffix}`;
    localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, code);
    return code;
  } catch {
    return 'AI99STAR';
  }
}

export function loadClaimedReferralCode(): string {
  try {
    return localStorage.getItem(CLAIMED_REF_BY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function loadReferralShareCount(): number {
  try {
    const n = Number(localStorage.getItem(REFERRAL_SHARE_COUNT_STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function incrementReferralShareCount(): number {
  const next = loadReferralShareCount() + 1;
  try {
    localStorage.setItem(REFERRAL_SHARE_COUNT_STORAGE_KEY, String(next));
    dispatchAppStateSync();
  } catch {
    // Ignore
  }
  return next;
}

export type AnalyticsEventType =
  | 'visit'
  | 'turbo_search'
  | 'builder_generate'
  | 'music_create'
  | 'video_create'
  | 'ad_watch'
  | 'referral_share'
  | 'referral_claim'
  | 'subscription_unlock'
  | 'wallet_deposit';

export function trackAnalyticsEvent(
  type: AnalyticsEventType,
  options?: {
    label?: string;
    amountInr?: number;
    plan?: string;
  }
): void {
  try {
    const visitorId = getOrCreateVisitorId();
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        type,
        label: options?.label,
        amountInr: options?.amountInr,
        plan: options?.plan,
      }),
    }).catch(() => {
      // Non-blocking analytics ping
    });
  } catch {
    // Ignore non-browser environments
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
