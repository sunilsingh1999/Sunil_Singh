import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Crown,
  Disc3,
  Download,
  Gift,
  KeyRound,
  Loader2,
  Lock,
  Megaphone,
  Mic2,
  Music,
  Play,
  Settings,
  Share,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Square,
  Unlock,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  createLiveNoiseBuffer,
  GENRE_SCALES,
  renderSongToWavBlob,
  schedulePatternStep,
  type MusicGenre,
  type SynthMixConfig,
} from '../utils/musicSynth';
import {
  activateOwnerUnlimitedEverywhere,
  activateSuperVipEverywhere,
  APP_STATE_SYNC_EVENT,
  attemptOwnerAuth,
  consumeBonusCredit,
  getOrCreateVisitorId,
  getOwnerGuardState,
  grantMusicVipUnlocked,
  loadBonusCredits,
  loadMusicVipUnlocked,
  loadRazorpayScript,
  loadSavedGeminiKey,
  loadSavedRzpKey,
  MERCHANT_CONTACT,
  MERCHANT_OFFICIAL_LABEL,
  MUSIC_FREE_TRIAL_LIMIT,
  MUSIC_FREE_USED_STORAGE_KEY,
  MUSIC_SUB_PRICE_INR,
  MUSIC_VIP_UNLOCK_STORAGE_KEY,
  OWNER_UNLIMITED_STORAGE_KEY,
  type OwnerGuardState,
  revokeUnlockStorageForTesting,
  saveGeminiKey,
  saveRzpKey,
  SUPER_VIP_SUB_PRICE_INR,
  SUPER_VIP_UNLOCK_STORAGE_KEY,
  trackAnalyticsEvent,
} from '../config/merchant';
import type { AdConfigState } from './AdSettingsApp';
import { DirectUpiFallbackBox } from './DirectUpiFallbackBox';
import { SecurityAlertBadge } from './SecurityAlertBadge';
import { SunilGlowingBadge } from './SunilGlowingBadge';
import {
  GooglePayIcon,
  PaytmIcon,
  PhonePeIcon,
  RazorpayIcon,
} from './UpiIcons';
import { WatchAdModal } from './WatchAdModal';

interface AIMusicStudioAppProps {
  onBack: () => void;
  adConfig?: AdConfigState;
  onOpenReferEarn?: () => void;
  onOpenOwnerAnalytics?: () => void;
}

type LyricLanguage = 'hi' | 'hinglish' | 'en';
type CheckoutUpiChoice = 'gpay' | 'phonepe' | 'paytm' | 'upi';
type SelectedMusicPlan = 'music_500' | 'super_vip_999';

const VIP_UNLOCK_STORAGE_KEY = MUSIC_VIP_UNLOCK_STORAGE_KEY;
const FREE_TRIAL_USED_STORAGE_KEY = MUSIC_FREE_USED_STORAGE_KEY;
const FREE_TRIAL_LIMIT = MUSIC_FREE_TRIAL_LIMIT;
const MUSIC_PRICE_INR = MUSIC_SUB_PRICE_INR;

const GENRE_OPTIONS: { id: MusicGenre; label: string; defaultBpm: number }[] = [
  { id: 'bollywood_pop', label: 'Bollywood Pop', defaultBpm: 112 },
  { id: 'lofi_chill', label: 'Lo-Fi Chill', defaultBpm: 84 },
  { id: 'hiphop_rap', label: 'Hip-Hop / Rap', defaultBpm: 96 },
  { id: 'edm_club', label: 'EDM Club', defaultBpm: 128 },
  { id: 'romantic_acoustic', label: 'Romantic Acoustic', defaultBpm: 88 },
];

const MOOD_OPTIONS = ['Energetic', 'Romantic', 'Soulful', 'Party'] as const;

const DEFAULT_SONG = {
  title: 'Sapnon Ki Udaan',
  scale: 'A Minor',
  chords: 'Am - F - C - G',
  lyrics: `[Verse 1]
सूरज की किरणों से नया सवेरा है
दिल की धड़कन में बस एक बसेरा है
छू लेंगे आसमां हौसलों के पंख लगा के
हर मुश्किल को आज हमने पीछे छोड़ा है

[Chorus]
उड़ चलें हम आज़ाद आसमान में
गूंजे संगीत हर एक धड़कन में
Sunil Singh Studio की धुन पे झूम जा
नया इतिहास लिख दें इस जहान में

[Verse 2]
राहों में चमकते सितारे साथ हैं
मेहनत और जज़्बे की अनोखी बात है`,
};

function loadInitialUnlock(): boolean {
  return loadMusicVipUnlocked();
}

function loadFreeUsedCount(): number {
  try {
    const raw = Number(localStorage.getItem(FREE_TRIAL_USED_STORAGE_KEY));
    if (Number.isFinite(raw) && raw >= 0) {
      return Math.min(FREE_TRIAL_LIMIT, Math.floor(raw));
    }
  } catch {
    // Fallback
  }
  return 0;
}

