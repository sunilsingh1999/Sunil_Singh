import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
  Wrench,
} from 'lucide-react';
import type { GeneratedFile, ViewportMode } from '../types/builder';
import { assemblePreviewDocument } from '../utils/bundler';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface PreviewPaneProps {
  files: GeneratedFile[];
  projectSlug: string;
  activeVersionNumber: number | null;
  viewport: ViewportMode;
  onViewportChange: (viewport: ViewportMode) => void;
  isGenerating: boolean;
  generationPhase: string;
  onFixError: (errorMessage: string) => void;
}

interface RuntimeErrorInfo {
  message: string;
  line: number;
}

export function PreviewPane({
  files,
  projectSlug,
  activeVersionNumber,
  viewport,
  onViewportChange,
  isGenerating,
  generationPhase,
  onFixError,
}: PreviewPaneProps) {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runtimeError, setRuntimeError] = useState<RuntimeErrorInfo | null>(null);

  const hasFiles = files.length > 0;

  const previewHtml = useMemo(() => {
    if (!hasFiles) return '';
    return assemblePreviewDocument(files, { injectErrorBridge: true });
  }, [files, hasFiles]);

  // Clear runtime error whenever files update or reload is triggered
  useEffect(() => {
    setRuntimeError(null);
  }, [previewHtml, reloadNonce]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        typeof event.data === 'object' &&
        event.data.source === 'kinetix-preview' &&
        event.data.type === 'runtime-error'
      ) {
        setRuntimeError({
          message: String(event.data.message || 'Runtime script error'),
          line: Number(event.data.line || 0),
        });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const frameDimensionClass =
    viewport === 'mobile'
      ? 'w-[390px] h-[820px] max-h-full rounded-[28px] border-[6px] border-zinc-800 shadow-2xl'
      : viewport === 'tablet'
        ? 'w-[768px] max-w-full h-full rounded-xl border border-zinc-800 shadow-2xl'
        : 'w-full h-full rounded-lg border border-zinc-800/80 shadow-xl';

  return (
    <div
      className={`flex flex-col bg-[#09090b] min-w-0 ${
        isFullscreen ? 'fixed inset-x-0 top-12 bottom-14 z-50' : 'h-full relative'
      }`}
    >
      {/* Preview Toolbar */}
      <div className="h-11 shrink-0 px-3.5 border-b border-zinc-800/80 bg-[#0c0c0f] flex items-center justify-between gap-3">
        {/* Viewport Controls */}
        <div
          className="flex items-center p-0.5 rounded-md bg-zinc-900 border border-zinc-800/80 shrink-0"
          role="group"
          aria-label="Preview viewport size"
        >
          <button
            type="button"
            onClick={() => onViewportChange('desktop')}
            title="Desktop view"
            aria-label="Desktop view"
            aria-pressed={viewport === 'desktop'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewport === 'desktop'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => onViewportChange('tablet')}
            title="Tablet view (768px)"
            aria-label="Tablet view"
            aria-pressed={viewport === 'tablet'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewport === 'tablet'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => onViewportChange('mobile')}
            title="Mobile view (390px)"
            aria-label="Mobile view"
            aria-pressed={viewport === 'mobile'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewport === 'mobile'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        {/* Simulated Preview Address Bar */}
        <div className="hidden sm:flex flex-1 max-w-md items-center justify-between px-3 py-1 rounded-md bg-zinc-900/90 border border-zinc-800/80 text-xs text-zinc-400 font-mono min-w-0">
          <span className="truncate">
            preview://{projectSlug || 'new-workspace'}
          </span>
          {activeVersionNumber !== null && (
            <span className="text-zinc-500 tabular-nums shrink-0 ml-2">
              v{activeVersionNumber}
            </span>
          )}
        </div>

        {isFullscreen && <SunilGlowingBadge compact />}

        {/* Refresh & Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            disabled={!hasFiles}
            title="Reload preview"
            aria-label="Reload preview"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            disabled={!hasFiles}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Runtime Error Diagnostics Banner */}
      {runtimeError && (
        <div className="shrink-0 px-4 py-2.5 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-200 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate font-mono">
              {runtimeError.message}
              {runtimeError.line > 0 ? ` (line ${runtimeError.line})` : ''}
            </span>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => onFixError(runtimeError.message)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Wrench className="w-3 h-3" />
            Fix with AI
          </button>
        </div>
      )}

      {/* Preview Canvas */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-[#09090b] relative">
        {!hasFiles ? (
          <div className="max-w-md w-full text-center space-y-4 px-6 py-10 rounded-xl border border-zinc-800/70 bg-[#0d0d11]">
            <div className="mx-auto w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-900/90 flex items-center justify-center text-zinc-400">
              {isGenerating ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-base font-semibold text-zinc-100">
                {isGenerating ? generationPhase : 'AI1999 App Builder'}
              </h2>
              {!isGenerating && (
                <p className="text-xs font-medium text-zinc-300">
                  Built by <span className="text-blue-400 font-semibold">Sunil Singh • 1999</span>
                </p>
              )}
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isGenerating
                  ? 'Your generated application will render here automatically as soon as the files are ready.'
                  : 'Enter a prompt or pick a starter blueprint on the left. Your generated app runs live here with desktop, tablet, and mobile responsive testing.'}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`relative bg-white overflow-hidden transition-[width] duration-200 ease-out ${frameDimensionClass}`}
          >
            <iframe
              key={`${reloadNonce}-${activeVersionNumber ?? 0}`}
              srcDoc={previewHtml}
              title="Live Application Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-popups-to-escape-sandbox"
              className="w-full h-full border-0 bg-white block"
            />

            {isGenerating && (
              <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="px-4 py-3 rounded-xl border border-zinc-800 bg-[#111115] shadow-2xl flex items-center gap-3 text-sm text-zinc-100">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                  <span>{generationPhase}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
