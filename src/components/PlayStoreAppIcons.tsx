import { ExternalLink } from 'lucide-react';

export interface PlayStoreAppItem {
  id: string;
  name: string;
  category: 'Social' | 'Payments' | 'Shopping' | 'Game';
  packageId: string;
  playStoreUrl: string;
  iconBgClass: string;
}

export const PLAY_STORE_APPS: PlayStoreAppItem[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'Social',
    packageId: 'com.whatsapp',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.whatsapp',
    iconBgClass: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-700',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'Social',
    packageId: 'com.facebook.katana',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.facebook.katana',
    iconBgClass: 'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'Social',
    packageId: 'com.instagram.android',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.android',
    iconBgClass: 'bg-gradient-to-br from-amber-300 via-pink-500 to-purple-700',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Social',
    packageId: 'com.google.android.youtube',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.youtube',
    iconBgClass: 'bg-gradient-to-br from-rose-500 via-red-600 to-red-800',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    category: 'Social',
    packageId: 'com.snapchat.android',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.snapchat.android',
    iconBgClass: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    category: 'Payments',
    packageId: 'com.google.android.apps.nbu.paisa.user',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
    iconBgClass: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    category: 'Payments',
    packageId: 'net.one97.paytm',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
    iconBgClass: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-800',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    category: 'Payments',
    packageId: 'com.phonepe.app',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
    iconBgClass: 'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-900',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    category: 'Shopping',
    packageId: 'in.amazon.mShop.android.shopping',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=in.amazon.mShop.android.shopping',
    iconBgClass: 'bg-gradient-to-br from-zinc-800 via-zinc-900 to-black',
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    category: 'Shopping',
    packageId: 'com.flipkart.android',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.flipkart.android',
    iconBgClass: 'bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800',
  },
  {
    id: 'meesho',
    name: 'Meesho',
    category: 'Shopping',
    packageId: 'com.meesho.supply',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.meesho.supply',
    iconBgClass: 'bg-gradient-to-br from-fuchsia-500 via-pink-600 to-purple-800',
  },
  {
    id: 'pubg',
    name: 'PUBG',
    category: 'Game',
    packageId: 'com.tencent.ig',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tencent.ig',
    iconBgClass: 'bg-gradient-to-br from-amber-500 via-orange-600 to-zinc-950',
  },
];

