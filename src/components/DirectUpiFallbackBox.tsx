import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  buildDirectUpiUrl,
  MERCHANT_CONTACT,
  MERCHANT_NAME,
  MERCHANT_UPI_ID,
} from '../config/merchant';
import { GooglePayIcon, PaytmIcon, PhonePeIcon } from './UpiIcons';

interface DirectUpiFallbackBoxProps {
  amountInr?: number;
  note?: string;
  onVerifyUtr?: (utr: string) => Promise<void>;
  verifyingUtr?: boolean;
  compact?: boolean;
}

export function DirectUpiFallbackBox({
  amountInr,
  note,
  onVerifyUtr,
  verifyingUtr = false,
  compact = false,
}: DirectUpiFallbackBoxProps) {
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrValue, setUtrValue] = useState('');
  const [utrLocalError, setUtrLocalError] = useState<string | null>(null);

  const directIntentLink = buildDirectUpiUrl({
    amount: amountInr,
    note,
  });

  async function handleCopyPhone() {
    try {
      await navigator.clipboard.writeText(MERCHANT_CONTACT);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  }

  async function handleCopyUpi() {
    try {
      await navigator.clipboard.writeText(MERCHANT_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  }

  async function handleUtrConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!onVerifyUtr) return;
    const cleaned = utrValue.trim();
    if (!/^\d{12}$/.test(cleaned)) {
      setUtrLocalError('Enter the 12-digit UTR / UPI Reference Number after paying.');
      return;
    }
    setUtrLocalError(null);
    await onVerifyUtr(cleaned);
  }

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-[#121218] text-left space-y-3 ${
        compact ? 'p-3.5' : 'p-4'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Direct Pay to {MERCHANT_CONTACT} (GPay / PhonePe / Paytm)</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Pay directly to <strong className="text-zinc-200">{MERCHANT_NAME}</strong> on{' '}
            <span className="font-mono text-zinc-200">{MERCHANT_CONTACT}</span> anytime
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <GooglePayIcon className="w-4 h-4" />
          <PhonePeIcon className="w-4 h-4" />
          <PaytmIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Number & UPI ID Copy Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#09090d] px-3 py-2">
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-500">UPI Mobile Number</div>
            <div className="font-mono text-xs font-semibold text-zinc-100 tabular-nums">
              {MERCHANT_CONTACT}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyPhone}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-blue-300 transition-colors shrink-0"
          >
            {copiedNumber ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#09090d] px-3 py-2">
          <div className="min-w-0">
            <div className="text-[10px] text-zinc-500">Direct UPI ID</div>
            <div className="font-mono text-xs font-semibold text-zinc-100 truncate">
              {MERCHANT_UPI_ID}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyUpi}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-blue-300 transition-colors shrink-0"
          >
            {copiedUpi ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* One-Tap Direct UPI Intent Link */}
      <a
        href={directIntentLink}
        className="w-full py-2.5 px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-600/15 hover:bg-emerald-600/25 text-xs font-semibold text-emerald-200 flex items-center justify-center gap-2 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        <span>
          Open GPay / PhonePe / Paytm{' '}
          {typeof amountInr === 'number' && amountInr > 0
            ? `(Pay ₹${amountInr} to ${MERCHANT_CONTACT})`
            : `(Pay to ${MERCHANT_CONTACT})`}
        </span>
      </a>

      {/* Optional UTR Instant Verification for Subscriptions */}
      {onVerifyUtr && (
        <form
          onSubmit={handleUtrConfirm}
          className="pt-2.5 border-t border-zinc-800/80 space-y-2"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">
              Paid directly to {MERCHANT_CONTACT}? Enter 12-digit UTR to unlock:
            </span>
            <span className="font-mono text-zinc-500 tabular-nums">
              {utrValue.length}/12
            </span>
          </div>
          {utrLocalError && (
            <div className="text-[11px] text-red-300">{utrLocalError}</div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={utrValue}
              onChange={(e) =>
                setUtrValue(e.target.value.replace(/\D/g, '').slice(0, 12))
              }
              placeholder="12-digit UTR number"
              aria-label="12-digit UTR reference number"
              className="flex-1 rounded-xl border border-zinc-800 bg-[#09090d] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none tabular-nums"
            />
            <button
              type="submit"
              disabled={verifyingUtr || utrValue.length !== 12}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white whitespace-nowrap transition-colors"
            >
              {verifyingUtr ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              Verify &amp; Unlock
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