export function AIMusicStudioApp({
  onBack,
  adConfig,
  onOpenReferEarn,
  onOpenOwnerAnalytics,
}: AIMusicStudioAppProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // VIP Access, 2 Free Songs Trial, Bonus Ad/Referral Credits & Owner Settings State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(loadInitialUnlock);
  const [freeUsed, setFreeUsed] = useState<number>(loadFreeUsedCount);
  const [bonusSongs, setBonusSongs] = useState<number>(() =>
    loadBonusCredits('music')
  );
  const [paywallDismissedForLastSong, setPaywallDismissedForLastSong] =
    useState(false);
  const [selectedPlan, setSelectedPlan] =
    useState<SelectedMusicPlan>('music_500');
  const [watchAdOpen, setWatchAdOpen] = useState(false);

  const [ownerKeyId, setOwnerKeyId] = useState<string>(loadSavedRzpKey);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState<string>(ownerKeyId);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState<string>(loadSavedGeminiKey);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerStatus, setOwnerStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [guard, setGuard] = useState<OwnerGuardState>(getOwnerGuardState);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Instant Razorpay Checkout & Direct UPI State
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [unlockBanner, setUnlockBanner] = useState<string | null>(null);
  const [upiPopup, setUpiPopup] = useState<{
    orderId: string;
    selectedApp: CheckoutUpiChoice;
    upiId: string;
    plan: SelectedMusicPlan;
    priceInr: number;
  } | null>(null);

  // Lyrics Writer & Song Config State
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<LyricLanguage>('hi');
  const [genre, setGenre] = useState<MusicGenre>('bollywood_pop');
  const [mood, setMood] = useState<string>('Energetic');
  const [songTitle, setSongTitle] = useState(DEFAULT_SONG.title);
  const [songScale, setSongScale] = useState(DEFAULT_SONG.scale);
  const [songChords, setSongChords] = useState(DEFAULT_SONG.chords);
  const [lyrics, setLyrics] = useState(DEFAULT_SONG.lyrics);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  // Track whether current song already counted toward the 2 free songs trial
  const currentSongCountedRef = useRef(false);

  // Synthesizer, Singing Vocals & Transport State
  const [bpm, setBpm] = useState<number>(112);
  const [drumsEnabled, setDrumsEnabled] = useState(true);
  const [bassEnabled, setBassEnabled] = useState(true);
  const [chordsEnabled, setChordsEnabled] = useState(true);
  const [vocalEnabled, setVocalEnabled] = useState(true);
  const [vocalGender, setVocalGender] = useState<'female' | 'male'>('female');
  const [vocalLang, setVocalLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [activeLyricLine, setActiveLyricLine] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeakingLyrics, setIsSpeakingLyrics] = useState(false);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState(0);

  // Live Audio & Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const vocalSessionRef = useRef<number>(0);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsKeepAliveRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const mixRef = useRef<SynthMixConfig>({
    bpm: 112,
    genre: 'bollywood_pop',
    scaleNotes: GENRE_SCALES.bollywood_pop.scale,
    chordProgression: GENRE_SCALES.bollywood_pop.chords,
    drumsEnabled: true,
    bassEnabled: true,
    chordsEnabled: true,
    vocalEnabled: true,
  });

  const freeSongsLeft = Math.max(0, FREE_TRIAL_LIMIT - freeUsed);
  const totalSongsAvailable = freeSongsLeft + bonusSongs;
  const isPaywallActive =
    !isUnlocked && totalSongsAvailable <= 0 && !paywallDismissedForLastSong;

  const isSuperVipPlan = selectedPlan === 'super_vip_999';
  const activePriceInr = isSuperVipPlan
    ? SUPER_VIP_SUB_PRICE_INR
    : MUSIC_PRICE_INR;
  const orderEndpoint = isSuperVipPlan
    ? '/api/vip/razorpay-order'
    : '/api/music/razorpay-order';
  const verifyEndpoint = isSuperVipPlan
    ? '/api/vip/verify-unlock'
    : '/api/music/verify-unlock';

  useEffect(() => {
    const syncAll = () => {
      setBonusSongs(loadBonusCredits('music'));
      setIsUnlocked(loadInitialUnlock());
      setGuard(getOwnerGuardState());
    };
    window.addEventListener(APP_STATE_SYNC_EVENT, syncAll);
    window.addEventListener('storage', syncAll);
    const interval = window.setInterval(() => setGuard(getOwnerGuardState()), 15000);
    return () => {
      window.removeEventListener(APP_STATE_SYNC_EVENT, syncAll);
      window.removeEventListener('storage', syncAll);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FREE_TRIAL_USED_STORAGE_KEY, String(freeUsed));
    } catch {
      // Ignore quota error
    }
  }, [freeUsed]);

  useEffect(() => {
    const preset = GENRE_SCALES[genre];
    mixRef.current = {
      bpm,
      genre,
      scaleNotes: preset.scale,
      chordProgression: preset.chords,
      drumsEnabled,
      bassEnabled,
      chordsEnabled,
      vocalEnabled,
    };
  }, [bpm, genre, drumsEnabled, bassEnabled, chordsEnabled, vocalEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const warmVoices = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // Ignore voice warmup errors
      }
    };
    warmVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', warmVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', warmVoices);
    };
  }, []);

  function stopVocalsOnly() {
    vocalSessionRef.current += 1;
    activeUtteranceRef.current = null;
    if (ttsKeepAliveRef.current !== null) {
      window.clearInterval(ttsKeepAliveRef.current);
      ttsKeepAliveRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingLyrics(false);
    setActiveLyricLine('');
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(0.8, audioCtxRef.current.currentTime, 0.08);
    }
  }

  function stopPlayback() {
    stopVocalsOnly();
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    masterGainRef.current = null;
    analyserRef.current = null;
    noiseBufferRef.current = null;
    stepRef.current = 0;
    setIsPlaying(false);
    setActiveBarIndex(0);
  }

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Draw idle or live spectrum visualizer
  useEffect(() => {
    if (isPaywallActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function drawFrame() {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#09090d';
      ctx.fillRect(0, 0, w, h);

      const barCount = 36;
      const gap = 4;
      const barW = (w - gap * (barCount - 1) - 16) / barCount;

      let freqData: Uint8Array<ArrayBuffer> | null = null;
      if (analyserRef.current && isPlaying) {
        freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
      }

      for (let i = 0; i < barCount; i++) {
        const val = freqData
          ? freqData[Math.min(freqData.length - 1, Math.floor(i * 1.6))] / 255
          : 0.08 + 0.05 * Math.sin(i * 0.45);
        const barH = Math.max(6, val * (h - 20));
        const x = 8 + i * (barW + gap);
        const y = h - 10 - barH;

        const grad = ctx.createLinearGradient(x, y, x, h - 10);
        grad.addColorStop(0, '#fde047');
        grad.addColorStop(0.45, '#ec4899');
        grad.addColorStop(0.8, '#22d3ee');
        grad.addColorStop(1, '#7c3aed');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 3);
        ctx.fill();
      }

      if (isPlaying) {
        rafIdRef.current = requestAnimationFrame(drawFrame);
      }
    }

    drawFrame();

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, isPaywallActive]);

  function pickIndianVoice(
    targetLang: 'hi-IN' | 'en-IN',
    gender: 'female' | 'male',
    lineText: string
  ): { voice: SpeechSynthesisVoice | null; resolvedLang: string } {
    const hasDevanagari = /[\u0900-\u097F]/.test(lineText);
    const resolvedLang = hasDevanagari ? 'hi-IN' : targetLang;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return { voice: null, resolvedLang };
    }
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return { voice: null, resolvedLang };

    const langPrefix = resolvedLang.slice(0, 2).toLowerCase();
    const sameLang = voices.filter((v) =>
      v.lang.toLowerCase().startsWith(langPrefix) || v.lang.toLowerCase().includes('in')
    );
    const pool = sameLang.length > 0 ? sameLang : voices;
    const femaleHints = ['female', 'woman', 'lekha', 'heera', 'swara', 'kalpana', 'aditi', 'veena', 'raveena', 'neerja', 'google हिन्दी'];
    const maleHints = ['male', 'man', 'madhur', 'prabhat', 'rishi', 'hemant', 'amit'];
    const hints = gender === 'female' ? femaleHints : maleHints;

    const exactLangVoice = pool.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langPrefix) &&
        hints.some((h) => v.name.toLowerCase().includes(h))
    );
    if (exactLangVoice) return { voice: exactLangVoice, resolvedLang };

    const langMatch = pool.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    return { voice: langMatch || pool[0] || null, resolvedLang };
  }

  function startSingingLines(overrideGender?: 'female' | 'male', overrideLang?: 'hi-IN' | 'en-IN') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const lines = lyrics
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^\[.*\]$/.test(l));

    if (lines.length === 0) return;

    window.speechSynthesis.cancel();
    if (ttsKeepAliveRef.current !== null) {
      window.clearInterval(ttsKeepAliveRef.current);
      ttsKeepAliveRef.current = null;
    }

    const sessionId = ++vocalSessionRef.current;
    const activeGender = overrideGender ?? vocalGender;
    const activeLang = overrideLang ?? vocalLang;
    setIsSpeakingLyrics(true);

    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(0.42, audioCtxRef.current.currentTime, 0.08);
    }

    // Prevent Chromium 15s TTS stall during continuous song playback
    ttsKeepAliveRef.current = window.setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 3500);

    const speakLineAt = (idx: number) => {
      if (vocalSessionRef.current !== sessionId) return;
      if (idx >= lines.length) {
        activeUtteranceRef.current = null;
        if (ttsKeepAliveRef.current !== null) {
          window.clearInterval(ttsKeepAliveRef.current);
          ttsKeepAliveRef.current = null;
        }
        setIsSpeakingLyrics(false);
        setActiveLyricLine('');
        if (masterGainRef.current && audioCtxRef.current) {
          masterGainRef.current.gain.setTargetAtTime(0.82, audioCtxRef.current.currentTime, 0.12);
        }
        return;
      }

      const text = lines[idx];
      setActiveLyricLine(text);

      const utter = new SpeechSynthesisUtterance(text);
      activeUtteranceRef.current = utter;
      const { voice, resolvedLang } = pickIndianVoice(activeLang, activeGender, text);
      utter.lang = resolvedLang;
      if (voice) utter.voice = voice;

      // Calibrate pitch & tempo smoothly to song BPM and Male/Female selection
      const bpmRatio = Math.min(1.12, Math.max(0.84, bpm / 112));
      utter.rate = Number((0.92 * bpmRatio).toFixed(2));
      utter.pitch = activeGender === 'female' ? 1.15 : 0.84;
      utter.volume = 1;

      utter.onend = () => {
        if (vocalSessionRef.current !== sessionId) return;
        window.setTimeout(() => speakLineAt(idx + 1), 160);
      };
      utter.onerror = () => {
        if (vocalSessionRef.current !== sessionId) return;
        activeUtteranceRef.current = null;
        if (ttsKeepAliveRef.current !== null) {
          window.clearInterval(ttsKeepAliveRef.current);
          ttsKeepAliveRef.current = null;
        }
        setIsSpeakingLyrics(false);
        setActiveLyricLine('');
      };

      window.speechSynthesis.speak(utter);
    };

    speakLineAt(0);
  }

  function startPlayback() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vocalEnabled ? 0.42 : 0.85, ctx.currentTime);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    masterGainRef.current = masterGain;
    analyserRef.current = analyser;
    noiseBufferRef.current = createLiveNoiseBuffer(ctx);
    stepRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;

    setIsPlaying(true);

    timerIdRef.current = window.setInterval(() => {
      if (!audioCtxRef.current || !noiseBufferRef.current) return;
      const ac = audioCtxRef.current;
      const cfg = mixRef.current;
      const stepSec = 60 / cfg.bpm / 4;

      while (nextNoteTimeRef.current < ac.currentTime + 0.16) {
        const currentStep = stepRef.current;
        schedulePatternStep(
          ac,
          masterGain,
          noiseBufferRef.current,
          currentStep,
          nextNoteTimeRef.current,
          cfg
        );
        if (currentStep % 16 === 0) {
          setActiveBarIndex(
            Math.floor(currentStep / 16) % cfg.chordProgression.length
          );
        }
        nextNoteTimeRef.current += stepSec;
        stepRef.current += 1;
      }
    }, 25);

    if (vocalEnabled) {
      startSingingLines();
    }
  }

  function completeInstantUnlock(bannerMessage: string, isSuperVip = false) {
    if (isSuperVip) {
      activateSuperVipEverywhere();
    } else {
      grantMusicVipUnlocked();
    }
    setUpiPopup(null);
    setPayError(null);
    setIsOwnerModalOpen(false);
    setPaywallDismissedForLastSong(false);
    setIsUnlocked(true);
    setUnlockBanner(bannerMessage);
    setTimeout(() => setUnlockBanner(null), 4500);
  }

  async function handleInstallAppClick() {
    if (isInstallable) {
      await install();
      return;
    }
    setShowInstallGuide(true);
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
              : `AI Music Studio Subscription (₹${chosenPrice}/Month)`,
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
          theme: { color: chosenPlan === 'super_vip_999' ? '#f59e0b' : '#ec4899' },
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
                throw new Error(
                  verifyData?.error || 'Payment verification failed.'
                );
              }
              completeInstantUnlock(
                chosenPlan === 'super_vip_999'
                  ? `Payment ₹${chosenPrice} successful (${verifyData.paymentId}) — Super VIP Pass unlocked for AI Music Studio & AI App Builder!`
                  : `Payment ₹${chosenPrice} successful (${verifyData.paymentId}) — Unlimited Songs & Downloads unlocked forever!`,
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

      // Built-in Razorpay UPI Checkout Popup when no live Key ID is pasted yet
      setUpiPopup({
        orderId: orderData.orderId,
        selectedApp: 'gpay',
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
        : '/api/music/verify-unlock';

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
      completeInstantUnlock(
        upiPopup.plan === 'super_vip_999'
          ? `₹${upiPopup.priceInr} Super VIP Pass Verified — Builder & AI Music Studio unlocked!`
          : '₹500 UPI Payment Verified — Unlimited AI Music Studio unlocked forever!',
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
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.unlocked) {
        throw new Error(verifyData?.error || 'UTR verification failed.');
      }
      completeInstantUnlock(
        isSuperVipPlan
          ? `Direct UPI UTR ${utr} verified — Super VIP ₹${activePriceInr}/Month unlocked for Builder & Music!`
          : `Direct UPI UTR ${utr} verified — AI Music Studio ₹${activePriceInr}/Month unlocked!`,
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
        ? 'Razorpay Live Key ID saved! Checkout will route payments via your key.'
        : 'Razorpay Key ID cleared.',
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
      completeInstantUnlock(
        'Welcome Sunil Singh! Permanent Unlimited Free Access unlocked everywhere.'
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

  function handleOwnerResetTrial() {
    stopPlayback();
    revokeUnlockStorageForTesting([
      OWNER_UNLIMITED_STORAGE_KEY,
      SUPER_VIP_UNLOCK_STORAGE_KEY,
      VIP_UNLOCK_STORAGE_KEY,
    ]);
    try {
      localStorage.setItem(FREE_TRIAL_USED_STORAGE_KEY, '0');
    } catch {
      // Ignore
    }
    currentSongCountedRef.current = false;
    setPaywallDismissedForLastSong(false);
    setIsUnlocked(false);
    setFreeUsed(0);
    setIsOwnerModalOpen(false);
  }

  function handleOwnerForcePaywall() {
    stopPlayback();
    revokeUnlockStorageForTesting([
      OWNER_UNLIMITED_STORAGE_KEY,
      SUPER_VIP_UNLOCK_STORAGE_KEY,
      VIP_UNLOCK_STORAGE_KEY,
    ]);
    try {
      localStorage.setItem(FREE_TRIAL_USED_STORAGE_KEY, String(FREE_TRIAL_LIMIT));
    } catch {
      // Ignore
    }
    setPaywallDismissedForLastSong(false);
    setIsUnlocked(false);
    setFreeUsed(FREE_TRIAL_LIMIT);
    setIsOwnerModalOpen(false);
  }

  function consumeOneSongCredit(): number {
    if (freeUsed < FREE_TRIAL_LIMIT) {
      const nextUsed = Math.min(FREE_TRIAL_LIMIT, freeUsed + 1);
      setFreeUsed(nextUsed);
      const remaining = Math.max(0, FREE_TRIAL_LIMIT - nextUsed) + bonusSongs;
      return remaining;
    }
    if (bonusSongs > 0) {
      consumeBonusCredit('music');
      const nextBonus = Math.max(0, bonusSongs - 1);
      setBonusSongs(nextBonus);
      return nextBonus;
    }
    return 0;
  }

  async function handleGenerateLyrics(e: React.FormEvent) {
    e.preventDefault();
    if (!isUnlocked && totalSongsAvailable <= 0) {
      stopPlayback();
      setPaywallDismissedForLastSong(false);
      return;
    }

    const cleanedTopic = topic.trim();
    if (!cleanedTopic || isGeneratingLyrics) return;

    setLyricsError(null);
    setIsGeneratingLyrics(true);

    try {
      let generatedTitle = `${cleanedTopic.slice(0, 28)}`;
      let generatedScale = 'A Minor';
      let generatedChords = 'Am - F - C - G';
      let generatedBpm = bpm;
      let generatedLyrics = '';

      try {
        const res = await fetch('/api/music/lyrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: cleanedTopic,
            genre,
            mood,
            language,
            geminiApiKey: loadSavedGeminiKey() || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && data?.lyrics) {
          generatedTitle = String(data.title || generatedTitle);
          generatedScale = String(data.scale || generatedScale);
          generatedChords = String(data.chords || generatedChords);
          generatedLyrics = String(data.lyrics);
          if (typeof data.bpm === 'number' && data.bpm >= 70 && data.bpm <= 160) {
            generatedBpm = Math.round(data.bpm);
          }
        }
      } catch {
        // Use instant local lyric composer below
      }

      if (!generatedLyrics) {
        if (language === 'hi') {
          generatedTitle = `${cleanedTopic.slice(0, 24)} की धुन`;
          generatedLyrics = `[Verse 1]\n${cleanedTopic} की प्यारी सी कहानी आज सुनाते हैं\nदिल की धड़कन में नया एक साज़ सजाते हैं\nरंग बिरंगे ख़्वाबों में संगीत जगाते हैं\nAI1999 स्टूडियो में सुर ताल मिलाते हैं\n\n[Chorus]\nझूम उठे ये सारा जहाँ, गूंजे मधुर तराना\n${cleanedTopic} के संग गुनगुनाए हर दीवाना\nSunil Singh Studio की बीट पे नाच ले आज\nदिल से निकला ये गीत बनेगा सबसे ख़ास\n\n[Verse 2]\nचाँद सितारों जैसी चमक है हर एक बोल में\nमीठे सुरों की जादुई लहर बसी है ढोल में`;
        } else if (language === 'hinglish') {
          generatedTitle = `${cleanedTopic.slice(0, 24)} Vibes`;
          generatedLyrics = `[Verse 1]\nRaaton ke shehar mein ${cleanedTopic} ka naya junoon hai\nDil ki har dhadkan mein bajta pyaara sa sukoon hai\nChalte jaayein aage hum bina kisi dar ke aaj\nAI1999 Music Studio pe chhaa gaya apna raaj\n\n[Chorus]\nO gaa le dil khol ke, sun le ye zamana\n${cleanedTopic} pe bana hai apna superhit gaana\nBeat drop hoti jab ${mood.toLowerCase()} wali shaam mein\nHar koi jhoome aaj Sunil Singh ke naam mein\n\n[Verse 2]\nHaathon mein haath aur aankhon mein chamak nayi\nYe dhun dil ko chhoo jaaye, lagti sabse sahi`;
        } else {
          generatedTitle = `${cleanedTopic.slice(0, 24)} Anthem`;
          generatedLyrics = `[Verse 1]\nTurning up the rhythm for ${cleanedTopic} tonight\nEvery beat is glowing under neon golden light\nHear the melody rising with a ${mood.toLowerCase()} soul\nAI1999 Music Studio making every moment whole\n\n[Chorus]\nSing it loud across the sky, let the bassline roll\nFeel the fire of ${cleanedTopic} deep inside your soul\nWith Sunil Singh Studio beats playing crystal clear\nThis is our anthem echoing all through the year`;
        }
      }

      setSongTitle(generatedTitle);
      setSongScale(generatedScale);
      setSongChords(generatedChords);
      setLyrics(generatedLyrics);
      setBpm(generatedBpm);

      trackAnalyticsEvent('music_create', {
        label: `AI Song created: ${generatedTitle}`,
      });

      if (!isUnlocked) {
        const remainingAfter = consumeOneSongCredit();
        currentSongCountedRef.current = true;
        // Let the user play and download their final free song before locking
        if (remainingAfter <= 0) {
          setPaywallDismissedForLastSong(true);
        }
      }
    } catch (err: unknown) {
      setLyricsError(
        err instanceof Error ? err.message : 'Lyrics generation failed.'
      );
    } finally {
      setIsGeneratingLyrics(false);
    }
  }

  function handleSpeakLyrics() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakingLyrics) {
      stopVocalsOnly();
      return;
    }
    startSingingLines();
  }

  async function handleDownloadWav() {
    if (isExportingWav) return;
    if (!isUnlocked && totalSongsAvailable <= 0 && !currentSongCountedRef.current) {
      stopPlayback();
      setPaywallDismissedForLastSong(false);
      return;
    }

    setIsExportingWav(true);
    try {
      const blob = await renderSongToWavBlob(mixRef.current, 8);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const slug =
        songTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'ai1999-track';
      link.href = url;
      link.download = `${slug}-ai1999-music-studio.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1200);

      if (!isUnlocked) {
        let remainingAfter = totalSongsAvailable;
        if (!currentSongCountedRef.current) {
          remainingAfter = consumeOneSongCredit();
        }
        currentSongCountedRef.current = false;

        if (remainingAfter <= 0) {
          // Automatically transition to VIP Paywall after last free song download completes
          setTimeout(() => {
            stopPlayback();
            setPaywallDismissedForLastSong(false);
          }, 650);
        }
      }
    } finally {
      setIsExportingWav(false);
    }
  }

  function handleCopyLyrics() {
    navigator.clipboard?.writeText(`${songTitle}\n\n${lyrics}`).then(() => {
      setCopiedLyrics(true);
      setTimeout(() => setCopiedLyrics(false), 1600);
    });
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden relative">
      {/* Top Studio Header */}
      <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-zinc-800/90 bg-[#111116] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 via-amber-500 to-purple-600 flex items-center justify-center text-white shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">
              AI Music Studio
            </h2>
          </div>

          {/* Trial / VIP Status Readout */}
          <span className="hidden md:inline-flex items-center gap-1.5 pl-2 border-l border-zinc-800 text-xs font-medium whitespace-nowrap">
            {isUnlocked ? (
              <span className="text-emerald-400 font-semibold">
                VIP Unlimited Active
              </span>
            ) : (
              <span
                className={
                  totalSongsAvailable > 0 ? 'text-amber-300 font-semibold' : 'text-rose-400 font-semibold'
                }
              >
                Free Trial: {freeSongsLeft} of {FREE_TRIAL_LIMIT} Songs Left
                {bonusSongs > 0 ? ` (+${bonusSongs} Bonus)` : ''}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Prominent Install / Download App PWA Button */}
          {!isInstalled && (
            <button
              type="button"
              onClick={handleInstallAppClick}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] sm:text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
              title="Install / Download App onto your mobile home screen"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install / Download App</span>
              <span className="sm:hidden">Install App</span>
            </button>
          )}

          {/* Prominent Glowing "Sunil Singh • 1999" Badge */}
          <SunilGlowingBadge compact />

          {/* Small Owner Settings Gear Icon in Corner */}
          <button
            type="button"
            onClick={() => {
              setKeyDraft(ownerKeyId);
              setGeminiKeyDraft(loadSavedGeminiKey());
              setOwnerStatus(null);
              setIsOwnerModalOpen(true);
            }}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Owner Settings (Sunil Singh)"
            aria-label="Owner Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Free Trial Banner Row (compact on small screens) */}
      <div className="md:hidden shrink-0 px-3 py-1.5 border-b border-zinc-800/80 bg-[#0d0d13] flex items-center justify-between gap-2 text-xs">
        {isUnlocked ? (
          <span className="text-emerald-400 font-semibold">
            VIP Unlimited Unlocked
          </span>
        ) : (
          <>
            <span
              className={`font-semibold ${
                totalSongsAvailable > 0 ? 'text-amber-300' : 'text-rose-400'
              }`}
            >
              Free Trial: {freeSongsLeft} of {FREE_TRIAL_LIMIT} Left
              {bonusSongs > 0 ? ` (+${bonusSongs} Bonus)` : ''}
            </span>
            {totalSongsAvailable > 0 && (
              <button
                type="button"
                onClick={handlePayAndUnlockInstantly}
                className="text-[11px] font-semibold text-pink-400 hover:text-pink-300 underline underline-offset-2"
              >
                Unlock Unlimited ₹500
              </button>
            )}
          </>
        )}
      </div>

      {/* Main Content Area: Automatic ₹500/Mo or ₹999/Mo Super VIP Paywall OR Full Studio */}
      {isPaywallActive ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(236,72,153,0.16),_transparent_58%)]">
          <div className="w-full max-w-lg rounded-3xl p-[1.5px] chargpt-rainbow-border shadow-2xl my-auto">
            <div className="rounded-[22px] bg-[#0e0e13] p-5 sm:p-6 space-y-4 text-center">
              <div className="mx-auto flex justify-center">
                <SunilGlowingBadge variant="hero" />
              </div>

              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 via-pink-500/20 to-purple-500/20 border border-amber-300/40 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-300" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/35 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{MERCHANT_OFFICIAL_LABEL}</span>
                </div>
                <div className="text-xs font-semibold text-rose-400">
                  Free Trial Ended · 0 of 2 Songs Left
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight chargpt-rainbow-text">
                  Your 2 Free Songs are used!
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Subscribe for ₹{MUSIC_PRICE_INR}/Mo, upgrade to ₹{SUPER_VIP_SUB_PRICE_INR}/Mo Super VIP Pass, or watch a quick sponsor ad.
                </p>
              </div>

              {/* Plan Switcher: ₹500/Mo Music VIP vs ₹999/Mo All-Access Super VIP */}
              <div className="grid grid-cols-2 gap-2.5 text-left">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('music_500')}
                  className={`rounded-2xl border p-3 transition-all ${
                    selectedPlan === 'music_500'
                      ? 'border-pink-400 bg-pink-500/15 shadow-[0_0_20px_rgba(236,72,153,0.22)]'
                      : 'border-zinc-800 bg-[#13131a] hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-pink-300">
                    AI Music VIP
                  </div>
                  <div className="font-mono text-lg font-extrabold text-zinc-50 tabular-nums">
                    ₹{MUSIC_PRICE_INR}
                    <span className="text-[10px] font-normal text-zinc-400">/Mo</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Unlimited Songs &amp; .WAV
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('super_vip_999')}
                  className={`rounded-2xl border p-3 transition-all ${
                    selectedPlan === 'super_vip_999'
                      ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
                      : 'border-zinc-800 bg-[#13131a] hover:border-amber-400/40'
                  }`}
                >
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Super VIP Pass
                  </div>
                  <div className="font-mono text-lg font-extrabold text-zinc-50 tabular-nums">
                    ₹{SUPER_VIP_SUB_PRICE_INR}
                    <span className="text-[10px] font-normal text-zinc-400">/Mo</span>
                  </div>
                  <div className="text-[10px] text-amber-200/90 mt-0.5 font-medium">
                    Music + App Builder
                  </div>
                </button>
              </div>

              {/* Price & Instant Benefits */}
              <div className="rounded-2xl border border-zinc-800 bg-[#13131a] p-4 space-y-2.5 text-left">
                <div className="flex items-baseline justify-between border-b border-zinc-800/80 pb-2.5">
                  <span className="text-xs font-medium text-zinc-400">
                    {isSuperVipPlan
                      ? 'All-Access Super VIP Pass (Best Value)'
                      : 'AI Music Studio Monthly Subscription'}
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
                    <span>Unlimited Hindi, Hinglish &amp; English AI Songs + .WAV</span>
                  </li>
                  {isSuperVipPlan ? (
                    <li className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="text-amber-200 font-semibold">
                        ALSO Unlocks Unlimited AI App Builder Pro (₹299 Value Included!)
                      </span>
                    </li>
                  ) : null}
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instant Auto-Unlock routed to {MERCHANT_CONTACT}</span>
                  </li>
                </ul>
              </div>

              {payError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200 text-left">
                  {payError}
                </div>
              )}

              {/* Primary Instant Razorpay Auto-Unlock Button + Watch Ad + Direct UPI Fallback */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePayAndUnlockInstantly}
                  disabled={isPaying}
                  className={`w-full py-3.5 px-5 rounded-2xl hover:brightness-110 disabled:opacity-50 font-display text-sm sm:text-base font-bold shadow-lg flex items-center justify-center gap-2 transition-all min-h-[50px] ${
                    isSuperVipPlan
                      ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-zinc-950 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white shadow-pink-600/25'
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWatchAdOpen(true)}
                    className="py-2.5 px-3 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 transition-colors min-h-[42px]"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Watch Sponsor Ad (+1 Free Song)</span>
                  </button>
                  {onOpenReferEarn && (
                    <button
                      type="button"
                      onClick={onOpenReferEarn}
                      className="py-2.5 px-3 rounded-xl border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5 transition-colors min-h-[42px]"
                    >
                      <Gift className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>Refer &amp; Earn Free Songs</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 pt-0.5 text-[11px] text-zinc-400">
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
                      : `AI Music Studio ${activePriceInr} Monthly`
                  }
                  onVerifyUtr={handleVerifyDirectUtr}
                  verifyingUtr={isVerifyingUtr}
                />

                {!isInstalled && (
                  <button
                    type="button"
                    onClick={handleInstallAppClick}
                    className="w-full py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    Install / Download App to Home Screen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full AI Music Studio Workspace (Free 2-Song Trial OR Unlimited VIP) */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel: Hindi/English AI Lyrics Writer */}
          <div className="lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-[#0d0d12] overflow-y-auto p-4 space-y-4 max-h-[45vh] lg:max-h-none">
            {unlockBanner && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{unlockBanner}</span>
              </div>
            )}

            {!isUnlocked && freeSongsLeft === 0 && paywallDismissedForLastSong && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-2">
                <div className="font-semibold">
                  2nd Free Song Ready! Download your .WAV track now.
                </div>
                <button
                  type="button"
                  onClick={handlePayAndUnlockInstantly}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-pink-500 text-white font-semibold text-xs"
                >
                  Pay ₹{MUSIC_PRICE_INR}/Month &amp; Unlock Unlimited
                </button>
              </div>
            )}

            <form onSubmit={handleGenerateLyrics} className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-pink-400" />
                  Hindi / English Lyrics Writer
                </h3>
                <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap">
                  {isUnlocked
                    ? 'Unlimited'
                    : `${totalSongsAvailable} left`}
                </span>
              </div>

              {/* Language Selector */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                {(
                  [
                    { id: 'hi', label: 'हिंदी' },
                    { id: 'hinglish', label: 'Hinglish' },
                    { id: 'en', label: 'English' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLanguage(item.id);
                      setVocalLang(item.id === 'en' ? 'en-IN' : 'hi-IN');
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      language === item.id
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Genre & Mood */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label
                    htmlFor="music-genre"
                    className="block text-[11px] font-medium text-zinc-400"
                  >
                    Genre / Style
                  </label>
                  <select
                    id="music-genre"
                    value={genre}
                    onChange={(e) => {
                      const nextGenre = e.target.value as MusicGenre;
                      setGenre(nextGenre);
                      const found = GENRE_OPTIONS.find(
                        (g) => g.id === nextGenre
                      );
                      if (found) setBpm(found.defaultBpm);
                    }}
                    className="w-full rounded-xl border border-zinc-800 bg-[#121218] px-2.5 py-2 text-xs text-zinc-100 focus:border-pink-500 focus:outline-none"
                  >
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="music-mood"
                    className="block text-[11px] font-medium text-zinc-400"
                  >
                    Mood
                  </label>
                  <select
                    id="music-mood"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-[#121218] px-2.5 py-2 text-xs text-zinc-100 focus:border-pink-500 focus:outline-none"
                  >
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Song Topic Input */}
              <div className="space-y-1">
                <label
                  htmlFor="music-topic"
                  className="block text-[11px] font-medium text-zinc-400"
                >
                  Song Theme / Story
                </label>
                <textarea
                  id="music-topic"
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'जैसे: दोस्ती और बारिश की शाम, या सपनों की उड़ान...'
                      : 'e.g., Midnight highway drive under city neon lights...'
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-[#121218] p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>

              {lyricsError && (
                <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-2.5 text-[11px] text-red-200">
                  {lyricsError}
                </div>
              )}

              {!isUnlocked && freeSongsLeft <= 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setPaywallDismissedForLastSong(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:brightness-110 text-xs font-bold text-white inline-flex items-center justify-center gap-1.5 transition-all min-h-[42px]"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock Unlimited Songs (₹{MUSIC_PRICE_INR})
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!topic.trim() || isGeneratingLyrics}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 disabled:opacity-40 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-all min-h-[42px]"
                >
                  {isGeneratingLyrics ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Writing Song Lyrics...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Generate Lyrics &amp; Track
                    </>
                  )}
                </button>
              )}
            </form>

            {/* Quick Mix Layers */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Synthesizer Mix
                </span>
                <span className="font-mono text-amber-300 tabular-nums">
                  {bpm} BPM
                </span>
              </div>
              <input
                type="range"
                min="70"
                max="160"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                aria-label="Tempo BPM"
                className="w-full accent-pink-500 cursor-pointer"
              />

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      label: 'Drums',
                      active: drumsEnabled,
                      toggle: () => setDrumsEnabled((p) => !p),
                    },
                    {
                      label: 'Bassline',
                      active: bassEnabled,
                      toggle: () => setBassEnabled((p) => !p),
                    },
                    {
                      label: 'Chord Pad',
                      active: chordsEnabled,
                      toggle: () => setChordsEnabled((p) => !p),
                    },
                    {
                      label: 'Vocal Synth',
                      active: vocalEnabled,
                      toggle: () => {
                        const next = !vocalEnabled;
                        setVocalEnabled(next);
                        if (isPlaying) {
                          if (next) {
                            startSingingLines();
                          } else {
                            stopVocalsOnly();
                          }
                        }
                      },
                    },
                  ] as const
                ).map((layer) => (
                  <button
                    key={layer.label}
                    type="button"
                    onClick={layer.toggle}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors text-left flex items-center justify-between ${
                      layer.active
                        ? 'border-pink-500/50 bg-pink-500/15 text-zinc-100'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    <span>{layer.label}</span>
                    <span className="text-[10px]">
                      {layer.active ? 'ON' : 'OFF'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center Panel: Live Synth Deck, Visualizer, .WAV Download & Lyrics Sheet */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#09090b]">
            {/* Transport & Live Visualizer Card */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 ${
                      isPlaying ? 'animate-spin' : ''
                    }`}
                  >
                    <Disc3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      aria-label="Song Title"
                      className="font-display text-base font-bold text-zinc-100 bg-transparent border-b border-transparent focus:border-pink-500 focus:outline-none w-full"
                    />
                    <div className="text-xs text-zinc-400">
                      {songScale} · {songChords} · Bar {activeBarIndex + 1}/4
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={startPlayback}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors min-h-[40px] ${
                      isPlaying
                        ? 'bg-red-600 hover:bg-red-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        Stop Song &amp; Music
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Play Singing + Music
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadWav}
                    disabled={isExportingWav}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors min-h-[40px]"
                  >
                    {isExportingWav ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Rendering WAV...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Download .WAV Song
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Indian / Hindi Singer Voice & Beat Sync Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/80 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-zinc-400 mr-1">
                    AI Singer Voice:
                  </span>
                  {(
                    [
                      { id: 'female', label: 'Female Voice' },
                      { id: 'male', label: 'Male Voice' },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setVocalGender(g.id);
                        if (isPlaying && vocalEnabled) {
                          startSingingLines(g.id, vocalLang);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                        vocalGender === g.id
                          ? 'border-pink-400/60 bg-pink-500/20 text-pink-200'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                  {(
                    [
                      { id: 'hi-IN', label: 'Hindi (hi-IN)' },
                      { id: 'en-IN', label: 'Indian EN (en-IN)' },
                    ] as const
                  ).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setVocalLang(l.id);
                        if (isPlaying && vocalEnabled) {
                          startSingingLines(vocalGender, l.id);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                        vocalLang === l.id
                          ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                {activeLyricLine && (
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-[11px] text-emerald-200 font-medium truncate max-w-full">
                    Singing: {activeLyricLine}
                  </div>
                )}
              </div>

              {/* 60fps Audio Spectrum Canvas */}
              <canvas
                ref={canvasRef}
                width={680}
                height={110}
                className="w-full h-24 rounded-xl border border-zinc-800/80 block"
              />
            </div>

            {/* Song Lyrics Sheet */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Mic2 className="w-3.5 h-3.5 text-amber-400" />
                  Song Lyrics Sheet
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSpeakLyrics}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-medium text-zinc-200 transition-colors"
                  >
                    {isSpeakingLyrics ? (
                      <>
                        <VolumeX className="w-3 h-3 text-amber-400" />
                        Stop Vocal
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        Recite Lyrics
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLyrics}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-medium text-zinc-200 transition-colors"
                  >
                    {copiedLyrics ? (
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

              <textarea
                rows={12}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                aria-label="Editable song lyrics"
                className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0f] p-3.5 text-sm text-zinc-100 leading-relaxed focus:border-pink-500 focus:outline-none resize-y"
              />
            </div>
          </div>

          {/* Desktop Side Glowing Branding Panel */}
          <aside
            aria-label="AI Music Studio creator showcase: Sunil Singh"
            className="hidden xl:flex shrink-0 w-48 border-l border-zinc-800/80 bg-[#0b0b10] relative overflow-hidden flex-col items-center justify-center p-4 select-none"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 chargpt-neon-aura bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.22),transparent_50%),radial-gradient(circle_at_75%_50%,rgba(236,72,153,0.22),transparent_52%),radial-gradient(circle_at_40%_85%,rgba(34,211,238,0.24),transparent_55%)]"
            />
            <div className="relative z-10 w-full h-full max-h-[420px] rounded-2xl p-[1.5px] chargpt-rainbow-border shadow-[0_0_28px_rgba(236,72,153,0.25)]">
              <div className="w-full h-full rounded-[14px] bg-[#0a0a0f]/95 px-4 py-6 flex flex-col items-center justify-between text-center">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 via-pink-500/20 to-cyan-400/20 border border-amber-300/40 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div className="space-y-2 my-auto py-4">
                  <div className="inline-flex items-center gap-1">
                    <BadgeCheck className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-semibold text-cyan-300">
                      VIP Producer
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-extrabold chargpt-rainbow-text">
                    Sunil Singh • 1999
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Hindi &amp; English AI Music Studio
                  </p>
                </div>
                <div className="w-full pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                  Studio WAV Engine
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Interactive Razorpay UPI Checkout Popup (when no Live Key ID is pasted) */}
      {upiPopup && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Razorpay UPI Checkout"
        >
          <form
            onSubmit={handleConfirmUpiPopup}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#111118] shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between gap-2">
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
                ₹{upiPopup.priceInr}/mo
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-center">
                <SunilGlowingBadge compact />
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-3 py-2 text-[11px] text-emerald-200 flex items-center justify-between">
                <span>Merchant Contact (Pre-filled)</span>
                <span className="font-mono font-bold">{MERCHANT_CONTACT}</span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-300">
                  Choose UPI App to Pay ₹{upiPopup.priceInr}/Month
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
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="music-upi-id"
                  className="block text-[11px] text-zinc-400"
                >
                  UPI ID (optional for GPay/PhonePe/Paytm)
                </label>
                <input
                  id="music-upi-id"
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

      {/* PWA Install / Download App Modal (when browser prompt isn't active directly) */}
      {showInstallGuide && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Install AI1999 App"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#121217] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <h3 className="font-display text-sm font-semibold text-zinc-100">
                  Install App to Phone Home Screen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                aria-label="Close install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <SunilGlowingBadge compact />
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-blue-400">01.</span>
                  <span>
                    Tap the{' '}
                    <strong className="text-zinc-100 inline-flex items-center gap-1">
                      Share <Share className="w-3.5 h-3.5 inline" />
                    </strong>{' '}
                    button in Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-blue-400">02.</span>
                  <span>
                    Scroll down and select{' '}
                    <strong className="text-zinc-100">
                      Add to Home Screen
                    </strong>
                    .
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-blue-400">01.</span>
                  <span>
                    Open the browser menu (<strong>⋮</strong> in Chrome or
                    address bar Install icon).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-blue-400">02.</span>
                  <span>
                    Tap{' '}
                    <strong className="text-zinc-100">
                      Install App / Add to Home screen
                    </strong>{' '}
                    to launch AI1999 &amp; AI Music Studio standalone.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-semibold text-white transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Owner Settings Modal (Sunil Singh: Razorpay Live Key ID + Owner Password) */}
      {isOwnerModalOpen && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Owner Settings"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111116] shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-zinc-100 truncate">
                  Owner Settings · Sunil Singh
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SunilGlowingBadge compact />
                <button
                  type="button"
                  onClick={() => setIsOwnerModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  aria-label="Close Owner Settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {onOpenOwnerAnalytics && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerModalOpen(false);
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

              {/* Razorpay Live Key ID */}
              <div className="space-y-2">
                <label
                  htmlFor="owner-rzp-key"
                  className="block text-xs font-medium text-zinc-200"
                >
                  Razorpay Live Key ID (Public)
                </label>
                <div className="flex gap-2">
                  <input
                    id="owner-rzp-key"
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
                <p className="text-[11px] text-zinc-500">
                  When saved, tapping &ldquo;Pay ₹500 &amp; Unlock Instantly&rdquo; opens Razorpay Checkout directly with your Live Key ID.
                </p>
              </div>

              {/* Optional Gemini API Key */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <label
                  htmlFor="owner-music-gemini-key"
                  className="block text-xs font-medium text-zinc-200"
                >
                  Gemini API Key (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="owner-music-gemini-key"
                    type="password"
                    value={geminiKeyDraft}
                    onChange={(e) => setGeminiKeyDraft(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveGeminiKey(geminiKeyDraft);
                      setOwnerStatus({
                        type: 'success',
                        text: geminiKeyDraft.trim()
                          ? 'Gemini API Key saved for AI Lyrics, App Builder & Turbo Search!'
                          : 'Gemini API Key cleared. Built-in instant offline composers stay active.',
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Owner Free Unlock Password */}
              {!isUnlocked ? (
                <form
                  onSubmit={handleOwnerFreeUnlock}
                  className="pt-4 border-t border-zinc-800/80 space-y-2.5"
                >
                  <label
                    htmlFor="owner-password"
                    className="block text-xs font-medium text-zinc-200 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Owner Free Unlock Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="owner-password"
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
              ) : null}

              {/* Testing / Trial Controls for Owner */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <div className="text-[11px] text-zinc-400">
                  Trial &amp; Paywall Testing Controls
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOwnerResetTrial}
                    className="py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200"
                  >
                    Reset 2 Free Songs
                  </button>
                  <button
                    type="button"
                    onClick={handleOwnerForcePaywall}
                    className="py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200"
                  >
                    Test ₹500 Paywall
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Watch Sponsor Ad for +1 Free Song Modal */}
      <WatchAdModal
        isOpen={watchAdOpen}
        rewardTarget="music"
        adConfig={adConfig}
        onClose={() => setWatchAdOpen(false)}
        onRewardGranted={() => {
          setBonusSongs(loadBonusCredits('music'));
          setUnlockBanner('Sponsor Ad Complete! +1 Free AI Music Song credit added.');
          setTimeout(() => setUnlockBanner(null), 4000);
        }}
      />
    </div>
  );
}
