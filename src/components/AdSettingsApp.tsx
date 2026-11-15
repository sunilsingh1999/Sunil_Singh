import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Megaphone,
  RotateCcw,
  Save,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import {
  APP_STATE_SYNC_EVENT,
  attemptOwnerAuth,
  getOwnerGuardState,
  loadOwnerSessionUnlocked,
  LOCKED_LIVE_ADS,
  LOCKED_MERCHANT,
  type OwnerGuardState,
} from '../config/merchant';
import { SecurityAlertBadge } from './SecurityAlertBadge';
import { SunilGlowingBadge } from './SunilGlowingBadge';

export interface AdConfigState {
  // Google AdSense
  adsenseEnabled: boolean;
  adsensePublisherId: string;
  adsenseSlotCode: string;

  // Adsterra (Default Home Banner 2f2b6cdc2759ef1935795725cfd73d0f always active on Home)
  adsterraEnabled: boolean;
  adsterraBannerCode: string;
  adsterraPopunderCode: string;
  adsterraSocialBarCode: string;
  adsterraDirectLink: string;

  // HilltopAds
  hilltopEnabled: boolean;
  hilltopScriptCode: string;
  hilltopDirectLink: string;

  // Monetag
  monetagEnabled: boolean;
  monetagScriptCode: string;
  monetagDirectLink: string;

  // Clickadu
  clickaduEnabled: boolean;
  clickaduScriptCode: string;
  clickaduDirectLink: string;

  // AdMaven
  admavenEnabled: boolean;
  admavenScriptCode: string;
  admavenDirectLink: string;

  // Injection Controls
  injectIntoMainApp: boolean;
  injectIntoExports: boolean;
}

export const AD_STORAGE_KEY = 'sunil_ai_builder_ads_v1';

const DEFAULT_ADSTERRA_BANNER_SNIPPET = `<script type="text/javascript">
  atOptions = {
    'key' : '${LOCKED_LIVE_ADS.ADSTERRA_BANNER_KEY}',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
</script>
<script type="text/javascript" src="https://www.highperformanceformat.com/${LOCKED_LIVE_ADS.ADSTERRA_BANNER_KEY}/invoke.js"></script>`;

export const DEFAULT_AD_CONFIG: AdConfigState = {
  adsenseEnabled: false,
  adsensePublisherId: '',
  adsenseSlotCode: '',

  adsterraEnabled: true,
  adsterraBannerCode: DEFAULT_ADSTERRA_BANNER_SNIPPET,
  adsterraPopunderCode: '',
  adsterraSocialBarCode: '',
  adsterraDirectLink: '',

  hilltopEnabled: true,
  hilltopScriptCode: '',
  hilltopDirectLink: '',

  monetagEnabled: true,
  monetagScriptCode: '',
  monetagDirectLink: '',

  clickaduEnabled: false,
  clickaduScriptCode: '',
  clickaduDirectLink: '',

  admavenEnabled: false,
  admavenScriptCode: '',
  admavenDirectLink: '',

  injectIntoMainApp: true,
  injectIntoExports: true,
};

export function enforceLockedAdConfig(
  raw?: Partial<AdConfigState> | null
): AdConfigState {
  return {
    ...DEFAULT_AD_CONFIG,
    ...(raw || {}),
    // Core revenue shields locked as read-only constants against localStorage tampering
    adsterraEnabled: true,
    adsterraBannerCode: DEFAULT_ADSTERRA_BANNER_SNIPPET,
    hilltopEnabled: true,
    monetagEnabled: true,
    injectIntoMainApp: true,
    injectIntoExports: true,
  };
}

export function loadAdConfig(): AdConfigState {
  try {
    const raw = localStorage.getItem(AD_STORAGE_KEY);
    if (raw) {
      return enforceLockedAdConfig(JSON.parse(raw) as Partial<AdConfigState>);
    }
  } catch {
    // Fallback to default
  }
  return enforceLockedAdConfig(DEFAULT_AD_CONFIG);
}

