import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Crown,
  Gift,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Megaphone,
  Settings,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import {
  activateOwnerUnlimitedEverywhere,
  activateSuperVipEverywhere,
  APP_STATE_SYNC_EVENT,
  attemptOwnerAuth,
  BUILDER_SUB_PRICE_INR,
  getOrCreateVisitorId,
  getOwnerGuardState,
  loadRazorpayScript,
  loadSavedGeminiKey,
  loadSavedRzpKey,
  MERCHANT_CONTACT,
  MERCHANT_OFFICIAL_LABEL,
  type OwnerGuardState,
  saveGeminiKey,
  saveRzpKey,
  SUPER_VIP_SUB_PRICE_INR,
} from '../config/merchant';
import { DirectUpiFallbackBox } from './DirectUpiFallbackBox';
import { SecurityAlertBadge } from './SecurityAlertBadge';
import { SunilGlowingBadge } from './SunilGlowingBadge';
import {
  GooglePayIcon,
  PaytmIcon,
  PhonePeIcon,
  RazorpayIcon,
} from './UpiIcons';

interface BuilderSubscriptionModalProps {
  isOpen: boolean;
  isProUnlocked: boolean;
  freeBuildsLeft: number;
  freeBuildLimit: number;
  bonusBuildsLeft?: number;
  onClose: () => void;
  onUnlocked: (message: string, isOwnerPass?: boolean, isSuperVip?: boolean) => void;
  onWatchAdForFreeUse?: () => void;
  onOpenReferEarn?: () => void;
  onOpenOwnerAnalytics?: () => void;
  onResetTrial?: () => void;
  onForcePaywall?: () => void;
}

type CheckoutUpiChoice = 'gpay' | 'phonepe' | 'paytm' | 'upi';
type SelectedBuilderPlan = 'builder_299' | 'super_vip_999';

