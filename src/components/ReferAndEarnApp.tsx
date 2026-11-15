import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  Copy,
  Gift,
  Layers,
  Loader2,
  Music,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  addBonusCredits,
  APP_STATE_SYNC_EVENT,
  CLAIMED_REF_BY_STORAGE_KEY,
  getOrCreateReferralCode,
  getOrCreateVisitorId,
  incrementReferralShareCount,
  loadBonusCredits,
  loadClaimedReferralCode,
  loadReferralShareCount,
  trackAnalyticsEvent,
} from '../config/merchant';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface ReferAndEarnAppProps {
  onBack: () => void;
  onOpenBuilder?: () => void;
  onOpenMusic?: () => void;
}

export function ReferAndEarnApp({
  onBack,
  onOpenBuilder,
  onOpenMusic,
}: ReferAndEarnAppProps) {
  const [referralCode] = useState<string>(getOrCreateReferralCode);
  const [builderBonus, setBuilderBonus] = useState<number>(() =>
    loadBonusCredits('builder')
  );
  const [musicBonus, setMusicBonus] = useState<number>(() =>
    loadBonusCredits('music')
  );
  const [shareCount, setShareCount] = useState<number>(loadReferralShareCount);
  const [claimedByCode, setClaimedByCode] = useState<string>(
    loadClaimedReferralCode
  );
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
      : `https://ai1999.app/?ref=${encodeURIComponent(referralCode)}`;

  const refreshCredits = () => {
    setBuilderBonus(loadBonusCredits('builder'));
    setMusicBonus(loadBonusCredits('music'));
    setShareCount(loadReferralShareCount());
    setClaimedByCode(loadClaimedReferralCode());
  };

  useEffect(() => {
    window.addEventListener(APP_STATE_SYNC_EVENT, refreshCredits);
    return () => window.removeEventListener(APP_STATE_SYNC_EVENT, refreshCredits);
  }, []);

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
      const next = incrementReferralShareCount();
      setShareCount(next);
      trackAnalyticsEvent('referral_share', {
        label: `Copied referral link (${referralCode})`,
      });
    } catch {
      setClaimStatus({
        type: 'error',
        text: 'Copy your code manually above to share.',
      });
    }
  }

  async function handleNativeOrWhatsAppShare(viaWhatsApp: boolean) {
    const shareMessage = `Try AI1999 by Sunil Singh — 10x Turbo AI Search, AI App Builder & Hindi/English AI Music Studio! Use my Referral Code ${referralCode} for +2 Free Builds & +2 Free AI Songs: ${shareUrl}`;
    const next = incrementReferralShareCount();
    setShareCount(next);
    trackAnalyticsEvent('referral_share', {
      label: viaWhatsApp
        ? `WhatsApp referral shared (${referralCode})`
        : `Referral shared (${referralCode})`,
    });

    // Give a small instant share reward on first share if user has 0 credits
    if (next <= 2) {
      addBonusCredits('builder', 1);
      addBonusCredits('music', 1);
      refreshCredits();
    }

    if (viaWhatsApp) {
      const waHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
      const anchor = document.createElement('a');
      anchor.href = waHref;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'AI1999 by Sunil Singh — Free AI Credits',
          text: shareMessage,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }

    await handleCopyShareLink();
  }

  async function handleClaimCode(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = friendCodeInput.trim().toUpperCase();
    if (!cleaned || isClaiming) return;

    setIsClaiming(true);
    setClaimStatus(null);
    try {
      const res = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: getOrCreateVisitorId(),
          referralCode: cleaned,
          ownCode: referralCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.claimed) {
        throw new Error(data?.error || 'Could not apply referral code.');
      }

      const bCredits = Number(data.bonusBuilderCredits) || 2;
      const mCredits = Number(data.bonusMusicCredits) || 2;
      addBonusCredits('builder', bCredits);
      addBonusCredits('music', mCredits);
      try {
        localStorage.setItem(CLAIMED_REF_BY_STORAGE_KEY, cleaned);
      } catch {
        // Ignore
      }
      setClaimedByCode(cleaned);
      setFriendCodeInput('');
      refreshCredits();
      setClaimStatus({
        type: 'success',
        text: data.message || `Applied ${cleaned}! +${bCredits} Builder & +${mCredits} Music credits added.`,
      });
    } catch (err: unknown) {
      setClaimStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to claim referral code.',
      });
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#07070f] text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-3 sm:px-5 py-2.5 border-b border-white/10 bg-[#0d0d18]/90 backdrop-blur-xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center text-white shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold text-zinc-100 truncate">
              Refer &amp; Earn Free Credits
            </h2>
            <p className="text-[11px] text-emerald-300 truncate">
              Viral Growth Rewards · AI1999
            </p>
          </div>
        </div>
        <SunilGlowingBadge compact />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Hero Reward Card */}
          <div className="rounded-3xl p-[1.5px] royal-metallic-gold-border shadow-xl">
            <div className="rounded-[22px] bg-[#0d0d17] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Invite Friends · Earn Bonus AI Credits</span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-50">
                    Share AI1999 &amp; Unlock Free Uses
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Share your unique link below. Every friend who joins gets{' '}
                    <strong className="text-emerald-300">+2 Free App Builds &amp; +2 Free AI Songs</strong>
                    , and sharing instantly credits your wallet balance of free AI uses.
                  </p>
                </div>
                <SunilGlowingBadge variant="default" />
              </div>

              {/* Active Bonus Credits Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="rounded-2xl border border-blue-500/30 bg-blue-950/25 p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-blue-200/80">Builder Bonus</div>
                    <div className="font-mono text-xl font-extrabold text-zinc-50 tabular-nums">
                      +{builderBonus}
                    </div>
                  </div>
                  <Layers className="w-5 h-5 text-blue-400" />
                </div>

                <div className="rounded-2xl border border-pink-500/30 bg-pink-950/25 p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-pink-200/80">Music Bonus</div>
                    <div className="font-mono text-xl font-extrabold text-zinc-50 tabular-nums">
                      +{musicBonus}
                    </div>
                  </div>
                  <Music className="w-5 h-5 text-pink-400" />
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-emerald-200/80">Total Shares</div>
                    <div className="font-mono text-xl font-extrabold text-zinc-50 tabular-nums">
                      {shareCount}
                    </div>
                  </div>
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {/* Unique Referral Code & Link */}
              <div className="rounded-2xl border border-zinc-800 bg-[#12121d] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400">
                    Your Unique Referral Code
                  </span>
                  <span className="font-mono text-sm sm:text-base font-extrabold tracking-widest text-amber-300 bg-amber-500/15 border border-amber-400/35 px-3 py-1 rounded-lg">
                    {referralCode}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    aria-label="Your unique referral link"
                    className="flex-1 rounded-xl border border-zinc-800 bg-[#090910] px-3 py-2.5 font-mono text-xs text-zinc-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-100 inline-flex items-center justify-center gap-1.5 shrink-0 min-h-[42px]"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Copied Link
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleNativeOrWhatsAppShare(true)}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-xs font-bold text-white flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Share2 className="w-4 h-4" />
                    Share on WhatsApp (+Free Credits)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNativeOrWhatsAppShare(false)}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-xs font-bold text-white flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Share2 className="w-4 h-4" />
                    Invite Friends via Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Claim Friend's Referral Code */}
          <div className="rounded-3xl border border-white/10 bg-[#0d0d17] p-5 space-y-3">
            <h3 className="font-display text-sm sm:text-base font-bold text-zinc-100">
              Have a Friend&apos;s Referral Code?
            </h3>

            {claimStatus && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                  claimStatus.type === 'success'
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                    : 'border-red-500/40 bg-red-950/30 text-red-200'
                }`}
              >
                {claimStatus.text}
              </div>
            )}

            {claimedByCode ? (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-3 text-xs text-emerald-200 flex items-center justify-between gap-2">
                <span>
                  Referral code <strong className="font-mono">{claimedByCode}</strong> already claimed on this device.
                </span>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            ) : (
              <form onSubmit={handleClaimCode} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g. AI99X7K2)"
                  aria-label="Enter friend referral code"
                  className="flex-1 rounded-xl border border-zinc-800 bg-[#090910] px-3.5 py-2.5 font-mono text-xs sm:text-sm uppercase text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!friendCodeInput.trim() || isClaiming}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-zinc-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 min-h-[44px] shrink-0"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Claim +4 Credits
                    </>
                  )}
                </button>
              </form>
            )}

            {(onOpenBuilder || onOpenMusic) && (
              <div className="pt-2 flex flex-wrap gap-2.5">
                {onOpenBuilder && (
                  <button
                    type="button"
                    onClick={onOpenBuilder}
                    className="px-4 py-2 rounded-xl border border-blue-500/35 bg-blue-600/15 hover:bg-blue-600/25 text-xs font-semibold text-blue-200"
                  >
                    Use Credits in AI App Builder →
                  </button>
                )}
                {onOpenMusic && (
                  <button
                    type="button"
                    onClick={onOpenMusic}
                    className="px-4 py-2 rounded-xl border border-pink-500/35 bg-pink-600/15 hover:bg-pink-600/25 text-xs font-semibold text-pink-200"
                  >
                    Use Credits in AI Music Studio →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
