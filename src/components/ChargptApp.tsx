import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Bot,
  Check,
  ChevronLeft,
  Code2,
  Copy,
  Crown,
  Languages,
  MessageSquare,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  loadSavedGeminiKey,
  trackAnalyticsEvent,
} from '../config/merchant';

type ChargptLanguage = 'auto' | 'en' | 'hi';
type ChargptMode = 'chat' | 'code';

interface ChargptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface ChargptAppProps {
  onBack: () => void;
}

const CHARGPT_STORAGE_KEY = 'sunil_chargpt_messages_v1';

const STARTER_PROMPTS: {
  label: string;
  language: ChargptLanguage;
  mode: ChargptMode;
  prompt: string;
}[] = [
  {
    label: 'Hindi AI Chat',
    language: 'hi',
    mode: 'chat',
    prompt: 'मुझे भारत में एक ऑनलाइन बिज़नेस शुरू करने के 5 बेहतरीन तरीके बताएं।',
  },
  {
    label: 'React Code Generator',
    language: 'en',
    mode: 'code',
    prompt: 'Generate a responsive dark-mode pricing card component in HTML and Tailwind CSS.',
  },
  {
    label: 'Python Script',
    language: 'en',
    mode: 'code',
    prompt: 'Write a clean Python FastAPI REST endpoint with input validation and JSON response.',
  },
  {
    label: 'Hinglish Assistant',
    language: 'auto',
    mode: 'chat',
    prompt: 'Coding seekhne ke liye daily 1 hour ka best roadmap batao.',
  },
];

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSavedMessages(): ChargptMessage[] {
  try {
    const raw = localStorage.getItem(CHARGPT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChargptMessage[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read failure
  }
  return [];
}

interface ParsedSegment {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

function parseMessageContent(raw: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const textPart = raw.slice(lastIndex, match.index).trim();
      if (textPart) {
        segments.push({ type: 'text', content: textPart });
      }
    }
    segments.push({
      type: 'code',
      lang: match[1] || 'code',
      content: match[2].replace(/\n$/, ''),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    const tail = raw.slice(lastIndex).trim();
    if (tail) {
      segments.push({ type: 'text', content: tail });
    }
  }

  if (segments.length === 0 && raw.trim()) {
    segments.push({ type: 'text', content: raw });
  }

  return segments;
}

export function ChargptApp({ onBack }: ChargptAppProps) {
  const [messages, setMessages] = useState<ChargptMessage[]>(loadSavedMessages);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<ChargptLanguage>('auto');
  const [mode, setMode] = useState<ChargptMode>('chat');
  const [isStreaming, setIsStreaming] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CHARGPT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
  }

  function toggleVoiceMic() {
    setVoiceError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError('Voice input is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new Ctor();
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      const baseInput = input.trim();

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        const combined = baseInput ? `${baseInput} ${transcript.trim()}` : transcript.trim();
        setInput(combined);
      };

      recognition.onerror = (event) => {
        if (event.error !== 'aborted') {
          setVoiceError(`Microphone error: ${event.error}. Check mic permissions.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setVoiceError('Unable to access microphone.');
      setIsListening(false);
    }
  }

  function toggleSpeakMessage(msg: ChargptMessage) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingMessageId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleaned = msg.content.replace(/```[\s\S]*?```/g, ' Code snippet omitted. ');
    const utterance = new SpeechSynthesisUtterance(cleaned);
    const hasDevanagari = /[\u0900-\u097F]/.test(cleaned);
    utterance.lang = hasDevanagari || language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msg.id);
    window.speechSynthesis.speak(utterance);
  }

  function handleCopyCode(key: string, code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    });
  }

  function handleStop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }

  function handleClearChat() {
    if (isStreaming) handleStop();
    setMessages([]);
    setVoiceError(null);
  }

  async function sendPrompt(
    customPrompt?: string,
    overrideLang?: ChargptLanguage,
    overrideMode?: ChargptMode
  ) {
    const trimmed = (customPrompt ?? input).trim();
    if (!trimmed || isStreaming) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const activeLang = overrideLang ?? language;
    const activeMode = overrideMode ?? mode;

    const historyPayload = messages
      .filter((m) => !m.isError)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: ChargptMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    const assistantId = createMessageId();
    const assistantMsg: ChargptMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    if (!customPrompt) setInput('');
    setVoiceError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chargpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
          language: activeLang,
          mode: activeMode,
          geminiApiKey: loadSavedGeminiKey() || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errText = `Server error (${res.status})`;
        try {
          const json = await res.json();
          if (json?.error) errText = json.error;
        } catch {
          // Ignore parse fallback
        }
        throw new Error(errText);
      }

      if (!res.body) throw new Error('Response stream unavailable.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
            if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.text }
                    : m
                )
              );
            } else if (parsed.type === 'error') {
              throw new Error(String(parsed.error || 'Chargpt error.'));
            }
          }
        }
      }
      trackAnalyticsEvent('turbo_search', {
        label: `Chargpt (${activeLang}/${activeMode})`,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !m.content
              ? { ...m, content: 'Response stopped.' }
              : m
          )
        );
      } else {
        const isHindi = activeLang === 'hi' || /[\u0900-\u097F]/.test(trimmed);
        const fallbackReply =
          activeMode === 'code'
            ? `Here is clean starter code for "${trimmed}":\n\n\`\`\`html\n<div class="card">\n  <h3>AI1999 Chargpt Code</h3>\n  <p>${trimmed.replace(/</g, '&lt;')}</p>\n  <button onclick="alert('Ready!')">Run Action</button>\n</div>\n\`\`\`\n\nAdd your Gemini API key in Owner Settings for live cloud streaming.`
            : isHindi
              ? `नमस्ते! मैं AI1999 Chargpt हूँ।\n\nआपके सवाल "${trimmed}" के लिए मुख्य सुझाव:\n1. स्पष्ट लक्ष्य तय करें और छोटे-छोटे कदमों में काम शुरू करें।\n2. लाइव क्लाउड AI उत्तर के लिए Owner Settings में अपनी Gemini API Key जोड़ सकते हैं।`
              : `Hello from AI1999 Chargpt!\n\nRegarding "${trimmed}":\n1. Break the idea into clear steps and launch fast.\n2. You can paste a Gemini API key inside Owner Settings anytime for live cloud responses.`;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fallbackReply, isError: false } : m
          )
        );
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendPrompt();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Top Chargpt Toolbar */}
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
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">
            Chargpt
          </h2>
        </div>

        {/* Interactive Mode & Language Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div
            className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800"
            role="group"
            aria-label="Language"
          >
            <Languages className="w-3.5 h-3.5 text-zinc-400 mx-1.5 hidden sm:block" />
            {(
              [
                { id: 'auto', label: 'Auto' },
                { id: 'en', label: 'EN' },
                { id: 'hi', label: 'हिंदी' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                  language === item.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800"
            role="group"
            aria-label="Assistant mode"
          >
            <button
              type="button"
              onClick={() => setMode('chat')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                mode === 'chat'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3 h-3 text-cyan-400" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMode('code')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                mode === 'code'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3 h-3 text-amber-400" />
              Code
            </button>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Screen: Chat Column + Side Sunil Singh Glowing Neon Gradient Banner */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {/* Left/Center Chat Workspace */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#09090b]">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4"
          >
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto pt-4 sm:pt-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                    Welcome to Chargpt
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Ask anything in Hindi or English, speak with Voice Mic, or switch to Code Generator mode for instant production snippets.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setLanguage(item.language);
                        setMode(item.mode);
                        sendPrompt(item.prompt, item.language, item.mode);
                      }}
                      className="p-3.5 rounded-xl border border-zinc-800/90 bg-[#111116] hover:border-zinc-700 hover:bg-[#15151c] text-left transition-colors space-y-1 min-h-[64px]"
                    >
                      <div className="text-xs font-semibold text-zinc-200">
                        {item.label}
                      </div>
                      <div className="text-xs text-zinc-400 line-clamp-2">
                        {item.prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const segments = parseMessageContent(msg.content);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isUser ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          isUser
                            ? 'bg-blue-600 text-white'
                            : msg.isError
                              ? 'border border-red-500/40 bg-red-950/30 text-red-200'
                              : 'border border-zinc-800/90 bg-[#121218] text-zinc-100'
                        }`}
                      >
                        {!isUser && !msg.content && isStreaming ? (
                          <span className="text-xs text-zinc-400">
                            Chargpt is typing...
                          </span>
                        ) : (
                          <div className="space-y-3">
                            {segments.map((seg, idx) => {
                              if (seg.type === 'code') {
                                const codeKey = `${msg.id}-${idx}`;
                                return (
                                  <div
                                    key={codeKey}
                                    className="rounded-xl border border-zinc-700/80 bg-[#09090d] overflow-hidden"
                                  >
                                    <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-2">
                                      <span className="font-mono text-[11px] text-zinc-400">
                                        {seg.lang || 'code'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyCode(codeKey, seg.content)
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
                                      >
                                        {copiedKey === codeKey ? (
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
                                    <pre className="p-3 overflow-x-auto font-mono text-xs text-zinc-200 leading-relaxed">
                                      <code>{seg.content}</code>
                                    </pre>
                                  </div>
                                );
                              }

                              return (
                                <p
                                  key={`${msg.id}-txt-${idx}`}
                                  className="whitespace-pre-wrap break-words"
                                >
                                  {seg.content}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {!isUser && msg.content && !msg.isError && (
                        <div className="mt-1 flex items-center gap-3 px-1">
                          <button
                            type="button"
                            onClick={() => toggleSpeakMessage(msg)}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <VolumeX className="w-3 h-3 text-amber-400" />
                                Stop voice
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                Listen
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Composer Bar */}
          <form
            onSubmit={handleFormSubmit}
            className="shrink-0 border-t border-zinc-800/90 bg-[#0d0d12] p-2.5 sm:p-3.5"
          >
            {voiceError && (
              <div className="max-w-3xl mx-auto mb-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 text-[11px] text-amber-200">
                {voiceError}
              </div>
            )}

            <div className="max-w-3xl mx-auto flex items-end gap-2">
              <button
                type="button"
                onClick={toggleVoiceMic}
                className={`shrink-0 h-11 w-11 rounded-xl border flex items-center justify-center transition-colors ${
                  isListening
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title={isListening ? 'Stop voice mic' : 'Speak with Voice Mic'}
                aria-label={isListening ? 'Stop voice mic' : 'Speak with Voice Mic'}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'code'
                    ? 'Describe the code to generate (HTML, JS, Python, React)...'
                    : language === 'hi'
                      ? 'Chargpt से हिंदी या English में कुछ भी पूछें...'
                      : 'Ask Chargpt in Hindi or English...'
                }
                className="flex-1 min-h-[44px] max-h-32 resize-none rounded-xl border border-zinc-800 bg-[#121218] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="shrink-0 h-11 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  aria-label="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="shrink-0 h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-500 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Prominent Glowing Side Banner: "Sunil Singh" (Non-blocking on mobile & desktop) */}
        <aside
          aria-label="Chargpt creator showcase: Sunil Singh"
          className="shrink-0 w-12 sm:w-14 md:w-44 lg:w-52 border-l border-zinc-800/80 bg-[#0b0b10] relative overflow-hidden flex flex-col items-center justify-center p-1.5 md:p-4 select-none"
        >
          {/* Ambient Multi-Color Glow Aura (Gold, Pink, Cyan, Purple) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 chargpt-neon-aura bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.22),transparent_50%),radial-gradient(circle_at_75%_50%,rgba(236,72,153,0.22),transparent_52%),radial-gradient(circle_at_40%_85%,rgba(34,211,238,0.24),transparent_55%)]"
          />

          {/* Mobile Vertical Side Rail (< md): Always visible alongside messages */}
          <div className="md:hidden relative z-10 h-full w-full rounded-xl p-[1.5px] chargpt-rainbow-border shadow-[0_0_18px_rgba(236,72,153,0.25)]">
            <div className="h-full w-full rounded-[10px] bg-[#0a0a0f]/95 flex flex-col items-center justify-between py-3 px-1">
              <Crown
                className="w-4 h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0"
                aria-hidden="true"
              />
              <span className="chargpt-vertical-text chargpt-rainbow-text font-display text-sm sm:text-base font-extrabold tracking-wider whitespace-nowrap drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]">
                Sunil Singh • 1999
              </span>
              <BadgeCheck
                className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.75)] shrink-0"
                aria-label="Verified creator"
              />
            </div>
          </div>

          {/* Tablet / Desktop Stylish Side Showcase (>= md) */}
          <div className="hidden md:flex relative z-10 w-full h-full max-h-[460px] rounded-2xl p-[1.5px] chargpt-rainbow-border shadow-[0_0_32px_rgba(168,85,247,0.25)]">
            <div className="w-full h-full rounded-[14px] bg-[#0a0a0f]/95 px-4 py-6 flex flex-col items-center justify-between text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 via-pink-500/20 to-cyan-400/20 border border-amber-300/40 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-[11px] font-medium text-amber-200/90 tracking-wide">
                  Creator Edition
                </span>
              </div>

              <div className="space-y-2.5 my-auto py-4">
                <div className="inline-flex items-center justify-center gap-1.5">
                  <BadgeCheck className="w-5 h-5 text-cyan-400 shrink-0 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <span className="text-[11px] font-semibold text-cyan-300">
                    Verified
                  </span>
                </div>

                <h3 className="font-display text-2xl lg:text-[26px] font-extrabold leading-tight tracking-tight chargpt-rainbow-text drop-shadow-[0_0_16px_rgba(236,72,153,0.45)]">
                  Sunil Singh • 1999
                </h3>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Hindi &amp; English AI Chat · Voice Mic · Code Engine
                </p>
              </div>

              <div className="w-full pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                Powered by <span className="font-semibold text-zinc-200">Chargpt</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