export function collectEnabledAdScripts(config: AdConfigState): string[] {
  const parts: string[] = [];
  if (config.adsenseEnabled) {
    if (config.adsenseSlotCode.trim()) {
      parts.push(config.adsenseSlotCode.trim());
    } else if (config.adsensePublisherId.trim()) {
      const pub = config.adsensePublisherId.trim();
      parts.push(
        `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pub}" crossorigin="anonymous"></script>`
      );
    }
  }
  if (config.adsterraEnabled) {
    if (config.adsterraPopunderCode.trim()) {
      parts.push(config.adsterraPopunderCode.trim());
    }
    if (config.adsterraSocialBarCode.trim()) {
      parts.push(config.adsterraSocialBarCode.trim());
    }
  }
  if (config.hilltopEnabled && config.hilltopScriptCode.trim()) {
    parts.push(config.hilltopScriptCode.trim());
  }
  if (config.monetagEnabled && config.monetagScriptCode.trim()) {
    parts.push(config.monetagScriptCode.trim());
  }
  if (config.clickaduEnabled && config.clickaduScriptCode.trim()) {
    parts.push(config.clickaduScriptCode.trim());
  }
  if (config.admavenEnabled && config.admavenScriptCode.trim()) {
    parts.push(config.admavenScriptCode.trim());
  }
  return parts;
}

export function collectEnabledDirectLinks(
  config?: AdConfigState
): Array<{ network: string; url: string }> {
  if (!config) return [];
  const candidates: Array<{ enabled: boolean; network: string; url: string }> = [
    { enabled: config.hilltopEnabled, network: 'HilltopAds', url: config.hilltopDirectLink },
    { enabled: config.monetagEnabled, network: 'Monetag', url: config.monetagDirectLink },
    { enabled: config.clickaduEnabled, network: 'Clickadu', url: config.clickaduDirectLink },
    { enabled: config.admavenEnabled, network: 'AdMaven', url: config.admavenDirectLink },
    { enabled: config.adsterraEnabled, network: 'Adsterra', url: config.adsterraDirectLink },
  ];
  return candidates
    .filter((item) => item.enabled && /^https?:\/\/.+/i.test(item.url.trim()))
    .map((item) => ({ network: item.network, url: item.url.trim() }));
}

interface AdSettingsAppProps {
  config: AdConfigState;
  onSaveConfig: (next: AdConfigState) => void;
}

interface NetworkCardSpec {
  id: 'hilltop' | 'monetag' | 'clickadu' | 'admaven';
  name: string;
  tagline: string;
  accentText: string;
  enabledKey: 'hilltopEnabled' | 'monetagEnabled' | 'clickaduEnabled' | 'admavenEnabled';
  scriptKey: 'hilltopScriptCode' | 'monetagScriptCode' | 'clickaduScriptCode' | 'admavenScriptCode';
  directLinkKey: 'hilltopDirectLink' | 'monetagDirectLink' | 'clickaduDirectLink' | 'admavenDirectLink';
  scriptPlaceholder: string;
  linkPlaceholder: string;
}

const MULTI_AD_NETWORKS: NetworkCardSpec[] = [
  {
    id: 'hilltop',
    name: 'HilltopAds',
    tagline: 'Site meta tag verified in <head> · Popunder, Video VAST & Direct Link',
    accentText: 'text-emerald-300',
    enabledKey: 'hilltopEnabled',
    scriptKey: 'hilltopScriptCode',
    directLinkKey: 'hilltopDirectLink',
    scriptPlaceholder: '<script>(function(s){...})(document)</script>',
    linkPlaceholder: 'https://your-hilltopads-direct-link...',
  },
  {
    id: 'monetag',
    name: 'Monetag (PropellerAds)',
    tagline: 'MultiTag, OnClick Popunder, Vignette Banner & Smart Direct Link',
    accentText: 'text-cyan-300',
    enabledKey: 'monetagEnabled',
    scriptKey: 'monetagScriptCode',
    directLinkKey: 'monetagDirectLink',
    scriptPlaceholder: '<script src="https://alwingulla.com/.../tag.min.js" data-zone="..." async></script>',
    linkPlaceholder: 'https://your-monetag-direct-link...',
  },
  {
    id: 'clickadu',
    name: 'Clickadu',
    tagline: 'Popunder, In-Page Push, Instant Text & High-CPM Direct Link',
    accentText: 'text-violet-300',
    enabledKey: 'clickaduEnabled',
    scriptKey: 'clickaduScriptCode',
    directLinkKey: 'clickaduDirectLink',
    scriptPlaceholder: '<script async data-cfasync="false" src="//...clickadu..."></script>',
    linkPlaceholder: 'https://your-clickadu-direct-link...',
  },
  {
    id: 'admaven',
    name: 'AdMaven',
    tagline: 'Popunder, Push Notifications, Interstitial & Direct Link Monetization',
    accentText: 'text-amber-300',
    enabledKey: 'admavenEnabled',
    scriptKey: 'admavenScriptCode',
    directLinkKey: 'admavenDirectLink',
    scriptPlaceholder: '<script data-cfasync="false" src="//...admaven..."></script>',
    linkPlaceholder: 'https://your-admaven-direct-link...',
  },
];