export function renderPlayStoreIconGlyph(id: string) {
  switch (id) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" fill="none" aria-hidden="true">
          <path
            d="M16 4.5C9.65 4.5 4.5 9.65 4.5 16c0 2.08.56 4.03 1.53 5.71L4.5 27.5l5.95-1.5A11.45 11.45 0 0 0 16 27.5c6.35 0 11.5-5.15 11.5-11.5S22.35 4.5 16 4.5Z"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <path
            d="M12.3 11.2c.24-.5.48-.52.78-.52h.68c.24 0 .52.1.68.5l.96 2.18c.12.28.1.58-.06.8l-.52.66c-.18.22-.18.5-.02.78.58 1.08 1.48 1.98 2.56 2.56.28.16.56.16.78-.02l.66-.52c.22-.16.52-.18.8-.06l2.18.96c.4.16.5.44.5.68v.68c0 .3-.02.54-.52.78-.68.4-1.92.66-3.4.14-2.06-.7-4.58-2.8-5.78-5.2-.78-1.5-.52-2.74-.12-3.42Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" fill="currentColor" aria-hidden="true">
          <path d="M18.2 28V17.4h3.55l.55-4.15H18.2v-2.6c0-1.2.34-2.02 2.08-2.02h2.2V4.92c-.38-.05-1.7-.17-3.22-.17-3.18 0-5.36 1.94-5.36 5.5v2.99h-3.6v4.16h3.6V28h4.3Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="22" height="22" rx="6.5" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="22.4" cy="9.6" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" fill="none" aria-hidden="true">
          <rect x="3.5" y="7" width="25" height="18" rx="5.5" fill="rgba(255,255,255,0.16)" stroke="currentColor" strokeWidth="2.2" />
          <path d="M13.2 12.1 21 16l-7.8 3.9v-7.8Z" fill="currentColor" />
        </svg>
      );
    case 'snapchat':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-zinc-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]" fill="currentColor" aria-hidden="true">
          <path d="M16 4.8c-3.5 0-5.9 2.55-5.9 6.05v2.15c-.68.26-1.48.26-1.88.54-.4.28-.4.94.14 1.2.68.4 1.48.68 1.48 1.35 0 1.08-1.2 2.68-3.22 3.48-.68.28-.94.94-.54 1.35.54.54 1.6.8 2.68 1.08.4.14.54.68.68 1.08.14.54.68.8 1.35.68 1.08-.28 2.28-.14 3.36.54.68.4 1.35.68 1.88.68s1.2-.28 1.88-.68c1.08-.68 2.28-.8 3.36-.54.68.14 1.2-.14 1.35-.68.14-.4.28-.94.68-1.08 1.08-.28 2.14-.54 2.68-1.08.4-.4.14-1.08-.54-1.35-2.02-.8-3.22-2.4-3.22-3.48 0-.68.8-.94 1.48-1.35.54-.28.54-.94.14-1.2-.4-.28-1.2-.28-1.88-.54v-2.15c0-3.5-2.4-6.05-5.9-6.05Z" />
        </svg>
      );
    case 'gpay':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" fill="none" aria-hidden="true">
          <path
            d="M22.2 12.2 14.5 20l-4.7-4.7 3.6-3.6a2.8 2.8 0 0 1 4 0l4.8 4.8"
            stroke="#34d399"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.8 15.3 15 20.5a2.8 2.8 0 0 0 4 0l4.8-4.8a2.8 2.8 0 0 0 0-4l-2.1-2.1"
            stroke="#60a5fa"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 14a3.2 3.2 0 0 1 0-4.5l2.2-2.2a3.2 3.2 0 0 1 4.5 0l2.1 2.1"
            stroke="#fbbf24"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M17.2 21.5a3.2 3.2 0 0 1-4.5 0l-3.4-3.4"
            stroke="#f87171"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'paytm':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" fill="none" aria-hidden="true">
          <rect x="5" y="8" width="22" height="16" rx="4" fill="rgba(255,255,255,0.18)" stroke="#ffffff" strokeWidth="2" />
          <path d="M5 13.5h22" stroke="#ffffff" strokeWidth="2" />
          <circle cx="20.5" cy="18.5" r="2.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.2" />
          <path d="M9.5 18.5h6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'phonepe':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="2.2" fill="rgba(255,255,255,0.14)" />
          <path
            d="M12.5 11.5h7M15.5 11.5v5.5a3 3 0 0 0 3 3h1M19.5 11.5v10"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M13 10.5 11.5 9" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'amazon':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" aria-hidden="true">
          <path
            d="M11.2 13.2c0-2.1 1.9-3.4 4.7-3.4 2.8 0 4.6 1.3 4.6 3.7v5.2m0-3.2c-4.3 0-9.3.6-9.3 3.4 0 1.8 1.5 2.7 3.7 2.7 2.4 0 4.3-1.1 5.6-2.7"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7 23.2c5.2 3.1 12.8 3.1 18 0"
            stroke="#fbbf24"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="m22.2 21.5 3.1 1.1-1.1 3"
            stroke="#fbbf24"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'flipkart':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" fill="none" aria-hidden="true">
          <path
            d="M8 9.5h16l-1.6 14.8a2.2 2.2 0 0 1-2.2 2H11.8a2.2 2.2 0 0 1-2.2-2L8 9.5Z"
            fill="rgba(255,255,255,0.16)"
            stroke="#fde047"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12.2 9.5V8a3.8 3.8 0 0 1 7.6 0v1.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M17.8 14h-1.6c-1.1 0-1.7.7-1.7 1.8v5.5M12.8 17.5h4.2"
            stroke="#fde047"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'meesho':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" fill="none" aria-hidden="true">
          <path
            d="M6.5 22V13.5a3.5 3.5 0 0 1 7 0V22M13.5 22v-8.5a3.5 3.5 0 0 1 7 0V22M20.5 16.5c0-3 5-3 5 0V22"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="7.2" r="1.8" fill="#fde047" />
        </svg>
      );
    case 'pubg':
      return (
        <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" aria-hidden="true">
          <path
            d="M9 19v-3.5a7 7 0 0 1 14 0V19l1.5 2.5H7.5L9 19Z"
            fill="rgba(255,255,255,0.14)"
            stroke="#fef3c7"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M10.5 16.5h11v3h-11v-3Z" fill="#09090b" stroke="#fbbf24" strokeWidth="1.6" />
          <circle cx="16" cy="11.5" r="1.4" fill="#fbbf24" />
        </svg>
      );
    default:
      return <ExternalLink className="w-6 h-6 text-white" />;
  }
}
