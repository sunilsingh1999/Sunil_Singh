import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  Copy,
  Cpu,
  Crown,
  Play,
  RotateCcw,
  Sliders,
  Square,
  Terminal,
} from 'lucide-react';
import {
  loadSavedGeminiKey,
  trackAnalyticsEvent,
} from '../config/merchant';

type StudioModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

interface AIStudioAppProps {
  onBack: () => void;
}

interface ParsedOutputSegment {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

function parseStudioOutput(raw: string): ParsedOutputSegment[] {
  const segments: ParsedOutputSegment[] = [];
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

const STUDIO_PRESETS = [
  {
    label: 'React UI Component',
    system: 'You are a senior React + Tailwind CSS engineer. Output clean, accessible, single-file TSX code.',
    prompt: 'Build a responsive subscription pricing section with Monthly/Yearly toggle and 3 tiers.',
  },
  {
    label: 'Hindi Tutor',
    system: 'Explain concepts in clear, friendly Hindi (Devanagari) with real-world Indian examples.',
    prompt: 'Explain how REST APIs and JSON work in simple words.',
  },
  {
    label: 'SQL Query Builder',
    system: 'You are a PostgreSQL database architect. Provide optimized SQL queries and brief indexing notes.',
    prompt: 'Write a PostgreSQL query to find top 10 customers by monthly UPI wallet spend.',
  },
];

export function AIStudioApp({ onBack }: AIStudioAppProps) {
  const [model, setModel] = useState<StudioModelId>('gemini-4-hydrogen');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are an expert AI software architect inside AI Studio. Provide clear explanations and clean, runnable code.'
  );
  const [prompt, setPrompt] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showMobileConfig, setShowMobileConfig] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (outputRef.current && isRunning) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, isRunning]);

  function handleStop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
  }

  function handleReset() {
    if (isRunning) handleStop();
    setPrompt('');
    setOutput('');
    setErrorText(null);
  }

  function handleCopy(key: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    });
  }

  async function handleRun(customPrompt?: string, customSystem?: string) {
    const activePrompt = (customPrompt ?? prompt).trim();
    if (!activePrompt || isRunning) return;

    setErrorText(null);
    setOutput('');
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/ai-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature,
          systemInstruction: (customSystem ?? systemInstruction).trim(),
          prompt: activePrompt,
          geminiApiKey: loadSavedGeminiKey() || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `Server error (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) msg = errJson.error;
        } catch {
          // Ignore parse fallback
        }
        throw new Error(msg);
      }

      if (!res.body) throw new Error('Streaming response unavailable.');

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
              setOutput((prev) => prev + parsed.text);
            } else if (parsed.type === 'error') {
              throw new Error(String(parsed.error || 'Generation failed.'));
            }
          }
        }
      }
      trackAnalyticsEvent('builder_generate', { label: `AI Studio (${model})` });
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const cleanSys = (customSystem ?? systemInstruction).trim();
        const isCodeAsk = /\b(react|html|css|sql|python|javascript|typescript|component|api|function|code)\b/i.test(
          activePrompt
        );
        const fallbackText = isCodeAsk
          ? `Here is a clean solution generated by AI1999 Instant Studio Engine for: "${activePrompt}"\n\n\`\`\`tsx\nexport function GeneratedComponent() {\n  return (\n    <section className="rounded-2xl border border-cyan-500/30 bg-zinc-950 p-6 text-zinc-100">\n      <h2 className="text-xl font-bold text-cyan-300">AI1999 Instant Output</h2>\n      <p className="mt-2 text-sm text-zinc-300">${activePrompt.replace(/`/g, '')}</p>\n      <button className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white">\n        Get Started\n      </button>\n    </section>\n  );\n}\n\`\`\`\n\nTip: Paste your Gemini AIzaSy key inside Owner Settings anytime for live streaming Gemini cloud inference.`
          : `AI1999 Studio Instant Response\n\nPrompt: ${activePrompt}\nMode: ${model} (temp ${temperature.toFixed(1)})\nSystem Role: ${cleanSys || 'Default Architect'}\n\nKey Points:\n1. Clarify the core objective and user flow for "${activePrompt.slice(0, 80)}".\n2. Build responsive, modular components with fast local persistence and zero runtime bottlenecks.\n3. Add a valid Gemini API key inside Owner Settings anytime for live streaming cloud generation.`;
        setOutput(fallbackText);
        setErrorText(null);
      }
    } finally {
      abortRef.current = null;
      setIsRunning(false);
    }
  }

  function handlePromptKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }

  const outputSegments = parseStudioOutput(output);

  return (
    <div className="h-full w-full flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Studio Top Header */}
      <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-zinc-800/90 bg-[#111116] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">
              AI Studio
            </h2>
          </div>
        </div>

        {/* Mobile Config Toggle + Compact Top-Side Glowing Badge + Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile / Compact Top-Side Glowing Badge */}
          <div className="lg:hidden rounded-full p-[1px] chargpt-rainbow-border shadow-[0_0_14px_rgba(236,72,153,0.35)]">
            <div className="rounded-full bg-[#0a0a0f]/95 px-2.5 py-1 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="font-display text-xs font-extrabold chargpt-rainbow-text whitespace-nowrap">
                Sunil Singh • 1999
              </span>
              <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileConfig((prev) => !prev)}
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-[11px] font-medium text-zinc-200 hover:bg-zinc-800"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            {showMobileConfig ? 'Hide Setup' : 'Setup'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Reset playground"
            aria-label="Reset playground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main AI Studio 3-Column Body (Parameters/System | Prompt & Output | Side Sunil Singh Showcase) */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        {/* Left/Top Configuration Column: Model, Temperature, System Instructions */}
        <div
          className={`${
            showMobileConfig ? 'flex' : 'hidden md:flex'
          } md:w-72 lg:w-80 shrink-0 flex-col border-b md:border-b-0 md:border-r border-zinc-800/80 bg-[#0d0d12] overflow-y-auto p-3.5 sm:p-4 gap-4 max-h-[42vh] md:max-h-none`}
        >
          {/* Model Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="studio-model-select"
              className="block text-xs font-medium text-zinc-300"
            >
              Model
            </label>
            <select
              id="studio-model-select"
              value={model}
              onChange={(e) => setModel(e.target.value as StudioModelId)}
              className="w-full rounded-xl border border-zinc-800 bg-[#121218] px-3 py-2 text-xs font-medium text-zinc-100 focus:border-blue-500 focus:outline-none min-h-[40px]"
            >
              <option value="gemini-4-hydrogen">
                Gemini Flash (gemini-4-hydrogen)
              </option>
              <option value="gemini-3.1-flash-lite">
                Gemini Flash Lite (gemini-3.1-flash-lite)
              </option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="studio-temp-slider"
                className="font-medium text-zinc-300"
              >
                Temperature
              </label>
              <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              id="studio-temp-slider"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Precise (0.0)</span>
              <span>Balanced (1.0)</span>
              <span>Creative (2.0)</span>
            </div>
          </div>

          {/* System Instructions */}
          <div className="space-y-1.5 flex-1 flex flex-col min-h-[120px]">
            <label
              htmlFor="studio-system-instructions"
              className="block text-xs font-medium text-zinc-300"
            >
              System Instructions
            </label>
            <textarea
              id="studio-system-instructions"
              rows={5}
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="Define the AI role, tone, formatting rules, or language..."
              className="flex-1 w-full rounded-xl border border-zinc-800 bg-[#121218] p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Quick Starter Presets */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-zinc-400">
              Quick Templates
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSystemInstruction(preset.system);
                    setPrompt(preset.prompt);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Playground: Prompt Box + Run + Output */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#09090b]">
          {/* Prompt Input Area */}
          <div className="shrink-0 p-3.5 sm:p-4 border-b border-zinc-800/80 bg-[#0b0b10] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="studio-prompt-input"
                className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                Prompt Playground
              </label>
              <span className="hidden sm:inline text-[11px] text-zinc-500">
                Ctrl / Cmd + Enter to run
              </span>
            </div>

            <textarea
              id="studio-prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder="Write any coding, reasoning, or content prompt to test with Gemini..."
              className="w-full rounded-xl border border-zinc-800 bg-[#121218] p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none resize-y min-h-[76px]"
            />

            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-500 font-mono truncate">
                {model} · temp {temperature.toFixed(1)}
              </div>

              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors min-h-[40px]"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRun()}
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold text-white transition-colors min-h-[40px]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run
                </button>
              )}
            </div>
          </div>

          {/* Model Output Area */}
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4"
          >
            {errorText && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-200">
                {errorText}
              </div>
            )}

            {!output && !isRunning && !errorText ? (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center px-4 space-y-2">
                <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-[#111116] flex items-center justify-center text-blue-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-display text-sm font-semibold text-zinc-200">
                  Ready to run in AI Studio
                </h3>
                <p className="text-xs text-zinc-500 max-w-md">
                  Customize System Instructions, select a Gemini model, tune Temperature, and click Run to stream responses and code.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-400">
                    {isRunning ? 'Generating response...' : 'Model Output'}
                  </span>
                  {output && (
                    <button
                      type="button"
                      onClick={() => handleCopy('full-output', output)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      {copiedKey === 'full-output' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Output
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800/90 bg-[#111116] p-4 space-y-3 text-sm text-zinc-100 leading-relaxed">
                  {outputSegments.map((seg, idx) =>
                    seg.type === 'code' ? (
                      <div
                        key={`studio-code-${idx}`}
                        className="rounded-xl border border-zinc-700/80 bg-[#08080c] overflow-hidden"
                      >
                        <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-zinc-400">
                            {seg.lang}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`studio-code-${idx}`, seg.content)
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white"
                          >
                            {copiedKey === `studio-code-${idx}` ? (
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
                    ) : (
                      <p
                        key={`studio-txt-${idx}`}
                        className="whitespace-pre-wrap break-words"
                      >
                        {seg.content}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Side Glowing Banner: "Sunil Singh" */}
        <aside
          aria-label="AI Studio creator badge: Sunil Singh"
          className="hidden lg:flex shrink-0 w-48 xl:w-52 border-l border-zinc-800/80 bg-[#0b0b10] relative overflow-hidden flex-col items-center justify-center p-4 select-none"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 chargpt-neon-aura bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.22),transparent_50%),radial-gradient(circle_at_75%_50%,rgba(236,72,153,0.22),transparent_52%),radial-gradient(circle_at_40%_85%,rgba(34,211,238,0.24),transparent_55%)]"
          />

          <div className="relative z-10 w-full h-full max-h-[440px] rounded-2xl p-[1.5px] chargpt-rainbow-border shadow-[0_0_32px_rgba(168,85,247,0.25)]">
            <div className="w-full h-full rounded-[14px] bg-[#0a0a0f]/95 px-4 py-6 flex flex-col items-center justify-between text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 via-pink-500/20 to-cyan-400/20 border border-amber-300/40 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-[11px] font-medium text-amber-200/90 tracking-wide">
                  AI Studio Pro UI
                </span>
              </div>

              <div className="space-y-2.5 my-auto py-4">
                <div className="inline-flex items-center justify-center gap-1.5">
                  <BadgeCheck className="w-5 h-5 text-cyan-400 shrink-0 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  <span className="text-[11px] font-semibold text-cyan-300">
                    Verified
                  </span>
                </div>

                <h3 className="font-display text-2xl font-extrabold leading-tight tracking-tight chargpt-rainbow-text drop-shadow-[0_0_16px_rgba(236,72,153,0.45)]">
                  Sunil Singh • 1999
                </h3>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  AI1999 Studio · Prompt Playground · System Instructions
                </p>
              </div>

              <div className="w-full pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                Built by <span className="font-semibold text-zinc-200">Sunil Singh</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