export function AdSettingsApp({ config, onSaveConfig }: AdSettingsAppProps) {
  const [ownerUnlocked, setOwnerUnlocked] = useState<boolean>(
    loadOwnerSessionUnlocked
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [guard, setGuard] = useState<OwnerGuardState>(getOwnerGuardState);

  const [draft, setDraft] = useState<AdConfigState>(() =>
    enforceLockedAdConfig(config)
  );
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    const syncAll = () => {
      setOwnerUnlocked(loadOwnerSessionUnlocked());
      setGuard(getOwnerGuardState());
    };
    window.addEventListener(APP_STATE_SYNC_EVENT, syncAll);
    const interval = window.setInterval(() => setGuard(getOwnerGuardState()), 15000);
    return () => {
      window.removeEventListener(APP_STATE_SYNC_EVENT, syncAll);
      window.clearInterval(interval);
    };
  }, []);

  async function handleUnlockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guard.isLocked || isCheckingAuth) return;
    setIsCheckingAuth(true);
    setPasswordError(null);
    const result = await attemptOwnerAuth(passwordInput);
    setGuard(result.guard);
    setIsCheckingAuth(false);
    if (result.authenticated) {
      setPasswordError(null);
      setPasswordInput('');
      setOwnerUnlocked(true);
      return;
    }
    setPasswordInput('');
    setPasswordError(result.error || 'Incorrect Owner Password.');
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const locked = enforceLockedAdConfig(draft);
    setDraft(locked);
    onSaveConfig(locked);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2600);
  }

  function handleReset() {
    const lockedDefault = enforceLockedAdConfig(DEFAULT_AD_CONFIG);
    setDraft(lockedDefault);
    onSaveConfig(lockedDefault);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2000);
  }

  const activeNetworkCount =
    (draft.adsterraEnabled ? 1 : 0) +
    (draft.hilltopEnabled ? 1 : 0) +
    (draft.monetagEnabled ? 1 : 0) +
    (draft.clickaduEnabled ? 1 : 0) +
    (draft.admavenEnabled ? 1 : 0) +
    (draft.adsenseEnabled ? 1 : 0);

  if (!ownerUnlocked) {
    return (
      <div className="h-full overflow-y-auto bg-[#07070f] p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl p-[1.5px] royal-metallic-gold-border shadow-2xl my-auto">
          <form
            onSubmit={handleUnlockSubmit}
            className="rounded-[22px] bg-[#0c0c15] p-6 space-y-5 text-center"
          >
            <div className="flex justify-center">
              <SunilGlowingBadge variant="hero" />
            </div>

            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-300" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-extrabold text-zinc-100">
                Multi-Ad Network Revenue Hub
              </h2>
              <p className="text-xs text-zinc-400">
                Enter Owner Password to manage Adsterra, HilltopAds, Monetag, Clickadu, AdMaven &amp; AdSense slots.
              </p>
            </div>

            <SecurityAlertBadge guard={guard} />

            {passwordError && !guard.isLocked && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2 text-xs text-red-200 text-left">
                {passwordError}
              </div>
            )}

            <div className="space-y-2 text-left">
              <label
                htmlFor="ad-owner-password"
                className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Owner Password
              </label>
              <input
                id="ad-owner-password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={guard.isLocked ? 'Locked for 24 hours' : 'Enter Owner Password'}
                disabled={guard.isLocked || isCheckingAuth}
                autoFocus
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={guard.isLocked || isCheckingAuth || !passwordInput.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:brightness-110 disabled:opacity-50 text-zinc-950 font-display text-sm font-extrabold flex items-center justify-center gap-2 min-h-[46px]"
            >
              {isCheckingAuth ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : guard.isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  Access Locked (24h)
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Unlock Multi-Ad Revenue Hub
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#07070f] p-4 sm:p-6 pb-24">
      <form
        onSubmit={handleSave}
        className="max-w-4xl mx-auto space-y-5"
      >
        {/* Header Card */}
        <div className="rounded-2xl border border-white/10 bg-[#101018] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-zinc-100 truncate">
                Multi-Ad Network Revenue Hub
              </h2>
              <p className="text-xs text-zinc-400">
                {activeNetworkCount} of 6 networks active · Paste scripts or Direct Links without coding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <SunilGlowingBadge compact />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              Save &amp; Activate All Ads
            </button>
          </div>
        </div>

        {savedBanner && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Multi-Ad Network scripts &amp; Direct Links saved and activated!</span>
          </div>
        )}

        {/* Anti-Tamper Read-Only Security Banner */}
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Anti-Tamper Lock Active:</strong> Official UPI (
              <span className="font-mono">{LOCKED_MERCHANT.CONTACT}</span>), Adsterra Home Banner, HilltopAds Push, &amp; Monetag MultiTag (Zone{' '}
              <span className="font-mono">{LOCKED_LIVE_ADS.MONETAG_ZONE_ID}</span>) are locked read-only.
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
            Locked Read-Only
          </span>
        </div>

        {/* Global Activation Switches (Core Shields Locked Read-Only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="rounded-2xl border border-white/10 bg-[#101018] p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Run Enabled Scripts Live in AI1999</span>
              </div>
              <p className="text-xs text-zinc-400">
                Locked Active · Executes Adsterra, HilltopAds, Monetag &amp; extra ad tags in AI1999.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shrink-0">
              <Lock className="w-3 h-3" />
              Locked ON
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101018] p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Code2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">Inject Into Exported HTML / ZIP Apps</span>
              </div>
              <p className="text-xs text-zinc-400">
                Locked Active · Embeds live ad tags automatically in downloaded projects.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shrink-0">
              <Lock className="w-3 h-3" />
              Locked ON
            </span>
          </div>
        </div>

        {/* 1. Adsterra Section (Locked Read-Only Home Banner Active) */}
        <section className="rounded-2xl border border-amber-400/30 bg-[#101018] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-zinc-100">
                1. Adsterra Ads (Locked Home Banner Active)
              </h3>
              <p className="text-xs text-zinc-400">
                Read-Only 320×50 Key:{' '}
                <span className="font-mono text-amber-300">
                  {LOCKED_LIVE_ADS.ADSTERRA_BANNER_KEY}
                </span>{' '}
                · Protected against tampering
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shrink-0">
              <Lock className="w-3 h-3" />
              Locked ON
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="adsterra-banner"
                className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3 text-amber-300" />
                Adsterra Banner Code (Read-Only Locked)
              </label>
              <textarea
                id="adsterra-banner"
                rows={3}
                value={DEFAULT_ADSTERRA_BANNER_SNIPPET}
                readOnly
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2 font-mono text-xs text-zinc-400 cursor-not-allowed focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="adsterra-social"
                className="block text-xs font-medium text-zinc-300"
              >
                Adsterra Social Bar / Popunder Script
              </label>
              <textarea
                id="adsterra-social"
                rows={3}
                value={draft.adsterraSocialBarCode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    adsterraSocialBarCode: e.target.value,
                  }))
                }
                placeholder='<script type="text/javascript" src="//pl..."></script>'
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="adsterra-popunder"
                className="block text-xs font-medium text-zinc-300"
              >
                Adsterra Popunder Script
              </label>
              <input
                id="adsterra-popunder"
                type="text"
                value={draft.adsterraPopunderCode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    adsterraPopunderCode: e.target.value,
                  }))
                }
                placeholder='<script type="text/javascript" src="//pl..."></script>'
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="adsterra-direct-link"
                className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-amber-300" />
                Adsterra Smart Direct Link URL
              </label>
              <input
                id="adsterra-direct-link"
                type="url"
                value={draft.adsterraDirectLink}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    adsterraDirectLink: e.target.value,
                  }))
                }
                placeholder="https://www.highcpmgate.com/..."
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* 2-5. HilltopAds, Monetag, Clickadu & AdMaven Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MULTI_AD_NETWORKS.map((net, idx) => {
            const isCoreLocked = net.id === 'hilltop' || net.id === 'monetag';
            const isEnabled = isCoreLocked ? true : draft[net.enabledKey];
            const scriptVal = draft[net.scriptKey];
            const linkVal = draft[net.directLinkKey];
            const hasValidLink = /^https?:\/\/.+/i.test(linkVal.trim());

            return (
              <section
                key={net.id}
                className="rounded-2xl border border-white/10 bg-[#101018] p-5 space-y-3.5 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800/80">
                  <div className="min-w-0">
                    <h3 className={`font-display text-sm font-bold ${net.accentText}`}>
                      {idx + 2}. {net.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                      {net.tagline}
                    </p>
                  </div>
                  {isCoreLocked ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shrink-0">
                      <Lock className="w-3 h-3" />
                      Locked ON
                    </span>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`Toggle ${net.name}`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          [net.enabledKey]: !prev[net.enabledKey],
                        }))
                      }
                      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                        isEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${net.id}-script`}
                      className="block text-xs font-medium text-zinc-300"
                    >
                      {net.name} Zone / Tag Script
                    </label>
                    <textarea
                      id={`${net.id}-script`}
                      rows={3}
                      value={scriptVal}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [net.scriptKey]: e.target.value,
                        }))
                      }
                      placeholder={net.scriptPlaceholder}
                      className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`${net.id}-direct-link`}
                        className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5"
                      >
                        <Link2 className="w-3.5 h-3.5 text-zinc-400" />
                        {net.name} Direct Link URL
                      </label>
                      {hasValidLink && (
                        <a
                          href={linkVal.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-cyan-300 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Test Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <input
                      id={`${net.id}-direct-link`}
                      type="url"
                      value={linkVal}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [net.directLinkKey]: e.target.value,
                        }))
                      }
                      placeholder={net.linkPlaceholder}
                      className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3 py-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* 6. Google AdSense Section */}
        <section className="rounded-2xl border border-white/10 bg-[#101018] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
            <div>
              <h3 className="font-display text-sm font-semibold text-zinc-100">
                6. Google AdSense
              </h3>
              <p className="text-xs text-zinc-400">
                Auto Ads Publisher ID and Display Ad Unit HTML
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.adsenseEnabled}
              aria-label="Toggle Google AdSense"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  adsenseEnabled: !prev.adsenseEnabled,
                }))
              }
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                draft.adsenseEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  draft.adsenseEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="adsense-pub-id"
                className="block text-xs font-medium text-zinc-300"
              >
                AdSense Publisher ID
              </label>
              <input
                id="adsense-pub-id"
                type="text"
                value={draft.adsensePublisherId}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    adsensePublisherId: e.target.value,
                  }))
                }
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2.5 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="adsense-slot-code"
                className="block text-xs font-medium text-zinc-300"
              >
                AdSense Ad Unit / Head Snippet
              </label>
              <textarea
                id="adsense-slot-code"
                rows={2}
                value={draft.adsenseSlotCode}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    adsenseSlotCode: e.target.value,
                  }))
                }
                placeholder='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..." crossorigin="anonymous"></script>'
                className="w-full rounded-xl border border-zinc-800 bg-[#08080e] px-3.5 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              HilltopAds verification meta tag (`dffda3885d821cc56ed00e9306ceea6ab0ab1796`) is verified in site `&lt;head&gt;`.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
        </div>
      </form>
    </div>
  );
}
