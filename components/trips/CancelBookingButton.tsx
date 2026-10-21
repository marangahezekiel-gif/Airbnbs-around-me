'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Lets a guest cancel their own pending or accepted booking. */
export function CancelBookingButton({ bookingId, accepted }: { bookingId: string; accepted: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    const what = accepted ? 'Cancel this confirmed stay?' : 'Withdraw this request?';
    if (!window.confirm(what)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not cancel.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network problem — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-coral-500 hover:text-coral-700 disabled:opacity-60"
      >
        {busy ? 'Cancelling…' : accepted ? 'Cancel stay' : 'Withdraw request'}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}
    </div>
  );
}
