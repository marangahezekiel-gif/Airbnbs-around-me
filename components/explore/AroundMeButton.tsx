'use client';

interface Props {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

/** One-tap "re-centre on my live location" button. */
export function AroundMeButton({ onClick, loading = false, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full bg-coral-500 px-4 py-3 text-sm font-bold text-white shadow-float transition hover:bg-coral-600 active:scale-95 disabled:opacity-80 ${className}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="7.5" />
        </svg>
      )}
      {loading ? 'Locating…' : 'Around me now'}
    </button>
  );
}
