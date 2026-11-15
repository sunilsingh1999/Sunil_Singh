import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  ChevronLeft,
  Crown,
  Gift,
  IndianRupee,
  KeyRound,
  Loader2,
  Lock,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Unlock,
  Users,
} from 'lucide-react';
import {
  activateOwnerUnlimitedEverywhere,
  APP_STATE_SYNC_EVENT,
  dispatchAppStateSync,
  enforceOwnerLockoutFromServer,
  getOrCreateVisitorId,
  getOwnerGuardState,
  loadOwnerSessionToken,
  loadOwnerUnlimited,
  loadSavedGeminiKey,
  loadSavedRzpKey,
  MERCHANT_CONTACT,
  MERCHANT_OFFICIAL_LABEL,
  OWNER_SESSION_TOKEN_STORAGE_KEY,
  OWNER_SESSION_UNLOCKED_STORAGE_KEY,
  type OwnerGuardState,
  recordOwnerFailedAttempt,
  resetOwnerGuardOnSuccess,
  saveGeminiKey,
  saveOwnerSessionToken,
  saveRzpKey,
} from '../config/merchant';
import { SecurityAlertBadge } from './SecurityAlertBadge';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface AnalyticsDashboardResponse {
  authenticated: boolean;
  todayKey: string;
  totalUsers: number;
  dailyActiveVisitors: number;
  totalRevenueInr: number;
  revenueBreakdown: {
    subscriptionInr: number;
    walletInr: number;
    adInr: number;
  };
  subscribers: {
    total: number;
    builder299: number;
    video499?: number;
    music500: number;
    superVip999: number;
  };
  counters: {
    adViews: number;
    referralsClaimed: number;
    referralShares: number;
    searches: number;
    builds: number;
    songs: number;
    videos?: number;
  };
  dailySeries: Array<{
    date: string;
    label: string;
    visitors: number;
    revenueInr: number;
    actions: number;
  }>;
  recentLogs: Array<{
    id: string;
    visitorId: string;
    type: string;
    label: string;
    amountInr: number;
    plan?: string;
    timestamp: number;
  }>;
}

interface OwnerAnalyticsAppProps {
  onBack: () => void;
  onOpenAdSettings?: () => void;
}

