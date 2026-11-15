import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Clapperboard,
  Crown,
  Download,
  Film,
  Image as ImageIcon,
  ImagePlus,
  KeyRound,
  Loader2,
  Lock,
  MonitorPlay,
  Music,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
  Unlock,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  activateOwnerUnlimitedEverywhere,
  activateSuperVipEverywhere,
  APP_STATE_SYNC_EVENT,
  attemptOwnerAuth,
  getOrCreateVisitorId,
  getOwnerGuardState,
  grantVideoVipUnlocked,
  loadRazorpayScript,
  loadSavedRzpKey,
  loadSavedVideoApiKey,
  loadSavedVideoProvider,
  loadVideoVipUnlocked,
  MERCHANT_CONTACT,
  MERCHANT_OFFICIAL_LABEL,
  OWNER_UNLIMITED_STORAGE_KEY,
  type OwnerGuardState,
  revokeUnlockStorageForTesting,
  saveRzpKey,
  saveVideoApiKey,
  saveVideoProvider,
  SUPER_VIP_SUB_PRICE_INR,
  SUPER_VIP_UNLOCK_STORAGE_KEY,
  trackAnalyticsEvent,
  VIDEO_FREE_TRIAL_LIMIT,
  VIDEO_FREE_USED_STORAGE_KEY,
  VIDEO_SUB_PRICE_INR,
  VIDEO_VIP_UNLOCK_STORAGE_KEY,
} from '../config/merchant';
import { AdsterraLiveBanner } from './AdsterraLiveBanner';
import { DirectUpiFallbackBox } from './DirectUpiFallbackBox';
import { SecurityAlertBadge } from './SecurityAlertBadge';
import { SunilGlowingBadge } from './SunilGlowingBadge';
import {
  GooglePayIcon,
  PaytmIcon,
  PhonePeIcon,
  RazorpayIcon,
} from './UpiIcons';

interface AIVideoStudioAppProps {
  onBack: () => void;
  onOpenOwnerAnalytics?: () => void;
}

type CreationMode = 'dual' | 'single' | 'story';
type AspectRatioOption = '9:16' | '16:9';
type VideoStyle = 'Cinematic' | 'Anime' | '3D Realistic';
type VideoDuration = 5 | 10;
type MusicTrackOption = 'Romantic' | 'Lo-Fi' | 'Party Beat' | 'Sad Emotional';
type CheckoutUpiChoice = 'gpay' | 'phonepe' | 'paytm' | 'upi';
type SelectedVideoPlan = 'video_500' | 'super_vip_999';
type ViralPresetId =
  | 'couple_hug'
  | 'wedding_cinema'
  | 'bollywood_dance'
  | 'romantic_rain'
  | 'neon_attitude'
  | 'best_friends';

interface ViralPresetOption {
  id: ViralPresetId;
  label: string;
  prompt: string;
  defaultOverlay: string;
  recommendedMusic: MusicTrackOption;
  captionTag: string;
}

const VIRAL_PRESETS: ViralPresetOption[] = [
  {
    id: 'couple_hug',
    label: '🤗 AI Couple Hug & Close-Up',
    prompt:
      'AI Couple Hug & golden sunset embrace with silky smooth portrait merge and floating hearts',
    defaultOverlay: 'Forever Together ❤️',
    recommendedMusic: 'Romantic',
    captionTag: 'COUPLE HUG & CLOSE-UP',
  },
  {
    id: 'wedding_cinema',
    label: '💍 Wedding & Pre-Wedding Cinema',
    prompt:
      'Royal Indian Pre-Wedding Cinema reel with warm chandelier bokeh, rose gold flare and slow-mo',
    defaultOverlay: 'Shubh Vivah · Two Souls, One Heart 💍',
    recommendedMusic: 'Romantic',
    captionTag: 'PRE-WEDDING CINEMA',
  },
  {
    id: 'bollywood_dance',
    label: '💃 Bollywood Dance & Beat Sync',
    prompt:
      'High-energy Bollywood Dance stage spotlights, rhythmic beat-sync zoom pulse and festive confetti',
    defaultOverlay: 'Dil Se Nacho · Beat Sync 🔥',
    recommendedMusic: 'Party Beat',
    captionTag: 'BOLLYWOOD BEAT SYNC',
  },
  {
    id: 'romantic_rain',
    label: '🌹 Romantic Rain & Rose Petals',
    prompt:
      'Dreamy monsoon romantic rain streaks with crimson rose petals drifting in slow motion',
    defaultOverlay: 'Bheegi Si Raatein · Just You & Me 🌹',
    recommendedMusic: 'Sad Emotional',
    captionTag: 'RAIN & ROSE PETALS',
  },
  {
    id: 'neon_attitude',
    label: '🔥 Neon Attitude & Slow-Mo',
    prompt:
      'Bold dark cyberpunk cyan & magenta neon light sweeps with dramatic slow-motion attitude zoom',
    defaultOverlay: 'Own The Vibe · Unstoppable 🔥',
    recommendedMusic: 'Party Beat',
    captionTag: 'NEON ATTITUDE SLOW-MO',
  },
  {
    id: 'best_friends',
    label: '✨ Best Friends Memory',
    prompt:
      'Sunlit golden hour best friends memory reel with warm nostalgic glow and drifting sparkles',
    defaultOverlay: 'Yaariyan Forever ✨',
    recommendedMusic: 'Lo-Fi',
    captionTag: 'BEST FRIENDS MEMORY',
  },
];

const MUSIC_TRACKS: Array<{
  id: MusicTrackOption;
  label: string;
  vibe: string;
}> = [
  { id: 'Romantic', label: 'Romantic', vibe: 'Warm Piano & Strings' },
  { id: 'Lo-Fi', label: 'Lo-Fi', vibe: 'Chill Mellow Chords' },
  { id: 'Party Beat', label: 'Party Beat', vibe: '124 BPM Bass & Synth' },
  { id: 'Sad Emotional', label: 'Sad Emotional', vibe: 'Deep Ballad & Cello' },
];

const QUICK_LYRIC_CHIPS = [
  'Forever Together ❤️',
  'तेरे बिना अब जीना नहीं ✨',
  'Two Hearts, One Story 💍',
  'Own The Vibe 🔥',
];

function loadInitialVideoUnlock(): boolean {
  return loadVideoVipUnlocked();
}

function loadVideoFreeUsed(): number {
  try {
    const raw = Number(localStorage.getItem(VIDEO_FREE_USED_STORAGE_KEY));
    if (Number.isFinite(raw) && raw >= 0) {
      return Math.min(VIDEO_FREE_TRIAL_LIMIT, Math.floor(raw));
    }
  } catch {
    // Fallback
  }
  return 0;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode photo.'));
    img.src = src;
  });
}

function drawCoverRectImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  zoom: number,
  panX = 0,
  panY = 0,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(targetX, targetY, targetW, targetH);
  ctx.clip();

  const imgRatio = img.width / img.height;
  const boxRatio = targetW / targetH;
  let drawW = targetW;
  let drawH = targetH;
  if (imgRatio > boxRatio) {
    drawH = targetH * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = targetW * zoom;
    drawH = drawW / imgRatio;
  }
  const x = targetX + (targetW - drawW) / 2 + panX;
  const y = targetY + (targetH - drawH) / 2 + panY;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

function drawHeartParticle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 16, size / 16);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-2, -3, -11, -3, -11, 3.5);
  ctx.bezierCurveTo(-11, 9, -4, 12.5, 0, 15.5);
  ctx.bezierCurveTo(4, 12.5, 11, 9, 11, 3.5);
  ctx.bezierCurveTo(11, -3, 2, -3, 0, 4);
  ctx.fill();
  ctx.restore();
}

