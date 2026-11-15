import { ArrowUp, Code2, Download, Layers, Smartphone } from 'lucide-react';
import { SunilGlowingBadge } from './SunilGlowingBadge';

interface SeoLandingSectionProps {
  onSelectStarterPrompt: (prompt: string) => void;
}

const FEATURES = [
  {
    icon: Layers,
    title: 'Prompt to Production UI',
    description:
      'Describe any landing page, quiz, online store, or dashboard in plain English. AI1999 generates semantic HTML, responsive CSS, and interactive JavaScript in seconds.',
  },
  {
    icon: Code2,
    title: 'Live Preview & Full Source Access',
    description:
      'Test your generated app across Desktop, Tablet, and Mobile viewports side by side. Inspect every file, edit code directly, and refine designs with conversational follow-up prompts.',
  },
  {
    icon: Download,
    title: 'Free HTML & ZIP Code Export',
    description:
      'Own 100% of what you create. Download a self-contained single HTML file or a clean multi-file ZIP archive ready to deploy on Vercel, Netlify, GitHub Pages, or any static host.',
  },
  {
    icon: Smartphone,
    title: 'Installable Mobile PWA',
    description:
      'Install AI1999 directly on Android, iPhone, or desktop as a Progressive Web App with instant Razorpay & UPI 9541441025 checkout support.',
  },
];

const FAQS = [
  {
    question: 'What is AI1999?',
    answer:
      'AI1999 is an all-in-one flagship AI OS created by Sunil Singh. It combines an AI App Builder, AI Music Studio with Hindi/English singing, Photo-to-Video AI Studio, Chargpt, and Turbo AI Search.',
  },
  {
    question: 'How does the AI App Builder work inside AI1999?',
    answer:
      'AI1999 combines a zero-error conversational AI chat panel with a live interactive mobile/desktop preview and code editor. Build and refine complete HTML/JS apps and export clean HTML or ZIP bundles anytime.',
  },
  {
    question: 'Can I install AI1999 on my phone and export my projects?',
    answer:
      'Yes. AI1999 is a compliant Progressive Web App (PWA) installable onto Android and iOS home screens, and every generated website, song, or video can be downloaded directly to your device.',
  },
];

export function SeoLandingSection({ onSelectStarterPrompt }: SeoLandingSectionProps) {
  function scrollToBuilder() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section
      aria-labelledby="seo-overview-heading"
      className="border-t border-white/10 bg-black/25 backdrop-blur-sm text-zinc-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-24 space-y-12">
        {/* Intro Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium text-cyan-300">
              Free AI Website Maker · Lovable &amp; Bolt Alternative
            </p>
            <h2
              id="seo-overview-heading"
              className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 text-balance"
            >
              Build websites, apps, songs &amp; AI videos on AI1999
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Created by <strong className="text-amber-300 font-medium">Sunil Singh</strong>, AI1999 turns natural language ideas into responsive web apps, studio tracks, and AI videos—complete with live mobile/desktop previews and instant downloads.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectStarterPrompt(
                  'Build a modern dark-mode portfolio website for a software creator with a hero section, project showcase grid, and interactive contact form.'
                );
                scrollToBuilder();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white hover:brightness-110 transition-all whitespace-nowrap shadow-lg shadow-blue-600/25"
            >
              Try Free AI Builder
            </button>
            <button
              type="button"
              onClick={scrollToBuilder}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/[0.06] text-zinc-200 hover:bg-white/[0.12] transition-colors whitespace-nowrap"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              Back to Workspace
            </button>
          </div>
        </div>

        {/* 4-Column Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="glass-panel p-5 rounded-2xl space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-cyan-300">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-display text-sm font-semibold text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-300/90 leading-relaxed">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>

        {/* FAQ Section for Rich Search Intent */}
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-zinc-100">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="glass-panel p-5 rounded-2xl space-y-2"
              >
                <h4 className="font-display text-sm font-semibold text-zinc-100">
                  {faq.question}
                </h4>
                <p className="text-xs text-zinc-300/85 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="font-display font-semibold text-zinc-200">
              AI1999
            </span>
            <SunilGlowingBadge compact />
          </div>
          <div>
            Free AI Website Maker &amp; Interactive App Builder
          </div>
        </footer>
      </div>
    </section>
  );
}
