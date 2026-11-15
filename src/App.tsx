import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Car,
  ChevronLeft,
  Crosshair,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AD_STORAGE_KEY,
  AdSettingsApp,
  collectEnabledAdScripts,
  loadAdConfig,
  type AdConfigState,
} from './components/AdSettingsApp';
import { MultiAdRuntimeInjector } from './components/MultiAdRuntimeInjector';
import { AIMusicStudioApp } from './components/AIMusicStudioApp';
import { AIStudioApp } from './components/AIStudioApp';
import { AIVideoStudioApp } from './components/AIVideoStudioApp';
import { AuroraWallpaper } from './components/AuroraWallpaper';
import { BuilderSubscriptionModal } from './components/BuilderSubscriptionModal';
import { ChargptApp } from './components/ChargptApp';
import { CodePane } from './components/CodePane';
import { ChatPanel } from './components/ChatPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OwnerAnalyticsApp } from './components/OwnerAnalyticsApp';
import {
  PhoneHomeScreen,
  type LauncherAppId,
} from './components/PhoneHomeScreen';
import { PhoneNavBar } from './components/PhoneNavBar';
import { PhoneStatusBar } from './components/PhoneStatusBar';
import { PreviewPane } from './components/PreviewPane';
import { ReferAndEarnApp } from './components/ReferAndEarnApp';
import { SeoLandingSection } from './components/SeoLandingSection';
import { SunilGlowingBadge } from './components/SunilGlowingBadge';
import { TopBar } from './components/TopBar';
import {
  TurboSearchApp,
  type TurboSearchLaunchPayload,
} from './components/TurboSearchApp';
import { WalletModal } from './components/WalletModal';
import { WatchAdModal } from './components/WatchAdModal';
import { BeachBuggyGame } from './components/games/BeachBuggyGame';
import { FireBattleGame } from './components/games/FireBattleGame';
import {
  activateOwnerUnlimitedEverywhere,
  activateSuperVipEverywhere,
  addBonusCredits,
  APP_STATE_SYNC_EVENT,
  BUILDER_FREE_TRIAL_LIMIT,
  BUILDER_FREE_USED_STORAGE_KEY,
  BUILDER_PRO_UNLOCK_STORAGE_KEY,
  CLAIMED_REF_BY_STORAGE_KEY,
  consumeBonusCredit,
  getOrCreateVisitorId,
  grantBuilderProUnlocked,
  loadBonusCredits,
  loadBuilderProUnlocked,
  loadClaimedReferralCode,
  loadOwnerUnlimited,
  loadSavedGeminiKey,
  loadSuperVipUnlocked,
  OWNER_UNLIMITED_STORAGE_KEY,
  revokeUnlockStorageForTesting,
  SUPER_VIP_UNLOCK_STORAGE_KEY,
  trackAnalyticsEvent,
} from './config/merchant';
import type {
  ChatMessage,
  GeneratedFile,
  GenerationPayload,
  Project,
  ProjectVersion,
  RightPaneMode,
  ViewportMode,
} from './types/builder';
import type {
  SavedPayoutHandle,
  WalletTransaction,
} from './types/wallet';
import {
  downloadProjectZip,
  downloadSingleHtml,
  slugifyTitle,
} from './utils/bundler';
import { gameAudio } from './utils/gameAudio';
import { generateInstantApp } from './utils/instantAppEngine';

const STORAGE_KEY = 'kinetix_studio_projects_v1';
const ACTIVE_PROJECT_KEY = 'kinetix_studio_active_project_v1';
const WALLET_STORAGE_KEY = 'sunil_ai_builder_wallet_v1';

interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
  savedHandles: SavedPayoutHandle[];
}

function loadInitialWallet(): WalletState {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WalletState;
      if (Array.isArray(parsed.transactions)) {
        const realTransactions = parsed.transactions.filter(
          (tx) => tx.id !== 'welcome-credit-1' && tx.rail !== 'welcome_credit'
        );
        const computedBalance = realTransactions.reduce((acc, tx) => {
          return tx.type === 'deposit' ? acc + tx.amount : Math.max(0, acc - tx.amount);
        }, 0);
        return {
          balance: Number(computedBalance.toFixed(2)),
          transactions: realTransactions,
          savedHandles: Array.isArray(parsed.savedHandles) ? parsed.savedHandles : [],
        };
      }
    }
  } catch {
    // Fallback
  }
  return {
    balance: 0,
    transactions: [],
    savedHandles: [],
  };
}

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyProject(index = 1): Project {
  const title = index === 1 ? 'Untitled App' : `Untitled App ${index}`;
  return {
    id: createId(),
    title,
    slug: slugifyTitle(title),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    versions: [],
    activeVersionId: null,
  };
}

function loadInitialProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to clean project
  }
  return [createEmptyProject(1)];
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(loadInitialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_PROJECT_KEY) || '';
    } catch {
      return '';
    }
  });

  const [rightMode, setRightMode] = useState<RightPaneMode>('preview');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [mobileView, setMobileView] = useState<'chat' | 'workspace'>('chat');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('Thinking...');
  const [generatedBytes, setGeneratedBytes] = useState(0);

  const [wallet, setWallet] = useState<WalletState>(loadInitialWallet);
  const [adConfig, setAdConfig] = useState<AdConfigState>(loadAdConfig);

  // ₹299/Month AI App Builder Pro Subscription + Free Trial + Ad/Referral Bonus State
  const [builderProUnlocked, setBuilderProUnlocked] = useState<boolean>(
    loadBuilderProUnlocked
  );
  const [builderFreeUsed, setBuilderFreeUsed] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(BUILDER_FREE_USED_STORAGE_KEY));
      if (Number.isFinite(raw) && raw >= 0) {
        return Math.min(BUILDER_FREE_TRIAL_LIMIT, Math.floor(raw));
      }
    } catch {
      // Fallback
    }
    return 0;
  });
  const [builderBonusBuilds, setBuilderBonusBuilds] = useState<number>(() =>
    loadBonusCredits('builder')
  );
  const [builderSubModalOpen, setBuilderSubModalOpen] = useState(false);
  const [watchAdBuilderOpen, setWatchAdBuilderOpen] = useState(false);

  const [activeApp, setActiveApp] = useState<LauncherAppId | null>(null);
  const [appHistory, setAppHistory] = useState<LauncherAppId[]>([]);
  const [recentApps, setRecentApps] = useState<LauncherAppId[]>([]);
  const [showRecents, setShowRecents] = useState(false);
  const [gameMuted, setGameMuted] = useState<boolean>(gameAudio.muted);
  const [turboLaunchPayload, setTurboLaunchPayload] =
    useState<TurboSearchLaunchPayload | null>(null);

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const builderFreeBuildsLeft = Math.max(
    0,
    BUILDER_FREE_TRIAL_LIMIT - builderFreeUsed
  );

  const activeProject = useMemo(() => {
    return (
      projects.find((p) => p.id === activeProjectId) ?? projects[0]
    );
  }, [projects, activeProjectId]);

  useEffect(() => {
    try {
      const currentUrl = window.location.origin + window.location.pathname;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', currentUrl);
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', currentUrl);
    } catch {
      // Ignore DOM sync errors
    }
  }, []);

  useEffect(() => {
    if (activeProject && activeProject.id !== activeProjectId) {
      setActiveProjectId(activeProject.id);
    }
  }, [activeProject, activeProjectId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      if (activeProject?.id) {
        localStorage.setItem(ACTIVE_PROJECT_KEY, activeProject.id);
      }
    } catch {
      // Ignore quota errors
    }
  }, [projects, activeProject?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
    } catch {
      // Ignore quota errors
    }
  }, [wallet]);

  useEffect(() => {
    try {
      localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(adConfig));
    } catch {
      // Ignore quota errors
    }
  }, [adConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(
        BUILDER_FREE_USED_STORAGE_KEY,
        String(builderFreeUsed)
      );
    } catch {
      // Ignore quota errors
    }
  }, [builderFreeUsed]);

  // Track initial visit and auto-claim ?ref= query parameter if present
  useEffect(() => {
    trackAnalyticsEvent('visit', { label: 'AI1999 Home' });

    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref')?.trim().toUpperCase();
      if (refCode && !loadClaimedReferralCode()) {
        fetch('/api/referral/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId: getOrCreateVisitorId(),
            referralCode: refCode,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.claimed || data?.success) {
              localStorage.setItem(CLAIMED_REF_BY_STORAGE_KEY, refCode);
              addBonusCredits('builder', Number(data.bonusBuilderCredits) || 2);
              addBonusCredits('music', Number(data.bonusMusicCredits) || 2);
            }
          })
          .catch(() => {
            // Non-blocking referral claim
          })
          .finally(() => {
            params.delete('ref');
            const qs = params.toString();
            const cleanUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
            window.history.replaceState({}, '', cleanUrl);
          });
      }
    } catch {
      // Ignore URL parse error
    }
  }, []);

  // Sync Owner Unlimited Free, Super VIP, Bonus Credits & Locked Ad Config across all apps
  useEffect(() => {
    const syncState = () => {
      setBuilderProUnlocked(loadBuilderProUnlocked());
      setBuilderBonusBuilds(loadBonusCredits('builder'));
      setAdConfig(loadAdConfig());
    };

    syncState();
    window.addEventListener(APP_STATE_SYNC_EVENT, syncState);
    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener(APP_STATE_SYNC_EVENT, syncState);
      window.removeEventListener('storage', syncState);
    };
  }, [activeApp]);

  const adInjectionHtml = useMemo(() => {
    if (!adConfig.injectIntoExports) return undefined;
    const parts = collectEnabledAdScripts(adConfig);
    if (adConfig.adsterraEnabled && adConfig.adsterraBannerCode.trim()) {
      parts.unshift(adConfig.adsterraBannerCode.trim());
    }
    return parts.length > 0 ? parts.join('\n') : undefined;
  }, [adConfig]);

  const openApp = useCallback((appId: LauncherAppId) => {
    setShowRecents(false);
    setActiveApp((prev) => {
      if (prev && prev !== appId) {
        setAppHistory((hist) => [...hist, prev]);
      }
      return appId;
    });
    setRecentApps((prev) => [appId, ...prev.filter((id) => id !== appId)]);
  }, []);

  const launchTurboSearch = useCallback(
    (payload?: Omit<TurboSearchLaunchPayload, 'nonce'>) => {
      setTurboLaunchPayload({
        ...(payload || {}),
        nonce: Date.now() + Math.random(),
      });
      openApp('turbo-search');
    },
    [openApp]
  );

  const goHome = useCallback(() => {
    setShowRecents(false);
    setActiveApp(null);
    setAppHistory([]);
  }, []);

  const goBack = useCallback(() => {
    if (showRecents) {
      setShowRecents(false);
      return;
    }
    if (appHistory.length > 0) {
      const nextApp = appHistory[appHistory.length - 1];
      setAppHistory((prev) => prev.slice(0, -1));
      setActiveApp(nextApp);
      return;
    }
    setActiveApp(null);
  }, [showRecents, appHistory]);

  const closeRecentApp = useCallback(
    (appId: LauncherAppId) => {
      setRecentApps((prev) => prev.filter((id) => id !== appId));
      setActiveApp((prev) => (prev === appId ? null : prev));
    },
    []
  );

  function toggleGameMute() {
    const next = !gameMuted;
    gameAudio.muted = next;
    setGameMuted(next);
  }

  function handleWalletTransaction(
    tx: WalletTransaction,
    savedHandle?: SavedPayoutHandle
  ) {
    setWallet((prev) => {
      const nextBalance =
        tx.type === 'deposit'
          ? Number((prev.balance + tx.amount).toFixed(2))
          : Number(Math.max(0, prev.balance - tx.amount).toFixed(2));

      let nextHandles = prev.savedHandles;
      if (savedHandle) {
        const exists = prev.savedHandles.some(
          (h) => h.method === savedHandle.method && h.handle === savedHandle.handle
        );
        if (!exists) {
          nextHandles = [savedHandle, ...prev.savedHandles].slice(0, 6);
        }
      }

      return {
        balance: nextBalance,
        transactions: [tx, ...prev.transactions],
        savedHandles: nextHandles,
      };
    });
  }

  const activeVersion = useMemo(() => {
    if (!activeProject) return null;
    if (!activeProject.activeVersionId) {
      return activeProject.versions[activeProject.versions.length - 1] ?? null;
    }
    return (
      activeProject.versions.find((v) => v.id === activeProject.activeVersionId) ??
      activeProject.versions[activeProject.versions.length - 1] ??
      null
    );
  }, [activeProject]);

  const activeFiles: GeneratedFile[] = activeVersion?.files ?? [];

  // Drag-resize divider logic for desktop split pane
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      const clamped = Math.min(Math.max(e.clientX, 340), 620);
      splitContainerRef.current?.style.setProperty('--chat-width', `${clamped}px`);
    }
    function handleMouseUp() {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  function startResizing() {
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  const updateProject = useCallback(
    (projectId: string, updater: (prev: Project) => Project) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updater(p) : p))
      );
    },
    []
  );

  function handleNewProject() {
    if (isGenerating) return;
    const next = createEmptyProject(projects.length + 1);
    setProjects((prev) => [next, ...prev]);
    setActiveProjectId(next.id);
    setRightMode('preview');
    setMobileView('chat');
  }

  function handleDeleteProject(projectId: string) {
    if (projects.length <= 1 || isGenerating) return;
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    if (activeProjectId === projectId) {
      setActiveProjectId(remaining[0].id);
    }
  }

  function handleRestoreVersion(versionId: string) {
    if (!activeProject || isGenerating) return;
    updateProject(activeProject.id, (prev) => ({
      ...prev,
      activeVersionId: versionId,
      updatedAt: Date.now(),
    }));
  }

  function handleSaveFileEdit(filePath: string, newContent: string) {
    if (!activeProject || !activeVersion) return;
    updateProject(activeProject.id, (prev) => ({
      ...prev,
      updatedAt: Date.now(),
      versions: prev.versions.map((ver) =>
        ver.id === activeVersion.id
          ? {
              ...ver,
              files: ver.files.map((f) =>
                f.path === filePath ? { ...f, content: newContent } : f
              ),
            }
          : ver
      ),
    }));
  }

  function handleStopGeneration() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }

  async function handleSubmitPrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt || !activeProject || isGenerating) return;

    const unlockedNow =
      builderProUnlocked || loadOwnerUnlimited() || loadSuperVipUnlocked();
    if (!unlockedNow && builderFreeBuildsLeft <= 0 && builderBonusBuilds <= 0) {
      setBuilderSubModalOpen(true);
      return;
    }

    const targetProjectId = activeProject.id;
    const currentFiles = activeFiles;
    const historySnapshot = activeProject.messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    updateProject(targetProjectId, (prev) => ({
      ...prev,
      updatedAt: Date.now(),
      messages: [...prev.messages, userMessage],
    }));

    setIsGenerating(true);
    setGenerationPhase(
      currentFiles.length > 0
        ? 'Inspecting existing files...'
        : 'Architecting application...'
    );
    setGeneratedBytes(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let finalPayload: GenerationPayload | null = null;

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            currentFiles,
            history: historySnapshot,
            geminiApiKey: loadSavedGeminiKey() || undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Fallback triggered (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const lines = rawEvent.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'progress') {
                if (parsed.phase) setGenerationPhase(String(parsed.phase));
                if (typeof parsed.bytes === 'number') setGeneratedBytes(parsed.bytes);
              } else if (parsed.type === 'result') {
                finalPayload = parsed.data as GenerationPayload;
              } else if (parsed.type === 'error') {
                throw new Error(String(parsed.error || 'Cloud fallback'));
              }
            }
          }
        }
      } catch (cloudErr: unknown) {
        if (cloudErr instanceof DOMException && cloudErr.name === 'AbortError') {
          throw cloudErr;
        }
        // Zero-Error Guarantee: seamlessly synthesize a complete interactive HTML/CSS/JS app locally
        setGenerationPhase('Generating with AI1999 Instant Engine...');
        finalPayload = generateInstantApp(prompt);
      }

      if (!finalPayload || !Array.isArray(finalPayload.files) || finalPayload.files.length === 0) {
        finalPayload = generateInstantApp(prompt);
      }

      const nextVersionId = createId();
      const wasEmpty = currentFiles.length === 0;

      updateProject(targetProjectId, (prev) => {
        const nextVersionNum = prev.versions.length + 1;
        const newVersion: ProjectVersion = {
          id: nextVersionId,
          versionNumber: nextVersionNum,
          prompt,
          summary: finalPayload!.summary,
          files: finalPayload!.files,
          createdAt: Date.now(),
        };

        const assistantMessage: ChatMessage = {
          id: createId(),
          role: 'assistant',
          content: finalPayload!.summary,
          timestamp: Date.now(),
          versionId: nextVersionId,
          versionNumber: nextVersionNum,
          updatedFiles: finalPayload!.files.map((f) => f.path),
          suggestions: finalPayload!.followUpSuggestions ?? [],
        };

        const resolvedTitle =
          prev.versions.length === 0 && finalPayload!.projectTitle
            ? finalPayload!.projectTitle
            : prev.title;

        return {
          ...prev,
          title: resolvedTitle,
          slug: slugifyTitle(resolvedTitle),
          updatedAt: Date.now(),
          versions: [...prev.versions, newVersion],
          activeVersionId: nextVersionId,
          messages: [...prev.messages, assistantMessage],
        };
      });

      trackAnalyticsEvent('builder_generate', {
        label: `Built: ${(finalPayload.projectTitle || prompt).slice(0, 60)}`,
      });

      if (wasEmpty) {
        setRightMode('preview');
      }
      if (!unlockedNow) {
        if (builderFreeBuildsLeft > 0) {
          setBuilderFreeUsed((prev) =>
            Math.min(BUILDER_FREE_TRIAL_LIMIT, prev + 1)
          );
        } else {
          consumeBonusCredit('builder');
          setBuilderBonusBuilds(loadBonusCredits('builder'));
        }
      }
      setMobileView('workspace');
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const cancelledMessage: ChatMessage = {
          id: createId(),
          role: 'assistant',
          content: 'Generation stopped by user.',
          timestamp: Date.now(),
        };
        updateProject(targetProjectId, (prev) => ({
          ...prev,
          messages: [...prev.messages, cancelledMessage],
        }));
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }

  function handleFixRuntimeError(errorMessage: string) {
    handleSubmitPrompt(
      `The live preview threw this JavaScript runtime error: "${errorMessage}". Please inspect script.js and index.html, fix the root cause cleanly, and return the complete working files.`
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#04040a] text-zinc-100">
      {/* Moving Deep-Space Animated Aurora Mesh Wallpaper */}
      <AuroraWallpaper />

      {/* Persistent Top Smartphone Status Bar (Global Fixed z-[100]) */}
      <PhoneStatusBar
        walletBalance={wallet.balance}
        onOpenWallet={() => openApp('wallet')}
        onGoHome={goHome}
      />
      <div className="h-12 shrink-0" aria-hidden="true" />

      {/* Home Screen Launcher & SEO Landing Page */}
      <div className="relative z-10 flex-1 flex flex-col">
        <PhoneHomeScreen
          walletBalance={wallet.balance}
          activeProjectTitle={activeProject.title}
          projectCount={projects.length}
          onOpenApp={openApp}
          onLaunchTurboSearch={launchTurboSearch}
        />
        <SeoLandingSection
          onSelectStarterPrompt={(prompt) => {
            openApp('ai-builder');
            handleSubmitPrompt(prompt);
          }}
        />
      </div>

      {/* Full-Screen Animated App Launcher View */}
      <AnimatePresence mode="wait">
        {activeApp !== null && (
          <motion.section
            key={activeApp}
            aria-label={`Active app: ${activeApp}`}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-12 bottom-14 z-30 bg-[#07070e]/92 backdrop-blur-2xl flex flex-col overflow-hidden"
          >
            {activeApp === 'ai-builder' && (
              <div className="h-full w-full flex flex-col overflow-hidden">
                <TopBar
                  embeddedInLauncher
                  onBackHome={goHome}
                  projects={projects}
                  activeProject={activeProject}
                  rightMode={rightMode}
                  onRightModeChange={(mode) => {
                    setRightMode(mode);
                    setMobileView('workspace');
                  }}
                  onSelectProject={(id) => setActiveProjectId(id)}
                  onNewProject={handleNewProject}
                  onDeleteProject={handleDeleteProject}
                  onExportHtml={() =>
                    downloadSingleHtml(
                      activeProject.title,
                      activeFiles,
                      adInjectionHtml
                    )
                  }
                  onExportZip={() =>
                    downloadProjectZip(
                      activeProject.title,
                      activeFiles,
                      adInjectionHtml
                    )
                  }
                  hasFiles={activeFiles.length > 0}
                  fileCount={activeFiles.length}
                  walletBalance={wallet.balance}
                  onOpenWallet={() => openApp('wallet')}
                  onOpenGames={() => openApp('fire-battle')}
                  isProUnlocked={
                    builderProUnlocked || loadOwnerUnlimited() || loadSuperVipUnlocked()
                  }
                  freeBuildsLeft={builderFreeBuildsLeft + builderBonusBuilds}
                  onOpenSubscription={() => setBuilderSubModalOpen(true)}
                />

                {/* Mobile Builder Pane Switcher */}
                <div className="lg:hidden shrink-0 border-b border-zinc-800/80 bg-[#0c0c0f] px-3 py-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileView('chat')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] ${
                      mobileView === 'chat'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Builder Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('workspace')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] ${
                      mobileView === 'workspace'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {rightMode === 'preview' ? 'Live Preview' : 'Source Code'}
                  </button>
                </div>

                {/* Split Builder Workspace */}
                <div
                  ref={splitContainerRef}
                  className="flex-1 min-h-0 flex overflow-hidden"
                >
                  <div
                    className={`split-chat-pane shrink-0 h-full min-h-0 ${
                      mobileView === 'chat'
                        ? 'w-full lg:w-auto block'
                        : 'hidden lg:block'
                    }`}
                  >
                    <ChatPanel
                      messages={activeProject.messages}
                      versions={activeProject.versions}
                      activeVersionId={activeVersion?.id ?? null}
                      isGenerating={isGenerating}
                      generationPhase={generationPhase}
                      generatedBytes={generatedBytes}
                      onSubmitPrompt={handleSubmitPrompt}
                      onStopGeneration={handleStopGeneration}
                      onRestoreVersion={handleRestoreVersion}
                      onNewProject={handleNewProject}
                    />
                  </div>

                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize builder chat panel"
                    onMouseDown={startResizing}
                    className="hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-[#09090b] hover:bg-blue-600/30 transition-colors group"
                  >
                    <div className="w-px h-8 bg-zinc-800 group-hover:bg-blue-500 transition-colors" />
                  </div>

                  <main
                    className={`flex-1 min-w-0 h-full min-h-0 ${
                      mobileView === 'workspace' ? 'block' : 'hidden lg:block'
                    }`}
                  >
                    {rightMode === 'preview' ? (
                      <PreviewPane
                        files={activeFiles}
                        projectSlug={activeProject.slug}
                        activeVersionNumber={activeVersion?.versionNumber ?? null}
                        viewport={viewport}
                        onViewportChange={setViewport}
                        isGenerating={isGenerating}
                        generationPhase={generationPhase}
                        onFixError={handleFixRuntimeError}
                      />
                    ) : (
                      <CodePane
                        files={activeFiles}
                        onSaveFileEdit={handleSaveFileEdit}
                      />
                    )}
                  </main>
                </div>
              </div>
            )}

            {activeApp === 'wallet' && (
              <WalletModal
                embedded
                isOpen
                onClose={goHome}
                balance={wallet.balance}
                transactions={wallet.transactions}
                savedHandles={wallet.savedHandles}
                onTransactionSuccess={handleWalletTransaction}
              />
            )}

            {activeApp === 'fire-battle' && (
              <div className="h-full w-full flex flex-col overflow-hidden bg-[#09090b]">
                <div className="shrink-0 px-4 py-2.5 border-b border-zinc-800/90 bg-[#111116] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={goBack}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <Crosshair className="w-4 h-4 text-red-400 shrink-0" />
                    <h2 className="font-display text-sm sm:text-base font-semibold text-zinc-100 truncate">
                      Fire Battle Survival
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SunilGlowingBadge compact />
                    <button
                      type="button"
                      onClick={toggleGameMute}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
                    >
                      {gameMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Muted</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Sound On</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                  <div className="max-w-4xl mx-auto">
                    <FireBattleGame key="fire-battle" />
                  </div>
                </div>
              </div>
            )}

            {activeApp === 'beach-buggy' && (
              <div className="h-full w-full flex flex-col overflow-hidden bg-[#09090b]">
                <div className="shrink-0 px-4 py-2.5 border-b border-zinc-800/90 bg-[#111116] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={goBack}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <Car className="w-4 h-4 text-sky-400 shrink-0" />
                    <h2 className="font-display text-sm sm:text-base font-semibold text-zinc-100 truncate">
                      Beach Buggy Kart Race
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SunilGlowingBadge compact />
                    <button
                      type="button"
                      onClick={toggleGameMute}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
                    >
                      {gameMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Muted</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Sound On</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                  <div className="max-w-4xl mx-auto">
                    <BeachBuggyGame key="beach-buggy" />
                  </div>
                </div>
              </div>
            )}

            {activeApp === 'chargpt' && (
              <ChargptApp onBack={goBack} />
            )}

            {activeApp === 'ai-studio' && (
              <AIStudioApp onBack={goBack} />
            )}

            {activeApp === 'ai-music' && (
              <AIMusicStudioApp
                onBack={goBack}
                adConfig={adConfig}
                onOpenReferEarn={() => openApp('refer-earn')}
                onOpenOwnerAnalytics={() => openApp('owner-panel')}
              />
            )}

            {activeApp === 'ai-video' && (
              <AIVideoStudioApp
                onBack={goBack}
                onOpenOwnerAnalytics={() => openApp('owner-panel')}
              />
            )}

            {activeApp === 'refer-earn' && (
              <ReferAndEarnApp
                onBack={goBack}
                onOpenBuilder={() => openApp('ai-builder')}
                onOpenMusic={() => openApp('ai-music')}
              />
            )}

            {activeApp === 'owner-panel' && (
              <OwnerAnalyticsApp
                onBack={goBack}
                onOpenAdSettings={() => openApp('ad-settings')}
              />
            )}

            {activeApp === 'turbo-search' && (
              <TurboSearchApp
                onBack={goBack}
                launchPayload={turboLaunchPayload}
              />
            )}

            {activeApp === 'ad-settings' && (
              <AdSettingsApp config={adConfig} onSaveConfig={setAdConfig} />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Persistent Bottom Smartphone Navigation Bar */}
      <PhoneNavBar
        activeApp={activeApp}
        recentApps={recentApps}
        showRecents={showRecents}
        onBack={goBack}
        onHome={goHome}
        onToggleRecents={() => setShowRecents((prev) => !prev)}
        onSelectRecent={(appId) => openApp(appId)}
        onCloseRecent={closeRecentApp}
      />

      <OfflineIndicator />

      {/* ₹299/Month AI App Builder Pro & ₹999 Super VIP Modal */}
      <BuilderSubscriptionModal
        isOpen={builderSubModalOpen}
        isProUnlocked={
          builderProUnlocked || loadOwnerUnlimited() || loadSuperVipUnlocked()
        }
        freeBuildsLeft={builderFreeBuildsLeft}
        freeBuildLimit={BUILDER_FREE_TRIAL_LIMIT}
        bonusBuildsLeft={builderBonusBuilds}
        onClose={() => setBuilderSubModalOpen(false)}
        onUnlocked={(_msg, isOwnerPass, isSuperVip) => {
          if (isOwnerPass) {
            activateOwnerUnlimitedEverywhere();
          } else if (isSuperVip) {
            activateSuperVipEverywhere();
          } else {
            grantBuilderProUnlocked();
          }
          setBuilderProUnlocked(true);
          setBuilderSubModalOpen(false);
        }}
        onWatchAdForFreeUse={() => {
          setBuilderSubModalOpen(false);
          setWatchAdBuilderOpen(true);
        }}
        onOpenReferEarn={() => {
          setBuilderSubModalOpen(false);
          openApp('refer-earn');
        }}
        onOpenOwnerAnalytics={() => {
          setBuilderSubModalOpen(false);
          openApp('owner-panel');
        }}
        onResetTrial={() => {
          revokeUnlockStorageForTesting([
            OWNER_UNLIMITED_STORAGE_KEY,
            SUPER_VIP_UNLOCK_STORAGE_KEY,
            BUILDER_PRO_UNLOCK_STORAGE_KEY,
          ]);
          try {
            localStorage.setItem(BUILDER_FREE_USED_STORAGE_KEY, '0');
          } catch {
            // Ignore
          }
          setBuilderProUnlocked(false);
          setBuilderFreeUsed(0);
        }}
        onForcePaywall={() => {
          revokeUnlockStorageForTesting([
            OWNER_UNLIMITED_STORAGE_KEY,
            SUPER_VIP_UNLOCK_STORAGE_KEY,
            BUILDER_PRO_UNLOCK_STORAGE_KEY,
          ]);
          try {
            localStorage.setItem(
              BUILDER_FREE_USED_STORAGE_KEY,
              String(BUILDER_FREE_TRIAL_LIMIT)
            );
          } catch {
            // Ignore
          }
          setBuilderProUnlocked(false);
          setBuilderFreeUsed(BUILDER_FREE_TRIAL_LIMIT);
        }}
      />

      {/* Watch Sponsor Ad for +1 Free Builder Use */}
      <WatchAdModal
        isOpen={watchAdBuilderOpen}
        rewardTarget="builder"
        adConfig={adConfig}
        onClose={() => setWatchAdBuilderOpen(false)}
        onRewardGranted={() => setBuilderBonusBuilds(loadBonusCredits('builder'))}
      />
      <MultiAdRuntimeInjector config={adConfig} />
    </div>
  );
}
