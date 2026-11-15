import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  History,
  Image as ImageIcon,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  loadSavedGeminiKey,
  trackAnalyticsEvent,
} from '../config/merchant';
import { SunilGlowingBadge } from './SunilGlowingBadge';

export interface TurboSearchLaunchPayload {
  query?: string;
  imageDataUrl?: string;
  autoVoice?: boolean;
  nonce: number;
}

interface SearchSource {
  title: string;
  uri: string;
  domain: string;
}

interface SearchResultEntry {
  id: string;
  query: string;
  mode: 'turbo' | 'deep';
  answer: string;
  sources: SearchSource[];
  webQueries: string[];
  elapsedMs: number;
  imageDataUrl?: string;
  createdAt: number;
}

interface TurboSearchAppProps {
  onBack: () => void;
  launchPayload?: TurboSearchLaunchPayload | null;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const HISTORY_STORAGE_KEY = 'sunil_turbo_ai_search_history_v1';

const TRENDING_QUERIES = [
  {
    label: 'Latest AI & Tech News',
    query: 'What are the biggest AI technology breakthroughs announced this week?',
    mode: 'deep' as const,
  },
  {
    label: 'Live Cricket / IPL Score',
    query: 'Latest India cricket match score and upcoming schedule today',
    mode: 'turbo' as const,
  },
  {
    label: 'Gold & Sensex Today India',
    query: 'Today 24K gold rate in India and Sensex Nifty market update',
    mode: 'turbo' as const,
  },
  {
    label: 'Full-Stack React 19 Guide',
    query: 'Compare React 19 Server Actions vs Next.js App Router performance with code example',
    mode: 'deep' as const,
  },
];

interface ParsedSegment {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

function parseAnswerSegments(raw: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: raw.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code',
      lang: match[1] || 'code',
      content: match[2].trimEnd(),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({
      type: 'text',
      content: raw.slice(lastIndex),
    });
  }

  return segments;
}

function loadHistory(): SearchResultEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SearchResultEntry[];
      if (Array.isArray(parsed)) return parsed.slice(0, 12);
    }
  } catch {
    // Ignore storage error
  }
  return [];
}

