export function GooglePayIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
      />
      <path
        fill="#34A853"
        d="M5.34 14.37l-.71 2.66-2.61.06C1.35 15.56 1 13.82 1 12s.35-3.56 1.02-5.09l2.29.42.98 2.24C5.1 10.33 5 11.15 5 12c0 .82.11 1.62.34 2.37z"
        opacity="0.01"
      />
    </svg>
  );
}

export function PaytmIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#002970" />
      <path
        d="M6.5 19.5V12.5H9.6C11.2 12.5 12.1 13.4 12.1 14.8C12.1 16.2 11.2 17.1 9.6 17.1H8.2V19.5H6.5ZM8.2 15.7H9.4C10.1 15.7 10.4 15.3 10.4 14.8C10.4 14.2 10.1 13.9 9.4 13.9H8.2V15.7Z"
        fill="#FFFFFF"
      />
      <path
        d="M14.2 14.1H15.8V19.5H14.2V14.1ZM14.2 12H15.8V13.4H14.2V12Z"
        fill="#00BAF2"
      />
      <path
        d="M17.5 14.1H19.1V14.8C19.5 14.3 20.1 14 20.8 14C21.6 14 22.1 14.4 22.4 15C22.9 14.3 23.5 14 24.3 14C25.5 14 26.2 14.8 26.2 16.1V19.5H24.6V16.4C24.6 15.7 24.3 15.4 23.7 15.4C23.1 15.4 22.7 15.8 22.7 16.5V19.5H21.1V16.4C21.1 15.7 20.8 15.4 20.2 15.4C19.6 15.4 19.1 15.8 19.1 16.5V19.5H17.5V14.1Z"
        fill="#00BAF2"
      />
    </svg>
  );
}

export function PhonePeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#5F259F" />
      <path
        d="M19.8 10.2H11.6V12.2H13.5V18.4C13.5 20.4 14.8 21.6 16.8 21.6C17.6 21.6 18.4 21.4 19 21V23H21.1V12.2H22.6V10.2H19.8ZM19 18.9C18.5 19.4 17.8 19.6 17.2 19.6C16.1 19.6 15.6 19 15.6 17.9V12.2H19V18.9Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function BhimUpiIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#18181B" stroke="#3F3F46" />
      <path d="M12.5 8L19.5 16L12.5 24L15.2 16L12.5 8Z" fill="#F97316" />
      <path d="M16.5 8L23.5 16L16.5 24L19.2 16L16.5 8Z" fill="#22C55E" />
    </svg>
  );
}

export function BankUpiIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M12 4l9 6H3l9-6z" />
    </svg>
  );
}

export function RazorpayIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M14.5 3L9.2 14.4h3.6L9.5 21l8.5-10.2h-4.1L14.5 3z" fill="#38BDF8" />
    </svg>
  );
}
