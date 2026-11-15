import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Code2,
  Crown,
  Download,
  Eye,
  FileCode,
  FolderPlus,
  Gamepad2,
  Layers,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { Project, RightPaneMode } from '../types/builder';
import { PWAInstallButton } from './PWAInstallButton';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface TopBarProps {
  projects: Project[];
  activeProject: Project;
  rightMode: RightPaneMode;
  onRightModeChange: (mode: RightPaneMode) => void;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onExportHtml: () => void;
  onExportZip: () => Promise<void>;
  hasFiles: boolean;
  fileCount: number;
  walletBalance: number;
  onOpenWallet: () => void;
  onOpenGames: () => void;
  embeddedInLauncher?: boolean;
  onBackHome?: () => void;
  isProUnlocked?: boolean;
  freeBuildsLeft?: number;
  onOpenSubscription?: () => void;
}

export function TopBar({
  projects,
  activeProject,
  rightMode,
  onRightModeChange,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onExportHtml,
  onExportZip,
  hasFiles,
  fileCount,
  walletBalance,
  onOpenWallet,
  onOpenGames,
  embeddedInLauncher = false,
  onBackHome,
  isProUnlocked = false,
  freeBuildsLeft = 1,
  onOpenSubscription,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportState, setExportState] = useState<'idle' | 'zipping' | 'done'>('idle');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleZipClick() {
    if (!hasFiles || exportState === 'zipping') return;
    setExportState('zipping');
    try {
      await onExportZip();
      setExportState('done');
      setTimeout(() => setExportState('idle'), 1800);
    } catch {
      setExportState('idle');
    }
  }

  return (
    <header className="min-h-12 md:h-13 py-1.5 md:py-0 shrink-0 border-b border-zinc-800/90 bg-[#0c0c0f] px-3 sm:px-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4 z-30">
      {/* Zone 1: Brand + Project Switcher + Creator */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {embeddedInLauncher && onBackHome ? (
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 shrink-0 px-2 py-1 rounded-md text-xs font-medium text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            title="Back to Home Screen"
          >
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-display text-sm font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
              AI App Builder
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-zinc-100 whitespace-nowrap">
              AI1999
            </span>
          </div>
        )}

        <span className="text-zinc-700 select-none" aria-hidden="true">
          /
        </span>

        <div className="relative min-w-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium text-zinc-200 hover:bg-zinc-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 max-w-[180px] sm:max-w-[220px]"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{activeProject.title}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {menuOpen && (
            <div
              className="absolute left-0 mt-1.5 w-72 rounded-lg border border-zinc-800 bg-[#121217] shadow-2xl py-1.5 z-50"
              role="listbox"
              aria-label="Projects"
            >
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-zinc-800/80">
                <span className="text-xs font-medium text-zinc-400">
                  Workspaces ({projects.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNewProject();
                    setMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  New project
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {projects.map((project) => {
                  const isActive = project.id === activeProject.id;
                  return (
                    <div
                      key={project.id}
                      className={`group flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-600/15 text-zinc-100'
                          : 'text-zinc-300 hover:bg-zinc-800/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(project.id);
                          setMenuOpen(false);
                        }}
                        className="flex-1 text-left min-w-0 pr-2"
                      >
                        <div className="font-medium truncate">{project.title}</div>
                        <div className="text-xs text-zinc-500 tabular-nums">
                          {project.versions.length > 0
                            ? `${project.versions.length} version${project.versions.length === 1 ? '' : 's'}`
                            : 'Empty draft'}
                        </div>
                      </button>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete project"
                          aria-label={`Delete ${project.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!embeddedInLauncher && (
          <>
            <span
              className="hidden md:inline-block h-4 w-px bg-zinc-800 shrink-0"
              aria-hidden="true"
            />

            <span className="hidden md:inline-flex items-center gap-1.5 text-sm whitespace-nowrap shrink-0">
              <span className="text-zinc-400">Built by</span>
              <span className="font-display font-semibold tracking-tight text-blue-400">
                Sunil Singh
              </span>
            </span>
          </>
        )}
      </div>

      {/* Zone 2: Preview / Code Mode Toggle */}
      <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800/80 shrink-0">
        <button
          type="button"
          onClick={() => onRightModeChange('preview')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            rightMode === 'preview'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => onRightModeChange('code')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            rightMode === 'code'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Code
          {hasFiles && (
            <span className="text-[11px] text-zinc-400 font-mono tabular-nums ml-0.5">
              ({fileCount})
            </span>
          )}
        </button>
      </div>

      {/* Zone 3: Quick Actions & Export */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenSubscription && (
          <button
            type="button"
            onClick={onOpenSubscription}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              isProUnlocked
                ? 'border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                : 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white hover:brightness-110 shadow-sm'
            }`}
            title="AI App Builder ₹299/Month Subscription & Owner Access"
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {isProUnlocked ? 'Pro Active' : `Pro ₹299/Mo (${freeBuildsLeft} free)`}
            </span>
            <span className="sm:hidden">
              {isProUnlocked ? 'Pro' : '₹299/Mo'}
            </span>
          </button>
        )}

        <SunilGlowingBadge compact />

        {!embeddedInLauncher && (
          <>
            <button
              type="button"
              onClick={onOpenGames}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Open Games Zone (Fire Battle Survival & Beach Buggy Kart Race)"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Games Zone</span>
            </button>
            <button
              type="button"
              onClick={onOpenWallet}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Razorpay & UPI Payments · 9541441025"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono tabular-nums">
                {walletBalance > 0
                  ? `₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                  : 'UPI Pay'}
              </span>
            </button>
            <PWAInstallButton />
          </>
        )}
        <button
          type="button"
          onClick={onExportHtml}
          disabled={!hasFiles}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <FileCode className="w-3.5 h-3.5 text-zinc-400" />
          Export HTML
        </button>
        <button
          type="button"
          onClick={handleZipClick}
          disabled={!hasFiles || exportState === 'zipping'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {exportState === 'done' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Downloaded
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              {exportState === 'zipping' ? 'Packaging...' : 'Download ZIP'}
            </>
          )}
        </button>
      </div>
    </header>
  );
}