function drawRosePetal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  angle: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkleStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.quadraticCurveTo(0, 0, 0, radius);
  ctx.quadraticCurveTo(0, 0, -radius, 0);
  ctx.quadraticCurveTo(0, 0, 0, -radius);
  ctx.fill();
  ctx.restore();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, 4);
}

function scheduleTrackAudio(
  ctx: AudioContext,
  dest: MediaStreamAudioDestinationNode,
  track: MusicTrackOption,
  durationSec: number
) {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.25, ctx.currentTime);
  master.connect(dest);

  const endAt = ctx.currentTime + durationSec;
  master.gain.setValueAtTime(0.25, Math.max(ctx.currentTime + 0.2, endAt - 0.85));
  master.gain.linearRampToValueAtTime(0.01, endAt);

  const chordMap: Record<MusicTrackOption, number[][]> = {
    Romantic: [
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [130.81, 196.0, 261.63, 329.63], // C
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    'Lo-Fi': [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [164.81, 196.0, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.0, 261.63], // Dm7
      [130.81, 164.81, 196.0, 246.94], // Cmaj7
    ],
    'Party Beat': [
      [146.83, 220.0, 293.66, 349.23], // Dm
      [116.54, 174.61, 233.08, 293.66], // Bb
      [130.81, 196.0, 261.63, 329.63], // C
      [220.0, 261.63, 329.63, 440.0], // Am
    ],
    'Sad Emotional': [
      [164.81, 196.0, 246.94, 329.63], // Em
      [130.81, 164.81, 196.0, 261.63], // C
      [196.0, 246.94, 293.66, 392.0], // G
      [146.83, 220.0, 293.66, 369.99], // D
    ],
  };

  const stepDur =
    track === 'Party Beat' ? 0.24 : track === 'Lo-Fi' ? 0.44 : track === 'Romantic' ? 0.5 : 0.65;
  const chords = chordMap[track];
  const startTime = ctx.currentTime + 0.05;
  const totalSteps = Math.ceil(durationSec / stepDur);

  for (let s = 0; s < totalSteps; s++) {
    const t = startTime + s * stepDur;
    const chord = chords[Math.floor(s / 4) % chords.length];

    if (s % 4 === 0) {
      chord.slice(0, 3).forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = track === 'Lo-Fi' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(track === 'Sad Emotional' ? 0.16 : 0.12, t + 0.16);
        g.gain.exponentialRampToValueAtTime(0.004, t + stepDur * 3.85);
        osc.connect(g);
        g.connect(master);
        osc.start(t);
        osc.stop(t + stepDur * 4);
      });
    }

    // Bass Kick for Party Beat & gentle Lo-Fi pulse
    if (track === 'Party Beat' && s % 2 === 0) {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(140, t);
      kick.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      kickGain.gain.setValueAtTime(0.32, t);
      kickGain.gain.exponentialRampToValueAtTime(0.002, t + 0.18);
      kick.connect(kickGain);
      kickGain.connect(master);
      kick.start(t);
      kick.stop(t + 0.19);
    }

    // Melody note
    const noteFreq = chord[s % chord.length] * (s % 8 === 7 ? 2 : 1);
    const melOsc = ctx.createOscillator();
    const melGain = ctx.createGain();
    melOsc.type =
      track === 'Party Beat'
        ? 'sawtooth'
        : track === 'Lo-Fi'
          ? 'triangle'
          : 'sine';
    melOsc.frequency.setValueAtTime(noteFreq, t);
    melGain.gain.setValueAtTime(0.001, t);
    melGain.gain.linearRampToValueAtTime(
      track === 'Party Beat' ? 0.09 : 0.16,
      t + 0.025
    );
    melGain.gain.exponentialRampToValueAtTime(0.003, t + stepDur * 0.9);
    melOsc.connect(melGain);
    melGain.connect(master);
    melOsc.start(t);
    melOsc.stop(t + stepDur);
  }
}

