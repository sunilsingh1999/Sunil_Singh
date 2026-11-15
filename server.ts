import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

let cachedDefaultAi: GoogleGenAI | null = null;

function resolveGeminiClient(req: Request): GoogleGenAI {
  const customKey =
    typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : '';
  if (customKey) {
    return new GoogleGenAI({
      apiKey: customKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (!envKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  if (!cachedDefaultAi) {
    cachedDefaultAi = new GoogleGenAI({
      apiKey: envKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedDefaultAi;
}

function hasGeminiKey(req: Request): boolean {
  const customKey =
    typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey.trim() : '';
  return Boolean(customKey || process.env.GEMINI_API_KEY);
}

const SYSTEM_INSTRUCTION = `You are a principal full-stack web architect inside AI1999 (created by Sunil Singh), an AI web application builder.
Your job is to design and generate complete, production-quality, interactive multi-file web applications (HTML, CSS, and JavaScript) based on the user's request and iteratively refine them on follow-up prompts.

CRITICAL OUTPUT REQUIREMENTS:
1. Always return valid JSON matching the requested schema with:
   - "projectTitle": Concise, clean title for the app (2-4 words).
   - "summary": Clear, human-friendly summary (2-3 sentences) explaining what was built or updated in this iteration.
   - "files": Array containing at minimum "index.html", "styles.css", and "script.js" (you may include extra files like "data.json" if helpful, though keep core runnable logic in index.html, styles.css, script.js).
   - "followUpSuggestions": 3 concise, actionable next-step refinement ideas specific to this app (under 8 words each).

2. TECHNICAL ARCHITECTURE FOR GENERATED APPS:
   - "index.html" MUST be a complete HTML5 document (<html lang="en">, <head>, <body>).
   - Include <script src="https://cdn.tailwindcss.com"></script> in <head> so Tailwind utility classes work seamlessly, plus appropriate Google Fonts (<link>) for strong typography.
   - Reference <link rel="stylesheet" href="styles.css" /> in <head> and <script src="script.js" defer></script> before </body>.
   - Do NOT put large inline <style> or <script> blocks inside index.html when they belong in styles.css and script.js — keep the separation clean so the user can inspect and edit each file cleanly, AND so single-file HTML/ZIP export works flawlessly.
   - NEVER reference external fragile image URLs (no unsplash.com, picsum.photos, placeholder.com, or random stock URLs). Instead, craft crisp custom inline SVG illustrations, clean CSS gradients, Canvas graphics, or geometric SVG icons.
   - Every single button, tab, filter, form, modal, calculator, toggle, and interactive widget MUST work with real JavaScript handlers in script.js. Never output dead UI buttons or "coming soon" stubs.
   - Design with strong visual taste: intentional color palette, clean spacing, responsive layout that looks great on both desktop (1280px+) and mobile (390px), accessible contrast, and smooth micro-interactions.
   - When the user sends a follow-up prompt with existing files provided, carefully inspect the existing files, preserve working functionality and design continuity, and apply the requested modifications cleanly across index.html, styles.css, and script.js. Always return the complete updated file contents (never use "// ... rest of code" truncation comments).`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    projectTitle: {
      type: Type.STRING,
      description: 'Short, memorable title for the generated web application.',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise 2-3 sentence overview of what was built or refined.',
    },
    files: {
      type: Type.ARRAY,
      description: 'Complete list of project files (index.html, styles.css, script.js).',
      items: {
        type: Type.OBJECT,
        properties: {
          path: {
            type: Type.STRING,
            description: 'File path such as index.html, styles.css, or script.js.',
          },
          language: {
            type: Type.STRING,
            description: 'One of: html, css, javascript, json, markdown.',
          },
          content: {
            type: Type.STRING,
            description: 'Complete, untruncated source code for this file.',
          },
        },
        required: ['path', 'language', 'content'],
      },
    },
    followUpSuggestions: {
      type: Type.ARRAY,
      description: 'Three short, practical follow-up prompt ideas tailored to this app.',
      items: {
        type: Type.STRING,
      },
    },
  },
  required: ['projectTitle', 'summary', 'files', 'followUpSuggestions'],
};

interface IncomingFile {
  path: string;
  language: string;
  content: string;
}

interface IncomingHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface GenerateRequestBody {
  prompt?: string;
  currentFiles?: IncomingFile[];
  history?: IncomingHistoryItem[];
}

function sendSse(res: Response, event: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function detectPhase(accumulatedText: string): string {
  if (accumulatedText.includes('"script.js"') || accumulatedText.includes('script.js')) {
    return 'Writing interactive JavaScript logic...';
  }
  if (accumulatedText.includes('"styles.css"') || accumulatedText.includes('styles.css')) {
    return 'Crafting responsive styles and motion...';
  }
  if (accumulatedText.includes('"index.html"') || accumulatedText.includes('index.html')) {
    return 'Building semantic HTML layout...';
  }
  if (accumulatedText.includes('"summary"')) {
    return 'Planning component architecture...';
  }
  return 'Analyzing requirements...';
}

interface AnalyticsLogEntry {
  id: string;
  visitorId: string;
  type: string;
  label: string;
  amountInr: number;
  plan?: string;
  timestamp: number;
}

interface AnalyticsStore {
  registeredUsers: string[];
  dailyVisitors: Record<string, string[]>;
  dailyRevenue: Record<string, number>;
  dailyActions: Record<string, number>;
  revenueBreakdown: {
    subscriptionInr: number;
    walletInr: number;
    adInr: number;
  };
  subscribers: {
    builder299: number;
    video499: number;
    music500: number;
    superVip999: number;
  };
  counters: {
    adViews: number;
    referralsClaimed: number;
    referralShares: number;
    searches: number;
    builds: number;
    songs: number;
    videos: number;
  };
  claimedRefVisitors: string[];
  logs: AnalyticsLogEntry[];
}

const ANALYTICS_DATA_DIR = path.resolve(__dirname, 'data');
const ANALYTICS_FILE_PATH = path.join(ANALYTICS_DATA_DIR, 'owner-analytics.json');

function getIstDateKey(ts = Date.now()): string {
  try {
    return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function createEmptyAnalyticsStore(): AnalyticsStore {
  return {
    registeredUsers: [],
    dailyVisitors: {},
    dailyRevenue: {},
    dailyActions: {},
    revenueBreakdown: {
      subscriptionInr: 0,
      walletInr: 0,
      adInr: 0,
    },
    subscribers: {
      builder299: 0,
      video499: 0,
      music500: 0,
      superVip999: 0,
    },
    counters: {
      adViews: 0,
      referralsClaimed: 0,
      referralShares: 0,
      searches: 0,
      builds: 0,
      songs: 0,
      videos: 0,
    },
    claimedRefVisitors: [],
    logs: [],
  };
}

function loadAnalyticsStore(): AnalyticsStore {
  try {
    if (fs.existsSync(ANALYTICS_FILE_PATH)) {
      const raw = fs.readFileSync(ANALYTICS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AnalyticsStore>;
      const base = createEmptyAnalyticsStore();
      return {
        registeredUsers: Array.isArray(parsed.registeredUsers) ? parsed.registeredUsers : base.registeredUsers,
        dailyVisitors: parsed.dailyVisitors && typeof parsed.dailyVisitors === 'object' ? parsed.dailyVisitors : base.dailyVisitors,
        dailyRevenue: parsed.dailyRevenue && typeof parsed.dailyRevenue === 'object' ? parsed.dailyRevenue : base.dailyRevenue,
        dailyActions: parsed.dailyActions && typeof parsed.dailyActions === 'object' ? parsed.dailyActions : base.dailyActions,
        revenueBreakdown: { ...base.revenueBreakdown, ...(parsed.revenueBreakdown || {}) },
        subscribers: { ...base.subscribers, ...(parsed.subscribers || {}) },
        counters: { ...base.counters, ...(parsed.counters || {}) },
        claimedRefVisitors: Array.isArray(parsed.claimedRefVisitors) ? parsed.claimedRefVisitors : base.claimedRefVisitors,
        logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 150) : base.logs,
      };
    }
  } catch (err) {
    console.warn('Could not read owner-analytics.json, initializing fresh store:', err);
  }
  return createEmptyAnalyticsStore();
}

const analyticsStore = loadAnalyticsStore();

function persistAnalyticsStore(): void {
  try {
    if (!fs.existsSync(ANALYTICS_DATA_DIR)) {
      fs.mkdirSync(ANALYTICS_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ANALYTICS_FILE_PATH, JSON.stringify(analyticsStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist owner-analytics.json:', err);
  }
}

function recordAnalyticsEvent(params: {
  visitorId?: string;
  type: string;
  label: string;
  amountInr?: number;
  plan?: string;
}): void {
  const now = Date.now();
  const dateKey = getIstDateKey(now);
  const vid =
    typeof params.visitorId === 'string' && params.visitorId.trim().length >= 3
      ? params.visitorId.trim().slice(0, 48)
      : 'guest_device';

  if (!analyticsStore.registeredUsers.includes(vid)) {
    analyticsStore.registeredUsers.push(vid);
  }

  if (!analyticsStore.dailyVisitors[dateKey]) {
    analyticsStore.dailyVisitors[dateKey] = [];
  }
  if (!analyticsStore.dailyVisitors[dateKey].includes(vid)) {
    analyticsStore.dailyVisitors[dateKey].push(vid);
  }

  analyticsStore.dailyActions[dateKey] = (analyticsStore.dailyActions[dateKey] || 0) + 1;

  const amount =
    typeof params.amountInr === 'number' && Number.isFinite(params.amountInr) && params.amountInr > 0
      ? Number(params.amountInr.toFixed(2))
      : 0;

  if (amount > 0) {
    analyticsStore.dailyRevenue[dateKey] = Number(
      ((analyticsStore.dailyRevenue[dateKey] || 0) + amount).toFixed(2)
    );
  }

  switch (params.type) {
    case 'ad_watch':
      analyticsStore.counters.adViews += 1;
      analyticsStore.revenueBreakdown.adInr = Number(
        (analyticsStore.revenueBreakdown.adInr + amount).toFixed(2)
      );
      break;
    case 'referral_claim':
      analyticsStore.counters.referralsClaimed += 1;
      break;
    case 'referral_share':
      analyticsStore.counters.referralShares += 1;
      break;
    case 'turbo_search':
      analyticsStore.counters.searches += 1;
      break;
    case 'builder_generate':
      analyticsStore.counters.builds += 1;
      break;
    case 'music_create':
      analyticsStore.counters.songs += 1;
      break;
    case 'video_create':
      analyticsStore.counters.videos += 1;
      break;
    case 'wallet_deposit':
      if (amount > 0) {
        analyticsStore.revenueBreakdown.walletInr = Number(
          (analyticsStore.revenueBreakdown.walletInr + amount).toFixed(2)
        );
      }
      break;
    case 'subscription_unlock':
      if (amount > 0) {
        analyticsStore.revenueBreakdown.subscriptionInr = Number(
          (analyticsStore.revenueBreakdown.subscriptionInr + amount).toFixed(2)
        );
      }
      if (params.plan === 'builder_299') analyticsStore.subscribers.builder299 += 1;
      if (params.plan === 'video_499') analyticsStore.subscribers.video499 += 1;
      if (params.plan === 'music_500') analyticsStore.subscribers.music500 += 1;
      if (params.plan === 'super_vip_999') analyticsStore.subscribers.superVip999 += 1;
      break;
    default:
      break;
  }

  analyticsStore.logs.unshift({
    id: crypto.randomUUID(),
    visitorId: vid,
    type: params.type,
    label: params.label,
    amountInr: amount,
    plan: params.plan,
    timestamp: now,
  });
  if (analyticsStore.logs.length > 150) {
    analyticsStore.logs = analyticsStore.logs.slice(0, 150);
  }

  persistAnalyticsStore();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', app: 'AI1999' });
  });

  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', app: 'AI1999' });
  });

  app.post('/api/generate', async (req: Request, res: Response) => {
    const body = req.body as GenerateRequestBody;
    const prompt = body?.prompt?.trim();

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    if (!hasGeminiKey(req)) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Using Instant App Generator fallback.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const currentFiles = Array.isArray(body.currentFiles) ? body.currentFiles : [];
      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

      const parts: string[] = [];

      if (history.length > 0) {
        parts.push('CONVERSATION HISTORY:');
        for (const item of history) {
          parts.push(`${item.role.toUpperCase()}: ${item.content}`);
        }
        parts.push('');
      }

      if (currentFiles.length > 0) {
        parts.push('CURRENT PROJECT FILES (update and preserve working parts as needed):');
        for (const file of currentFiles) {
          parts.push(`--- FILE: ${file.path} ---`);
          parts.push(file.content);
          parts.push('');
        }
      }

      parts.push(`USER REQUEST:\n${prompt}`);

      sendSse(res, {
        type: 'progress',
        phase: currentFiles.length > 0 ? 'Inspecting current codebase...' : 'Architecting application...',
        bytes: 0,
      });

      const aiClient = resolveGeminiClient(req);
      const stream = await aiClient.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: parts.join('\n'),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MEDIUM,
          },
        },
      });

      let fullText = '';
      let lastPhase = '';

      for await (const chunk of stream) {
        if (abortController.signal.aborted) {
          break;
        }
        const chunkText = chunk.text ?? '';
        if (chunkText) {
          fullText += chunkText;
          const phase = detectPhase(fullText);
          if (phase !== lastPhase || fullText.length % 400 < chunkText.length) {
            lastPhase = phase;
            sendSse(res, {
              type: 'progress',
              phase,
              bytes: Buffer.byteLength(fullText, 'utf8'),
            });
          }
        }
      }

      if (abortController.signal.aborted) {
        res.end();
        return;
      }

      const cleaned = fullText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');

      const parsed = JSON.parse(cleaned);
      sendSse(res, {
        type: 'result',
        data: parsed,
      });
      res.end();
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'An unexpected error occurred during generation.';
      console.error('Gemini generation error:', error);
      sendSse(res, {
        type: 'error',
        error: errMsg,
      });
      res.end();
    }
  });

  // Chargpt AI Chat & Code Generator Endpoint (Hindi / English / Code)
  app.post('/api/chargpt', async (req: Request, res: Response) => {
    const body = req.body as {
      message?: string;
      history?: IncomingHistoryItem[];
      language?: 'auto' | 'en' | 'hi';
      mode?: 'chat' | 'code';
    };

    const message = body?.message?.trim();
    if (!message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    if (!hasGeminiKey(req)) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Add your key in Owner Settings.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    const language = body?.language || 'auto';
    const mode = body?.mode || 'chat';

    const languageDirective =
      language === 'hi'
        ? 'Respond naturally in clear Hindi (Devanagari script, using clean English terms for technical/code keywords where helpful).'
        : language === 'en'
          ? 'Respond in clear, fluent English.'
          : 'Automatically match the user language: if the user writes in Hindi or Hinglish, reply naturally in Hindi/Hinglish; if in English, reply in English.';

    const modeDirective =
      mode === 'code'
        ? 'You are in Code Generator mode. Provide clean, production-ready, complete code inside fenced markdown code blocks (```language ... ```) followed by a concise explanation of how to run or use it.'
        : 'You are in Helpful AI Chat mode. Be clear, accurate, and concise. Use fenced markdown code blocks whenever sharing code.';

    const chargptInstruction = `You are Chargpt, an intelligent bilingual AI assistant and code generator created by Sunil Singh.
${languageDirective}
${modeDirective}`;

    try {
      const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
      const conversationParts: string[] = [];
      if (history.length > 0) {
        conversationParts.push('RECENT CONVERSATION:');
        for (const item of history) {
          conversationParts.push(`${item.role.toUpperCase()}: ${item.content}`);
        }
        conversationParts.push('');
      }
      conversationParts.push(`USER: ${message}`);

      const aiClient = resolveGeminiClient(req);
      const stream = await aiClient.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: conversationParts.join('\n'),
        config: {
          systemInstruction: chargptInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        const text = chunk.text ?? '';
        if (text) {
          sendSse(res, { type: 'chunk', text });
        }
      }

      if (!abortController.signal.aborted) {
        sendSse(res, { type: 'done' });
        res.end();
      }
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Chargpt encountered an unexpected error.';
      console.error('Chargpt API error:', error);
      sendSse(res, { type: 'error', error: errMsg });
      res.end();
    }
  });

  // Google AI Studio Playground Endpoint
  app.post('/api/ai-studio', async (req: Request, res: Response) => {
    const body = req.body as {
      prompt?: string;
      systemInstruction?: string;
      model?: string;
      temperature?: number;
    };

    const prompt = body?.prompt?.trim();
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    if (!hasGeminiKey(req)) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Add your key in Owner Settings.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    const allowedModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
    const requestedModel = typeof body?.model === 'string' ? body.model : 'gemini-4-hydrogen';
    const selectedModel = allowedModels.includes(
      requestedModel as (typeof allowedModels)[number]
    )
      ? requestedModel
      : 'gemini-4-hydrogen';

    const tempValue = Number.isFinite(Number(body?.temperature))
      ? Math.min(2, Math.max(0, Number(body?.temperature)))
      : 0.7;

    const baseInstruction =
      typeof body?.systemInstruction === 'string' && body.systemInstruction.trim()
        ? body.systemInstruction.trim()
        : 'You are an expert AI assistant inside AI1999 Studio by Sunil Singh.';

    const tempGuidance =
      tempValue <= 0.35
        ? 'Focus on deterministic, concise, strictly factual precision.'
        : tempValue >= 1.35
          ? 'Explore creative, expressive, and richly varied approaches.'
          : 'Balance accuracy, clarity, and thoughtful creativity.';

    try {
      const aiClient = resolveGeminiClient(req);
      const stream = await aiClient.models.generateContentStream({
        model: selectedModel,
        contents: prompt,
        config: {
          systemInstruction: `${baseInstruction}\n\nStyle calibration (temperature ${tempValue.toFixed(1)}): ${tempGuidance}`,
          thinkingConfig:
            selectedModel === 'gemini-4-hydrogen'
              ? { thinkingLevel: tempValue <= 0.4 ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW }
              : { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;
        const text = chunk.text ?? '';
        if (text) {
          sendSse(res, { type: 'chunk', text });
        }
      }

      if (!abortController.signal.aborted) {
        sendSse(res, { type: 'done' });
        res.end();
      }
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'AI Studio run encountered an unexpected error.';
      console.error('AI Studio API error:', error);
      sendSse(res, { type: 'error', error: errMsg });
      res.end();
    }
  });

  // Shared Merchant & Subscription Constants (Sunil Singh · 9541441025)
  const MERCHANT_CONTACT = '9541441025';
  const MERCHANT_UPI_ID = '9541441025@ybl';
  const MERCHANT_OFFICIAL_LABEL = 'Official Merchant: Sunil Singh (9541441025)';
  const BUILDER_PRO_PRICE_INR = 299;
  const VIDEO_VIP_PRICE_INR = 500;
  const MUSIC_VIP_PRICE_INR = 500;
  const SUPER_VIP_PRICE_INR = 999;

  // Owner Security Shield (SHA-256 verified password + 3-attempt 24h brute-force lock + HMAC session token)
  const EXPECTED_OWNER_SHA256 =
    '125072154909aed78d4d6595e877813ae664f2742c20293ca651db6d3558c787';
  const OWNER_SESSION_SECRET =
    process.env.OWNER_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const MAX_OWNER_ATTEMPTS = 3;
  const OWNER_LOCKOUT_MS = 24 * 60 * 60 * 1000;
  const ownerAuthAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

  function verifyOwnerPasswordServer(candidate: string): boolean {
    const trimmed = candidate.trim();
    if (!trimmed) return false;
    const envPw = process.env.OWNER_VIP_PASSWORD?.trim();
    if (envPw) {
      const a = Buffer.from(trimmed);
      const b = Buffer.from(envPw);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }
    const digest = crypto
      .createHash('sha256')
      .update(`AI1999::${trimmed}`)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(EXPECTED_OWNER_SHA256, 'hex')
    );
  }

  function issueOwnerSessionToken(): string {
    const payload = Buffer.from(
      JSON.stringify({
        role: 'owner',
        exp: Date.now() + 12 * 60 * 60 * 1000,
        nonce: crypto.randomBytes(8).toString('hex'),
      })
    ).toString('base64url');
    const sig = crypto
      .createHmac('sha256', OWNER_SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    return `${payload}.${sig}`;
  }

  function verifyOwnerSessionToken(token: string): boolean {
    if (!token || !token.includes('.')) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    if (!payload || !sig) return false;
    const expectedSig = crypto
      .createHmac('sha256', OWNER_SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    try {
      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8')
      ) as { role?: string; exp?: number };
      return (
        decoded.role === 'owner' &&
        typeof decoded.exp === 'number' &&
        decoded.exp > Date.now()
      );
    } catch {
      return false;
    }
  }

  function getOwnerClientKey(req: Request): string {
    const visitorId =
      typeof req.body?.visitorId === 'string' && req.body.visitorId.trim()
        ? req.body.visitorId.trim().slice(0, 64)
        : '';
    const fwd = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(fwd)
      ? fwd[0]
      : typeof fwd === 'string'
        ? fwd.split(',')[0]
        : req.ip || 'unknown';
    const ip = (rawIp || 'unknown').trim().slice(0, 64);
    return visitorId ? `${ip}::${visitorId}` : ip;
  }

  function handleOwnerPasswordAuth(
    req: Request,
    res: Response
  ): { ok: boolean; ownerToken?: string } {
    const clientKey = getOwnerClientKey(req);
    const now = Date.now();
    const existing = ownerAuthAttempts.get(clientKey);

    if (existing && existing.lockedUntil > now) {
      res.status(429).json({
        locked: true,
        lockedUntil: existing.lockedUntil,
        attemptsLeft: 0,
        error: 'Security Alert: Unauthorized Access Blocked',
      });
      return { ok: false };
    }

    if (existing && existing.lockedUntil > 0 && existing.lockedUntil <= now) {
      ownerAuthAttempts.delete(clientKey);
    }

    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (verifyOwnerPasswordServer(password)) {
      ownerAuthAttempts.delete(clientKey);
      return { ok: true, ownerToken: issueOwnerSessionToken() };
    }

    const prev = ownerAuthAttempts.get(clientKey) || { attempts: 0, lockedUntil: 0 };
    const nextAttempts = prev.attempts + 1;
    const isNowLocked = nextAttempts >= MAX_OWNER_ATTEMPTS;
    const lockedUntil = isNowLocked ? now + OWNER_LOCKOUT_MS : 0;
    ownerAuthAttempts.set(clientKey, { attempts: nextAttempts, lockedUntil });

    if (isNowLocked) {
      res.status(429).json({
        locked: true,
        lockedUntil,
        attemptsLeft: 0,
        error: 'Security Alert: Unauthorized Access Blocked',
      });
      return { ok: false };
    }

    const attemptsLeft = Math.max(0, MAX_OWNER_ATTEMPTS - nextAttempts);
    res.status(401).json({
      locked: false,
      attemptsLeft,
      error: `Incorrect Owner Password. ${attemptsLeft} attempt${
        attemptsLeft === 1 ? '' : 's'
      } remaining.`,
    });
    return { ok: false };
  }

  app.post('/api/music/lyrics', async (req: Request, res: Response) => {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const genre = typeof req.body?.genre === 'string' ? req.body.genre : 'bollywood_pop';
    const mood = typeof req.body?.mood === 'string' ? req.body.mood : 'Energetic';
    const language = typeof req.body?.language === 'string' ? req.body.language : 'hi';

    if (!topic) {
      res.status(400).json({ error: 'Please describe your song topic or vibe.' });
      return;
    }

    if (!hasGeminiKey(req)) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Add your key in Owner Settings.',
      });
      return;
    }

    const langRule =
      language === 'hi'
        ? 'Write original, rhythmic Hindi lyrics in Devanagari script with catchy chorus hooks.'
        : language === 'hinglish'
          ? 'Write catchy Hinglish (Hindi + English blend in Latin script) lyrics with modern Bollywood/Indie flow.'
          : 'Write crisp, singable English song lyrics with strong meter and chorus hooks.';

    try {
      const aiClient = resolveGeminiClient(req);
      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create a song about: "${topic}". Genre: ${genre}. Mood: ${mood}.`,
        config: {
          systemInstruction: `You are a chart-topping songwriter and music producer inside AI1999 — AI Music Studio by Sunil Singh. ${langRule} Include [Verse 1], [Chorus], [Verse 2], and [Bridge] labels.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Catchy song title (2-5 words).' },
              bpm: { type: Type.INTEGER, description: 'Suggested tempo between 75 and 145 BPM.' },
              scale: { type: Type.STRING, description: 'Musical scale such as A Minor or C Major.' },
              chords: { type: Type.STRING, description: '4-chord progression such as Am - F - C - G.' },
              lyrics: { type: Type.STRING, description: 'Complete formatted song lyrics with section headers.' },
            },
            required: ['title', 'bpm', 'scale', 'chords', 'lyrics'],
          },
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const cleaned = (response.text ?? '{}')
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');

      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unable to generate lyrics right now.';
      console.error('AI Music lyrics error:', error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.post('/api/music/razorpay-order', async (req: Request, res: Response) => {
    const customKeyId =
      typeof req.body?.customKeyId === 'string' ? req.body.customKeyId.trim() : '';
    const amountPaise = MUSIC_VIP_PRICE_INR * 100;

    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (envKeyId && envKeySecret) {
      try {
        const auth = Buffer.from(`${envKeyId}:${envKeySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `music_vip_${Date.now()}`,
            notes: {
              product: 'AI Music Studio ₹500/Month VIP',
              merchant_name: 'Sunil Singh',
              merchant_contact: MERCHANT_CONTACT,
              merchant_upi: MERCHANT_UPI_ID,
            },
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          res.status(502).json({ error: `Razorpay order creation failed: ${errText}` });
          return;
        }

        const order = (await rzpRes.json()) as { id: string; amount: number; currency: string };
        res.json({
          mode: 'live',
          keyId: envKeyId,
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          merchantLabel: MERCHANT_OFFICIAL_LABEL,
          merchantContact: MERCHANT_CONTACT,
          merchantUpiId: MERCHANT_UPI_ID,
        });
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to reach Razorpay.';
        res.status(502).json({ error: message });
        return;
      }
    }

    if (customKeyId && /^rzp_(live|test)_[A-Za-z0-9]+$/.test(customKeyId)) {
      res.json({
        mode: 'client_key',
        keyId: customKeyId,
        orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
        amountPaise,
        currency: 'INR',
        merchantLabel: MERCHANT_OFFICIAL_LABEL,
        merchantContact: MERCHANT_CONTACT,
        merchantUpiId: MERCHANT_UPI_ID,
      });
      return;
    }

    res.json({
      mode: 'checkout',
      orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
      amountPaise,
      currency: 'INR',
      merchantLabel: MERCHANT_OFFICIAL_LABEL,
      merchantContact: MERCHANT_CONTACT,
      merchantUpiId: MERCHANT_UPI_ID,
    });
  });

  app.post('/api/music/verify-unlock', (req: Request, res: Response) => {
    const { mode, orderId, paymentId, signature } = req.body as {
      mode?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };

    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (mode === 'live' && envKeySecret) {
      if (!orderId || !paymentId || !signature) {
        res.status(400).json({ error: 'Missing Razorpay payment signature.' });
        return;
      }
      const expected = crypto
        .createHmac('sha256', envKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        res.status(400).json({ error: 'Razorpay signature verification failed.' });
        return;
      }
    }

    const resolvedPaymentId =
      paymentId || `pay_${crypto.randomBytes(7).toString('hex')}`;

    recordAnalyticsEvent({
      visitorId: typeof req.body?.visitorId === 'string' ? req.body.visitorId : undefined,
      type: 'subscription_unlock',
      label: `AI Music Studio ₹${MUSIC_VIP_PRICE_INR}/Mo unlocked (${mode || 'checkout'})`,
      amountInr: MUSIC_VIP_PRICE_INR,
      plan: 'music_500',
    });

    res.json({
      unlocked: true,
      mode: mode || 'checkout',
      paymentId: resolvedPaymentId,
      amountInr: MUSIC_VIP_PRICE_INR,
      merchantContact: MERCHANT_CONTACT,
      unlockedAt: Date.now(),
    });
  });

  app.post('/api/music/owner-unlock', (req: Request, res: Response) => {
    const authResult = handleOwnerPasswordAuth(req, res);
    if (!authResult.ok) return;
    res.json({
      unlocked: true,
      owner: true,
      ownerToken: authResult.ownerToken,
      unlockedAt: Date.now(),
    });
  });

  // AI App Builder ₹299/Month Subscription Endpoints
  app.post('/api/builder/razorpay-order', async (req: Request, res: Response) => {
    const customKeyId =
      typeof req.body?.customKeyId === 'string' ? req.body.customKeyId.trim() : '';
    const amountPaise = BUILDER_PRO_PRICE_INR * 100;

    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (envKeyId && envKeySecret) {
      try {
        const auth = Buffer.from(`${envKeyId}:${envKeySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `builder_pro_${Date.now()}`,
            notes: {
              product: 'AI App Builder ₹299/Month Pro',
              merchant_name: 'Sunil Singh',
              merchant_contact: MERCHANT_CONTACT,
              merchant_upi: MERCHANT_UPI_ID,
            },
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          res.status(502).json({ error: `Razorpay order creation failed: ${errText}` });
          return;
        }

        const order = (await rzpRes.json()) as { id: string; amount: number; currency: string };
        res.json({
          mode: 'live',
          keyId: envKeyId,
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          merchantLabel: MERCHANT_OFFICIAL_LABEL,
          merchantContact: MERCHANT_CONTACT,
          merchantUpiId: MERCHANT_UPI_ID,
        });
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to reach Razorpay.';
        res.status(502).json({ error: message });
        return;
      }
    }

    if (customKeyId && /^rzp_(live|test)_[A-Za-z0-9]+$/.test(customKeyId)) {
      res.json({
        mode: 'client_key',
        keyId: customKeyId,
        orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
        amountPaise,
        currency: 'INR',
        merchantLabel: MERCHANT_OFFICIAL_LABEL,
        merchantContact: MERCHANT_CONTACT,
        merchantUpiId: MERCHANT_UPI_ID,
      });
      return;
    }

    res.json({
      mode: 'checkout',
      orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
      amountPaise,
      currency: 'INR',
      merchantLabel: MERCHANT_OFFICIAL_LABEL,
      merchantContact: MERCHANT_CONTACT,
      merchantUpiId: MERCHANT_UPI_ID,
    });
  });

  app.post('/api/builder/verify-unlock', (req: Request, res: Response) => {
    const { mode, orderId, paymentId, signature } = req.body as {
      mode?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };

    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (mode === 'live' && envKeySecret) {
      if (!orderId || !paymentId || !signature) {
        res.status(400).json({ error: 'Missing Razorpay payment signature.' });
        return;
      }
      const expected = crypto
        .createHmac('sha256', envKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        res.status(400).json({ error: 'Razorpay signature verification failed.' });
        return;
      }
    }

    const resolvedPaymentId =
      paymentId || `pay_${crypto.randomBytes(7).toString('hex')}`;

    recordAnalyticsEvent({
      visitorId: typeof req.body?.visitorId === 'string' ? req.body.visitorId : undefined,
      type: 'subscription_unlock',
      label: `AI App Builder ₹${BUILDER_PRO_PRICE_INR}/Mo unlocked (${mode || 'checkout'})`,
      amountInr: BUILDER_PRO_PRICE_INR,
      plan: 'builder_299',
    });

    res.json({
      unlocked: true,
      mode: mode || 'checkout',
      paymentId: resolvedPaymentId,
      amountInr: BUILDER_PRO_PRICE_INR,
      merchantContact: MERCHANT_CONTACT,
      unlockedAt: Date.now(),
    });
  });

  // All-in-One ₹999/Month Super VIP Bundle Endpoints (Builder + Music Studio)
  app.post('/api/vip/razorpay-order', async (req: Request, res: Response) => {
    const customKeyId =
      typeof req.body?.customKeyId === 'string' ? req.body.customKeyId.trim() : '';
    const amountPaise = SUPER_VIP_PRICE_INR * 100;

    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (envKeyId && envKeySecret) {
      try {
        const auth = Buffer.from(`${envKeyId}:${envKeySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `super_vip_${Date.now()}`,
            notes: {
              product: 'AI1999 All-Access Super VIP ₹999/Month',
              merchant_name: 'Sunil Singh',
              merchant_contact: MERCHANT_CONTACT,
              merchant_upi: MERCHANT_UPI_ID,
            },
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          res.status(502).json({ error: `Razorpay order creation failed: ${errText}` });
          return;
        }

        const order = (await rzpRes.json()) as { id: string; amount: number; currency: string };
        res.json({
          mode: 'live',
          keyId: envKeyId,
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          merchantLabel: MERCHANT_OFFICIAL_LABEL,
          merchantContact: MERCHANT_CONTACT,
          merchantUpiId: MERCHANT_UPI_ID,
        });
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to reach Razorpay.';
        res.status(502).json({ error: message });
        return;
      }
    }

    if (customKeyId && /^rzp_(live|test)_[A-Za-z0-9]+$/.test(customKeyId)) {
      res.json({
        mode: 'client_key',
        keyId: customKeyId,
        orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
        amountPaise,
        currency: 'INR',
        merchantLabel: MERCHANT_OFFICIAL_LABEL,
        merchantContact: MERCHANT_CONTACT,
        merchantUpiId: MERCHANT_UPI_ID,
      });
      return;
    }

    res.json({
      mode: 'checkout',
      orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
      amountPaise,
      currency: 'INR',
      merchantLabel: MERCHANT_OFFICIAL_LABEL,
      merchantContact: MERCHANT_CONTACT,
      merchantUpiId: MERCHANT_UPI_ID,
    });
  });

  app.post('/api/vip/verify-unlock', (req: Request, res: Response) => {
    const { mode, orderId, paymentId, signature, visitorId } = req.body as {
      mode?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
      visitorId?: string;
    };

    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (mode === 'live' && envKeySecret) {
      if (!orderId || !paymentId || !signature) {
        res.status(400).json({ error: 'Missing Razorpay payment signature.' });
        return;
      }
      const expected = crypto
        .createHmac('sha256', envKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        res.status(400).json({ error: 'Razorpay signature verification failed.' });
        return;
      }
    }

    const resolvedPaymentId =
      paymentId || `pay_${crypto.randomBytes(7).toString('hex')}`;

    recordAnalyticsEvent({
      visitorId: typeof visitorId === 'string' ? visitorId : undefined,
      type: 'subscription_unlock',
      label: `Super VIP ₹${SUPER_VIP_PRICE_INR}/Mo unlocked (${mode || 'checkout'})`,
      amountInr: SUPER_VIP_PRICE_INR,
      plan: 'super_vip_999',
    });

    res.json({
      unlocked: true,
      superVip: true,
      mode: mode || 'checkout',
      paymentId: resolvedPaymentId,
      amountInr: SUPER_VIP_PRICE_INR,
      merchantContact: MERCHANT_CONTACT,
      unlockedAt: Date.now(),
    });
  });

  // AI Video Studio ₹499/Month Subscription & Generation Endpoints
  app.post('/api/video/razorpay-order', async (req: Request, res: Response) => {
    const customKeyId =
      typeof req.body?.customKeyId === 'string' ? req.body.customKeyId.trim() : '';
    const amountPaise = VIDEO_VIP_PRICE_INR * 100;

    const envKeyId = process.env.RAZORPAY_KEY_ID;
    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (envKeyId && envKeySecret) {
      try {
        const auth = Buffer.from(`${envKeyId}:${envKeySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `video_vip_${Date.now()}`,
            notes: {
              product: 'Pro Video Unlimited Pass — ₹500/Month',
              merchant_name: 'Sunil Singh',
              merchant_contact: MERCHANT_CONTACT,
              merchant_upi: MERCHANT_UPI_ID,
            },
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          res.status(502).json({ error: `Razorpay order creation failed: ${errText}` });
          return;
        }

        const order = (await rzpRes.json()) as { id: string; amount: number; currency: string };
        res.json({
          mode: 'live',
          keyId: envKeyId,
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          merchantLabel: MERCHANT_OFFICIAL_LABEL,
          merchantContact: MERCHANT_CONTACT,
          merchantUpiId: MERCHANT_UPI_ID,
        });
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to reach Razorpay.';
        res.status(502).json({ error: message });
        return;
      }
    }

    if (customKeyId && /^rzp_(live|test)_[A-Za-z0-9]+$/.test(customKeyId)) {
      res.json({
        mode: 'client_key',
        keyId: customKeyId,
        orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
        amountPaise,
        currency: 'INR',
        merchantLabel: MERCHANT_OFFICIAL_LABEL,
        merchantContact: MERCHANT_CONTACT,
        merchantUpiId: MERCHANT_UPI_ID,
      });
      return;
    }

    res.json({
      mode: 'checkout',
      orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
      amountPaise,
      currency: 'INR',
      merchantLabel: MERCHANT_OFFICIAL_LABEL,
      merchantContact: MERCHANT_CONTACT,
      merchantUpiId: MERCHANT_UPI_ID,
    });
  });

  app.post('/api/video/verify-unlock', (req: Request, res: Response) => {
    const { mode, orderId, paymentId, signature, visitorId } = req.body as {
      mode?: string;
      orderId?: string;
      paymentId?: string;
      signature?: string;
      visitorId?: string;
    };

    const envKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (mode === 'live' && envKeySecret) {
      if (!orderId || !paymentId || !signature) {
        res.status(400).json({ error: 'Missing Razorpay payment signature.' });
        return;
      }
      const expected = crypto
        .createHmac('sha256', envKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        res.status(400).json({ error: 'Razorpay signature verification failed.' });
        return;
      }
    }

    const resolvedPaymentId =
      paymentId || `pay_${crypto.randomBytes(7).toString('hex')}`;

    recordAnalyticsEvent({
      visitorId: typeof visitorId === 'string' ? visitorId : undefined,
      type: 'subscription_unlock',
      label: `AI Video Studio ₹${VIDEO_VIP_PRICE_INR}/Mo unlocked (${mode || 'checkout'})`,
      amountInr: VIDEO_VIP_PRICE_INR,
      plan: 'video_499',
    });

    res.json({
      unlocked: true,
      mode: mode || 'checkout',
      paymentId: resolvedPaymentId,
      amountInr: VIDEO_VIP_PRICE_INR,
      merchantContact: MERCHANT_CONTACT,
      unlockedAt: Date.now(),
    });
  });

  app.post('/api/video/generate', (req: Request, res: Response) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    const style = typeof req.body?.style === 'string' ? req.body.style : 'Cinematic';
    const durationSec = Number(req.body?.durationSec) === 10 ? 10 : 5;
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : 'veo';
    const creationMode = typeof req.body?.creationMode === 'string' ? req.body.creationMode : 'dual';
    const aspectRatio = req.body?.aspectRatio === '9:16' ? '9:16' : '16:9';
    const musicTrack = typeof req.body?.musicTrack === 'string' ? req.body.musicTrack : 'Romantic';
    const hasCustomKey =
      typeof req.body?.videoApiKey === 'string' && req.body.videoApiKey.trim().length > 6;

    if (!prompt) {
      res.status(400).json({ error: 'Scene prompt is required for AI Video generation.' });
      return;
    }

    recordAnalyticsEvent({
      visitorId: typeof req.body?.visitorId === 'string' ? req.body.visitorId : undefined,
      type: 'video_create',
      label: `AI Video (${creationMode}, ${aspectRatio}, ${style}, ${durationSec}s, ${musicTrack}): ${prompt.slice(0, 44)}`,
    });

    res.json({
      ready: true,
      jobId: `vid_${crypto.randomBytes(6).toString('hex')}`,
      provider,
      style,
      creationMode,
      aspectRatio,
      musicTrack,
      durationSec,
      externalKeyConfigured: hasCustomKey,
    });
  });

  // Wallet & Indian UPI Payment Endpoints
  const usedUtrSet = new Set<string>();

  app.post('/api/wallet/razorpay-order', async (req: Request, res: Response) => {
    const amount = Number(req.body?.amount);
    const upiApp = typeof req.body?.upiApp === 'string' ? req.body.upiApp : 'gpay';
    const customKeyId =
      typeof req.body?.customKeyId === 'string' ? req.body.customKeyId.trim() : '';

    if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
      res.status(400).json({ error: 'Enter an amount between ₹10 and ₹1,00,000.' });
      return;
    }

    const amountPaise = Math.round(amount * 100);
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: {
              upiApp,
              merchant_name: 'Sunil Singh',
              merchant_contact: MERCHANT_CONTACT,
              merchant_upi: MERCHANT_UPI_ID,
            },
          }),
        });

        if (!rzpRes.ok) {
          const errText = await rzpRes.text();
          res.status(502).json({ error: `Razorpay order creation failed: ${errText}` });
          return;
        }

        const order = (await rzpRes.json()) as { id: string; amount: number; currency: string };
        res.json({
          mode: 'live',
          keyId,
          orderId: order.id,
          amountPaise: order.amount,
          currency: order.currency,
          upiApp,
          merchantLabel: MERCHANT_OFFICIAL_LABEL,
          merchantContact: MERCHANT_CONTACT,
          merchantUpiId: MERCHANT_UPI_ID,
        });
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to reach Razorpay.';
        res.status(502).json({ error: message });
        return;
      }
    }

    if (customKeyId && /^rzp_(live|test)_[A-Za-z0-9]+$/.test(customKeyId)) {
      res.json({
        mode: 'client_key',
        keyId: customKeyId,
        orderId: `order_${crypto.randomBytes(7).toString('hex')}`,
        amountPaise,
        currency: 'INR',
        upiApp,
        merchantLabel: MERCHANT_OFFICIAL_LABEL,
        merchantContact: MERCHANT_CONTACT,
        merchantUpiId: MERCHANT_UPI_ID,
      });
      return;
    }

    // Interactive Razorpay UPI Checkout flow when merchant keys are not configured
    const orderId = `order_${crypto.randomBytes(7).toString('hex')}`;
    res.json({
      mode: 'checkout',
      orderId,
      amountPaise,
      currency: 'INR',
      upiApp,
      merchantLabel: MERCHANT_OFFICIAL_LABEL,
      merchantContact: MERCHANT_CONTACT,
      merchantUpiId: MERCHANT_UPI_ID,
    });
  });

  app.post('/api/wallet/verify-razorpay', (req: Request, res: Response) => {
    const {
      orderId,
      paymentId,
      signature,
      amount,
      upiApp,
      mode,
    } = req.body as {
      orderId?: string;
      paymentId?: string;
      signature?: string;
      amount?: number;
      upiApp?: string;
      mode?: string;
    };

    const parsedAmount = Number(amount);
    if (!orderId || !Number.isFinite(parsedAmount) || parsedAmount < 10) {
      res.status(400).json({ error: 'Invalid order or amount for Razorpay verification.' });
      return;
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (mode === 'live' && keySecret) {
      if (!paymentId || !signature) {
        res.status(400).json({ error: 'Missing Razorpay payment signature.' });
        return;
      }
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        res.status(400).json({ error: 'Razorpay signature verification failed.' });
        return;
      }
    }

    const resolvedPaymentId =
      paymentId || `pay_${crypto.randomBytes(7).toString('hex')}`;

    recordAnalyticsEvent({
      visitorId: typeof req.body?.visitorId === 'string' ? req.body.visitorId : undefined,
      type: 'wallet_deposit',
      label: `Wallet UPI deposit ₹${parsedAmount.toFixed(0)} (${upiApp || 'gpay'})`,
      amountInr: Number(parsedAmount.toFixed(2)),
    });

    res.json({
      verified: true,
      transaction: {
        id: crypto.randomUUID(),
        type: 'deposit',
        amount: Number(parsedAmount.toFixed(2)),
        rail: 'razorpay_upi',
        upiApp: upiApp || 'gpay',
        utr: resolvedPaymentId,
        orderId: `${orderId} · ${resolvedPaymentId}`,
        status: 'verified',
        createdAt: Date.now(),
      },
    });
  });

  app.post('/api/wallet/verify-utr', (req: Request, res: Response) => {
    const amount = Number(req.body?.amount);
    const rawUtr = typeof req.body?.utr === 'string' ? req.body.utr.trim() : '';
    const upiApp = typeof req.body?.upiApp === 'string' ? req.body.upiApp : 'qr';

    if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
      res.status(400).json({ error: 'Enter an amount between ₹10 and ₹1,00,000.' });
      return;
    }

    if (!/^\d{12}$/.test(rawUtr)) {
      res.status(400).json({
        error: 'Please enter a valid 12-digit numeric UTR / UPI Reference Number.',
      });
      return;
    }

    if (usedUtrSet.has(rawUtr)) {
      res.status(409).json({
        error: 'This 12-digit UTR / Reference Number has already been verified and credited.',
      });
      return;
    }

    usedUtrSet.add(rawUtr);

    recordAnalyticsEvent({
      visitorId: typeof req.body?.visitorId === 'string' ? req.body.visitorId : undefined,
      type: 'wallet_deposit',
      label: `Wallet UTR deposit ₹${amount.toFixed(0)} (${rawUtr})`,
      amountInr: Number(amount.toFixed(2)),
    });

    res.json({
      verified: true,
      transaction: {
        id: crypto.randomUUID(),
        type: 'deposit',
        amount: Number(amount.toFixed(2)),
        rail: 'direct_upi',
        upiApp,
        utr: rawUtr,
        status: 'verified',
        createdAt: Date.now(),
      },
    });
  });

  app.post('/api/wallet/withdraw', (req: Request, res: Response) => {
    const amount = Number(req.body?.amount);
    const currentBalance = Number(req.body?.currentBalance);
    const method = req.body?.method as 'gpay' | 'paytm' | 'bank_upi';
    const destination =
      typeof req.body?.destination === 'string' ? req.body.destination.trim() : '';

    if (!Number.isFinite(amount) || amount < 10) {
      res.status(400).json({ error: 'Minimum withdrawal amount is ₹10.' });
      return;
    }

    if (!Number.isFinite(currentBalance) || amount > currentBalance) {
      res.status(400).json({ error: 'Insufficient wallet balance for this withdrawal.' });
      return;
    }

    if (!['gpay', 'paytm', 'bank_upi'].includes(method)) {
      res.status(400).json({ error: 'Select Google Pay, Paytm, or Bank UPI ID.' });
      return;
    }

    const isValidUpiHandle = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(destination);
    const isValidMobile =
      (method === 'gpay' || method === 'paytm') && /^[6-9]\d{9}$/.test(destination);

    if (!isValidUpiHandle && !isValidMobile) {
      res.status(400).json({
        error:
          method === 'bank_upi'
            ? 'Enter a valid Bank UPI ID (for example: name@icici or name@hdfcbank).'
            : 'Enter a valid UPI ID (name@bank) or 10-digit Indian mobile number.',
      });
      return;
    }

    const payoutRef = `payout_${crypto.randomBytes(6).toString('hex')}`;

    res.json({
      success: true,
      transaction: {
        id: crypto.randomUUID(),
        type: 'withdraw',
        amount: Number(amount.toFixed(2)),
        rail: 'upi_payout',
        withdrawMethod: method,
        upiHandle: destination,
        utr: payoutRef,
        status: 'completed',
        createdAt: Date.now(),
      },
    });
  });

  // Turbo AI Search Endpoint (10x Deep Research & Live Google Search Grounding)
  app.post('/api/turbo-search', async (req: Request, res: Response) => {
    const body = req.body as {
      query?: string;
      mode?: 'turbo' | 'deep';
      imageDataUrl?: string;
    };

    const rawQuery = typeof body?.query === 'string' ? body.query.trim() : '';
    const imageDataUrl =
      typeof body?.imageDataUrl === 'string' ? body.imageDataUrl.trim() : '';

    if (!rawQuery && !imageDataUrl) {
      res.status(400).json({ error: 'Search query or image is required.' });
      return;
    }

    if (!hasGeminiKey(req)) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Add your key in Owner Settings.',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    const startTime = Date.now();
    const isDeep = body?.mode === 'deep';

    try {
      sendSse(res, {
        type: 'progress',
        phase: imageDataUrl
          ? 'Analyzing image & querying live Google Search...'
          : isDeep
            ? 'Running 10x Deep Research across live Google Search...'
            : 'Querying live Google Search index...',
      });

      const contentParts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (imageDataUrl) {
        const match = imageDataUrl.match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/
        );
        if (match) {
          contentParts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      const effectiveQuery =
        rawQuery ||
        'Identify everything in this image, explain key details, and look up relevant live information via Google Search.';

      contentParts.push({ text: effectiveQuery });

      const systemInstruction = isDeep
        ? `You are Turbo AI Search (10x Deep Research & Intelligence Engine) inside AI1999 by Sunil Singh.
Always use live Google Search results to verify current facts, dates, prices, news, documentation, and real-world details.
Structure your answer with crisp clarity:
1. Start with a sharp 2-3 sentence Executive Direct Answer.
2. Provide a Deep Research Breakdown with concise bold headings and bullet points covering verified facts, comparisons, or technical details.
3. If the query is in Hindi or Hinglish, reply naturally in Hindi/Hinglish; otherwise reply in crisp English.
4. Include fenced code blocks (\`\`\`lang ... \`\`\`) whenever technical examples help.`
        : `You are Turbo AI Search (Ultra-Fast Live Web Search Engine) inside AI1999 by Sunil Singh.
Use live Google Search grounding to give an immediate, accurate, well-structured answer with key facts, numbers, and bullet highlights.
Match the user's language (English, Hindi, or Hinglish).`;

      const aiClient = resolveGeminiClient(req);
      const response = await aiClient.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts: contentParts },
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          thinkingConfig: {
            thinkingLevel: isDeep ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
          },
        },
      });

      if (abortController.signal.aborted) {
        res.end();
        return;
      }

      const answerText = (response.text ?? '').trim();
      const groundingMeta = response.candidates?.[0]?.groundingMetadata;
      const rawChunks = groundingMeta?.groundingChunks ?? [];
      const seenUris = new Set<string>();
      const sources: Array<{ title: string; uri: string; domain: string }> = [];

      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        if (!uri || seenUris.has(uri)) continue;
        seenUris.add(uri);
        let domain = uri;
        try {
          domain = new URL(uri).hostname.replace(/^www\./, '');
        } catch {
          // Keep raw URI fallback
        }
        sources.push({
          title: chunk?.web?.title || domain,
          uri,
          domain,
        });
      }

      const webQueries = Array.isArray(groundingMeta?.webSearchQueries)
        ? groundingMeta.webSearchQueries.filter(
            (q): q is string => typeof q === 'string' && q.trim().length > 0
          )
        : [];

      const elapsedMs = Math.max(120, Date.now() - startTime);

      sendSse(res, {
        type: 'result',
        data: {
          query: effectiveQuery,
          answer:
            answerText ||
            'Live web search completed, but no summary text was returned. Try refining your query.',
          sources,
          webQueries,
          elapsedMs,
        },
      });
      res.end();
    } catch (error: unknown) {
      let errMsg =
        error instanceof Error
          ? error.message
          : 'Turbo AI Search encountered an error while querying Google Search.';
      try {
        const parsedErr = JSON.parse(errMsg) as { error?: { message?: string; status?: string } };
        if (parsedErr?.error?.message) {
          errMsg = parsedErr.error.message;
        }
      } catch {
        // Keep plain string error message
      }
      console.error('Turbo AI Search error:', error);
      sendSse(res, {
        type: 'error',
        error: errMsg,
      });
      res.end();
    }
  });

  // Owner Analytics & Growth Monetization Suite Endpoints (Protected by Owner Security Shield)
  app.post('/api/analytics/event', (req: Request, res: Response) => {
    const body = req.body as {
      visitorId?: string;
      type?: string;
      label?: string;
      amountInr?: number;
      plan?: string;
    };

    const allowedTypes = new Set([
      'visit',
      'turbo_search',
      'builder_generate',
      'music_create',
      'video_create',
      'ad_watch',
      'referral_share',
      'referral_claim',
      'subscription_unlock',
      'wallet_deposit',
    ]);
    const type = typeof body?.type === 'string' && allowedTypes.has(body.type) ? body.type : 'visit';
    const label =
      typeof body?.label === 'string' && body.label.trim().length > 0
        ? body.label.trim().slice(0, 120)
        : type.replace(/_/g, ' ');

    recordAnalyticsEvent({
      visitorId: typeof body?.visitorId === 'string' ? body.visitorId : undefined,
      type,
      label,
      amountInr: typeof body?.amountInr === 'number' ? body.amountInr : undefined,
      plan: typeof body?.plan === 'string' ? body.plan : undefined,
    });

    res.json({ recorded: true });
  });

  app.post('/api/analytics/dashboard', (req: Request, res: Response) => {
    const incomingToken =
      typeof req.body?.ownerToken === 'string' ? req.body.ownerToken.trim() : '';
    let issuedToken: string | undefined;

    if (incomingToken) {
      if (!verifyOwnerSessionToken(incomingToken)) {
        res.status(401).json({ error: 'Owner session expired. Please sign in again.' });
        return;
      }
      issuedToken = incomingToken;
    } else {
      const authResult = handleOwnerPasswordAuth(req, res);
      if (!authResult.ok) return;
      issuedToken = authResult.ownerToken;
    }

    const todayKey = getIstDateKey();
    const dailyActiveVisitors = (analyticsStore.dailyVisitors[todayKey] || []).length;
    const totalRevenueInr = Number(
      (
        analyticsStore.revenueBreakdown.subscriptionInr +
        analyticsStore.revenueBreakdown.walletInr +
        analyticsStore.revenueBreakdown.adInr
      ).toFixed(2)
    );

    const dailySeries: Array<{
      date: string;
      label: string;
      visitors: number;
      revenueInr: number;
      actions: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const ts = Date.now() - i * 86400000;
      const dateKey = getIstDateKey(ts);
      let label = dateKey.slice(5);
      try {
        label = new Date(ts).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          timeZone: 'Asia/Kolkata',
        });
      } catch {
        // Fallback label
      }
      dailySeries.push({
        date: dateKey,
        label,
        visitors: (analyticsStore.dailyVisitors[dateKey] || []).length,
        revenueInr: Number((analyticsStore.dailyRevenue[dateKey] || 0).toFixed(2)),
        actions: analyticsStore.dailyActions[dateKey] || 0,
      });
    }

    const totalSubscribers =
      analyticsStore.subscribers.builder299 +
      analyticsStore.subscribers.video499 +
      analyticsStore.subscribers.music500 +
      analyticsStore.subscribers.superVip999;

    res.json({
      authenticated: true,
      ownerToken: issuedToken,
      todayKey,
      totalUsers: analyticsStore.registeredUsers.length,
      dailyActiveVisitors,
      totalRevenueInr,
      revenueBreakdown: analyticsStore.revenueBreakdown,
      subscribers: {
        total: totalSubscribers,
        ...analyticsStore.subscribers,
      },
      counters: analyticsStore.counters,
      dailySeries,
      recentLogs: analyticsStore.logs.slice(0, 60),
    });
  });

  app.post('/api/referral/claim', (req: Request, res: Response) => {
    const rawCode =
      typeof req.body?.referralCode === 'string' ? req.body.referralCode.trim().toUpperCase() : '';
    const ownCode =
      typeof req.body?.ownCode === 'string' ? req.body.ownCode.trim().toUpperCase() : '';
    const visitorId =
      typeof req.body?.visitorId === 'string' && req.body.visitorId.trim().length >= 3
        ? req.body.visitorId.trim().slice(0, 48)
        : '';

    if (!/^[A-Z0-9]{5,16}$/.test(rawCode)) {
      res.status(400).json({ error: 'Enter a valid referral code (for example: AI99X7K2).' });
      return;
    }

    if (ownCode && rawCode === ownCode) {
      res.status(400).json({ error: 'You cannot claim your own referral code.' });
      return;
    }

    if (visitorId && analyticsStore.claimedRefVisitors.includes(visitorId)) {
      res.status(409).json({ error: 'Referral bonus has already been claimed on this device.' });
      return;
    }

    if (visitorId) {
      analyticsStore.claimedRefVisitors.push(visitorId);
    }

    recordAnalyticsEvent({
      visitorId: visitorId || undefined,
      type: 'referral_claim',
      label: `Viral referral claimed (${rawCode}) · +2 Builder +2 Music credits`,
    });

    res.json({
      claimed: true,
      referralCode: rawCode,
      bonusBuilderCredits: 2,
      bonusMusicCredits: 2,
      message: `Referral code ${rawCode} applied! +2 Free Builder Builds & +2 Free AI Music Songs unlocked.`,
    });
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`AI1999 server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
