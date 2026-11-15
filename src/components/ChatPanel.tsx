import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  CornerDownRight,
  FileText,
  History,
  Loader2,
  Plus,
  Square,
} from 'lucide-react';
import type { ChatMessage, ProjectVersion } from '../types/builder';
import { STARTER_BLUEPRINTS } from '../data/starters';

interface ChatPanelProps {
  messages: ChatMessage[];
  versions: ProjectVersion[];
  activeVersionId: string | null;
  isGenerating: boolean;
  generationPhase: string;
  generatedBytes: number;
  onSubmitPrompt: (prompt: string) => void;
  onStopGeneration: () => void;
  onRestoreVersion: (versionId: string) => void;
  onNewProject: () => void;
}

export function ChatPanel({
  messages,
  versions,
  activeVersionId,
  isGenerating,
  generationPhase,
  generatedBytes,
  onSubmitPrompt,
  onStopGeneration,
  onRestoreVersion,
  onNewProject,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating, generationPhase]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    setInput('');
    onSubmitPrompt(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasHistory = messages.length > 0;

  return (
    <aside className="flex flex-col h-full bg-[#0c0c0f] border-r border-zinc-800/90 min-w-0">
      {/* Sub-header for Chat & Version Count */}
      <div className="h-11 shrink-0 px-4 border-b border-zinc-800/80 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400">
          Builder Chat
        </span>
        <div className="flex items-center gap-3">
          {versions.length > 0 && (
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {versions.length} snapshot{versions.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={onNewProject}
            disabled={isGenerating}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New chat
          </button>
        </div>
      </div>

      {/* Scrollable Conversation or Starter Blueprints */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {!hasHistory ? (
          <div className="space-y-6 py-2">
            <div className="space-y-2.5 pb-4 border-b border-zinc-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-display font-medium text-zinc-300">
                  AI1999 App Builder
                </span>
                <span className="text-zinc-400">
                  Built by{' '}
                  <span className="font-display font-semibold text-blue-400">
                    Sunil Singh • 1999
                  </span>
                </span>
              </div>
              <h1 className="font-display text-xl font-semibold tracking-tight text-zinc-100">
                What do you want to build?
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Describe any website, interactive dashboard, or web app. Refine it step-by-step with follow-up prompts and export clean HTML or ZIP code.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-medium text-zinc-500">
                Starter blueprints
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {STARTER_BLUEPRINTS.map((bp) => (
                  <button
                    key={bp.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => onSubmitPrompt(bp.prompt)}
                    className="group text-left p-3.5 rounded-lg border border-zinc-800/90 bg-[#111115] hover:border-zinc-700 hover:bg-[#15151b] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-100 group-hover:text-blue-400 transition-colors">
                        {bp.title}
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {bp.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {bp.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[88%] rounded-xl bg-zinc-800/90 border border-zinc-700/60 px-3.5 py-2.5 text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              const isActiveVersion =
                msg.versionId !== undefined && msg.versionId === activeVersionId;

              return (
                <div key={msg.id} className="space-y-3">
                  <div
                    className={`rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${
                      msg.isError
                        ? 'border-red-500/40 bg-red-950/20 text-red-200'
                        : 'border-zinc-800/90 bg-[#111115] text-zinc-200'
                    }`}
                  >
                    {msg.isError ? (
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="font-medium text-red-300">
                            Generation failed
                          </div>
                          <div className="text-xs text-red-200/90">{msg.content}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-zinc-200">{msg.content}</p>

                        {msg.updatedFiles && msg.updatedFiles.length > 0 && (
                          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 font-mono">
                              {msg.updatedFiles.map((filePath) => (
                                <span
                                  key={filePath}
                                  className="inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3 text-zinc-500" />
                                  {filePath}
                                </span>
                              ))}
                            </div>

                            {msg.versionId && (
                              <button
                                type="button"
                                onClick={() => onRestoreVersion(msg.versionId!)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono tabular-nums transition-colors ${
                                  isActiveVersion
                                    ? 'bg-blue-600/20 text-blue-300'
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                                }`}
                                title={
                                  isActiveVersion
                                    ? 'Currently active snapshot'
                                    : 'Restore this version'
                                }
                              >
                                <History className="w-3 h-3" />
                                v{msg.versionNumber}
                                {isActiveVersion ? ' · Active' : ' · Restore'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.suggestions &&
                    msg.suggestions.length > 0 &&
                    msg.versionId === activeVersionId &&
                    !isGenerating && (
                      <div className="space-y-1.5 pl-1">
                        <div className="text-[11px] font-medium text-zinc-500">
                          Suggested refinements
                        </div>
                        <div className="flex flex-col items-start gap-1.5">
                          {msg.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => onSubmitPrompt(suggestion)}
                              className="inline-flex items-center gap-1.5 text-left text-xs text-zinc-300 hover:text-blue-300 transition-colors py-0.5"
                            >
                              <CornerDownRight className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span>{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}

            {isGenerating && (
              <div className="rounded-xl border border-zinc-800 bg-[#111115] px-3.5 py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-200 min-w-0">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                    <span className="truncate">{generationPhase}</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 tabular-nums shrink-0">
                    {(generatedBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt Composer */}
      <div className="shrink-0 p-3.5 border-t border-zinc-800/90 bg-[#0c0c0f]">
        <div className="rounded-xl border border-zinc-800 bg-[#121217] focus-within:border-blue-500/70 transition-colors">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasHistory
                ? 'Describe changes or new features to add...'
                : 'Describe the website or app you want to build...'
            }
            disabled={isGenerating}
            className="w-full resize-none bg-transparent px-3.5 pt-3 pb-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <span className="text-[11px] text-zinc-500">
              Enter to send · Shift+Enter for new line
            </span>
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                {hasHistory ? 'Update app' : 'Build app'}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