export function TurboSearchApp({ onBack, launchPayload }: TurboSearchAppProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'turbo' | 'deep'>('deep');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [history, setHistory] = useState<SearchResultEntry[]>(loadHistory);
  const [activeResult, setActiveResult] = useState<SearchResultEntry | null>(
    () => loadHistory()[0] ?? null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchPhase, setSearchPhase] = useState('Searching live Google index...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastProcessedNonceRef = useRef<number>(0);

  useEffect(() => {
    try {
      // Omit oversized base64 images from localStorage history to avoid quota overflow
      const compact = history.slice(0, 10).map((item) => ({
        ...item,
        imageDataUrl: undefined,
      }));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore quota errors
    }
  }, [history]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.stop();
    };
  }, []);

  const executeSearch = useCallback(
    async (
      customQuery?: string,
      customMode?: 'turbo' | 'deep',
      customImage?: string
    ) => {
      const q = (customQuery ?? query).trim();
      const img = customImage !== undefined ? customImage : imageDataUrl;
      const selectedMode = customMode ?? mode;

      if (!q && !img) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      setErrorMsg(null);
      setSearchPhase(
        img
          ? 'Analyzing image & querying live Google Search...'
          : selectedMode === 'deep'
            ? 'Running 10x Deep Research across live Google Search...'
            : 'Querying live Google Search...'
      );

      try {
        const res = await fetch('/api/turbo-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            mode: selectedMode,
            imageDataUrl: img || undefined,
            geminiApiKey: loadSavedGeminiKey() || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errText = `Search failed (${res.status})`;
          try {
            const j = (await res.json()) as { error?: string };
            if (j?.error) errText = j.error;
          } catch {
            // Fallback
          }
          throw new Error(errText);
        }

        if (!res.body) {
          throw new Error('Search stream unavailable.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let resultData: {
          query: string;
          answer: string;
          sources: SearchSource[];
          webQueries: string[];
          elapsedMs: number;
        } | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const rawEvent of events) {
            for (const line of rawEvent.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'progress' && parsed.phase) {
                setSearchPhase(String(parsed.phase));
              } else if (parsed.type === 'result' && parsed.data) {
                resultData = parsed.data;
              } else if (parsed.type === 'error') {
                throw new Error(String(parsed.error || 'Search error'));
              }
            }
          }
        }

        if (!resultData) {
          throw new Error('No search results returned.');
        }

        const entry: SearchResultEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          query: resultData.query,
          mode: selectedMode,
          answer: resultData.answer,
          sources: Array.isArray(resultData.sources) ? resultData.sources : [],
          webQueries: Array.isArray(resultData.webQueries)
            ? resultData.webQueries
            : [],
          elapsedMs: Number(resultData.elapsedMs) || 650,
          imageDataUrl: img || undefined,
          createdAt: Date.now(),
        };

        setActiveResult(entry);
        setHistory((prev) => [entry, ...prev].slice(0, 12));
        trackAnalyticsEvent('turbo_search', {
          label: `Turbo Search (${selectedMode}): ${q.slice(0, 60)}`,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setErrorMsg(
          err instanceof Error ? err.message : 'Unable to complete live search.'
        );
      } finally {
        abortRef.current = null;
        setIsSearching(false);
      }
    },
    [query, mode, imageDataUrl]
  );

  const toggleVoiceSearch = useCallback(() => {
    setVoiceError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceError('Voice search works in Chrome/Edge on desktop or Android.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
        if (transcript) {
          setQuery(transcript);
          executeSearch(transcript, mode, imageDataUrl);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError('Could not start microphone recognition.');
    }
  }, [isListening, executeSearch, mode, imageDataUrl]);

  // Handle direct launch payload from Home Screen search bar
  useEffect(() => {
    if (!launchPayload || launchPayload.nonce === lastProcessedNonceRef.current) {
      return;
    }
    lastProcessedNonceRef.current = launchPayload.nonce;

    const incomingQ = launchPayload.query?.trim() || '';
    const incomingImg = launchPayload.imageDataUrl || '';

    if (incomingQ) setQuery(incomingQ);
    if (incomingImg) setImageDataUrl(incomingImg);

    if (incomingQ || incomingImg) {
      executeSearch(incomingQ, 'deep', incomingImg);
    } else if (launchPayload.autoVoice) {
      setTimeout(() => {
        toggleVoiceSearch();
      }, 160);
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [launchPayload, executeSearch, toggleVoiceSearch]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        setImageDataUrl(dataUrl);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    executeSearch();
  }

  function handleCopyText(key: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    });
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#07070e]/95 text-zinc-100 overflow-hidden">
      {/* Top Turbo AI Search Toolbar */}
      <div className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-white/12 bg-[#0b0b15]/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-600 flex items-center justify-center text-white shadow-[0_0_16px_rgba(34,211,238,0.4)] shrink-0">
            <Zap className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-zinc-50 truncate">
              Turbo AI Search
            </h2>
          </div>

          <div className="hidden md:block">
            <SunilGlowingBadge compact />
          </div>
        </div>

        {/* Mode Selector (Turbo vs 10x Deep Research) + Clear */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center p-0.5 rounded-xl bg-white/[0.06] border border-white/15"
            role="group"
            aria-label="Search depth"
          >
            <button
              type="button"
              onClick={() => setMode('turbo')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                mode === 'turbo'
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-300" />
              Fast
            </button>
            <button
              type="button"
              onClick={() => setMode('deep')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                mode === 'deep'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              10x Deep Research
            </button>
          </div>

          {activeResult && (
            <button
              type="button"
              onClick={() => {
                setActiveResult(null);
                setQuery('');
                setImageDataUrl('');
                setErrorMsg(null);
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg border border-white/15 bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.12] transition-colors"
              title="New search"
              aria-label="New search"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Search Bar + Live Grounded Results */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Search & Results Column */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          {/* Glowing Frosted Search Bar Area */}
          <div className="shrink-0 px-3 sm:px-6 pt-3 pb-3 border-b border-white/10 bg-[#0a0a14]/70 backdrop-blur-xl">
            <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto space-y-2">
              <div className="rounded-full p-[1.5px] royal-metallic-gold-border shadow-[0_0_26px_rgba(34,211,238,0.22),0_0_16px_rgba(251,191,36,0.16)]">
                <div className="rounded-full bg-[#090912]/95 backdrop-blur-2xl px-3 sm:px-4 py-1.5 flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-300 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search on AI1999..."
                    aria-label="Search on AI1999"
                    className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-zinc-50 placeholder:text-zinc-400 focus:outline-none py-1.5"
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    aria-label="Upload image for visual search"
                  />

                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    title={isListening ? 'Stop voice search' : 'Voice search'}
                    aria-label={isListening ? 'Stop voice search' : 'Voice search'}
                    className={`p-2 rounded-full transition-colors shrink-0 ${
                      isListening
                        ? 'bg-red-500/25 text-red-300 border border-red-400/40'
                        : 'text-zinc-300 hover:text-cyan-300 hover:bg-white/10'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Visual Image / Camera Search"
                    aria-label="Upload image for visual search"
                    className={`p-2 rounded-full transition-colors shrink-0 ${
                      imageDataUrl
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                        : 'text-zinc-300 hover:text-amber-300 hover:bg-white/10'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  {isSearching ? (
                    <button
                      type="button"
                      onClick={() => {
                        abortRef.current?.abort();
                        setIsSearching(false);
                      }}
                      className="px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!query.trim() && !imageDataUrl}
                      className="px-3.5 sm:px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-white inline-flex items-center gap-1.5 shadow-[0_0_16px_rgba(34,211,238,0.35)] shrink-0 transition-all"
                    >
                      <span>Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {imageDataUrl && (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-amber-400/35 bg-amber-500/10 text-xs text-amber-200 w-fit">
                  <img
                    src={imageDataUrl}
                    alt="Selected visual search preview"
                    className="w-8 h-8 rounded-lg object-cover border border-white/20"
                  />
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Visual query image attached
                  </span>
                  <button
                    type="button"
                    onClick={() => setImageDataUrl('')}
                    className="p-1 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white"
                    aria-label="Remove attached image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {voiceError && (
                <div className="text-[11px] text-amber-300 px-2">{voiceError}</div>
              )}
            </form>
          </div>

          {/* Scrollable Output / Empty State */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-5">
            <div className="max-w-3xl mx-auto space-y-5">
              {isSearching && (
                <div className="glass-panel rounded-3xl p-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="font-display text-sm font-bold text-zinc-100">
                      {searchPhase}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Synthesizing verified facts &amp; Google Search citations...
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-2xl border border-red-500/40 bg-red-950/35 px-4 py-3 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              {activeResult ? (
                <div className="space-y-5">
                  {/* Query Heading & Live Stats Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-cyan-300 font-medium">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Live Google Search Grounded</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-300">
                          <Clock className="w-3 h-3" />
                          {(activeResult.elapsedMs / 1000).toFixed(2)}s
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {activeResult.sources.length} web source
                          {activeResult.sources.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-zinc-50 break-words">
                        {activeResult.query}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText('answer-full', activeResult.answer)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 transition-colors shrink-0"
                    >
                      {copiedKey === 'answer-full' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Answer
                        </>
                      )}
                    </button>
                  </div>

                  {/* Live Google Search Citations Strip */}
                  {activeResult.sources.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-300" />
                        Live Google Search Sources
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {activeResult.sources.map((src, idx) => (
                          <a
                            key={src.uri}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-panel glass-panel-interactive rounded-2xl p-3 flex flex-col justify-between gap-2 text-left group"
                          >
                            <div className="text-xs font-semibold text-zinc-100 line-clamp-2 group-hover:text-cyan-200 transition-colors">
                              {src.title}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                              <span className="truncate font-mono">
                                [{idx + 1}] {src.domain}
                              </span>
                              <ExternalLink className="w-3 h-3 text-cyan-300 shrink-0" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synthesized 10x Deep Research Answer */}
                  <article className="glass-panel rounded-3xl p-4 sm:p-6 space-y-3 text-sm text-zinc-100 leading-relaxed">
                    {activeResult.imageDataUrl && (
                      <div className="pb-2">
                        <img
                          src={activeResult.imageDataUrl}
                          alt="Visual query attachment"
                          className="max-h-48 rounded-2xl border border-white/15 object-contain"
                        />
                      </div>
                    )}

                    {parseAnswerSegments(activeResult.answer).map((seg, i) =>
                      seg.type === 'code' ? (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/15 bg-[#06060c] overflow-hidden my-2"
                        >
                          <div className="px-3 py-1.5 bg-white/[0.05] border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                            <span className="font-mono">{seg.lang}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(`code-${i}`, seg.content)
                              }
                              className="inline-flex items-center gap-1 text-zinc-300 hover:text-white"
                            >
                              {copiedKey === `code-${i}` ? (
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
                          <pre className="p-3.5 overflow-x-auto font-mono text-xs text-cyan-200 leading-relaxed">
                            <code>{seg.content}</code>
                          </pre>
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="whitespace-pre-wrap break-words text-zinc-100/95"
                        >
                          {seg.content}
                        </div>
                      )
                    )}

                    {activeResult.webQueries.length > 0 && (
                      <div className="pt-3 border-t border-white/10 text-[11px] text-zinc-400">
                        <span className="font-semibold text-zinc-300">
                          Google Queries Run:
                        </span>{' '}
                        {activeResult.webQueries.join(' · ')}
                      </div>
                    )}
                  </article>
                </div>
              ) : (
                !isSearching && (
                  <div className="space-y-6 pt-2">
                    <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-3">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>10x Deep Research &amp; Live Google Search</span>
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-50 text-balance">
                        Ask anything — get instant live web research, verified links, and visual answers
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Powered by live Google Search grounding, voice dictation, and camera image analysis. Zero ad clutter, instant synthesized answers.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-zinc-300">
                        Try a Live Search
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {TRENDING_QUERIES.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => {
                              setQuery(item.query);
                              setMode(item.mode);
                              executeSearch(item.query, item.mode, '');
                            }}
                            className="glass-panel glass-panel-interactive rounded-2xl p-4 text-left space-y-1.5"
                          >
                            <div className="text-xs font-bold text-amber-300 flex items-center justify-between gap-2">
                              <span>{item.label}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                            </div>
                            <div className="text-xs text-zinc-300 line-clamp-2">
                              {item.query}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Side Panel (Recent Searches + Luxury Sunil Singh Showcase on Desktop) */}
        <aside className="hidden lg:flex w-72 shrink-0 border-l border-white/12 bg-[#080812]/80 backdrop-blur-xl flex-col justify-between p-4 gap-4 overflow-y-auto">
          <div className="space-y-3 min-h-0 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-cyan-300" />
                Recent Searches ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    setActiveResult(null);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-red-300 inline-flex items-center gap-1"
                  title="Clear search history"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="glass-panel rounded-2xl p-4 text-xs text-zinc-400">
                Your recent Turbo AI searches will appear here for instant reload.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {history.map((item) => {
                  const isCurrent = activeResult?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveResult(item);
                        setQuery(item.query);
                      }}
                      className={`w-full text-left rounded-2xl p-3 border transition-all space-y-1 ${
                        isCurrent
                          ? 'border-cyan-400/50 bg-cyan-500/10'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-zinc-100 line-clamp-2">
                        {item.query}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
                        {(item.elapsedMs / 1000).toFixed(2)}s · {item.sources.length} sources
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-center">
            <SunilGlowingBadge variant="hero" className="w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}
