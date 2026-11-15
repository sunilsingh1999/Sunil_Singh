import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import type {
  DepositRail,
  SavedPayoutHandle,
  UpiAppId,
  WalletTransaction,
  WithdrawMethod,
} from '../types/wallet';
import {
  buildDirectUpiUrl,
  loadRazorpayScript,
  loadSavedRzpKey,
  MERCHANT_CONTACT,
  MERCHANT_NAME,
  MERCHANT_OFFICIAL_LABEL,
  MERCHANT_UPI_ID,
} from '../config/merchant';
import { DirectUpiFallbackBox } from './DirectUpiFallbackBox';
import { SunilGlowingBadge } from './SunilGlowingBadge';
import {
  BankUpiIcon,
  BhimUpiIcon,
  GooglePayIcon,
  PaytmIcon,
  PhonePeIcon,
  RazorpayIcon,
} from './UpiIcons';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  transactions: WalletTransaction[];
  savedHandles: SavedPayoutHandle[];
  onTransactionSuccess: (tx: WalletTransaction, savedHandle?: SavedPayoutHandle) => void;
  embedded?: boolean;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500];

const UPI_APPS: { id: UpiAppId; label: string; schemePrefix: string }[] = [
  { id: 'gpay', label: 'Google Pay', schemePrefix: 'tez://upi/pay' },
  { id: 'paytm', label: 'Paytm', schemePrefix: 'paytmmp://pay' },
  { id: 'phonepe', label: 'PhonePe', schemePrefix: 'phonepe://pay' },
  { id: 'bhim', label: 'BHIM UPI', schemePrefix: 'upi://pay' },
  { id: 'qr', label: 'QR Code', schemePrefix: 'upi://pay' },
];

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function renderAppIcon(appId?: UpiAppId, className = 'w-5 h-5') {
  switch (appId) {
    case 'gpay':
      return <GooglePayIcon className={className} />;
    case 'paytm':
      return <PaytmIcon className={className} />;
    case 'phonepe':
      return <PhonePeIcon className={className} />;
    case 'bhim':
      return <BhimUpiIcon className={className} />;
    case 'qr':
      return <QrCode className={`${className} text-blue-400`} />;
    default:
      return <Wallet className={`${className} text-zinc-400`} />;
  }
}