export function OwnerAnalyticsApp({ onBack, onOpenAdSettings }: OwnerAnalyticsAppProps) {
  const [ownerAuthUnlocked, setOwnerAuthUnlocked] = useState<boolean>(() =>
    Boolean(loadOwnerSessionToken())
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<AnalyticsDashboardResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings'>('analytics');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [guard, setGuard] = useState<OwnerGuardState>(getOwnerGuardState);

  const [keyDraft, setKeyDraft] = useState<string>(loadSavedRzpKey);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState<string>(loadSavedGeminiKey);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [ownerUnlimitedActive, setOwnerUnlimitedActive] = useState<boolean>(
    loadOwnerUnlimited
  );

  useEffect(() => {
    const syncGuard = () => setGuard(getOwnerGuardState());
    window.addEventListener(APP_STATE_SYNC_EVENT, syncGuard);
    const interval = window.setInterval(syncGuard, 15000);
    return () => {
      window.removeEventListener(APP_STATE_SYNC_EVENT, syncGuard);
      window.clearInterval(interval);
    };
  }, []);

  const fetchDashboard = useCallback(
    async (credentials: { password?: string; ownerToken?: string }) => {
      if (!credentials.ownerToken && getOwnerGuardState().isLocked) {
        setGuard(getOwnerGuardState());
        setAuthError('Security Alert: Unauthorized Access Blocked');
        setOwnerAuthUnlocked(false);
        return;
      }

      setIsLoading(true);
      setAuthError(null);
      try {
        const res = await fetch('/api/analytics/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: credentials.password,
            ownerToken: credentials.ownerToken,
            visitorId: getOrCreateVisitorId(),
          }),
        });
        const data = await res.json();

        if (res.status === 429 || data?.locked) {
          const lockedGuard = enforceOwnerLockoutFromServer(data?.lockedUntil);
          setGuard(lockedGuard);
          dispatchAppStateSync();
          try {
            sessionStorage.removeItem(OWNER_SESSION_TOKEN_STORAGE_KEY);
            sessionStorage.removeItem(OWNER_SESSION_UNLOCKED_STORAGE_KEY);
          } catch {
            // Ignore
          }
          setOwnerAuthUnlocked(false);
          setAuthError(data?.error || 'Security Alert: Unauthorized Access Blocked');
          return;
        }

        if (!res.ok || !data.authenticated) {
          if (credentials.password) {
            const failedGuard = recordOwnerFailedAttempt(data?.lockedUntil);
            setGuard(failedGuard);
            dispatchAppStateSync();
            setAuthError(
              failedGuard.isLocked
                ? 'Security Alert: Unauthorized Access Blocked'
                : data?.error || 'Invalid Owner Password.'
            );
          } else {
            try {
              sessionStorage.removeItem(OWNER_SESSION_TOKEN_STORAGE_KEY);
              sessionStorage.removeItem(OWNER_SESSION_UNLOCKED_STORAGE_KEY);
            } catch {
              // Ignore
            }
            setAuthError(data?.error || 'Session expired. Please sign in again.');
          }
          setOwnerAuthUnlocked(false);
          return;
        }

        resetOwnerGuardOnSuccess();
        setGuard(getOwnerGuardState());
        if (typeof data.ownerToken === 'string' && data.ownerToken) {
          saveOwnerSessionToken(data.ownerToken);
        }
        dispatchAppStateSync();
        setDashboard(data as AnalyticsDashboardResponse);
        setOwnerAuthUnlocked(true);
        setPasswordInput('');
      } catch (err: unknown) {
        setAuthError(
          err instanceof Error ? err.message : 'Unable to load Owner Analytics.'
        );
        if (!credentials.ownerToken) {
          setOwnerAuthUnlocked(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const token = loadOwnerSessionToken();
    if (token) {
      void fetchDashboard({ ownerToken: token });
    }
  }, [fetchDashboard]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guard.isLocked || isLoading) return;
    const entered = passwordInput;
    setPasswordInput('');
    void fetchDashboard({ password: entered });
  }

  function handleSaveKey() {
    const cleaned = keyDraft.trim();
    if (cleaned && !/^rzp_(live|test)_[A-Za-z0-9]+$/.test(cleaned)) {
      setSettingsNotice('Enter a valid Razorpay Key ID starting with rzp_live_ or rzp_test_.');
      return;
    }
    saveRzpKey(cleaned);
    setSettingsNotice(
      cleaned
        ? 'Razorpay Live Key ID saved across ₹299, ₹500, ₹999, and Wallet screens!'
        : 'Razorpay Key ID cleared.'
    );
  }

  function handleSaveGeminiKey() {
    const cleaned = geminiKeyDraft.trim();
    if (cleaned && !/^AIza[A-Za-z0-9_-]{16,}$/.test(cleaned)) {
      setSettingsNotice('Enter a valid Gemini API key starting with AIzaSy... or leave empty to use the built-in Zero-Error Instant Engine.');
      return;
    }
    saveGeminiKey(cleaned);
    setSettingsNotice(
      cleaned
        ? 'Optional Gemini API Key saved! AI App Builder, Chargpt, AI Studio, Lyrics & Search will use your key.'
        : 'Gemini API Key cleared. Built-in Instant App Generator remains 100% active.'
    );
  }

  function handleActivateUnlimited() {
    activateOwnerUnlimitedEverywhere();
    setOwnerUnlimitedActive(true);
    setSettingsNotice(
      'Sunil Singh Unlimited Free Access activated across AI App Builder, AI Music Studio, AI Video Studio & Super VIP!'
    );
  }

  const maxVisitors = Math.max(
    1,
    ...(dashboard?.dailySeries.map((d) => d.visitors) || [1])
  );
  const maxRevenue = Math.max(
    1,
    ...(dashboard?.dailySeries.map((d) => d.revenueInr) || [1])
  );

  const filteredLogs = (dashboard?.recentLogs || []).filter((log) =>
    logFilter === 'all' ? true : log.type === logFilter
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#07070f] text-zinc-100 overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 px-3 sm:px-5 py-2.5 border-b border-white/10 bg-[#0d0d18]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center text-white shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold text-zinc-100 truncate">
              Owner Analytics &amp; Growth Suite
            </h2>
            <p className="text-[11px] text-amber-300 truncate">
              {MERCHANT_OFFICIAL_LABEL}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {ownerAuthUnlocked && (
            <button
              type="button"
              onClick={() => {
                const token = loadOwnerSessionToken();
                if (token) void fetchDashboard({ ownerToken: token });
                else setOwnerAuthUnlocked(false);
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
          <SunilGlowingBadge compact />
        </div>
      </div>

      {!ownerAuthUnlocked ? (
        /* Owner Password Gate (3-Attempt Brute-Force Protected) */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl p-[1.5px] royal-metallic-gold-border shadow-2xl">
            <form
              onSubmit={handlePasswordSubmit}
              className="rounded-[22px] bg-[#0c0c15] p-6 space-y-5 text-center"
            >
              <div className="flex justify-center">
                <SunilGlowingBadge variant="hero" />
              </div>

              <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-300" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-extrabold text-zinc-100">
                  Owner Panel Login
                </h3>
                <p className="text-xs text-zinc-400">
                  Enter your Owner Password to view live active users, daily visitors, ₹ revenue analytics, subscribers, and activity logs.
                </p>
              </div>

              <SecurityAlertBadge guard={guard} />

              {authError && !guard.isLocked && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2 text-xs text-red-200 text-left">
                  {authError}
                </div>
              )}

              <div className="space-y-2 text-left">
                <label
                  htmlFor="owner-analytics-pw"
                  className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Owner Password
                </label>
                <input
                  id="owner-analytics-pw"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={guard.isLocked ? 'Locked for 24 hours' : 'Enter Owner Password'}
                  disabled={guard.isLocked || isLoading}
                  autoFocus
                  className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={guard.isLocked || isLoading || !passwordInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 disabled:opacity-50 text-zinc-950 font-display text-sm font-extrabold flex items-center justify-center gap-2 min-h-[46px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Unlocking Dashboard...
                  </>
                ) : guard.isLocked ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Access Locked (24h)
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Open Owner Analytics Suite
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Unlocked Live Analytics Dashboard */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Section Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex p-1 rounded-xl border border-zinc-800 bg-[#0f0f18]">
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Live Analytics &amp; Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Razorpay &amp; Owner Access
                </button>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>UPI Payouts: {MERCHANT_CONTACT}</span>
              </div>
            </div>

            {activeTab === 'settings' ? (
              <div className="rounded-3xl border border-white/10 bg-[#0e0e18] p-5 sm:p-6 space-y-5 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-5 h-5 text-amber-300" />
                  <h3 className="font-display text-base font-bold text-zinc-100">
                    Owner Controls · Sunil Singh ({MERCHANT_CONTACT})
                  </h3>
                </div>

                {settingsNotice && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-200">
                    {settingsNotice}
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="owner-panel-rzp-key"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Razorpay Live Key ID (Applies to ₹299, ₹500 Video/Music, ₹999 &amp; UPI Checkout)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="owner-panel-rzp-key"
                      type="text"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      placeholder="rzp_live_XXXXXXXXXXXXXX"
                      className="flex-1 rounded-xl border border-zinc-800 bg-[#08080f] px-3.5 py-2.5 font-mono text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveKey}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shrink-0"
                    >
                      Save Key ID
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                  <label
                    htmlFor="owner-panel-gemini-key"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Gemini API Key (Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="owner-panel-gemini-key"
                      type="password"
                      value={geminiKeyDraft}
                      onChange={(e) => setGeminiKeyDraft(e.target.value)}
                      placeholder="AIzaSy... (optional — built-in Instant Engine works without a key)"
                      className="flex-1 rounded-xl border border-zinc-800 bg-[#08080f] px-3.5 py-2.5 font-mono text-xs text-zinc-100 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGeminiKey}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shrink-0"
                    >
                      Save Gemini Key
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Paste your free AIzaSy Gemini API key anytime, or leave blank — AI App Builder &amp; Music Studio never fail thanks to the built-in Zero-Error Instant Engine.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">
                      Owner Permanent Unlimited Free Access
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Unlocks AI App Builder Pro, AI Video Studio, AI Music Studio VIP &amp; ₹999 Super VIP Pass on this device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleActivateUnlimited}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 ${
                      ownerUnlimitedActive
                        ? 'bg-emerald-600/25 border border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                    }`}
                  >
                    {ownerUnlimitedActive
                      ? 'Unlimited Access Active ✓'
                      : 'Activate Unlimited Free'}
                  </button>
                </div>

                {onOpenAdSettings && (
                  <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-amber-300" />
                        Multi-Ad Network Revenue Hub
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Manage Adsterra, HilltopAds, Monetag, Clickadu, AdMaven scripts &amp; Direct Links.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenAdSettings}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-zinc-950 text-xs font-bold shrink-0"
                    >
                      Open Ad Hub
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 4 Primary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="glass-panel rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Total Registered / Active Users</span>
                      <Users className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="font-mono text-2xl font-extrabold text-zinc-50 tabular-nums">
                      {dashboard?.totalUsers ?? 0}
                    </div>
                    <div className="text-[11px] text-cyan-300">
                      {dashboard?.counters.searches ?? 0} searches · {dashboard?.counters.builds ?? 0} builds
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Daily Active Visitors</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="font-mono text-2xl font-extrabold text-zinc-50 tabular-nums">
                      {dashboard?.dailyActiveVisitors ?? 0}
                    </div>
                    <div className="text-[11px] text-emerald-300">
                      IST Date: {dashboard?.todayKey || 'Today'}
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Total Revenue Earned (₹)</span>
                      <IndianRupee className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="font-mono text-2xl font-extrabold text-amber-300 tabular-nums">
                      ₹{(dashboard?.totalRevenueInr ?? 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Subs ₹{dashboard?.revenueBreakdown.subscriptionInr ?? 0} · Ads ₹{dashboard?.revenueBreakdown.adInr ?? 0}
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Active Subscribers</span>
                      <Crown className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="font-mono text-2xl font-extrabold text-zinc-50 tabular-nums">
                      {dashboard?.subscribers.total ?? 0}
                    </div>
                    <div className="text-[11px] text-pink-300">
                      ₹299 Build: {dashboard?.subscribers.builder299 ?? 0} · ₹500 Video: {dashboard?.subscribers.video499 ?? 0} · ₹500 Music: {dashboard?.subscribers.music500 ?? 0} · ₹999 VIP: {dashboard?.subscribers.superVip999 ?? 0}
                    </div>
                  </div>
                </div>

                {/* Growth Monetization Mini Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d17] p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">Sponsor Ad Views</div>
                      <div className="font-mono text-lg font-bold text-zinc-100 tabular-nums">
                        {dashboard?.counters.adViews ?? 0}
                      </div>
                    </div>
                    <Megaphone className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d17] p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">Referrals Claimed</div>
                      <div className="font-mono text-lg font-bold text-zinc-100 tabular-nums">
                        {dashboard?.counters.referralsClaimed ?? 0}
                      </div>
                    </div>
                    <Gift className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d17] p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">Referral Shares</div>
                      <div className="font-mono text-lg font-bold text-zinc-100 tabular-nums">
                        {dashboard?.counters.referralShares ?? 0}
                      </div>
                    </div>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d17] p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">Wallet Deposits</div>
                      <div className="font-mono text-lg font-bold text-zinc-100 tabular-nums">
                        ₹{dashboard?.revenueBreakdown.walletInr ?? 0}
                      </div>
                    </div>
                    <IndianRupee className="w-4 h-4 text-teal-400" />
                  </div>
                </div>

                {/* 7-Day Visual SVG Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Daily Active Visitors Chart */}
                  <div className="rounded-3xl border border-white/10 bg-[#0d0d17] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-zinc-100">
                        7-Day Daily Active Visitors
                      </h3>
                      <span className="text-[11px] text-cyan-300">Live Unique Devices</span>
                    </div>
                    <svg viewBox="0 0 420 155" className="w-full h-40 overflow-visible" role="img" aria-label="7-day daily active visitors bar chart">
                      {(dashboard?.dailySeries || []).map((day, idx) => {
                        const barWidth = 34;
                        const gap = 22;
                        const x = 16 + idx * (barWidth + gap);
                        const barHeight = Math.max(6, Math.round((day.visitors / maxVisitors) * 96));
                        const y = 114 - barHeight;
                        return (
                          <g key={day.date}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="7"
                              fill="url(#visitorBarGrad)"
                            />
                            <text
                              x={x + barWidth / 2}
                              y={y - 6}
                              textAnchor="middle"
                              fill="#e4e4e7"
                              fontSize="10"
                              fontFamily="monospace"
                            >
                              {day.visitors}
                            </text>
                            <text
                              x={x + barWidth / 2}
                              y={136}
                              textAnchor="middle"
                              fill="#a1a1aa"
                              fontSize="9.5"
                            >
                              {day.label}
                            </text>
                          </g>
                        );
                      })}
                      <defs>
                        <linearGradient id="visitorBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* Daily Revenue (₹) Chart */}
                  <div className="rounded-3xl border border-white/10 bg-[#0d0d17] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-zinc-100">
                        7-Day Revenue Earned (₹ INR)
                      </h3>
                      <span className="text-[11px] text-amber-300">Subs + Wallet + Ads</span>
                    </div>
                    <svg viewBox="0 0 420 155" className="w-full h-40 overflow-visible" role="img" aria-label="7-day daily revenue bar chart">
                      {(dashboard?.dailySeries || []).map((day, idx) => {
                        const barWidth = 34;
                        const gap = 22;
                        const x = 16 + idx * (barWidth + gap);
                        const barHeight = Math.max(6, Math.round((day.revenueInr / maxRevenue) * 96));
                        const y = 114 - barHeight;
                        return (
                          <g key={day.date}>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={barHeight}
                              rx="7"
                              fill="url(#revBarGrad)"
                            />
                            <text
                              x={x + barWidth / 2}
                              y={y - 6}
                              textAnchor="middle"
                              fill="#fde68a"
                              fontSize="9.5"
                              fontFamily="monospace"
                            >
                              ₹{Math.round(day.revenueInr)}
                            </text>
                            <text
                              x={x + barWidth / 2}
                              y={136}
                              textAnchor="middle"
                              fill="#a1a1aa"
                              fontSize="9.5"
                            >
                              {day.label}
                            </text>
                          </g>
                        );
                      })}
                      <defs>
                        <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* Live User Activity Log */}
                <div className="rounded-3xl border border-white/10 bg-[#0d0d17] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <h3 className="font-display text-sm sm:text-base font-bold text-zinc-100">
                        Live User Activity Log
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'all', label: 'All' },
                          { id: 'subscription_unlock', label: 'Subscriptions' },
                          { id: 'ad_watch', label: 'Ads' },
                          { id: 'referral_claim', label: 'Referrals' },
                          { id: 'turbo_search', label: 'Searches' },
                          { id: 'builder_generate', label: 'Builds' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLogFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                            logFilter === tab.id
                              ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                              : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredLogs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-400">
                      No matching activity recorded yet. Real user visits, searches, builds, ad views, referrals, and payments will appear here live.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/70 max-h-80 overflow-y-auto pr-1">
                      {filteredLogs.map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-medium text-zinc-100 truncate">
                              {item.label}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">
                              {item.visitorId} ·{' '}
                              {new Date(item.timestamp).toLocaleString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {item.amountInr > 0 ? (
                              <span className="font-mono font-bold text-emerald-400">
                                +₹{item.amountInr}
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400 uppercase font-mono">
                                {item.type.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