export function BuilderSubscriptionModal({
  isOpen,
  isProUnlocked,
  freeBuildsLeft,
  freeBuildLimit,
  bonusBuildsLeft = 0,
  onClose,
  onUnlocked,
  onWatchAdForFreeUse,
  onOpenReferEarn,
  onOpenOwnerAnalytics,
  onResetTrial,
  onForcePaywall,
}: BuilderSubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] =
    useState<SelectedBuilderPlan>('builder_299');
  const [ownerKeyId, setOwnerKeyId] = useState<string>(loadSavedRzpKey);
  const [showOwnerSettings, setShowOwnerSettings] = useState(false);
  const [keyDraft, setKeyDraft] = useState<string>(ownerKeyId);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState<string>(loadSavedGeminiKey);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerStatus, setOwnerStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [guard, setGuard] = useState<OwnerGuardState>(getOwnerGuardState);

  useEffect(() => {
    const syncGuard = () => setGuard(getOwnerGuardState());
    window.addEventListener(APP_STATE_SYNC_EVENT, syncGuard);
    const interval = window.setInterval(syncGuard, 15000);
    return () => {
      window.removeEventListener(APP_STATE_SYNC_EVENT, syncGuard);
      window.clearInterval(interval);
    };
  }, []);

  const [isPaying, setIsPaying] = useState(false);
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [upiPopup, setUpiPopup] = useState<{
    orderId: string;
    selectedApp: CheckoutUpiChoice;
    contactNumber: string;
    upiId: string;
    plan: SelectedBuilderPlan;
    priceInr: number;
  } | null>(null);

  if (!isOpen) return null;

  const isSuperVipPlan = selectedPlan === 'super_vip_999';
  const activePriceInr = isSuperVipPlan
    ? SUPER_VIP_SUB_PRICE_INR
    : BUILDER_SUB_PRICE_INR;
  const orderEndpoint = isSuperVipPlan
    ? '/api/vip/razorpay-order'
    : '/api/builder/razorpay-order';
  const verifyEndpoint = isSuperVipPlan
    ? '/api/vip/verify-unlock'
    : '/api/builder/verify-unlock';
  const totalFreeAvailable = freeBuildsLeft + bonusBuildsLeft;

  function finishUnlock(
    message: string,
    isOwnerPass = false,
    isSuperVip = false
  ) {
    if (isSuperVip) {
      activateSuperVipEverywhere();
    }
    setUpiPopup(null);
    setPayError(null);
    setShowOwnerSettings(false);
    onUnlocked(message, isOwnerPass, isSuperVip);
  }

  async function handlePayAndUnlockInstantly() {
    setPayError(null);
    setIsPaying(true);
    const chosenPlan = selectedPlan;
    const chosenPrice = activePriceInr;
    const chosenVerifyEndpoint = verifyEndpoint;

    try {
      const orderRes = await fetch(orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customKeyId: ownerKeyId.trim() || undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData?.error || 'Could not start Razorpay checkout.');
      }

      if (
        (orderData.mode === 'live' || orderData.mode === 'client_key') &&
        orderData.keyId
      ) {
        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded) {
          throw new Error('Could not load Razorpay Checkout SDK.');
        }

        const RazorpayCtor = (
          window as unknown as {
            Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
          }
        ).Razorpay;

        const rzpOptions: Record<string, unknown> = {
          key: orderData.keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency || 'INR',
          name: MERCHANT_OFFICIAL_LABEL,
          description:
            chosenPlan === 'super_vip_999'
              ? `AI1999 All-Access Super VIP Pass (₹${chosenPrice}/Month)`
              : `AI App Builder Pro (₹${chosenPrice}/Month)`,
          prefill: {
            contact: MERCHANT_CONTACT,
            method: 'upi',
          },
          notes: {
            merchant: MERCHANT_OFFICIAL_LABEL,
            merchant_contact: MERCHANT_CONTACT,
            plan: `₹${chosenPrice}/Month`,
          },
          config: {
            display: {
              blocks: {
                upi: {
                  name: `Pay to ${MERCHANT_OFFICIAL_LABEL}`,
                  instruments: [{ method: 'upi' }],
                },
              },
              sequence: ['block.upi'],
              preferences: { show_default_blocks: true },
            },
          },
          theme: { color: chosenPlan === 'super_vip_999' ? '#f59e0b' : '#2563eb' },
          modal: {
            ondismiss: () => setIsPaying(false),
          },
          handler: async (response: {
            razorpay_order_id?: string;
            razorpay_payment_id: string;
            razorpay_signature?: string;
          }) => {
            try {
              const verifyRes = await fetch(chosenVerifyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  visitorId: getOrCreateVisitorId(),
                  mode: orderData.mode,
                  orderId: response.razorpay_order_id || orderData.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.unlocked) {
                throw new Error(verifyData?.error || 'Payment verification failed.');
              }
              finishUnlock(
                chosenPlan === 'super_vip_999'
                  ? `₹${chosenPrice}/Month All-Access Super VIP Pass unlocked (${verifyData.paymentId})!`
                  : `₹${chosenPrice}/Month Pro Subscription activated (${verifyData.paymentId})!`,
                false,
                chosenPlan === 'super_vip_999'
              );
            } catch (err: unknown) {
              setPayError(
                err instanceof Error ? err.message : 'Verification failed.'
              );
            } finally {
              setIsPaying(false);
            }
          },
        };

        if (orderData.mode === 'live') {
          rzpOptions.order_id = orderData.orderId;
        }

        const rzp = new RazorpayCtor(rzpOptions);
        rzp.open();
        return;
      }

      // Built-in Razorpay UPI Checkout popup with Official Merchant & pre-filled 9541441025
      setUpiPopup({
        orderId: orderData.orderId,
        selectedApp: 'gpay',
        contactNumber: MERCHANT_CONTACT,
        upiId: '',
        plan: chosenPlan,
        priceInr: chosenPrice,
      });
      setIsPaying(false);
    } catch (err: unknown) {
      setPayError(
        err instanceof Error ? err.message : 'Unable to start Razorpay checkout.'
      );
      setIsPaying(false);
    }
  }

  async function handleConfirmUpiPopup(e: React.FormEvent) {
    e.preventDefault();
    if (!upiPopup) return;
    setPayError(null);
    setIsPaying(true);

    const popupEndpoint =
      upiPopup.plan === 'super_vip_999'
        ? '/api/vip/verify-unlock'
        : '/api/builder/verify-unlock';

    try {
      const verifyRes = await fetch(popupEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: getOrCreateVisitorId(),
          mode: 'checkout',
          orderId: upiPopup.orderId,
          paymentId: `pay_${upiPopup.selectedApp}_${Date.now().toString().slice(-6)}`,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.unlocked) {
        throw new Error(verifyData?.error || 'Payment verification failed.');
      }
      finishUnlock(
        upiPopup.plan === 'super_vip_999'
          ? `₹${upiPopup.priceInr}/Month All-Access Super VIP Pass unlocked via UPI to ${MERCHANT_CONTACT}!`
          : `₹${upiPopup.priceInr}/Month Pro Plan unlocked via UPI to ${MERCHANT_CONTACT}!`,
        false,
        upiPopup.plan === 'super_vip_999'
      );
    } catch (err: unknown) {
      setPayError(
        err instanceof Error ? err.message : 'Payment confirmation failed.'
      );
    } finally {
      setIsPaying(false);
    }
  }

  async function handleVerifyDirectUtr(utr: string) {
    setPayError(null);
    setIsVerifyingUtr(true);
    try {
      const verifyRes = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: getOrCreateVisitorId(),
          mode: 'direct_upi',
          paymentId: `utr_${utr}`,
        }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok || !data.unlocked) {
        throw new Error(data?.error || 'UTR verification failed.');
      }
      finishUnlock(
        isSuperVipPlan
          ? `Direct UPI UTR ${utr} verified — Super VIP ₹${activePriceInr}/Month unlocked for Builder & Music!`
          : `Direct UPI UTR ${utr} verified — AI App Builder ₹${activePriceInr}/Month Pro unlocked!`,
        false,
        isSuperVipPlan
      );
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'UTR verification failed.');
    } finally {
      setIsVerifyingUtr(false);
    }
  }

  function handleSaveOwnerKey() {
    const cleaned = keyDraft.trim();
    if (cleaned && !/^rzp_(live|test)_[A-Za-z0-9]+$/.test(cleaned)) {
      setOwnerStatus({
        type: 'error',
        text: 'Enter a valid Razorpay Key ID starting with rzp_live_ or rzp_test_.',
      });
      return;
    }
    saveRzpKey(cleaned);
    setOwnerKeyId(cleaned);
    setOwnerStatus({
      type: 'success',
      text: cleaned
        ? 'Razorpay Live Key ID saved across all payment screens!'
        : 'Razorpay Key ID cleared.',
    });
  }

  function handleSaveGeminiKey() {
    const cleaned = geminiKeyDraft.trim();
    if (cleaned && !/^AIza[A-Za-z0-9_-]{16,}$/.test(cleaned)) {
      setOwnerStatus({
        type: 'error',
        text: 'Enter a valid Gemini API Key starting with AIzaSy... or leave empty.',
      });
      return;
    }
    saveGeminiKey(cleaned);
    setOwnerStatus({
      type: 'success',
      text: cleaned
        ? 'Gemini API Key saved! Built-in Zero-Error Instant Engine also stays active as backup.'
        : 'Gemini API Key cleared. Built-in Instant App Generator remains active.',
    });
  }

  async function handleOwnerFreeUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (guard.isLocked || isCheckingOwner) return;
    setOwnerStatus(null);
    setIsCheckingOwner(true);
    const result = await attemptOwnerAuth(ownerPassword);
    setGuard(result.guard);
    setIsCheckingOwner(false);
    setOwnerPassword('');

    if (result.authenticated) {
      activateOwnerUnlimitedEverywhere();
      finishUnlock(
        'Welcome Sunil Singh! Permanent Unlimited Free Access unlocked everywhere.',
        true,
        true
      );
      return;
    }

    if (!result.guard.isLocked) {
      setOwnerStatus({
        type: 'error',
        text: result.error || 'Incorrect owner password.',
      });
    }
  }

  return (
    <div
      className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="AI App Builder Pro & Super VIP Subscription"
    >
      <div className="w-full max-w-lg rounded-3xl p-[1.5px] chargpt-rainbow-border shadow-2xl my-auto">
        <div className="rounded-[22px] bg-[#0e0e13] p-5 sm:p-6 space-y-4 max-h-full overflow-y-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2">
            <SunilGlowingBadge />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setKeyDraft(loadSavedRzpKey());
                  setGeminiKeyDraft(loadSavedGeminiKey());
                  setOwnerStatus(null);
                  setShowOwnerSettings((prev) => !prev);
                }}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                title="Owner Settings (Sunil Singh)"
                aria-label="Owner Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                aria-label="Close subscription modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showOwnerSettings ? (
            /* Owner Settings Panel inside Builder Subscription */
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121218] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <h3 className="font-display text-sm font-semibold text-zinc-100">
                    Owner Settings · Sunil Singh
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOwnerSettings(false)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Back to Checkout
                </button>
              </div>

              {onOpenOwnerAnalytics && (
                <button
                  type="button"
                  onClick={() => {
                    setShowOwnerSettings(false);
                    onClose();
                    onOpenOwnerAnalytics();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-400/40 hover:border-amber-300 text-xs font-bold text-amber-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-amber-300" />
                  Open Owner Analytics &amp; Growth Suite
                </button>
              )}

              <SecurityAlertBadge guard={guard} />

              {ownerStatus && !guard.isLocked && (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs ${
                    ownerStatus.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                      : 'border-red-500/40 bg-red-950/30 text-red-200'
                  }`}
                >
                  {ownerStatus.text}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="builder-rzp-key"
                  className="block text-xs font-medium text-zinc-200"
                >
                  Razorpay Live Key ID (routes to {MERCHANT_CONTACT})
                </label>
                <div className="flex gap-2">
                  <input
                    id="builder-rzp-key"
                    type="text"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder="rzp_live_XXXXXXXXXXXXXX"
                    className="flex-1 rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveOwnerKey}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shrink-0"
                  >
                    Save Key
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <label
                  htmlFor="builder-gemini-key"
                  className="block text-xs font-medium text-zinc-200"
                >
                  Gemini API Key (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="builder-gemini-key"
                    type="password"
                    value={geminiKeyDraft}
                    onChange={(e) => setGeminiKeyDraft(e.target.value)}
                    placeholder="AIzaSy... (optional)"
                    className="flex-1 rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGeminiKey}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shrink-0"
                  >
                    Save Gemini Key
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleOwnerFreeUnlock}
                className="pt-3 border-t border-zinc-800/80 space-y-2"
              >
                <label
                  htmlFor="builder-owner-pass"
                  className="block text-xs font-medium text-zinc-200 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Owner Permanent Unlimited Free Password
                </label>
                <div className="flex gap-2">
                  <input
                    id="builder-owner-pass"
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder={guard.isLocked ? 'Locked for 24 hours' : 'Enter owner password'}
                    disabled={guard.isLocked || isCheckingOwner}
                    className="flex-1 rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={guard.isLocked || isCheckingOwner || !ownerPassword.trim()}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-bold shrink-0"
                  >
                    {guard.isLocked ? 'Locked' : isCheckingOwner ? 'Checking...' : 'Unlock Free'}
                  </button>
                </div>
              </form>

              {(onResetTrial || onForcePaywall) && (
                <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2">
                  {onResetTrial && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetTrial();
                        setShowOwnerSettings(false);
                      }}
                      className="py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200"
                    >
                      Reset Free Builds
                    </button>
                  )}
                  {onForcePaywall && (
                    <button
                      type="button"
                      onClick={() => {
                        onForcePaywall();
                        setShowOwnerSettings(false);
                      }}
                      className="py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200"
                    >
                      Test ₹299/Mo Paywall
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Hero Header */}
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-amber-500/20 border border-blue-400/40 flex items-center justify-center">
                  {isProUnlocked ? (
                    <Unlock className="w-5 h-5 text-emerald-400" />
                  ) : totalFreeAvailable <= 0 ? (
                    <Lock className="w-5 h-5 text-amber-300" />
                  ) : (
                    <Layers className="w-5 h-5 text-blue-400" />
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/35 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{MERCHANT_OFFICIAL_LABEL}</span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-100">
                  {isProUnlocked
                    ? 'AI App Builder Pro Active'
                    : totalFreeAvailable <= 0
                      ? `Free Trial Used (${freeBuildLimit}/${freeBuildLimit} Builds)`
                      : 'Upgrade AI1999 Membership'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {isProUnlocked
                    ? 'Unlimited AI app generation, full code editing & HTML/ZIP exports enabled.'
                    : 'Choose Builder Pro (₹299/Mo) or All-Access Super VIP Pass (₹999/Mo), or watch a quick sponsor ad.'}
                </p>
              </div>

              {/* Plan Switcher: ₹299/Mo Builder Pro vs ₹999/Mo Super VIP Pass */}
              {!isProUnlocked && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('builder_299')}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      selectedPlan === 'builder_299'
                        ? 'border-blue-400 bg-blue-600/15 shadow-[0_0_20px_rgba(37,99,235,0.22)]'
                        : 'border-zinc-800 bg-[#13131a] hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-blue-300">
                      AI App Builder Pro
                    </div>
                    <div className="font-mono text-lg font-extrabold text-zinc-50 tabular-nums">
                      ₹{BUILDER_SUB_PRICE_INR}
                      <span className="text-[10px] font-normal text-zinc-400">
                        /Mo
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Unlimited App Builds
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('super_vip_999')}
                    className={`rounded-2xl border p-3 text-left transition-all relative ${
                      selectedPlan === 'super_vip_999'
                        ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_24px_rgba(251,191,36,0.24)]'
                        : 'border-zinc-800 bg-[#13131a] hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Super VIP Pass
                      </span>
                    </div>
                    <div className="font-mono text-lg font-extrabold text-zinc-50 tabular-nums">
                      ₹{SUPER_VIP_SUB_PRICE_INR}
                      <span className="text-[10px] font-normal text-zinc-400">
                        /Mo
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-200/90 mt-0.5 font-medium">
                      Builder + Music Studio
                    </div>
                  </button>
                </div>
              )}

              {/* Plan Summary */}
              <div className="rounded-2xl border border-zinc-800 bg-[#13131a] p-4 space-y-2.5">
                <div className="flex items-baseline justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-xs font-medium text-zinc-400">
                    {isSuperVipPlan
                      ? 'All-Access Super VIP Pass (Best Value)'
                      : 'AI App Builder Monthly Plan'}
                  </span>
                  <span className="font-mono text-2xl font-bold text-zinc-100 tabular-nums">
                    ₹{activePriceInr}
                    <span className="text-xs font-normal text-zinc-400 ml-1">
                      /Month
                    </span>
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited AI Website &amp; Full-Stack App Builds</span>
                  </li>
                  {isSuperVipPlan ? (
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="text-amber-200 font-semibold">
                        ALSO Unlocks Unlimited AI Music Studio VIP (₹500 Value Included!)
                      </span>
                    </li>
                  ) : (
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>One-Click HTML &amp; Multi-File ZIP Code Export</span>
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instant Auto-Unlock routed to {MERCHANT_CONTACT}</span>
                  </li>
                </ul>
              </div>

              {payError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
                  {payError}
                </div>
              )}

              {!isProUnlocked && (
                <div className="space-y-3">
                  {/* Primary Razorpay Auto-Unlock Button */}
                  <button
                    type="button"
                    onClick={handlePayAndUnlockInstantly}
                    disabled={isPaying}
                    className={`w-full py-3.5 px-5 rounded-2xl hover:brightness-110 disabled:opacity-50 font-display text-sm sm:text-base font-bold shadow-lg flex items-center justify-center gap-2 transition-all min-h-[50px] ${
                      isSuperVipPlan
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-zinc-950 shadow-amber-500/25'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-blue-600/25'
                    }`}
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening Razorpay UPI Checkout...
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        Pay ₹{activePriceInr}/Month &amp; Unlock Instantly
                      </>
                    )}
                  </button>

                  {/* Free Monetization Alternatives: Watch Sponsor Ad + Refer & Earn */}
                  {(onWatchAdForFreeUse || onOpenReferEarn) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {onWatchAdForFreeUse && (
                        <button
                          type="button"
                          onClick={onWatchAdForFreeUse}
                          className="py-2.5 px-3 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 transition-colors min-h-[42px]"
                        >
                          <Megaphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span>Watch Sponsor Ad (+1 Free Use)</span>
                        </button>
                      )}
                      {onOpenReferEarn && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenReferEarn();
                          }}
                          className="py-2.5 px-3 rounded-xl border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5 transition-colors min-h-[42px]"
                        >
                          <Gift className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span>Refer &amp; Earn Free Credits</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400">
                    <GooglePayIcon className="w-5 h-5" />
                    <PhonePeIcon className="w-5 h-5" />
                    <PaytmIcon className="w-5 h-5" />
                    <RazorpayIcon className="w-5 h-5" />
                    <span>Pre-filled contact: {MERCHANT_CONTACT}</span>
                  </div>

                  {/* Direct UPI Fallback Option right below Razorpay */}
                  <DirectUpiFallbackBox
                    compact
                    amountInr={activePriceInr}
                    note={
                      isSuperVipPlan
                        ? `AI1999 Super VIP ${activePriceInr} Monthly`
                        : `AI App Builder ${activePriceInr} Monthly`
                    }
                    onVerifyUtr={handleVerifyDirectUtr}
                    verifyingUtr={isVerifyingUtr}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Razorpay Checkout Popup (when no Live Key ID is pasted) */}
      {upiPopup && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-[60] flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Razorpay AI App Builder Checkout"
        >
          <form
            onSubmit={handleConfirmUpiPopup}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#111118] shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <RazorpayIcon className="w-6 h-6 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {MERCHANT_OFFICIAL_LABEL}
                  </div>
                  <div className="text-[11px] text-blue-100 font-mono">
                    {upiPopup.orderId}
                  </div>
                </div>
              </div>
              <div className="font-mono text-base font-bold shrink-0">
                ₹{upiPopup.priceInr}
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-center">
                <SunilGlowingBadge compact />
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-3 py-2 text-[11px] text-emerald-200 flex items-center justify-between">
                <span>Merchant Contact (Pre-filled)</span>
                <span className="font-mono font-bold">{upiPopup.contactNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'gpay',
                      label: 'Google Pay',
                      icon: <GooglePayIcon className="w-5 h-5" />,
                    },
                    {
                      id: 'phonepe',
                      label: 'PhonePe',
                      icon: <PhonePeIcon className="w-5 h-5" />,
                    },
                    {
                      id: 'paytm',
                      label: 'Paytm',
                      icon: <PaytmIcon className="w-5 h-5" />,
                    },
                    {
                      id: 'upi',
                      label: 'Any UPI ID',
                      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
                    },
                  ] as const
                ).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() =>
                      setUpiPopup((prev) =>
                        prev ? { ...prev, selectedApp: app.id } : null
                      )
                    }
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-colors ${
                      upiPopup.selectedApp === app.id
                        ? 'border-blue-500 bg-blue-600/15 text-zinc-100'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="builder-popup-upi"
                  className="block text-[11px] text-zinc-400"
                >
                  Optional UPI ID (pre-filled merchant: {MERCHANT_CONTACT}@ybl)
                </label>
                <input
                  id="builder-popup-upi"
                  type="text"
                  value={upiPopup.upiId}
                  onChange={(e) =>
                    setUpiPopup((prev) =>
                      prev ? { ...prev, upiId: e.target.value } : null
                    )
                  }
                  placeholder="yourname@okaxis"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0b0b10] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUpiPopup(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    `Pay ₹${upiPopup.priceInr}/Mo & Unlock`
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