export function WalletModal({
  isOpen,
  onClose,
  balance,
  transactions,
  savedHandles,
  onTransactionSuccess,
  embedded = false,
}: WalletModalProps) {
  const [activeTab, setActiveTab] = useState<'add' | 'withdraw' | 'history'>('add');

  // Add Money State
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [selectedUpiApp, setSelectedUpiApp] = useState<UpiAppId>('gpay');
  const [depositRail, setDepositRail] = useState<DepositRail>('razorpay');
  const [utrInput, setUtrInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Interactive Razorpay Checkout Sheet state (when merchant keys are not configured)
  const [rzpSheet, setRzpSheet] = useState<{
    orderId: string;
    amount: number;
    upiApp: UpiAppId;
    payerUpi: string;
  } | null>(null);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('100');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('gpay');
  const [withdrawDestination, setWithdrawDestination] = useState<string>('');

  // Shared Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const parsedDepositAmount = useMemo(() => {
    const num = Number(depositAmount);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [depositAmount]);

  const upiTxnRef = useMemo(() => {
    return `SS${Date.now().toString().slice(-8)}`;
  }, [parsedDepositAmount, selectedUpiApp]);

  const upiDeepLink = useMemo(() => {
    const amt = parsedDepositAmount >= 10 ? parsedDepositAmount : 10;
    return buildDirectUpiUrl({
      amount: amt,
      note: 'Wallet Topup',
      txnRef: upiTxnRef,
    });
  }, [parsedDepositAmount, upiTxnRef]);

  const selectedAppDeepLink = useMemo(() => {
    const app = UPI_APPS.find((a) => a.id === selectedUpiApp);
    if (!app || app.id === 'qr' || app.id === 'bhim') return upiDeepLink;
    return upiDeepLink.replace('upi://pay', app.schemePrefix);
  }, [selectedUpiApp, upiDeepLink]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    QRCode.toDataURL(upiDeepLink, {
      width: 220,
      margin: 2,
      color: { dark: '#09090b', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [isOpen, upiDeepLink]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    setErrorMsg(null);
    setSuccessNotice(null);
  }, [activeTab, depositRail]);

  if (!isOpen) return null;

  function handleSelectUpiApp(appId: UpiAppId) {
    setSelectedUpiApp(appId);
    setErrorMsg(null);
    if (appId === 'qr') {
      setDepositRail('direct_upi');
    }
  }

  async function handleCopyUpiId() {
    try {
      await navigator.clipboard.writeText(MERCHANT_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 1600);
    } catch {
      // Ignore clipboard permission failure
    }
  }

  async function handleStartRazorpayCheckout() {
    setErrorMsg(null);
    setSuccessNotice(null);

    if (parsedDepositAmount < 10 || parsedDepositAmount > 100000) {
      setErrorMsg('Please enter an amount between ₹10 and ₹1,00,000.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedKey = loadSavedRzpKey();
      const res = await fetch('/api/wallet/razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedDepositAmount,
          upiApp: selectedUpiApp === 'qr' ? 'bhim' : selectedUpiApp,
          customKeyId: savedKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not initialize Razorpay checkout.');
      }

      if ((data.mode === 'live' || data.mode === 'client_key') && data.keyId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error('Failed to load Razorpay Checkout SDK.');
        }

        const RazorpayCtor = (
          window as unknown as {
            Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
          }
        ).Razorpay;

        const rzpOpts: Record<string, unknown> = {
          key: data.keyId,
          amount: data.amountPaise,
          currency: data.currency || 'INR',
          name: MERCHANT_OFFICIAL_LABEL,
          description: `Wallet Add Money via UPI (${MERCHANT_NAME})`,
          prefill: {
            contact: MERCHANT_CONTACT,
            method: 'upi',
          },
          notes: {
            merchant: MERCHANT_OFFICIAL_LABEL,
            merchant_contact: MERCHANT_CONTACT,
          },
          theme: { color: '#2563eb' },
          handler: async (response: {
            razorpay_order_id?: string;
            razorpay_payment_id: string;
            razorpay_signature?: string;
          }) => {
            try {
              const verifyRes = await fetch('/api/wallet/verify-razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mode: data.mode,
                  orderId: response.razorpay_order_id || data.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  amount: parsedDepositAmount,
                  upiApp: selectedUpiApp,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData?.error || 'Verification failed.');
              }
              onTransactionSuccess(verifyData.transaction);
              setSuccessNotice(
                `${formatInr(parsedDepositAmount)} paid via Razorpay UPI (Ref ${verifyData.transaction.utr}).`
              );
            } catch (err: unknown) {
              setErrorMsg(
                err instanceof Error ? err.message : 'Payment verification failed.'
              );
            } finally {
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => setIsSubmitting(false),
          },
        };

        if (data.mode === 'live') {
          rzpOpts.order_id = data.orderId;
        }

        const rzp = new RazorpayCtor(rzpOpts);
        rzp.open();
        return;
      }

      // Open interactive Razorpay UPI Checkout sheet
      setRzpSheet({
        orderId: data.orderId,
        amount: parsedDepositAmount,
        upiApp: selectedUpiApp === 'qr' ? 'gpay' : selectedUpiApp,
        payerUpi: '',
      });
      setIsSubmitting(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed.');
      setIsSubmitting(false);
    }
  }

  async function handleConfirmRazorpaySheet() {
    if (!rzpSheet) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const verifyRes = await fetch('/api/wallet/verify-razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'checkout',
          orderId: rzpSheet.orderId,
          amount: rzpSheet.amount,
          upiApp: rzpSheet.upiApp,
        }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(data?.error || 'Razorpay UPI verification failed.');
      }

      onTransactionSuccess(data.transaction);
      setRzpSheet(null);
      setSuccessNotice(
        `${formatInr(data.transaction.amount)} paid via Razorpay UPI (Ref ${data.transaction.utr}).`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyUtrSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (parsedDepositAmount < 10 || parsedDepositAmount > 100000) {
      setErrorMsg('Please enter an amount between ₹10 and ₹1,00,000.');
      return;
    }

    const cleanedUtr = utrInput.trim();
    if (!/^\d{12}$/.test(cleanedUtr)) {
      setErrorMsg('Enter the exact 12-digit numeric UTR / UPI Reference Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/verify-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedDepositAmount,
          utr: cleanedUtr,
          upiApp: selectedUpiApp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'UTR verification failed.');
      }

      onTransactionSuccess(data.transaction);
      setUtrInput('');
      setSuccessNotice(
        `UTR ${cleanedUtr} verified. ${formatInr(data.transaction.amount)} added to your wallet.`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not verify UTR.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount < 10) {
      setErrorMsg('Minimum withdrawal amount is ₹10.');
      return;
    }
    if (amount > balance) {
      setErrorMsg('Withdrawal amount exceeds your available wallet balance.');
      return;
    }

    const trimmedDest = withdrawDestination.trim();
    if (!trimmedDest) {
      setErrorMsg('Please enter your UPI ID or linked mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method: withdrawMethod,
          destination: trimmedDest,
          currentBalance: balance,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Withdrawal failed.');
      }

      onTransactionSuccess(data.transaction, {
        method: withdrawMethod,
        handle: trimmedDest,
      });
      setSuccessNotice(
        `${formatInr(data.transaction.amount)} sent to ${trimmedDest} (UTR ${data.transaction.utr}).`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Withdrawal failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const matchingSavedHandles = savedHandles.filter(
    (h) => h.method === withdrawMethod
  );

  const content = (
    <div
      className={
        embedded
          ? 'h-full w-full flex flex-col bg-[#0e0e12] overflow-hidden'
          : 'w-full max-w-2xl max-h-[92vh] flex flex-col rounded-xl border border-zinc-800 bg-[#0e0e12] shadow-2xl overflow-hidden'
      }
    >
      {/* Modal Header */}
      <div className="shrink-0 px-5 py-4 border-b border-zinc-800/90 bg-[#111116] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2
              id="wallet-modal-title"
              className="font-display text-base font-semibold text-zinc-100 truncate"
            >
              Razorpay &amp; UPI Payments
            </h2>
            <p className="text-xs text-zinc-400">
              Verified paid total:{' '}
              <span className="font-mono font-semibold text-zinc-100 tabular-nums">
                {formatInr(balance)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SunilGlowingBadge compact />
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Close wallet"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 px-5 pt-3 pb-2 border-b border-zinc-800/80 bg-[#0e0e12]">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'add'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pay via UPI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('withdraw')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'withdraw'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Withdraw
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              History ({transactions.length})
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-5">
              {/* Amount Input + Quick Presets */}
              <div className="space-y-2.5">
                <label
                  htmlFor="wallet-add-amount"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Enter amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-semibold text-zinc-400">
                    ₹
                  </span>
                  <input
                    id="wallet-add-amount"
                    type="number"
                    min={10}
                    max={100000}
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-[#14141a] pl-8 pr-4 py-2.5 font-mono text-base font-semibold text-zinc-100 tabular-nums focus:border-blue-500 focus:outline-none"
                    placeholder="500"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(String(amt))}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono tabular-nums border transition-colors ${
                        Number(depositAmount) === amt
                          ? 'border-blue-500/60 bg-blue-600/15 text-blue-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      +₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct UPI App Buttons with Icons */}
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-zinc-300">
                  Select UPI app or QR Scan
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {UPI_APPS.map((app) => {
                    const selected = selectedUpiApp === app.id;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleSelectUpiApp(app.id)}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                          selected
                            ? 'border-blue-500 bg-blue-600/15 text-zinc-100'
                            : 'border-zinc-800 bg-[#131318] text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                        }`}
                      >
                        {renderAppIcon(app.id, 'w-6 h-6')}
                        <span className="whitespace-nowrap">{app.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dual Payment Rail Switcher */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-300">
                    Payment gateway / verification mode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositRail('razorpay')}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                      depositRail === 'razorpay'
                        ? 'border-blue-500 bg-blue-600/10'
                        : 'border-zinc-800 bg-[#131318] hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
                        <RazorpayIcon className="w-4 h-4" />
                        Razorpay UPI Checkout
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Instant UPI Intent & Collect checkout
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepositRail('direct_upi')}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                      depositRail === 'direct_upi'
                        ? 'border-blue-500 bg-blue-600/10'
                        : 'border-zinc-800 bg-[#131318] hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
                        <QrCode className="w-3.5 h-3.5 text-blue-400" />
                        Direct UPI ID / QR + UTR
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Scan QR & verify 12-digit UTR number
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rail 1: Razorpay UPI Checkout */}
              {depositRail === 'razorpay' && (
                <div className="rounded-xl border border-zinc-800 bg-[#121217] p-4 space-y-4">
                  {!rzpSheet ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/35 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{MERCHANT_OFFICIAL_LABEL}</span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {renderAppIcon(
                            selectedUpiApp === 'qr' ? 'gpay' : selectedUpiApp,
                            'w-6 h-6'
                          )}
                          <div>
                            <div className="text-sm font-medium text-zinc-100">
                              Pay via{' '}
                              {
                                UPI_APPS.find(
                                  (a) =>
                                    a.id ===
                                    (selectedUpiApp === 'qr' ? 'gpay' : selectedUpiApp)
                                )?.label
                              }
                            </div>
                            <div className="text-xs text-zinc-400">
                              Razorpay Auto-Unlock · Contact pre-filled: {MERCHANT_CONTACT}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-base font-semibold text-zinc-100 tabular-nums">
                          {formatInr(parsedDepositAmount)}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          disabled={isSubmitting || parsedDepositAmount < 10}
                          onClick={handleStartRazorpayCheckout}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Starting Razorpay...
                            </>
                          ) : (
                            <>
                              <RazorpayIcon className="w-4 h-4" />
                              Pay {formatInr(parsedDepositAmount)} with Razorpay UPI
                            </>
                          )}
                        </button>

                        <a
                          href={selectedAppDeepLink}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open UPI App
                        </a>
                      </div>

                      {/* Direct Pay Fallback right below Razorpay */}
                      <DirectUpiFallbackBox
                        compact
                        amountInr={parsedDepositAmount >= 10 ? parsedDepositAmount : 500}
                        note="Wallet Topup"
                      />
                    </>
                  ) : (
                    /* Interactive Razorpay UPI Checkout Sheet */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <RazorpayIcon className="w-5 h-5 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-100 truncate">
                              {MERCHANT_OFFICIAL_LABEL}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400">
                              {rzpSheet.orderId} · Pre-filled: {MERCHANT_CONTACT}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm font-semibold text-zinc-100 tabular-nums">
                            {formatInr(rzpSheet.amount)}
                          </div>
                          <div className="text-[11px] text-zinc-400">INR</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['gpay', 'paytm', 'phonepe', 'bhim'] as UpiAppId[]).map(
                          (appId) => {
                            const app = UPI_APPS.find((a) => a.id === appId)!;
                            const active = rzpSheet.upiApp === appId;
                            return (
                              <button
                                key={appId}
                                type="button"
                                onClick={() =>
                                  setRzpSheet((prev) =>
                                    prev ? { ...prev, upiApp: appId } : null
                                  )
                                }
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                  active
                                    ? 'border-blue-500 bg-blue-600/15 text-zinc-100'
                                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                                }`}
                              >
                                {renderAppIcon(appId, 'w-4 h-4')}
                                <span className="truncate">{app.label}</span>
                              </button>
                            );
                          }
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="rzp-payer-upi"
                          className="block text-xs text-zinc-400"
                        >
                          Optional UPI ID for collect request (or click Confirm below)
                        </label>
                        <input
                          id="rzp-payer-upi"
                          type="text"
                          value={rzpSheet.payerUpi}
                          onChange={(e) =>
                            setRzpSheet((prev) =>
                              prev ? { ...prev, payerUpi: e.target.value } : null
                            )
                          }
                          placeholder="yourname@okicici"
                          className="w-full rounded-lg border border-zinc-800 bg-[#0d0d11] px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setRzpSheet(null)}
                          className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleConfirmRazorpaySheet}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          Authorize & Complete {formatInr(rzpSheet.amount)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rail 2: Direct UPI ID / QR Code + 12-Digit UTR Verification */}
              {depositRail === 'direct_upi' && (
                <form
                  onSubmit={handleVerifyUtrSubmit}
                  className="rounded-xl border border-zinc-800 bg-[#121217] p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center">
                    <div className="mx-auto sm:mx-0 flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-zinc-700">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`UPI QR code to pay ${formatInr(parsedDepositAmount)}`}
                          className="w-36 h-36 block"
                        />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center text-zinc-500 text-xs">
                          Generating QR...
                        </div>
                      )}
                      <span className="text-[11px] font-mono font-semibold text-zinc-900 tabular-nums">
                        Pay {formatInr(parsedDepositAmount)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-zinc-200">
                          Scan with Google Pay, Paytm, PhonePe, or BHIM
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Scan the QR code or transfer directly to the UPI ID below, then enter your 12-digit UTR / Reference Number to credit your wallet.
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-[#0c0c10] px-3 py-2">
                        <span className="font-mono text-xs text-zinc-100 truncate">
                          {MERCHANT_UPI_ID}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpiId}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 shrink-0"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy ID
                            </>
                          )}
                        </button>
                      </div>

                      <a
                        href={selectedAppDeepLink}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Launch{' '}
                        {UPI_APPS.find((a) => a.id === selectedUpiApp)?.label ||
                          'UPI App'}{' '}
                        directly
                      </a>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="utr-number-input"
                        className="text-xs font-medium text-zinc-200"
                      >
                        12-Digit UTR / UPI Reference Number
                      </label>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {utrInput.length}/12 digits
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id="utr-number-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={utrInput}
                        onChange={(e) =>
                          setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))
                        }
                        placeholder="e.g. 431892045612"
                        className="flex-1 rounded-lg border border-zinc-800 bg-[#0d0d11] px-3.5 py-2.5 font-mono text-sm tracking-wider text-zinc-100 tabular-nums placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || utrInput.length !== 12}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verify & Add Money
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-5">
              {/* Withdraw Method Selector */}
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-zinc-300">
                  Choose payout method
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('gpay')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                      withdrawMethod === 'gpay'
                        ? 'border-blue-500 bg-blue-600/15 text-zinc-100'
                        : 'border-zinc-800 bg-[#131318] text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <GooglePayIcon className="w-6 h-6" />
                    <span>Google Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('paytm')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                      withdrawMethod === 'paytm'
                        ? 'border-blue-500 bg-blue-600/15 text-zinc-100'
                        : 'border-zinc-800 bg-[#131318] text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <PaytmIcon className="w-6 h-6" />
                    <span>Paytm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bank_upi')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                      withdrawMethod === 'bank_upi'
                        ? 'border-blue-500 bg-blue-600/15 text-zinc-100'
                        : 'border-zinc-800 bg-[#131318] text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <BankUpiIcon className="w-6 h-6 text-blue-400" />
                    <span>Bank UPI ID</span>
                  </button>
                </div>
              </div>

              {/* Destination Input */}
              <div className="space-y-2">
                <label
                  htmlFor="withdraw-destination"
                  className="block text-xs font-medium text-zinc-300"
                >
                  {withdrawMethod === 'gpay'
                    ? 'Google Pay UPI ID or 10-digit mobile number'
                    : withdrawMethod === 'paytm'
                      ? 'Paytm UPI ID or 10-digit Paytm number'
                      : 'Bank UPI ID (BHIM / HDFC / ICICI / SBI / YBL)'}
                </label>
                <input
                  id="withdraw-destination"
                  type="text"
                  value={withdrawDestination}
                  onChange={(e) => setWithdrawDestination(e.target.value)}
                  placeholder={
                    withdrawMethod === 'gpay'
                      ? 'e.g. sunilsingh@okaxis or 9876543210'
                      : withdrawMethod === 'paytm'
                        ? 'e.g. 9876543210@paytm or 9876543210'
                        : 'e.g. sunilsingh@hdfcbank'
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-[#14141a] px-3.5 py-2.5 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                />

                {matchingSavedHandles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-zinc-500">Recent:</span>
                    {matchingSavedHandles.map((saved) => (
                      <button
                        key={saved.handle}
                        type="button"
                        onClick={() => setWithdrawDestination(saved.handle)}
                        className="text-xs font-mono text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                      >
                        {saved.handle}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Withdraw Amount */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="withdraw-amount"
                    className="font-medium text-zinc-300"
                  >
                    Withdrawal amount (INR)
                  </label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(Math.floor(balance)))}
                    className="text-blue-400 hover:text-blue-300 font-mono tabular-nums"
                  >
                    Max: {formatInr(balance)}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-semibold text-zinc-400">
                    ₹
                  </span>
                  <input
                    id="withdraw-amount"
                    type="number"
                    min={10}
                    max={Math.max(10, balance)}
                    step="1"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-[#14141a] pl-8 pr-4 py-2.5 font-mono text-base font-semibold text-zinc-100 tabular-nums focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={amt > balance}
                      onClick={() => setWithdrawAmount(String(amt))}
                      className="px-3 py-1.5 rounded-md text-xs font-mono tabular-nums border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || balance < 10}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing UPI payout...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    Withdraw {formatInr(Number(withdrawAmount) || 0)} to{' '}
                    {withdrawMethod === 'gpay'
                      ? 'Google Pay'
                      : withdrawMethod === 'paytm'
                        ? 'Paytm'
                        : 'Bank UPI'}
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400">
                  No wallet transactions yet. Add money via UPI or withdraw funds to see records here.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-[#121217]">
                  {transactions.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            {tx.upiApp
                              ? renderAppIcon(tx.upiApp, 'w-4 h-4')
                              : tx.withdrawMethod === 'gpay'
                                ? <GooglePayIcon className="w-4 h-4" />
                                : tx.withdrawMethod === 'paytm'
                                  ? <PaytmIcon className="w-4 h-4" />
                                  : tx.withdrawMethod === 'bank_upi'
                                    ? <BankUpiIcon className="w-4 h-4 text-blue-400" />
                                    : isDeposit
                                      ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                      : <ArrowUpRight className="w-4 h-4 text-zinc-300" />}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-100 truncate">
                              {tx.rail === 'razorpay_upi'
                                ? 'Paid via Razorpay UPI'
                                : tx.rail === 'direct_upi'
                                  ? 'Verified Direct UPI / QR'
                                  : `Withdrawn to ${tx.upiHandle || 'UPI'}`}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500 tabular-nums truncate">
                              Ref {tx.utr} ·{' '}
                              {new Date(tx.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono text-xs font-semibold tabular-nums ${
                              isDeposit ? 'text-emerald-400' : 'text-zinc-100'
                            }`}
                          >
                            {isDeposit ? '+' : '-'}
                            {formatInr(tx.amount)}
                          </div>
                          <div className="text-[11px] text-zinc-500 capitalize">
                            {tx.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="max-w-3xl mx-auto w-full h-full">
        {content}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      {content}
    </div>
  );
}
