import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  FileCode2,
  Pencil,
  Save,
} from 'lucide-react';
import type { GeneratedFile } from '../types/builder';

interface CodePaneProps {
  files: GeneratedFile[];
  onSaveFileEdit: (path: string, newContent: string) => void;
}

function formatByteSize(text: string): string {
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function CodePane({ files, onSaveFileEdit }: CodePaneProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (files.length === 0) {
      setSelectedPath('');
      return;
    }
    const stillExists = files.some((f) => f.path === selectedPath);
    if (!stillExists) {
      setSelectedPath(files[0].path);
    }
  }, [files, selectedPath]);

  const activeFile = useMemo(
    () => files.find((f) => f.path === selectedPath) ?? files[0] ?? null,
    [files, selectedPath]
  );

  useEffect(() => {
    setIsEditing(false);
    setDraftContent(activeFile?.content ?? '');
  }, [activeFile?.path, activeFile?.content]);

  async function handleCopy() {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(isEditing ? draftContent : activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  }

  function handleSaveEdit() {
    if (!activeFile) return;
    onSaveFileEdit(activeFile.path, draftContent);
    setIsEditing(false);
  }

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#09090b] p-6">
        <div className="max-w-sm text-center space-y-2">
          <div className="mx-auto w-11 h-11 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400">
            <FileCode2 className="w-5 h-5" />
          </div>
          <h2 className="font-display text-base font-semibold text-zinc-100">
            No generated files yet
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Once you generate an application, inspect and edit the HTML, CSS, and JavaScript source files here.
          </p>
        </div>
      </div>
    );
  }

  const lines = (activeFile?.content ?? '').split('\n');

  return (
    <div className="h-full flex bg-[#09090b] min-w-0">
      {/* File Tree Sidebar */}
      <div className="w-52 shrink-0 border-r border-zinc-800/80 bg-[#0c0c0f] flex flex-col">
        <div className="h-11 px-3.5 border-b border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Files</span>
          <span className="text-xs font-mono text-zinc-500 tabular-nums">
            {files.length}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1" aria-label="Generated files">
          {files.map((file) => {
            const active = file.path === activeFile?.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs font-mono transition-colors ${
                  active
                    ? 'bg-blue-600/15 text-blue-300'
                    : 'text-zinc-300 hover:bg-zinc-800/70'
                }`}
              >
                <span className="truncate">{file.path}</span>
                <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
                  {formatByteSize(file.content)}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Code Viewer / Live Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        <div className="h-11 shrink-0 px-4 border-b border-zinc-800/80 bg-[#0c0c0f] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono font-medium text-zinc-200 truncate">
              {activeFile?.path}
            </span>
            <span className="text-xs font-mono text-zinc-500 tabular-nums shrink-0">
              {lines.length} lines
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraftContent(activeFile?.content ?? '');
                    setIsEditing(false);
                  }}
                  className="px-2.5 py-1 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Apply to preview
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                Edit
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isEditing ? (
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              spellCheck={false}
              className="w-full h-full p-4 bg-[#09090b] text-zinc-200 font-mono text-xs leading-6 resize-none focus:outline-none"
            />
          ) : (
            <div className="py-3 font-mono text-xs leading-6 min-w-max">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="flex px-4 hover:bg-zinc-900/60"
                >
                  <span className="w-10 shrink-0 select-none text-right pr-4 text-zinc-600 tabular-nums">
                    {index + 1}
                  </span>
                  <span className="text-zinc-200 whitespace-pre">
                    {line || ' '}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