export function AIVideoStudioApp({
  onBack,
  onOpenOwnerAnalytics,
}: AIVideoStudioAppProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(loadInitialVideoUnlock);
  const [freeUsed, setFreeUsed] = useState<number>(loadVideoFreeUsed);
  const [paywallDismissedForCreatedVideo, setPaywallDismissedForCreatedVideo] =
    useState(false);
  const [selectedPlan, setSelectedPlan] =
    useState<SelectedVideoPlan>('video_500');

  // Creation Mode, Photos, Presets, Overlay, Aspect Ratio, Music Track
  const [creationMode, setCreationMode] = useState<CreationMode>('dual');
  const [photo1, setPhoto1] = useState<string>('');
  const [photo2, setPhoto2] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] =
    useState<ViralPresetId>('couple_hug');
  const [scenePrompt, setScenePrompt] = useState<string>(VIRAL_PRESETS[0].prompt);
  const [textOverlay, setTextOverlay] = useState<string>(
    VIRAL_PRESETS[0].defaultOverlay
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('9:16');
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('Cinematic');
  const [durationSec, setDurationSec] = useState<VideoDuration>(5);
  const [musicTrack, setMusicTrack] = useState<MusicTrackOption>('Romantic');
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);

  // Generation & Video Player State
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderPhase, setRenderPhase] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMimeExt, setVideoMimeExt] = useState<'webm' | 'mp4'>('webm');
  const [videoResolutionLabel, setVideoResolutionLabel] = useState('1080×1920 Full HD');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [unlockBanner, setUnlockBanner] = useState<string | null>(null);

  // Owner & Payment Modal State
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [ownerKeyId, setOwnerKeyId] = useState<string>(loadSavedRzpKey);
  const [keyDraft, setKeyDraft] = useState<string>(ownerKeyId);
  const [videoApiKeyDraft, setVideoApiKeyDraft] = useState<string>(
    loadSavedVideoApiKey
  );
  const [videoProviderDraft, setVideoProviderDraft] = useState<string>(
    loadSavedVideoProvider
  );
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerStatus, setOwnerStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isPaying, setIsPaying] = useState(false);
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [upiPopup, setUpiPopup] = useState<{
    orderId: string;
    selectedApp: CheckoutUpiChoice;
    upiId: string;
    plan: SelectedVideoPlan;
    priceInr: number;
  } | null>(null);

  const photo1InputRef = useRef<HTMLInputElement>(null);
  const photo2InputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoBlobUrlRef = useRef<string | null>(null);

  const freeVideosLeft = Math.max(0, VIDEO_FREE_TRIAL_LIMIT - freeUsed);
  const isPaywallActive =
    !isUnlocked && freeVideosLeft <= 0 && !paywallDismissedForCreatedVideo;

  const isSuperVipPlan = selectedPlan === 'super_vip_999';
  const activePriceInr = isSuperVipPlan
    ? SUPER_VIP_SUB_PRICE_INR
    : VIDEO_SUB_PRICE_INR;
  const orderEndpoint = isSuperVipPlan
    ? '/api/vip/razorpay-order'
    : '/api/video/razorpay-order';
  const verifyEndpoint = isSuperVipPlan
    ? '/api/vip/verify-unlock'
    : '/api/video/verify-unlock';

  useEffect(() => {
    function handleSync() {
      setIsUnlocked(loadInitialVideoUnlock());
      setOwnerKeyId(loadSavedRzpKey());
    }
    window.addEventListener(APP_STATE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(APP_STATE_SYNC_EVENT, handleSync);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIDEO_FREE_USED_STORAGE_KEY, String(freeUsed));
    } catch {
      // Ignore quota error
    }
  }, [freeUsed]);

  useEffect(() => {
    return () => {
      if (videoBlobUrlRef.current) {
        URL.revokeObjectURL(videoBlobUrlRef.current);
      }
    };
  }, []);

  function handlePhotoUpload(
    slot: 1 | 2,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      if (slot === 1) setPhoto1(dataUrl);
      else setPhoto2(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function completeInstantUnlock(bannerMessage: string, isSuperVip = false) {
    if (isSuperVip) {
      activateSuperVipEverywhere();
    } else {
      grantVideoVipUnlocked();
    }
    setUpiPopup(null);
    setPayError(null);
    setIsOwnerModalOpen(false);
    setPaywallDismissedForCreatedVideo(false);
    setIsUnlocked(true);
    setUnlockBanner(bannerMessage);
    setTimeout(() => setUnlockBanner(null), 4500);
  }

  async function renderPhotoToVideoFile(
    audioCtxForMux: AudioContext | null
  ): Promise<{
    url: string;
    ext: 'webm' | 'mp4';
    resolutionLabel: string;
  }> {
    const isVertical = aspectRatio === '9:16';
    const W = isVertical ? 1080 : 1920;
    const H = isVertical ? 1920 : 1080;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Video canvas context unavailable.');

    const imgs: HTMLImageElement[] = [];
    if (creationMode === 'dual') {
      if (photo1) imgs.push(await loadImageElement(photo1));
      if (photo2) imgs.push(await loadImageElement(photo2));
    } else if (creationMode === 'single') {
      if (photo1) imgs.push(await loadImageElement(photo1));
      else if (photo2) imgs.push(await loadImageElement(photo2));
    }

    const presetMeta =
      VIRAL_PRESETS.find((p) => p.id === selectedPresetId) || VIRAL_PRESETS[0];

    const mimeCandidates = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const supportedMime =
      typeof MediaRecorder !== 'undefined'
        ? mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || ''
        : '';

    if (typeof canvas.captureStream !== 'function' || !supportedMime) {
      throw new Error(
        'Browser MediaRecorder video capture is unavailable on this device.'
      );
    }

    const canvasStream = canvas.captureStream(30);
    let finalStream: MediaStream = canvasStream;

    if (musicEnabled && audioCtxForMux) {
      try {
        const audioDest = audioCtxForMux.createMediaStreamDestination();
        scheduleTrackAudio(audioCtxForMux, audioDest, musicTrack, durationSec);
        const tracks = [
          ...canvasStream.getVideoTracks(),
          ...audioDest.stream.getAudioTracks(),
        ];
        finalStream = new MediaStream(tracks);
      } catch {
        finalStream = canvasStream;
      }
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(finalStream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 5_000_000,
      });
    } catch {
      recorder = new MediaRecorder(canvasStream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 3_500_000,
      });
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const stopPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: supportedMime }));
      };
    });

    recorder.start(100);

    const totalFrames = durationSec * 30;
    const frameIntervalMs = 1000 / 30;
    const scaleFactor = Math.min(W, H) / 720;

    for (let f = 0; f <= totalFrames; f++) {
      const progress = f / totalFrames;
      ctx.clearRect(0, 0, W, H);

      // Rich Preset Backdrop Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      if (presetMeta.id === 'couple_hug') {
        bgGrad.addColorStop(0, '#1e0b1a');
        bgGrad.addColorStop(0.5, '#33122c');
        bgGrad.addColorStop(1, '#120714');
      } else if (presetMeta.id === 'wedding_cinema') {
        bgGrad.addColorStop(0, '#191206');
        bgGrad.addColorStop(0.5, '#33240a');
        bgGrad.addColorStop(1, '#140c0f');
      } else if (presetMeta.id === 'bollywood_dance') {
        bgGrad.addColorStop(0, '#1e0836');
        bgGrad.addColorStop(0.5, '#4c0778');
        bgGrad.addColorStop(1, '#1a0a2e');
      } else if (presetMeta.id === 'romantic_rain') {
        bgGrad.addColorStop(0, '#091426');
        bgGrad.addColorStop(0.5, '#132542');
        bgGrad.addColorStop(1, '#170a1c');
      } else if (presetMeta.id === 'neon_attitude') {
        bgGrad.addColorStop(0, '#050816');
        bgGrad.addColorStop(0.5, '#120c2b');
        bgGrad.addColorStop(1, '#081b26');
      } else {
        bgGrad.addColorStop(0, '#0a182b');
        bgGrad.addColorStop(0.5, '#162c4a');
        bgGrad.addColorStop(1, '#09101c');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Color grading per Video Style
      if (videoStyle === 'Anime') {
        ctx.filter = 'saturate(1.42) contrast(1.1) brightness(1.06)';
      } else if (videoStyle === '3D Realistic') {
        ctx.filter = 'contrast(1.15) saturate(1.18)';
      } else {
        ctx.filter = 'contrast(1.08) sepia(0.08) saturate(1.14)';
      }

      const beatPulse =
        presetMeta.id === 'bollywood_dance' || musicTrack === 'Party Beat'
          ? Math.sin(progress * Math.PI * 10) * 0.025
          : presetMeta.id === 'neon_attitude'
            ? Math.sin(progress * Math.PI * 4) * 0.03
            : 0;

      if (creationMode === 'dual' && imgs.length === 2) {
        if (isVertical) {
          // 9:16 Vertical Stacked or Split-to-Merge Couple Choreography
          const halfH = H / 2;
          if (progress < 0.34) {
            const t = progress / 0.34;
            const ease = 1 - Math.pow(1 - t, 3);
            const gap = Math.round((1 - ease) * 90);
            drawCoverRectImage(
              ctx,
              imgs[0],
              0,
              -gap,
              W,
              halfH + 40,
              1.05 + t * 0.07 + beatPulse,
              0,
              ease * 22,
              Math.min(1, 0.4 + ease * 0.6)
            );
            drawCoverRectImage(
              ctx,
              imgs[1],
              0,
              halfH - 40 + gap,
              W,
              halfH + 40,
              1.05 + t * 0.07 + beatPulse,
              0,
              -ease * 22,
              Math.min(1, 0.4 + ease * 0.6)
            );
          } else {
            const t = (progress - 0.34) / 0.66;
            const embraceShift = Math.sin(t * Math.PI) * 28;
            drawCoverRectImage(
              ctx,
              imgs[0],
              0,
              0,
              W,
              halfH + 90,
              1.12 + t * 0.09 + beatPulse,
              Math.sin(t * Math.PI) * 14,
              embraceShift,
              0.96
            );
            drawCoverRectImage(
              ctx,
              imgs[1],
              0,
              halfH - 90,
              W,
              halfH + 90,
              1.12 + t * 0.09 + beatPulse,
              -Math.sin(t * Math.PI) * 14,
              -embraceShift,
              0.93
            );

            const seamGrad = ctx.createRadialGradient(
              W / 2,
              halfH,
              20,
              W / 2,
              halfH,
              W * 0.46
            );
            seamGrad.addColorStop(0, 'rgba(253,224,71,0.34)');
            seamGrad.addColorStop(0.5, 'rgba(236,72,153,0.18)');
            seamGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = seamGrad;
            ctx.fillRect(0, 0, W, H);
          }
        } else {
          // 16:9 Landscape Side-by-Side Slide & Seamless Center Couple Embrace
          const halfW = W / 2;
          if (progress < 0.34) {
            const t = progress / 0.34;
            const ease = 1 - Math.pow(1 - t, 3);
            const gapOffset = Math.round((1 - ease) * 110);
            drawCoverRectImage(
              ctx,
              imgs[0],
              -gapOffset,
              0,
              halfW + 45,
              H,
              1.06 + t * 0.08 + beatPulse,
              ease * 32,
              0,
              Math.min(1, 0.35 + ease * 0.65)
            );
            drawCoverRectImage(
              ctx,
              imgs[1],
              halfW - 45 + gapOffset,
              0,
              halfW + 45,
              H,
              1.06 + t * 0.08 + beatPulse,
              -ease * 32,
              0,
              Math.min(1, 0.35 + ease * 0.65)
            );
          } else {
            const t = (progress - 0.34) / 0.66;
            const zoom = 1.12 + t * 0.1 + beatPulse;
            const embraceShift = Math.sin(t * Math.PI) * 38;
            drawCoverRectImage(
              ctx,
              imgs[0],
              0,
              0,
              halfW + 100,
              H,
              zoom,
              embraceShift,
              Math.sin(t * Math.PI) * -10,
              0.96
            );
            drawCoverRectImage(
              ctx,
              imgs[1],
              halfW - 100,
              0,
              halfW + 100,
              H,
              zoom,
              -embraceShift,
              Math.cos(t * Math.PI) * 10,
              0.92
            );

            const centerBlend = ctx.createRadialGradient(
              halfW,
              H * 0.48,
              25,
              halfW,
              H * 0.48,
              420
            );
            centerBlend.addColorStop(0, 'rgba(253,224,71,0.34)');
            centerBlend.addColorStop(0.5, 'rgba(236,72,153,0.18)');
            centerBlend.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = centerBlend;
            ctx.fillRect(0, 0, W, H);
          }
        }
      } else if (imgs.length >= 1) {
        // Single Photo-to-Video Animation (or Dual with 1 uploaded)
        drawCoverRectImage(
          ctx,
          imgs[0],
          0,
          0,
          W,
          H,
          1.06 + progress * 0.16 + beatPulse,
          Math.sin(progress * Math.PI * 1.4) * 52,
          Math.cos(progress * Math.PI) * 20,
          1
        );
      } else {
        // Text-to-Video Story Visual Scene Generator (Dynamic Light Orbs + Kinetic Horizon)
        ctx.filter = 'none';
        const orb1X = W * (0.3 + 0.4 * Math.sin(progress * Math.PI * 2));
        const orb1Y = H * (0.32 + 0.12 * Math.cos(progress * Math.PI * 2));
        const orb1 = ctx.createRadialGradient(orb1X, orb1Y, 30, orb1X, orb1Y, W * 0.55);
        orb1.addColorStop(0, presetMeta.id === 'neon_attitude' ? 'rgba(34,211,238,0.46)' : 'rgba(244,63,94,0.45)');
        orb1.addColorStop(0.5, 'rgba(139,92,246,0.22)');
        orb1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = orb1;
        ctx.fillRect(0, 0, W, H);

        const orb2X = W * (0.72 - 0.35 * Math.sin(progress * Math.PI * 1.5));
        const orb2Y = H * (0.64 - 0.14 * Math.sin(progress * Math.PI * 2));
        const orb2 = ctx.createRadialGradient(orb2X, orb2Y, 20, orb2X, orb2Y, W * 0.48);
        orb2.addColorStop(0, 'rgba(251,191,36,0.38)');
        orb2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = orb2;
        ctx.fillRect(0, 0, W, H);

        // Animated light rays & Story Title Display
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#ffffff';
        for (let r = 0; r < 5; r++) {
          const rx = ((r * 0.25 + progress * 0.35) % 1.2 - 0.1) * W;
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx + 120 * scaleFactor, 0);
          ctx.lineTo(rx - 80 * scaleFactor, H);
          ctx.lineTo(rx - 200 * scaleFactor, H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Story prompt central kinetic card
        const storyPromptLines = wrapCanvasText(
          ctx,
          scenePrompt.trim() || presetMeta.prompt,
          W * 0.72
        );
        ctx.save();
        ctx.textAlign = 'center';
        const storyFontSize = Math.round(32 * scaleFactor);
        ctx.font = `700 ${storyFontSize}px sans-serif`;
        const baseY = H * 0.44 - ((storyPromptLines.length - 1) * storyFontSize * 1.35) / 2;
        storyPromptLines.forEach((line, idx) => {
          const lineOpacity = Math.min(1, Math.max(0.2, progress * 3.5 - idx * 0.25));
          ctx.fillStyle = `rgba(255,255,255,${lineOpacity.toFixed(2)})`;
          ctx.shadowColor = 'rgba(0,0,0,0.65)';
          ctx.shadowBlur = 18;
          ctx.fillText(line, W / 2, baseY + idx * storyFontSize * 1.42);
        });
        ctx.restore();
      }

      ctx.filter = 'none';

      // Preset-specific Viral Particles & Atmospheric Effects
      if (presetMeta.id === 'romantic_rain') {
        // Slanted Romantic Rain Streaks + Drifting Rose Petals
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.36)';
        ctx.lineWidth = Math.max(1.5, 2 * scaleFactor);
        for (let r = 0; r < 34; r++) {
          const rx = ((r * 97 + progress * 240) % (W + 120)) - 60;
          const ry = ((r * 131 + progress * 1950) % (H + 160)) - 80;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 14 * scaleFactor, ry + 56 * scaleFactor);
          ctx.stroke();
        }
        ctx.restore();

        for (let p = 0; p < 16; p++) {
          const px = ((p * 113 + Math.sin(progress * 5 + p) * 65 + progress * 140) % (W + 60)) - 30;
          const py = ((p * 89 + progress * (420 + (p % 4) * 90)) % (H + 80)) - 40;
          drawRosePetal(
            ctx,
            px,
            py,
            (11 + (p % 5) * 2.4) * scaleFactor,
            progress * 6 + p,
            p % 2 === 0 ? '#f43f5e' : '#fb7185',
            0.78
          );
        }
      } else if (presetMeta.id === 'neon_attitude') {
        // Scanning Neon Sweeps
        const scanY = ((progress * 1.8) % 1) * H;
        const scanGrad = ctx.createLinearGradient(0, scanY - 70, 0, scanY + 70);
        scanGrad.addColorStop(0, 'rgba(34,211,238,0)');
        scanGrad.addColorStop(0.5, 'rgba(34,211,238,0.28)');
        scanGrad.addColorStop(1, 'rgba(232,121,249,0)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 70, W, 140);

        for (let p = 0; p < 18; p++) {
          const px = ((p * 117 + Math.cos(progress * 4 + p) * 45 + progress * 150) % (W + 40)) - 20;
          const py = ((H - ((p * 83 + progress * 360) % (H + 60))) + H + 60) % (H + 60) - 30;
          drawSparkleStar(
            ctx,
            px,
            py,
            (7 + (p % 4) * 2.5) * scaleFactor,
            p % 2 === 0 ? '#22d3ee' : '#e879f9',
            0.75
          );
        }
      } else {
        // Hearts, Wedding Petals, Bollywood Confetti, Best Friends Sparkles
        for (let p = 0; p < 20; p++) {
          const px =
            ((p * 109 + Math.sin(progress * 4 + p) * 52 + progress * 160) %
              (W + 60)) -
            30;
          const py =
            ((H - ((p * 89 + progress * (360 + (p % 4) * 90)) % (H + 80))) +
              H +
              80) %
              (H + 80) -
            40;
          const pulseAlpha = 0.48 + 0.45 * Math.sin(progress * Math.PI * 4 + p);

          if (
            (presetMeta.id === 'couple_hug' || presetMeta.id === 'wedding_cinema') &&
            p % 2 === 0
          ) {
            drawHeartParticle(
              ctx,
              px,
              py,
              (13 + (p % 6) * 2.2) * scaleFactor,
              presetMeta.id === 'couple_hug' ? '#fb7185' : '#fde047',
              pulseAlpha
            );
          } else {
            const starColor =
              presetMeta.id === 'bollywood_dance'
                ? p % 3 === 0
                  ? '#f472b6'
                  : p % 3 === 1
                    ? '#fde047'
                    : '#38bdf8'
                : '#fde047';
            drawSparkleStar(
              ctx,
              px,
              py,
              (7 + (p % 5) * 2.2) * scaleFactor,
              starColor,
              pulseAlpha
            );
          }
        }
      }

      // Measured Cinematic Vignette
      const vig = ctx.createRadialGradient(
        W / 2,
        H / 2,
        Math.min(W, H) * 0.25,
        W / 2,
        H / 2,
        Math.max(W, H) * 0.72
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      if (videoStyle === 'Cinematic' || presetMeta.id === 'wedding_cinema') {
        const barH = Math.round(H * 0.055);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
        ctx.fillRect(0, 0, W, barH);
        ctx.fillRect(0, H - barH, W, barH);
      }

      // Couple Center Heart Seal when 2 photos merge
      if (creationMode === 'dual' && imgs.length === 2 && progress > 0.22) {
        const sealScale = (16 + Math.sin(progress * Math.PI * 6) * 2.4) * scaleFactor;
        drawHeartParticle(
          ctx,
          W / 2,
          H - Math.round(H * 0.18),
          sealScale,
          '#fb7185',
          0.92
        );
      }

      // Custom Video Text / Lyrics Overlay with High-Contrast Dark Scrim
      const trimmedOverlay = textOverlay.trim();
      if (trimmedOverlay) {
        ctx.save();
        const fontSize = Math.round((isVertical ? 36 : 38) * scaleFactor);
        ctx.font = `800 ${fontSize}px sans-serif`;
        const lines = wrapCanvasText(ctx, trimmedOverlay, W * 0.8);
        if (lines.length > 0) {
          const lineH = fontSize * 1.32;
          const boxH = lines.length * lineH + 34 * scaleFactor;
          const boxW = Math.min(
            W * 0.88,
            Math.max(...lines.map((l) => ctx.measureText(l).width)) + 72 * scaleFactor
          );
          const boxX = (W - boxW) / 2;
          const boxY = H - Math.round(H * 0.14) - boxH;
          const fadeIn = Math.min(1, progress * 5);

          ctx.globalAlpha = fadeIn;
          ctx.fillStyle = 'rgba(5, 5, 14, 0.72)';
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 20 * scaleFactor);
          ctx.fill();

          ctx.strokeStyle = 'rgba(253, 224, 71, 0.52)';
          ctx.lineWidth = Math.max(1.5, 2 * scaleFactor);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          lines.forEach((line, idx) => {
            ctx.fillText(
              line,
              W / 2,
              boxY + 17 * scaleFactor + lineH * (idx + 0.5)
            );
          });
        }
        ctx.restore();
      }

      // AI1999 & Sunil Singh • 1999 Luxury Watermark
      const padX = Math.round(28 * scaleFactor);
      const topTagY = Math.round(H * 0.082);
      const bottomTagY = H - Math.round(H * 0.072);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.font = `700 ${Math.round(16 * scaleFactor)}px sans-serif`;
      ctx.fillText(`AI1999 · ${presetMeta.captionTag}`, padX, bottomTagY);

      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(253, 224, 71, 0.98)';
      ctx.font = `700 ${Math.round(16 * scaleFactor)}px sans-serif`;
      ctx.fillText('Sunil Singh • 1999', W - padX, topTagY);
      ctx.restore();

      if (f % 3 === 0) {
        setRenderProgress(Math.min(96, Math.round(progress * 96)));
      }
      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }

    recorder.stop();
    const recordedBlob = await stopPromise;
    setRenderProgress(100);

    if (videoBlobUrlRef.current) {
      URL.revokeObjectURL(videoBlobUrlRef.current);
    }
    const url = URL.createObjectURL(recordedBlob);
    videoBlobUrlRef.current = url;
    return {
      url,
      ext: supportedMime.includes('mp4') ? 'mp4' : 'webm',
      resolutionLabel: `${W}×${H} Full HD`,
    };
  }

  async function handleGenerateVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!isUnlocked && freeVideosLeft <= 0) {
      setPaywallDismissedForCreatedVideo(false);
      return;
    }

    if (creationMode === 'dual' && !photo1 && !photo2) {
      setGenerationError(
        "Please upload Boy's Photo, Girl's Photo, or switch to Text-to-Video Story mode."
      );
      return;
    }
    if (creationMode === 'single' && !photo1 && !photo2) {
      setGenerationError(
        'Please upload a photo or switch to Text-to-Video Story mode.'
      );
      return;
    }
    if (creationMode === 'story' && !scenePrompt.trim() && !textOverlay.trim()) {
      setGenerationError(
        'Please enter a story prompt or custom text overlay to generate your video.'
      );
      return;
    }

    let tempAudioCtx: AudioContext | null = null;
    if (musicEnabled) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          tempAudioCtx = new AudioCtx();
          if (tempAudioCtx.state === 'suspended') {
            void tempAudioCtx.resume();
          }
        }
      } catch {
        tempAudioCtx = null;
      }
    }

    setGenerationError(null);
    setIsGenerating(true);
    setRenderProgress(5);
    setRenderPhase(`Initializing Full HD ${aspectRatio} Studio Engine...`);

    try {
      const apiRes = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: getOrCreateVisitorId(),
          prompt: scenePrompt.trim() || VIRAL_PRESETS[0].prompt,
          style: videoStyle,
          creationMode,
          aspectRatio,
          musicTrack,
          durationSec,
          photoCount:
            creationMode === 'story' ? 0 : (photo1 ? 1 : 0) + (photo2 ? 1 : 0),
          provider: loadSavedVideoProvider(),
          videoApiKey: loadSavedVideoApiKey() || undefined,
        }),
      });
      if (!apiRes.ok) {
        const errData = await apiRes.json().catch(() => ({}));
        throw new Error(errData?.error || 'Could not initialize video generator.');
      }

      setRenderPhase(
        `Rendering Full HD ${aspectRatio} (${durationSec}s · ${musicTrack})...`
      );
      const rendered = await renderPhotoToVideoFile(tempAudioCtx);
      setVideoUrl(rendered.url);
      setVideoMimeExt(rendered.ext);
      setVideoResolutionLabel(rendered.resolutionLabel);

      if (!isUnlocked) {
        const nextUsed = Math.min(VIDEO_FREE_TRIAL_LIMIT, freeUsed + 1);
        setFreeUsed(nextUsed);
        if (nextUsed >= VIDEO_FREE_TRIAL_LIMIT) {
          setPaywallDismissedForCreatedVideo(true);
        }
      }
    } catch (err: unknown) {
      setGenerationError(
        err instanceof Error ? err.message : 'Video rendering failed.'
      );
    } finally {
      if (tempAudioCtx) {
        tempAudioCtx.close().catch(() => {});
      }
      setIsGenerating(false);
      setRenderPhase('');
    }
  }

  function handleDownloadVideo() {
    if (!videoUrl) return;
    const ratioTag = aspectRatio === '9:16' ? '9x16' : '16x9';
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `ai1999-${ratioTag}-${videoStyle.toLowerCase().replace(/\s+/g, '-')}-${durationSec}s.${videoMimeExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (!isUnlocked && freeUsed >= VIDEO_FREE_TRIAL_LIMIT) {
      setTimeout(() => {
        setPaywallDismissedForCreatedVideo(false);
      }, 900);
    }
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
        if (!sdkLoaded) throw new Error('Could not load Razorpay Checkout SDK.');

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
              : `Pro Video Unlimited Pass — ₹${chosenPrice} / Month`,
          prefill: { contact: MERCHANT_CONTACT, method: 'upi' },
          notes: {
            merchant: MERCHANT_OFFICIAL_LABEL,
            merchant_contact: MERCHANT_CONTACT,
            plan: `₹${chosenPrice}/Month`,
          },
          theme: { color: '#7c3aed' },
          modal: { ondismiss: () => setIsPaying(false) },
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
              completeInstantUnlock(
                chosenPlan === 'super_vip_999'
                  ? `₹${chosenPrice}/Mo All-Access Super VIP unlocked across Video, Music & App Builder!`
                  : `Pro Video Unlimited Pass — ₹${chosenPrice}/Month unlocked (${verifyData.paymentId})!`,
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
        if (orderData.mode === 'live') rzpOptions.order_id = orderData.orderId;
        new RazorpayCtor(rzpOptions).open();
        return;
      }

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
        err instanceof Error ? err.message : 'Unable to launch checkout.'
      );
      setIsPaying(false);
    }
  }

  async function handleConfirmUpiPopup(e: React.FormEvent) {
    e.preventDefault();
    if (!upiPopup) return;
    setPayError(null);
    setIsPaying(true);

    const popupVerifyUrl =
      upiPopup.plan === 'super_vip_999'
        ? '/api/vip/verify-unlock'
        : '/api/video/verify-unlock';

    try {
      const verifyRes = await fetch(popupVerifyUrl, {
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
          ? `₹${upiPopup.priceInr}/Mo Super VIP unlocked via UPI to ${MERCHANT_CONTACT}!`
          : `Pro Video Unlimited Pass (₹${upiPopup.priceInr}/Mo) unlocked via UPI to ${MERCHANT_CONTACT}!`,
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
          ? `Direct UPI UTR ${utr} verified — Super VIP ₹${activePriceInr}/Mo unlocked!`
          : `Direct UPI UTR ${utr} verified — Pro Video Unlimited Pass ₹${activePriceInr}/Mo unlocked!`,
        isSuperVipPlan
      );
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'UTR verification failed.');
    } finally {
      setIsVerifyingUtr(false);
    }
  }

  function handleSaveOwnerKeys() {
    const cleanedRzp = keyDraft.trim();
    if (cleanedRzp && !/^rzp_(live|test)_[A-Za-z0-9]+$/.test(cleanedRzp)) {
      setOwnerStatus({
        type: 'error',
        text: 'Enter a valid Razorpay Key ID starting with rzp_live_ or rzp_test_.',
      });
      return;
    }
    saveRzpKey(cleanedRzp);
    setOwnerKeyId(cleanedRzp);
    saveVideoApiKey(videoApiKeyDraft.trim());
    saveVideoProvider(videoProviderDraft);
    setOwnerStatus({
      type: 'success',
      text: 'Saved Razorpay Key & Video Generation API settings!',
    });
  }

  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [guard, setGuard] = useState<OwnerGuardState>(getOwnerGuardState);

  useEffect(() => {
    const syncGuard = () => {
      setGuard(getOwnerGuardState());
      setIsUnlocked(loadInitialVideoUnlock());
    };
    window.addEventListener(APP_STATE_SYNC_EVENT, syncGuard);
    window.addEventListener('storage', syncGuard);
    const interval = window.setInterval(() => setGuard(getOwnerGuardState()), 15000);
    return () => {
      window.removeEventListener(APP_STATE_SYNC_EVENT, syncGuard);
      window.removeEventListener('storage', syncGuard);
      window.clearInterval(interval);
    };
  }, []);

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
        'Welcome Sunil Singh! Owner VIP Mode active — 100% Unlimited Free Pro AI Video Studio unlocked!',
        true
      );
      trackAnalyticsEvent('subscription_unlock', {
        label: 'Owner VIP Mode unlock (AI Video Studio)',
        plan: 'owner',
      });
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
    <div className="h-full w-full flex flex-col bg-[#07070f] text-zinc-100 overflow-hidden relative">
      {/* Top Studio Header */}
      <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-white/10 bg-[#0d0d18]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-500 flex items-center justify-center text-white shrink-0">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">
              All-in-One Pro AI Video Studio
            </h2>
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 pl-2.5 border-l border-zinc-800 text-xs font-semibold whitespace-nowrap tabular-nums">
            {isUnlocked ? (
              <span className="text-emerald-400">VIP Unlimited Active</span>
            ) : (
              <span
                className={
                  freeVideosLeft > 0 ? 'text-amber-300' : 'text-rose-400'
                }
              >
                🎁 Free Videos Left: {freeVideosLeft}/{VIDEO_FREE_TRIAL_LIMIT}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SunilGlowingBadge compact />
          <button
            type="button"
            onClick={() => {
              setKeyDraft(loadSavedRzpKey());
              setVideoApiKeyDraft(loadSavedVideoApiKey());
              setVideoProviderDraft(loadSavedVideoProvider());
              setOwnerStatus(null);
              setIsOwnerModalOpen(true);
            }}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Owner Settings & VIP Access"
            aria-label="Owner Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isPaywallActive ? (
        /* Pro Video Unlimited Pass — ₹500 / Month Paywall after 3 Free Videos */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.18),_transparent_58%)]">
          <div className="w-full max-w-lg rounded-3xl p-[1.5px] royal-metallic-gold-border shadow-2xl">
            <div className="rounded-[22px] bg-[#0e0e15] p-5 sm:p-7 space-y-5 text-center">
              <div className="flex justify-center">
                <SunilGlowingBadge variant="hero" />
              </div>

              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/25 via-fuchsia-500/20 to-amber-500/20 border border-violet-400/40 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-300" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-emerald-300">
                  {MERCHANT_OFFICIAL_LABEL}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold chargpt-rainbow-text">
                  All {VIDEO_FREE_TRIAL_LIMIT} Free Videos Used!
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300">
                  Unlock the{' '}
                  <span className="font-bold text-amber-300">
                    Pro Video Unlimited Pass — ₹{VIDEO_SUB_PRICE_INR} / Month
                  </span>{' '}
                  for unlimited Full HD Dual-Photo Merge, Story Reels &amp; Downloads.
                </p>
              </div>

              {/* Plan Switcher: ₹500/Mo Pro Video Unlimited vs ₹999/Mo Super VIP */}
              <div className="grid grid-cols-2 gap-2.5 text-left">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('video_500')}
                  className={`rounded-2xl border p-3 transition-all ${
                    selectedPlan === 'video_500'
                      ? 'border-violet-400 bg-violet-600/15 shadow-[0_0_20px_rgba(139,92,246,0.22)]'
                      : 'border-zinc-800 bg-[#13131d] hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-violet-300">
                    Pro Video Unlimited Pass
                  </div>
                  <div className="font-mono text-lg font-extrabold text-zinc-50 tabular-nums">
                    ₹{VIDEO_SUB_PRICE_INR}
                    <span className="text-[10px] font-normal text-zinc-400">/Mo</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Unlimited Full HD Videos
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('super_vip_999')}
                  className={`rounded-2xl border p-3 transition-all ${
                    selectedPlan === 'super_vip_999'
                      ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_22px_rgba(251,191,36,0.25)]'
                      : 'border-zinc-800 bg-[#13131d] hover:border-amber-400/40'
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
                    Builder + Music + Video
                  </div>
                </button>
              </div>

              {payError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-200 text-left">
                  {payError}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handlePayAndUnlockInstantly}
                  disabled={isPaying}
                  className={`w-full py-3.5 px-5 rounded-2xl hover:brightness-110 disabled:opacity-50 font-display text-sm sm:text-base font-bold shadow-lg flex items-center justify-center gap-2 transition-all min-h-[50px] ${
                    isSuperVipPlan
                      ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-zinc-950'
                      : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white'
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
                      Pay ₹{activePriceInr}/Month &amp; Unlock Unlimited
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-400">
                  <GooglePayIcon className="w-5 h-5" />
                  <PhonePeIcon className="w-5 h-5" />
                  <PaytmIcon className="w-5 h-5" />
                  <RazorpayIcon className="w-5 h-5" />
                  <span>Merchant: {MERCHANT_CONTACT}</span>
                </div>

                <DirectUpiFallbackBox
                  compact
                  amountInr={activePriceInr}
                  note={
                    isSuperVipPlan
                      ? `AI1999 Super VIP ${activePriceInr} Monthly`
                      : `Pro Video Unlimited Pass ${activePriceInr} Monthly`
                  }
                  onVerifyUtr={handleVerifyDirectUtr}
                  verifyingUtr={isVerifyingUtr}
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-lg">
            <AdsterraLiveBanner />
          </div>
        </div>
      ) : (
        /* Full Pro AI Video Studio Workspace */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Controls */}
          <form
            onSubmit={handleGenerateVideo}
            className="lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0c0c15] overflow-y-auto p-4 space-y-4 max-h-[56vh] lg:max-h-none"
          >
            {unlockBanner && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{unlockBanner}</span>
              </div>
            )}

            {/* Mobile + Desktop Free Video Counter Row */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="font-display text-xs sm:text-sm font-bold text-zinc-100">
                Studio Controls
              </span>
              <span
                className={`text-xs font-bold tabular-nums ${
                  isUnlocked
                    ? 'text-emerald-400'
                    : freeVideosLeft > 0
                      ? 'text-amber-300'
                      : 'text-rose-400'
                }`}
              >
                {isUnlocked
                  ? 'VIP Unlimited Active'
                  : `🎁 Free Videos Left: ${freeVideosLeft}/${VIDEO_FREE_TRIAL_LIMIT}`}
              </span>
            </div>

            {/* 3 Creation Modes: Dual-Photo Merge / Single Photo / Text Story */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-medium text-zinc-400">
                Creation Mode
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#080810] border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreationMode('dual')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[40px] ${
                    creationMode === 'dual'
                      ? 'bg-gradient-to-r from-rose-500/30 to-violet-500/30 text-white border border-pink-400/50'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Couple Merge</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('single')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[40px] ${
                    creationMode === 'single'
                      ? 'bg-violet-600/25 text-white border border-violet-400/50'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">1-Photo Reel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('story')}
                  className={`py-2 px-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[40px] ${
                    creationMode === 'story'
                      ? 'bg-cyan-600/25 text-white border border-cyan-400/50'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Text Story</span>
                </button>
              </div>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={photo1InputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(1, e)}
              className="hidden"
              aria-label="Upload Boy's or Primary Photo"
            />
            <input
              ref={photo2InputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(2, e)}
              className="hidden"
              aria-label="Upload Girl's Photo"
            />

            {/* Upload Area Conditional on Creation Mode */}
            {creationMode === 'dual' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-zinc-300 font-medium">
                    Dual-Photo Couple Merge Slots
                  </span>
                  {photo1 && photo2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const prev1 = photo1;
                        setPhoto1(photo2);
                        setPhoto2(prev1);
                      }}
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 font-semibold"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      Swap
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative rounded-2xl border border-dashed border-cyan-400/40 bg-cyan-500/[0.04] overflow-hidden h-28 flex flex-col items-center justify-center">
                    {photo1 ? (
                      <>
                        <img
                          src={photo1}
                          alt="Boy portrait"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-cyan-200">
                          👦 Boy&apos;s Photo
                        </div>
                        <button
                          type="button"
                          onClick={() => setPhoto1('')}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/75 text-rose-300 hover:text-rose-200"
                          aria-label="Remove Boy's Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => photo1InputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-zinc-200 hover:text-cyan-300 p-2 text-center"
                      >
                        <ImagePlus className="w-5 h-5 text-cyan-400" />
                        <span className="text-[11px] font-bold leading-tight">
                          👦 Boy&apos;s Photo
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="relative rounded-2xl border border-dashed border-pink-400/40 bg-pink-500/[0.04] overflow-hidden h-28 flex flex-col items-center justify-center">
                    {photo2 ? (
                      <>
                        <img
                          src={photo2}
                          alt="Girl portrait"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-pink-200">
                          👧 Girl&apos;s Photo
                        </div>
                        <button
                          type="button"
                          onClick={() => setPhoto2('')}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/75 text-rose-300 hover:text-rose-200"
                          aria-label="Remove Girl's Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => photo2InputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-zinc-200 hover:text-pink-300 p-2 text-center"
                      >
                        <ImagePlus className="w-5 h-5 text-pink-400" />
                        <span className="text-[11px] font-bold leading-tight">
                          👧 Girl&apos;s Photo
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {creationMode === 'single' && (
              <div className="relative rounded-2xl border border-dashed border-violet-400/45 bg-violet-500/[0.04] overflow-hidden h-28 flex flex-col items-center justify-center">
                {photo1 || photo2 ? (
                  <>
                    <img
                      src={photo1 || photo2}
                      alt="Uploaded portrait for animation"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto1('');
                        setPhoto2('');
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/75 text-rose-300 hover:text-rose-200"
                      aria-label="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => photo1InputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-zinc-200 hover:text-violet-300 p-3 text-center"
                  >
                    <ImagePlus className="w-5 h-5 text-violet-400" />
                    <span className="text-xs font-bold">
                      Upload Photo to Animate (Full HD Pan &amp; FX)
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* 6 Viral Motion & Effect Presets */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-medium text-zinc-300">
                Viral Motion &amp; Effect Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {VIRAL_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setScenePrompt(preset.prompt);
                      setTextOverlay(preset.defaultOverlay);
                      setMusicTrack(preset.recommendedMusic);
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold text-left transition-all min-h-[40px] ${
                      selectedPresetId === preset.id
                        ? 'border-pink-400 bg-pink-500/20 text-white shadow-[0_0_16px_rgba(236,72,153,0.25)]'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span className="line-clamp-1">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scene / Story Prompt */}
            <div className="space-y-1">
              <label
                htmlFor="video-scene-prompt"
                className="block text-[11px] font-medium text-zinc-300"
              >
                {creationMode === 'story'
                  ? 'Text-to-Video Story Prompt'
                  : 'Custom Motion & Scene Prompt'}
              </label>
              <textarea
                id="video-scene-prompt"
                rows={2}
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="Describe your scene, emotion, rain, wedding or story..."
                className="w-full rounded-xl border border-zinc-800 bg-[#090910] p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none resize-none"
              />
            </div>

            {/* Custom Video Text / Lyrics Overlay */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="video-text-overlay"
                  className="text-[11px] font-medium text-zinc-300 flex items-center gap-1"
                >
                  <Type className="w-3 h-3 text-amber-300" />
                  Custom Video Text / Lyrics Overlay
                </label>
                {textOverlay && (
                  <button
                    type="button"
                    onClick={() => setTextOverlay('')}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                id="video-text-overlay"
                type="text"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder="Add lyrics, couple names or Shayari on video..."
                className="w-full rounded-xl border border-zinc-800 bg-[#090910] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {QUICK_LYRIC_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setTextOverlay(chip)}
                    className="px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-amber-400/45 text-[10px] text-zinc-300 whitespace-nowrap shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector + Style + Duration */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="block text-[11px] font-medium text-zinc-400">
                    Aspect Ratio (Full HD)
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('9:16')}
                      className={`py-2 px-1.5 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 min-h-[38px] ${
                        aspectRatio === '9:16'
                          ? 'border-pink-400 bg-pink-500/20 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Smartphone className="w-3 h-3 shrink-0" />
                      <span>9:16 Reels</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-2 px-1.5 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 min-h-[38px] ${
                        aspectRatio === '16:9'
                          ? 'border-cyan-400 bg-cyan-500/20 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <MonitorPlay className="w-3 h-3 shrink-0" />
                      <span>16:9 YT</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="block text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Duration
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {([5, 10] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDurationSec(dur)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors min-h-[38px] ${
                          durationSec === dur
                            ? 'border-cyan-400 bg-cyan-600/20 text-cyan-200'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-[11px] font-medium text-zinc-400">
                  Visual Grade Style
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Cinematic', 'Anime', '3D Realistic'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setVideoStyle(s)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-colors min-h-[36px] ${
                        videoStyle === s
                          ? 'border-violet-400 bg-violet-600/20 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Music Track Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-300 flex items-center gap-1">
                    <Music className="w-3 h-3 text-emerald-400" />
                    Background Music Track
                  </span>
                  <button
                    type="button"
                    onClick={() => setMusicEnabled((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                      musicEnabled
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {musicEnabled ? (
                      <>
                        <Volume2 className="w-3 h-3" />
                        AUDIO ON
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3 h-3" />
                        MUTED
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {MUSIC_TRACKS.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      disabled={!musicEnabled}
                      onClick={() => setMusicTrack(track.id)}
                      className={`px-2.5 py-1.5 rounded-xl border text-left transition-all disabled:opacity-45 ${
                        musicTrack === track.id && musicEnabled
                          ? 'border-emerald-400 bg-emerald-500/15 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold leading-tight">
                        {track.label}
                      </div>
                      <div className="text-[9px] text-zinc-400 truncate">
                        {track.vibe}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {generationError && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                {generationError}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-600 to-amber-500 hover:brightness-110 disabled:opacity-50 text-white font-display text-sm font-bold flex items-center justify-center gap-2 min-h-[48px] shadow-lg shadow-fuchsia-600/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {renderPhase || `Rendering ${renderProgress}%...`}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Full HD {aspectRatio} Video ({durationSec}s)
                </>
              )}
            </button>
          </form>

          {/* Right Stage: Live Full HD Preview & 1-Tap Download + Live Ad Banner */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start lg:justify-center gap-4">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d0d17] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Film className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="font-display text-sm font-bold text-zinc-100 truncate">
                    {videoUrl
                      ? `Ready · ${videoResolutionLabel}`
                      : `Full HD Stage (${aspectRatio === '9:16' ? '1080×1920 Reels' : '1920×1080 YouTube'})`}
                  </span>
                </div>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={handleDownloadVideo}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold transition-colors min-h-[40px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Full HD (.{videoMimeExt})
                  </button>
                )}
              </div>

              <div
                className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#06060b] flex items-center justify-center ${
                  aspectRatio === '9:16'
                    ? 'aspect-[9/16] max-h-[470px] mx-auto'
                    : 'aspect-video w-full'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  width={aspectRatio === '9:16' ? 1080 : 1920}
                  height={aspectRatio === '9:16' ? 1920 : 1080}
                  className={
                    isGenerating
                      ? 'w-full h-full object-contain block'
                      : 'hidden'
                  }
                />

                {videoUrl && !isGenerating ? (
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : !isGenerating ? (
                  <div className="text-center p-6 space-y-2.5 max-w-sm">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-400/35 flex items-center justify-center text-violet-300">
                      <Clapperboard className="w-5 h-5" />
                    </div>
                    <div className="font-display text-sm font-bold text-zinc-100">
                      All-in-One Pro AI Video Studio
                    </div>
                    <p className="text-xs text-zinc-400">
                      Choose Dual-Photo Couple Merge, Single Photo Reel, or Text-to-Video Story · Pick a viral preset, add lyrics overlay &amp; music track, and export in Full HD.
                    </p>
                  </div>
                ) : null}

                {isGenerating && (
                  <div className="absolute bottom-3 inset-x-3 rounded-xl bg-black/75 backdrop-blur-md px-3.5 py-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-200 font-medium truncate">
                      {renderPhase}
                    </span>
                    <span className="font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                      {renderProgress}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-2xl">
              <AdsterraLiveBanner />
            </div>
          </div>
        </div>
      )}

      {/* Owner Settings Modal (Video API Key, Razorpay Key, Owner VIP Mode) */}
      {isOwnerModalOpen && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="AI Video Studio Owner Settings"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111116] shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-300" />
                <h3 className="font-display text-sm font-semibold text-zinc-100">
                  Owner Settings · AI Video Studio
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <SunilGlowingBadge compact />
                <button
                  type="button"
                  onClick={() => setIsOwnerModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  aria-label="Close owner settings"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {onOpenOwnerAnalytics && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOwnerModalOpen(false);
                    onOpenOwnerAnalytics();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs font-bold text-amber-200 flex items-center justify-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Open Owner Analytics Suite
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
                <label className="block text-xs font-medium text-zinc-200">
                  Video Generation API (Google Veo / Kling / Luma)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'veo', label: 'Google Veo' },
                    { id: 'kling', label: 'Kling AI' },
                    { id: 'luma', label: 'Luma API' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setVideoProviderDraft(p.id)}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border ${
                        videoProviderDraft === p.id
                          ? 'border-violet-400 bg-violet-600/20 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="password"
                  value={videoApiKeyDraft}
                  onChange={(e) => setVideoApiKeyDraft(e.target.value)}
                  placeholder="Paste Google Veo / Kling / Luma API Key"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-200">
                  Razorpay Live Key ID (routes to {MERCHANT_CONTACT})
                </label>
                <input
                  type="text"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="rzp_live_XXXXXXXXXXXXXX"
                  className="w-full rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveOwnerKeys}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Save API &amp; Razorpay Keys
              </button>

              {!isUnlocked && (
                <form
                  onSubmit={handleOwnerFreeUnlock}
                  className="pt-3 border-t border-zinc-800/80 space-y-2"
                >
                  <label className="block text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Owner VIP Mode Password
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder={guard.isLocked ? 'Locked for 24 hours' : 'Enter owner password'}
                      disabled={guard.isLocked || isCheckingOwner}
                      className="flex-1 rounded-xl border border-zinc-800 bg-[#0a0a0f] px-3 py-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none disabled:opacity-50"
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
              )}

              <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    revokeUnlockStorageForTesting([
                      OWNER_UNLIMITED_STORAGE_KEY,
                      SUPER_VIP_UNLOCK_STORAGE_KEY,
                      VIDEO_VIP_UNLOCK_STORAGE_KEY,
                    ]);
                    setIsUnlocked(false);
                    setFreeUsed(0);
                    setPaywallDismissedForCreatedVideo(false);
                    setIsOwnerModalOpen(false);
                  }}
                  className="py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-200"
                >
                  Reset {VIDEO_FREE_TRIAL_LIMIT} Free Videos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    revokeUnlockStorageForTesting([
                      OWNER_UNLIMITED_STORAGE_KEY,
                      SUPER_VIP_UNLOCK_STORAGE_KEY,
                      VIDEO_VIP_UNLOCK_STORAGE_KEY,
                    ]);
                    setIsUnlocked(false);
                    setFreeUsed(VIDEO_FREE_TRIAL_LIMIT);
                    setPaywallDismissedForCreatedVideo(false);
                    setIsOwnerModalOpen(false);
                  }}
                  className="py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-200"
                >
                  Test ₹{VIDEO_SUB_PRICE_INR} Paywall
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Razorpay Checkout Popup */}
      {upiPopup && (
        <div
          className="fixed inset-x-0 top-12 bottom-14 z-[60] flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Razorpay AI Video Studio Checkout"
        >
          <form
            onSubmit={handleConfirmUpiPopup}
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#111118] shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <RazorpayIcon className="w-6 h-6 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {MERCHANT_OFFICIAL_LABEL}
                  </div>
                  <div className="text-[11px] text-violet-100 font-mono">
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
                <span className="font-mono font-bold">{MERCHANT_CONTACT}</span>
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
                        ? 'border-violet-500 bg-violet-600/15 text-zinc-100'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUpiPopup(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300"
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
